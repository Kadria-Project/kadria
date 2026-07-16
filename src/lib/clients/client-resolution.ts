import 'server-only'

import { prepareClientResolutionInput } from './client-normalization'
import { hasResolutionIdentity, resolveClientCandidates } from './client-resolution-engine'
import type {
  ClientResolutionInput,
  ClientResolutionRecord,
  ClientResolutionReport,
  ClientResolutionResult,
  PreparedClientResolutionInput,
} from './client-resolution-types'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'

const CLIENT_COLUMNS = [
  'id',
  'tenant_id',
  'first_name',
  'last_name',
  'company_name',
  'email',
  'normalized_email',
  'phone',
  'normalized_phone',
  'postal_code',
  'city',
  'country_code',
  'status',
  'archived_at',
  'merged_into_client_id',
].join(', ')

const MAX_CANDIDATES_PER_QUERY = 12

type CandidateLookupField = 'normalized_email' | 'normalized_phone' | 'postal_code' | 'city'

function mapClientRecord(row: Record<string, unknown>): ClientResolutionRecord {
  const text = (value: unknown): string | null => {
    const normalized = typeof value === 'string' ? value.trim() : ''
    return normalized || null
  }

  return {
    id: String(row.id || ''),
    tenantId: String(row.tenant_id || ''),
    firstName: text(row.first_name),
    lastName: text(row.last_name),
    companyName: text(row.company_name),
    email: text(row.email),
    normalizedEmail: text(row.normalized_email),
    phone: text(row.phone),
    normalizedPhone: text(row.normalized_phone),
    postalCode: text(row.postal_code),
    city: text(row.city),
    countryCode: text(row.country_code),
    status: text(row.status) || 'prospect',
    archivedAt: text(row.archived_at),
    mergedIntoClientId: text(row.merged_into_client_id),
  }
}

function logResolution(result: ClientResolutionResult, tenantId: string, input: PreparedClientResolutionInput): void {
  const outcomeLabel = result.outcome === 'exact_match'
    ? 'EXACT_MATCH'
    : result.outcome === 'ambiguous_match'
      ? 'AMBIGUOUS'
      : result.outcome === 'no_match'
        ? 'NO_MATCH'
        : 'INSUFFICIENT_IDENTITY'

  const candidates = result.outcome === 'exact_match'
    ? [result.client.clientId]
    : result.outcome === 'ambiguous_match'
      ? result.candidates.map((candidate) => candidate.clientId)
      : []

  console.info(`[CLIENT_RESOLUTION][${outcomeLabel}]`, {
    tenantId,
    candidateIds: candidates,
    reasons: result.reasons,
    hasEmail: Boolean(input.email.normalized),
    hasPhone: Boolean(input.phone.normalized),
  })
}

export async function resolveOrCreateClient(input: ClientResolutionInput): Promise<ClientResolutionResult> {
  const prepared = prepareClientResolutionInput(input)
  const supabase = getSupabaseAdmin()
  const candidates = new Map<string, ClientResolutionRecord>()

  const readCandidates = async (field: CandidateLookupField, value: string, useInsensitiveMatch = false) => {
    let query = supabase
      .from('clients')
      .select(CLIENT_COLUMNS)
      .eq('tenant_id', prepared.tenantId)
      .is('archived_at', null)
      .is('merged_into_client_id', null)
      .neq('status', 'archived')

    query = useInsensitiveMatch ? query.ilike(field, value) : query.eq(field, value)
    const { data, error } = await query.limit(MAX_CANDIDATES_PER_QUERY)

    if (error) {
      console.error('[CLIENT_RESOLUTION][LOOKUP_ERROR]', {
        tenantId: prepared.tenantId,
        code: error.code || null,
        hasEmail: Boolean(prepared.email.normalized),
        hasPhone: Boolean(prepared.phone.normalized),
      })
      throw new Error('Unable to resolve client candidates.')
    }

    for (const row of (data || []) as unknown as Record<string, unknown>[]) {
      const candidate = mapClientRecord(row)
      if (candidate.id) candidates.set(candidate.id, candidate)
    }
  }

  const queries: Array<Promise<void>> = []
  if (prepared.email.normalized) {
    queries.push(readCandidates('normalized_email', prepared.email.normalized))
  }
  if (prepared.phone.normalized) {
    queries.push(readCandidates('normalized_phone', prepared.phone.normalized))
  }
  if (hasResolutionIdentity(prepared) && (prepared.postalCode || prepared.city)) {
    queries.push(
      prepared.postalCode
        ? readCandidates('postal_code', prepared.postalCode)
        : readCandidates('city', prepared.city || '', true),
    )
  }

  await Promise.all(queries)
  const result = resolveClientCandidates(prepared, [...candidates.values()])
  logResolution(result, prepared.tenantId, prepared)
  return result
}

export function createClientResolutionReport(results: ClientResolutionResult[]): ClientResolutionReport {
  const report: ClientResolutionReport = {
    total: results.length,
    exactMatches: 0,
    ambiguousMatches: 0,
    noMatches: 0,
    insufficientIdentity: 0,
    reasonCounts: {},
  }

  for (const result of results) {
    if (result.outcome === 'exact_match') report.exactMatches += 1
    if (result.outcome === 'ambiguous_match') report.ambiguousMatches += 1
    if (result.outcome === 'no_match') report.noMatches += 1
    if (result.outcome === 'insufficient_identity') report.insufficientIdentity += 1

    for (const reason of result.reasons) {
      report.reasonCounts[reason] = (report.reasonCounts[reason] || 0) + 1
    }
  }

  return report
}

export { resolveClientCandidates } from './client-resolution-engine'
