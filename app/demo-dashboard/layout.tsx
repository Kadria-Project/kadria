import type { Metadata } from 'next';
import { DemoModeProvider } from '@/src/contexts/DemoModeContext';
import DemoKadriaAssistantWidget from '@/src/components/kadria-assistant/DemoKadriaAssistantWidget';

export const metadata: Metadata = {
  title: 'Demo produit',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DemoDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoModeProvider>
      {children}
      <DemoKadriaAssistantWidget />
    </DemoModeProvider>
  );
}
