import type { Metadata } from 'next';
import {
  MarketingShell,
  MarketingHero,
  MarketingSection,
  MarketingGrid,
  MarketingCard,
  MarketingCta,
} from '@/src/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Sécurité et confidentialité | Kadria',
  description:
    'Découvrez les engagements de Kadria en matière de confidentialité, sécurité des données, accès et protection des informations clients.',
  alternates: { canonical: '/securite' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Sécurité et confidentialité | Kadria',
    description:
      'Découvrez les engagements de Kadria en matière de confidentialité, sécurité des données, accès et protection des informations clients.',
    url: 'https://kadria.fr/securite',
  },
};

const CARDS = [
  {
    title: 'Confidentialité',
    text: 'Les informations de vos prospects et clients sont utilisées pour faire fonctionner votre espace Kadria et votre suivi commercial.',
  },
  {
    title: 'Accès contrôlé',
    text: "L'objectif est que chaque artisan accède uniquement à ses propres données et à ses propres dossiers.",
  },
  {
    title: 'Centralisation',
    text: 'Regrouper les informations réduit les pertes, les erreurs de transmission et les données dispersées dans plusieurs outils.',
  },
  {
    title: 'Suppression et maîtrise',
    text: 'Les demandes de suppression ou de modification des données doivent pouvoir être traitées clairement.',
  },
];

const PRACTICES = [
  'Ne pas partager son compte',
  'Vérifier les destinataires des devis',
  'Éviter de stocker des informations inutiles',
  'Mettre à jour ses coordonnées',
  'Supprimer les dossiers obsolètes si nécessaire',
];

export default function SecuritePage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Sécurité"
        title="Vos données clients doivent rester maîtrisées"
        subtitle="Kadria manipule des informations commerciales importantes : prospects, projets, coordonnées, photos, devis et échanges. La confidentialité n'est pas un détail."
        primaryCta={{ label: 'Consulter la politique de confidentialité', href: '/privacy' }}
        secondaryCta={{ label: 'Demander une démo', href: '/demander-une-demo' }}
      />

      <MarketingSection
        title="Des données professionnelles sensibles"
        text="Les demandes clients, les photos de chantier, les budgets, les devis et les coordonnées doivent être traités avec sérieux. Kadria est conçu pour centraliser ces informations dans un espace de travail plus fiable que des échanges dispersés."
      >
        <MarketingGrid columns={4}>
          {CARDS.map((c) => (
            <MarketingCard key={c.title} title={c.title} text={c.text} />
          ))}
        </MarketingGrid>
      </MarketingSection>

      <MarketingSection
        title="RGPD et transparence"
        text="Kadria s'inscrit dans une logique de transparence et de protection des données professionnelles. Les documents juridiques détaillés précisent les responsabilités, les finalités de traitement et les modalités liées aux données."
      />

      <MarketingSection title="Bonnes pratiques recommandées">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PRACTICES.map((p) => (
            <li
              key={p}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-sm font-medium text-zinc-300"
            >
              {p}
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingCta
        title="Des questions sur la sécurité de vos données ?"
        primaryCta={{ label: 'Consulter la politique de confidentialité', href: '/privacy' }}
        secondaryCta={{ label: 'Demander une démo', href: '/demander-une-demo' }}
      />
    </MarketingShell>
  );
}
