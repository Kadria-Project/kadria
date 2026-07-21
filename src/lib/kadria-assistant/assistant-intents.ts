export const ASSISTANT_INTENTS = [
  'dashboard.priorities',
  'dashboard.prepare_day',
  'tasks.overdue',
  'tracking.blocked_projects',
  'tracking.followups',
  'tracking.next_actions',
  'agenda.prepare_day',
  'agenda.unconfirmed',
  'agenda.available_slots',
  'project.summary',
  'project.missing_information',
  'project.next_action',
  'performance.summary',
  'performance.explain_change',
  'performance.contributing_projects',
  'settings.check_section',
  'search.open',
  'create.project',
  'create.appointment',
  'create.quote',
] as const

export type AssistantIntent = (typeof ASSISTANT_INTENTS)[number]

export function isAssistantIntent(value: unknown): value is AssistantIntent {
  return typeof value === 'string' && (ASSISTANT_INTENTS as readonly string[]).includes(value)
}
