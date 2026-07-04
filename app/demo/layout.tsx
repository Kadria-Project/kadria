import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demander une demo',
  description:
    'Demandez un acces de demonstration a Kadria et decouvrez comment mieux suivre vos demandes, devis et chantiers.',
  alternates: {
    canonical: '/demo',
  },
  openGraph: {
    title: 'Demander une demo - Kadria',
    description:
      'Demandez un acces de demonstration a Kadria et decouvrez comment mieux suivre vos demandes, devis et chantiers.',
    url: 'https://kadria.fr/demo',
  },
  twitter: {
    title: 'Demander une demo - Kadria',
    description:
      'Demandez un acces de demonstration a Kadria et decouvrez comment mieux suivre vos demandes, devis et chantiers.',
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
