import { getClientDisplayName, maskClientEmail, maskClientPhone } from './client-display-name'
import {
  normalizeCompanyNameForComparison,
  normalizePersonNameForComparison,
  normalizeTextForComparison,
} from './client-normalization'
import type {
  ClientCandidate,
  ClientMatchingField,
  ClientResolutionReason,
  ClientResolutionRecord,
  ClientResolutionResult,
  PreparedClientResolutionInput,
  ProposedClient,
} from './client-resolution-types'

type CandidateScore = {
  record: ClientResolutionRecord
  candidate: ClientCandidate
  emailMatch: boolean
  phoneMatch: boolean
  identityMatch: boolean
  identityConflict: boolean
}

function uniqueReasons(reasons: ClientResolutionReason[]): ClientResolutionReason[] {
  return [...new Set(reasons)]
}

function uniqueFields(fields: ClientMatchingField[]): ClientMatchingField[] {
  return [...new Set(fields)]
}

export function hasResolutionIdentity(input: PreparedClientResolutionInput): boolean {
  return Boolean(input.firstName || input.lastName || input.companyName)
}

function buildProposedClient(input: PreparedClientResolutionInput): ProposedClient {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    companyName: input.companyName,
    email: input.email.raw,
    normalizedEmail: input.email.normalized,
    phone: input.phone.raw,
    normalizedPhone: input.phone.normalized,
    addressLine1: input.addressLine1,
    postalCode: input.postalCode,
    city: input.city,
    countryCode: input.countryCode || input.phone.countryCode,
    status: 'prospect',
    acquisitionSource: input.acquisitionSource,
    createdFrom: input.createdFrom,
  }
}

function scoreCandidate(input: PreparedClientResolutionInput, record: ClientResolutionRecord): CandidateScore {
  const matchingFields: ClientMatchingField[] = []
  const reasons: ClientResolutionReason[] = []
  let score = 0

  const emailMatch = Boolean(input.email.normalized && input.email.normalized === record.normalizedEmail)
  const phoneMatch = Boolean(input.phone.normalized && input.phone.normalized === record.normalizedPhone)
  if (emailMatch) {
    matchingFields.push('email')
    reasons.push('EMAIL_EXACT')
    score += 50
  }
  if (phoneMatch) {
    matchingFields.push('phone')
    reasons.push('PHONE_EXACT')
    score += 50
  }

  const inputPerson = normalizePersonNameForComparison(input.firstName, input.lastName)
  const recordPerson = normalizePersonNameForComparison(record.firstName, record.lastName)
  const personMatch = Boolean(inputPerson && recordPerson && inputPerson === recordPerson)
  const personConflict = Boolean(inputPerson && recordPerson && inputPerson !== recordPerson)
  if (personMatch) {
    matchingFields.push('name')
    reasons.push('NAME_MATCH')
    score += 20
  }

  const inputCompany = normalizeCompanyNameForComparison(input.companyName)
  const recordCompany = normalizeCompanyNameForComparison(record.companyName)
  const companyMatch = Boolean(inputCompany && recordCompany && inputCompany === recordCompany)
  const companyConflict = Boolean(inputCompany && recordCompany && inputCompany !== recordCompany)
  if (companyMatch) {
    matchingFields.push('company')
    reasons.push('COMPANY_MATCH')
    score += 20
  }

  const postalMatch = Boolean(input.postalCode && record.postalCode && input.postalCode === record.postalCode.trim())
  if (postalMatch) {
    matchingFields.push('postal_code')
    reasons.push('POSTAL_CODE_MATCH')
    score += 10
  }

  const cityMatch = Boolean(input.normalizedCity && input.normalizedCity === normalizeTextForComparison(record.city))
  if (cityMatch) {
    matchingFields.push('city')
    reasons.push('CITY_MATCH')
    score += 5
  }

  const identityConflict = personConflict || companyConflict
  if (identityConflict) {
    reasons.push('CONFLICTING_NAME')
    score -= 30
  }

  return {
    record,
    emailMatch,
    phoneMatch,
    identityMatch: personMatch || companyMatch,
    identityConflict,
    candidate: {
      clientId: record.id,
      displayName: getClientDisplayName(record),
      email: maskClientEmail(record.email),
      phone: maskClientPhone(record.phone),
      companyName: record.companyName,
      status: record.status,
      matchingFields: uniqueFields(matchingFields),
      confidenceScore: Math.max(score, 0),
      reasons: uniqueReasons(reasons),
    },
  }
}

