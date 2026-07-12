// Pas de `import 'server-only'` ici : ce module est la matrice de permissions
// pure (aucun acces session/DB), volontairement isolee de `access.ts` pour
// pouvoir etre importee depuis des composants client (`app/parametres/**`).
// `access.ts` (server-only) re-exporte ces memes symboles pour l'usage
// serveur : NE PAS dupliquer la matrice ailleurs, ce fichier est l'unique
// source de verite consommee par les deux cotes (client + serveur).

import type { TenantRole } from '@/src/lib/team/types'

/**
 * Les permissions prefixees `projects.*` / `appointments.*` sont la source
 * de verite du RBAC multi-user sur les dossiers et le planning.
 * Les permissions `projects.*` sont desormais consommees par les routes API
 * et l'UI dossier/liste ; les permissions `appointments.*` restent reservees
 * au perimetre planning.
 */
export const PERMISSIONS = [
  // Compte personnel
  'account.update_self',
  'profile.update_self',
  'profile.read_team_contact',
  'vehicle.read_self',
  'vehicle.update_self',
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
  'automations.read',
  'automations.manage',
  // Integrations d'entreprise
  'integrations.read',
  'integrations.manage',
  // Abonnement et facturation
  'billing.read',
  'billing.manage',
  // Securite et donnees
  'tenant.transfer_ownership',
  'tenant.delete',
  // --- RBAC projets / planning multi-user ---
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
    'profile.update_self',
    'profile.read_team_contact',
    'vehicle.read_self',
    'vehicle.update_self',
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
    'automations.read',
    'automations.manage',
    'integrations.read',
    'integrations.manage',
    'billing.read',
    'billing.manage',
    'tenant.transfer_ownership',
    'tenant.delete',
    // Owner : acces complet projets/planning.
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
    'profile.update_self',
    'profile.read_team_contact',
    'vehicle.read_self',
    'vehicle.update_self',
    'company.read',
    'team.read',
    'team.invite',
    'team.manage_members',
    'planning.read_team',
    'planning.manage_team',
    'business_settings.read',
    'business_settings.update',
    'automations.read',
    'automations.manage',
    'integrations.read',
    'integrations.manage',
    'billing.read',
    // Projets/planning : admin opere sur tout le tenant.
    ...LOT4_PROJECT_PLANNING_PERMISSIONS_FOR_ADMIN_MANAGER,
  ],
  manager: [
    'account.update_self',
    'profile.update_self',
    'profile.read_team_contact',
    'vehicle.read_self',
    'vehicle.update_self',
    'company.read',
    'team.read',
    'planning.read_team',
    'planning.manage_team',
    'business_settings.read',
    'automations.read',
    'integrations.read',
    // Projets/planning : manager opere sur tout le tenant.
    ...LOT4_PROJECT_PLANNING_PERMISSIONS_FOR_ADMIN_MANAGER,
  ],
  member: [
    'account.update_self',
    'profile.update_self',
    'profile.read_team_contact',
    'vehicle.read_self',
    'vehicle.update_self',
    'company.read',
    'team.read',
    'planning.read_team',
    'business_settings.read',
    'integrations.read',
    // Projets : lecture des dossiers affectes uniquement.
    'projects.read_assigned',
  ],
  viewer: [
    'account.update_self',
    'profile.update_self',
    'profile.read_team_contact',
    'vehicle.read_self',
    'vehicle.update_self',
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
