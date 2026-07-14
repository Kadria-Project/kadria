'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  FileText,
  Link2,
  MapPin,
  RefreshCw,
  Unplug,
  User,
  CheckCircle2,
} from 'lucide-react';
import LoadingSkeleton, { LoadingStyles } from '@/src/components/ui/loading/LoadingSkeleton';
import { normalizeCalendarMode, type CalendarMode, type KadriaPlanningProject } from '@/src/lib/kadria-planning';
import {
  EVENT_TYPE_STYLES,
  normalizeKadriaAppointment,
  type NormalizedCalendarEvent,
  type RawKadriaAppointment,
} from '@/src/lib/calendar/normalized-event';
import { EVENT_TYPES_UI, EVENT_TYPE_LABELS, type EventType } from '@/src/lib/calendar/event-types';

const COLORS = {
  bg: 'var(--bg)',
  bgElevated: 'var(--bg-elevated)',
  border: 'var(--border)',
  text1: 'var(--text-1)',
  text2: 'var(--text-2)',
  text3: 'var(--text-3)',
  accent: 'var(--accent)',
  accentDim: 'var(--accent-dim)',
  accentBorder: 'var(--accent-border)',
};

const card: React.CSSProperties = {
  background: COLORS.bgElevated,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '18px',
  padding: '18px',
};

type Router = ReturnType<typeof useRouter>;

type CalendarStatus = {
  connected: boolean;
  email: string | null;
};

type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  location: string | null;
};

type TeamMemberLite = {
  userId: string;
  name: string;
  role: string;
  isMe: boolean;
};

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

type NewGoogleEventForm = {
  titre: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  lieu: string;
  note: string;
};

type NewAppointmentForm = {
  titre: string;
  eventType: EventType;
  projectId: string;
  assignedUserId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  lieu: string;
  note: string;
};

const EMPTY_NEW_GOOGLE_EVENT_FORM: NewGoogleEventForm = {
  titre: '',
  date: '',
  heureDebut: '',
  heureFin: '',
  lieu: '',
  note: '',
};

const EMPTY_NEW_APPOINTMENT_FORM: NewAppointmentForm = {
  titre: '',
  eventType: 'appointment',
  projectId: '',
  assignedUserId: '',
  date: '',
  heureDebut: '',
  heureFin: '',
  lieu: '',
  note: '',
};

export interface MobileAgendaViewProps {
  router: Router;
}

