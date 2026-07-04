import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portail client',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ClientProjectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
