'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Link2,
  Sparkles,
  Route,
  BellRing,
  ClipboardList,
  Rocket,
  MapPin,
  RefreshCw,
  Unplug,
} from 'lucide-react';

type Router = ReturnType<typeof useRouter>;

// Variables CSS du thème .dashboard-shell (app/globals.css), exactement
// comme MobileDossiersView/MobileDevisView/MobilePipelineView — bascule
// automatiquement clair/sombre selon le thème choisi par l'utilisateur
// ([data-theme="dark"|"light"] .dashboard-shell), au lieu de couleurs figées.
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

function Tag({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '12px',
        fontWeight: 600,
        padding: '5px 10px',
        borderRadius: '999px',
        background: COLORS.accentDim,
        color: COLORS.accent,
        border: `1px solid ${COLORS.accentBorder}`,
      }}
    >
      {label}
    </span>
  );
}

function Badge({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'muted' }) {
  const accentStyle = { background: COLORS.accentDim, color: COLORS.accent, border: `1px solid ${COLORS.accentBorder}` };
  const mutedStyle = { background: 'rgba(113,113,122,0.1)', color: COLORS.text3, border: `1px solid ${COLORS.border}` };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '11px',
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: '999px',
        whiteSpace: 'nowrap',
        ...(tone === 'accent' ? accentStyle : mutedStyle),
      }}
    >
      {label}
    </span>
  );
}

// Ligne honnête "à venir" — mirroring du traitement visuel disabled de
// MenuRow dans MobileDashboardView.tsx (opacity réduite, pas de curseur
// pointer, badge "Bientôt").
function ComingSoonRow({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '12px',
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        opacity: 0.45,
        cursor: 'default',
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.text1 }}>{label}</span>
      <Badge label="Bientôt" tone="muted" />
    </div>
  );
}

function DisabledButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      aria-disabled
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '11px 0',
        borderRadius: '12px',
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.text3,
        fontSize: '14px',
        fontWeight: 700,
        opacity: 0.45,
        cursor: 'default',
      }}
    >
      {label}
      <Badge label="Bientôt" tone="muted" />
    </button>
  );
}

type SectionConfig = {
  key: string;
  icon: any;
  title: string;
  body: string;
  badge?: string;
  future?: boolean;
};

// Sections narratives / roadmap — pas de données dynamiques réelles tant que
// le modèle de rendez-vous n'existe pas (cf. audit : aucun
// appointment/rendez-vous/rdv/googleCalendar dans la base). Structure en
// tableau pour faciliter l'extension future, sans sur-ingénierie.
const FUTURE_SECTIONS: SectionConfig[] = [
  {
    key: 'disponibilites',
    icon: Sparkles,
    title: 'Disponibilités intelligentes',
    body: 'Kadria analysera vos créneaux libres pour proposer les meilleurs moments de rendez-vous.',
    badge: 'Bientôt disponible',
    future: true,
  },
  {
    key: 'tournees',
    icon: Route,
    title: 'Tournées optimisées',
    body: 'Regroupez vos rendez-vous par secteur pour limiter les trajets inutiles.',
    badge: 'Vision avancée',
    future: true,
  },
];

const AVAILABILITY_TAGS = ['Créneaux libres', 'Urgence du dossier', 'Zone géographique', 'Distance', 'Priorité commerciale'];

const FIELD_SHEET_TAGS = [
  'Coordonnées client',
  'Adresse',
  'Besoin',
  'Budget',
  'Photos',
  'Historique',
  'Devis lié',
];

const VISION_HIGHLIGHTS = [
  "Moins d'allers-retours",
  "Moins d'oublis",
  'Moins de créneaux perdus',
  'Plus de rendez-vous qualifiés',
  'Plus de temps terrain',
];

export interface MobileAgendaViewProps {
  router: Router;
}

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

