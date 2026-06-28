'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SettingsPageShell,
  type SettingsSaveState,
  type SettingsShellGroup,
} from '@/src/components/settings/SettingsPageShell';
import { DEMO_SETTINGS_CONFIGURATION } from '@/src/lib/demo-data';

type DemoSectionKey =
  | 'entreprise'
  | 'profil-metier'
  | 'contact'
  | 'legal'
  | 'vehicule'
  | 'widget'
  | 'catalogue'
  | 'apparence'
  | 'offre';

type DemoSettingsState = {
  entreprise: {
    companyName: string;
    artisanId: string;
    mainTrade: string;
    slogan: string;
    description: string;
    interventionArea: string;
    foundedYear: string;
    teamSize: string;
    activityStatus: string;
  };
  profile: {
    mainTrade: string;
    secondaryTrades: string[];
    offeredServices: string[];
    clientTypes: string[];
    acceptsEmergencies: boolean;
    priorityRequests: string[];
    filteredRequests: string[];
  };
  contact: {
    contactName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    postalCode: string;
    website: string;
    callHours: string;
    preferredChannel: string;
    contactMessage: string;
  };
  legal: {
    companyLegalName: string;
    siret: string;
    vatNumber: string;
    decennialInsuranceEnabled: boolean;
    insurerName: string;
    policyNumber: string;
    quoteMentions: string;
    paymentTerms: string;
  };
  travel: {
    departureAddress: string;
    radiusKm: string;
    standardFee: string;
    vehiclePowertrain: string;
    estimatedConsumption: string;
    travelCostEnabled: boolean;
    minimumIntervention: string;
    priorityZones: string[];
    excludedZones: string[];
  };
  widget: {
    enabled: boolean;
    artisanId: string;
    scriptUrl: string;
    welcomeMessage: string;
    responseTone: string;
    requestedFields: string[];
    activeChannels: string[];
  };
  catalogue: {
    enabled: boolean;
    pricingMode: string;
    services: Array<{
      id: string;
      title: string;
      priceLabel: string;
      enabled: boolean;
    }>;
    defaultVat: string;
    quoteValidityDays: string;
    depositRate: string;
    paymentTerms: string;
    quoteMentions: string;
  };
  appearance: {
    primaryColor: string;
    visualMode: string;
    logoLabel: string;
    displayName: string;
    buttonColor: string;
    accentColor: string;
    toneStyle: string;
  };
  offer: {
    currentPlan: string;
    status: string;
    price: string;
    renewalDate: string;
    quotas: {
      projects: { label: string; used: number; limitLabel: string; tone: string };
      quotes: { label: string; used: number; limitLabel: string; tone: string };
      voiceCalls: { label: string; used: number; limit: number; tone: string };
      voiceMinutes: { label: string; used: number; unit: string; tone: string };
      pdfExport: { label: string; status: string; tone: string };
      pipeline: { label: string; status: string; tone: string };
      priorities: { label: string; status: string; tone: string };
      followUps: { label: string; status: string; tone: string };
    };
    features: string[];
    planComparison: Array<{
      name: string;
      summary: string;
      highlight: boolean;
    }>;
    siteAddon: {
      title: string;
      monthlyPrice: string;
      oneShotPrice: string;
      availability: string;
    };
  };
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

const CLIENT_TYPE_OPTIONS = ['Particuliers', 'Petits commerces', 'Syndics / coproprietes', 'Bureaux'];
const PROFILE_OPTIONS = [
  'Depannage electrique',
  'Tableau electrique',
  'Mise aux normes',
  'Borne de recharge',
  'Renovation electrique',
  'Eclairage exterieur',
];
const PRIORITY_OPTIONS = [
  'Panne totale',
  'Tableau dangereux',
  'Projet avec budget confirme',
  'Demande urgente sous 7 jours',
  'Visite technique planifiee',
];
const FILTER_OPTIONS = [
  'Petits depannages hors zone',
  'Demandes sans budget ni delai',
  'Chantiers multi-lots trop vagues',
  'Interventions le week-end hors urgence',
];
const SERVICE_OPTIONS = [
  'Diagnostic et recherche de panne',
  'Remplacement de tableau',
  'Creation de circuits',
  'Installation de borne IRVE',
  'Mise en securite',
  'Modernisation eclairage',
];
const WIDGET_TONE_OPTIONS = ['Professionnel', 'Direct', 'Chaleureux'];
const WIDGET_QUESTION_OPTIONS = ['Type de projet', 'Description', 'Budget', 'Delai', 'Ville', 'Photos', 'Coordonnees'];
const WIDGET_CHANNEL_OPTIONS = ['Site web', 'Lien projet', 'Widget embarque'];
const CATALOG_PRICING_OPTIONS = ['Estimation simple', 'Catalogue prestations', 'Devis assiste'];
const APPEARANCE_MODE_OPTIONS = ['Sombre', 'Clair', 'Automatique'];
const APPEARANCE_TONE_OPTIONS = ['Sobre', 'Premium', 'Terrain'];
const COLOR_PRESETS = ['#22c55e', '#16a34a', '#0f766e', '#f59e0b', '#3b82f6'];

const INITIAL_SETTINGS: DemoSettingsState = JSON.parse(
  JSON.stringify({
    entreprise: DEMO_SETTINGS_CONFIGURATION.entreprise,
    profile: DEMO_SETTINGS_CONFIGURATION.profile,
    contact: DEMO_SETTINGS_CONFIGURATION.contact,
    legal: DEMO_SETTINGS_CONFIGURATION.legal,
    travel: DEMO_SETTINGS_CONFIGURATION.travel,
    widget: DEMO_SETTINGS_CONFIGURATION.widget,
    catalogue: DEMO_SETTINGS_CONFIGURATION.catalogue,
    appearance: DEMO_SETTINGS_CONFIGURATION.appearance,
    offer: DEMO_SETTINGS_CONFIGURATION.offer,
  })
);

function createInitialSettings(): DemoSettingsState {
  return JSON.parse(JSON.stringify(INITIAL_SETTINGS));
}

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

function TextareaField({
  label,
  onChange,
  rows = 4,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 600 }}>{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: '100%',
          resize: 'vertical',
          background: 'var(--bg-hover)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '11px 12px',
          color: 'var(--text-1)',
          fontSize: '14px',
          outline: 'none',
          lineHeight: 1.6,
        }}
      />
    </div>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 600 }}>{label}</label>
      <select
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
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({
  checked,
  label,
  onChange,
  subtitle,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        background: 'var(--bg-hover)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '14px 16px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div>
        <p style={{ margin: 0, color: 'var(--text-1)', fontSize: '14px', fontWeight: 600 }}>{label}</p>
        {subtitle && <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: '12px' }}>{subtitle}</p>}
      </div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          width: '46px',
          height: '26px',
          background: checked ? 'var(--accent)' : '#3f3f46',
          borderRadius: '999px',
          padding: '3px',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: '20px',
            height: '20px',
            background: '#fff',
            borderRadius: '50%',
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
            transition: 'transform 0.2s',
          }}
        />
      </span>
    </button>
  );
}

