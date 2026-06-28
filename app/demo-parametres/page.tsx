'use client';

import { useState } from 'react';
import { ArrowLeft, Bell, Briefcase, MessageSquare, Palette, RotateCcw, Save, ShieldCheck, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';

type DemoSettingsState = {
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  primaryTrade: string;
  coverageArea: string;
  projectTypes: string;
  welcomeMessage: string;
  tone: 'Professionnel' | 'Direct' | 'Rassurant';
  autoQualification: boolean;
  askPhotos: boolean;
  askBudget: boolean;
  hotLeadAlerts: boolean;
  quoteReminder: boolean;
  dailySummary: boolean;
  primaryColor: string;
  widgetDisplayName: string;
};

const INITIAL_SETTINGS: DemoSettingsState = {
  companyName: 'AB Elec',
  ownerName: 'Alexandre Bernard',
  email: 'contact@ab-elec-demo.fr',
  phone: '02 35 00 00 00',
  city: 'Rouen',
  primaryTrade: 'Electricite',
  coverageArea: 'Rouen + 30 km',
  projectTypes: 'depannage, renovation electrique, borne de recharge',
  welcomeMessage: "Bonjour, je suis l'assistant AB Elec. Decrivez votre besoin et je prepare un dossier qualifie.",
  tone: 'Professionnel',
  autoQualification: true,
  askPhotos: true,
  askBudget: true,
  hotLeadAlerts: true,
  quoteReminder: true,
  dailySummary: false,
  primaryColor: '#22c55e',
  widgetDisplayName: 'AB Elec',
};

function SectionCard({ title, icon: Icon, children }: { title: string; icon: typeof Briefcase; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/10 text-green-400">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  const className = 'w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-green-500/40';
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      {multiline ? (
        <textarea className={`${className} min-h-[112px] resize-y`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={className} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-left transition hover:border-green-500/30"
    >
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      <span className={`inline-flex h-7 w-12 items-center rounded-full p-1 transition ${checked ? 'bg-green-500' : 'bg-zinc-700'}`}>
        <span className={`h-5 w-5 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

export default function DemoParametresPage() {
  const router = useRouter();
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [feedback, setFeedback] = useState<string | null>(null);

  const updateField = <K extends keyof DemoSettingsState>(key: K, value: DemoSettingsState[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.14),transparent_55%),rgba(24,24,27,0.92)] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => router.push('/demo-dashboard')}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-green-500/30 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-400">Parametres de demonstration</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Mon profil demo</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
                  Tous les reglages ci-dessous sont modifiables localement pendant la session. Aucune donnee reelle n'est ecrite et tout revient a l'etat initial apres rafraichissement.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-full border border-green-500/25 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-300">
              <ShieldCheck className="h-4 w-4" />
              Mode demo - aucune donnee reelle enregistree
            </div>
          </div>

          {feedback && (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">
              {feedback}
            </div>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <SectionCard title="Profil artisan" icon={Briefcase}>
            <Field label="Nom entreprise" value={settings.companyName} onChange={(value) => updateField('companyName', value)} />
            <Field label="Nom responsable" value={settings.ownerName} onChange={(value) => updateField('ownerName', value)} />
            <Field label="Email" value={settings.email} onChange={(value) => updateField('email', value)} />
            <Field label="Telephone" value={settings.phone} onChange={(value) => updateField('phone', value)} />
            <Field label="Ville" value={settings.city} onChange={(value) => updateField('city', value)} />
          </SectionCard>

          <SectionCard title="Activite" icon={Briefcase}>
            <Field label="Metier principal" value={settings.primaryTrade} onChange={(value) => updateField('primaryTrade', value)} />
            <Field label="Zone d'intervention" value={settings.coverageArea} onChange={(value) => updateField('coverageArea', value)} />
            <Field label="Types de projets" value={settings.projectTypes} onChange={(value) => updateField('projectTypes', value)} multiline />
          </SectionCard>

          <SectionCard title="Assistant commercial" icon={MessageSquare}>
            <Field label="Message d'accueil" value={settings.welcomeMessage} onChange={(value) => updateField('welcomeMessage', value)} multiline />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-300">Ton</span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-green-500/40"
                value={settings.tone}
                onChange={(e) => updateField('tone', e.target.value as DemoSettingsState['tone'])}
              >
                <option>Professionnel</option>
                <option>Direct</option>
                <option>Rassurant</option>
              </select>
            </label>
            <Toggle label="Qualification automatique" checked={settings.autoQualification} onChange={(value) => updateField('autoQualification', value)} />
            <Toggle label="Demander des photos" checked={settings.askPhotos} onChange={(value) => updateField('askPhotos', value)} />
            <Toggle label="Demander le budget" checked={settings.askBudget} onChange={(value) => updateField('askBudget', value)} />
          </SectionCard>

          <SectionCard title="Notifications" icon={Bell}>
            <Toggle label="Prevenir quand un dossier est chaud" checked={settings.hotLeadAlerts} onChange={(value) => updateField('hotLeadAlerts', value)} />
            <Toggle label="Rappel devis" checked={settings.quoteReminder} onChange={(value) => updateField('quoteReminder', value)} />
            <Toggle label="Resume quotidien" checked={settings.dailySummary} onChange={(value) => updateField('dailySummary', value)} />
          </SectionCard>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Apparence / integration" icon={Palette}>
            <Field label="Couleur principale" value={settings.primaryColor} onChange={(value) => updateField('primaryColor', value)} />
            <Field label="Nom affiche dans le widget" value={settings.widgetDisplayName} onChange={(value) => updateField('widgetDisplayName', value)} />
          </SectionCard>

          <SectionCard title="Previsualisation simple du widget" icon={Smartphone}>
            <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-4">
              <div className="mx-auto max-w-[280px] rounded-[26px] border border-white/10 bg-zinc-900 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
                <div className="rounded-2xl p-4" style={{ backgroundColor: settings.primaryColor }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/70">Widget Kadria</p>
                  <p className="mt-1 text-lg font-semibold text-black">{settings.widgetDisplayName}</p>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-200">
                  {settings.welcomeMessage}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                  <span>Ton: {settings.tone}</span>
                  <span>{settings.askPhotos ? 'Photos demandees' : 'Photos optionnelles'}</span>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setFeedback('Modifications simulees - aucune donnee reelle enregistree.')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-green-400"
          >
            <Save className="h-4 w-4" />
            Enregistrer les modifications
          </button>
          <button
            type="button"
            onClick={() => {
              setSettings(INITIAL_SETTINGS);
              setFeedback("Configuration reinitialisee localement - l'etat initial demo est restaure.");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-green-500/30 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Reinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}
