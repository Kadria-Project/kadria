export type ClientActionReason =
  | 'appointment_change_requested'
  | 'appointment_awaiting_confirmation'
  | 'quote_pending_too_long'
  | 'project_to_call_back'
  | 'stale_active_project'
  | 'client_follow_up'
  | 'possible_duplicate'
  | 'legacy_unlinked'

export type ClientActionPriority = 'critical' | 'high' | 'medium' | 'low'

export type ClientActionItem = {
  id: string
  clientId: string
  source: 'canonical' | 'legacy'
  clientName: string
  companyName: string | null
  projectId: string | null
  projectTitle: string | null
  reason: ClientActionReason
  title: string
  description: string
  priority: ClientActionPriority
  dueAt: string | null
  lastInteractionAt: string | null
  appointmentAt: string | null
  amount: number | null
  href: string | null
}

export type ClientActionsSummary = {
  total: number
  callbacks: number
  quotesWaiting: number
  appointmentsToConfirm: number
  appointmentChanges: number
  contactsToReconcile: number
  staleProjects: number
  followUps: number
}

export const CLIENT_ACTION_REASONS: ClientActionReason[] = [
  'appointment_change_requested',
  'project_to_call_back',
  'appointment_awaiting_confirmation',
  'quote_pending_too_long',
  'possible_duplicate',
  'stale_active_project',
  'client_follow_up',
  'legacy_unlinked',
]
