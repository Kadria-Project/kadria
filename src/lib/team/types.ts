export const TENANT_ROLES = ['owner', 'admin', 'manager', 'member', 'viewer'] as const
export type TenantRole = (typeof TENANT_ROLES)[number]

export const TENANT_MEMBER_STATUSES = ['active', 'suspended', 'revoked'] as const
export type TenantMemberStatus = (typeof TENANT_MEMBER_STATUSES)[number]

export const TENANT_INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'revoked'] as const
export type TenantInvitationStatus = (typeof TENANT_INVITATION_STATUSES)[number]

export interface TenantInvitation {
  id: string
  tenantId: string
  email: string
  firstName: string | null
  lastName: string | null
  role: TenantRole
  jobTitle: string | null
  status: TenantInvitationStatus
  invitedBy: string | null
  invitedByName: string | null
  expiresAt: string | null
  acceptedAt: string | null
  revokedAt: string | null
  lastSentAt: string | null
  sendCount: number
  createdAt: string | null
  updatedAt: string | null
}

export interface TeamMember {
  membershipId: string
  tenantId: string
  userId: string
  role: TenantRole
  status: TenantMemberStatus
  jobTitle: string | null
  invitedBy: string | null
  invitedAt: string | null
  joinedAt: string | null
  lastActiveAt: string | null
  createdAt: string | null
  updatedAt: string | null
  firstName: string
  lastName: string
  email: string
  professionalPhone: string
  companyName: string
}

export interface TeamPermissions {
  canManageMembers: boolean
  canInviteMembers: boolean
  canChangeMemberRole: boolean
  canSuspendMember: boolean
  canRemoveMember: boolean
  canManageBilling: boolean
}

export interface SeatUsage {
  used: number
  activeMembers: number
  pendingInvitations: number
  limit: number | null
  unlimited: boolean
  source: 'plan_limits' | 'fallback'
  reached: boolean
}

export const TEAM_ROLE_LABELS: Record<TenantRole, string> = {
  owner: 'Proprietaire du compte',
  admin: 'Administrateur',
  manager: 'Responsable',
  member: 'Collaborateur',
  viewer: 'Consultation uniquement',
}

export const TEAM_ROLE_DESCRIPTIONS: Record<Exclude<TenantRole, 'owner'>, string> = {
  admin: "Gere l'equipe, les dossiers et les reglages.",
  manager: "Suit l'activite et consulte l'ensemble des dossiers.",
  member: 'Travaille sur les dossiers et rendez-vous qui lui sont confies.',
  viewer: 'Peut consulter sans modifier.',
}

export const TEAM_JOB_TITLE_SUGGESTIONS = [
  'Dirigeant',
  'Secretaire',
  'Commercial',
  'Technicien',
  "Chef d'equipe",
  'Conducteur de travaux',
  'Comptable',
  'Sous-traitant',
  'Autre',
] as const
