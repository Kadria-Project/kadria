import { createHash } from 'node:crypto'

import { normalizeCompanyNameForComparison, normalizePersonNameForComparison, prepareClientResolutionInput } from './client-normalization'
import type { ClientResolutionInput, ClientResolutionResult, PreparedClientResolutionInput } from './client-resolution-types'

export interface LegacyProjectClientRow {
  id: string; tenantId: string | null; clientId: string | null; clientFirstName: string | null; clientName: string | null
  clientEmail: string | null; clientPhone: string | null; city: string | null; postalCode: string | null
  source: string | null; createdAt: string | null; status: string | null
}
export interface LegacyProjectResolutionInput { projectId: string; input: ClientResolutionInput; prepared: PreparedClientResolutionInput; alreadyLinked: boolean }
export type LegacyClusterSummary = {
  projectsConsidered: number
  excludedLinkedProjects: number
  certainClusters: number
  projectsInCertainClusters: number
  ambiguousClusters: number
  projectsInAmbiguousClusters: number
  isolatedProjects: number
  insufficientProjects: number
  clientsCertainToCreate: number
  estimatedClientsMin: number
  estimatedClientsMax: number
  // Kept for report compatibility; callers should use the min/max range.
  estimatedCanonicalClients: number
  certainGroups: number
  ambiguousGroups: number
}
export type LegacyClusterGroup = { projectIds: string[] }
export type LegacyClusterResult = {
  summary: LegacyClusterSummary
  certainClusters: LegacyClusterGroup[]
  ambiguousClusters: LegacyClusterGroup[]
  isolatedProjects: string[]
  insufficientProjects: string[]
}

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

function clusterIdentity(entry: LegacyProjectResolutionInput): string | null {
  const person = normalizePersonNameForComparison(entry.prepared.firstName, entry.prepared.lastName)
  const company = normalizeCompanyNameForComparison(entry.prepared.companyName)
  return person || company ? `${person || ''}|${company || ''}` : null
}

function clusterContacts(entry: LegacyProjectResolutionInput): string[] {
  return [entry.prepared.email.normalized, entry.prepared.phone.normalized]
    .filter(Boolean)
    .map((contact) => `${entry.prepared.tenantId}|${contact}`)
}

export function clusterLegacyProjects(inputs: LegacyProjectResolutionInput[]): LegacyClusterResult {
  const projectIds = new Set<string>(); const nodes = new Map<string, { entry: LegacyProjectResolutionInput; identity: string; contacts: string[] }>()
  const contactProjects = new Map<string, Set<string>>(); const insufficientProjects: string[] = []; let excludedLinkedProjects = 0

  for (const entry of inputs) {
    if (projectIds.has(entry.projectId)) throw new Error(`Legacy clustering received duplicate project ${entry.projectId}.`)
    projectIds.add(entry.projectId)
    if (entry.alreadyLinked) { excludedLinkedProjects += 1; continue }
    const identity = clusterIdentity(entry); const contacts = clusterContacts(entry)
    if (!identity || !contacts.length) { insufficientProjects.push(entry.projectId); continue }
    nodes.set(entry.projectId, { entry, identity, contacts })
    for (const contact of contacts) {
      const projects = contactProjects.get(contact) || new Set<string>()
      projects.add(entry.projectId); contactProjects.set(contact, projects)
    }
  }

  const certainClusters: LegacyClusterGroup[] = []; const ambiguousClusters: LegacyClusterGroup[] = []; const isolatedProjects: string[] = []; const visited = new Set<string>()
  for (const projectId of nodes.keys()) {
    if (visited.has(projectId)) continue
    const queue = [projectId]; const component = new Set<string>(); const identities = new Set<string>()
    while (queue.length) {
      const currentId = queue.pop() as string
      if (visited.has(currentId)) continue
      visited.add(currentId); component.add(currentId)
      const current = nodes.get(currentId) as { entry: LegacyProjectResolutionInput; identity: string; contacts: string[] }
      identities.add(current.identity)
      for (const contact of current.contacts) for (const relatedId of contactProjects.get(contact) || []) if (!visited.has(relatedId)) queue.push(relatedId)
    }
    const group = { projectIds: [...component].sort() }
    if (group.projectIds.length === 1) isolatedProjects.push(group.projectIds[0])
    else if (identities.size === 1) certainClusters.push(group)
    else ambiguousClusters.push(group)
  }

  const projectsInCertainClusters = certainClusters.reduce((count, group) => count + group.projectIds.length, 0)
  const projectsInAmbiguousClusters = ambiguousClusters.reduce((count, group) => count + group.projectIds.length, 0)
  const projectsConsidered = inputs.length - excludedLinkedProjects
  const clientsCertainToCreate = certainClusters.length + isolatedProjects.length
  const estimatedClientsMin = clientsCertainToCreate + ambiguousClusters.length
  const estimatedClientsMax = clientsCertainToCreate + projectsInAmbiguousClusters
  const classifiedProjects = projectsInCertainClusters + projectsInAmbiguousClusters + isolatedProjects.length + insufficientProjects.length

  if (classifiedProjects !== projectsConsidered || estimatedClientsMin > estimatedClientsMax || estimatedClientsMax > projectsConsidered) {
    throw new Error('Legacy clustering invariants failed: project categories or estimate range are inconsistent.')
  }

  return {
    summary: {
      projectsConsidered, excludedLinkedProjects, certainClusters: certainClusters.length, projectsInCertainClusters,
      ambiguousClusters: ambiguousClusters.length, projectsInAmbiguousClusters, isolatedProjects: isolatedProjects.length,
      insufficientProjects: insufficientProjects.length, clientsCertainToCreate, estimatedClientsMin, estimatedClientsMax,
      estimatedCanonicalClients: estimatedClientsMax, certainGroups: certainClusters.length, ambiguousGroups: ambiguousClusters.length,
    },
    certainClusters, ambiguousClusters, isolatedProjects: isolatedProjects.sort(), insufficientProjects: insufficientProjects.sort(),
  }
}

export function estimateLegacyClusters(inputs: LegacyProjectResolutionInput[]): LegacyClusterSummary {
  return clusterLegacyProjects(inputs).summary
}
