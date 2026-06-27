export type CalendarMode = 'kadria' | 'google'

export type KadriaPlanningProject = {
  id?: string
  status?: string
  leadStatus?: string
  clientName?: string
  clientFirstName?: string
  projectType?: string
  trade?: string
  city?: string
  createdAt?: string
  callbackDate?: string
  maturity?: string
}

export type KadriaPlanningItemKind = 'callback' | 'quote' | 'commercial'
export type KadriaPlanningDueState = 'overdue' | 'today' | 'upcoming' | 'planned'

export type KadriaPlanningItem = {
  id: string
  projectId: string
  kind: KadriaPlanningItemKind
  dueState: KadriaPlanningDueState
  dueDate: string | null
  title: string
  subtitle: string
  statusLabel: string
  clientLabel: string
  cityLabel: string
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

function startOfDay(value: Date): Date {
  const result = new Date(value)
  result.setHours(0, 0, 0, 0)
  return result
}

function getClientLabel(project: KadriaPlanningProject): string {
  const label = [project.clientFirstName, project.clientName].filter(Boolean).join(' ').trim()
  return label || 'Client a relancer'
}

function isClosedProject(project: KadriaPlanningProject): boolean {
  const status = String(project.status || '').toLowerCase()
  const leadStatus = String(project.leadStatus || '').toLowerCase()
  return status === 'gagne' || status === 'perdu' || leadStatus === 'archived'
}

function getDueState(date: Date | null): KadriaPlanningDueState {
  if (!date) return 'planned'

  const today = startOfDay(new Date()).getTime()
  const target = startOfDay(date).getTime()

  if (target < today) return 'overdue'
  if (target === today) return 'today'
  return 'upcoming'
}

function looksLikeAppointment(project: KadriaPlanningProject): boolean {
  const text = `${project.status || ''} ${project.maturity || ''}`.toLowerCase()
  return text.includes('rdv') || text.includes('rendez')
}

function looksLikeQuote(project: KadriaPlanningProject): boolean {
  const status = String(project.status || '').toLowerCase()
  return status.includes('devis') || status.includes('relancer')
}

function describeProject(project: KadriaPlanningProject): string {
  return [project.projectType, project.trade, project.city].filter(Boolean).join(' - ')
}

function buildCallbackItem(project: KadriaPlanningProject, callbackDate: Date): KadriaPlanningItem {
  const clientLabel = getClientLabel(project)
  const appointment = looksLikeAppointment(project)
  const baseLabel = describeProject(project)

  return {
    id: `${project.id || clientLabel}-callback`,
    projectId: project.id || '',
    kind: 'callback',
    dueState: getDueState(callbackDate),
    dueDate: callbackDate.toISOString(),
    title: appointment ? `Rendez-vous a suivre avec ${clientLabel}` : `Relance planifiee pour ${clientLabel}`,
    subtitle: baseLabel || (appointment ? 'Rendez-vous issu du dossier existant.' : 'Callback date issue du dossier existant.'),
    statusLabel: project.status || 'A planifier',
    clientLabel,
    cityLabel: project.city || '',
  }
}

function buildQuoteItem(project: KadriaPlanningProject): KadriaPlanningItem {
  const clientLabel = getClientLabel(project)
  const referenceDate = parseDate(project.callbackDate) || parseDate(project.createdAt)
  const baseLabel = describeProject(project)

  return {
    id: `${project.id || clientLabel}-quote`,
    projectId: project.id || '',
    kind: 'quote',
    dueState: getDueState(referenceDate),
    dueDate: referenceDate ? referenceDate.toISOString() : null,
    title: `Devis a relancer pour ${clientLabel}`,
    subtitle: baseLabel || 'Suivi devis base sur le statut existant du dossier.',
    statusLabel: project.status || 'Devis',
    clientLabel,
    cityLabel: project.city || '',
  }
}

function buildCommercialItem(project: KadriaPlanningProject): KadriaPlanningItem {
  const clientLabel = getClientLabel(project)
  const createdAt = parseDate(project.createdAt)
  const baseLabel = describeProject(project)

  return {
    id: `${project.id || clientLabel}-commercial`,
    projectId: project.id || '',
    kind: 'commercial',
    dueState: getDueState(createdAt),
    dueDate: createdAt ? createdAt.toISOString() : null,
    title: `Action commerciale a lancer pour ${clientLabel}`,
    subtitle: baseLabel || 'Action datee a partir du dossier existant.',
    statusLabel: project.status || 'Nouveau',
    clientLabel,
    cityLabel: project.city || '',
  }
}

export function normalizeCalendarMode(value: unknown): CalendarMode {
  return value === 'google' ? 'google' : 'kadria'
}

export function buildKadriaPlanningItems(projects: KadriaPlanningProject[]): KadriaPlanningItem[] {
  const items = projects
    .filter((project) => Boolean(project?.id) && !isClosedProject(project))
    .map((project) => {
      const callbackDate = parseDate(project.callbackDate)
      if (callbackDate) return buildCallbackItem(project, callbackDate)
      if (looksLikeQuote(project)) return buildQuoteItem(project)
      return buildCommercialItem(project)
    })

  const stateRank: Record<KadriaPlanningDueState, number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
    planned: 3,
  }

  return items
    .sort((a, b) => {
      const stateDiff = stateRank[a.dueState] - stateRank[b.dueState]
      if (stateDiff !== 0) return stateDiff

      const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      return timeA - timeB
    })
    .slice(0, 12)
}
