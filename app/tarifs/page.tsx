import type { Metadata } from 'next';
import { PricingRoutePage } from '@/src/components/KadriaPages';

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    'Decouvrez les offres Kadria pour artisans : suivi commercial, devis, relances, assistant projet et pilotage des demandes clients.',
  alternates: {
    canonical: '/tarifs',
  },
  openGraph: {
    title: 'Tarifs - Kadria',
    description:
      'Decouvrez les offres Kadria pour artisans : suivi commercial, devis, relances, assistant projet et pilotage des demandes clients.',
    url: 'https://kadria.fr/tarifs',
  },
  twitter: {
    title: 'Tarifs - Kadria',
    description:
      'Decouvrez les offres Kadria pour artisans : suivi commercial, devis, relances, assistant projet et pilotage des demandes clients.',
  },
};

export default function TarifsPage() {
  return <PricingRoutePage />;
}
