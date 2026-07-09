import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { MarketingShell, MarketingHero, MarketingSection } from '@/src/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Early access Kadria | Rejoindre les premiers artisans utilisateurs',
  description:
    "Rejoignez l'early access Kadria pour tester le cockpit commercial, partager vos retours terrain et participer à l'évolution du produit.",
  alternates: { canonical: '/early-access' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Early access Kadria | Rejoindre les premiers artisans utilisateurs',
    description:
      "Rejoignez l'early access Kadria pour tester le cockpit commercial, partager vos retours terrain et participer à l'évolution du produit.",
    url: 'https://kadria.fr/early-access',
  },
};

const TEST = [
  'Qualification des demandes',
  'Fiche projet',
  'Dashboard commercial',
  'Assistant vocal',
  'Relances',
  'Profils métiers',
  'Ressources Academy',
];

const EXPECTED = [
  'Tester sérieusement',
  'Partager les irritants',
  'Signaler les besoins métier',
  'Expliquer les cas réels',
  'Proposer des améliorations',
];

const GAINED = [
  'Accès prioritaire',
  'Échanges directs',
  'Influence sur la roadmap',
  'Meilleure adaptation à votre métier',
];

export default function EarlyAccessPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Early access"
        title="Rejoignez les artisans qui construisent Kadria avec nous"
        subtitle="L'early access permet à des artisans motivés de tester Kadria, partager leurs retours et influencer les prochaines évolutions du produit."
      />

      <MarketingSection
        title="Pourquoi un early access ?"
        text="Kadria est conçu pour le terrain. Les meilleurs retours viennent des artisans qui gèrent réellement des demandes, des devis, des appels et des relances au quotidien."
      />

      <MarketingSection title="Ce que vous pouvez tester">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEST.map((t) => (
            <li
              key={t}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-sm font-medium text-zinc-300"
            >
              {t}
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection title="Ce qu'on attend des premiers utilisateurs">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXPECTED.map((e) => (
            <li
              key={e}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-sm font-medium text-zinc-300"
            >
              {e}
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection title="Ce que vous gagnez">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GAINED.map((g) => (
            <li
              key={g}
              className="rounded-xl border border-green-500/20 bg-green-500/[0.04] px-5 py-4 text-sm font-medium text-zinc-300"
            >
              {g}
            </li>
          ))}
        </ul>
      </MarketingSection>

      <section className="border-t border-zinc-800 bg-zinc-900 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Prêt à rejoindre les premiers utilisateurs ?
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="mailto:contact@kadria.fr?subject=Early access Kadria"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-semibold text-black transition-colors duration-150 hover:bg-green-400"
            >
              <Mail size={16} />
              Rejoindre l&apos;early access
            </a>
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-zinc-900"
            >
              Essayer gratuitement
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
