import type { Metadata } from 'next';
import { LandingRoutePage } from '@/src/components/KadriaPages';

export const metadata: Metadata = {
  title: 'Kadria - Assistant commercial pour artisans',
  description:
    'Kadria aide les artisans a transformer leurs demandes clients en dossiers qualifies, devis suivis, relances et chantiers mieux pilotes.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Kadria - Assistant commercial pour artisans',
    description:
      'Kadria aide les artisans a transformer leurs demandes clients en dossiers qualifies, devis suivis, relances et chantiers mieux pilotes.',
    url: 'https://kadria.fr',
  },
  twitter: {
    title: 'Kadria - Assistant commercial pour artisans',
    description:
      'Kadria aide les artisans a transformer leurs demandes clients en dossiers qualifies, devis suivis, relances et chantiers mieux pilotes.',
  },
};

export default function Home() {
  return <LandingRoutePage />;
}
