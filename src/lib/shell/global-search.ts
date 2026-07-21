export const GLOBAL_SEARCH_MIN_LENGTH = 2
export const GLOBAL_SEARCH_LIMIT = 5

export type GlobalSearchCategory = 'project' | 'client' | 'quote' | 'appointment'

export type GlobalSearchResult = {
  id: string
  title: string
  subtitle: string | null
  status: string | null
  route: string
}

export type GlobalSearchGroup = {
  category: GlobalSearchCategory
  label: string
  results: GlobalSearchResult[]
}

export function cleanGlobalSearchQuery(value: string | null | undefined) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 80)
}

// PostgREST uses `%`, `_` and `,` as filter syntax. Escaping them keeps a
// literal user query from widening the search predicate.
export function escapePostgrestLike(value: string) {
  return value.replace(/[\\%_,()]/g, '\\$&')
}

export function isGlobalSearchQueryReady(value: string) {
  return cleanGlobalSearchQuery(value).length >= GLOBAL_SEARCH_MIN_LENGTH
}

export function globalSearchRoute(category: GlobalSearchCategory, values: { id: string; projectId?: string | null }) {
  if (category === 'project') return `/dashboard-v2/projet/${encodeURIComponent(values.id)}`
  if (category === 'client') return `/dashboard-v2/clients/${encodeURIComponent(values.id)}`
  if (category === 'quote' && values.projectId) return `/dashboard-v2/projet/${encodeURIComponent(values.projectId)}/devis/${encodeURIComponent(values.id)}`
  return `/dashboard-v2/agenda?appointmentId=${encodeURIComponent(values.id)}`
}
