'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { useRouter } from 'next/navigation';
import { CalendarDays, Link2, MapPin, RefreshCw, Unplug, FileText, Clock3, Briefcase, CheckCircle2 } from 'lucide-react';
import LoadingSkeleton, { LoadingStyles } from '@/src/components/ui/loading/LoadingSkeleton';
import {
  buildKadriaPlanningItems,
  normalizeCalendarMode,
  type CalendarMode,
  type KadriaPlanningItem,
  type KadriaPlanningProject,
} from '@/src/lib/kadria-planning';

type Router = ReturnType<typeof useRouter>;

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

function getDueStateCopy(item: KadriaPlanningItem): { label: string; style: React.CSSProperties } {
  if (item.dueState === 'overdue') {
    return { label: 'En retard', style: { background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' } };
  }
  if (item.dueState === 'today') {
    return { label: "Aujourd'hui", style: { background: 'rgba(245,158,11,0.12)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.25)' } };
  }
  if (item.dueState === 'upcoming') {
    return { label: 'A venir', style: { background: COLORS.accentDim, color: COLORS.accent, border: `1px solid ${COLORS.accentBorder}` } };
  }
  return { label: 'A planifier', style: { background: COLORS.bg, color: COLORS.text3, border: `1px solid ${COLORS.border}` } };
}

function getItemIcon(kind: KadriaPlanningItem['kind']) {
  if (kind === 'callback') return Clock3;
  if (kind === 'quote') return FileText;
  return Briefcase;
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

export default function MobileAgendaView({ router }: MobileAgendaViewProps) {
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
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [returnMessage, setReturnMessage] = useState<string | null>(null);

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
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: COLORS.text1, margin: '10px 0 0' }}>Agenda intelligent</h1>
        <p style={{ fontSize: '13px', color: COLORS.text2, margin: '4px 0 0' }}>
          Activez soit le Planning Kadria, soit Google Calendar selon votre facon de travailler.
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
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>Mode agenda</h2>
            <p style={{ fontSize: '12px', color: COLORS.text2, margin: '4px 0 0' }}>Planning Kadria fonctionne sans connexion Google.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <ModeCard
            title="Planning Kadria"
            description="Relances, callbacks et actions commerciales issus de vos dossiers existants."
            active={calendarMode === 'kadria'}
            disabled={modeSaving !== null}
            onClick={() => void saveMode('kadria')}
          />
          <ModeCard
            title="Google Calendar"
            description="Evenements synchronises et creation de rendez-vous Google."
            active={calendarMode === 'google'}
            disabled={modeSaving !== null}
            onClick={() => void saveMode('google')}
          />
        </div>

        {modeError && <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#fca5a5' }}>{modeError}</p>}
      </div>

      {calendarMode === 'kadria' ? (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>Planning Kadria</h2>
              <p style={{ fontSize: '12px', color: COLORS.text2, margin: '4px 0 0' }}>
                {overdueCount > 0
                  ? `${overdueCount} action${overdueCount > 1 ? 's' : ''} en retard, ${todayCount} pour aujourd'hui.`
                  : `${todayCount} action${todayCount > 1 ? 's' : ''} a traiter aujourd'hui.`}
              </p>
            </div>
            <button
              type="button"
              onClick={fetchProjects}
              disabled={projectsLoading}
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
                opacity: projectsLoading ? 0.7 : 1,
              }}
            >
              <RefreshCw style={{ width: 14, height: 14 }} />
              Actualiser
            </button>
          </div>

          {projectsError ? (
            <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0 }}>{projectsError}</p>
          ) : projectsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <LoadingStyles />
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: '12px', background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                  <LoadingSkeleton width="55%" height="13px" style={{ marginBottom: '6px' }} />
                  <LoadingSkeleton width="35%" height="12px" />
                </div>
              ))}
            </div>
          ) : planningItems.length === 0 ? (
            <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0 }}>Aucune action datee a afficher pour le moment.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {planningItems.map((item) => {
                const Icon = getItemIcon(item.kind);
                const dueCopy = getDueStateCopy(item);

                return (
                  <div key={item.id} style={{ padding: '12px', borderRadius: '14px', background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: COLORS.accentDim,
                            border: `1px solid ${COLORS.accentBorder}`,
                          }}
                        >
                          <Icon style={{ width: 16, height: 16, color: COLORS.accent }} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: COLORS.text1 }}>{item.title}</p>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', lineHeight: 1.5, color: COLORS.text2 }}>{item.subtitle}</p>
                        </div>
                      </div>
                      <span style={{ ...dueCopy.style, display: 'inline-flex', padding: '4px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {dueCopy.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                      <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '999px', border: `1px solid ${COLORS.border}`, color: COLORS.text3, fontSize: '11px' }}>
                        {item.statusLabel}
                      </span>
                      <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '999px', border: `1px solid ${COLORS.border}`, color: COLORS.text3, fontSize: '11px' }}>
                        {formatPlanningDate(item.dueDate)}
                      </span>
                      {item.cityLabel && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '999px', border: `1px solid ${COLORS.border}`, color: COLORS.text3, fontSize: '11px' }}>
                          <MapPin style={{ width: 11, height: 11 }} />
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
      ) : (
        <>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Link2 style={{ width: 18, height: 18, color: COLORS.accent }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>Agenda Google</h2>
            </div>

            {statusLoading ? (
              <p style={{ fontSize: '13px', color: COLORS.text3, margin: 0 }}>Verification de la connexion...</p>
            ) : calendarStatus.connected ? (
              <>
                <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 10px' }}>
                  Google Calendar connecte{calendarStatus.email ? ` - ${calendarStatus.email}` : ''}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={fetchEvents}
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
                    Synchroniser
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
                    Deconnecter
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 14px' }}>
                  Connectez Google Calendar pour retrouver vos rendez-vous synchronises dans Kadria.
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
                  Connecter Google Calendar
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
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>Prochains rendez-vous</h2>
              {calendarStatus.connected && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm((value) => !value);
                    setCreateError(null);
                    setCreateSuccess(null);
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
                  Nouveau
                </button>
              )}
            </div>

            {showCreateForm && calendarStatus.connected && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                <input
                  placeholder="Titre"
                  value={newEvent.titre}
                  onChange={(e) => setNewEvent((form) => ({ ...form, titre: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bgElevated, color: COLORS.text1 }}
                />
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent((form) => ({ ...form, date: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bgElevated, color: COLORS.text1 }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="time"
                    value={newEvent.heureDebut}
                    onChange={(e) => setNewEvent((form) => ({ ...form, heureDebut: e.target.value }))}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bgElevated, color: COLORS.text1 }}
                  />
                  <input
                    type="time"
                    value={newEvent.heureFin}
                    onChange={(e) => setNewEvent((form) => ({ ...form, heureFin: e.target.value }))}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bgElevated, color: COLORS.text1 }}
                  />
                </div>
                <input
                  placeholder="Lieu (optionnel)"
                  value={newEvent.lieu}
                  onChange={(e) => setNewEvent((form) => ({ ...form, lieu: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', background: COLORS.bgElevated, color: COLORS.text1 }}
                />
                <textarea
                  placeholder="Description (optionnel)"
                  value={newEvent.note}
                  onChange={(e) => setNewEvent((form) => ({ ...form, note: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', resize: 'vertical', minHeight: '60px', background: COLORS.bgElevated, color: COLORS.text1 }}
                />

                {createError && <p style={{ fontSize: '12px', color: '#fca5a5', margin: 0 }}>{createError}</p>}
                {createSuccess && <p style={{ fontSize: '12px', color: COLORS.accent, margin: 0 }}>{createSuccess}</p>}

                <button
                  type="button"
                  onClick={handleCreateEvent}
                  disabled={creating}
                  style={{
                    padding: '11px 0',
                    borderRadius: '12px',
                    background: COLORS.accent,
                    border: 'none',
                    color: '#052e16',
                    fontSize: '14px',
                    fontWeight: 700,
                    opacity: creating ? 0.7 : 1,
                  }}
                >
                  {creating ? 'Creation...' : 'Valider'}
                </button>
              </div>
            )}

            {!calendarStatus.connected ? (
              <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0 }}>Connectez Google pour afficher vos rendez-vous synchronises.</p>
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
              <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0 }}>Aucun rendez-vous a venir.</p>
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
            <p style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: '0 0 8px' }}>Deconnecter Google Calendar ?</p>
            <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 16px' }}>
              Vos rendez-vous deja crees resteront dans Google Calendar, mais Kadria ne pourra plus synchroniser votre agenda.
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
                onClick={handleDisconnect}
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
                Deconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
