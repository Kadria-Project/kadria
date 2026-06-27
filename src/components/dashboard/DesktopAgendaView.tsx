'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, MapPin, RefreshCw, Unplug, FileText, Clock3, Briefcase, CheckCircle2 } from 'lucide-react';
import LoadingSkeleton, { LoadingStyles } from '@/src/components/ui/loading/LoadingSkeleton';
import {
  buildKadriaPlanningItems,
  normalizeCalendarMode,
  type CalendarMode,
  type KadriaPlanningItem,
  type KadriaPlanningProject,
} from '@/src/lib/kadria-planning';

type CalendarStatus = {
  connected: boolean;
  email: string | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  location: string | null;
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

function formatPlanningDate(value: string | null): string {
  if (!value) return 'Date a confirmer';
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Date a confirmer';
  }
}

function dueStateCopy(item: KadriaPlanningItem): { label: string; className: string } {
  if (item.dueState === 'overdue') return { label: 'En retard', className: 'border-red-500/30 bg-red-500/10 text-red-300' };
  if (item.dueState === 'today') return { label: "Aujourd'hui", className: 'border-amber-500/30 bg-amber-500/10 text-amber-200' };
  if (item.dueState === 'upcoming') return { label: 'A venir', className: 'border-green-500/30 bg-green-500/10 text-green-300' };
  return { label: 'A planifier', className: 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-3)]' };
}

function itemIcon(kind: KadriaPlanningItem['kind']) {
  if (kind === 'callback') return Clock3;
  if (kind === 'quote') return FileText;
  return Briefcase;
}

