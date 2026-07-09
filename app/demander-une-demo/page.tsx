import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import {
  MarketingShell,
  MarketingSection,
  MarketingGrid,
  MarketingCard,
} from '@/src/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Demander une démo Kadria | Découvrir le cockpit commercial artisan',
  description:
    'Demandez une démonstration de Kadria pour découvrir comment mieux qualifier vos demandes, suivre vos devis et transformer plus de prospects en chantiers.',
  alternates: { canonical: '/demander-une-demo' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Demander une démo Kadria | Découvrir le cockpit commercial artisan',
    description:
      'Demandez une démonstration de Kadria pour découvrir comment mieux qualifier vos demandes, suivre vos devis et transformer plus de prospects en chantiers.',
    url: 'https://kadria.fr/demander-une-demo',
  },
};

const SEEN = [
  { title: "Qualification d'une demande", text: 'Découvrez comment une demande brute devient une fiche exploitable.' },
  { title: 'Création d\'un dossier projet', text: 'Visualisez comment les informations sont centralisées et enrichies.' },
  { title: 'Suivi des relances', text: 'Voyez comment Kadria vous rappelle les prospects et devis à relancer.' },
  { title: 'Tableau de bord commercial', text: 'Explorez le cockpit qui priorise vos opportunités.' },
  { title: 'Assistant vocal', text: 'Comprenez comment un appel terrain peut devenir un dossier structuré.' },
  { title: "Adaptation au métier", text: 'Découvrez le Profil Métier appliqué à votre activité.' },
];

const AUDIENCE = [
  'Artisans indépendants',
  'Petites équipes',
  'Entreprises du bâtiment',
  'Entreprises qui reçoivent plusieurs demandes par semaine',
  'Artisans qui veulent mieux suivre leurs prospects',
];

export default function DemanderUneDemoPage() {
  return (
    <MarketingShell>
      <section className="pb-10 text-center sm:pb-14">
        <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
          Démonstration
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
          Voyez concrètement comment Kadria peut s&apos;adapter à votre activité
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          En quelques minutes, découvrez comment vos demandes clients peuvent devenir des dossiers structurés,
          priorisés et prêts à chiffrer.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="mailto:contact@kadria.fr?subject=Demande de démonstration Kadria"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-semibold text-black transition-colors duration-150 hover:bg-green-400"
          >
            <Mail size={16} />
            Écrire à Kadria
          </a>
          <Link
            href="/demo-request"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-zinc-900"
          >
            Réserver une présentation guidée
          </Link>
        </div>
      </section>

      <MarketingSection title="Ce que vous verrez pendant la démo">
        <MarketingGrid columns={3}>
          {SEEN.map((s) => (
            <MarketingCard key={s.title} title={s.title} text={s.text} />
          ))}
        </MarketingGrid>
      </MarketingSection>

      <MarketingSection title="Pour qui ?">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {AUDIENCE.map((a) => (
            <li
              key={a}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-sm font-medium text-zinc-300"
            >
              {a}
            </li>
          ))}
        </ul>
      </MarketingSection>

      <section className="border-t border-zinc-800 bg-zinc-900 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Vous préférez commencer tout de suite ?
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-semibold text-black transition-colors duration-150 hover:bg-green-400"
            >
              Essayer gratuitement
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
