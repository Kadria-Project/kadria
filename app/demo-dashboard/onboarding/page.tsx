'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KadriaLogo } from '@/src/components/KadriaLogo';
import { useDemoMode } from '@/src/contexts/DemoModeContext';

const SECTIONS = [
  { id: 'entreprise', label: 'Mon entreprise' },
  { id: 'widget', label: 'Mon widget' },
  { id: 'contact', label: 'Coordonnees' },
  { id: 'apparence', label: 'Apparence' },
] as const;

export default function DemoOnboardingPage() {
  const router = useRouter();
  const { artisan, updateArtisanConfig, theme, setTheme } = useDemoMode();
  const [activeSection, setActiveSection] = useState<(typeof SECTIONS)[number]['id']>('entreprise');

  const previewStyle = useMemo(
    () => ({
      background: theme === 'dark' ? '#09090b' : '#f8fafc',
      borderColor: theme === 'dark' ? '#27272a' : '#d4d4d8',
      textColor: theme === 'dark' ? '#ffffff' : '#18181b',
      muted: theme === 'dark' ? '#a1a1aa' : '#52525b',
    }),
    [theme],
  );

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--text-1)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KadriaLogo size="sm" theme="dark" noLink />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-green-500">Mode demonstration</p>
              <h1 className="text-2xl font-bold text-white">Configuration artisan</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/demo-dashboard')}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Retour au dashboard
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr_380px]">
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="space-y-2">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                    activeSection === section.id ? 'bg-green-500 text-zinc-950' : 'bg-zinc-950 text-zinc-200'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            {activeSection === 'entreprise' ? (
              <div className="space-y-4">
                <SectionTitle title="Mon entreprise" subtitle="Personnalisez le compte demo comme un vrai artisan." />
                <Field label="Nom de l'entreprise" value={artisan.companyName} onChange={(value) => updateArtisanConfig({ companyName: value })} />
                <Field label="Metier principal" value={artisan.primaryTrade} onChange={(value) => updateArtisanConfig({ primaryTrade: value })} />
                <Field label="Telephone" value={artisan.phone} onChange={(value) => updateArtisanConfig({ phone: value })} />
                <Field label="Adresse" value={artisan.address} onChange={(value) => updateArtisanConfig({ address: value })} />
              </div>
            ) : null}

            {activeSection === 'widget' ? (
              <div className="space-y-4">
                <SectionTitle title="Mon widget" subtitle="Ajustez le message d'accueil et l'identite visible cote prospect." />
                <Field label="Nom affiche" value={artisan.welcomeName} onChange={(value) => updateArtisanConfig({ welcomeName: value })} />
                <TextAreaField
                  label="Message d'accueil"
                  value={artisan.welcomeMessage}
                  onChange={(value) => updateArtisanConfig({ welcomeMessage: value })}
                />
                <Field label="Site web" value={artisan.websiteUrl} onChange={(value) => updateArtisanConfig({ websiteUrl: value })} />
              </div>
            ) : null}

            {activeSection === 'contact' ? (
              <div className="space-y-4">
                <SectionTitle title="Coordonnees" subtitle="Les informations utiles qui rassurent vos prospects." />
                <Field label="Email" value={artisan.email} onChange={(value) => updateArtisanConfig({ email: value })} />
                <Field label="Horaires" value={artisan.hours} onChange={(value) => updateArtisanConfig({ hours: value })} />
                <Field label="Couleur principale" value={artisan.primaryColor} onChange={(value) => updateArtisanConfig({ primaryColor: value })} />
              </div>
            ) : null}

            {activeSection === 'apparence' ? (
              <div className="space-y-4">
                <SectionTitle title="Apparence" subtitle="Basculez le rendu demo entre theme sombre et theme clair." />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold ${theme === 'dark' ? 'bg-green-500 text-zinc-950' : 'border border-zinc-800 bg-zinc-950 text-white'}`}
                  >
                    Theme sombre
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold ${theme === 'light' ? 'bg-green-500 text-zinc-950' : 'border border-zinc-800 bg-zinc-950 text-white'}`}
                  >
                    Theme clair
                  </button>
                </div>
                <Field label="Couleur secondaire" value={artisan.secondaryColor} onChange={(value) => updateArtisanConfig({ secondaryColor: value })} />
              </div>
            ) : null}
          </section>

          <aside className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="mb-4 font-semibold text-white">Preview widget</p>
            <div
              className="rounded-2xl border p-4"
              style={{ background: previewStyle.background, borderColor: previewStyle.borderColor }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 font-bold text-zinc-950">
                  K
                </div>
                <div>
                  <p style={{ color: previewStyle.textColor }} className="font-semibold">
                    {artisan.welcomeName}
                  </p>
                  <p style={{ color: previewStyle.muted }} className="text-xs">
                    Assistant en ligne
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p style={{ color: previewStyle.textColor }} className="text-sm font-semibold">
                  Bienvenue ! Quel projet souhaitez-vous realiser ?
                </p>
                <p style={{ color: previewStyle.muted }} className="mt-2 text-sm leading-6">
                  {artisan.welcomeMessage}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-green-500"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <textarea
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-green-500"
      />
    </label>
  );
}
