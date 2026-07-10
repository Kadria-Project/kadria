import type { TeamMember, TeamPermissions, TenantRole } from '@/src/lib/team/types'

const ROLE_RANK: Record<TenantRole, number> = {
  viewer: 0,
  member: 1,
  manager: 2,
  admin: 3,
  owner: 4,
}

export function canManageMembers(role: TenantRole) {
  return role === 'owner' || role === 'admin'
}

export function canInviteMembers(role: TenantRole) {
  return role === 'owner' || role === 'admin'
}

export function canManageBilling(role: TenantRole) {
  return role === 'owner'
}

export function getTeamPermissions(role: TenantRole): TeamPermissions {
  return {
    canManageMembers: canManageMembers(role),
    canInviteMembers: canInviteMembers(role),
    canChangeMemberRole: canManageMembers(role),
    canSuspendMember: canManageMembers(role),
    canRemoveMember: canManageMembers(role),
    canManageBilling: canManageBilling(role),
  }
}

export function canChangeMemberRole(actorRole: TenantRole, targetRole: TenantRole, nextRole: TenantRole) {
  if (nextRole === 'owner') return actorRole === 'owner'
  if (actorRole === 'owner') return true
  if (actorRole !== 'admin') return false
  return ROLE_RANK[targetRole] < ROLE_RANK.admin
}

export function canSuspendMember(actorRole: TenantRole, targetRole: TenantRole) {
  if (actorRole === 'owner') return targetRole !== 'owner'
  if (actorRole === 'admin') return ROLE_RANK[targetRole] < ROLE_RANK.admin
  return false
}

export function canRemoveMember(actorRole: TenantRole, targetRole: TenantRole) {
  return canSuspendMember(actorRole, targetRole)
}

export function canEditTargetMember(actorRole: TenantRole, target: TeamMember) {
  if (actorRole === 'owner') return target.role !== 'owner' || target.status !== 'active'
  if (actorRole === 'admin') return ['manager', 'member', 'viewer'].includes(target.role)
  return false
}
