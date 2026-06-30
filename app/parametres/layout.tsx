import KadriaAssistantGlobalMount from '@/src/components/kadria-assistant/KadriaAssistantGlobalMount'

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
      {children}
      <KadriaAssistantGlobalMount />
    </>
  )
}
