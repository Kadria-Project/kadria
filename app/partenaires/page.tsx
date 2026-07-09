import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import {
  MarketingShell,
  MarketingHero,
  MarketingSection,
  MarketingGrid,
  MarketingCard,
} from '@/src/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Partenaires Kadria | Agences, consultants et apporteurs d\'affaires',
  description:
    "Kadria recherche des partenaires pour accompagner les artisans : agences web, consultants, intégrateurs, experts métier et apporteurs d'affaires.",
  alternates: { canonical: '/partenaires' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Partenaires Kadria | Agences, consultants et apporteurs d\'affaires',
    description:
      "Kadria recherche des partenaires pour accompagner les artisans : agences web, consultants, intégrateurs, experts métier et apporteurs d'affaires.",
    url: 'https://kadria.fr/partenaires',
  },
};

const AUDIENCE = [
  { title: 'Agences web', text: 'Complétez vos offres de création de site par un outil de suivi commercial concret.' },
  { title: 'Consultants indépendants', text: 'Apportez une solution concrète aux artisans que vous accompagnez.' },
  { title: 'Experts en digitalisation', text: "Intégrez Kadria dans vos accompagnements de transformation." },
  { title: "Apporteurs d'affaires", text: 'Recommandez Kadria à votre réseau d\'artisans.' },
  { title: "Réseaux d'artisans", text: 'Proposez Kadria comme outil commun à vos adhérents.' },
  { title: 'Formateurs métier', text: 'Intégrez Kadria dans vos parcours de formation terrain.' },
];

const WHY = [
  'Proposer une solution concrète aux artisans',
  'Compléter une offre site internet',
  'Accompagner la transformation commerciale',
  'Créer une relation récurrente',
  'Apporter plus de valeur aux clients',
];

const CASES = [
  "Une agence qui crée un site vitrine et connecte Kadria",
  'Un consultant qui aide l\'artisan à mieux traiter ses demandes',
  'Un apporteur d\'affaires qui recommande Kadria à son réseau',
];

export default function PartenairesPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Partenaires"
        title="Construisons un réseau de partenaires autour des artisans"
        subtitle="Kadria peut devenir un levier pour les agences, consultants et experts qui accompagnent déjà les artisans dans leur développement."
      />

      <MarketingSection title="Pour qui ?">
        <MarketingGrid columns={3}>
          {AUDIENCE.map((a) => (
            <MarketingCard key={a.title} title={a.title} text={a.text} />
          ))}
        </MarketingGrid>
      </MarketingSection>

      <MarketingSection title="Pourquoi devenir partenaire ?">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {WHY.map((w) => (
            <li
              key={w}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-sm font-medium text-zinc-300"
            >
              {w}
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection title="Cas typiques">
        <ul className="space-y-3 text-sm leading-relaxed text-zinc-400">
          {CASES.map((c) => (
            <li key={c} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4">
              {c}
            </li>
          ))}
        </ul>
      </MarketingSection>

      <section className="border-t border-zinc-800 bg-zinc-900 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Envie de construire un partenariat avec Kadria ?
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="mailto:contact@kadria.fr?subject=Partenariat Kadria"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-semibold text-black transition-colors duration-150 hover:bg-green-400"
            >
              <Mail size={16} />
              Proposer un partenariat
            </a>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
