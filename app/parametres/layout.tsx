import type { Metadata } from 'next';
import SettingsWorkspaceLayout from '@/src/components/settings/SettingsWorkspaceLayout'
import KadriaAppShell from '@/src/components/workspace/KadriaAppShell'

export const metadata: Metadata = {
  title: 'Parametres',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ParametresLayout({
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
      <KadriaAppShell><SettingsWorkspaceLayout>{children}</SettingsWorkspaceLayout></KadriaAppShell>
    </>
  )
}
