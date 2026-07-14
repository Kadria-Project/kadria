'use client';

import Link from 'next/link';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  Package,
  Settings,
  Users,
} from 'lucide-react';
import { KadriaLogo } from '@/src/components/KadriaLogo';

export type WorkspaceMode = 'value' | 'commercial' | 'calendar' | 'clients' | 'tasks' | 'value-report';

interface KadriaSidebarProps {
  compact: boolean;
  activeMode: WorkspaceMode;
  onToggle: () => void;
  onSelectMode: (mode: WorkspaceMode) => void;
}

const primaryItems = [
  { label: 'Accueil', mode: 'value' as const, icon: LayoutDashboard },
  { label: 'Suivi', mode: 'commercial' as const, icon: FolderKanban },
  { label: 'Agenda', mode: 'calendar' as const, icon: CalendarDays },
  { label: 'Clients', mode: 'clients' as const, icon: Users },
  { label: 'À faire', mode: 'tasks' as const, icon: ClipboardCheck },
  { label: 'Performance', mode: 'value-report' as const, icon: BarChart3 },
];

const secondaryItems = [
  { label: 'Devis et documents', href: '/dashboard-v2', icon: FileText },
  { label: 'Catalogue', href: '/parametres', icon: Package },
  { label: 'Équipe', href: '/parametres/equipe', icon: Users },
  { label: 'Paramètres', href: '/parametres', icon: Settings },
  { label: 'Aide', href: 'mailto:contact@kadria.fr', icon: HelpCircle },
];

export default function KadriaSidebar({ compact, activeMode, onToggle, onSelectMode }: KadriaSidebarProps) {
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
          const active = item.mode === activeMode;
          return (
            <button
              key={item.mode}
              type="button"
              onClick={() => onSelectMode(item.mode)}
              title={compact ? item.label : undefined}
              aria-label={item.label}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                compact ? 'justify-center px-0' : ''
              } ${active ? 'bg-emerald-400/15 text-emerald-300 shadow-[inset_3px_0_0_#34d399]' : 'text-slate-300 hover:bg-white/7 hover:text-white'}`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!compact && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="mt-7 border-t border-white/10 pt-5">
        {!compact && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Votre espace</p>}
        <nav aria-label="Navigation secondaire" className="space-y-1">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                title={compact ? item.label : undefined}
                aria-label={item.label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/7 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${compact ? 'justify-center px-0' : ''}`}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" />
                {!compact && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
