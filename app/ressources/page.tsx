import type { Metadata } from 'next';
import { ResourcesLanding } from '@/src/components/resources/ResourcesLanding';

export const metadata: Metadata = {
  title: 'Ressources Kadria — Guides, cas d’utilisation et nouveautés pour artisans',
  description:
    'Explorez les guides, cas d’utilisation et nouveautés Kadria pour mieux gérer vos demandes clients, vos devis, vos relances et votre suivi commercial.',
  alternates: {
    canonical: '/ressources',
  },
  openGraph: {
    title: 'Ressources Kadria — Guides, cas d’utilisation et nouveautés pour artisans',
    description:
      'Explorez les guides, cas d’utilisation et nouveautés Kadria pour mieux gérer vos demandes clients, vos devis, vos relances et votre suivi commercial.',
    url: 'https://kadria.fr/ressources',
  },
  twitter: {
    title: 'Ressources Kadria — Guides, cas d’utilisation et nouveautés pour artisans',
    description:
      'Explorez les guides, cas d’utilisation et nouveautés Kadria pour mieux gérer vos demandes clients, vos devis, vos relances et votre suivi commercial.',
  },
};

export default function RessourcesPage() {
  return <ResourcesLanding />;
}
