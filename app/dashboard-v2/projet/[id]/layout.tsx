import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fiche projet',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardProjectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
