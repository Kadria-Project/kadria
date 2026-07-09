import type { Metadata } from 'next';
import {
  MarketingShell,
  MarketingHero,
  MarketingSection,
  MarketingCta,
} from '@/src/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Site vitrine connecté pour artisans | Kadria',
  description:
    'Kadria peut accompagner les artisans avec un site vitrine connecté à leur parcours de demande, pour transformer les visiteurs en dossiers qualifiés.',
  alternates: { canonical: '/site-vitrine-artisan' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Site vitrine connecté pour artisans | Kadria',
    description:
      'Kadria peut accompagner les artisans avec un site vitrine connecté à leur parcours de demande, pour transformer les visiteurs en dossiers qualifiés.',
    url: 'https://kadria.fr/site-vitrine-artisan',
  },
};

const CHANGES = [
  'Formulaire ou parcours de demande adapté',
  'Informations utiles collectées',
  'Photos possibles',
  'Meilleure qualification',
  'Dossier projet créé',
  'Suivi commercial derrière',
];

const AUDIENCE = [
  "Ceux qui n'ont pas encore de site",
  'Ceux qui ont un site vieillissant',
  'Ceux qui reçoivent des demandes incomplètes',
  'Ceux qui veulent centraliser leur acquisition',
];

export default function SiteVitrineArtisanPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Site vitrine connecté"
        title="Un site vitrine qui ne se contente pas de présenter votre activité"
        subtitle="Avec l'option site vitrine connecté, votre présence en ligne peut devenir une vraie porte d'entrée vers des demandes mieux qualifiées."
        primaryCta={{ label: 'Demander une démo', href: '/demander-une-demo' }}
        secondaryCta={{ label: 'Voir les tarifs', href: '/tarifs' }}
      />

      <MarketingSection
        title="Le problème des sites vitrines classiques"
        text="Beaucoup de sites artisans présentent bien l'entreprise, mais ne structurent pas assez les demandes. Le prospect envoie un message incomplet, et l'artisan doit tout reprendre au téléphone."
      />

      <MarketingSection title="Ce que change un site connecté à Kadria">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CHANGES.map((c) => (
            <li
              key={c}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-sm font-medium text-zinc-300"
            >
              {c}
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection title="Pour quels artisans ?">
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

      <MarketingSection
        title="Offre"
        text="L'option site vitrine connecté peut être proposée en complément de Kadria, afin d'aligner votre présence en ligne avec votre organisation commerciale."
      />

      <MarketingCta
        title="Découvrez si le site vitrine connecté est fait pour vous"
        primaryCta={{ label: 'Demander une démo', href: '/demander-une-demo' }}
        secondaryCta={{ label: 'Voir les tarifs', href: '/tarifs' }}
      />
    </MarketingShell>
  );
}
