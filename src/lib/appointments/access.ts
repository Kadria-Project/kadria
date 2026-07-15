import 'server-only'

import { TABLES } from '@/src/lib/airtable'
import { checkPermission } from '@/src/lib/team/access'
import { listTeamMembers } from '@/src/lib/team/service'
import type { TeamMember } from '@/src/lib/team/types'
import type { TenantContext } from '@/src/lib/tenant-context'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export function canReadPlanning(context: TenantContext | null) {
  return checkPermission(context, 'planning.read_team')
}

export function canManageTeamPlanning(context: TenantContext | null) {
  return checkPermission(context, 'planning.manage_team') || checkPermission(context, 'appointments.manage_team')
}

export function canAssignAppointments(context: TenantContext | null) {
  return checkPermission(context, 'appointments.assign') || canManageTeamPlanning(context)
}

export function canCreatePersonalAppointments(context: TenantContext | null) {
  if (!context || context.membership.status !== 'active') return false
  return context.role !== 'viewer'
}

export function canEditAppointment(context: TenantContext | null, assignedUserId: string | null) {
  if (!context || context.membership.status !== 'active') return false
  if (canManageTeamPlanning(context)) return true
  if (context.role === 'member') {
    return assignedUserId === context.userId
  }
  return false
}

export function canDeleteAppointment(context: TenantContext | null, assignedUserId: string | null) {
  return canEditAppointment(context, assignedUserId)
}

export function isAssignableAppointmentMember(member: Pick<TeamMember, 'status' | 'role'>) {
  return member.status === 'active' && member.role !== 'viewer'
}

export async function listAssignableAppointmentMembers(tenantId: string) {
  const members = await listTeamMembers(tenantId)
  return members.filter(isAssignableAppointmentMember)
}

export async function getAssignableAppointmentMemberMap(tenantId: string) {
  const members = await listAssignableAppointmentMembers(tenantId)
  return new Map(members.map((member) => [member.userId, member] as const))
}

export async function resolveProjectForAppointment(params: {
  projectId: string
  tenantContext: TenantContext
}) {
  const { data, error } = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, tenant_id, artisan_id, client_name, client_first_name, client_phone, site_address, city')
    .eq('id', params.projectId)
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!data) {
    return null
  }

  const record = data as Record<string, unknown>
  const projectTenantId = record.tenant_id ? String(record.tenant_id) : null
  const belongsToTenant = projectTenantId
    ? projectTenantId === params.tenantContext.tenantId
    : record.artisan_id === params.tenantContext.legacyArtisanId

  if (!belongsToTenant) {
    return null
  }

  return data
}

export async function findAppointmentConflict(input: {
  tenantId: string
  assignedUserId: string | null
  start: string
  end: string
  excludeAppointmentId?: string | null
}) {
  if (!input.assignedUserId) return null

  let query = supabaseAdmin
    .from('project_appointments')
    .select('id, start_time, end_time, title, project_id')
    .eq('tenant_id', input.tenantId)
    .eq('assigned_user_id', input.assignedUserId)
    .lt('start_time', input.end)
    .gt('end_time', input.start)
    .neq('status', 'cancelled')
    .limit(1)

  if (input.excludeAppointmentId) {
    query = query.neq('id', input.excludeAppointmentId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    throw error
  }

  if (!data) return null

  return {
    id: String(data.id || ''),
    start: String(data.start_time || ''),
    end: String(data.end_time || ''),
    title: String(data.title || ''),
    projectId: data.project_id ? String(data.project_id) : null,
  }
}

export async function logAppointmentActivity(input: {
  projectId?: string | null
  action: string
  description: string
}) {
  if (!input.projectId) return

  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: input.projectId,
    action: input.action,
    description: input.description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[APPOINTMENTS][ACTIVITY] Failed to write activity log:', error.message)
  }
}