export function resolveClientCandidates(
  input: PreparedClientResolutionInput,
  candidates: ClientResolutionRecord[],
): ClientResolutionResult {
  if (!hasResolutionIdentity(input)) {
    return {
      dryRun: true,
      outcome: 'insufficient_identity',
      confidence: 'none',
      proposedClient: null,
      reasons: ['INSUFFICIENT_IDENTITY'],
    }
  }

  const activeCandidates = candidates.filter(
    (candidate) => candidate.tenantId === input.tenantId && !candidate.archivedAt && !candidate.mergedIntoClientId && candidate.status !== 'archived',
  )
  const scored = activeCandidates.map((candidate) => scoreCandidate(input, candidate))

  if (scored.length === 0) {
    return {
      dryRun: true,
      outcome: 'no_match',
      confidence: 'none',
      proposedClient: buildProposedClient(input),
      reasons: ['NO_CANDIDATES'],
    }
  }

  const emailMatches = scored.filter((candidate) => candidate.emailMatch)
  const phoneMatches = scored.filter((candidate) => candidate.phoneMatch)
  const reasons: ClientResolutionReason[] = []
  if (emailMatches.length > 1) reasons.push('SHARED_EMAIL', 'MULTIPLE_CANDIDATES')
  if (phoneMatches.length > 1) reasons.push('SHARED_PHONE', 'MULTIPLE_CANDIDATES')

  const emailIds = new Set(emailMatches.map((candidate) => candidate.record.id))
  const phoneIds = new Set(phoneMatches.map((candidate) => candidate.record.id))
  const hasCrossIdentifierConflict = emailIds.size > 0 && phoneIds.size > 0 && ![...emailIds].some((id) => phoneIds.has(id))
  if (hasCrossIdentifierConflict) reasons.push('CROSS_IDENTIFIER_CONFLICT', 'MULTIPLE_CANDIDATES')

  const sortedCandidates = [...scored].sort((left, right) => right.candidate.confidenceScore - left.candidate.confidenceScore)
  const strongest = sortedCandidates[0]
  const hasSharedIdentifier = emailMatches.length > 1 || phoneMatches.length > 1
  const isExact = Boolean(
    strongest
    && !hasSharedIdentifier
    && !hasCrossIdentifierConflict
    && !strongest.identityConflict
    && (
      (strongest.emailMatch && strongest.phoneMatch)
      || ((strongest.emailMatch || strongest.phoneMatch) && strongest.identityMatch)
    ),
  )

  if (isExact && strongest) {
    return {
      dryRun: true,
      outcome: 'exact_match',
      confidence: 'high',
      client: strongest.candidate,
      reasons: uniqueReasons(strongest.candidate.reasons),
    }
  }

  const candidatesForReview = sortedCandidates.map((candidate) => candidate.candidate)
  const confidence = strongest && (strongest.emailMatch || strongest.phoneMatch) ? 'medium' : 'low'
  return {
    dryRun: true,
    outcome: 'ambiguous_match',
    confidence,
    candidates: candidatesForReview,
    reasons: uniqueReasons([
      ...reasons,
      ...sortedCandidates.flatMap((candidate) => candidate.candidate.reasons),
      ...(sortedCandidates.length > 1 ? ['MULTIPLE_CANDIDATES' as const] : []),
    ]),
  }
}
