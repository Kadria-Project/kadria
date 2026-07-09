import type { Metadata } from 'next';
import { ResourceCollectionPage } from '@/src/components/resources/ResourceCollectionPage';
import { getCompatibleTradesCount, getResourcesByCategory } from '@/src/data/resources';

const SITE_URL = 'https://kadria.fr';
const PAGE_URL = `${SITE_URL}/ressources/metiers`;

export const metadata: Metadata = {
  title: 'Ressources métier Kadria — contenus par activité artisan',
  description:
    'Retrouvez toutes les ressources métier Kadria pour les paysagistes, plombiers, électriciens, couvreurs et autres artisans.',
  alternates: {
    canonical: '/ressources/metiers',
  },
};

export default async function RessourcesMetiersPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const tradesCount = getCompatibleTradesCount();
  const description = `${tradesCount} métiers actuellement compatibles.`;
  const intro =
    'Choisissez votre métier pour découvrir comment Kadria adapte automatiquement la qualification de vos demandes, vos dossiers et votre suivi commercial.';

  const softwareApplicationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kadria',
    description:
      'Kadria adapte automatiquement la qualification des demandes, les dossiers et le suivi commercial selon le métier de l’artisan.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: PAGE_URL,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <ResourceCollectionPage
        title="Ressources métier"
        description={description}
        intro={intro}
        resources={getResourcesByCategory('Métier')}
        page={resolvedSearchParams.page}
        basePath="/ressources/metiers"
      />
    </>
  );
}