function TagSelector({
  label,
  options,
  selected,
  onToggle,
  subtitle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  subtitle?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '12px', fontWeight: 600 }}>{label}</p>
        {subtitle && <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: '12px' }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              style={{
                background: active ? 'rgba(34,197,94,0.12)' : 'var(--bg-hover)',
                color: active ? 'var(--accent)' : 'var(--text-2)',
                border: active ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border)',
                borderRadius: '999px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        borderRadius: '999px',
        border: active ? '1px solid rgba(34,197,94,0.28)' : '1px solid var(--border)',
        background: active ? 'rgba(34,197,94,0.12)' : 'var(--bg-hover)',
        color: active ? 'var(--accent)' : 'var(--text-2)',
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: 700,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '999px',
          background: active ? 'var(--accent)' : '#71717a',
        }}
      />
      {label}
    </span>
  );
}

function ColorSwatch({
  active,
  color,
  onClick,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Choisir ${color}`}
      style={{
        width: '38px',
        height: '38px',
        borderRadius: '12px',
        border: active ? '2px solid #fff' : '1px solid var(--border)',
        background: color,
        boxShadow: active ? `0 0 0 2px ${color}` : 'none',
        cursor: 'pointer',
      }}
    />
  );
}

function MetricPill({
  label,
  tone,
}: {
  label: string;
  tone: 'included' | 'neutral' | 'soon';
}) {
  const palette =
    tone === 'included'
      ? {
          background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.28)',
          color: 'var(--accent)',
        }
      : tone === 'soon'
        ? {
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.28)',
            color: '#fbbf24',
          }
        : {
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
          };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '999px',
        padding: '6px 10px',
        fontSize: '12px',
        fontWeight: 700,
        ...palette,
      }}
    >
      {label}
    </span>
  );
}

function ProgressBar({
  tone = 'var(--accent)',
  value,
}: {
  tone?: string;
  value: number;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '8px',
        borderRadius: '999px',
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: '100%',
          borderRadius: '999px',
          background: tone,
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
  const [activeSection, setActiveSection] = useState<DemoSectionKey>('entreprise');
  const [settings, setSettings] = useState<DemoSettingsState>(createInitialSettings);
  const [saveState, setSaveState] = useState<SettingsSaveState>('idle');
  const [widgetScriptCopied, setWidgetScriptCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    'Mode demo - ces informations sont fictives et ne sont pas enregistrees.'
  );

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timeout = window.setTimeout(() => setSaveState('idle'), 2200);
    return () => window.clearTimeout(timeout);
  }, [saveState]);

  const updateEntrepriseField = <K extends keyof DemoSettingsState['entreprise']>(
    key: K,
    value: DemoSettingsState['entreprise'][K]
  ) => {
    setSettings((current) => ({ ...current, entreprise: { ...current.entreprise, [key]: value } }));
  };

  const updateProfileField = <K extends keyof DemoSettingsState['profile']>(
    key: K,
    value: DemoSettingsState['profile'][K]
  ) => {
    setSettings((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  };

  const updateContactField = <K extends keyof DemoSettingsState['contact']>(
    key: K,
    value: DemoSettingsState['contact'][K]
  ) => {
    setSettings((current) => ({ ...current, contact: { ...current.contact, [key]: value } }));
  };

  const updateLegalField = <K extends keyof DemoSettingsState['legal']>(
    key: K,
    value: DemoSettingsState['legal'][K]
  ) => {
    setSettings((current) => ({ ...current, legal: { ...current.legal, [key]: value } }));
  };

  const updateTravelField = <K extends keyof DemoSettingsState['travel']>(
    key: K,
    value: DemoSettingsState['travel'][K]
  ) => {
    setSettings((current) => ({ ...current, travel: { ...current.travel, [key]: value } }));
  };

  const updateWidgetField = <K extends keyof DemoSettingsState['widget']>(
    key: K,
    value: DemoSettingsState['widget'][K]
  ) => {
    setSettings((current) => ({ ...current, widget: { ...current.widget, [key]: value } }));
  };

  const updateCatalogueField = <K extends keyof DemoSettingsState['catalogue']>(
    key: K,
    value: DemoSettingsState['catalogue'][K]
  ) => {
    setSettings((current) => ({ ...current, catalogue: { ...current.catalogue, [key]: value } }));
  };

  const updateAppearanceField = <K extends keyof DemoSettingsState['appearance']>(
    key: K,
    value: DemoSettingsState['appearance'][K]
  ) => {
    setSettings((current) => ({ ...current, appearance: { ...current.appearance, [key]: value } }));
  };

  const toggleProfileArrayValue = (
    key: 'secondaryTrades' | 'offeredServices' | 'clientTypes' | 'priorityRequests' | 'filteredRequests',
    value: string
  ) => {
    setSettings((current) => {
      const values = current.profile[key];
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      return {
        ...current,
        profile: {
          ...current.profile,
          [key]: nextValues,
        },
      };
    });
  };

  const toggleTravelArrayValue = (key: 'priorityZones' | 'excludedZones', value: string) => {
    setSettings((current) => {
      const values = current.travel[key];
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      return {
        ...current,
        travel: {
          ...current.travel,
          [key]: nextValues,
        },
      };
    });
  };

  const toggleWidgetArrayValue = (key: 'requestedFields' | 'activeChannels', value: string) => {
    setSettings((current) => {
      const values = current.widget[key];
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      return {
        ...current,
        widget: {
          ...current.widget,
          [key]: nextValues,
        },
      };
    });
  };

  const updateCatalogueService = (
    serviceId: string,
    field: 'title' | 'priceLabel' | 'enabled',
    value: string | boolean
  ) => {
    setSettings((current) => ({
      ...current,
      catalogue: {
        ...current.catalogue,
        services: current.catalogue.services.map((service) =>
          service.id === serviceId ? { ...service, [field]: value } : service
        ),
      },
    }));
  };

  const addCatalogueService = () => {
    setSettings((current) => ({
      ...current,
      catalogue: {
        ...current.catalogue,
        services: [
          ...current.catalogue.services,
          {
            id: `service_${Date.now()}`,
            title: 'Nouvelle prestation demo',
            priceLabel: 'A partir de 490 EUR',
            enabled: true,
          },
        ],
      },
    }));
    setStatusMessage('Prestation ajoutee localement - aucune donnee reelle enregistree.');
  };

  const copyWidgetScript = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(settings.widget.scriptUrl);
      }
      setWidgetScriptCopied(true);
      setStatusMessage('Script copie localement - action de demonstration uniquement.');
      window.setTimeout(() => setWidgetScriptCopied(false), 2200);
    } catch {
      setStatusMessage("Copie simulee - l'environnement demo n'autorise pas de copie systeme.");
    }
  };

  const triggerOfferCta = (label: string) => {
    setStatusMessage(`Action simulee - aucune facturation reelle ni donnee modifiee. (${label})`);
  };

  const save = () => {
    setSaveState('saving');
    setStatusMessage('Simulation en cours...');
    window.setTimeout(() => {
      setSaveState('saved');
      setStatusMessage('Action simulee - aucune donnee reelle modifiee.');
    }, 450);
  };

  const reset = () => {
    setSettings(createInitialSettings());
    setSaveState('idle');
    setWidgetScriptCopied(false);
    setStatusMessage("Configuration reinitialisee localement - l'etat initial demo est restaure.");
  };

  const renderEntrepriseSection = () => (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>🏢 Mon entreprise</h2>

      <DemoSectionCard
        title="Identite de l'entreprise"
        description="Section de demonstration inspiree de la configuration production. Toutes les modifications restent locales."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <Field label="Nom de l'entreprise" value={settings.entreprise.companyName} onChange={(value) => updateEntrepriseField('companyName', value)} />
          <Field label="Artisan ID" value={settings.entreprise.artisanId} onChange={(value) => updateEntrepriseField('artisanId', value)} />
          <Field label="Metier principal" value={settings.entreprise.mainTrade} onChange={(value) => updateEntrepriseField('mainTrade', value)} />
          <Field label="Slogan court" value={settings.entreprise.slogan} onChange={(value) => updateEntrepriseField('slogan', value)} />
          <Field
            label="Zone d'intervention"
            value={settings.entreprise.interventionArea}
            onChange={(value) => updateEntrepriseField('interventionArea', value)}
          />
          <Field label="Annee de creation" value={settings.entreprise.foundedYear} onChange={(value) => updateEntrepriseField('foundedYear', value)} />
          <SelectField
            label="Taille"
            value={settings.entreprise.teamSize}
            onChange={(value) => updateEntrepriseField('teamSize', value)}
            options={['Artisan independant', 'Equipe de 2 a 5', 'PME locale']}
          />
          <SelectField
            label="Statut d'activite"
            value={settings.entreprise.activityStatus}
            onChange={(value) => updateEntrepriseField('activityStatus', value)}
            options={['Actif', 'En developpement', 'Plein regime']}
          />
        </div>
      </DemoSectionCard>

      <DemoSectionCard
        title="Presentation"
        description="Texte de presentation utilise pour donner un rendu realiste a la demo."
      >
        <TextareaField
          label="Description de l'activite"
          rows={5}
          value={settings.entreprise.description}
          onChange={(value) => updateEntrepriseField('description', value)}
        />
      </DemoSectionCard>
    </div>
  );

  const renderProfileSection = () => (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>🛠️ Profil metier</h2>

      <DemoSectionCard
        title="Positionnement metier"
        description="Le profil metier demo montre un artisan electricien deja bien configure, avec des priorites commerciales credibles."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <Field label="Metier principal" value={settings.profile.mainTrade} onChange={(value) => updateProfileField('mainTrade', value)} />
          <ToggleField
            label="Urgences acceptees"
            subtitle="Active le traitement prioritaire des demandes critiques."
            checked={settings.profile.acceptsEmergencies}
            onChange={(value) => updateProfileField('acceptsEmergencies', value)}
          />
        </div>

        <TagSelector
            label="Metiers secondaires"
            options={PROFILE_OPTIONS}
            selected={settings.profile.secondaryTrades}
            onToggle={(value) => toggleProfileArrayValue('secondaryTrades', value)}
          />
      </DemoSectionCard>

      <DemoSectionCard title="Prestations et typologie de clients" description="Selections mock cliquables localement, sans aucun appel externe.">
        <div style={{ display: 'grid', gap: '18px' }}>
          <TagSelector
            label="Prestations proposees"
            options={SERVICE_OPTIONS}
            selected={settings.profile.offeredServices}
            onToggle={(value) => toggleProfileArrayValue('offeredServices', value)}
          />
          <TagSelector
            label="Types de clients"
            options={CLIENT_TYPE_OPTIONS}
            selected={settings.profile.clientTypes}
            onToggle={(value) => toggleProfileArrayValue('clientTypes', value)}
          />
        </div>
      </DemoSectionCard>

      <DemoSectionCard title="Demandes a prioriser" description="Aide l'assistant demo a afficher un profil d'artisan reactif et qualifie.">
        <div style={{ display: 'grid', gap: '18px' }}>
          <TagSelector
            label="Priorites commerciales"
            options={PRIORITY_OPTIONS}
            selected={settings.profile.priorityRequests}
            onToggle={(value) => toggleProfileArrayValue('priorityRequests', value)}
          />
          <TagSelector
            label="Demandes a filtrer"
            options={FILTER_OPTIONS}
            selected={settings.profile.filteredRequests}
            onToggle={(value) => toggleProfileArrayValue('filteredRequests', value)}
          />
        </div>
      </DemoSectionCard>
    </div>
  );

  const renderContactSection = () => (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>📍 Coordonnees</h2>

      <DemoSectionCard
        title="Coordonnees principales"
        description="Tous les champs sont editables localement pour simuler un compte artisan complet."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <Field label="Nom du contact principal" value={settings.contact.contactName} onChange={(value) => updateContactField('contactName', value)} />
          <Field label="Telephone" value={settings.contact.phone} onChange={(value) => updateContactField('phone', value)} />
          <Field label="Email" value={settings.contact.email} onChange={(value) => updateContactField('email', value)} />
          <Field label="Adresse entreprise" value={settings.contact.address} onChange={(value) => updateContactField('address', value)} />
          <Field label="Ville" value={settings.contact.city} onChange={(value) => updateContactField('city', value)} />
          <Field label="Code postal" value={settings.contact.postalCode} onChange={(value) => updateContactField('postalCode', value)} />
          <Field label="Site web" value={settings.contact.website} onChange={(value) => updateContactField('website', value)} />
          <Field label="Horaires d'appel" value={settings.contact.callHours} onChange={(value) => updateContactField('callHours', value)} />
          <SelectField
            label="Canal prefere"
            value={settings.contact.preferredChannel}
            onChange={(value) => updateContactField('preferredChannel', value)}
            options={['Telephone', 'Email', 'SMS', 'Email puis rappel']}
          />
        </div>
      </DemoSectionCard>

      <DemoSectionCard title="Message de prise de contact" description="Microcopy visible en demo pour montrer le niveau de finition du profil.">
        <TextareaField
          label="Message de prise de contact"
          rows={4}
          value={settings.contact.contactMessage}
          onChange={(value) => updateContactField('contactMessage', value)}
        />
      </DemoSectionCard>
    </div>
  );

  const renderLegalSection = () => (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>📋 Infos legales</h2>

      <DemoSectionCard
        title="Informations legales"
        description="Toutes les valeurs ci-dessous sont fictives mais plausibles pour une demonstration premium."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <Field label="Raison sociale" value={settings.legal.companyLegalName} onChange={(value) => updateLegalField('companyLegalName', value)} />
          <Field label="SIRET fictif" value={settings.legal.siret} onChange={(value) => updateLegalField('siret', value)} />
          <Field label="TVA intracom fictive" value={settings.legal.vatNumber} onChange={(value) => updateLegalField('vatNumber', value)} />
          <Field label="Nom assureur" value={settings.legal.insurerName} onChange={(value) => updateLegalField('insurerName', value)} />
          <Field label="Numero de police" value={settings.legal.policyNumber} onChange={(value) => updateLegalField('policyNumber', value)} />
        </div>
      </DemoSectionCard>

      <DemoSectionCard title="Assurance et mentions devis" description="Parametres juridiques mockes, modifiables localement sans ecriture reelle.">
        <div style={{ display: 'grid', gap: '16px' }}>
          <ToggleField
            label="Assurance decennale activee"
            subtitle="Active l'affichage de la couverture sur les devis demo."
            checked={settings.legal.decennialInsuranceEnabled}
            onChange={(value) => updateLegalField('decennialInsuranceEnabled', value)}
          />
          <TextareaField
            label="Mentions devis"
            rows={4}
            value={settings.legal.quoteMentions}
            onChange={(value) => updateLegalField('quoteMentions', value)}
          />
          <TextareaField
            label="Conditions de paiement"
            rows={3}
            value={settings.legal.paymentTerms}
            onChange={(value) => updateLegalField('paymentTerms', value)}
          />
        </div>
      </DemoSectionCard>
    </div>
  );

  const renderTravelSection = () => (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>🚗 Deplacements</h2>

      <DemoSectionCard
        title="Base de calcul locale"
        description="Aucun calcul externe ni appel API. Les valeurs ci-dessous sont purement demonstratives."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <Field label="Adresse de depart" value={settings.travel.departureAddress} onChange={(value) => updateTravelField('departureAddress', value)} />
          <Field label="Rayon d'intervention (km)" value={settings.travel.radiusKm} onChange={(value) => updateTravelField('radiusKm', value)} />
          <Field label="Frais standards (EUR)" value={settings.travel.standardFee} onChange={(value) => updateTravelField('standardFee', value)} />
          <Field label="Minimum d'intervention (EUR)" value={settings.travel.minimumIntervention} onChange={(value) => updateTravelField('minimumIntervention', value)} />
          <SelectField
            label="Motorisation"
            value={settings.travel.vehiclePowertrain}
            onChange={(value) => updateTravelField('vehiclePowertrain', value)}
            options={['Diesel utilitaire', 'Essence utilitaire', 'Electrique', 'Hybride']}
          />
          <Field
            label="Consommation estimee"
            value={settings.travel.estimatedConsumption}
            onChange={(value) => updateTravelField('estimatedConsumption', value)}
          />
        </div>
      </DemoSectionCard>

      <DemoSectionCard title="Activation et couverture" description="Les zones prioritaires et exclues sont configurables localement dans la demo.">
        <div style={{ display: 'grid', gap: '18px' }}>
          <ToggleField
            label="Cout de deplacement active"
            subtitle="Permet d'afficher un comportement metier plausible sans calcul reel."
            checked={settings.travel.travelCostEnabled}
            onChange={(value) => updateTravelField('travelCostEnabled', value)}
          />
          <TagSelector
            label="Zones prioritaires"
            options={['Rouen centre', 'Bois-Guillaume', 'Mont-Saint-Aignan', 'Sotteville-les-Rouen', 'Grand-Quevilly']}
            selected={settings.travel.priorityZones}
            onToggle={(value) => toggleTravelArrayValue('priorityZones', value)}
          />
          <TagSelector
            label="Zones exclues"
            options={['Paris intra-muros', 'Le Havre port', 'Interventions hors Normandie', 'Chantiers > 50 km']}
            selected={settings.travel.excludedZones}
            onToggle={(value) => toggleTravelArrayValue('excludedZones', value)}
          />
        </div>
      </DemoSectionCard>
    </div>
  );

  const renderWidgetSection = () => (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>Mon widget</h2>

      <DemoSectionCard
        title="Assistant web"
        description="Mode demo - ces reglages ne sont pas enregistres et servent uniquement a illustrer la configuration artisan."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <ToggleField
            label="Statut du widget"
            subtitle={settings.widget.enabled ? 'Widget actif sur les canaux demo.' : 'Widget mis en pause localement.'}
            checked={settings.widget.enabled}
            onChange={(value) => updateWidgetField('enabled', value)}
          />
          <Field label="Artisan ID" value={settings.widget.artisanId} onChange={(value) => updateWidgetField('artisanId', value)} />
          <SelectField
            label="Ton de reponse"
            value={settings.widget.responseTone}
            onChange={(value) => updateWidgetField('responseTone', value)}
            options={WIDGET_TONE_OPTIONS}
          />
        </div>
        <TextareaField
          label="Message d'accueil"
          rows={4}
          value={settings.widget.welcomeMessage}
          onChange={(value) => updateWidgetField('welcomeMessage', value)}
        />
      </DemoSectionCard>

      <DemoSectionCard title="Integration" description="Le script ci-dessous reste purement demonstratif et ne declenche aucun chargement externe depuis cette page.">
        <div style={{ display: 'grid', gap: '16px' }}>
          <TextareaField
            label="URL d'integration"
            rows={3}
            value={settings.widget.scriptUrl}
            onChange={(value) => updateWidgetField('scriptUrl', value)}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={copyWidgetScript}
              style={{
                background: widgetScriptCopied ? 'rgba(34,197,94,0.16)' : 'transparent',
                border: '1px solid rgba(34,197,94,0.28)',
                color: widgetScriptCopied ? 'var(--accent)' : 'var(--text-2)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {widgetScriptCopied ? 'Script copie' : 'Copier le script'}
            </button>
            <StatusBadge active={settings.widget.enabled} label={settings.widget.enabled ? 'Widget active' : 'Widget desactive'} />
          </div>
        </div>
      </DemoSectionCard>

      <DemoSectionCard title="Qualification" description="Questions et canaux simulant la configuration d'un assistant commercial deja bien cadre.">
        <div style={{ display: 'grid', gap: '18px' }}>
          <TagSelector
            label="Questions a demander"
            options={WIDGET_QUESTION_OPTIONS}
            selected={settings.widget.requestedFields}
            onToggle={(value) => toggleWidgetArrayValue('requestedFields', value)}
          />
          <TagSelector
            label="Canaux actifs"
            options={WIDGET_CHANNEL_OPTIONS}
            selected={settings.widget.activeChannels}
            onToggle={(value) => toggleWidgetArrayValue('activeChannels', value)}
          />
        </div>
      </DemoSectionCard>

      <DemoSectionCard title="Preview widget" description="Apercu visuel local pour verifier le ton, le badge demo et la hierarchie de l'assistant.">
        <div
          style={{
            borderRadius: '18px',
            border: '1px solid rgba(34,197,94,0.18)',
            background: 'linear-gradient(180deg, rgba(24,24,27,0.98), rgba(9,9,11,0.95))',
            padding: '18px',
            maxWidth: '360px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <p style={{ margin: 0, color: '#f4f4f5', fontSize: '14px', fontWeight: 700 }}>{settings.appearance.displayName}</p>
              <p style={{ margin: '4px 0 0', color: '#a1a1aa', fontSize: '12px' }}>{settings.widget.responseTone} · assistant web</p>
            </div>
            <StatusBadge active label="Demo" />
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '14px',
              marginBottom: '12px',
            }}
          >
            <p style={{ margin: 0, color: '#e4e4e7', fontSize: '13px', lineHeight: 1.7 }}>{settings.widget.welcomeMessage}</p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              padding: '12px 14px',
            }}
          >
            <span style={{ color: '#71717a', fontSize: '13px' }}>Decrivez votre projet...</span>
            <span
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '999px',
                background: settings.appearance.buttonColor,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#09090b',
                fontWeight: 800,
                fontSize: '12px',
              }}
            >
              OK
            </span>
          </div>
        </div>
      </DemoSectionCard>
    </div>
  );

  const renderCatalogueSection = () => (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>Catalogue & devis</h2>

      <DemoSectionCard title="Configuration catalogue" description="Le catalogue demo permet d'activer des prestations, d'ajuster les prix et de simuler l'ajout d'une nouvelle ligne.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <ToggleField
            label="Catalogue active"
            subtitle="Affiche des prestations preconfigurees dans les parcours de demonstration."
            checked={settings.catalogue.enabled}
            onChange={(value) => updateCatalogueField('enabled', value)}
          />
          <SelectField
            label="Mode de chiffrage"
            value={settings.catalogue.pricingMode}
            onChange={(value) => updateCatalogueField('pricingMode', value)}
            options={CATALOG_PRICING_OPTIONS}
          />
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {settings.catalogue.services.map((service) => (
            <div
              key={service.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                alignItems: 'end',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '14px',
              }}
            >
              <Field
                label="Prestation"
                value={service.title}
                onChange={(value) => updateCatalogueService(service.id, 'title', value)}
              />
              <Field
                label="Tarif affiche"
                value={service.priceLabel}
                onChange={(value) => updateCatalogueService(service.id, 'priceLabel', value)}
              />
              <ToggleField
                label={service.enabled ? 'Activee' : 'Masquee'}
                checked={service.enabled}
                onChange={(value) => updateCatalogueService(service.id, 'enabled', value)}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            onClick={addCatalogueService}
            style={{
              background: 'transparent',
              border: '1px solid rgba(34,197,94,0.28)',
              color: 'var(--accent)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Ajouter une prestation simulee
          </button>
        </div>
      </DemoSectionCard>

      <DemoSectionCard title="Parametres devis" description="Aucun PDF, email ou mutation reelle n'est declenche. Les valeurs servent uniquement a la demonstration.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <Field label="TVA par defaut" value={settings.catalogue.defaultVat} onChange={(value) => updateCatalogueField('defaultVat', value)} />
          <Field
            label="Validite devis"
            value={settings.catalogue.quoteValidityDays}
            onChange={(value) => updateCatalogueField('quoteValidityDays', value)}
          />
          <Field label="Acompte conseille" value={settings.catalogue.depositRate} onChange={(value) => updateCatalogueField('depositRate', value)} />
          <Field
            label="Conditions paiement"
            value={settings.catalogue.paymentTerms}
            onChange={(value) => updateCatalogueField('paymentTerms', value)}
          />
        </div>
        <TextareaField
          label="Mentions devis fictives"
          rows={4}
          value={settings.catalogue.quoteMentions}
          onChange={(value) => updateCatalogueField('quoteMentions', value)}
        />
      </DemoSectionCard>
    </div>
  );

  const renderAppearanceSection = () => (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>Apparence</h2>

      <DemoSectionCard title="Identite visuelle" description="La personnalisation ci-dessous reste locale et permet d'illustrer un rendu premium cote prospect.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <Field label="Nom affiche" value={settings.appearance.displayName} onChange={(value) => updateAppearanceField('displayName', value)} />
          <SelectField
            label="Mode visuel"
            value={settings.appearance.visualMode}
            onChange={(value) => updateAppearanceField('visualMode', value)}
            options={APPEARANCE_MODE_OPTIONS}
          />
          <SelectField
            label="Style de ton"
            value={settings.appearance.toneStyle}
            onChange={(value) => updateAppearanceField('toneStyle', value)}
            options={APPEARANCE_TONE_OPTIONS}
          />
          <Field label="Logo entreprise" value={settings.appearance.logoLabel} onChange={(value) => updateAppearanceField('logoLabel', value)} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          {COLOR_PRESETS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              active={settings.appearance.primaryColor === color}
              onClick={() => {
                updateAppearanceField('primaryColor', color);
                updateAppearanceField('buttonColor', color);
              }}
            />
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <Field label="Couleur principale" value={settings.appearance.primaryColor} onChange={(value) => updateAppearanceField('primaryColor', value)} />
          <Field label="Couleur bouton principal" value={settings.appearance.buttonColor} onChange={(value) => updateAppearanceField('buttonColor', value)} />
          <Field label="Couleur accent" value={settings.appearance.accentColor} onChange={(value) => updateAppearanceField('accentColor', value)} />
        </div>
      </DemoSectionCard>

      <DemoSectionCard title="Logo et rendu demo" description="Le changement de logo est simule localement, sans upload ni integration externe.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'center' }}>
          <div
            style={{
              width: '108px',
              height: '108px',
              borderRadius: '24px',
              background: `linear-gradient(135deg, ${settings.appearance.primaryColor}, ${settings.appearance.accentColor})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#09090b',
              fontWeight: 800,
              fontSize: '24px',
            }}
          >
            {settings.appearance.logoLabel}
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6 }}>
              Apercu logo demo pour illustrer l'identite visible dans le widget et les parcours prospect.
            </p>
            <button
              type="button"
              onClick={() => setStatusMessage('Changement de logo simule - aucun upload reel effectue.')}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-2)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Changer le logo
            </button>
          </div>
        </div>
      </DemoSectionCard>

      <DemoSectionCard title="Preview apparence" description="Mini apercu du widget, du CTA et d'un badge de projet pour verifier les reglages choisis.">
        <div style={{ display: 'grid', gap: '14px', maxWidth: '380px' }}>
          <div
            style={{
              background: settings.appearance.visualMode === 'Clair' ? '#f4f4f5' : '#09090b',
              color: settings.appearance.visualMode === 'Clair' ? '#18181b' : '#f4f4f5',
              border: '1px solid var(--border)',
              borderRadius: '18px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <strong>{settings.appearance.displayName}</strong>
              <span
                style={{
                  borderRadius: '999px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: `${settings.appearance.primaryColor}22`,
                  color: settings.appearance.primaryColor,
                }}
              >
                {settings.appearance.toneStyle}
              </span>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: '13px', lineHeight: 1.6, opacity: 0.86 }}>
              Interface {settings.appearance.visualMode.toLowerCase()} avec CTA personnalise pour vos prospects.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                style={{
                  background: settings.appearance.buttonColor,
                  color: '#09090b',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontWeight: 700,
                }}
              >
                Demarrer
              </button>
              <span
                style={{
                  borderRadius: '999px',
                  padding: '8px 10px',
                  border: `1px solid ${settings.appearance.accentColor}`,
                  color: settings.appearance.accentColor,
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Score projet 92
              </span>
            </div>
          </div>
        </div>
      </DemoSectionCard>
    </div>
  );

  const renderOfferSection = () => {
    const voiceCallsUsage = Math.round(
      (settings.offer.quotas.voiceCalls.used / settings.offer.quotas.voiceCalls.limit) * 100
    );

    return (
      <div>
        <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>Offre & quotas</h2>

        <DemoSectionCard
          title="Plan actuel"
          description="Mode demo - cette section illustre un plan Performance fictif sans aucune facturation reelle."
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            <div
              style={{
                borderRadius: '16px',
                border: '1px solid rgba(34,197,94,0.24)',
                background: 'linear-gradient(180deg, rgba(34,197,94,0.08), rgba(9,9,11,0.18))',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <StatusBadge active label={settings.offer.status} />
                <MetricPill label="Demo" tone="included" />
              </div>
              <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Plan</p>
              <p style={{ margin: '4px 0 8px', fontSize: '24px', fontWeight: 800 }}>{settings.offer.currentPlan}</p>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '14px' }}>{settings.offer.price}</p>
              <p style={{ margin: '10px 0 0', color: 'var(--text-3)', fontSize: '13px' }}>
                Renouvellement fictif : {settings.offer.renewalDate}
              </p>
              <p style={{ margin: '12px 0 0', color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6 }}>
                Mode demo - aucune facturation reelle.
              </p>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <button
                type="button"
                onClick={() => triggerOfferCta('Gerer mon abonnement')}
                style={{
                  background: 'var(--accent)',
                  color: '#09090b',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Gerer mon abonnement
              </button>
              <button
                type="button"
                onClick={() => triggerOfferCta('Voir les options')}
                style={{
                  background: 'transparent',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Voir les options
              </button>
              <button
                type="button"
                onClick={() => triggerOfferCta('Contacter Kadria')}
                style={{
                  background: 'transparent',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Contacter Kadria
              </button>
            </div>
          </div>
        </DemoSectionCard>

        <DemoSectionCard title="Quotas du mois" description="Apercu d'usage fictif pour contextualiser le plan Performance cote artisan.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
              <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>{settings.offer.quotas.projects.label}</p>
              <p style={{ margin: '6px 0 0', fontSize: '18px', fontWeight: 800 }}>
                {settings.offer.quotas.projects.used} / {settings.offer.quotas.projects.limitLabel}
              </p>
              <div style={{ marginTop: '12px' }}>
                <MetricPill label="Inclus" tone="included" />
              </div>
            </div>

            <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
              <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>{settings.offer.quotas.quotes.label}</p>
              <p style={{ margin: '6px 0 0', fontSize: '18px', fontWeight: 800 }}>
                {settings.offer.quotas.quotes.used} / {settings.offer.quotas.quotes.limitLabel}
              </p>
              <div style={{ marginTop: '12px' }}>
                <MetricPill label="Inclus" tone="included" />
              </div>
            </div>

            <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>{settings.offer.quotas.voiceCalls.label}</p>
                <MetricPill label={`${voiceCallsUsage}%`} tone="soon" />
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 800 }}>
                {settings.offer.quotas.voiceCalls.used} / {settings.offer.quotas.voiceCalls.limit}
              </p>
              <ProgressBar value={voiceCallsUsage} tone="#f59e0b" />
            </div>

            <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
              <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>{settings.offer.quotas.voiceMinutes.label}</p>
              <p style={{ margin: '6px 0 12px', fontSize: '18px', fontWeight: 800 }}>
                {settings.offer.quotas.voiceMinutes.used} {settings.offer.quotas.voiceMinutes.unit}
              </p>
              <ProgressBar value={64} tone="#22c55e" />
            </div>

            {[settings.offer.quotas.pdfExport, settings.offer.quotas.pipeline, settings.offer.quotas.priorities, settings.offer.quotas.followUps].map((item) => (
              <div
                key={item.label}
                style={{
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>{item.label}</p>
                  <p style={{ margin: '6px 0 0', fontSize: '16px', fontWeight: 700 }}>{item.status}</p>
                </div>
                <MetricPill label={item.status} tone={item.tone as 'included' | 'neutral' | 'soon'} />
              </div>
            ))}
          </div>
        </DemoSectionCard>

        <DemoSectionCard title="Fonctionnalites incluses" description="Vue synthese des avantages visibles par un artisan sur le plan Performance.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {settings.offer.features.map((feature) => (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '999px',
                    background: 'rgba(34,197,94,0.18)',
                    color: 'var(--accent)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 600 }}>{feature}</span>
              </div>
            ))}
          </div>
        </DemoSectionCard>

        <DemoSectionCard title="Comparaison rapide" description="Repere simple pour contextualiser le plan actuel, sans refaire toute la page tarifs.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {settings.offer.planComparison.map((plan) => (
              <div
                key={plan.name}
                style={{
                  background: plan.highlight ? 'rgba(34,197,94,0.10)' : 'var(--bg-hover)',
                  border: plan.highlight ? '1px solid rgba(34,197,94,0.28)' : '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>{plan.name}</p>
                  {plan.highlight && <MetricPill label="Actuel" tone="included" />}
                </div>
                <p style={{ margin: '10px 0 0', color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6 }}>
                  {plan.summary}
                </p>
              </div>
            ))}
          </div>
        </DemoSectionCard>

        <DemoSectionCard title="Add-on site vitrine" description="Option presentee localement dans la demo, sans aucune demande ni facturation reelle.">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>{settings.offer.siteAddon.title}</p>
              <p style={{ margin: '10px 0 0', color: 'var(--text-2)', fontSize: '14px' }}>{settings.offer.siteAddon.monthlyPrice}</p>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: '14px' }}>{settings.offer.siteAddon.oneShotPrice}</p>
              <p style={{ margin: '10px 0 0', color: 'var(--text-3)', fontSize: '13px' }}>{settings.offer.siteAddon.availability}</p>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <button
                type="button"
                onClick={() => triggerOfferCta("Demander l'option site")}
                style={{
                  background: 'transparent',
                  color: 'var(--accent)',
                  border: '1px solid rgba(34,197,94,0.28)',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Demander l'option site
              </button>
              <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px', lineHeight: 1.6 }}>
                Action simulee - aucune demande reelle envoyee.
              </p>
            </div>
          </div>
        </DemoSectionCard>
      </div>
    );
  };

  const renderSection = () => {
    if (activeSection === 'entreprise') return renderEntrepriseSection();
    if (activeSection === 'profil-metier') return renderProfileSection();
    if (activeSection === 'contact') return renderContactSection();
    if (activeSection === 'legal') return renderLegalSection();
    if (activeSection === 'vehicule') return renderTravelSection();
    if (activeSection === 'widget') return renderWidgetSection();
    if (activeSection === 'catalogue') return renderCatalogueSection();
    if (activeSection === 'apparence') return renderAppearanceSection();
    return renderOfferSection();
    if (false) {
      return (
        <PlaceholderSection
          title="🎨 Mon widget"
          kicker="Shell widget"
          body="Le shell de demonstration prepare la future integration du test widget, des couleurs et des messages d'accueil, sans embarquer encore la logique avancee du widget production."
        />
      );
    }
    if (false) {
      return (
        <PlaceholderSection
          title="📒 Catalogue & devis"
          kicker="Catalogue et modeles"
          body="La section est visible et navigable. Le catalogue, les suggestions et les modeles de devis seront traites dans le lot 3C sans toucher aux mutations ni aux API reelles."
        />
      );
    }
    if (false) {
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
      onSectionChange={(id) => setActiveSection(id as DemoSectionKey)}
      onBack={() => router.push('/demo-dashboard')}
      onSave={save}
      saveState={saveState}
      statusMessage={statusMessage}
    >
      {renderSection()}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '8px' }}>
        <button
          type="button"
          onClick={reset}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            borderRadius: '10px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reinitialiser les donnees demo
        </button>
      </div>
    </SettingsPageShell>
  );
}
