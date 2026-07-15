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
  clientPhone: string | null
  clientEmail: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  projectTitle: string | null
  responsibleUserId: string | null
  responsibleUserName: string | null
  actionUrl: string | null
  googleEventId: string | null
  googleEventUrl: string | null
  description: string | null
  color: string
  status: string | null
  // Lot planning d'équipe : affectation collaborateur (uniquement renseignée
  // pour les rendez-vous Kadria — null pour Google/actions de planning).
  assignedUserId: string | null
  assignedUserName: string | null
  isAssignedToCurrentUser: boolean
  isUnassigned: boolean
  qualification: RawKadriaAppointment['qualification']
  confirmation: RawKadriaAppointment['confirmation']
  // Identifiant brut en base (project_appointments.id), uniquement présent
  // pour les rendez-vous Kadria — nécessaire pour la réaffectation rapide
  // (PATCH /api/appointments/[id]/assign) sans dépendre du préfixe `id`.
  rawAppointmentId: string | null
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
  clientPhone: null,
  clientEmail: null,
  address: event.location,
  latitude: null,
  longitude: null,
  projectTitle: null,
  responsibleUserId: null,
  responsibleUserName: null,
  actionUrl: null,
    googleEventId: event.id,
    googleEventUrl: null,
    description: null,
    color: 'google',
    status: null,
    assignedUserId: null,
    assignedUserName: null,
    isAssignedToCurrentUser: false,
    isUnassigned: false,
    qualification: null,
    confirmation: null,
    rawAppointmentId: null,
  }
}

export interface RawKadriaAppointment {
  id: string
  projectId: string | null
  projectNumber: string | null
  clientName: string | null
  clientPhone?: string | null
  clientEmail?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  projectType: string | null
  city: string | null
  title: string | null
  start: string | null
  end: string | null
  location: string | null
  status: string | null
  googleEventId: string | null
  eventType?: string | null
  assignedUserId?: string | null
  assignedUserName?: string | null
  isAssignedToCurrentUser?: boolean
  isUnassigned?: boolean
  description?: string | null
  allDay?: boolean
  responsibleUserId?: string | null
  responsibleUserName?: string | null
  qualification?: {
    status: string
    outcome: string | null
    note: string | null
    nextAction: string | null
    qualifiedAt: string | null
    qualifiedBy: string | null
    version: number
  } | null
  confirmation?: { status: string; source: string | null; note: string | null; updatedAt: string | null; version: number } | null
}

function guessAppointmentType(a: RawKadriaAppointment): NormalizedEventType {
  // Le type d'événement explicite (event_type, colonne posée par la
  // migration 20260717) prime quand il est disponible.
  if (a.eventType === 'intervention' || a.eventType === 'site_visit') return 'chantier'
  if (a.eventType && a.eventType !== 'appointment') return 'rendez-vous'

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
    allDay: Boolean(a.allDay) || isAllDayValue(a.start),
    source: 'kadria-appointment',
    type,
    location: a.location,
    projectId: a.projectId,
    projectRecordId: a.projectId,
    projectInternalNumber: a.projectNumber,
    projectReference: reference ? `${reference}${clientLabel}` : null,
    clientName: a.clientName,
  clientPhone: a.clientPhone || null,
    clientEmail: a.clientEmail || null,
    address: a.address || a.location || null,
    latitude: typeof a.latitude === 'number' ? a.latitude : null,
    longitude: typeof a.longitude === 'number' ? a.longitude : null,
    projectTitle: a.projectType,
    responsibleUserId: a.responsibleUserId || null,
    responsibleUserName: a.responsibleUserName || null,
    actionUrl: hasProject ? `/dashboard-v2/projet/${a.projectId}` : null,
    googleEventId: a.googleEventId,
    googleEventUrl: null,
    description: a.description || null,
    color: type,
    status: a.status,
    assignedUserId: a.assignedUserId || null,
    assignedUserName: a.assignedUserName || null,
    isAssignedToCurrentUser: Boolean(a.isAssignedToCurrentUser),
    isUnassigned: Boolean(a.isUnassigned),
    qualification: a.qualification || null,
    confirmation: a.confirmation || null,
    rawAppointmentId: a.id,
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
    clientPhone: null,
    clientEmail: null,
    address: null,
    latitude: null,
    longitude: null,
    projectTitle: item.subtitle,
    responsibleUserId: null,
    responsibleUserName: null,
    actionUrl: hasProject ? `/dashboard-v2/projet/${item.projectId}` : null,
    googleEventId: null,
    googleEventUrl: null,
    description: item.subtitle,
    color: type,
    status: null,
    assignedUserId: null,
    assignedUserName: null,
    isAssignedToCurrentUser: false,
    isUnassigned: false,
    qualification: null,
    confirmation: null,
    rawAppointmentId: null,
  }
}

// Couleurs par type d'événement — palette discrète, cohérente en clair/sombre
// (cf. brief : rester premium, éviter les couleurs criardes).
export const EVENT_TYPE_STYLES: Record<
  NormalizedEventType,
  { bg: string; border: string; text: string; dot: string; label: string }
> = {
  'google-event': {
    bg: 'var(--calendar-google-bg)',
    border: 'var(--calendar-google-border)',
    text: 'var(--calendar-google-text)',
    dot: 'var(--calendar-google-dot)',
    label: 'Google Calendar',
  },
  'rendez-vous': {
    bg: 'var(--calendar-rdv-bg)',
    border: 'var(--calendar-rdv-border)',
    text: 'var(--calendar-rdv-text)',
    dot: 'var(--calendar-rdv-dot)',
    label: 'Rendez-vous',
  },
  chantier: {
    bg: 'var(--calendar-chantier-bg)',
    border: 'var(--calendar-chantier-border)',
    text: 'var(--calendar-chantier-text)',
    dot: 'var(--calendar-chantier-dot)',
    label: 'Chantier',
  },
  relance: {
    bg: 'var(--calendar-relance-bg)',
    border: 'var(--calendar-relance-border)',
    text: 'var(--calendar-relance-text)',
    dot: 'var(--calendar-relance-dot)',
    label: 'Relance',
  },
  'tache-commerciale': {
    bg: 'var(--calendar-task-bg)',
    border: 'var(--calendar-task-border)',
    text: 'var(--calendar-task-text)',
    dot: 'var(--calendar-task-dot)',
    label: 'Tâche commerciale',
  },
  'jour-ferie': {
    bg: 'var(--calendar-holiday-bg)',
    border: 'var(--calendar-holiday-border)',
    text: 'var(--calendar-holiday-text)',
    dot: 'var(--calendar-holiday-dot)',
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
