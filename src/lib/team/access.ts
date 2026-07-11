import 'server-only'

import type { TenantContext } from '@/src/lib/tenant-context'
import type { TenantRole } from '@/src/lib/team/types'

/**
 * Couche centralisee de permissions par role de tenant.
 *
 * Source de verite des droits : `tenant_members.role` + `tenant_members.status`
 * (jamais `public."Users".role`, qui est un champ legacy mono-tenant sans
 * rapport avec les acces au sein d'un tenant).
 *
 * Les permissions prefixees `projects.*` / `appointments.*` sont preparees
 * pour le Lot 4 (planning/projets par responsable) : elles sont definies ici
 * et attribuees par role, mais AUCUNE route, composant ou colonne de base ne
 * les consomme encore dans ce lot.
 */
export const PERMISSIONS = [
  // Compte personnel
  'account.update_self',
  // Entreprise (identite legale, SIRET, TVA, adresse legale...)
  'company.read',
  'company.update',
  // Equipe et acces
  'team.read',
  'team.invite',
  'team.manage_members',
  'team.manage_admins',
  // Planning d'equipe
  'planning.read_team',
  'planning.manage_team',
  // Metier et activite (catalogue, prestations, automatisations)
  'business_settings.read',
  'business_settings.update',
  // Integrations d'entreprise
  'integrations.read',
  'integrations.manage',
  // Abonnement et facturation
  'billing.read',
  'billing.manage',
  // Securite et donnees
  'tenant.transfer_ownership',
  'tenant.delete',
  // --- Prepare pour le Lot 4 (planning/projets par responsable) ---
  // Non consomme dans ce lot : aucune route/UI/colonne ne s'appuie dessus.
  'projects.read_all',
  'projects.read_assigned',
  'projects.assign',
  'projects.reassign',
  'projects.update',
  'projects.manage_pipeline',
  'appointments.assign',
  'appointments.manage_team',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const LOT4_PROJECT_PLANNING_PERMISSIONS_FOR_ADMIN_MANAGER: Permission[] = [
  'projects.read_all',
  'projects.assign',
  'projects.reassign',
  'projects.update',
  'projects.manage_pipeline',
  'appointments.assign',
  'appointments.manage_team',
]

export const ROLE_PERMISSIONS: Record<TenantRole, readonly Permission[]> = {
  owner: [
    'account.update_self',
    'company.read',
    'company.update',
    'team.read',
    'team.invite',
    'team.manage_members',
    'team.manage_admins',
    'planning.read_team',
    'planning.manage_team',
    'business_settings.read',
    'business_settings.update',
    'integrations.read',
    'integrations.manage',
    'billing.read',
    'billing.manage',
    'tenant.transfer_ownership',
    'tenant.delete',
    // Lot 4 : owner recoit toutes les permissions projet/planning.
    'projects.read_all',
    'projects.read_assigned',
    'projects.assign',
    'projects.reassign',
    'projects.update',
    'projects.manage_pipeline',
    'appointments.assign',
    'appointments.manage_team',
  ],
  admin: [
    'account.update_self',
    'company.read',
    'team.read',
    'team.invite',
    'team.manage_members',
    'planning.read_team',
    'planning.manage_team',
    'business_settings.read',
    'business_settings.update',
    'integrations.read',
    'integrations.manage',
    'billing.read',
    // Lot 4 (prepare, non consomme) :
    ...LOT4_PROJECT_PLANNING_PERMISSIONS_FOR_ADMIN_MANAGER,
  ],
  manager: [
    'account.update_self',
    'company.read',
    'team.read',
    'planning.read_team',
    'planning.manage_team',
    'business_settings.read',
    'integrations.read',
    // Lot 4 (prepare, non consomme) :
    ...LOT4_PROJECT_PLANNING_PERMISSIONS_FOR_ADMIN_MANAGER,
  ],
  member: [
    'account.update_self',
    'company.read',
    'team.read',
    'planning.read_team',
    'business_settings.read',
    'integrations.read',
    // Lot 4 (prepare, non consomme) : lecture des dossiers affectes uniquement.
    'projects.read_assigned',
  ],
  viewer: [
    'account.update_self',
    'company.read',
    'team.read',
    'planning.read_team',
    'business_settings.read',
    'integrations.read',
  ],
}

export function hasPermission(role: TenantRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

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
