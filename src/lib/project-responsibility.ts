import 'server-only'

import { TABLES } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { type TeamMember, TEAM_ROLE_LABELS } from '@/src/lib/team/types'
import { checkPermission, PermissionError, requirePermission, type Permission } from '@/src/lib/team/access'
import { listTeamMembers } from '@/src/lib/team/service'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext, tableExists, tableHasColumn, type TenantContext } from '@/src/lib/tenant-context'

interface StructuredSupabaseErrorLike {
  code?: unknown
  message?: unknown
  details?: unknown
  hint?: unknown
}

export class ProjectAccessError extends Error {
  code: string | null
  details: string | null
  hint: string | null
  projectId: string | null
  context: string

  constructor(params: {
    message: string
    code?: string | null
    details?: string | null
    hint?: string | null
    projectId?: string | null
    context: string
  }) {
    super(params.message)
    this.name = 'ProjectAccessError'
    this.code = params.code || null
    this.details = params.details || null
    this.hint = params.hint || null
    this.projectId = params.projectId || null
    this.context = params.context
  }
}

export interface ProjectResponsibleSummary {
  userId: string
  firstName: string
  lastName: string
  email: string
  role: string
  roleLabel: string
  jobTitle: string | null
  status: string
  displayName: string
  initials: string
}

export interface AuthorizedProjectAccessResult<TRecord extends Record<string, unknown> = Record<string, unknown>> {
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>
  tenantContext: TenantContext | null
  project: TRecord
  projectId: string
  canReadAllProjects: boolean
  canReadAssignedProjects: boolean
}

const PROJECT_ACCESS_BASE_COLUMNS = [
  'id',
  'record_id',
  'tenant_id',
  'artisan_id',
  'responsible_user_id',
] as const

function toProjectAccessError(error: unknown, context: string, projectId?: string) {
  const supabaseError = error as StructuredSupabaseErrorLike
  const message =
    typeof supabaseError?.message === 'string' && supabaseError.message.trim()
      ? supabaseError.message
      : 'Project access query failed'

  return new ProjectAccessError({
    message,
    code: typeof supabaseError?.code === 'string' ? supabaseError.code : null,
    details: typeof supabaseError?.details === 'string' ? supabaseError.details : null,
    hint: typeof supabaseError?.hint === 'string' ? supabaseError.hint : null,
    projectId: projectId || null,
    context,
  })
}

