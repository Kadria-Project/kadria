import { DemoModeProvider } from '@/src/contexts/DemoModeContext';

export default function DemoDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoModeProvider>
      <div data-theme="dark">
        <div className="sticky top-0 z-[200] bg-green-500 px-4 py-1.5 text-center text-xs font-bold text-black">
          Mode demonstration - donnees fictives, aucune sauvegarde reelle
        </div>
        {children}
      </div>
    </DemoModeProvider>
  );
}
