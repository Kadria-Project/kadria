import 'server-only'

import type { TenantContext } from '@/src/lib/tenant-context'

/**
 * Couche centralisee de permissions par role de tenant.
 *
 * Source de verite des droits : `tenant_members.role` + `tenant_members.status`
 * (jamais `public."Users".role`, qui est un champ legacy mono-tenant sans
 * rapport avec les acces au sein d'un tenant).
 *
 * La matrice elle-meme (`PERMISSIONS`, `ROLE_PERMISSIONS`, `hasPermission`)
 * vit dans `./permission-matrix` (sans `server-only`) afin d'etre importable
 * telle quelle depuis des composants client (ex. `app/parametres/page.tsx`)
 * sans dupliquer la logique de role. Ce fichier reste le point d'entree
 * serveur : il re-exporte la matrice et ajoute les garde-fous qui exigent un
 * `TenantContext` resolu cote serveur (`requirePermission`, `checkPermission`).
 */
export { PERMISSIONS, ROLE_PERMISSIONS, hasPermission } from '@/src/lib/team/permission-matrix'
export type { Permission } from '@/src/lib/team/permission-matrix'

import { hasPermission, type Permission } from '@/src/lib/team/permission-matrix'

export class PermissionError extends Error {
  status: number
  code: string

  constructor(code: 'UNAUTHENTICATED' | 'FORBIDDEN' = 'FORBIDDEN') {
    // Message generique : ne jamais divulguer le role attendu/obtenu ni la
    // permission manquante dans le corps de la reponse cote client.
    super(code === 'UNAUTHENTICATED' ? 'Non authentifie' : 'Acces refuse')
    this.code = code
    this.status = code === 'UNAUTHENTICATED' ? 401 : 403
  }
}

/**
 * Helper serveur a utiliser dans chaque endpoint sensible.
 *
 * - Leve `PermissionError` (401/403) si le contexte tenant est absent, le
 *   membership n'est pas actif, ou si le role n'a pas la permission requise.
 * - Ne fait jamais confiance a un role/tenant_id envoye par le client : le
 *   contexte doit provenir de `getCurrentTenantContext()` (resolu cote
 *   serveur a partir de la session).
 */
export function requirePermission(context: TenantContext | null, permission: Permission): TenantContext {
  if (!context) {
    throw new PermissionError('UNAUTHENTICATED')
  }
  if (context.membership.status !== 'active') {
    throw new PermissionError('FORBIDDEN')
  }
  if (!hasPermission(context.role, permission)) {
    throw new PermissionError('FORBIDDEN')
  }
  return context
}

/** Variante qui ne leve pas d'exception, pour un usage conditionnel en UI/serveur. */
export function checkPermission(context: TenantContext | null, permission: Permission): boolean {
  if (!context || context.membership.status !== 'active') return false
  return hasPermission(context.role, permission)
}