function formatEventRange(start: string | null, end: string | null): string {
  if (!start) return '';
  try {
    const startDate = new Date(start);
    const datePart = startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    const startTime = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (!end) return `${datePart} · ${startTime}`;
    const endTime = new Date(end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} · ${startTime} - ${endTime}`;
  } catch {
    return '';
  }
}

function buildIsoDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

function formatDayLabel(value: string | null) {
  if (!value) return 'À planifier';
  try {
    return new Date(value).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
  } catch {
    return 'À planifier';
  }
}

function getAvailabilityMeta(availability: 'available' | 'soon' | 'busy') {
  if (availability === 'busy') return { label: 'Occupé', color: '#fca5a5', background: 'rgba(239,68,68,0.14)' };
  if (availability === 'soon') return { label: 'Bientôt occupé', color: '#fcd34d', background: 'rgba(245,158,11,0.14)' };
  return { label: 'Disponible', color: '#6ee7b7', background: 'rgba(16,185,129,0.14)' };
}

function getStableMemberColor(seed: string) {
  const palette = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#0ea5e9', '#a855f7'];
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % palette.length;
  return palette[Math.abs(hash) % palette.length];
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 12px',
        borderRadius: '999px',
        border: active ? `1px solid ${COLORS.accentBorder}` : `1px solid ${COLORS.border}`,
        background: active ? COLORS.accentDim : COLORS.bg,
        color: active ? COLORS.accent : COLORS.text2,
        fontSize: '12px',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function ModeCard({
  title,
  description,
  active,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '14px',
        borderRadius: '14px',
        border: active ? `1px solid ${COLORS.accentBorder}` : `1px solid ${COLORS.border}`,
        background: active ? COLORS.accentDim : COLORS.bg,
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: COLORS.text1 }}>{title}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', lineHeight: 1.5, color: COLORS.text2 }}>{description}</p>
        </div>
        {active && <CheckCircle2 style={{ width: 16, height: 16, color: COLORS.accent }} />}
      </div>
    </button>
  );
}

function AppointmentCard({
  appointment,
  onOpenProject,
}: {
  appointment: NormalizedCalendarEvent;
  onOpenProject: (projectId: string) => void;
}) {
  const style = EVENT_TYPE_STYLES[appointment.type];

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '14px',
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                padding: '4px 8px',
                borderRadius: '999px',
                background: style.bg,
                border: `1px solid ${style.border}`,
                color: style.text,
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {style.label}
            </span>
            {appointment.status && (
              <span
                style={{
                  display: 'inline-flex',
                  padding: '4px 8px',
                  borderRadius: '999px',
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text3,
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                {appointment.status}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: COLORS.text1 }}>{appointment.title}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: COLORS.text2 }}>{formatEventRange(appointment.start, appointment.end)}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p style={{ margin: 0, fontSize: '12px', color: COLORS.text3 }}>
          <User style={{ width: 12, height: 12, marginRight: '6px', verticalAlign: 'middle' }} />
          {appointment.isUnassigned ? 'Sans collaborateur' : appointment.assignedUserName || 'Collaborateur prévu'}
        </p>
        {appointment.clientName && (
          <p style={{ margin: 0, fontSize: '12px', color: COLORS.text3 }}>
            Client · {appointment.clientName}
          </p>
        )}
        {(appointment.address || appointment.location) && (
          <p style={{ margin: 0, fontSize: '12px', color: COLORS.text3 }}>
            <MapPin style={{ width: 12, height: 12, marginRight: '6px', verticalAlign: 'middle' }} />
            {appointment.address || appointment.location}
          </p>
        )}
        {appointment.projectTitle && (
          <p style={{ margin: 0, fontSize: '12px', color: COLORS.text3 }}>
            Dossier · {appointment.projectTitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {appointment.projectId && (
          <button
            type="button"
            onClick={() => onOpenProject(appointment.projectId as string)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '12px',
              border: `1px solid ${COLORS.border}`,
              background: COLORS.bgElevated,
              color: COLORS.text1,
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <FileText style={{ width: 14, height: 14 }} />
            Ouvrir le dossier
          </button>
        )}
        {(appointment.address || appointment.location) && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.address || appointment.location || '')}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '12px',
              border: `1px solid ${COLORS.border}`,
              background: COLORS.bgElevated,
              color: COLORS.text1,
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <MapPin style={{ width: 14, height: 14 }} />
            Itinéraire
          </a>
        )}
      </div>
    </div>
  );
}

export default function MobileAgendaView({ router }: MobileAgendaViewProps) {
  const searchParams = useSearchParams();

  const [calendarMode, setCalendarMode] = useState<CalendarMode>('kadria');
  const [modeSaving, setModeSaving] = useState<CalendarMode | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);

  const [statusLoading, setStatusLoading] = useState(true);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ connected: false, email: null });
  const [statusError, setStatusError] = useState<string | null>(null);

  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [projects, setProjects] = useState<KadriaPlanningProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<RawKadriaAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [insights, setInsights] = useState<PlanningInsights | null>(null);

  const [teamMembers, setTeamMembers] = useState<TeamMemberLite[]>([]);
  const [teamPermissions, setTeamPermissions] = useState<TeamPlanningPermissions>({
    canManageTeamPlanning: false,
    canAssignAppointments: false,
    canCreatePersonalAppointments: false,
  });
  const [collaboratorFilter, setCollaboratorFilter] = useState<CollaboratorFilter>('me');

  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [returnMessage, setReturnMessage] = useState<string | null>(null);

  const [showCreateGoogleForm, setShowCreateGoogleForm] = useState(false);
  const [creatingGoogleEvent, setCreatingGoogleEvent] = useState(false);
  const [googleCreateError, setGoogleCreateError] = useState<string | null>(null);
  const [googleCreateSuccess, setGoogleCreateSuccess] = useState<string | null>(null);
  const [newGoogleEvent, setNewGoogleEvent] = useState<NewGoogleEventForm>(EMPTY_NEW_GOOGLE_EVENT_FORM);

  const [showCreateAppointmentForm, setShowCreateAppointmentForm] = useState(false);
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [appointmentCreateError, setAppointmentCreateError] = useState<string | null>(null);
  const [appointmentCreateSuccess, setAppointmentCreateSuccess] = useState<string | null>(null);
  const [newAppointment, setNewAppointment] = useState<NewAppointmentForm>(EMPTY_NEW_APPOINTMENT_FORM);

  const normalizedAppointments = useMemo(
    () => appointments.map(normalizeKadriaAppointment).sort((a, b) => new Date(a.start || '').getTime() - new Date(b.start || '').getTime()),
    [appointments],
  );

  const unassignedCount = useMemo(
    () => normalizedAppointments.filter((appointment) => appointment.isUnassigned).length,
    [normalizedAppointments],
  );

  const planningEmptyMessage =
    collaboratorFilter === 'me'
      ? 'Aucun rendez-vous prévu pour vous.'
      : collaboratorFilter === 'all'
        ? "Aucun rendez-vous prévu pour l'équipe."
        : collaboratorFilter === 'unassigned'
          ? 'Aucun rendez-vous sans collaborateur.'
          : 'Aucun rendez-vous pour ce filtre.'

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, NormalizedCalendarEvent[]>();
    for (const appointment of normalizedAppointments) {
      const key = appointment.start ? new Date(appointment.start).toISOString().slice(0, 10) : 'unplanned';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(appointment);
    }
    return Array.from(map.entries());
  }, [normalizedAppointments]);

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
        setStatusError('Session expirée');
        setCalendarStatus({ connected: false, email: null });
        return;
      }
      const json = await response.json();
      if (!json.success) {
        setStatusError('Connexion Google impossible');
        setCalendarStatus({ connected: false, email: null });
        return;
      }
      setCalendarStatus({ connected: !!json.connected, email: json.email || null });
    } catch {
      setStatusError('Connexion Google impossible');
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
        setEventsError('Session expirée');
        return;
      }
      const json = await response.json();
      if (!json.success) {
        setEventsError('Connexion Google impossible');
        return;
      }
      setEvents(Array.isArray(json.events) ? json.events : []);
    } catch {
      setEventsError('Connexion Google impossible');
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
        setProjectsError('Session expirée');
        return;
      }
      const json = await response.json();
      if (!json.success) {
        setProjectsError('Chargement des dossiers impossible');
        return;
      }
      setProjects(Array.isArray(json.projects) ? json.projects : []);
    } catch {
      setProjectsError('Chargement des dossiers impossible');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/team/members-lite', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.success) {
        return;
      }
      const members = Array.isArray(json.members) ? json.members : [];
      setTeamMembers(members);
      setTeamPermissions({
        canManageTeamPlanning: Boolean(json.permissions?.canManageTeamPlanning),
        canAssignAppointments: Boolean(json.permissions?.canAssignAppointments),
        canCreatePersonalAppointments: Boolean(json.permissions?.canCreatePersonalAppointments),
      });
      const meMember = members.find((member: TeamMemberLite) => member.isMe);
      setCollaboratorFilter((current) => {
        if (current === 'all' && !json.permissions?.canManageTeamPlanning) return 'me';
        if (current && current !== 'all') return current;
        return json.permissions?.canManageTeamPlanning ? 'all' : meMember?.userId || 'me';
      });
    } catch {
      setTeamMembers([]);
    }
  }, []);

  const fetchAppointments = useCallback(async (filterOverride?: CollaboratorFilter) => {
    setAppointmentsLoading(true);
    setAppointmentsError(null);
    try {
      const params = new URLSearchParams();
      const activeFilter = filterOverride ?? collaboratorFilter;
      if (teamPermissions.canManageTeamPlanning && activeFilter && activeFilter !== 'all') {
        params.set('collaborator', activeFilter);
      }
      if (!teamPermissions.canManageTeamPlanning) {
        params.set('collaborator', 'me');
      }
      const response = await fetch(`/api/appointments/list?${params.toString()}`, { cache: 'no-store' });
      if (response.status === 401) {
        setAppointmentsError('Session expirée');
        return;
      }
      const json = await response.json();
      if (!response.ok || !json.success) {
        setAppointmentsError(json.error || 'Chargement du planning impossible');
        return;
      }
      setAppointments(Array.isArray(json.appointments) ? json.appointments : []);
      setInsights(json.insights || null);
    } catch {
      setAppointmentsError('Chargement du planning impossible');
    } finally {
      setAppointmentsLoading(false);
    }
  }, [collaboratorFilter, teamPermissions.canManageTeamPlanning]);

  useEffect(() => {
    fetchStatus();
    fetchAgendaConfig();
  }, [fetchAgendaConfig, fetchStatus]);

  useEffect(() => {
    void fetchTeamMembers();
    void fetchProjects();
  }, [fetchProjects, fetchTeamMembers]);

  useEffect(() => {
    if (calendarMode === 'google' && calendarStatus.connected) {
      void fetchEvents();
      return;
    }
    if (calendarMode === 'kadria') {
      void fetchAppointments();
      return;
    }
    setEvents([]);
  }, [calendarMode, calendarStatus.connected, fetchAppointments, fetchEvents]);

  useEffect(() => {
    const agendaParam = searchParams?.get('agenda');
    if (!agendaParam) return;

    if (agendaParam === 'connected') {
      setReturnMessage('Google Agenda connecté');
      void fetchStatus();
    } else if (agendaParam === 'error') {
      setReturnMessage('Connexion Google impossible');
    }

    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    params.delete('agenda');
    const query = params.toString();
    router.replace(query ? `/dashboard-v2?${query}` : '/dashboard-v2');
  }, [fetchStatus, router, searchParams]);

  const saveMode = useCallback(async (nextMode: CalendarMode) => {
    const previousMode = calendarMode;
    setCalendarMode(nextMode);
    setModeSaving(nextMode);
    setModeError(null);

    try {
      const response = await fetch('/api/artisan/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessConfig: { calendarMode: nextMode } }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error || 'Sauvegarde impossible');
      }
      setReturnMessage(nextMode === 'kadria' ? 'Planning Kadria actif' : 'Google Agenda affiché');
    } catch (error) {
      setCalendarMode(previousMode);
      setModeError(error instanceof Error ? error.message : "Impossible d'enregistrer votre préférence d'agenda.");
    } finally {
      setModeSaving(null);
    }
  }, [calendarMode]);

  const handleDisconnect = useCallback(async () => {
    setShowDisconnectConfirm(false);
    setDisconnecting(true);
    try {
      const response = await fetch('/api/integrations/google-calendar/disconnect', { method: 'POST' });
      if (response.status === 401) {
        setReturnMessage('Session expirée');
        return;
      }
      const json = await response.json();
      if (json.success) {
        setReturnMessage('Google Agenda déconnecté. Kadria ne mettra plus votre agenda à jour.');
        setEvents([]);
        await fetchStatus();
      } else {
        setReturnMessage('Connexion Google impossible');
      }
    } catch {
      setReturnMessage('Connexion Google impossible');
    } finally {
      setDisconnecting(false);
    }
  }, [fetchStatus]);

  const handleCreateGoogleEvent = useCallback(async () => {
    setGoogleCreateError(null);
    setGoogleCreateSuccess(null);

    if (!newGoogleEvent.titre || !newGoogleEvent.date || !newGoogleEvent.heureDebut || !newGoogleEvent.heureFin) {
      setGoogleCreateError('Motif, date, heure de début et heure de fin requis');
      return;
    }

    const start = buildIsoDateTime(newGoogleEvent.date, newGoogleEvent.heureDebut);
    const end = buildIsoDateTime(newGoogleEvent.date, newGoogleEvent.heureFin);

    setCreatingGoogleEvent(true);
    try {
      const response = await fetch('/api/integrations/google-calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newGoogleEvent.titre,
          description: newGoogleEvent.note || undefined,
          start,
          end,
          location: newGoogleEvent.lieu || undefined,
        }),
      });

      if (response.status === 401) {
        setGoogleCreateError('Session expirée');
        return;
      }

      const json = await response.json();
      if (!json.success) {
        setGoogleCreateError(json.error || 'Connexion Google impossible');
        return;
      }

      setGoogleCreateSuccess("Rendez-vous planifié. L'événement a été ajouté à Google Agenda.");
      setNewGoogleEvent(EMPTY_NEW_GOOGLE_EVENT_FORM);
      setShowCreateGoogleForm(false);
      await fetchEvents();
    } catch {
      setGoogleCreateError('Connexion Google impossible');
    } finally {
      setCreatingGoogleEvent(false);
    }
  }, [fetchEvents, newGoogleEvent]);

  const handleCreateAppointment = useCallback(async () => {
    setAppointmentCreateError(null);
    setAppointmentCreateSuccess(null);

    if (!newAppointment.titre || !newAppointment.date || !newAppointment.heureDebut || !newAppointment.heureFin) {
      setAppointmentCreateError('Motif, date, heure de début et heure de fin requis');
      return;
    }

    setCreatingAppointment(true);
    try {
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAppointment.titre,
          eventType: newAppointment.eventType,
          projectId: newAppointment.projectId || undefined,
          assignedUserId:
            teamPermissions.canManageTeamPlanning && newAppointment.assignedUserId
              ? newAppointment.assignedUserId
              : undefined,
          start: buildIsoDateTime(newAppointment.date, newAppointment.heureDebut),
          end: buildIsoDateTime(newAppointment.date, newAppointment.heureFin),
          location: newAppointment.lieu || undefined,
          description: newAppointment.note || undefined,
        }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        setAppointmentCreateError(json?.error || "Impossible d'enregistrer ce rendez-vous.");
        return;
      }

      setAppointmentCreateSuccess(json.conflictWarning?.message || 'Rendez-vous créé');
      setNewAppointment(EMPTY_NEW_APPOINTMENT_FORM);
      setShowCreateAppointmentForm(false);
      await fetchAppointments();
    } finally {
      setCreatingAppointment(false);
    }
  }, [fetchAppointments, newAppointment, teamPermissions.canManageTeamPlanning]);

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        id: project.id || '',
        label: [project.clientFirstName, project.clientName].filter(Boolean).join(' ').trim() || project.projectType || 'Dossier',
        meta: [project.projectType, project.city].filter(Boolean).join(' · '),
      })),
    [projects],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: COLORS.bg,
        margin: '-16px',
        padding: '16px',
        paddingBottom: '76px',
        borderRadius: '0',
        color: COLORS.text1,
      }}
    >
      <div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '999px',
            background: COLORS.accentDim,
            border: `1px solid ${COLORS.accentBorder}`,
            color: COLORS.accent,
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          <CalendarDays style={{ width: 14, height: 14 }} />
          Agenda Kadria
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: COLORS.text1, margin: '10px 0 0' }}>Planning de l'équipe</h1>
        <p style={{ fontSize: '13px', color: COLORS.text2, margin: '4px 0 0' }}>
          Retrouvez vos rendez-vous Kadria ou votre agenda Google selon votre façon de travailler.
        </p>
      </div>

      {returnMessage && (
        <div
          style={{
            ...card,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            background: returnMessage === 'Connexion Google impossible' ? 'rgba(220,38,38,0.08)' : COLORS.accentDim,
            border: `1px solid ${returnMessage === 'Connexion Google impossible' ? 'rgba(220,38,38,0.3)' : COLORS.accentBorder}`,
          }}
        >
          <p style={{ fontSize: '13px', color: COLORS.text1, margin: 0, fontWeight: 600 }}>{returnMessage}</p>
          <button
            type="button"
            onClick={() => setReturnMessage(null)}
            style={{ background: 'none', border: 'none', color: COLORS.text3, fontSize: '13px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Link2 style={{ width: 18, height: 18, color: COLORS.accent }} />
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>Agenda affiché</h2>
            <p style={{ fontSize: '12px', color: COLORS.text2, margin: '4px 0 0' }}>Choisissez simplement la vue qui vous aide le plus aujourd'hui.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <ModeCard
            title="Planning Kadria"
            description="Vos rendez-vous et actions du jour dans Kadria."
            active={calendarMode === 'kadria'}
            disabled={modeSaving !== null}
            onClick={() => void saveMode('kadria')}
          />
          <ModeCard
            title="Google Agenda"
            description="Vos rendez-vous Google sur le même écran."
            active={calendarMode === 'google'}
            disabled={modeSaving !== null}
            onClick={() => void saveMode('google')}
          />
        </div>

        {modeError && <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#fca5a5' }}>{modeError}</p>}
      </div>

      {calendarMode === 'kadria' ? (
        <>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>Planning Kadria</h2>
                <p style={{ fontSize: '12px', color: COLORS.text2, margin: '4px 0 0' }}>
                  {teamPermissions.canManageTeamPlanning
                    ? `${normalizedAppointments.length} rendez-vous visibles${unassignedCount > 0 ? ` · ${unassignedCount} sans collaborateur` : ''}`
                    : `${normalizedAppointments.length} rendez-vous sur votre planning`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchAppointments()}
                disabled={appointmentsLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text1,
                  fontSize: '12px',
                  fontWeight: 700,
                  opacity: appointmentsLoading ? 0.7 : 1,
                }}
              >
                <RefreshCw style={{ width: 14, height: 14 }} />
                Actualiser
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '12px' }}>
              <FilterChip
                label="Mon planning"
                active={collaboratorFilter === 'me'}
                onClick={() => {
                  setCollaboratorFilter('me');
                  void fetchAppointments('me');
                }}
              />
              {teamPermissions.canManageTeamPlanning && (
                <>
                  <FilterChip
                    label="Toute l'équipe"
                    active={collaboratorFilter === 'all'}
                    onClick={() => {
                      setCollaboratorFilter('all');
                      void fetchAppointments('all');
                    }}
                  />
                  <FilterChip
                    label="Sans collaborateur"
                    active={collaboratorFilter === 'unassigned'}
                    onClick={() => {
                      setCollaboratorFilter('unassigned');
                      void fetchAppointments('unassigned');
                    }}
                  />
                </>
              )}
            </div>

            {teamPermissions.canManageTeamPlanning && teamMembers.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: COLORS.text2 }}>
                  Collaborateur prévu
                </label>
                <select
                  value={collaboratorFilter === 'all' || collaboratorFilter === 'unassigned' || collaboratorFilter === 'me' ? '' : collaboratorFilter}
                  onChange={(e) => {
                    const next = e.target.value || 'all';
                    setCollaboratorFilter(next);
                    void fetchAppointments(next);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.bg,
                    color: COLORS.text1,
                    fontSize: '13px',
                  }}
                >
                  <option value="">Choisir un collaborateur</option>
                  {teamMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.isMe ? `${member.name} (moi)` : member.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {insights && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                  {[
                    { label: "Aujourd'hui", value: insights.summary.today },
                    { label: 'Demain', value: insights.summary.tomorrow },
                    { label: 'Cette semaine', value: insights.summary.thisWeek },
                    { label: 'Sans collaborateur', value: insights.summary.unassigned },
                  ].map((item) => (
                    <div key={item.label} style={{ padding: '12px', borderRadius: '14px', background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                      <p style={{ margin: 0, fontSize: '11px', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</p>
                      <p style={{ margin: '6px 0 0', fontSize: '22px', fontWeight: 800, color: COLORS.text1 }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {teamPermissions.canManageTeamPlanning && insights.teamLoad.length > 0 && (
                  <div style={{ padding: '12px', borderRadius: '14px', background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: COLORS.text1 }}>Charge de l'équipe</p>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: COLORS.text3 }}>Qui est disponible aujourd'hui et combien de rendez-vous chacun a.</p>
                      </div>
                      {insights.heatmap.busiest && (
                        <span style={{ fontSize: '11px', color: COLORS.text3 }}>Le plus chargé : {insights.heatmap.busiest.name}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {insights.teamLoad.map((member) => {
                        const color = getStableMemberColor(member.userId);
                        const availability = getAvailabilityMeta(member.availability);
                        return (
                          <div key={member.userId} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: '10px', alignItems: 'center' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '999px', background: `${color}22`, border: `1px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: '12px', fontWeight: 800 }}>
                              {member.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: COLORS.text1 }}>{member.name}</p>
                                <span style={{ fontSize: '11px', color: COLORS.text3 }}>{member.todayCount} rendez-vous</span>
                              </div>
                              <div style={{ marginTop: '6px', height: 6, borderRadius: '999px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                                <div style={{ width: `${member.loadPercent}%`, height: '100%', borderRadius: '999px', background: color }} />
                              </div>
                            </div>
                            <span style={{ whiteSpace: 'nowrap', padding: '6px 8px', borderRadius: '999px', background: availability.background, color: availability.color, fontSize: '11px', fontWeight: 700 }}>
                              {availability.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(insights.conflicts.length > 0 || insights.travelWarnings.length > 0) && (
                  <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.24)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: COLORS.text1 }}>Points à vérifier</p>
                    {insights.conflicts.slice(0, 2).map((conflict) => (
                      <div key={conflict.appointmentId} style={{ padding: '10px', borderRadius: '12px', background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(245,158,11,0.18)' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#fcd34d' }}>Chevauchement</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: COLORS.text2 }}>{conflict.collaboratorName} · {conflict.title}</p>
                      </div>
                    ))}
                    {insights.travelWarnings.slice(0, 1).map((warning) => (
                      <div key={warning.toAppointmentId} style={{ padding: '10px', borderRadius: '12px', background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(245,158,11,0.18)' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#fcd34d' }}>Temps de trajet trop court</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: COLORS.text2 }}>{warning.collaboratorName} · {warning.gapMinutes} min pour {warning.distanceKm} km</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {teamPermissions.canCreatePersonalAppointments && (
              <button
                type="button"
                onClick={() => {
                  setShowCreateAppointmentForm((value) => !value);
                  setAppointmentCreateError(null);
                  setAppointmentCreateSuccess(null);
                }}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px 0',
                  borderRadius: '12px',
                  background: COLORS.accent,
                  border: 'none',
                  color: '#052e16',
                  fontSize: '13px',
                  fontWeight: 700,
                  marginBottom: showCreateAppointmentForm ? '12px' : 0,
                }}
              >
                <CalendarDays style={{ width: 16, height: 16 }} />
                Créer un rendez-vous
              </button>
            )}

            {showCreateAppointmentForm && teamPermissions.canCreatePersonalAppointments && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                <input
                  placeholder="Motif du rendez-vous"
                  value={newAppointment.titre}
                  onChange={(e) => setNewAppointment((form) => ({ ...form, titre: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bg, color: COLORS.text1 }}
                />
                <select
                  value={newAppointment.eventType}
                  onChange={(e) => setNewAppointment((form) => ({ ...form, eventType: e.target.value as EventType }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bg, color: COLORS.text1 }}
                >
                  {EVENT_TYPES_UI.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {EVENT_TYPE_LABELS[eventType]}
                    </option>
                  ))}
                </select>
                <select
                  value={newAppointment.projectId}
                  onChange={(e) => setNewAppointment((form) => ({ ...form, projectId: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bg, color: COLORS.text1 }}
                >
                  <option value="">Aucun dossier lié</option>
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.meta ? `${project.label} · ${project.meta}` : project.label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newAppointment.date}
                  onChange={(e) => setNewAppointment((form) => ({ ...form, date: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bg, color: COLORS.text1 }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="time"
                    value={newAppointment.heureDebut}
                    onChange={(e) => setNewAppointment((form) => ({ ...form, heureDebut: e.target.value }))}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bg, color: COLORS.text1 }}
                  />
                  <input
                    type="time"
                    value={newAppointment.heureFin}
                    onChange={(e) => setNewAppointment((form) => ({ ...form, heureFin: e.target.value }))}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bg, color: COLORS.text1 }}
                  />
                </div>
                <input
                  placeholder="Adresse"
                  value={newAppointment.lieu}
                  onChange={(e) => setNewAppointment((form) => ({ ...form, lieu: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bg, color: COLORS.text1 }}
                />
                {teamPermissions.canManageTeamPlanning && (
                  <select
                    value={newAppointment.assignedUserId}
                    onChange={(e) => setNewAppointment((form) => ({ ...form, assignedUserId: e.target.value }))}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bg, color: COLORS.text1 }}
                  >
                    <option value="">Sans collaborateur</option>
                    {teamMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.isMe ? `${member.name} (moi)` : member.name}
                      </option>
                    ))}
                  </select>
                )}
                <textarea
                  placeholder="Notes utiles (optionnel)"
                  value={newAppointment.note}
                  onChange={(e) => setNewAppointment((form) => ({ ...form, note: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', resize: 'vertical', minHeight: '60px', background: COLORS.bg, color: COLORS.text1 }}
                />

                {appointmentCreateError && <p style={{ fontSize: '12px', color: '#fca5a5', margin: 0 }}>{appointmentCreateError}</p>}
                {appointmentCreateSuccess && <p style={{ fontSize: '12px', color: COLORS.accent, margin: 0 }}>{appointmentCreateSuccess}</p>}
                {projectsError && <p style={{ fontSize: '12px', color: COLORS.text3, margin: 0 }}>{projectsError}</p>}
                {projectsLoading && <p style={{ fontSize: '12px', color: COLORS.text3, margin: 0 }}>Chargement des disponibilités...</p>}

                <button
                  type="button"
                  onClick={() => void handleCreateAppointment()}
                  disabled={creatingAppointment}
                  style={{
                    padding: '11px 0',
                    borderRadius: '12px',
                    background: COLORS.accent,
                    border: 'none',
                    color: '#052e16',
                    fontSize: '14px',
                    fontWeight: 700,
                    opacity: creatingAppointment ? 0.7 : 1,
                  }}
                >
                  {creatingAppointment ? 'Création...' : 'Enregistrer le rendez-vous'}
                </button>
              </div>
            )}

            {appointmentsError ? (
              <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0 }}>{appointmentsError}</p>
            ) : appointmentsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <LoadingStyles />
                <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0 }}>Chargement du planning…</p>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: '12px', background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                    <LoadingSkeleton width="55%" height="13px" style={{ marginBottom: '6px' }} />
                    <LoadingSkeleton width="35%" height="12px" />
                  </div>
                ))}
              </div>
            ) : normalizedAppointments.length === 0 ? (
              <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0 }}>{planningEmptyMessage}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {appointmentsByDay.map(([dayKey, dayAppointments]) => (
                  <div key={dayKey} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: COLORS.text2, textTransform: 'capitalize' }}>
                      {dayKey === 'unplanned' ? 'À planifier' : formatDayLabel(dayAppointments[0]?.start || null)}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {dayAppointments.map((appointment) => (
                        <AppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          onOpenProject={(projectId) => router.push(`/dashboard-v2/projet/${projectId}`)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Link2 style={{ width: 18, height: 18, color: COLORS.accent }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>Google Agenda</h2>
            </div>

            {statusLoading ? (
              <p style={{ fontSize: '13px', color: COLORS.text3, margin: 0 }}>Vérification de la connexion...</p>
            ) : calendarStatus.connected ? (
              <>
                <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 10px' }}>
                  Google Agenda connecté{calendarStatus.email ? ` - ${calendarStatus.email}` : ''}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => void fetchEvents()}
                    disabled={eventsLoading}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '11px 0',
                      borderRadius: '12px',
                      background: COLORS.accent,
                      border: 'none',
                      color: '#052e16',
                      fontSize: '13px',
                      fontWeight: 700,
                      opacity: eventsLoading ? 0.7 : 1,
                    }}
                  >
                    <RefreshCw style={{ width: 14, height: 14 }} />
                    Mettre à jour
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDisconnectConfirm(true)}
                    disabled={disconnecting}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '11px 0',
                      borderRadius: '12px',
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.text1,
                      fontSize: '13px',
                      fontWeight: 700,
                      opacity: disconnecting ? 0.7 : 1,
                    }}
                  >
                    <Unplug style={{ width: 14, height: 14 }} />
                    Déconnecter
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 14px' }}>
                  Connectez Google Agenda pour retrouver vos rendez-vous synchronisés dans Kadria.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = '/api/integrations/google-calendar/connect';
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: '12px',
                    background: COLORS.accent,
                    border: 'none',
                    color: '#052e16',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  <CalendarDays style={{ width: 16, height: 16 }} />
                  Connecter Google Agenda
                </button>
                {statusError && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: 'rgba(220,38,38,0.08)',
                      border: '1px solid rgba(220,38,38,0.3)',
                    }}
                  >
                    <p style={{ fontSize: '12px', color: COLORS.text2, margin: 0, lineHeight: 1.5 }}>{statusError}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>Rendez-vous Google à venir</h2>
              {calendarStatus.connected && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGoogleForm((value) => !value);
                    setGoogleCreateError(null);
                    setGoogleCreateSuccess(null);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.accentBorder}`,
                    color: COLORS.accent,
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  <FileText style={{ width: 14, height: 14 }} />
                  Créer un rendez-vous
                </button>
              )}
            </div>

            {showCreateGoogleForm && calendarStatus.connected && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                <input
                  placeholder="Motif du rendez-vous"
                  value={newGoogleEvent.titre}
                  onChange={(e) => setNewGoogleEvent((form) => ({ ...form, titre: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bgElevated, color: COLORS.text1 }}
                />
                <input
                  type="date"
                  value={newGoogleEvent.date}
                  onChange={(e) => setNewGoogleEvent((form) => ({ ...form, date: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bgElevated, color: COLORS.text1 }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="time"
                    value={newGoogleEvent.heureDebut}
                    onChange={(e) => setNewGoogleEvent((form) => ({ ...form, heureDebut: e.target.value }))}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bgElevated, color: COLORS.text1 }}
                  />
                  <input
                    type="time"
                    value={newGoogleEvent.heureFin}
                    onChange={(e) => setNewGoogleEvent((form) => ({ ...form, heureFin: e.target.value }))}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bgElevated, color: COLORS.text1 }}
                  />
                </div>
                <input
                  placeholder="Adresse (optionnel)"
                  value={newGoogleEvent.lieu}
                  onChange={(e) => setNewGoogleEvent((form) => ({ ...form, lieu: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bgElevated, color: COLORS.text1 }}
                />
                <textarea
                  placeholder="Notes utiles (optionnel)"
                  value={newGoogleEvent.note}
                  onChange={(e) => setNewGoogleEvent((form) => ({ ...form, note: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', resize: 'vertical', minHeight: '60px', background: COLORS.bgElevated, color: COLORS.text1 }}
                />

                {googleCreateError && <p style={{ fontSize: '12px', color: '#fca5a5', margin: 0 }}>{googleCreateError}</p>}
                {googleCreateSuccess && <p style={{ fontSize: '12px', color: COLORS.accent, margin: 0 }}>{googleCreateSuccess}</p>}

                <button
                  type="button"
                  onClick={() => void handleCreateGoogleEvent()}
                  disabled={creatingGoogleEvent}
                  style={{
                    padding: '11px 0',
                    borderRadius: '12px',
                    background: COLORS.accent,
                    border: 'none',
                    color: '#052e16',
                    fontSize: '14px',
                    fontWeight: 700,
                    opacity: creatingGoogleEvent ? 0.7 : 1,
                  }}
                >
                  {creatingGoogleEvent ? 'Création...' : 'Enregistrer le rendez-vous'}
                </button>
              </div>
            )}

            {!calendarStatus.connected ? (
              <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0 }}>Connectez Google Agenda pour afficher vos rendez-vous.</p>
            ) : eventsError ? (
              <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0 }}>{eventsError}</p>
            ) : eventsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <LoadingStyles />
                {[0, 1].map((i) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: '12px', background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                    <LoadingSkeleton width="55%" height="13px" style={{ marginBottom: '6px' }} />
                    <LoadingSkeleton width="35%" height="12px" />
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0 }}>Aucun rendez-vous à venir.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {events.map((event) => (
                  <div key={event.id} style={{ padding: '10px 12px', borderRadius: '12px', background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text1, margin: '0 0 2px' }}>{event.title}</p>
                    <p style={{ fontSize: '12px', color: COLORS.text3, margin: 0 }}>{formatEventRange(event.start, event.end)}</p>
                    {event.location && (
                      <p style={{ fontSize: '12px', color: COLORS.text3, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin style={{ width: 12, height: 12 }} />
                        {event.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showDisconnectConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 50,
          }}
        >
          <div style={{ ...card, maxWidth: '380px', width: '100%' }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: '0 0 8px' }}>Déconnecter Google Agenda ?</p>
            <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 16px' }}>
              Vos rendez-vous déjà créés resteront dans Google Agenda, mais Kadria ne pourra plus mettre cet agenda à jour.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowDisconnectConfirm(false)}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: '12px',
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text1,
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleDisconnect()}
                disabled={disconnecting}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: '12px',
                  background: COLORS.accent,
                  border: 'none',
                  color: '#052e16',
                  fontSize: '13px',
                  fontWeight: 700,
                  opacity: disconnecting ? 0.7 : 1,
                }}
              >
                Déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
