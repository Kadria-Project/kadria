import type { Metadata } from 'next';
import {
  MarketingShell,
  MarketingHero,
  MarketingSection,
  MarketingCta,
} from '@/src/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Roadmap Kadria | Produit vivant pour artisans',
  description:
    'Découvrez les évolutions livrées, en cours et prévues pour Kadria, le cockpit commercial pensé pour les artisans.',
  alternates: { canonical: '/roadmap' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Roadmap Kadria | Produit vivant pour artisans',
    description:
      'Découvrez les évolutions livrées, en cours et prévues pour Kadria, le cockpit commercial pensé pour les artisans.',
    url: 'https://kadria.fr/roadmap',
  },
};

const SHIPPED = [
  'Qualification des demandes',
  'Fiches projet',
  'Tableau de bord commercial',
  'Assistant vocal',
  'Suivi des devis',
  'Ressources Academy',
  'Profils métiers',
  'Premiers quotas selon les plans',
];

const IN_PROGRESS = [
  'Relances commerciales',
  'Expérience mobile',
  'Priorisation des opportunités',
  'Paramétrage métier',
  'Suivi administratif',
  'Pages métiers Academy',
];

const EXPLORING = [
  "Paiement d'acompte",
  'Synchronisation calendrier',
  'Portail client',
  'Signature électronique',
  'Bibliothèque de prestations',
  'Automatisations avancées',
  'Intégrations externes',
];

function RoadmapColumn({ title, badge, items }: { title: string; badge: string; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7">
      <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-green-500">
        {badge}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-zinc-400">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Roadmap"
        title="Kadria évolue avec les besoins du terrain"
        subtitle="La roadmap permet de suivre les grandes évolutions du produit : ce qui est déjà livré, ce qui est en cours et ce qui arrive ensuite."
      />

      <MarketingSection>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <RoadmapColumn title="Déjà livré" badge="Livré" items={SHIPPED} />
          <RoadmapColumn title="En cours d'amélioration" badge="En cours" items={IN_PROGRESS} />
          <RoadmapColumn title="À l'étude" badge="Prévu / en exploration" items={EXPLORING} />
        </div>
      </MarketingSection>

      <MarketingCta
        title="Suivez les nouveautés Kadria"
        primaryCta={{ label: 'Voir les nouveautés', href: '/ressources/categories/nouveautes' }}
        secondaryCta={{ label: 'Demander une démo', href: '/demander-une-demo' }}
      />
    </MarketingShell>
  );
}
