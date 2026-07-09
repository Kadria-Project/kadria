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
  title: 'Métiers compatibles Kadria | Logiciel adapté aux artisans',
  description:
    "Kadria s'adapte aux métiers du bâtiment, de l'aménagement extérieur et des services techniques grâce au Profil Métier.",
  alternates: { canonical: '/metiers' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Métiers compatibles Kadria | Logiciel adapté aux artisans',
    description:
      "Kadria s'adapte aux métiers du bâtiment, de l'aménagement extérieur et des services techniques grâce au Profil Métier.",
    url: 'https://kadria.fr/metiers',
  },
};

const EXAMPLES = [
  { title: 'Paysagiste', text: 'Photos, surfaces, accès, saisonnalité, entretien, aménagement, clôture, terrasse.' },
  { title: 'Plombier', text: 'Urgence, fuite, dépannage, salle de bain, chauffe-eau, rénovation, accès.' },
  { title: 'Électricien', text: 'Tableau, rénovation, mise aux normes, prises, éclairage, dépannage.' },
  { title: 'Couvreur', text: 'Fuite, toiture, pente, surface, accès, météo, réparation, rénovation.' },
];

export default function MetiersPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Métiers"
        title="Kadria s'adapte à votre métier"
        subtitle="Un paysagiste, un plombier, un électricien ou un couvreur n'ont pas besoin des mêmes informations. Kadria adapte l'expérience selon votre activité."
        primaryCta={{ label: 'Découvrir le Profil Métier', href: '/ressources/profil-metier-kadria' }}
        secondaryCta={{ label: 'Essayer gratuitement', href: '/register' }}
      />

      <MarketingSection
        title="Pourquoi le métier change tout"
        text="Un logiciel générique pose les mêmes questions à tout le monde. Kadria part du principe inverse : chaque métier possède ses contraintes, ses urgences, son vocabulaire et ses informations indispensables."
      />

      <MarketingSection
        title="Le Profil Métier"
        text="Lors de la configuration, Kadria utilise votre métier pour adapter les questions, les dossiers, les informations attendues, les recommandations et les prochaines actions."
      />

      <MarketingSection title="Exemples">
        <MarketingGrid columns={4}>
          {EXAMPLES.map((e) => (
            <MarketingCard key={e.title} title={e.title} text={e.text} />
          ))}
        </MarketingGrid>
      </MarketingSection>

      <MarketingCta
        title="Tous les métiers compatibles"
        subtitle="Consultez la liste complète des métiers pris en charge par Kadria."
        primaryCta={{ label: 'Voir tous les métiers compatibles', href: '/ressources/metiers' }}
        secondaryCta={{ label: 'Voir les fonctionnalités', href: '/fonctionnalites' }}
      />
    </MarketingShell>
  );
}
