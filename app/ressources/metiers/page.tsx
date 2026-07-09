import type { Metadata } from 'next';
import { ResourceCollectionPage } from '@/src/components/resources/ResourceCollectionPage';
import { getResourcesByCategory } from '@/src/data/resources';

export const metadata: Metadata = {
  title: 'Ressources métier Kadria — contenus par activité artisan',
  description:
    'Retrouvez toutes les ressources métier Kadria pour les paysagistes, plombiers, électriciens, couvreurs et autres artisans.',
  alternates: {
    canonical: '/ressources/metiers',
  },
};

export default function RessourcesMetiersPage() {
  return (
    <ResourceCollectionPage
      title="Ressources métier"
      description="Tous les contenus Academy pensés par activité artisan, pour retrouver plus vite les bons cas d’usage, les bons réflexes commerciaux et les bons dossiers."
      resources={getResourcesByCategory('Métier')}
    />
  );
}
