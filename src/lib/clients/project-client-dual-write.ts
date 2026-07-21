import 'server-only'

import { createHash } from 'crypto'
import { resolveOrCreateClient } from '@/src/lib/clients/client-resolution'
import type { ClientResolutionInput, ClientResolutionResult, ProposedClient } from '@/src/lib/clients/client-resolution-types'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'

type ClientMode = 'existing_client' | 'create_client' | 'no_client'
type ResolverOutcome = ClientResolutionResult['outcome'] | 'resolver_error'

export type ProjectClientDualWriteInput = {
  tenantId: string
  artisanId: string
  requestId: string
  source: string
  projectPayload: Record<string, unknown>
  /** An explicit selection from the tenant-scoped client picker. */
  existingClientId?: string | null
  client: Omit<ClientResolutionInput, 'tenantId' | 'createdFrom'> & { createdFrom?: string }
}

export type ProjectClientDualWriteResult = {
  projectId: string
  clientId: string | null
  clientResolutionOutcome: ResolverOutcome
  clientResolutionWarning: string | null
  idempotent: boolean
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, stableValue((value as Record<string, unknown>)[key])]))
}

export function buildProjectCreationPayloadHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex')
}

function projectPayloadForIdempotency(payload: Record<string, unknown>): Record<string, unknown> {
  const stablePayload = { ...payload }
  delete stablePayload.responsible_assigned_at
  return stablePayload
}

function decisionFromResolution(result: ClientResolutionResult): { mode: ClientMode; existingClientId: string | null; clientPayload: ProposedClient | null } {
  if (result.outcome === 'exact_match') return { mode: 'existing_client', existingClientId: result.client.clientId, clientPayload: null }
  if (result.outcome === 'no_match') return { mode: 'create_client', existingClientId: null, clientPayload: result.proposedClient }
  return { mode: 'no_client', existingClientId: null, clientPayload: null }
}

export async function createProjectWithCanonicalClient(input: ProjectClientDualWriteInput): Promise<ProjectClientDualWriteResult> {
  let resolution: ClientResolutionResult | null = null
  let warning: string | null = null
  if (!input.existingClientId) try {
    resolution = await resolveOrCreateClient({
      ...input.client,
      tenantId: input.tenantId,
      createdFrom: input.client.createdFrom || input.source,
    })
  } catch (error) {
    warning = 'La fiche client sera a relier ultérieurement.'
    console.error('[CLIENT_DUAL_WRITE][RESOLVER_FALLBACK]', { tenantId: input.tenantId, requestId: input.requestId, message: error instanceof Error ? error.message : String(error) })
  }

  const decision = input.existingClientId
    ? { mode: 'existing_client' as const, existingClientId: input.existingClientId, clientPayload: null }
    : resolution ? decisionFromResolution(resolution) : { mode: 'no_client' as const, existingClientId: null, clientPayload: null }
  const outcome: ResolverOutcome = input.existingClientId ? 'exact_match' : resolution?.outcome || 'resolver_error'
  const payloadHash = buildProjectCreationPayloadHash({
    source: input.source,
    project: projectPayloadForIdempotency(input.projectPayload),
    clientMode: decision.mode,
    client: decision.clientPayload,
    existingClientId: decision.existingClientId,
  })
  const { data, error } = await getSupabaseAdmin().rpc('create_project_with_canonical_client', {
    p_tenant_id: input.tenantId,
    p_request_id: input.requestId,
    p_payload_hash: payloadHash,
    p_source: input.source,
    p_client_mode: decision.mode,
    p_existing_client_id: decision.existingClientId,
    p_client_payload: decision.clientPayload,
    p_project_payload: input.projectPayload,
    p_outcome: outcome,
  })
  if (error) throw new Error(error.message)
  const result = (data || {}) as Record<string, unknown>
  const projectId = typeof result.project_id === 'string' ? result.project_id : ''
  if (!projectId) throw new Error('Project creation RPC returned no project id.')
  return {
    projectId,
    clientId: typeof result.client_id === 'string' ? result.client_id : null,
    clientResolutionOutcome: outcome,
    clientResolutionWarning: warning,
    idempotent: result.idempotent === true,
  }
}
