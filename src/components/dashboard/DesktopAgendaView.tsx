'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  if (event.allDay || !event.start) return 'Toute la journée';
  try {
    const start = new Date(event.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (!event.end) return start;
    const end = new Date(event.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${start} - ${end}`;
  } catch {
    return '';
  }
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
}: {
  event: NormalizedCalendarEvent;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const style = EVENT_TYPE_STYLES[event.type];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
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

        {event.location && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--text-3)]">
            <MapPin className="h-3.5 w-3.5" />
            {event.location}
          </p>
        )}

        {event.clientName && !event.projectReference && (
          <p className="mt-2 text-sm text-[var(--text-3)]">Client : {event.clientName}</p>
        )}

        {event.projectReference && (
          <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs font-semibold text-[var(--text-2)]">Dossier lié</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-1)]">{event.projectReference}</p>
          </div>
        )}

        {!event.projectReference && event.type !== 'google-event' && event.projectId && (
          <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-sm text-[var(--text-2)]">Dossier lié</p>
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
          {event.googleEventUrl && (
            <a
              href={event.googleEventUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--bg-hover)]"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir dans Google Calendar
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
        setEventsError('Session expiree');
        return;
      }
      const json = await response.json();
      if (!json.success) {
        setEventsError('Connexion Google impossible');
        return;
      }
      setGoogleEvents(Array.isArray(json.events) ? json.events : []);
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

  const fetchAppointments = useCallback(async (rangeStart: Date) => {
    setAppointmentsLoading(true);
    setAppointmentsError(null);
    try {
      const from = addDays(rangeStart, -1).toISOString();
      const to = addDays(rangeStart, 8).toISOString();
      const response = await fetch(`/api/appointments/list?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
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
    } catch {
      setAppointmentsError('Chargement des rendez-vous impossible');
    } finally {
      setAppointmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchAgendaConfig();
  }, [fetchAgendaConfig, fetchStatus]);

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
  }, [fetchAppointments, weekStart]);

  useEffect(() => {
    const agendaParam = searchParams?.get('agenda');
    if (!agendaParam) return;

    if (agendaParam === 'connected') {
      setReturnMessage('Google Calendar connecte');
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
      setReturnMessage(nextMode === 'kadria' ? 'Planning Kadria actif' : 'Google Calendar selectionne');
    } catch {
      setCalendarMode(previousMode);
      setModeError("Impossible d'enregistrer votre preference d'agenda.");
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
        setReturnMessage('Session expiree');
        return;
      }
      const json = await response.json();
      if (json.success) {
        setReturnMessage('Google Calendar deconnecte. Kadria ne synchronisera plus votre agenda.');
        setGoogleEvents([]);
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

  const handleCreateEvent = useCallback(async () => {
    setCreateError(null);
    setCreateSuccess(null);

    if (!newEvent.titre || !newEvent.date || !newEvent.heureDebut || !newEvent.heureFin) {
      setCreateError('Titre, date, heure de debut et heure de fin requis');
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
        setCreateError('Session expiree');
        return;
      }

      const json = await response.json();
      if (!json.success) {
        setCreateError(json.error || 'Connexion Google impossible');
        return;
      }

      setCreateSuccess("Rendez-vous planifie. L'evenement a ete ajoute a Google Calendar.");
      setNewEvent(EMPTY_NEW_EVENT_FORM);
      setShowCreateForm(false);
      await fetchEvents();
    } catch {
      setCreateError('Connexion Google impossible');
    } finally {
      setCreating(false);
    }
  }, [fetchEvents, newEvent]);

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

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
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

    for (const event of normalizedEvents) {
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
  }, [normalizedEvents, visibleDays]);

  const allDayEvents = useMemo(
    () => normalizedEvents.filter((e) => e.allDay || (!e.start && e.source !== 'kadria-planning')),
    [normalizedEvents],
  );

  const isLoading =
    (calendarMode === 'google' && eventsLoading) || (calendarMode === 'kadria' && projectsLoading) || appointmentsLoading;

  const today = new Date();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">Agenda</h1>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Vos rendez-vous, chantiers, relances et évènements Google en un coup d&apos;œil.
          </p>
        </div>
      </div>

      {returnMessage && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border p-4"
          style={{
            borderColor: returnMessage === 'Connexion Google impossible' ? 'rgba(220,38,38,0.3)' : 'var(--border)',
            background: returnMessage === 'Connexion Google impossible' ? 'rgba(220,38,38,0.08)' : 'var(--bg-elevated)',
          }}
        >
          <p className="text-sm font-semibold text-[var(--text-1)]">{returnMessage}</p>
          <button type="button" onClick={() => setReturnMessage(null)} className="text-sm text-[var(--text-3)] hover:text-[var(--text-1)]">
            ×
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
          <span className="text-xs text-[var(--text-3)]">Vérification Google...</span>
        ) : calendarStatus.connected ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-2)]">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Google connecté{calendarStatus.email ? ` · ${calendarStatus.email}` : ''}
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
            Connecter Google Calendar
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
            Déconnecter
          </button>
        )}
        {modeError && <p className="w-full text-xs text-red-300">{modeError}</p>}
      </div>

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
            aria-label="Semaine précédente"
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
              setShowCreateForm((value) => !value);
              setCreateError(null);
              setCreateSuccess(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-green-400"
          >
            <FileText className="h-4 w-4" />
            Nouveau rendez-vous
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          {!calendarStatus.connected && (
            <p className="text-xs text-[var(--text-3)]">
              Connectez Google Calendar pour créer un rendez-vous synchronisé.
            </p>
          )}
          <input
            placeholder="Titre"
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
            placeholder="Lieu (optionnel)"
            value={newEvent.lieu}
            onChange={(e) => setNewEvent((form) => ({ ...form, lieu: e.target.value }))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-1)]"
          />
          <textarea
            placeholder="Description (optionnel)"
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

      {(eventsError || projectsError || appointmentsError || statusError) && (
        <p className="text-sm text-[var(--text-2)]">
          {eventsError || projectsError || appointmentsError || statusError}
        </p>
      )}

      {/* Zone évènements toute la journée */}
      {allDayEvents.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
            Toute la journée / À planifier
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
                      className="relative border-t border-[var(--border)] text-right"
                      style={{ height: HOUR_HEIGHT }}
                    >
                      <span className="absolute -top-2 right-2 text-[11px] text-[var(--text-3)]">
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
                        <div key={i} className="border-t border-[var(--border)]" style={{ height: HOUR_HEIGHT }} />
                      ))}

                      {positioned.map(({ event, top, height, column, columns }) => {
                        const style = EVENT_TYPE_STYLES[event.type];
                        const widthPct = 100 / columns;
                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelectedEvent(event)}
                            className="absolute overflow-hidden rounded-md border px-2 py-1 text-left text-xs shadow-sm transition hover:z-10 hover:brightness-110"
                            style={{
                              top,
                              height,
                              left: `${column * widthPct}%`,
                              width: `calc(${widthPct}% - 4px)`,
                              background: style.bg,
                              borderColor: style.border,
                              color: style.text,
                            }}
                            title={event.title}
                          >
                            <p className="truncate font-semibold">{event.title}</p>
                            {height > 32 && <p className="truncate opacity-80">{eventTimeRangeLabel(event)}</p>}
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

      {!isLoading && normalizedEvents.length === 0 && allDayEvents.length === 0 && (
        <p className="text-sm text-[var(--text-2)]">
          {calendarMode === 'google' && !calendarStatus.connected
            ? 'Connectez votre agenda Google pour afficher vos rendez-vous synchronisés.'
            : 'Aucun évènement à afficher pour cette période.'}
        </p>
      )}

      {selectedEvent && <EventPopover event={selectedEvent} onClose={() => setSelectedEvent(null)} router={router} />}

      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <p className="text-base font-bold text-[var(--text-1)]">Deconnecter Google Calendar ?</p>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Vos rendez-vous deja crees resteront dans Google Calendar, mais Kadria ne pourra plus synchroniser votre agenda.
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
                Deconnecter
              </button>
            </div>
          </div>
        </div>
      )}
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
      <p className="mt-2 text-[11px] text-[var(--text-3)]">Cliquez sur un jour pour ouvrir la semaine correspondante en vue détaillée.</p>
    </div>
  );
}
