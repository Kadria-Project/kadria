export type ClientListUiFilter = 'all' | 'canonical' | 'legacy' | 'attention' | 'active' | 'recurring'
export type ClientListUiSort = 'attention' | 'lastInteraction' | 'name' | 'acceptedValue' | 'projectCount' | 'nextAppointment'
export type ClientListUiOptions = { status?: string; hasAppointment?: boolean; includeArchived?: boolean }

export const CLIENT_ATTENTION_LABELS: Record<string, string> = {
  possible_duplicate: 'À rapprocher',
  legacy_unlinked: 'Client non lié',
  appointment_change_requested: 'Modification de rendez-vous',
  appointment_awaiting_confirmation: 'Rendez-vous à confirmer',
  quote_pending_too_long: 'Devis sans réponse',
  project_to_call_back: 'À rappeler',
  stale_active_project: 'Dossier sans activité',
  client_follow_up: 'Relance recommandée',
}

export function buildClientListSearchParams(filter: ClientListUiFilter, search: string, page: number, sort: ClientListUiSort, options: ClientListUiOptions = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: '25', sort })
  if (search.trim()) params.set('q', search.trim())
  if (filter === 'canonical' || filter === 'legacy') params.set('source', filter)
  if (filter === 'attention') params.set('attention', 'true')
  if (filter === 'active') params.set('active', 'true')
  if (filter === 'recurring') params.set('recurring', 'true')
  if (options.status) params.set('status', options.status)
  if (options.hasAppointment !== undefined) params.set('hasAppointment', String(options.hasAppointment))
  if (options.includeArchived) params.set('includeArchived', 'true')
  return params
}
