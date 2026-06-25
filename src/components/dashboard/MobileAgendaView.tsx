'use client';

import { useState } from 'react';
import type { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Link2,
  Sparkles,
  Route,
  BellRing,
  ClipboardList,
  Rocket,
} from 'lucide-react';

type Router = ReturnType<typeof useRouter>;

// Tokens repris du thème clair existant (app/globals.css, bloc
// [data-theme="light"] .dashboard-shell / app/abonnement/page.tsx) — fond
// clair + accents verts, volontairement différent du style sombre utilisé par
// les autres vues mobiles (Pipeline/Devis/Dossiers).
const COLORS = {
  bg: '#e9e9ec',
  bgElevated: '#ffffff',
  border: '#d4d4d8',
  text1: '#18181b',
  text2: '#3f3f46',
  text3: '#71717a',
  accent: '#16a34a',
  accentDim: 'rgba(22,163,74,0.08)',
  accentBorder: 'rgba(22,163,74,0.3)',
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

export default function MobileAgendaView({ router }: MobileAgendaViewProps) {
  const [showCalendarNotice, setShowCalendarNotice] = useState(false);

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

      {/* État vide premium — honnête : aucun rendez-vous réel n'existe encore. */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <CalendarDays style={{ width: 18, height: 18, color: COLORS.text3, flexShrink: 0 }} />
        <p style={{ fontSize: '13px', color: COLORS.text2, margin: 0 }}>
          Aucun rendez-vous synchronisé pour le moment.
        </p>
      </div>

      {/* Carte — Connexion agenda */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Link2 style={{ width: 18, height: 18, color: COLORS.accent }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text1, margin: 0 }}>
            Connectez votre agenda professionnel
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: COLORS.text2, margin: '0 0 14px' }}>
          Synchronisez vos rendez-vous pour éviter les doublons et centraliser votre planning dans Kadria.
        </p>

        <button
          type="button"
          onClick={() => setShowCalendarNotice((v) => !v)}
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

        {showCalendarNotice && (
          <div
            style={{
              marginTop: '10px',
              padding: '10px 12px',
              borderRadius: '12px',
              background: COLORS.accentDim,
              border: `1px solid ${COLORS.accentBorder}`,
            }}
          >
            <p style={{ fontSize: '12px', color: COLORS.text2, margin: 0, lineHeight: 1.5 }}>
              La synchronisation Google Calendar est préparée, mais l&apos;authentification OAuth n&apos;est pas
              encore activée.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
          <ComingSoonRow label="Outlook bientôt disponible" />
          <ComingSoonRow label="Apple Calendar bientôt disponible" />
        </div>
      </div>

      {/* Carte — Rendez-vous liés aux dossiers */}
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

        <DisabledButton label="Créer un rendez-vous" />
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
