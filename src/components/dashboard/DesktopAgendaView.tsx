'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CalendarDays, MapPin, RefreshCw, Unplug, FileText } from 'lucide-react';

// Reprend exactement les routes API Google Calendar deja livrees pour la
// version mobile (src/components/dashboard/MobileAgendaView.tsx) : aucune
// logique OAuth/token n'est dupliquee ici, seulement de la consommation
// d'API cote desktop avec le theme sombre du Dashboard.
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

export default function DesktopAgendaView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [statusLoading, setStatusLoading] = useState(true);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ connected: false, email: null });
  const [statusError, setStatusError] = useState<string | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [disconnecting, setDisconnecting] = useState(false);
  const [returnMessage, setReturnMessage] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<NewEventForm>(EMPTY_NEW_EVENT_FORM);

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

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (calendarStatus.connected) {
      fetchEvents();
    } else {
      setEvents([]);
    }
  }, [calendarStatus.connected, fetchEvents]);

  // Retour OAuth (?agenda=connected / ?agenda=error) — meme contrat que la vue mobile.
  useEffect(() => {
    const agendaParam = searchParams?.get('agenda');
    if (!agendaParam) return;

    if (agendaParam === 'connected') {
      setReturnMessage('Google Calendar connecté');
      fetchStatus();
    } else if (agendaParam === 'error') {
      setReturnMessage('Connexion Google impossible');
    }

    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    params.delete('agenda');
    const query = params.toString();
    router.replace(query ? `/dashboard-v2?${query}` : '/dashboard-v2');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setReturnMessage('Google Calendar déconnecté. Kadria ne synchronisera plus votre agenda.');
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
      setCreateError('Titre, date, heure de début et heure de fin requis');
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
        setCreateError('Session expirée');
        return;
      }

      const json = await response.json();
      if (!json.success) {
        setCreateError(json.error || 'Connexion Google impossible');
        return;
      }

      setCreateSuccess('Rendez-vous planifié. L\'événement a été ajouté à Google Calendar.');
      setNewEvent(EMPTY_NEW_EVENT_FORM);
      setShowCreateForm(false);
      await fetchEvents();
    } catch {
      setCreateError('Connexion Google impossible');
    } finally {
      setCreating(false);
    }
  }, [newEvent, fetchEvents]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-1)]">Agenda</h1>
        <p className="mt-1 text-sm text-[var(--text-2)]">Retrouvez vos prochains rendez-vous.</p>
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
          <button
            type="button"
            onClick={() => setReturnMessage(null)}
            className="text-sm text-[var(--text-3)] hover:text-[var(--text-1)]"
          >
            ✕
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-base font-bold text-[var(--text-1)]">Agenda Google</p>
            {statusLoading ? (
              <p className="mt-1 text-sm text-[var(--text-2)]">Vérification de la connexion…</p>
            ) : calendarStatus.connected ? (
              <p className="mt-1 text-sm text-[var(--text-2)]">
                ✓ Google Calendar connecté{calendarStatus.email ? ` — ${calendarStatus.email}` : ''}
              </p>
            ) : (
              <p className="mt-1 text-sm text-[var(--text-2)]">
                Synchronisez votre agenda Google afin de retrouver tous vos rendez-vous directement dans Kadria.
              </p>
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
                Déconnecter
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
                setShowCreateForm((v) => !v);
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
              onChange={(e) => setNewEvent((f) => ({ ...f, titre: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-1)]"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent((f) => ({ ...f, date: e.target.value }))}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-1)]"
              />
              <input
                type="time"
                value={newEvent.heureDebut}
                onChange={(e) => setNewEvent((f) => ({ ...f, heureDebut: e.target.value }))}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-1)]"
              />
              <input
                type="time"
                value={newEvent.heureFin}
                onChange={(e) => setNewEvent((f) => ({ ...f, heureFin: e.target.value }))}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-1)]"
              />
            </div>
            <input
              placeholder="Lieu (optionnel)"
              value={newEvent.lieu}
              onChange={(e) => setNewEvent((f) => ({ ...f, lieu: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-1)]"
            />
            <textarea
              placeholder="Description (optionnel)"
              value={newEvent.note}
              onChange={(e) => setNewEvent((f) => ({ ...f, note: e.target.value }))}
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
              {creating ? 'Création…' : 'Valider'}
            </button>
          </div>
        )}

        {!calendarStatus.connected ? (
          <p className="text-sm text-[var(--text-2)]">Connectez votre agenda Google pour afficher vos rendez-vous.</p>
        ) : eventsError ? (
          <p className="text-sm text-[var(--text-2)]">{eventsError}</p>
        ) : eventsLoading ? (
          <p className="text-sm text-[var(--text-3)]">Chargement…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-[var(--text-2)]">Aucun rendez-vous à venir.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3"
              >
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

      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <p className="text-base font-bold text-[var(--text-1)]">Déconnecter Google Calendar ?</p>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Vos rendez-vous déjà créés resteront dans Google Calendar, mais Kadria ne pourra plus synchroniser votre agenda.
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
    </div>
  );
}