function getDisplayName(member: Pick<TeamMember, 'firstName' | 'lastName' | 'email'>) {
  return [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.email || 'Collaborateur'
}

function getInitials(member: Pick<TeamMember, 'firstName' | 'lastName' | 'email'>) {
  const fullName = [member.firstName, member.lastName].filter(Boolean)
  if (fullName.length) {
    return fullName.map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  }
  return member.email.slice(0, 2).toUpperCase() || '?'
}

export function mapTeamMemberToProjectResponsible(member: TeamMember): ProjectResponsibleSummary {
  return {
    userId: member.userId,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    role: member.role,
    roleLabel: TEAM_ROLE_LABELS[member.role] || member.role,
    jobTitle: member.jobTitle,
    status: member.status,
    displayName: getDisplayName(member),
    initials: getInitials(member),
  }
}

export function canReceiveProjectResponsibility(member: Pick<TeamMember, 'status' | 'role'>) {
  if (member.status !== 'active') return false
  return member.role !== 'viewer'
}

function ensureProjectSelect(select: string) {
  const trimmed = select.trim()
  if (trimmed === '*') return trimmed

  const columns = new Set(
    trimmed
      .split(',')
      .map((column) => column.trim())
      .filter(Boolean),
  )

  for (const column of PROJECT_ACCESS_BASE_COLUMNS) {
    columns.add(column)
  }

  return Array.from(columns).join(', ')
}

async function loadProjectRecord(select: string, projectId: string) {
  const normalizedSelect = ensureProjectSelect(select)

  const direct = await supabaseAdmin
    .from(TABLES.projects)
    .select(normalizedSelect)
    .eq('id', projectId)
    .limit(1)
    .maybeSingle()

  if (direct.error) throw toProjectAccessError(direct.error, 'projects.select.direct', projectId)
  if (direct.data) return direct.data as unknown as Record<string, unknown>

  const legacy = await supabaseAdmin
    .from(TABLES.projects)
    .select(normalizedSelect)
    .eq('record_id', projectId)
    .limit(1)
    .maybeSingle()

  if (legacy.error) throw toProjectAccessError(legacy.error, 'projects.select.record_id', projectId)
  return (legacy.data as unknown as Record<string, unknown> | null) || null
}

function projectBelongsToTenant(record: Record<string, unknown>, tenantContext: TenantContext | null, artisanId: string) {
  if (tenantContext?.tenantId) {
    const recordTenantId = typeof record.tenant_id === 'string' ? record.tenant_id : null
    if (recordTenantId) {
      return recordTenantId === tenantContext.tenantId
    }
  }

  return String(record.artisan_id || '') === artisanId
}

export async function authorizeProjectAccess<TRecord extends Record<string, unknown> = Record<string, unknown>>(params: {
  projectId: string
  select?: string
  requiredPermission?: Permission
  allowAppointmentAccess?: boolean
}): Promise<AuthorizedProjectAccessResult<TRecord> | null> {
  const session = await getSession()
  if (!session) {
    throw new PermissionError('UNAUTHENTICATED')
  }

  const tenantContext = await getCurrentTenantContext()
  if (tenantContext && params.requiredPermission) {
    requirePermission(tenantContext, params.requiredPermission)
  }

  const project = await loadProjectRecord(params.select || '*', params.projectId)
  if (!project) return null

  if (!projectBelongsToTenant(project, tenantContext, session.artisanId)) {
    return null
  }

  const canReadAllProjects = checkPermission(tenantContext, 'projects.read_all')
  const canReadAssignedProjects = checkPermission(tenantContext, 'projects.read_assigned')

  if (tenantContext?.tenantId && !canReadAllProjects) {
    if (!canReadAssignedProjects) {
      return null
    }

    const responsibleUserId = typeof project.responsible_user_id === 'string' ? project.responsible_user_id : null
    if (responsibleUserId !== tenantContext.userId) {
      if (!params.allowAppointmentAccess) {
        return null
      }

      const appointmentProjectIds = await getAssignedAppointmentProjectIds(tenantContext.tenantId, tenantContext.userId)
      if (!appointmentProjectIds.has(String(project.id))) {
        return null
      }
    }
  }

  return {
    session,
    tenantContext,
    project: project as TRecord,
    projectId: String(project.id || ''),
    canReadAllProjects,
    canReadAssignedProjects,
  }
}

export async function listAssignableProjectResponsibles(tenantId: string): Promise<ProjectResponsibleSummary[]> {
  const members = await listTeamMembers(tenantId)
  return members
    .filter(canReceiveProjectResponsibility)
    .map(mapTeamMemberToProjectResponsible)
}

export async function resolveDefaultProjectResponsible(tenantId: string, creatorUserId?: string | null) {
  const assignables = await listAssignableProjectResponsibles(tenantId)
  if (creatorUserId) {
    const creator = assignables.find((member) => member.userId === creatorUserId)
    if (creator) return creator
  }

  return (
    assignables.find((member) => member.role === 'owner')
    || assignables.find((member) => member.role === 'admin')
    || assignables[0]
    || null
  )
}

export async function listProjectResponsiblesByTenant(tenantId: string): Promise<Map<string, ProjectResponsibleSummary>> {
  const members = await listTeamMembers(tenantId)
  return new Map(
    members.map((member) => [member.userId, mapTeamMemberToProjectResponsible(member)] as const),
  )
}

export async function projectResponsibilityColumnExists() {
  return tableHasColumn(TABLES.projects, 'responsible_user_id')
}

export async function getAssignedAppointmentProjectIds(tenantId: string, userId: string): Promise<Set<string>> {
  if (!(await tableExists('project_appointments'))) {
    return new Set()
  }

  const { data, error } = await supabaseAdmin
    .from('project_appointments')
    .select('project_id')
    .eq('tenant_id', tenantId)
    .eq('assigned_user_id', userId)

  if (error) {
    throw toProjectAccessError(error, 'project_appointments.select.assigned_project_ids')
  }

  return new Set(
    (data || [])
      .map((row) => (typeof row.project_id === 'string' ? row.project_id : null))
      .filter(Boolean) as string[],
  )
}
