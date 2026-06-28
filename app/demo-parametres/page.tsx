'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SettingsPageShell,
  type SettingsSaveState,
  type SettingsShellGroup,
} from '@/src/components/settings/SettingsPageShell';
import { DEMO_SETTINGS_PROFILE } from '@/src/lib/demo-data';

type DemoSettingsState = {
  companyName: string;
  mainTrade: string;
  city: string;
  interventionArea: string;
  phone: string;
  email: string;
};

const DEMO_SETTINGS_GROUPS: SettingsShellGroup[] = [
  {
    label: 'Configuration',
    items: [
      { id: 'entreprise', label: 'Mon entreprise', icon: '🏢' },
      { id: 'profil-metier', label: 'Profil metier', icon: '🛠️' },
      { id: 'contact', label: 'Coordonnees', icon: '📍' },
      { id: 'legal', label: 'Infos legales', icon: '📋' },
      { id: 'vehicule', label: 'Deplacements', icon: '🚗' },
    ],
  },
  {
    label: 'Activite',
    items: [
      { id: 'widget', label: 'Mon widget', icon: '🎨' },
      { id: 'catalogue', label: 'Catalogue & devis', icon: '📒' },
      { id: 'apparence', label: 'Apparence', icon: '🌓' },
    ],
  },
  {
    label: 'Compte',
    items: [{ id: 'offre', label: 'Offre & quotas', icon: '💳' }],
  },
];

const INITIAL_SETTINGS: DemoSettingsState = {
  companyName: DEMO_SETTINGS_PROFILE.companyName,
  mainTrade: DEMO_SETTINGS_PROFILE.mainTrade,
  city: DEMO_SETTINGS_PROFILE.city,
  interventionArea: DEMO_SETTINGS_PROFILE.interventionArea,
  phone: DEMO_SETTINGS_PROFILE.phone,
  email: DEMO_SETTINGS_PROFILE.email,
};

function DemoSectionCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
      }}
    >
      <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--accent)' }}>{title}</h3>
      {description && (
        <p style={{ margin: '0 0 16px', color: 'var(--text-3)', fontSize: '13px', lineHeight: 1.6 }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

function Field({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 600 }}>{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: '100%',
          background: 'var(--bg-hover)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '11px 12px',
          color: 'var(--text-1)',
          fontSize: '14px',
          outline: 'none',
        }}
      />
    </div>
  );
}

function PlaceholderSection({
  body,
  kicker,
  title,
}: {
  body: string;
  kicker: string;
  title: string;
}) {
  return (
    <>
      <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>{title}</h2>
      <DemoSectionCard
        title={kicker}
        description="Section de demonstration - contenu detaille traite dans le prochain lot."
      >
        <div
          style={{
            borderRadius: '14px',
            border: '1px dashed rgba(34,197,94,0.24)',
            background: 'linear-gradient(180deg, rgba(34,197,94,0.08), rgba(9,9,11,0.18))',
            padding: '18px',
          }}
        >
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '14px', lineHeight: 1.7 }}>{body}</p>
        </div>
      </DemoSectionCard>
    </>
  );
}

