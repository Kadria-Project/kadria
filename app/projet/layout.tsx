import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deposer une demande de travaux',
  description:
    'Decrivez votre projet et transmettez les informations utiles a votre artisan via Kadria.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProjetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
