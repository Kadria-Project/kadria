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

const INITIAL_SETTINGS: DemoSettingsState = JSON.parse(
  JSON.stringify({
    entreprise: DEMO_SETTINGS_CONFIGURATION.entreprise,
    profile: DEMO_SETTINGS_CONFIGURATION.profile,
    contact: DEMO_SETTINGS_CONFIGURATION.contact,
    legal: DEMO_SETTINGS_CONFIGURATION.legal,
    travel: DEMO_SETTINGS_CONFIGURATION.travel,
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

  const renderSection = () => {
    if (activeSection === 'entreprise') return renderEntrepriseSection();
    if (activeSection === 'profil-metier') return renderProfileSection();
    if (activeSection === 'contact') return renderContactSection();
    if (activeSection === 'legal') return renderLegalSection();
    if (activeSection === 'vehicule') return renderTravelSection();
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
