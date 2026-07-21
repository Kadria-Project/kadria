import type { Metadata } from 'next';
import KadriaAppShell from '@/src/components/workspace/KadriaAppShell'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('kadria-theme') || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            })();
          `,
        }}
      />
      <KadriaAppShell>{children}</KadriaAppShell>
    </>
  )
}
