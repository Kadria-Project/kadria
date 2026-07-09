import type { Metadata } from 'next';
import {
  MarketingShell,
  MarketingHero,
  MarketingSection,
  MarketingCta,
} from '@/src/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Comparatif Kadria | Excel, WhatsApp, carnet papier ou cockpit commercial ?',
  description:
    'Comparez Kadria aux méthodes classiques utilisées par les artisans : carnet papier, WhatsApp, Excel, logiciel de devis ou CRM générique.',
  alternates: { canonical: '/comparatif' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Comparatif Kadria | Excel, WhatsApp, carnet papier ou cockpit commercial ?',
    description:
      'Comparez Kadria aux méthodes classiques utilisées par les artisans : carnet papier, WhatsApp, Excel, logiciel de devis ou CRM générique.',
    url: 'https://kadria.fr/comparatif',
  },
};

const ROWS = [
  {
    name: 'Carnet papier',
    pros: 'Simple, rapide',
    cons: 'Perte d\'informations, aucun suivi, impossible à partager',
    when: 'Quand les demandes augmentent',
  },
  {
    name: 'WhatsApp / SMS',
    pros: 'Pratique avec les clients',
    cons: 'Informations noyées dans les conversations',
    when: 'Quand les photos, budgets et délais doivent être structurés',
  },
  {
    name: 'Excel',
    pros: 'Flexible',
    cons: 'Manuel, fragile, peu adapté au terrain',
    when: 'Quand il faut prioriser et relancer',
  },
  {
    name: 'Logiciel de devis classique',
    pros: 'Utile pour chiffrer',
    cons: 'Intervient souvent trop tard, une fois le prospect déjà qualifié',
    when: 'Pour gérer tout ce qui se passe avant et après le devis',
  },
  {
    name: 'CRM générique',
    pros: 'Puissant',
    cons: 'Trop commercial, peu adapté aux artisans',
    when: 'Pour une expérience métier simple et concrète',
  },
];

export default function ComparatifPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Comparatif"
        title="Pourquoi Kadria va plus loin qu'un carnet, WhatsApp ou Excel"
        subtitle="Les outils classiques peuvent dépanner. Mais lorsqu'il faut suivre plusieurs prospects, devis et relances, ils montrent vite leurs limites."
      />

      <MarketingSection title="Comparatif des solutions">
        <div className="overflow-x-auto rounded-[20px] border border-zinc-800">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/70 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-4">Solution</th>
                <th className="px-5 py-4">Avantages</th>
                <th className="px-5 py-4">Limites</th>
                <th className="px-5 py-4">Quand passer à Kadria</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.name} className="border-b border-zinc-800 last:border-0">
                  <td className="px-5 py-4 font-semibold text-white">{row.name}</td>
                  <td className="px-5 py-4 text-zinc-400">{row.pros}</td>
                  <td className="px-5 py-4 text-zinc-400">{row.cons}</td>
                  <td className="px-5 py-4 text-green-400">{row.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MarketingSection>

      <MarketingSection
        title="Le vrai problème n'est pas le devis. C'est tout ce qui arrive avant."
        text="Beaucoup d'artisans pensent perdre du temps sur leurs devis. En réalité, le problème commence souvent plus tôt : demande incomplète, photo oubliée, budget non demandé, prospect jamais rappelé."
      />

      <MarketingSection
        title="Kadria complète vos outils, puis peut progressivement les remplacer"
        text="Kadria ne vous oblige pas à changer toute votre organisation du jour au lendemain. Il commence par structurer les demandes et le suivi commercial, puis devient progressivement votre cockpit central."
      />

      <MarketingCta
        title="Comparez avec votre organisation actuelle"
        primaryCta={{ label: 'Comparer avec votre organisation actuelle', href: '/demander-une-demo' }}
        secondaryCta={{ label: 'Voir les fonctionnalités', href: '/fonctionnalites' }}
      />
    </MarketingShell>
  );
}
