import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DemoModeProvider } from '@/src/contexts/DemoModeContext';
import DemoKadriaAssistantWidget from '@/src/components/kadria-assistant/DemoKadriaAssistantWidget';
import LocalUxAuditToolbar from '@/src/components/ux-audit/LocalUxAuditToolbar';

export const metadata: Metadata = {
  title: 'Demo produit',
  robots: {
    index: false,
    follow: false,
  },
};

// Same fail-closed condition as middleware.ts. Computed server-side only;
// never sent to the client except as the resulting boolean.
const isLocalUxAuditEnabled =
  process.env.NODE_ENV !== 'production' && process.env.KADRIA_LOCAL_UX_AUDIT === 'true';

export default function DemoDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // DemoModeProvider reads useSearchParams() (to pick up ?scenario=...),
    // which requires a Suspense boundary in the App Router.
    <Suspense fallback={null}>
      <DemoModeProvider>
        {children}
        <DemoKadriaAssistantWidget />
        {isLocalUxAuditEnabled && <LocalUxAuditToolbar enabled={isLocalUxAuditEnabled} />}
      </DemoModeProvider>
    </Suspense>
  );
}
