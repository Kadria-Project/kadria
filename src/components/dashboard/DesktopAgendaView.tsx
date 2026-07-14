'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  MapPin,
  RefreshCw,
  Unplug,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Plus,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import LoadingSkeleton, { LoadingStyles } from '@/src/components/ui/loading/LoadingSkeleton';
import {
  buildKadriaPlanningItems,
  normalizeCalendarMode,
  type CalendarMode,
  type KadriaPlanningProject,
} from '@/src/lib/kadria-planning';
import {
  normalizeGoogleEvent,
  normalizeKadriaAppointment,
  normalizeKadriaPlanningItem,
  EVENT_TYPE_STYLES,
  type NormalizedCalendarEvent,
  type RawGoogleEvent,
  type RawKadriaAppointment,
} from '@/src/lib/calendar/normalized-event';
import { EVENT_TYPES_UI, EVENT_TYPE_LABELS, type EventType } from '@/src/lib/calendar/event-types';

type CalendarStatus = {
  connected: boolean;
  email: string | null;
};

type NewEventForm = {
  titre: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  lieu: string;
  note: string;
};

const EMPTY_NEW_EVENT_FORM: NewEventForm = {
  titre: '',
  date: '',
  heureDebut: '',
  heureFin: '',
  lieu: '',
  note: '',
};

type TeamMemberLite = { userId: string; name: string; role: string; isMe: boolean };
type TeamPlanningPermissions = {
  canManageTeamPlanning: boolean;
  canAssignAppointments: boolean;
  canCreatePersonalAppointments: boolean;
};

type PlanningInsights = {
  generatedAt: string;
  summary: {
    today: number;
    tomorrow: number;
    thisWeek: number;
    unassigned: number;
    conflicts: number;
  };
  teamLoad: Array<{
    userId: string;
    name: string;
    role: string;
    todayCount: number;
    loadPercent: number;
    availability: 'available' | 'soon' | 'busy';
    nextAppointmentAt: string | null;
  }>;
  conflicts: Array<{
    appointmentId: string;
    conflictingAppointmentId: string;
    title: string;
    conflictingTitle: string;
    collaboratorName: string;
    start: string | null;
    conflictingStart: string | null;
  }>;
  travelWarnings: Array<{
    collaboratorName: string;
    fromAppointmentId: string;
    toAppointmentId: string;
    fromTitle: string;
    toTitle: string;
    gapMinutes: number;
    distanceKm: number;
  }>;
  heatmap: {
    busiest: { name: string; count: number } | null;
    quietest: { name: string; count: number } | null;
  };
};

type CollaboratorFilter = 'all' | 'me' | 'unassigned' | string;

type QuickCreateForm = {
  titre: string;
  eventType: EventType;
  projectId: string;
  assignedUserId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  lieu: string;
  description: string;
};

const EMPTY_QUICK_CREATE_FORM: QuickCreateForm = {
  titre: '',
  eventType: 'appointment',
  projectId: '',
  assignedUserId: '',
  date: '',
  heureDebut: '',
  heureFin: '',
  lieu: '',
  description: '',
};

