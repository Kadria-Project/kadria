import type { Metadata } from 'next';
import { ResourcesLanding } from '@/src/components/resources/ResourcesLanding';

const PAGE_TITLE = 'Ressources Kadria — Guides, cas d’utilisation et nouveautés pour artisans';
const PAGE_DESCRIPTION =
  'Explorez les guides, cas d’utilisation et nouveautés Kadria pour mieux gérer vos demandes clients, vos devis, vos relances et votre suivi commercial.';
const PAGE_URL = 'https://kadria.fr/ressources';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: '/ressources',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: 'website',
  },
  twitter: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function RessourcesPage() {
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <ResourcesLanding />
    </>
  );
}