function ModeButton({
  label,
  description,
  active,
  disabled,
  onClick,
}: {
  label: string;
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
      className={`flex-1 rounded-2xl border p-4 text-left transition ${
        active
          ? 'border-green-500/40 bg-green-500/[0.08]'
          : 'border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)]'
      } disabled:cursor-default disabled:opacity-60`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-1)]">{label}</p>
          <p className="mt-1 text-xs text-[var(--text-2)]">{description}</p>
        </div>
        {active && <CheckCircle2 className="h-4 w-4 text-green-400" />}
      </div>
    </button>
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

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [projects, setProjects] = useState<KadriaPlanningProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [disconnecting, setDisconnecting] = useState(false);
  const [returnMessage, setReturnMessage] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<NewEventForm>(EMPTY_NEW_EVENT_FORM);

  const planningItems = useMemo(() => buildKadriaPlanningItems(projects), [projects]);
  const overdueCount = planningItems.filter((item) => item.dueState === 'overdue').length;
  const todayCount = planningItems.filter((item) => item.dueState === 'today').length;

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
    setEvents([]);
  }, [calendarMode, calendarStatus.connected, fetchEvents, fetchProjects]);

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-1)]">Agenda</h1>
        <p className="mt-1 text-sm text-[var(--text-2)]">Choisissez votre mode de planification entre Kadria et Google Calendar.</p>
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

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <div className="mb-4">
          <p className="text-base font-bold text-[var(--text-1)]">Mode agenda</p>
          <p className="mt-1 text-sm text-[var(--text-2)]">Planning Kadria fonctionne meme sans compte Google connecte.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ModeButton
            label="Planning Kadria"
            description="Affiche vos relances, callbacks et actions commerciales a partir des dossiers existants."
            active={calendarMode === 'kadria'}
            disabled={modeSaving !== null}
            onClick={() => void saveMode('kadria')}
          />
          <ModeButton
            label="Google Calendar"
            description="Affiche vos evenements Google synchronises et permet la creation de rendez-vous."
            active={calendarMode === 'google'}
            disabled={modeSaving !== null}
            onClick={() => void saveMode('google')}
          />
        </div>
        {modeError && <p className="mt-3 text-sm text-red-300">{modeError}</p>}
      </div>

      {calendarMode === 'kadria' ? (
        <>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-base font-bold text-[var(--text-1)]">Planning Kadria</p>
                <p className="mt-1 text-sm text-[var(--text-2)]">
                  {overdueCount > 0
                    ? `${overdueCount} action${overdueCount > 1 ? 's' : ''} en retard et ${todayCount} pour aujourd'hui.`
                    : `${todayCount} action${todayCount > 1 ? 's' : ''} a traiter aujourd'hui.`}
                </p>
              </div>
              <button
                type="button"
                onClick={fetchProjects}
                disabled={projectsLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </button>
            </div>

            {projectsError ? (
              <p className="text-sm text-[var(--text-2)]">{projectsError}</p>
            ) : projectsLoading ? (
              <div className="flex flex-col gap-2">
                <LoadingStyles />
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <LoadingSkeleton width="55%" height="13px" style={{ marginBottom: '6px' }} />
                    <LoadingSkeleton width="35%" height="11px" />
                  </div>
                ))}
              </div>
            ) : planningItems.length === 0 ? (
              <p className="text-sm text-[var(--text-2)]">Aucune action datee a afficher pour le moment.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {planningItems.map((item) => {
                  const Icon = itemIcon(item.kind);
                  const dueCopy = dueStateCopy(item);
                  return (
                    <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl border border-green-500/20 bg-green-500/[0.08] p-2">
                            <Icon className="h-4 w-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-1)]">{item.title}</p>
                            <p className="mt-1 text-xs text-[var(--text-2)]">{item.subtitle}</p>
                          </div>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${dueCopy.className}`}>{dueCopy.label}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-3)]">
                        <span className="rounded-full border border-[var(--border)] px-2.5 py-1">{item.statusLabel}</span>
                        <span className="rounded-full border border-[var(--border)] px-2.5 py-1">{formatPlanningDate(item.dueDate)}</span>
                        {item.cityLabel && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1">
                            <MapPin className="h-3 w-3" />
                            {item.cityLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-base font-bold text-[var(--text-1)]">Agenda Google</p>
                {statusLoading ? (
                  <p className="mt-1 text-sm text-[var(--text-2)]">Verification de la connexion...</p>
                ) : calendarStatus.connected ? (
                  <p className="mt-1 text-sm text-[var(--text-2)]">
                    ✓ Google Calendar connecte{calendarStatus.email ? ` - ${calendarStatus.email}` : ''}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[var(--text-2)]">Connectez Google pour synchroniser vos rendez-vous externes dans Kadria.</p>
                )}
              </div>

              {calendarStatus.connected ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchEvents}
                    disabled={eventsLoading}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Synchroniser
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDisconnectConfirm(true)}
                    disabled={disconnecting}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
                  >
                    <Unplug className="h-4 w-4" />
                    Deconnecter
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = '/api/integrations/google-calendar/connect';
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-green-500/30 bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-green-400 hover:bg-green-500/[0.08]"
                >
                  <CalendarDays className="h-4 w-4" />
                  Connecter Google Calendar
                </button>
              )}
            </div>

            {statusError && !calendarStatus.connected && (
              <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.08)' }}>
                <p className="text-xs text-[var(--text-2)]">{statusError}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-base font-bold text-[var(--text-1)]">Les prochains rendez-vous</p>
              {calendarStatus.connected && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm((value) => !value);
                    setCreateError(null);
                    setCreateSuccess(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-green-500/30 bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-green-400 hover:bg-green-500/[0.08]"
                >
                  <FileText className="h-4 w-4" />
                  Nouveau rendez-vous
                </button>
              )}
            </div>

            {showCreateForm && calendarStatus.connected && (
              <div className="mb-4 flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <input
                  placeholder="Titre"
                  value={newEvent.titre}
                  onChange={(e) => setNewEvent((form) => ({ ...form, titre: e.target.value }))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-1)]"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent((form) => ({ ...form, date: e.target.value }))}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-1)]"
                  />
                  <input
                    type="time"
                    value={newEvent.heureDebut}
                    onChange={(e) => setNewEvent((form) => ({ ...form, heureDebut: e.target.value }))}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-1)]"
                  />
                  <input
                    type="time"
                    value={newEvent.heureFin}
                    onChange={(e) => setNewEvent((form) => ({ ...form, heureFin: e.target.value }))}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-1)]"
                  />
                </div>
                <input
                  placeholder="Lieu (optionnel)"
                  value={newEvent.lieu}
                  onChange={(e) => setNewEvent((form) => ({ ...form, lieu: e.target.value }))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-1)]"
                />
                <textarea
                  placeholder="Description (optionnel)"
                  value={newEvent.note}
                  onChange={(e) => setNewEvent((form) => ({ ...form, note: e.target.value }))}
                  className="min-h-[60px] resize-y rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-1)]"
                />

                {createError && <p className="text-xs text-red-400">{createError}</p>}
                {createSuccess && <p className="text-xs text-green-400">{createSuccess}</p>}

                <button
                  type="button"
                  onClick={handleCreateEvent}
                  disabled={creating}
                  className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-400 disabled:opacity-60"
                >
                  {creating ? 'Creation...' : 'Valider'}
                </button>
              </div>
            )}

            {!calendarStatus.connected ? (
              <p className="text-sm text-[var(--text-2)]">Connectez votre agenda Google pour afficher vos rendez-vous synchronises.</p>
            ) : eventsError ? (
              <p className="text-sm text-[var(--text-2)]">{eventsError}</p>
            ) : eventsLoading ? (
              <div className="flex flex-col gap-2">
                <LoadingStyles />
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <LoadingSkeleton width="55%" height="13px" style={{ marginBottom: '6px' }} />
                    <LoadingSkeleton width="35%" height="11px" />
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-[var(--text-2)]">Aucun rendez-vous a venir.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {events.map((event) => (
                  <div key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <p className="text-sm font-semibold text-[var(--text-1)]">{event.title}</p>
                    <p className="text-xs text-[var(--text-3)]">{formatEventRange(event.start, event.end)}</p>
                    {event.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-3)]">
                        <MapPin className="h-3 w-3" />
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