export default function DemoParametresPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('entreprise');
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [saveState, setSaveState] = useState<SettingsSaveState>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(
    'Mode demo - aucune donnee reelle enregistree. Les sauvegardes sont simulees localement.'
  );

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timeout = window.setTimeout(() => setSaveState('idle'), 2200);
    return () => window.clearTimeout(timeout);
  }, [saveState]);

  const updateField = <K extends keyof DemoSettingsState>(key: K, value: DemoSettingsState[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    setSaveState('saving');
    setStatusMessage('Simulation en cours...');
    window.setTimeout(() => {
      setSaveState('saved');
      setStatusMessage('Action simulee - aucune donnee reelle modifiee.');
    }, 450);
  };

  const renderSection = () => {
    if (activeSection === 'entreprise') {
      return (
        <div>
          <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>🏢 Mon entreprise</h2>

          <DemoSectionCard
            title="Identite"
            description="Base mock de l'entreprise de demonstration, editee localement dans cette session."
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
              }}
            >
              <Field label="Nom de l'entreprise" value={settings.companyName} onChange={(value) => updateField('companyName', value)} />
              <Field label="Metier principal" value={settings.mainTrade} onChange={(value) => updateField('mainTrade', value)} />
              <Field label="Ville" value={settings.city} onChange={(value) => updateField('city', value)} />
              <Field
                label="Zone d'intervention"
                value={settings.interventionArea}
                onChange={(value) => updateField('interventionArea', value)}
              />
              <Field label="Telephone" value={settings.phone} onChange={(value) => updateField('phone', value)} />
              <Field label="Email" value={settings.email} onChange={(value) => updateField('email', value)} />
            </div>
          </DemoSectionCard>

          <DemoSectionCard
            title="Resume demo"
            description="Cette carte sert de point d'ancrage visuel pour rapprocher la structure de la page demo du rendu production."
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              {[
                { label: 'Artisan ID', value: DEMO_SETTINGS_PROFILE.artisanId },
                { label: 'Adresse', value: DEMO_SETTINGS_PROFILE.address },
                { label: 'Plan', value: DEMO_SETTINGS_PROFILE.plan },
                { label: 'Specialites', value: DEMO_SETTINGS_PROFILE.secondaryTrades.join(', ') },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '14px',
                  }}
                >
                  <p style={{ margin: '0 0 6px', color: 'var(--text-3)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {item.label}
                  </p>
                  <p style={{ margin: 0, color: 'var(--text-1)', fontSize: '13px', lineHeight: 1.6 }}>{item.value}</p>
                </div>
              ))}
            </div>
          </DemoSectionCard>
        </div>
      );
    }

    if (activeSection === 'profil-metier') {
      return (
        <PlaceholderSection
          title="🛠️ Profil metier"
          kicker="Configuration metier"
          body="La navigation, le layout et le rendu de carte sont en place. Les champs metier detailles, prestations et exclusions seront raccordes dans le lot 3B."
        />
      );
    }

    if (activeSection === 'contact') {
      return (
        <PlaceholderSection
          title="📍 Coordonnees"
          kicker="Coordonnees de l'entreprise"
          body="Le shell reproduit deja la structure de section production. Les champs complets d'adresse, geolocalisation et validations seront ajoutes dans le lot suivant."
        />
      );
    }

    if (activeSection === 'legal') {
      return (
        <PlaceholderSection
          title="📋 Infos legales"
          kicker="Informations legales"
          body="La zone est reservee pour les donnees juridiques, assurance et numerotation. Ce lot garde uniquement la structure visuelle sans aucune mutation reelle."
        />
      );
    }

    if (activeSection === 'vehicule') {
      return (
        <PlaceholderSection
          title="🚗 Deplacements"
          kicker="Parametres de deplacement"
          body="Le lot 3A pose la section et la carte de contenu. Les reglages kilometriques et calculs avances de deplacement restent volontairement hors scope pour l'instant."
        />
      );
    }

    if (activeSection === 'widget') {
      return (
        <PlaceholderSection
          title="🎨 Mon widget"
          kicker="Shell widget"
          body="Le shell de demonstration prepare la future integration du test widget, des couleurs et des messages d'accueil, sans embarquer encore la logique avancee du widget production."
        />
      );
    }

    if (activeSection === 'catalogue') {
      return (
        <PlaceholderSection
          title="📒 Catalogue & devis"
          kicker="Catalogue et modeles"
          body="La section est visible et navigable. Le catalogue, les suggestions et les modeles de devis seront traites dans le lot 3C sans toucher aux mutations ni aux API reelles."
        />
      );
    }

    if (activeSection === 'apparence') {
      return (
        <PlaceholderSection
          title="🌓 Apparence"
          kicker="Theme et presentation"
          body="Cette zone accueillera ensuite les reglages de theme et les preferences d'affichage. Dans ce lot, seul le shell premium et responsive est pose."
        />
      );
    }

    return (
      <PlaceholderSection
        title="💳 Offre & quotas"
        kicker="Compte de demonstration"
        body="Le shell accueille deja la section Compte. Les compteurs et CTA d'abonnement resteront simules et sans lien production quand le contenu detaille sera branche."
      />
    );
  };

  return (
    <SettingsPageShell
      mode="demo"
      activeSection={activeSection}
      groups={DEMO_SETTINGS_GROUPS}
      onSectionChange={setActiveSection}
      onBack={() => router.push('/demo-dashboard')}
      onSave={save}
      saveState={saveState}
      statusMessage={statusMessage}
    >
      {renderSection()}
    </SettingsPageShell>
  );
}
