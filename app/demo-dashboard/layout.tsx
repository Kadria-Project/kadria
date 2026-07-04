import type { Metadata } from 'next';
import { DemoModeProvider } from '@/src/contexts/DemoModeContext';

export const metadata: Metadata = {
  title: 'Demo produit',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DemoDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DemoModeProvider>{children}</DemoModeProvider>;
}
