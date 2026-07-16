export type ClientResolutionReason =
  | 'EMAIL_EXACT'
  | 'PHONE_EXACT'
  | 'NAME_MATCH'
  | 'COMPANY_MATCH'
  | 'POSTAL_CODE_MATCH'
  | 'CITY_MATCH'
  | 'SHARED_EMAIL'
  | 'SHARED_PHONE'
  | 'CONFLICTING_NAME'
  | 'MULTIPLE_CANDIDATES'
  | 'CROSS_IDENTIFIER_CONFLICT'
  | 'INSUFFICIENT_IDENTITY'
  | 'NO_CANDIDATES'

export type ClientMatchingField = 'email' | 'phone' | 'name' | 'company' | 'postal_code' | 'city'
export type ClientResolutionConfidence = 'high' | 'medium' | 'low' | 'none'

export interface ClientResolutionInput {
  tenantId: string
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  addressLine1?: string | null
  postalCode?: string | null
  city?: string | null
  countryCode?: string | null
  acquisitionSource?: string | null
  createdFrom: string
}

export interface ClientEmailNormalization {
  raw: string | null
  normalized: string | null
  valid: boolean
}

export interface ClientPhoneNormalization {
  raw: string | null
  normalized: string | null
  valid: boolean
  countryCode: string | null
}

export interface PreparedClientResolutionInput {
  tenantId: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  email: ClientEmailNormalization
  phone: ClientPhoneNormalization
  addressLine1: string | null
  postalCode: string | null
  city: string | null
  normalizedCity: string | null
  countryCode: string | null
  acquisitionSource: string | null
  createdFrom: string
}

export interface ClientResolutionRecord {
  id: string
  tenantId: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  email: string | null
  normalizedEmail: string | null
  phone: string | null
  normalizedPhone: string | null
  postalCode: string | null
  city: string | null
  countryCode: string | null
  status: string
  archivedAt: string | null
  mergedIntoClientId: string | null
}

export interface ClientCandidate {
  clientId: string
  displayName: string
  email: string | null
  phone: string | null
  companyName: string | null
  status: string
  matchingFields: ClientMatchingField[]
  confidenceScore: number
  reasons: ClientResolutionReason[]
}

export interface ProposedClient {
  firstName: string | null
  lastName: string | null
  companyName: string | null
  email: string | null
  normalizedEmail: string | null
  phone: string | null
  normalizedPhone: string | null
  addressLine1: string | null
  postalCode: string | null
  city: string | null
  countryCode: string | null
  status: 'prospect'
  acquisitionSource: string | null
  createdFrom: string
}

export type ClientResolutionResult =
  | {
      dryRun: true
      outcome: 'exact_match'
      confidence: 'high'
      client: ClientCandidate
      reasons: ClientResolutionReason[]
    }
  | {
      dryRun: true
      outcome: 'ambiguous_match'
      confidence: 'medium' | 'low'
      candidates: ClientCandidate[]
      reasons: ClientResolutionReason[]
    }
  | {
      dryRun: true
      outcome: 'no_match'
      confidence: 'none'
      proposedClient: ProposedClient
      reasons: ClientResolutionReason[]
    }
  | {
      dryRun: true
      outcome: 'insufficient_identity'
      confidence: 'none'
      proposedClient: null
      reasons: ClientResolutionReason[]
    }

export interface ClientResolutionReport {
  total: number
  exactMatches: number
  ambiguousMatches: number
  noMatches: number
  insufficientIdentity: number
  reasonCounts: Partial<Record<ClientResolutionReason, number>>
}
