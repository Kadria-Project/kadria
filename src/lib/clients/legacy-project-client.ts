import { createHash } from 'node:crypto'

import { prepareClientResolutionInput } from './client-normalization'
import type { ClientResolutionInput, ClientResolutionResult, PreparedClientResolutionInput } from './client-resolution-types'

export interface LegacyProjectClientRow {
  id: string; tenantId: string | null; clientId: string | null; clientFirstName: string | null; clientName: string | null
  clientEmail: string | null; clientPhone: string | null; city: string | null; postalCode: string | null
  source: string | null; createdAt: string | null; status: string | null
}
export interface LegacyProjectResolutionInput { projectId: string; input: ClientResolutionInput; prepared: PreparedClientResolutionInput; alreadyLinked: boolean }
export type LegacyClusterSummary = { estimatedCanonicalClients: number; certainGroups: number; ambiguousGroups: number; isolatedProjects: number }

const text = (value: string | null | undefined) => value?.trim() || null
export const anonymizeLegacyIdentifier = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 12)

export function mapLegacyProjectClientIdentity(project: LegacyProjectClientRow): LegacyProjectResolutionInput | null {
  const tenantId = text(project.tenantId)
  if (!tenantId) return null
  // client_name is historically a surname but can be a full legacy name; never guess a split.
  const input: ClientResolutionInput = {
    tenantId, firstName: text(project.clientFirstName), lastName: text(project.clientName), companyName: null,
    email: text(project.clientEmail), phone: text(project.clientPhone), addressLine1: null,
    postalCode: text(project.postalCode), city: text(project.city), countryCode: null,
    acquisitionSource: text(project.source), createdFrom: text(project.source) || 'legacy-project',
  }
  return { projectId: project.id, input, prepared: prepareClientResolutionInput(input), alreadyLinked: Boolean(text(project.clientId)) }
}

export function classifyCollision(result: ClientResolutionResult): string[] {
  const values: string[] = []
  if (result.reasons.includes('SHARED_EMAIL')) values.push('shared_email')
  if (result.reasons.includes('SHARED_PHONE')) values.push('shared_phone')
  if (result.reasons.includes('CROSS_IDENTIFIER_CONFLICT')) values.push('cross_identifier_conflict')
  if (result.reasons.includes('CONFLICTING_NAME')) values.push('conflicting_identity')
  if (result.outcome === 'ambiguous_match' && result.reasons.includes('NAME_MATCH') && result.reasons.includes('CITY_MATCH')) values.push('name_city')
  return values
}

export function estimateLegacyClusters(inputs: LegacyProjectResolutionInput[]): LegacyClusterSummary {
  const groups = new Map<string, Set<string>>(); const contacts = new Map<string, Set<string>>(); const linked = new Set<string>()
  for (const entry of inputs) {
    const identity = [entry.prepared.firstName, entry.prepared.lastName, entry.prepared.companyName].filter(Boolean).join('|').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    if (entry.alreadyLinked || !identity) continue
    for (const contact of [entry.prepared.email.normalized, entry.prepared.phone.normalized].filter(Boolean) as string[]) {
      const key = `${contact}|${identity}`; const group = groups.get(key) || new Set<string>(); group.add(entry.projectId); groups.set(key, group); linked.add(entry.projectId)
      const identities = contacts.get(contact) || new Set<string>(); identities.add(identity); contacts.set(contact, identities)
    }
  }
  const isolatedProjects = inputs.filter((entry) => !entry.alreadyLinked && !linked.has(entry.projectId)).length
  return { estimatedCanonicalClients: groups.size + isolatedProjects, certainGroups: groups.size, ambiguousGroups: [...contacts.values()].filter((identities) => identities.size > 1).length, isolatedProjects }
}
