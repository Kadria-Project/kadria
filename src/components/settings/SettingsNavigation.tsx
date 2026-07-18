'use client';

import type { TenantRole } from '@/src/lib/team/types';
import { hasPermission, type Permission } from '@/src/lib/team/permission-matrix';

export type SettingsNavItem = {
  id: string;
  label: string;
  icon: string;
  href?: string;
  /** Permission requise pour voir l'onglet. Omise = visible pour tout membre actif. */
  requiredPermission?: Permission;
};

type SettingsNavigationProps = {
  role: TenantRole | null;
  items: SettingsNavItem[];
  activeId: string;
  onSelect: (item: SettingsNavItem) => void;
};

/**
 * Filtre automatiquement les entrees de navigation des parametres selon les
 * permissions du role courant (`hasPermission`). Tant que `role` n'est pas
 * encore resolu (chargement de `/api/team`), n'affiche que les entrees sans
 * `requiredPermission` pour eviter un flash d'onglets non autorises.
 */
export function SettingsNavigation({ role, items, activeId, onSelect }: SettingsNavigationProps) {
  const visibleItems = items.filter((item) => {
    if (!item.requiredPermission) return true;
    if (!role) return false;
    return hasPermission(role, item.requiredPermission);
  });

  return (
    <nav aria-label="Navigation des paramètres" className="flex min-w-max gap-2">
      {visibleItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          aria-current={activeId === item.id ? 'page' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 13px',
            borderRadius: '10px',
            border: activeId === item.id ? '1px solid rgba(34,197,94,0.35)' : '1px solid var(--border)',
            background: activeId === item.id ? 'rgba(34,197,94,0.12)' : 'var(--bg)',
            color: activeId === item.id ? 'var(--accent)' : 'var(--text-2)',
            fontWeight: activeId === item.id ? 700 : 500,
            fontSize: '13px',
            textAlign: 'left',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