export default function MobileAgendaView({ router }: MobileAgendaViewProps) {
  const searchParams = useSearchParams();

  const [statusLoading, setStatusLoading] = useState(true);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ connected: false, email: null });
  const [statusError, setStatusError] = useState<string | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [disconnecting, setDisconnecting] = useState(false);
  const [returnMessage, setReturnMessage] = useState<string | null>(null);

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

  // Chargement initial du statut de connexion.
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Une fois connecté, on charge les prochains rendez-vous réels.
  useEffect(() => {
    if (calendarStatus.connected) {
      fetchEvents();
    } else {
      setEvents([]);
    }
  }, [calendarStatus.connected, fetchEvents]);

  // Gestion du retour OAuth (?agenda=connected / ?agenda=error), affiché une
  // seule fois puis nettoyé de l'URL pour ne pas réapparaître au refresh.
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
    setDisconnecting(true);
    try {
      const response = await fetch('/api/integrations/google-calendar/disconnect', { method: 'POST' });
      if (response.status === 401) {
        setReturnMessage('Session expirée');
        return;
      }
      const json = await response.json();
      if (json.success) {
        setReturnMessage('Déconnexion réussie');
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

      setCreateSuccess('Événement créé');
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
        <Badge label="Planification Kadria" />
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: COLORS.text1, margin: '10px 0 0' }}>
          Agenda intelligent
        </h1>
        <p style={{ fontSize: '13px', color: COLORS.text2, margin: '4px 0 0' }}>
          Planifiez vos rendez-vous, évitez les conflits et préparez vos journées terrain.
        </p>
      </div>

      {/* Toast retour OAuth (?agenda=connected / ?agenda=error), affiché une seule fois. */}
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
            ✕
          </button>
        </div>
      )}

      {/* Carte — Connexion agenda */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Link2 style={{ width: 18, height: 18, color: COLORS.accent }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>
            Connectez votre agenda professionnel
          </h2>
        </div>

        {statusLoading ? (
          <p style={{ fontSize: '13px', color: COLORS.text3, margin: 0 }}>Vérification de la connexion…</p>
        ) : calendarStatus.connected ? (
          <>
            <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 10px' }}>
              Google Calendar connecté{calendarStatus.email ? ` — ${calendarStatus.email}` : ''}
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
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: eventsLoading ? 'default' : 'pointer',
                  opacity: eventsLoading ? 0.7 : 1,
                }}
              >
                <RefreshCw style={{ width: 14, height: 14 }} />
                Synchroniser
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
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
                  cursor: disconnecting ? 'default' : 'pointer',
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
              Synchronisez vos rendez-vous pour éviter les doublons et centraliser votre planning dans Kadria.
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
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
          <ComingSoonRow label="Outlook bientôt disponible" />
          <ComingSoonRow label="Apple Calendar bientôt disponible" />
        </div>
      </div>

      {/* Carte — Prochains rendez-vous (uniquement si connecté, données réelles uniquement) */}
      {calendarStatus.connected && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <CalendarDays style={{ width: 18, height: 18, color: COLORS.accent }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>
              Prochains rendez-vous
            </h2>
          </div>

          {eventsError && (
            <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 10px' }}>{eventsError}</p>
          )}

          {eventsLoading ? (
            <p style={{ fontSize: '13px', color: COLORS.text3, margin: 0 }}>Chargement…</p>
          ) : events.length === 0 ? (
            <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0 }}>Aucun rendez-vous à venir.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {events.map((event) => (
                <div
                  key={event.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <p style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text1, margin: '0 0 2px' }}>
                    {event.title}
                  </p>
                  <p style={{ fontSize: '12px', color: COLORS.text3, margin: 0 }}>
                    {formatEventRange(event.start, event.end)}
                  </p>
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
      )}

      {/* Carte — Rendez-vous liés aux dossiers / création */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <ClipboardList style={{ width: 18, height: 18, color: COLORS.accent }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>
            Des rendez-vous reliés à vos dossiers
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 12px' }}>
          Chaque rendez-vous pourra être rattaché à un prospect, un devis ou un chantier.
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <Tag label="Prospect" />
          <Tag label="Devis" />
          <Tag label="Chantier" />
        </div>

        {calendarStatus.connected ? (
          <>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm((v) => !v);
                setCreateError(null);
                setCreateSuccess(null);
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
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <CalendarDays style={{ width: 16, height: 16 }} />
              Créer un rendez-vous
            </button>

            {showCreateForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <input
                  placeholder="Titre"
                  value={newEvent.titre}
                  onChange={(e) => setNewEvent((f) => ({ ...f, titre: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent((f) => ({ ...f, date: e.target.value }))}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="time"
                    value={newEvent.heureDebut}
                    onChange={(e) => setNewEvent((f) => ({ ...f, heureDebut: e.target.value }))}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px' }}
                  />
                  <input
                    type="time"
                    value={newEvent.heureFin}
                    onChange={(e) => setNewEvent((f) => ({ ...f, heureFin: e.target.value }))}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px' }}
                  />
                </div>
                <input
                  placeholder="Lieu (optionnel)"
                  value={newEvent.lieu}
                  onChange={(e) => setNewEvent((f) => ({ ...f, lieu: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px' }}
                />
                <textarea
                  placeholder="Note (optionnel)"
                  value={newEvent.note}
                  onChange={(e) => setNewEvent((f) => ({ ...f, note: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px', resize: 'vertical', minHeight: '60px' }}
                />

                {createError && <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{createError}</p>}
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
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: creating ? 'default' : 'pointer',
                    opacity: creating ? 0.7 : 1,
                  }}
                >
                  {creating ? 'Création…' : 'Valider'}
                </button>
              </div>
            )}
          </>
        ) : (
          <DisabledButton label="Créer un rendez-vous" />
        )}
      </div>

      {/* Cartes roadmap génériques : Disponibilités intelligentes, Tournées optimisées */}
      {FUTURE_SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <div key={section.key} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon style={{ width: 18, height: 18, color: COLORS.accent }} />
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>{section.title}</h2>
              </div>
              {section.badge && <Badge label={section.badge} />}
            </div>
            <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 12px' }}>{section.body}</p>

            {section.key === 'disponibilites' && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {AVAILABILITY_TAGS.map((tag) => (
                  <Tag key={tag} label={tag} />
                ))}
              </div>
            )}

            {section.key === 'tournees' && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <p style={{ fontSize: '11px', fontWeight: 700, color: COLORS.text3, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Exemple illustratif
                </p>
                <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0, lineHeight: 1.5 }}>
                  Vous avez déjà un chantier à Rouen mardi matin. Kadria pourra proposer un prospect proche mardi
                  après-midi.
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Carte — Rappels automatiques */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <BellRing style={{ width: 18, height: 18, color: COLORS.accent }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>Rappels rendez-vous</h2>
        </div>
        <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 12px' }}>
          Prévenez automatiquement vos clients avant un rendez-vous.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <ComingSoonRow label="Email à venir" />
          <ComingSoonRow label="SMS bientôt" />
          <ComingSoonRow label="WhatsApp bientôt" />
        </div>
      </div>

      {/* Carte — Fiche terrain */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <CalendarDays style={{ width: 18, height: 18, color: COLORS.accent }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>
            Votre fiche avant rendez-vous
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 12px' }}>
          Avant chaque déplacement, Kadria pourra préparer le contexte utile.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {FIELD_SHEET_TAGS.map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </div>
      </div>

      {/* Carte finale — Vision Kadria */}
      <div style={{ ...card, background: COLORS.accentDim, border: `1px solid ${COLORS.accentBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Rocket style={{ width: 18, height: 18, color: COLORS.accent }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>
            Une journée mieux organisée, c&apos;est plus de chantiers signés.
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 12px' }}>
          L&apos;agenda Kadria doit devenir un assistant de planification, pas un simple calendrier.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {VISION_HIGHLIGHTS.map((line) => (
            <div key={line} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: COLORS.text1, fontWeight: 600 }}>
              <span style={{ color: COLORS.accent }}>✔</span>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
