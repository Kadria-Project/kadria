'use client';

import type { ReactNode } from 'react';
import type { TenantRole } from '@/src/lib/team/types';
import { hasPermission, type Permission } from '@/src/lib/team/permission-matrix';

type PermissionGateProps = {
  role: TenantRole | null;
  /** Une seule permission requise, ou une liste (l'utilisateur doit toutes les avoir). */
  permission: Permission | Permission[];
  children: ReactNode;
  /** Affiche a la place des enfants quand la permission manque (ex. <ReadOnlyNotice />). Par defaut: rien. */
  fallback?: ReactNode;
};

/**
 * Composant de gouvernance UI : n'affiche ses enfants que si le role courant
 * possede la ou les permissions demandees, via `hasPermission()` (matrice
 * unique `src/lib/team/permission-matrix.ts`, partagee avec le serveur).
 *
 * Ne remplace jamais la verification serveur (`requirePermission` dans les
 * routes API) — c'est une protection UI en plus, pas a la place.
 */
export function PermissionGate({ role, permission, children, fallback = null }: PermissionGateProps) {
  if (!role) return <>{fallback}</>;
  const permissions = Array.isArray(permission) ? permission : [permission];
  const allowed = permissions.every((p) => hasPermission(role, p));
  return <>{allowed ? children : fallback}</>;
}
