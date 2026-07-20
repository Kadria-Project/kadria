'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CalendarDays, ClipboardCheck, FolderKanban, LayoutDashboard, Users } from 'lucide-react';
import { dashboardModeFromPathname, dashboardPathForMode, type DashboardMode } from './WorkspaceNavigationContext';
import { useShellContext } from './shell/ShellContextProvider';

const items: Array<{ label: string; mode: DashboardMode; icon: typeof LayoutDashboard }> = [
  { label: 'Accueil', mode: 'value', icon: LayoutDashboard },
  { label: 'À faire', mode: 'tasks', icon: ClipboardCheck },
  { label: 'Suivi', mode: 'commercial', icon: FolderKanban },
  { label: 'Agenda', mode: 'calendar', icon: CalendarDays },
  { label: 'Clients', mode: 'clients', icon: Users },
  { label: 'Performance', mode: 'value-report', icon: BarChart3 },
];

export default function KadriaMobileNavigation() {
  const pathname = usePathname();
  const { shellContext } = useShellContext();
  const activeMode = dashboardModeFromPathname(pathname);

  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-slate-200 bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),0px)] shadow-[0_-4px_18px_rgba(15,34,50,0.08)] backdrop-blur lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeMode === item.mode
          && ['dashboard', 'tasks', 'tracking', 'calendar', 'clients', 'performance'].includes(shellContext.pageType);
        return (
          <Link key={item.mode} href={dashboardPathForMode(item.mode)} aria-label={item.label} aria-current={active ? 'page' : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold ${active ? 'text-emerald-700' : 'text-slate-500'}`}>
            <Icon className="size-4" aria-hidden="true" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
