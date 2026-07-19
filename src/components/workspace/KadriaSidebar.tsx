'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import { KadriaLogo } from '@/src/components/KadriaLogo';
import { dashboardModeFromPathname, dashboardPathForMode } from './WorkspaceNavigationContext';

export type WorkspaceMode = 'value' | 'commercial' | 'calendar' | 'clients' | 'tasks' | 'value-report';

interface KadriaSidebarProps {
  compact: boolean;
  onToggle: () => void;
}

const primaryItems = [
  { label: 'Accueil', mode: 'value' as const, icon: LayoutDashboard },
  { label: 'À faire', mode: 'tasks' as const, icon: ClipboardCheck },
  { label: 'Suivi', mode: 'commercial' as const, icon: FolderKanban },
  { label: 'Agenda', mode: 'calendar' as const, icon: CalendarDays },
  { label: 'Clients', mode: 'clients' as const, icon: Users },
  { label: 'Performance', mode: 'value-report' as const, icon: BarChart3 },
];

const secondaryItems = [
  { label: 'Équipe', href: '/parametres/equipe', icon: Users },
  { label: 'Paramètres', href: '/parametres/entreprise', icon: Settings },
  { label: 'Aide', href: '/ressources', icon: HelpCircle },
];

const settingsItems = [
  { label: 'Mon entreprise', href: '/parametres/entreprise' },
  { label: 'Activité', href: '/parametres/activite' },
  { label: 'Assistants', href: '/parametres/assistants' },
  { label: 'Automatisations', href: '/parametres/automatisations' },
  { label: 'Connexions', href: '/parametres/connexions' },
  { label: 'Notifications', href: '/parametres/notifications' },
  { label: 'Accès et sécurité', href: '/parametres/acces' },
  { label: 'Abonnement', href: '/parametres/abonnement' },
];

export default function KadriaSidebar({ compact, onToggle }: KadriaSidebarProps) {
  const pathname = usePathname();
  const [logoutPending, setLogoutPending] = useState(false);

  const logout = async () => {
    if (logoutPending) return;
    setLogoutPending(true);

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
      const data = await response.json();
      if (!data?.success) return;
      window.sessionStorage.removeItem('kadria-workspace-scroll');
      window.sessionStorage.removeItem('kadria-workspace-return-context');
      window.location.assign(data.redirectUrl || '/login');
    } finally {
      setLogoutPending(false);
    }
  };

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-white/10 bg-[#071521] px-3 py-5 text-slate-200 transition-[width] duration-200 ${
        compact ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      <div className={`mb-8 flex items-center ${compact ? 'justify-center' : 'justify-between px-2'}`}>
        {compact ? <span className="text-sm font-black tracking-tight text-emerald-400">K</span> : <KadriaLogo size="sm" noLink />}
        {!compact && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Réduire le menu"
            title="Réduire le menu"
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {compact && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Développer le menu"
          title="Développer le menu"
          className="mb-5 grid h-10 w-10 place-items-center self-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <nav aria-label="Navigation principale" className="space-y-1">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = item.mode === dashboardModeFromPathname(pathname);
          return (
            <Link
              key={item.mode}
              href={dashboardPathForMode(item.mode)}
              title={compact ? item.label : undefined}
              aria-label={item.label}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                compact ? 'justify-center px-0' : ''
              } ${active ? 'bg-emerald-400/15 text-emerald-300 shadow-[inset_3px_0_0_#34d399]' : 'text-slate-300 hover:bg-white/7 hover:text-white'}`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!compact && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-7 border-t border-white/10 pt-5">
        {!compact && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Votre espace</p>}
        <nav aria-label="Navigation secondaire" className="space-y-1">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const active = item.label === 'Paramètres'
              ? pathname.startsWith('/parametres')
              : pathname === item.href;
            return (
              <div key={item.label}>
                <Link href={item.href} title={compact ? item.label : undefined} aria-label={item.label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-white/7 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${compact ? 'justify-center px-0' : ''} ${active ? 'bg-emerald-400/15 text-emerald-300' : 'text-slate-400'}`}>
                  <Icon className="h-[17px] w-[17px] shrink-0" />
                  {!compact && <span className="truncate">{item.label}</span>}
                </Link>
                {!compact && item.label === 'Paramètres' && pathname.startsWith('/parametres') && (
                  <div className="ml-6 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                    {settingsItems.map((settingsItem) => {
                      const settingsActive = pathname === settingsItem.href;
                      return <Link key={settingsItem.href} href={settingsItem.href} className={`block rounded-lg px-2 py-1.5 text-xs transition-colors ${settingsActive ? 'bg-emerald-400/15 text-emerald-300' : 'text-slate-400 hover:text-white'}`}>{settingsItem.label}</Link>;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => void logout()}
          disabled={logoutPending}
          title={compact ? 'Déconnexion' : undefined}
          aria-label="Déconnexion"
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-rose-300/85 transition-colors hover:bg-rose-400/10 hover:text-rose-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300 disabled:cursor-wait disabled:opacity-60 ${compact ? 'justify-center px-0' : ''}`}
        >
          <LogOut className="h-[17px] w-[17px] shrink-0" />
          {!compact && <span className="truncate">{logoutPending ? 'Déconnexion…' : 'Déconnexion'}</span>}
        </button>
      </div>
    </aside>
  );
}
