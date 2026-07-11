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
    <nav aria-label="Navigation des paramètres" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
            padding: '9px 12px',
            borderRadius: '8px',
            border: 'none',
            background: activeId === item.id ? 'var(--bg-hover)' : 'transparent',
            color: activeId === item.id ? 'var(--text-1)' : 'var(--text-3)',
            fontWeight: activeId === item.id ? 700 : 500,
            fontSize: '14px',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
