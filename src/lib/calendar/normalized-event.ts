// Modèle front-only (pas de nouvelle table, pas de migration) qui unifie les
// différentes sources d'événements affichées dans l'agenda desktop : Google
// Calendar synchronisé, rendez-vous Kadria liés à un dossier projet, et
// actions du Planning Kadria (relances/devis/actions commerciales) qui n'ont
// pas toujours d'horaire fiable.

export type NormalizedEventSource = 'google' | 'kadria-appointment' | 'kadria-planning'

export type NormalizedEventType =
  | 'google-event'
  | 'rendez-vous'
  | 'chantier'
  | 'relance'
  | 'tache-commerciale'
  | 'jour-ferie'

export interface NormalizedCalendarEvent {
  id: string
  title: string
  start: string | null
  end: string | null
  allDay: boolean
  source: NormalizedEventSource
  type: NormalizedEventType
  location: string | null
  projectId: string | null
  projectRecordId: string | null
  projectInternalNumber: string | null
  projectReference: string | null
  clientName: string | null
  projectTitle: string | null
  actionUrl: string | null
  googleEventId: string | null
  googleEventUrl: string | null
  description: string | null
  color: string
  status: string | null
}

function isAllDayValue(value: string | null): boolean {
  // Un événement Google "all-day" est renvoyé au format date pure
  // (YYYY-MM-DD), sans partie horaire — contrairement à un dateTime ISO.
  if (!value) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export interface RawGoogleEvent {
  id: string
  title: string
  start: string | null
  end: string | null
  location: string | null
}

export function normalizeGoogleEvent(event: RawGoogleEvent): NormalizedCalendarEvent {
  return {
    id: `google-${event.id}`,
    title: event.title || '(Sans titre)',
    start: event.start,
    end: event.end,
    allDay: isAllDayValue(event.start),
    source: 'google',
    type: 'google-event',
    location: event.location,
    projectId: null,
    projectRecordId: null,
    projectInternalNumber: null,
    projectReference: null,
    clientName: null,
    projectTitle: null,
    actionUrl: null,
    googleEventId: event.id,
    googleEventUrl: null,
    description: null,
    color: 'google',
    status: null,
  }
}

export interface RawKadriaAppointment {
  id: string
  projectId: string | null
  projectNumber: string | null
  clientName: string | null
  projectType: string | null
  city: string | null
  title: string | null
  start: string | null
  end: string | null
  location: string | null
  status: string | null
  googleEventId: string | null
}

function guessAppointmentType(a: RawKadriaAppointment): NormalizedEventType {
  const text = `${a.title || ''} ${a.status || ''} ${a.projectType || ''}`.toLowerCase()
  if (text.includes('chantier') || text.includes('intervention')) return 'chantier'
  if (text.includes('relance')) return 'relance'
  return 'rendez-vous'
}

export function normalizeKadriaAppointment(a: RawKadriaAppointment): NormalizedCalendarEvent {
  const type = guessAppointmentType(a)
  const hasProject = Boolean(a.projectId)
  const reference = hasProject
    ? `#KD-${(a.projectNumber || a.projectId || '').toString().toUpperCase()}`
    : null

  const clientLabel = a.clientName ? ` — ${a.clientName}` : ''
  const defaultTitle =
    type === 'chantier' ? 'Chantier' : type === 'relance' ? 'Relance' : 'Rendez-vous'

  return {
    id: `kadria-appt-${a.id}`,
    title: a.title || `${defaultTitle}${a.clientName ? ` avec ${a.clientName}` : ''}`,
    start: a.start,
    end: a.end,
    allDay: isAllDayValue(a.start),
    source: 'kadria-appointment',
    type,
    location: a.location,
    projectId: a.projectId,
    projectRecordId: a.projectId,
    projectInternalNumber: a.projectNumber,
    projectReference: reference ? `${reference}${clientLabel}` : null,
    clientName: a.clientName,
    projectTitle: a.projectType,
    actionUrl: hasProject ? `/dashboard-v2/projet/${a.projectId}` : null,
    googleEventId: a.googleEventId,
    googleEventUrl: null,
    description: null,
    color: type,
    status: a.status,
  }
}

export interface RawKadriaPlanningItemLike {
  id: string
  projectId: string
  kind: 'callback' | 'quote' | 'commercial'
  dueDate: string | null
  title: string
  subtitle: string
  clientLabel: string
}

export function normalizeKadriaPlanningItem(item: RawKadriaPlanningItemLike): NormalizedCalendarEvent {
  const hasProject = Boolean(item.projectId)
  const type: NormalizedEventType = item.kind === 'commercial' ? 'tache-commerciale' : 'relance'
  const reference = hasProject ? `#KD-${item.projectId.slice(-6).toUpperCase()} — ${item.clientLabel}` : null

  return {
    id: `kadria-planning-${item.id}`,
    title: item.title,
    // Pas d'horaire fiable pour ces actions (issues de dossiers, pas d'agenda
    // horodaté) : placées en zone "À planifier" côté UI via allDay=true.
    start: item.dueDate,
    end: null,
    allDay: true,
    source: 'kadria-planning',
    type,
    location: null,
    projectId: item.projectId || null,
    projectRecordId: item.projectId || null,
    projectInternalNumber: item.projectId ? item.projectId.slice(-6) : null,
    projectReference: reference,
    clientName: item.clientLabel,
    projectTitle: item.subtitle,
    actionUrl: hasProject ? `/dashboard-v2/projet/${item.projectId}` : null,
    googleEventId: null,
    googleEventUrl: null,
    description: item.subtitle,
    color: type,
    status: null,
  }
}

// Couleurs par type d'événement — palette discrète, cohérente en clair/sombre
// (cf. brief : rester premium, éviter les couleurs criardes).
export const EVENT_TYPE_STYLES: Record<
  NormalizedEventType,
  { bg: string; border: string; text: string; dot: string; label: string }
> = {
  'google-event': {
    bg: 'rgba(96,165,250,0.14)',
    border: 'rgba(96,165,250,0.35)',
    text: '#bfdbfe',
    dot: '#60a5fa',
    label: 'Google Calendar',
  },
  'rendez-vous': {
    bg: 'rgba(52,211,153,0.14)',
    border: 'rgba(52,211,153,0.35)',
    text: '#a7f3d0',
    dot: '#34d399',
    label: 'Rendez-vous',
  },
  chantier: {
    bg: 'rgba(22,163,74,0.18)',
    border: 'rgba(22,163,74,0.4)',
    text: '#bbf7d0',
    dot: '#16a34a',
    label: 'Chantier',
  },
  relance: {
    bg: 'rgba(251,146,60,0.14)',
    border: 'rgba(251,146,60,0.35)',
    text: '#fed7aa',
    dot: '#fb923c',
    label: 'Relance',
  },
  'tache-commerciale': {
    bg: 'rgba(148,163,184,0.14)',
    border: 'rgba(148,163,184,0.35)',
    text: '#e2e8f0',
    dot: '#94a3b8',
    label: 'Tâche commerciale',
  },
  'jour-ferie': {
    bg: 'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.2)',
    text: '#cbd5e1',
    dot: '#64748b',
    label: 'Jour férié',
  },
}

export function mergeAndSortEvents(events: NormalizedCalendarEvent[]): NormalizedCalendarEvent[] {
  return [...events].sort((a, b) => {
    const ta = a.start ? new Date(a.start).getTime() : Number.MAX_SAFE_INTEGER
    const tb = b.start ? new Date(b.start).getTime() : Number.MAX_SAFE_INTEGER
    return ta - tb
  })
}
