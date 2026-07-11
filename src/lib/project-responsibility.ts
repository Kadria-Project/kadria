import 'server-only'

import { TABLES } from '@/src/lib/airtable'
import { type TeamMember, TEAM_ROLE_LABELS } from '@/src/lib/team/types'
import { listTeamMembers } from '@/src/lib/team/service'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { tableExists, tableHasColumn } from '@/src/lib/tenant-context'

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

export async function listAssignableProjectResponsibles(tenantId: string): Promise<ProjectResponsibleSummary[]> {
  const members = await listTeamMembers(tenantId)
  return members
    .filter(canReceiveProjectResponsibility)
    .map(mapTeamMemberToProjectResponsible)
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
    throw error
  }

  return new Set(
    (data || [])
      .map((row) => (typeof row.project_id === 'string' ? row.project_id : null))
      .filter(Boolean) as string[],
  )
}