// Grille horaire desktop : 07:00 -> 20:00, comme une semaine Google Calendar
// classique. Les évènements en dehors de cette plage sont "clampés" sur les
// bords de la grille (jamais masqués, cf. robustesse demandée).
const GRID_START_HOUR = 7;
const GRID_END_HOUR = 20;
const HOUR_HEIGHT = 56; // px
const GRID_HEIGHT = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT;

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatPeriodLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth() && weekStart.getFullYear() === weekEnd.getFullYear();
  const startLabel = weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endLabel = weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function eventTimeRangeLabel(event: NormalizedCalendarEvent): string {
  if (event.allDay || !event.start) return 'Toute la journ\u00e9e';
  try {
    const start = new Date(event.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (!event.end) return start;
    const end = new Date(event.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${start} - ${end}`;
  } catch {
    return '';
  }
}

function formatShortDateTime(value: string | null) {
  if (!value) return 'Non planifi\u00e9'
  try {
    return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return 'Non planifi\u00e9'
  }
}

function formatDuration(event: NormalizedCalendarEvent) {
  if (!event.start || !event.end) return 'Dur\u00e9e non pr\u00e9cis\u00e9e'
  const start = new Date(event.start)
  const end = new Date(event.end)
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours} h ${remaining}` : `${hours} h`
}

function getAvailabilityCopy(availability: 'available' | 'soon' | 'busy') {
  if (availability === 'busy') return { label: 'Occup\u00e9', dot: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
  if (availability === 'soon') return { label: 'Bient\u00f4t occup\u00e9', dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
  return { label: 'Disponible', dot: '#34d399', bg: 'rgba(52,211,153,0.12)' }
}

function getStableMemberColor(seed: string) {
  const palette = [
    { bg: 'rgba(16,185,129,0.16)', border: 'rgba(16,185,129,0.35)', text: '#a7f3d0', solid: '#10b981' },
    { bg: 'rgba(59,130,246,0.16)', border: 'rgba(59,130,246,0.35)', text: '#bfdbfe', solid: '#3b82f6' },
    { bg: 'rgba(245,158,11,0.16)', border: 'rgba(245,158,11,0.35)', text: '#fde68a', solid: '#f59e0b' },
    { bg: 'rgba(236,72,153,0.16)', border: 'rgba(236,72,153,0.35)', text: '#fbcfe8', solid: '#ec4899' },
    { bg: 'rgba(14,165,233,0.16)', border: 'rgba(14,165,233,0.35)', text: '#bae6fd', solid: '#0ea5e9' },
    { bg: 'rgba(168,85,247,0.16)', border: 'rgba(168,85,247,0.35)', text: '#e9d5ff', solid: '#a855f7' },
  ];

  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % palette.length;
  return palette[Math.abs(hash) % palette.length];
}

// Positionnement + gestion basique des chevauchements : les évènements d'un
// même jour qui se recouvrent sont répartis côte à côte (jamais masqués).
function layoutDayEvents(dayEvents: NormalizedCalendarEvent[]) {
  const timed = dayEvents.filter((e) => !e.allDay && e.start);
  const sorted = [...timed].sort((a, b) => new Date(a.start as string).getTime() - new Date(b.start as string).getTime());

  type Positioned = { event: NormalizedCalendarEvent; top: number; height: number; column: number; columns: number };
  const positioned: Positioned[] = [];

  sorted.forEach((event) => {
    const start = new Date(event.start as string);
    const end = event.end ? new Date(event.end) : new Date(start.getTime() + 30 * 60 * 1000);

    const startHours = Math.max(GRID_START_HOUR, Math.min(GRID_END_HOUR, start.getHours() + start.getMinutes() / 60));
    const endHours = Math.max(GRID_START_HOUR, Math.min(GRID_END_HOUR, Math.max(end.getHours() + end.getMinutes() / 60, startHours + 0.5)));

    const top = (startHours - GRID_START_HOUR) * HOUR_HEIGHT;
    const height = Math.max(20, (endHours - startHours) * HOUR_HEIGHT);

    positioned.push({ event, top, height, column: 0, columns: 1 });
  });

  // Regroupe les évènements qui se chevauchent temporellement et leur
  // assigne une colonne (algorithme glouton simple, suffisant vu le volume
  // attendu par jour).
  for (let i = 0; i < positioned.length; i += 1) {
    const current = positioned[i];
    const overlapping = positioned.filter(
      (p) => p !== current && p.top < current.top + current.height && current.top < p.top + p.height,
    );
    const usedColumns = new Set(overlapping.filter((p) => p.column !== undefined && positioned.indexOf(p) < i).map((p) => p.column));
    let column = 0;
    while (usedColumns.has(column)) column += 1;
    current.column = column;
    const clusterMax = Math.max(column + 1, ...overlapping.map((p) => p.column + 1), 1);
    current.columns = clusterMax;
    overlapping.forEach((p) => {
      p.columns = Math.max(p.columns, clusterMax);
    });
  }

  return positioned;
}

function EventPopover({
  event,
  onClose,
  router,
  teamMembers,
  singleUserWorkspace,
  canReassign,
  onReassign,
  reassigning,
  reassignError,
}: {
  event: NormalizedCalendarEvent;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
  teamMembers: TeamMemberLite[];
  singleUserWorkspace: boolean;
  canReassign: boolean;
  onReassign: (event: NormalizedCalendarEvent, nextAssignedUserId: string | null) => void;
  reassigning: boolean;
  reassignError: string | null;
}) {
  const style = EVENT_TYPE_STYLES[event.type];
  const canReassignThisEvent = canReassign && event.source === 'kadria-appointment' && Boolean(event.rawAppointmentId) && !singleUserWorkspace;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose} role="presentation">
      <div
        className="w-full max-w-sm rounded-2xl border p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: style.dot }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: style.text }}>
              {style.label}
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="mt-3 text-base font-bold text-[var(--text-1)]">{event.title}</h3>
        <p className="mt-1 text-sm text-[var(--text-2)]">{eventTimeRangeLabel(event)}</p>

        {event.clientName && <p className="mt-3 text-sm font-semibold text-[var(--text-1)]">{event.clientName}</p>}
        {event.clientPhone && <p className="mt-1 text-sm text-[var(--text-3)]">T&eacute;l. : {event.clientPhone}</p>}
        {(event.address || event.location) && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--text-3)]">
            <MapPin className="h-3.5 w-3.5" />
            {event.address || event.location}
          </p>
        )}

        {event.projectReference && (
          <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs font-semibold text-[var(--text-2)]">Dossier concern&eacute;</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-1)]">{event.projectReference}</p>
            {event.responsibleUserName && (
              <p className="mt-1 text-xs text-[var(--text-3)]">Responsable commercial : {event.responsibleUserName}</p>
            )}
          </div>
        )}

        {canReassignThisEvent && (
          <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs font-semibold text-[var(--text-2)]">Collaborateur pr&eacute;vu</p>
            <p className="mt-1 text-sm text-[var(--text-1)]">
              {event.isUnassigned ? 'Sans collaborateur' : event.assignedUserName || 'Collaborateur'}
            </p>
            <select
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-xs text-[var(--text-1)]"
              value={event.assignedUserId || ''}
              disabled={reassigning}
              onChange={(e) => onReassign(event, e.target.value || null)}
            >
              <option value="">Sans collaborateur</option>
              {teamMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.isMe ? `${member.name} (moi)` : member.name}
                </option>
              ))}
            </select>
            {reassignError && <p className="mt-1 text-xs text-red-400">{reassignError}</p>}
          </div>
        )}

        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-xs text-[var(--text-2)]">
          <div className="flex items-center justify-between gap-3">
            <span>Date</span>
            <span className="font-medium text-[var(--text-1)]">{formatShortDateTime(event.start)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span>Dur&eacute;e</span>
            <span className="font-medium text-[var(--text-1)]">{formatDuration(event)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span>Collaborateur pr&eacute;vu</span>
            <span className="font-medium text-[var(--text-1)]">{event.isUnassigned ? 'Sans collaborateur' : event.assignedUserName || '-'}</span>
          </div>
        </div>

        {event.description && (
          <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs font-semibold text-[var(--text-2)]">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-1)]">{event.description}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {event.actionUrl && (
            <button
              type="button"
              onClick={() => router.push(event.actionUrl as string)}
              className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-400"
            >
              <FileText className="h-4 w-4" />
              Ouvrir le dossier
            </button>
          )}
          {(event.address || event.location) && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || event.location || '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
            >
              <MapPin className="h-4 w-4" />
              Google Maps
            </a>
          )}
          {event.googleEventUrl && (
            <a
              href={event.googleEventUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir dans Google Agenda
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DesktopAgendaView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeSaveCallCountRef = useRef(0);
  const modeSaveInFlightRef = useRef(false);

  const [calendarMode, setCalendarMode] = useState<CalendarMode>('kadria');
  const [modeSaving, setModeSaving] = useState<CalendarMode | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);

  const [statusLoading, setStatusLoading] = useState(true);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ connected: false, email: null });
  const [statusError, setStatusError] = useState<string | null>(null);

  const [googleEvents, setGoogleEvents] = useState<RawGoogleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [projects, setProjects] = useState<KadriaPlanningProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<RawKadriaAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [insights, setInsights] = useState<PlanningInsights | null>(null);
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [selectedTimelineDay, setSelectedTimelineDay] = useState<Date>(new Date());

  const [disconnecting, setDisconnecting] = useState(false);
  const [returnMessage, setReturnMessage] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<NewEventForm>(EMPTY_NEW_EVENT_FORM);

  const [view, setView] = useState<'jour' | 'semaine' | 'mois'>('semaine');
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMonday(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<NormalizedCalendarEvent | null>(null);

  // --- Planning d'équipe : sélecteur de collaborateurs + affectation ---
  const [teamMembers, setTeamMembers] = useState<TeamMemberLite[]>([]);
  const [singleUserWorkspace, setSingleUserWorkspace] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [teamPermissions, setTeamPermissions] = useState<TeamPlanningPermissions>({
    canManageTeamPlanning: false,
    canAssignAppointments: false,
    canCreatePersonalAppointments: false,
  });
  const [collaboratorFilter, setCollaboratorFilter] = useState<CollaboratorFilter>('all');

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreating, setQuickCreating] = useState(false);
  const [quickCreateError, setQuickCreateError] = useState<string | null>(null);
  const [quickCreateForm, setQuickCreateForm] = useState<QuickCreateForm>(EMPTY_QUICK_CREATE_FORM);

  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  // Toast succès/erreur pour la création rapide et la réaffectation — même
  // pattern que le toast existant dans ArtisanDashboard.tsx (état local
  // { visible, message, error } + auto-hide), pas de nouveau système.
  const [toast, setToast] = useState<{ visible: boolean; message: string; error?: boolean }>({
    visible: false,
    message: '',
  });
  const showToast = useCallback((message: string, error = false) => {
    setToast({ visible: true, message, error });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  const planningItems = useMemo(() => buildKadriaPlanningItems(projects), [projects]);

  const fetchAgendaConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/artisan/config');
      const json = await response.json();
      if (!json?.success) return;
      setCalendarMode(normalizeCalendarMode(json.config?.businessConfig?.calendarMode));
    } catch {
      setCalendarMode('kadria');
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const response = await fetch('/api/integrations/google-calendar/status');
      if (response.status === 401) {
        setStatusError('Session expiree');
        setCalendarStatus({ connected: false, email: null });
        return;
      }
      const json = await response.json();
      if (!json.success) {
        setStatusError("Connexion à Google Agenda impossible");
        setCalendarStatus({ connected: false, email: null });
        return;
      }
      setCalendarStatus({ connected: !!json.connected, email: json.email || null });
    } catch {
      setStatusError("Connexion à Google Agenda impossible");
      setCalendarStatus({ connected: false, email: null });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const response = await fetch('/api/integrations/google-calendar/events');
      if (response.status === 401) {
        setEventsError('Session expiree');
        return;
      }
      const json = await response.json();
      if (!json.success) {
        setEventsError("Connexion à Google Agenda impossible");
        return;
      }
      setGoogleEvents(Array.isArray(json.events) ? json.events : []);
    } catch {
      setEventsError("Connexion à Google Agenda impossible");
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const response = await fetch('/api/projects');
      if (response.status === 401) {
        setProjectsError('Session expiree');
        return;
      }
      const json = await response.json();
      if (!json.success) {
        setProjectsError('Chargement du planning impossible');
        return;
      }
      setProjects(Array.isArray(json.projects) ? json.projects : []);
    } catch {
      setProjectsError('Chargement du planning impossible');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const fetchAppointments = useCallback(async (rangeStart: Date, filterOverride?: CollaboratorFilter) => {
    setAppointmentsLoading(true);
    setAppointmentsError(null);
    try {
      const from = addDays(rangeStart, -1).toISOString();
      const to = addDays(rangeStart, 8).toISOString();
      const activeFilter = filterOverride ?? collaboratorFilter;
      const params = new URLSearchParams({
        from,
        to,
      });
      if (teamPermissions.canManageTeamPlanning && activeFilter && activeFilter !== 'all') {
        params.set('collaborator', activeFilter);
      }
      const response = await fetch(`/api/appointments/list?${params.toString()}`);
      if (response.status === 401) {
        setAppointmentsError('Session expiree');
        return;
      }
      const json = await response.json();
      if (!json.success) {
        setAppointmentsError('Chargement des rendez-vous impossible');
        return;
      }
      setAppointments(Array.isArray(json.appointments) ? json.appointments : []);
      setInsights(json.insights || null);
    } catch {
      setAppointmentsError('Chargement des rendez-vous impossible');
    } finally {
      setAppointmentsLoading(false);
    }
  }, [collaboratorFilter, teamPermissions.canManageTeamPlanning]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/team/members-lite');
      if (response.status === 401) return;
      const json = await response.json();
      if (!json?.success) return;
      const members = Array.isArray(json.members) ? (json.members as TeamMemberLite[]) : [];
      setTeamMembers(members);
      setSingleUserWorkspace(Boolean(json.singleUser));
      setCurrentUserId(json.currentUserId || null);
      setTeamPermissions({
        canManageTeamPlanning: Boolean(json.permissions?.canManageTeamPlanning),
        canAssignAppointments: Boolean(json.permissions?.canAssignAppointments),
        canCreatePersonalAppointments: Boolean(json.permissions?.canCreatePersonalAppointments),
      });
    } catch {
      // Compatibilité mono-utilisateur / démo stricte : en cas d'échec, on
      // reste en mode mono-utilisateur (sélecteur masqué), sans bloquer
      // l'agenda existant.
      setSingleUserWorkspace(true);
      setTeamPermissions({
        canManageTeamPlanning: false,
        canAssignAppointments: false,
        canCreatePersonalAppointments: false,
      });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchAgendaConfig();
    fetchTeamMembers();
    // Toujours chargé (indépendamment du mode Google/Kadria) pour alimenter
    // le sélecteur de projet de la création rapide depuis le planning.
    fetchProjects();
  }, [fetchAgendaConfig, fetchProjects, fetchStatus, fetchTeamMembers]);

  useEffect(() => {
    if (calendarMode === 'google' && calendarStatus.connected) {
      fetchEvents();
      return;
    }
    if (calendarMode === 'kadria') {
      fetchProjects();
      return;
    }
    setGoogleEvents([]);
  }, [calendarMode, calendarStatus.connected, fetchEvents, fetchProjects]);

  useEffect(() => {
    fetchAppointments(weekStart);
  }, [fetchAppointments, weekStart, collaboratorFilter]);

  useEffect(() => {
    const agendaParam = searchParams?.get('agenda');
    if (!agendaParam) return;

    if (agendaParam === 'connected') {
      setReturnMessage('Google Agenda connect\u00e9');
      fetchStatus();
    } else if (agendaParam === 'error') {
      setReturnMessage('Connexion Google impossible');
    }

    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    params.delete('agenda');
    const query = params.toString();
    router.replace(query ? `/dashboard-v2?${query}` : '/dashboard-v2');
  }, [fetchStatus, router, searchParams]);

  const saveMode = useCallback(async (nextMode: CalendarMode) => {
    if (nextMode === calendarMode) {
      console.info('[DESKTOP_AGENDA][MODE_SAVE_SKIPPED]', {
        reason: 'already_active',
        currentMode: calendarMode,
        nextMode,
      });
      return;
    }

    if (modeSaveInFlightRef.current) {
      console.info('[DESKTOP_AGENDA][MODE_SAVE_SKIPPED]', {
        reason: 'request_in_flight',
        currentMode: calendarMode,
        nextMode,
      });
      return;
    }

    modeSaveInFlightRef.current = true;
    modeSaveCallCountRef.current += 1;
    const previousMode = calendarMode;
    setCalendarMode(nextMode);
    setModeSaving(nextMode);
    setModeError(null);

    const payload = { businessConfig: { calendarMode: nextMode } };
    console.info('[DESKTOP_AGENDA][MODE_SAVE_REQUEST]', {
      callCount: modeSaveCallCountRef.current,
      currentMode: previousMode,
      nextMode,
      payload,
    });

    try {
      const response = await fetch('/api/artisan/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      console.info('[DESKTOP_AGENDA][MODE_SAVE_RESPONSE]', {
        callCount: modeSaveCallCountRef.current,
        currentMode: previousMode,
        nextMode,
        status: response.status,
        ok: response.ok,
        error: response.ok && json?.success ? null : json?.error || null,
      });
      if (!response.ok || !json.success) {
        throw new Error(json?.error || 'Sauvegarde impossible');
      }
      setReturnMessage(nextMode === 'kadria' ? 'Planning Kadria actif' : 'Google Agenda affiché');
    } catch (error) {
      console.info('[DESKTOP_AGENDA][MODE_SAVE_FAILED]', {
        callCount: modeSaveCallCountRef.current,
        currentMode: previousMode,
        nextMode,
        error: error instanceof Error ? error.message : String(error),
      });
      setCalendarMode(previousMode);
      setModeError(error instanceof Error ? error.message : "Impossible d'enregistrer votre preference d'agenda.");
    } finally {
      modeSaveInFlightRef.current = false;
      setModeSaving(null);
    }
  }, [calendarMode]);

  const handleDisconnect = useCallback(async () => {
    setShowDisconnectConfirm(false);
    setDisconnecting(true);
    try {
      const response = await fetch('/api/integrations/google-calendar/disconnect', { method: 'POST' });
      if (response.status === 401) {
        setReturnMessage('Session expir\u00e9e');
        return;
      }
      const json = await response.json();
      if (json.success) {
        setReturnMessage("Google Agenda déconnecté. Kadria ne mettra plus votre agenda à jour.");
        setGoogleEvents([]);
        await fetchStatus();
      } else {
        setReturnMessage("Connexion à Google Agenda impossible");
      }
    } catch {
      setReturnMessage("Connexion à Google Agenda impossible");
    } finally {
      setDisconnecting(false);
    }
  }, [fetchStatus]);

  const handleCreateEvent = useCallback(async () => {
    setCreateError(null);
    setCreateSuccess(null);

    if (!newEvent.titre || !newEvent.date || !newEvent.heureDebut || !newEvent.heureFin) {
      setCreateError('Motif, date, heure de d\u00e9but et heure de fin requis');
      return;
    }

    const start = `${newEvent.date}T${newEvent.heureDebut}:00`;
    const end = `${newEvent.date}T${newEvent.heureFin}:00`;

    setCreating(true);
    try {
      const response = await fetch('/api/integrations/google-calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEvent.titre,
          description: newEvent.note || undefined,
          start,
          end,
          location: newEvent.lieu || undefined,
        }),
      });

      if (response.status === 401) {
        setCreateError('Session expir\u00e9e');
        return;
      }

      const json = await response.json();
      if (!json.success) {
        setCreateError(json.error || "Connexion à Google Agenda impossible");
        return;
      }

      setCreateSuccess("Rendez-vous ajouté. Il apparaît maintenant dans Google Agenda.");
      setNewEvent(EMPTY_NEW_EVENT_FORM);
      setShowCreateForm(false);
      await fetchEvents();
    } catch {
      setCreateError("Connexion à Google Agenda impossible");
    } finally {
      setCreating(false);
    }
  }, [fetchEvents, newEvent]);

  const openQuickCreate = useCallback((day?: Date, hour?: number) => {
    setQuickCreateError(null);
    setQuickCreateForm({
      ...EMPTY_QUICK_CREATE_FORM,
      date: day ? isoDateOnly(day) : isoDateOnly(new Date()),
      heureDebut: typeof hour === 'number' ? `${String(hour).padStart(2, '0')}:00` : '',
      heureFin: typeof hour === 'number' ? `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00` : '',
      assignedUserId: singleUserWorkspace && currentUserId ? currentUserId : '',
    });
    setShowQuickCreate(true);
  }, [singleUserWorkspace, currentUserId]);

  const handleQuickCreateProjectChange = useCallback((projectId: string) => {
    setQuickCreateForm((form) => {
      const project = projects.find((p) => p.id === projectId);
      const clientLabel = project ? [project.clientFirstName, project.clientName].filter(Boolean).join(' ').trim() : '';
      return {
        ...form,
        projectId,
        titre: form.titre || (clientLabel ? `RDV - ${clientLabel}` : form.titre),
        lieu: form.lieu || (project?.city ? project.city : form.lieu),
      };
    });
  }, [projects]);

  const handleQuickCreate = useCallback(async () => {
    setQuickCreateError(null);

    if (!quickCreateForm.titre || !quickCreateForm.date || !quickCreateForm.heureDebut) {
      setQuickCreateError('Titre, date et heure de début requis');
      return;
    }

    const start = `${quickCreateForm.date}T${quickCreateForm.heureDebut}:00`;
    const end = quickCreateForm.heureFin ? `${quickCreateForm.date}T${quickCreateForm.heureFin}:00` : start;

    setQuickCreating(true);
    try {
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickCreateForm.titre,
          eventType: quickCreateForm.eventType,
          start,
          end,
          location: quickCreateForm.lieu || undefined,
          description: quickCreateForm.description || undefined,
          projectId: quickCreateForm.projectId || undefined,
          assignedUserId: quickCreateForm.assignedUserId || undefined,
        }),
      });

      if (response.status === 401) {
        setQuickCreateError('Session expirée');
        return;
      }

      const json = await response.json();
      if (!json.success) {
        setQuickCreateError(json.error || "Impossible d'ajouter le rendez-vous");
        showToast(json.error || "Impossible d'ajouter le rendez-vous", true);
        return;
      }

      setShowQuickCreate(false);
      setQuickCreateForm(EMPTY_QUICK_CREATE_FORM);
      showToast(json.conflictWarning?.message || 'Rendez-vous créé', Boolean(json.conflictWarning));
      await fetchAppointments(weekStart);
    } catch {
      setQuickCreateError("Impossible d'ajouter le rendez-vous");
      showToast("Impossible d'ajouter le rendez-vous", true);
    } finally {
      setQuickCreating(false);
    }
  }, [quickCreateForm, fetchAppointments, weekStart, showToast]);

  const handleReassign = useCallback(async (event: NormalizedCalendarEvent, nextAssignedUserId: string | null) => {
    if (!event.rawAppointmentId) return;
    // Pas de mise à jour optimiste de `selectedEvent`/`appointments` avant la
    // réponse serveur : l'UI reste sur l'état précédent tant que l'appel est
    // en cours, donc aucun rollback visuel n'est nécessaire en cas d'échec
    // (rien n'a été modifié optimistiquement) — on affiche simplement
    // l'erreur et l'état affiché reste celui d'avant la tentative.
    setReassigning(true);
    setReassignError(null);
    try {
      const response = await fetch(`/api/appointments/${event.rawAppointmentId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedUserId: nextAssignedUserId }),
      });
      const json = await response.json();
      if (!json.success) {
        setReassignError(json.error || 'Impossible de changer le collaborateur prévu');
        showToast(json.error || 'Impossible de changer le collaborateur prévu', true);
        return;
      }
      setSelectedEvent(null);
      showToast('Collaborateur prévu mis à jour');
      await fetchAppointments(weekStart);
    } catch {
      setReassignError('Impossible de changer le collaborateur prévu');
      showToast('Impossible de changer le collaborateur prévu', true);
    } finally {
      setReassigning(false);
    }
  }, [fetchAppointments, weekStart, showToast]);

  async function handleTimelineDrop(params: {
    eventId: string;
    targetUserId: string | null;
    day: Date;
    hour: number;
  }) {
    const event = normalizedEvents.find((item) => item.rawAppointmentId === params.eventId);
    if (!event?.rawAppointmentId || !event.start) return;

    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : new Date(start.getTime() + 60 * 60 * 1000);
    const durationMs = Math.max(30 * 60 * 1000, end.getTime() - start.getTime());
    const nextStart = new Date(params.day);
    nextStart.setHours(params.hour, 0, 0, 0);
    const nextEnd = new Date(nextStart.getTime() + durationMs);

    setDraggingEventId(null);
    try {
      const response = await fetch(`/api/appointments/${event.rawAppointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: nextStart.toISOString(),
          end: nextEnd.toISOString(),
          assignedUserId: params.targetUserId,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        showToast(json.error || 'Impossible de déplacer le rendez-vous', true);
        return;
      }
      showToast(json.conflictWarning?.message || 'Rendez-vous déplacé', Boolean(json.conflictWarning));
      await fetchAppointments(weekStart);
    } catch {
      showToast('Impossible de déplacer le rendez-vous', true);
    }
  }

  // Fusion des sources en évènements normalisés pour la semaine affichée.
  // - Mode Google : évènements Google, enrichis du lien dossier quand un
  //   rendez-vous Kadria correspondant existe (même google_event_id).
  // - Mode Kadria : rendez-vous Kadria (dates réelles) + actions du planning
  //   (relances/devis/actions commerciales, sans horaire fiable -> "à
  //   planifier").
  const normalizedEvents = useMemo<NormalizedCalendarEvent[]>(() => {
    const appointmentByGoogleId = new Map(
      appointments.filter((a) => a.googleEventId).map((a) => [a.googleEventId as string, a]),
    );

    if (calendarMode === 'google') {
      return googleEvents.map((event) => {
        const linked = appointmentByGoogleId.get(event.id);
        if (linked) {
          return normalizeKadriaAppointment({ ...linked, start: event.start ?? linked.start, end: event.end ?? linked.end });
        }
        return normalizeGoogleEvent(event);
      });
    }

    const appointmentEvents = appointments.map((a) => normalizeKadriaAppointment(a));
    const planningEvents = planningItems.map((item) => normalizeKadriaPlanningItem(item));
    return [...appointmentEvents, ...planningEvents];
  }, [appointments, calendarMode, googleEvents, planningItems]);

  // Filtrage collaborateur (Tous / Moi / <collaborateur> / Non affectés) —
  // appliqué uniquement aux rendez-vous Kadria (les évènements Google et les
  // actions du planning commercial n'ont pas de notion d'affectation dans
  // cette phase, ils restent toujours visibles).
  const collaboratorFilteredEvents = useMemo(() => {
    if (collaboratorFilter === 'all' || singleUserWorkspace) return normalizedEvents;
    return normalizedEvents.filter((event) => {
      if (event.source !== 'kadria-appointment') return true;
      if (collaboratorFilter === 'unassigned') return event.isUnassigned;
      if (collaboratorFilter === 'me') return event.assignedUserId === currentUserId;
      return event.assignedUserId === collaboratorFilter;
    });
  }, [normalizedEvents, collaboratorFilter, singleUserWorkspace, currentUserId]);

  const unassignedCount = useMemo(
    () => normalizedEvents.filter((event) => event.source === 'kadria-appointment' && event.isUnassigned).length,
    [normalizedEvents],
  );

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    const today = new Date();
    const todayInWeek = weekDays.find((day) => isSameDay(day, today));
    setSelectedTimelineDay((current) => {
      if (weekDays.some((day) => isSameDay(day, current))) return current;
      return todayInWeek || weekDays[0];
    });
  }, [weekDays]);
  // En vue Jour, on affiche le jour "courant" de la semaine sélectionnée
  // (aujourd'hui s'il est dans la semaine affichée, sinon le premier jour de
  // la semaine) — la navigation prev/next reste hebdomadaire pour rester
  // simple et cohérente avec l'en-tête.
  const visibleDays = useMemo(() => {
    if (view !== 'jour') return weekDays;
    const todayInWeek = weekDays.find((d) => isSameDay(d, new Date()));
    return [todayInWeek || weekDays[0]];
  }, [view, weekDays]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, NormalizedCalendarEvent[]>();
    for (const day of visibleDays) map.set(isoDateOnly(day), []);
    const unplaced: NormalizedCalendarEvent[] = [];

    for (const event of collaboratorFilteredEvents) {
      if (!event.start) {
        unplaced.push(event);
        continue;
      }
      const startDate = new Date(event.start);
      if (Number.isNaN(startDate.getTime())) {
        unplaced.push(event);
        continue;
      }
      const key = isoDateOnly(startDate);
      if (map.has(key)) {
        map.get(key)!.push(event);
      } else if (visibleDays.some((d) => isSameDay(d, startDate))) {
        map.set(key, [event]);
      }
    }

    return { map, unplaced };
  }, [collaboratorFilteredEvents, visibleDays]);

  const allDayEvents = useMemo(
    () => collaboratorFilteredEvents.filter((e) => e.allDay || (!e.start && e.source !== 'kadria-planning')),
    [collaboratorFilteredEvents],
  );

  const timelineMembers = useMemo(() => {
    const base = insights?.teamLoad || [];
    const rows = base.map((member) => ({
      ...member,
      color: getStableMemberColor(member.userId),
    }));
    if (insights?.summary.unassigned) {
      rows.push({
        userId: '__unassigned__',
        name: 'Non affectÃ©s',
        role: 'unassigned',
        todayCount: insights.summary.unassigned,
        loadPercent: 0,
        availability: 'available' as const,
        nextAppointmentAt: null,
        color: { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)', text: '#cbd5e1', solid: '#94a3b8' },
      });
    }
    return rows;
  }, [insights]);

  const selectedTimelineKey = useMemo(() => isoDateOnly(selectedTimelineDay), [selectedTimelineDay]);
  const timelineEvents = useMemo(
    () =>
      normalizedEvents.filter((event) => {
        if (event.source !== 'kadria-appointment' || event.allDay || !event.start) return false;
        const start = new Date(event.start);
        return !Number.isNaN(start.getTime()) && isSameDay(start, selectedTimelineDay);
      }),
    [normalizedEvents, selectedTimelineDay],
  );

  const timelineEventsByMember = useMemo(() => {
    const map = new Map<string, NormalizedCalendarEvent[]>();
    for (const member of timelineMembers) map.set(member.userId, []);
    for (const event of timelineEvents) {
      const key = event.assignedUserId || '__unassigned__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    for (const entry of map.values()) {
      entry.sort((a, b) => new Date(a.start || '').getTime() - new Date(b.start || '').getTime());
    }
    return map;
  }, [timelineEvents, timelineMembers]);

  const isLoading =
    (calendarMode === 'google' && eventsLoading) || (calendarMode === 'kadria' && projectsLoading) || appointmentsLoading;

  const planningEmptyMessage =
    collaboratorFilter === 'me'
      ? 'Aucun rendez-vous prévu pour vous.'
      : collaboratorFilter === 'unassigned'
        ? 'Aucun rendez-vous sans collaborateur.'
        : 'Aucun rendez-vous prévu sur cette période.'

  const today = new Date();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">Agenda</h1>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Vos rendez-vous, chantiers, relances et &eacute;v&eacute;nements Google en un coup d&apos;&oelig;il.
          </p>
        </div>
      </div>

      {returnMessage && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border p-4"
          style={{
            borderColor: returnMessage === "Connexion à Google Agenda impossible" ? 'rgba(220,38,38,0.3)' : 'var(--border)',
            background: returnMessage === "Connexion à Google Agenda impossible" ? 'rgba(220,38,38,0.08)' : 'var(--bg-elevated)',
          }}
        >
          <p className="text-sm font-semibold text-[var(--text-1)]">{returnMessage}</p>
          <button type="button" onClick={() => setReturnMessage(null)} className="text-sm text-[var(--text-3)] hover:text-[var(--text-1)]">
            &times;
          </button>
        </div>
      )}

      {/* Bandeau compact mode agenda (remplace le gros bloc précédent) */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-1.5">
        <button
          type="button"
          onClick={() => void saveMode('kadria')}
          disabled={modeSaving !== null}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            calendarMode === 'kadria' ? 'bg-green-500/15 text-green-400' : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          Planning Kadria
        </button>
        <button
          type="button"
          onClick={() => void saveMode('google')}
          disabled={modeSaving !== null}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            calendarMode === 'google' ? 'bg-green-500/15 text-green-400' : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          Google Calendar
        </button>
        <span className="mx-1 h-4 w-px bg-[var(--border)]" />
        {statusLoading ? (
          <span className="text-xs text-[var(--text-3)]">Chargement de Google Agenda...</span>
        ) : calendarStatus.connected ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-2)]">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Google Agenda connect&eacute;{calendarStatus.email ? ` - ${calendarStatus.email}` : ""}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              window.location.href = '/api/integrations/google-calendar/connect';
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 hover:underline"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Connecter Google Agenda
          </button>
        )}
        {calendarStatus.connected && (
          <button
            type="button"
            onClick={() => setShowDisconnectConfirm(true)}
            disabled={disconnecting}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--text-3)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]"
          >
            <Unplug className="h-3.5 w-3.5" />
            D&eacute;connecter Google Agenda
          </button>
        )}
        {modeError && <p className="w-full text-xs text-red-300">{modeError}</p>}
      </div>

      {/* Sélecteur de collaborateurs — masqué en tenant mono-utilisateur pour
          garder l'agenda strictement identique à l'existant. */}
      {!singleUserWorkspace && teamPermissions.canManageTeamPlanning && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-1.5">
          <Users className="ml-1 h-3.5 w-3.5 text-[var(--text-3)]" />
          {([
            { key: "all", label: "Toute l'\u00e9quipe" },
            { key: "me", label: "Mon planning" },
            ...teamMembers.filter((m) => !m.isMe).map((m) => ({ key: m.userId, label: m.name })),
            { key: "unassigned", label: "Sans collaborateur" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setCollaboratorFilter(opt.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                collaboratorFilter === opt.key ? 'bg-green-500/15 text-green-400' : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {teamPermissions.canManageTeamPlanning && unassignedCount > 0 && (
        <button
          type="button"
          onClick={() => setCollaboratorFilter('unassigned')}
          className="flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition hover:brightness-105"
          style={{ borderColor: 'rgba(234,179,8,0.35)', background: 'rgba(234,179,8,0.08)' }}
        >
          <span className="text-sm font-semibold text-[var(--text-1)]">
            {unassignedCount} rendez-vous{unassignedCount > 1 ? "s" : ""} sans collaborateur
          </span>
          <span className="text-xs font-semibold text-yellow-500">Voir ces rendez-vous &rarr;</span>
        </button>
      )}

      {/* En-tête calendrier */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeekMonday(new Date()))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            aria-label="Semaine pr&eacute;c&eacute;dente"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1.5 text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Semaine suivante"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1.5 text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <p className="ml-2 text-sm font-semibold text-[var(--text-1)]">{formatPeriodLabel(weekStart)}</p>
          <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-3)]">
            Semaine {getISOWeekNumber(weekStart)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg)] p-0.5">
            {(['jour', 'semaine', 'mois'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition ${
                  view === v ? 'bg-green-500/15 text-green-400' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {calendarMode === 'google' && calendarStatus.connected && (
            <button
              type="button"
              onClick={fetchEvents}
              disabled={eventsLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              Synchroniser
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!teamPermissions.canCreatePersonalAppointments) return;
              setShowCreateForm((value) => !value);
              setCreateError(null);
              setCreateSuccess(null);
            }}
            disabled={!teamPermissions.canCreatePersonalAppointments}
            className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-green-400"
          >
            <FileText className="h-4 w-4" />
            Nouveau rendez-vous
          </button>
          <button
            type="button"
            onClick={() => openQuickCreate()}
            disabled={!teamPermissions.canCreatePersonalAppointments}
            title="Ajout rapide dans le planning d&apos;&eacute;quipe"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
          >
            <Plus className="h-4 w-4" />
            Créer
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          {!calendarStatus.connected && (
            <p className="text-xs text-[var(--text-3)]">
              Connectez Google Agenda pour cr&eacute;er un rendez-vous synchronis&eacute;.
            </p>
          )}
          <input
            placeholder="Motif du rendez-vous"
            value={newEvent.titre}
            onChange={(e) => setNewEvent((form) => ({ ...form, titre: e.target.value }))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={newEvent.date}
              onChange={(e) => setNewEvent((form) => ({ ...form, date: e.target.value }))}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
            />
            <input
              type="time"
              value={newEvent.heureDebut}
              onChange={(e) => setNewEvent((form) => ({ ...form, heureDebut: e.target.value }))}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
            />
            <input
              type="time"
              value={newEvent.heureFin}
              onChange={(e) => setNewEvent((form) => ({ ...form, heureFin: e.target.value }))}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
            />
          </div>
          <input
            placeholder="Adresse (optionnel)"
            value={newEvent.lieu}
            onChange={(e) => setNewEvent((form) => ({ ...form, lieu: e.target.value }))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
          />
          <textarea
            placeholder="Notes utiles (optionnel)"
            value={newEvent.note}
            onChange={(e) => setNewEvent((form) => ({ ...form, note: e.target.value }))}
            className="min-h-[60px] resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
          />

          {createError && <p className="text-xs text-red-400">{createError}</p>}
          {createSuccess && <p className="text-xs text-green-400">{createSuccess}</p>}

          <button
            type="button"
            onClick={handleCreateEvent}
            disabled={creating || !calendarStatus.connected}
            className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-400 disabled:opacity-60"
          >
            {creating ? 'Creation...' : 'Valider'}
          </button>
        </div>
      )}

      {showQuickCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowQuickCreate(false)}>
          <div
            className="w-full max-w-md space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-1)]">Ajout rapide</h3>
              <button type="button" onClick={() => setShowQuickCreate(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              placeholder="Motif du rendez-vous"
              value={quickCreateForm.titre}
              onChange={(e) => setQuickCreateForm((f) => ({ ...f, titre: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
            />

            <select
              value={quickCreateForm.eventType}
              onChange={(e) => setQuickCreateForm((f) => ({ ...f, eventType: e.target.value as EventType }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
            >
              {EVENT_TYPES_UI.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>

            <select
              value={quickCreateForm.projectId}
              onChange={(e) => handleQuickCreateProjectChange(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
            >
              <option value="">Aucun dossier li&eacute; (optionnel)</option>
              {projects.filter((p) => p.id).map((p) => (
                <option key={p.id} value={p.id as string}>
                  {[p.clientFirstName, p.clientName].filter(Boolean).join(' ').trim() || p.id} {p.city ? `— ${p.city}` : ''}
                </option>
              ))}
            </select>

            {!singleUserWorkspace && teamPermissions.canManageTeamPlanning && (
              <select
                value={quickCreateForm.assignedUserId}
                onChange={(e) => setQuickCreateForm((f) => ({ ...f, assignedUserId: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
              >
                <option value="">Sans collaborateur</option>
                {teamMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.isMe ? `${m.name} (moi)` : m.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex gap-2">
              <input
                type="date"
                value={quickCreateForm.date}
                onChange={(e) => setQuickCreateForm((f) => ({ ...f, date: e.target.value }))}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
              />
              <input
                type="time"
                value={quickCreateForm.heureDebut}
                onChange={(e) => setQuickCreateForm((f) => ({ ...f, heureDebut: e.target.value }))}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
              />
              <input
                type="time"
                value={quickCreateForm.heureFin}
                onChange={(e) => setQuickCreateForm((f) => ({ ...f, heureFin: e.target.value }))}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
              />
            </div>

            <input
              placeholder="Adresse (optionnel)"
              value={quickCreateForm.lieu}
              onChange={(e) => setQuickCreateForm((f) => ({ ...f, lieu: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
            />
            <textarea
              placeholder="Notes utiles (optionnel)"
              value={quickCreateForm.description}
              onChange={(e) => setQuickCreateForm((f) => ({ ...f, description: e.target.value }))}
              className="min-h-[50px] w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
            />

            {quickCreateError && <p className="text-xs text-red-400">{quickCreateError}</p>}

            <button
              type="button"
              onClick={handleQuickCreate}
              disabled={quickCreating}
              className="w-full rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-400 disabled:opacity-60"
            >
              {quickCreating ? 'Cr\u00e9ation...' : 'Enregistrer le rendez-vous'}
            </button>
          </div>
        </div>
      )}

      {(eventsError || projectsError || appointmentsError || statusError) && (
        <p className="text-sm text-[var(--text-2)]">
          {eventsError || projectsError || appointmentsError || statusError}
        </p>
      )}

      {/* Zone évènements toute la journée */}
      {calendarMode === 'kadria' && insights && (
        <>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              { label: "Aujourd'hui", value: insights.summary.today },
              { label: 'Demain', value: insights.summary.tomorrow },
              { label: 'Cette semaine', value: insights.summary.thisWeek },
              { label: 'Sans collaborateur', value: insights.summary.unassigned },
              { label: 'Chevauchements', value: insights.summary.conflicts },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-3)]">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-1)]">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-1)]">Charge de l&apos;&eacute;quipe</h2>
                  <p className="mt-1 text-xs text-[var(--text-3)]">Qui est disponible aujourd&apos;hui et combien de rendez-vous chacun a.</p>
                </div>
                <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-3)]">
                  {selectedTimelineKey}
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {timelineMembers.map((member) => {
                  const availability = getAvailabilityCopy(member.availability);
                  return (
                    <div key={member.userId} className="rounded-xl border p-3" style={{ borderColor: member.color.border, background: member.color.bg }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ background: member.color.solid, color: '#04130c' }}>
                            {member.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-1)]">{member.name}</p>
                            <p className="text-xs text-[var(--text-3)]">{member.todayCount} RDV</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: availability.bg, color: availability.dot }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: availability.dot }} />
                          {availability.label}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
                        <div className="h-full rounded-full" style={{ width: `${member.loadPercent}%`, background: member.color.solid }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                <h2 className="text-sm font-semibold text-[var(--text-1)]">R&eacute;partition de la semaine</h2>
                <div className="mt-3 space-y-2 text-sm text-[var(--text-2)]">
                  <div className="flex items-center justify-between">
                    <span>Le plus occup&eacute;</span>
                    <span className="font-semibold text-[var(--text-1)]">{insights.heatmap.busiest ? `${insights.heatmap.busiest.name} · ${insights.heatmap.busiest.count}` : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Le moins occup&eacute;</span>
                    <span className="font-semibold text-[var(--text-1)]">{insights.heatmap.quietest ? `${insights.heatmap.quietest.name} · ${insights.heatmap.quietest.count}` : '—'}</span>
                  </div>
                </div>
              </div>

              {(insights.conflicts.length > 0 || insights.travelWarnings.length > 0) && (
                <div className="rounded-2xl border border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.08)] p-4">
                  <h2 className="text-sm font-semibold text-[var(--text-1)]">Points &agrave; v&eacute;rifier</h2>
                  <div className="mt-3 space-y-3">
                    {insights.conflicts.slice(0, 3).map((conflict) => (
                      <div key={conflict.appointmentId} className="rounded-xl border border-[rgba(245,158,11,0.25)] bg-black/10 p-3 text-xs text-[var(--text-2)]">
                        <p className="font-semibold text-yellow-300">Attention : deux rendez-vous se chevauchent</p>
                        <p className="mt-1">{conflict.collaboratorName} &middot; {conflict.title}</p>
                        <p>{formatShortDateTime(conflict.start)} &middot; conflit avec {conflict.conflictingTitle}</p>
                      </div>
                    ))}
                    {insights.travelWarnings.slice(0, 2).map((warning) => (
                      <div key={warning.toAppointmentId} className="rounded-xl border border-[rgba(245,158,11,0.25)] bg-black/10 p-3 text-xs text-[var(--text-2)]">
                        <p className="font-semibold text-yellow-300">Attention : temps de trajet probablement trop court</p>
                        <p className="mt-1">{warning.collaboratorName} · {warning.gapMinutes} min pour {warning.distanceKm} km</p>
                        <p>{warning.fromTitle} &rarr; {warning.toTitle}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {teamPermissions.canManageTeamPlanning && timelineMembers.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-1)]">Planning d&eacute;taill&eacute; de l&apos;&eacute;quipe</h2>
                  <p className="mt-1 text-xs text-[var(--text-3)]">Glissez un rendez-vous pour changer l&apos;heure ou le collaborateur pr&eacute;vu.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={isoDateOnly(day)}
                      type="button"
                      onClick={() => setSelectedTimelineDay(day)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${isSameDay(day, selectedTimelineDay) ? 'bg-green-500/15 text-green-400' : 'bg-[var(--bg)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]'}`}
                    >
                      {day.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' })}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <div className="min-w-[980px]">
                  <div className="ml-[220px] grid grid-cols-13 gap-2 text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                    {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, index) => (
                      <div key={index} className="rounded-lg bg-[var(--bg)] px-2 py-1 text-center">
                        {String(GRID_START_HOUR + index).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-3">
                    {timelineMembers.map((member) => {
                      const memberEvents = timelineEventsByMember.get(member.userId) || [];
                      const availability = getAvailabilityCopy(member.availability);
                      return (
                        <div key={member.userId} className="grid grid-cols-[220px_1fr] gap-3">
                          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ background: member.color.solid, color: '#04130c' }}>
                                {member.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--text-1)]">{member.name}</p>
                                <p className="text-xs text-[var(--text-3)]">{member.todayCount} rendez-vous</p>
                              </div>
                            </div>
                            <span className="mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: availability.bg, color: availability.dot }}>
                              <span className="h-2 w-2 rounded-full" style={{ background: availability.dot }} />
                              {availability.label}
                            </span>
                          </div>
                          <div className="relative rounded-xl border border-[var(--border)] bg-[var(--bg)] p-2" style={{ minHeight: 96 }}>
                            <div className="grid grid-cols-13 gap-2">
                              {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, index) => (
                                <div
                                  key={index}
                                  onDragOver={(event) => event.preventDefault()}
                                  onDrop={(event) => {
                                    event.preventDefault();
                                    const appointmentId = event.dataTransfer.getData('text/appointment-id');
                                    if (!appointmentId) return;
                                    void handleTimelineDrop({
                                      eventId: appointmentId,
                                      targetUserId: member.userId === '__unassigned__' ? null : member.userId,
                                      day: selectedTimelineDay,
                                      hour: GRID_START_HOUR + index,
                                    });
                                  }}
                                  className="h-20 rounded-lg border border-dashed border-[var(--border-soft)] bg-[var(--bg-elevated)]/40"
                                />
                              ))}
                            </div>

                            {memberEvents.map((event) => {
                              if (!event.start) return null;
                              const start = new Date(event.start);
                              const end = event.end ? new Date(event.end) : new Date(start.getTime() + 60 * 60 * 1000);
                              const startHours = start.getHours() + start.getMinutes() / 60;
                              const endHours = end.getHours() + end.getMinutes() / 60;
                              const left = ((startHours - GRID_START_HOUR) / (GRID_END_HOUR - GRID_START_HOUR)) * 100;
                              const width = (Math.max(0.75, endHours - startHours) / (GRID_END_HOUR - GRID_START_HOUR)) * 100;
                              const memberColor = getStableMemberColor(event.assignedUserId || event.id);
                              return (
                                <button
                                  key={event.id}
                                  type="button"
                                  draggable
                                  onDragStart={(dragEvent) => {
                                    dragEvent.dataTransfer.setData('text/appointment-id', event.rawAppointmentId || '');
                                    setDraggingEventId(event.rawAppointmentId || event.id);
                                  }}
                                  onDragEnd={() => setDraggingEventId(null)}
                                  onClick={() => setSelectedEvent(event)}
                                  className="absolute top-2 rounded-xl border px-3 py-2 text-left shadow-sm transition hover:-translate-y-[1px]"
                                  style={{
                                    left: `${Math.max(0, left)}%`,
                                    width: `calc(${Math.min(width, 100)}% - 8px)`,
                                    minWidth: 120,
                                    background: memberColor.bg,
                                    borderColor: memberColor.border,
                                    color: memberColor.text,
                                    opacity: draggingEventId && draggingEventId === event.rawAppointmentId ? 0.6 : 1,
                                  }}
                                >
                                  <p className="truncate text-[11px] font-semibold">{eventTimeRangeLabel(event)}</p>
                                  <p className="truncate text-sm font-semibold">{event.clientName || event.title}</p>
                                  <p className="truncate text-[11px] opacity-80">{event.location || event.address || EVENT_TYPE_STYLES[event.type].label}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {allDayEvents.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
            Toute la journ&eacute;e / &Agrave; planifier
          </p>
          <div className="flex flex-wrap gap-2">
            {allDayEvents.map((event) => {
              const style = EVENT_TYPE_STYLES[event.type];
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEvent(event)}
                  className="rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition hover:brightness-110"
                  style={{ background: style.bg, borderColor: style.border, color: style.text }}
                >
                  {event.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grille semaine/jour */}
      {view === 'mois' ? (
        <MonthFallbackView weekStart={weekStart} events={normalizedEvents} onSelectEvent={setSelectedEvent} onPickWeek={(d) => { setWeekStart(startOfWeekMonday(d)); setView('semaine'); }} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]">
          <LoadingStyles />
          <div className="min-w-[760px]">
            {/* En-têtes jours */}
            <div className="flex border-b border-[var(--border)]">
              <div className="w-16 shrink-0" />
              {visibleDays.map((day) => {
                const isToday = isSameDay(day, today);
                return (
                  <div key={isoDateOnly(day)} className="flex-1 border-l border-[var(--border)] p-2 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                      {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </p>
                    <p
                      className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday ? 'bg-green-500 text-black' : 'text-[var(--text-1)]'
                      }`}
                    >
                      {day.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Corps grille */}
            {isLoading ? (
              <div className="flex flex-col gap-2 p-4">
                <p className="text-sm text-[var(--text-2)]">Chargement du planning…</p>
                {[0, 1, 2].map((i) => (
                  <LoadingSkeleton key={i} width="100%" height="48px" />
                ))}
              </div>
            ) : (
              <div className="relative flex" style={{ height: GRID_HEIGHT }}>
                <div className="w-16 shrink-0">
                  {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => (
                    <div
                      key={i}
                      className="relative border-t text-right"
                      style={{ height: HOUR_HEIGHT, borderColor: 'var(--border-soft)', background: 'var(--bg-elevated)' }}
                    >
                      <span
                        className="absolute right-2 z-10 rounded-full px-1.5 text-[11px] font-medium text-[var(--text-3)]"
                        style={{ top: '6px', background: 'var(--bg-elevated)' }}
                      >
                        {String(GRID_START_HOUR + i).padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>

                {visibleDays.map((day) => {
                  const key = isoDateOnly(day);
                  const dayEvents = eventsByDay.map.get(key) || [];
                  const positioned = layoutDayEvents(dayEvents);
                  const isToday = isSameDay(day, today);
                  return (
                    <div
                      key={key}
                      className="relative flex-1 border-l"
                      style={{ borderColor: 'var(--border)', background: isToday ? 'rgba(52,211,153,0.04)' : 'transparent' }}
                    >
                      {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => (
                        <div
                          key={i}
                          role="button"
                          tabIndex={-1}
                          onClick={() => openQuickCreate(day, GRID_START_HOUR + i)}
                          className="cursor-pointer border-t hover:bg-[var(--bg-hover)]"
                          style={{ height: HOUR_HEIGHT, borderColor: 'var(--border-soft)' }}
                        />
                      ))}

                      {positioned.map(({ event, top, height, column, columns }) => {
                        const style = EVENT_TYPE_STYLES[event.type];
                        const widthPct = 100 / columns;
                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelectedEvent(event)}
                            className="absolute overflow-hidden rounded-lg border px-2 py-1 text-left text-xs shadow-sm transition hover:z-10 hover:-translate-y-[1px] hover:shadow-md"
                            style={{
                              top,
                              height,
                              left: `${column * widthPct}%`,
                              width: `calc(${widthPct}% - 4px)`,
                              background: style.bg,
                              borderColor: style.border,
                              borderLeftColor: style.dot,
                              borderLeftWidth: '4px',
                              color: style.text,
                              boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
                            }}
                            title={event.title}
                          >
                            <p className="truncate font-semibold">{event.title}</p>
                            {height > 32 && <p className="truncate opacity-90">{eventTimeRangeLabel(event)}</p>}
                            {height > 46 && event.projectReference && (
                              <p className="truncate opacity-80">{event.projectReference}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!isLoading && collaboratorFilteredEvents.length === 0 && allDayEvents.length === 0 && (
        <p className="text-sm text-[var(--text-2)]">
          {calendarMode === 'google' && !calendarStatus.connected
            ? 'Connectez Google Agenda pour afficher vos rendez-vous synchronis\u00e9s.'
            : planningEmptyMessage}
        </p>
      )}

      {selectedEvent && (
        <EventPopover
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          router={router}
          teamMembers={teamMembers}
          singleUserWorkspace={singleUserWorkspace}
          canReassign={teamPermissions.canAssignAppointments}
          onReassign={handleReassign}
          reassigning={reassigning}
          reassignError={reassignError}
        />
      )}

      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <p className="text-base font-bold text-[var(--text-1)]">D&eacute;connecter Google Agenda ?</p>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Vos rendez-vous d&eacute;j&agrave; cr&eacute;&eacute;s resteront dans Google Agenda, mais Kadria ne pourra plus mettre cet agenda &agrave; jour.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDisconnectConfirm(false)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                Déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-opacity duration-300 ${
          toast.visible ? 'opacity-100' : 'pointer-events-none opacity-0'
        } ${toast.error ? 'border-red-600 bg-[var(--bg-elevated)] text-red-400' : 'border-green-500/30 bg-[var(--bg-elevated)] text-[var(--text-1)]'}`}
      >
        {toast.error ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
        {toast.message}
      </div>
    </div>
  );
}

// Vue "mois" simplifiée (pas une reproduction complète Google Calendar) :
// grille de jours avec un compteur d'évènements, clic -> bascule sur la
// semaine correspondante en vue Semaine (qui reste la vue complète et
// détaillée demandée par le brief).
function MonthFallbackView({
  weekStart,
  events,
  onSelectEvent,
  onPickWeek,
}: {
  weekStart: Date;
  events: NormalizedCalendarEvent[];
  onSelectEvent: (event: NormalizedCalendarEvent) => void;
  onPickWeek: (date: Date) => void;
}) {
  const monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
  const gridStart = startOfWeekMonday(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();

  const eventsByDay = new Map<string, NormalizedCalendarEvent[]>();
  for (const event of events) {
    if (!event.start) continue;
    const d = new Date(event.start);
    if (Number.isNaN(d.getTime())) continue;
    const key = isoDateOnly(d);
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(event);
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-[var(--text-3)]">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = isoDateOnly(day);
          const dayEvents = eventsByDay.get(key) || [];
          const isCurrentMonth = day.getMonth() === monthStart.getMonth();
          const isToday = isSameDay(day, today);
          return (
            <button
              key={key}
              type="button"
              onClick={() => (dayEvents[0] ? onSelectEvent(dayEvents[0]) : onPickWeek(day))}
              onDoubleClick={() => onPickWeek(day)}
              className={`flex min-h-[64px] flex-col items-start rounded-lg border p-1.5 text-left transition hover:bg-[var(--bg-hover)] ${
                isCurrentMonth ? '' : 'opacity-40'
              }`}
              style={{ borderColor: 'var(--border)' }}
            >
              <span className={`text-xs font-semibold ${isToday ? 'rounded-full bg-green-500 px-1.5 text-black' : 'text-[var(--text-1)]'}`}>
                {day.getDate()}
              </span>
              {dayEvents.slice(0, 2).map((e) => (
                <span key={e.id} className="mt-1 w-full truncate text-[10px] text-[var(--text-3)]">
                  {e.title}
                </span>
              ))}
              {dayEvents.length > 2 && <span className="text-[10px] text-[var(--text-3)]">+{dayEvents.length - 2}</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-3)]">Cliquez sur un jour pour ouvrir la semaine correspondante en vue d&eacute;taill&eacute;e.</p>
    </div>
  );
}
