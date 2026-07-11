import 'server-only'

import { createHash, randomBytes } from 'crypto'
import { Resend } from 'resend'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { getCurrentTenantContext, TENANT_MEMBERS_TABLE, TENANTS_TABLE, tableExists, tableHasColumn } from '@/src/lib/tenant-context'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'
import { getPlanForArtisan } from '@/src/lib/usage/quotas'
import { canChangeMemberRole, canInviteMembers, canRemoveMember, canSuspendMember, getTeamPermissions } from '@/src/lib/team/permissions'
import { hasPermission } from '@/src/lib/team/access'
import { TEAM_ROLE_LABELS, TENANT_ROLES, type SeatUsage, type TeamMember, type TenantInvitation, type TenantInvitationStatus, type TenantRole } from '@/src/lib/team/types'

const INVITATIONS_TABLE = 'tenant_invitations'
const TEAM_ACTIVITY_TABLE = 'tenant_activity_logs'
const DEFAULT_USERS_LIMIT: Record<string, number | null> = {
  essentiel: 1,
  performance: 3,
  entreprise: 10,
}

function toText(value: unknown) {
  return value === null || value === undefined ? '' : String(value)
}

function toNullableText(value: unknown) {
  const text = toText(value).trim()
  return text ? text : null
}

function toNullableDate(value: unknown) {
  return toNullableText(value)
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase()
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://kadria.fr'
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY')
  }
  return new Resend(apiKey)
}

function generateInvitationToken() {
  return randomBytes(32).toString('hex')
}

function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function isValidRole(role: string): role is TenantRole {
  return TENANT_ROLES.includes(role as TenantRole)
}

function mapInvitation(row: Record<string, unknown>, invitedByName?: string | null): TenantInvitation {
  return {
    id: toText(row.id),
    tenantId: toText(row.tenant_id),
    email: toText(row.email),
    firstName: toNullableText(row.first_name),
    lastName: toNullableText(row.last_name),
    role: (toText(row.role) || 'member') as TenantRole,
    jobTitle: toNullableText(row.job_title),
    status: (toText(row.status) || 'pending') as TenantInvitationStatus,
    invitedBy: toNullableText(row.invited_by),
    invitedByName: invitedByName || null,
    expiresAt: toNullableDate(row.expires_at),
    acceptedAt: toNullableDate(row.accepted_at),
    revokedAt: toNullableDate(row.revoked_at),
    lastSentAt: toNullableDate(row.last_sent_at),
    sendCount: toNumber(row.send_count, 1),
    createdAt: toNullableDate(row.created_at),
    updatedAt: toNullableDate(row.updated_at),
  }
}

function mapTeamMember(row: Record<string, unknown>): TeamMember {
  return {
    membershipId: toText(row.id),
    tenantId: toText(row.tenant_id),
    userId: toText(row.user_id),
    role: (toText(row.role) || 'member') as TenantRole,
    status: (toText(row.status) || 'active') as TeamMember['status'],
    jobTitle: toNullableText(row.job_title),
    invitedBy: toNullableText(row.invited_by),
    invitedAt: toNullableDate(row.invited_at),
    joinedAt: toNullableDate(row.joined_at),
    lastActiveAt: toNullableDate(row.last_active_at),
    createdAt: toNullableDate(row.created_at),
    updatedAt: toNullableDate(row.updated_at),
    firstName: toText(row.user_first_name),
    lastName: toText(row.user_last_name),
    email: toText(row.user_email),
    professionalPhone: toText(row.user_professional_phone),
    companyName: toText(row.user_company_name),
  }
}

async function loadUsersByIds(userIds: string[]) {
  if (!userIds.length) return new Map<string, Record<string, unknown>>()

  const { data, error } = await getSupabaseAdmin()
    .from('Users')
    .select('id,email,first_name,last_name,company_name,professional_phone')
    .in('id', userIds)

  if (error) {
    throw new Error(error.message)
  }

  const map = new Map<string, Record<string, unknown>>()
  for (const row of (data || []) as Record<string, unknown>[]) {
    map.set(toText(row.id), row)
  }
  return map
}

async function getPlanLimitsUsersLimit(plan: string) {
  const supabase = getSupabaseAdmin()

  for (const table of ['PlanLimits', 'plan_limits']) {
    if (!(await tableExists(table))) continue

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .in('plan', [plan, plan.toLowerCase(), plan === 'entreprise' ? 'agence' : plan])
      .limit(3)

    if (error || !Array.isArray(data) || data.length === 0) continue

    const row = data[0] as Record<string, unknown>
    const raw = row.users_limit
    if (String(raw || '').trim().toLowerCase() === 'unlimited') {
      return { limit: null, unlimited: true, source: 'plan_limits' as const }
    }
    const parsed = Number(raw)
    if (Number.isFinite(parsed) && parsed > 0) {
      return { limit: parsed, unlimited: false, source: 'plan_limits' as const }
    }
  }

  return {
    limit: DEFAULT_USERS_LIMIT[plan] ?? 1,
    unlimited: false,
    source: 'fallback' as const,
  }
}

export async function getSeatUsage(tenantId: string, legacyArtisanId: string | null): Promise<SeatUsage> {
  const supabase = getSupabaseAdmin()
  const plan = legacyArtisanId ? (await getPlanForArtisan(legacyArtisanId)).data || 'essentiel' : 'essentiel'
  const limitConfig = await getPlanLimitsUsersLimit(plan)

  const activeMembers = await supabase
    .from(TENANT_MEMBERS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  let pendingInvitations = 0
  if (await tableExists(INVITATIONS_TABLE)) {
    const pending = await supabase
      .from(INVITATIONS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
    pendingInvitations = pending.count || 0
  }

  const activeCount = activeMembers.count || 0
  const used = activeCount + pendingInvitations

  return {
    used,
    activeMembers: activeCount,
    pendingInvitations,
    limit: limitConfig.limit,
    unlimited: limitConfig.unlimited,
    source: limitConfig.source,
    reached: limitConfig.limit !== null ? used >= limitConfig.limit : false,
  }
}

export async function listTeamMembers(tenantId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from(TENANT_MEMBERS_TABLE)
    .select('id,tenant_id,user_id,role,status,job_title,invited_by,invited_at,joined_at,last_active_at,created_at,updated_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const memberships = (data || []) as Record<string, unknown>[]
  const userMap = await loadUsersByIds(memberships.map((membership) => toText(membership.user_id)))

  return memberships.map((membership) => {
    const user = userMap.get(toText(membership.user_id)) || {}
    return mapTeamMember({
      ...membership,
      user_first_name: user.first_name,
      user_last_name: user.last_name,
      user_email: user.email,
      user_professional_phone: user.professional_phone,
      user_company_name: user.company_name,
    })
  })
}

export async function listTenantInvitations(tenantId: string) {
  if (!(await tableExists(INVITATIONS_TABLE))) return []

  const { data, error } = await getSupabaseAdmin()
    .from(INVITATIONS_TABLE)
    .select('id,tenant_id,email,first_name,last_name,role,job_title,status,invited_by,expires_at,accepted_at,revoked_at,last_sent_at,send_count,created_at,updated_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data || []) as Record<string, unknown>[]
  const invitedByMap = await loadUsersByIds(rows.map((row) => toText(row.invited_by)).filter(Boolean))

  return rows.map((row) => {
    const invitedBy = invitedByMap.get(toText(row.invited_by))
    const invitedByName = invitedBy
      ? [toText(invitedBy.first_name), toText(invitedBy.last_name)].filter(Boolean).join(' ').trim() || toText(invitedBy.email)
      : null
    return mapInvitation(row, invitedByName)
  })
}

export async function logTeamActivity(input: {
  tenantId: string
  actorUserId?: string | null
  targetUserId?: string | null
  targetEmail?: string | null
  eventType: string
  metadata?: Record<string, unknown>
}) {
  if (!(await tableExists(TEAM_ACTIVITY_TABLE))) return

  const { error } = await getSupabaseAdmin()
    .from(TEAM_ACTIVITY_TABLE)
    .insert({
      tenant_id: input.tenantId,
      actor_user_id: input.actorUserId || null,
      target_user_id: input.targetUserId || null,
      target_email: input.targetEmail ? normalizeInvitationEmail(input.targetEmail) : null,
      event_type: input.eventType,
      metadata: input.metadata || {},
    })

  if (error) {
    console.error('[TEAM] Failed to log team activity:', error.message)
  }
}

async function sendInvitationEmail(input: {
  email: string
  companyName: string
  invitedByName: string
  firstName?: string | null
  role: TenantRole
  jobTitle?: string | null
  invitationUrl: string
  expiresAt: string
  customMessage?: string | null
}) {
  const resend = getResendClient()
  const roleLabel = TEAM_ROLE_LABELS[input.role]
  const greeting = input.firstName ? `Bonjour ${input.firstName},` : 'Bonjour,'
  const secondaryText = [
    `${input.companyName} vous invite à rejoindre son espace Kadria en tant que ${roleLabel}.`,
    input.jobTitle ? `Fonction : ${input.jobTitle}` : null,
    `Invite par : ${input.invitedByName}`,
    `Invitation valable jusqu'au ${new Date(input.expiresAt).toLocaleDateString('fr-FR')}.`,
    input.customMessage ? `Message : ${input.customMessage}` : null,
    "Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.",
  ].filter(Boolean).join('\n\n')

  const emailPayload = {
    preheader: `Invitation Kadria pour rejoindre ${input.companyName}.`,
    brand: 'Kadria',
    title: `Rejoignez ${input.companyName} sur Kadria`,
    intro: `${greeting}\n\n${input.companyName} vous invite à rejoindre son espace Kadria en tant que ${roleLabel}.`,
    ctaLabel: `Rejoindre ${input.companyName}`,
    ctaUrl: input.invitationUrl,
    secondaryText,
    footerNote: 'Kadria - Cockpit commercial pour artisans',
    accentColor: '#22c55e',
  }

  const { error } = await resend.emails.send({
    from: 'Kadria <contact@kadria.fr>',
    to: input.email,
    subject: `${input.companyName} vous invite à rejoindre Kadria`,
    text: renderBaseEmailText(emailPayload),
    html: renderBaseEmail(emailPayload),
  })

  if (error) {
    throw new Error(typeof error === 'string' ? error : JSON.stringify(error))
  }
}

export async function getTeamOverview() {
  const tenantContext = await getCurrentTenantContext()
  if (!tenantContext) {
    throw new Error('TENANT_CONTEXT_REQUIRED')
  }
  // Lecture d'equipe : tous les roles actifs (member/viewer inclus) ont
  // `team.read` dans la matrice centralisee (src/lib/team/access.ts) — seule
  // la gestion (invitation/edition) reste restreinte a owner/admin via
  // `getTeamPermissions()` ci-dessous. Les invitations en attente ne sont
  // renvoyees que si `canInviteMembers` est vrai (cf. plus bas), ce qui les
  // masque deja pour member/viewer.
  if (!hasPermission(tenantContext.role, 'team.read')) {
    console.warn('[TEAM][ROLE_FORBIDDEN] Session role cannot access team overview', {
      userId: tenantContext.userId,
      tenantId: tenantContext.tenantId,
      role: tenantContext.role,
    })
    throw new Error('FORBIDDEN')
  }

  const permissions = getTeamPermissions(tenantContext.role)
  const members = await listTeamMembers(tenantContext.tenantId)
  const invitations = permissions.canInviteMembers
    ? await listTenantInvitations(tenantContext.tenantId)
    : []

  return {
    tenant: tenantContext.tenant,
    membership: tenantContext.membership,
    permissions,
    members,
    invitations,
    seats: await getSeatUsage(tenantContext.tenantId, tenantContext.legacyArtisanId),
  }
}

export async function createTeamInvitation(input: {
  email: string
  firstName?: string | null
  lastName?: string | null
  role: string
  jobTitle?: string | null
  message?: string | null
}) {
  const tenantContext = await getCurrentTenantContext()
  if (!tenantContext) throw new Error('TENANT_CONTEXT_REQUIRED')
  if (!canInviteMembers(tenantContext.role)) throw new Error('FORBIDDEN')
  if (!isValidRole(input.role) || input.role === 'owner') throw new Error('INVALID_ROLE')
  if (!(await tableExists(INVITATIONS_TABLE))) throw new Error('INVITATIONS_TABLE_MISSING')

  const normalizedEmail = normalizeInvitationEmail(input.email)
  const seats = await getSeatUsage(tenantContext.tenantId, tenantContext.legacyArtisanId)
  if (seats.reached) throw new Error('SEAT_LIMIT_REACHED')

  const supabase = getSupabaseAdmin()
  const matchingUsers = await supabase.from('Users').select('id').ilike('email', normalizedEmail)
  if (matchingUsers.error) throw new Error(matchingUsers.error.message)

  const userIds = (matchingUsers.data || []).map((row) => row.id)
  if (userIds.length > 0) {
    const activeMembership = await supabase
      .from(TENANT_MEMBERS_TABLE)
      .select('id')
      .eq('tenant_id', tenantContext.tenantId)
      .eq('status', 'active')
      .in('user_id', userIds)
      .limit(1)
      .maybeSingle()

    if (activeMembership.error) throw new Error(activeMembership.error.message)
    if (activeMembership.data) throw new Error('ALREADY_MEMBER')
  }

  const duplicate = await supabase
    .from(INVITATIONS_TABLE)
    .select('id')
    .eq('tenant_id', tenantContext.tenantId)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (duplicate.error) throw new Error(duplicate.error.message)
  if (duplicate.data) throw new Error('DUPLICATE_PENDING_INVITATION')

  const token = generateInvitationToken()
  const tokenHash = hashInvitationToken(token)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from(INVITATIONS_TABLE)
    .insert({
      tenant_id: tenantContext.tenantId,
      email: normalizedEmail,
      first_name: input.firstName?.trim() || null,
      last_name: input.lastName?.trim() || null,
      role: input.role,
      job_title: input.jobTitle?.trim() || null,
      token_hash: tokenHash,
      status: 'pending',
      invited_by: tenantContext.userId,
      expires_at: expiresAt,
      last_sent_at: new Date().toISOString(),
      send_count: 1,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  const inviterName = [tenantContext.user.firstName, tenantContext.user.lastName].filter(Boolean).join(' ').trim() || tenantContext.user.email
  const invitationUrl = `${getBaseUrl()}/invitation/${token}`

  try {
    await sendInvitationEmail({
      email: normalizedEmail,
      companyName: tenantContext.tenant.name,
      invitedByName: inviterName,
      firstName: input.firstName || null,
      role: input.role,
      jobTitle: input.jobTitle || null,
      invitationUrl,
      expiresAt,
      customMessage: input.message || null,
    })
  } catch (emailError) {
    await logTeamActivity({
      tenantId: tenantContext.tenantId,
      actorUserId: tenantContext.userId,
      targetEmail: normalizedEmail,
      eventType: 'member.invited',
      metadata: { role: input.role, emailStatus: 'failed', error: emailError instanceof Error ? emailError.message : String(emailError) },
    })
    return {
      invitation: mapInvitation(data as Record<string, unknown>, inviterName),
      emailSent: false,
      invitationUrl,
      error: emailError instanceof Error ? emailError.message : 'EMAIL_SEND_FAILED',
    }
  }

  await logTeamActivity({
    tenantId: tenantContext.tenantId,
    actorUserId: tenantContext.userId,
    targetEmail: normalizedEmail,
    eventType: 'member.invited',
    metadata: { role: input.role },
  })

  return {
    invitation: mapInvitation(data as Record<string, unknown>, inviterName),
    emailSent: true,
    invitationUrl,
  }
}

export async function getInvitationByToken(token: string) {
  if (!(await tableExists(INVITATIONS_TABLE))) return null

  const { data, error } = await getSupabaseAdmin()
    .from(INVITATIONS_TABLE)
    .select('*')
    .eq('token_hash', hashInvitationToken(token))
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const tenant = await getSupabaseAdmin()
    .from(TENANTS_TABLE)
    .select('id,name,slug,legacy_artisan_id')
    .eq('id', data.tenant_id)
    .limit(1)
    .maybeSingle()

  if (tenant.error) throw new Error(tenant.error.message)

  const invitation = mapInvitation(data as Record<string, unknown>)
  return {
    invitation,
    tenant: tenant.data ? {
      id: toText(tenant.data.id),
      name: toText(tenant.data.name),
      slug: toText(tenant.data.slug),
      legacyArtisanId: toNullableText(tenant.data.legacy_artisan_id),
    } : null,
    expired: !!invitation.expiresAt && new Date(invitation.expiresAt).getTime() <= Date.now(),
  }
}

export async function resendInvitation(invitationId: string) {
  const tenantContext = await getCurrentTenantContext()
  if (!tenantContext) throw new Error('TENANT_CONTEXT_REQUIRED')
  if (!canInviteMembers(tenantContext.role)) throw new Error('FORBIDDEN')

  const current = await getSupabaseAdmin()
    .from(INVITATIONS_TABLE)
    .select('*')
    .eq('id', invitationId)
    .eq('tenant_id', tenantContext.tenantId)
    .limit(1)
    .maybeSingle()

  if (current.error) throw new Error(current.error.message)
  if (!current.data) throw new Error('INVITATION_NOT_FOUND')

  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await getSupabaseAdmin()
    .from(INVITATIONS_TABLE)
    .update({
      token_hash: hashInvitationToken(token),
      status: 'pending',
      revoked_at: null,
      accepted_at: null,
      expires_at: expiresAt,
      last_sent_at: new Date().toISOString(),
      send_count: toNumber(current.data.send_count, 1) + 1,
    })
    .eq('id', invitationId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  const inviterName = [tenantContext.user.firstName, tenantContext.user.lastName].filter(Boolean).join(' ').trim() || tenantContext.user.email
  const invitationUrl = `${getBaseUrl()}/invitation/${token}`

  await sendInvitationEmail({
    email: toText(data.email),
    companyName: tenantContext.tenant.name,
    invitedByName: inviterName,
    firstName: toNullableText(data.first_name),
    role: (toText(data.role) || 'member') as TenantRole,
    jobTitle: toNullableText(data.job_title),
    invitationUrl,
    expiresAt,
  })

  await logTeamActivity({
    tenantId: tenantContext.tenantId,
    actorUserId: tenantContext.userId,
    targetEmail: toText(data.email),
    eventType: 'member.invitation_resent',
    metadata: { invitationId },
  })

  return { invitation: mapInvitation(data as Record<string, unknown>, inviterName), invitationUrl }
}

export async function revokeInvitation(invitationId: string) {
  const tenantContext = await getCurrentTenantContext()
  if (!tenantContext) throw new Error('TENANT_CONTEXT_REQUIRED')
  if (!canInviteMembers(tenantContext.role)) throw new Error('FORBIDDEN')

  const { data, error } = await getSupabaseAdmin()
    .from(INVITATIONS_TABLE)
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('tenant_id', tenantContext.tenantId)
    .eq('status', 'pending')
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await logTeamActivity({
    tenantId: tenantContext.tenantId,
    actorUserId: tenantContext.userId,
    targetEmail: toText(data.email),
    eventType: 'member.invitation_revoked',
    metadata: { invitationId },
  })

  return mapInvitation(data as Record<string, unknown>)
}

export async function createInvitedAccount(input: {
  token: string
  email: string
  firstName?: string | null
  lastName?: string | null
}) {
  const invitationState = await getInvitationByToken(input.token)
  if (!invitationState?.tenant || !invitationState.invitation) throw new Error('INVITATION_NOT_FOUND')
  if (invitationState.expired || invitationState.invitation.status !== 'pending') throw new Error('INVITATION_NOT_AVAILABLE')

  const normalizedEmail = normalizeInvitationEmail(input.email)
  if (normalizedEmail !== invitationState.invitation.email) throw new Error('INVITATION_EMAIL_MISMATCH')

  const supabase = getSupabaseAdmin()
  const existingUser = await supabase
    .from('Users')
    .select('id,email')
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle()

  if (existingUser.error) throw new Error(existingUser.error.message)
  if (existingUser.data) {
    return { alreadyExists: true }
  }

  const authUser = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    user_metadata: {
      first_name: input.firstName || invitationState.invitation.firstName || '',
      last_name: input.lastName || invitationState.invitation.lastName || '',
      invited_tenant_id: invitationState.tenant.id,
    },
  })

  if (authUser.error || !authUser.data.user) {
    throw new Error(authUser.error?.message || 'AUTH_USER_CREATE_FAILED')
  }

  const { error: insertError } = await supabase
    .from('Users')
    .insert({
      id: authUser.data.user.id,
      artisan_id: invitationState.tenant.legacyArtisanId || '',
      company_name: invitationState.tenant.name,
      email: normalizedEmail,
      first_name: input.firstName || invitationState.invitation.firstName || '',
      last_name: input.lastName || invitationState.invitation.lastName || '',
      role: 'User',
      plan: 'Performance',
      statut: 'actif',
      billing_status: 'active',
      active: true,
    })

  if (insertError) {
    throw new Error(insertError.message)
  }

  return { alreadyExists: false }
}

export async function sendInvitationMagicLink(token: string) {
  const invitationState = await getInvitationByToken(token)
  if (!invitationState?.tenant || !invitationState.invitation) throw new Error('INVITATION_NOT_FOUND')
  if (invitationState.expired || invitationState.invitation.status !== 'pending') throw new Error('INVITATION_NOT_AVAILABLE')

  const { sendPlatformMagicLinkEmail } = await import('@/src/lib/auth-utils')
  await sendPlatformMagicLinkEmail({
    email: invitationState.invitation.email,
    companyName: invitationState.tenant.name,
    firstName: invitationState.invitation.firstName,
    redirectTo: `/invitation/${token}`,
  })

  return { email: invitationState.invitation.email }
}

export async function acceptInvitation(token: string, sessionUserId: string, sessionEmail: string) {
  const invitationState = await getInvitationByToken(token)
  if (!invitationState?.tenant || !invitationState.invitation) throw new Error('INVITATION_NOT_FOUND')
  if (invitationState.expired) throw new Error('INVITATION_EXPIRED')
  if (invitationState.invitation.status !== 'pending') throw new Error('INVITATION_NOT_PENDING')
  if (normalizeInvitationEmail(sessionEmail) !== invitationState.invitation.email) throw new Error('INVITATION_EMAIL_MISMATCH')

  const supabase = getSupabaseAdmin()
  const seats = await getSeatUsage(invitationState.tenant.id, invitationState.tenant.legacyArtisanId)
  if (seats.reached) throw new Error('SEAT_LIMIT_REACHED')

  const existingMembership = await supabase
    .from(TENANT_MEMBERS_TABLE)
    .select('id,status')
    .eq('tenant_id', invitationState.tenant.id)
    .eq('user_id', sessionUserId)
    .limit(1)
    .maybeSingle()

  if (existingMembership.error) throw new Error(existingMembership.error.message)
  if (existingMembership.data?.status === 'active') {
    await supabase
      .from(INVITATIONS_TABLE)
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitationState.invitation.id)
    return { alreadyMember: true, tenantId: invitationState.tenant.id }
  }

  const membershipMutation = existingMembership.data
    ? await supabase
        .from(TENANT_MEMBERS_TABLE)
        .update({
          role: invitationState.invitation.role,
          status: 'active',
          job_title: invitationState.invitation.jobTitle,
          joined_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        })
        .eq('id', existingMembership.data.id)
        .select('id')
        .single()
    : await supabase
        .from(TENANT_MEMBERS_TABLE)
        .insert({
          tenant_id: invitationState.tenant.id,
          user_id: sessionUserId,
          role: invitationState.invitation.role,
          status: 'active',
          job_title: invitationState.invitation.jobTitle,
          invited_by: invitationState.invitation.invitedBy,
          invited_at: invitationState.invitation.createdAt || new Date().toISOString(),
          joined_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        })
        .select('id')
        .single()

  if (membershipMutation.error) throw new Error(membershipMutation.error.message)

  const invitationUpdate = await supabase
    .from(INVITATIONS_TABLE)
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitationState.invitation.id)
    .eq('status', 'pending')

  if (invitationUpdate.error) throw new Error(invitationUpdate.error.message)

  if (await tableHasColumn('Users', 'active_tenant_id')) {
    await supabase.from('Users').update({ active_tenant_id: invitationState.tenant.id }).eq('id', sessionUserId)
  }

  await logTeamActivity({
    tenantId: invitationState.tenant.id,
    actorUserId: sessionUserId,
    targetUserId: sessionUserId,
    targetEmail: sessionEmail,
    eventType: 'member.joined',
    metadata: { invitationId: invitationState.invitation.id, role: invitationState.invitation.role },
  })

  return { alreadyMember: false, tenantId: invitationState.tenant.id }
}

export async function updateTeamMember(membershipId: string, input: { role?: string; jobTitle?: string | null }) {
  const tenantContext = await getCurrentTenantContext()
  if (!tenantContext) throw new Error('TENANT_CONTEXT_REQUIRED')

  const current = await getSupabaseAdmin()
    .from(TENANT_MEMBERS_TABLE)
    .select('id,tenant_id,user_id,role,status,job_title')
    .eq('id', membershipId)
    .eq('tenant_id', tenantContext.tenantId)
    .limit(1)
    .maybeSingle()

  if (current.error) throw new Error(current.error.message)
  if (!current.data) throw new Error('MEMBER_NOT_FOUND')

  const currentRole = (toText(current.data.role) || 'member') as TenantRole
  const nextRole = input.role ? (input.role as TenantRole) : currentRole

  if (input.role && (!isValidRole(input.role) || !canChangeMemberRole(tenantContext.role, currentRole, nextRole))) {
    throw new Error('FORBIDDEN')
  }

  const { data, error } = await getSupabaseAdmin()
    .from(TENANT_MEMBERS_TABLE)
    .update({
      ...(input.role ? { role: input.role } : {}),
      ...(input.jobTitle !== undefined ? { job_title: input.jobTitle?.trim() || null } : {}),
    })
    .eq('id', membershipId)
    .eq('tenant_id', tenantContext.tenantId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  if (input.role && input.role !== currentRole) {
    await logTeamActivity({
      tenantId: tenantContext.tenantId,
      actorUserId: tenantContext.userId,
      targetUserId: toText(data.user_id),
      eventType: 'member.role_changed',
      metadata: { previousRole: currentRole, nextRole: input.role },
    })
  }

  return data
}

export async function setTeamMemberStatus(membershipId: string, nextStatus: 'suspended' | 'active' | 'revoked') {
  const tenantContext = await getCurrentTenantContext()
  if (!tenantContext) throw new Error('TENANT_CONTEXT_REQUIRED')

  const current = await getSupabaseAdmin()
    .from(TENANT_MEMBERS_TABLE)
    .select('id,tenant_id,user_id,role,status')
    .eq('id', membershipId)
    .eq('tenant_id', tenantContext.tenantId)
    .limit(1)
    .maybeSingle()

  if (current.error) throw new Error(current.error.message)
  if (!current.data) throw new Error('MEMBER_NOT_FOUND')

  const targetRole = (toText(current.data.role) || 'member') as TenantRole
  if (nextStatus === 'suspended' && !canSuspendMember(tenantContext.role, targetRole)) throw new Error('FORBIDDEN')
  if (nextStatus === 'revoked' && !canRemoveMember(tenantContext.role, targetRole)) throw new Error('FORBIDDEN')
  if (nextStatus === 'active' && !canSuspendMember(tenantContext.role, targetRole)) throw new Error('FORBIDDEN')

  const { data, error } = await getSupabaseAdmin()
    .from(TENANT_MEMBERS_TABLE)
    .update({
      status: nextStatus,
      ...(nextStatus === 'active' ? { last_active_at: new Date().toISOString() } : {}),
    })
    .eq('id', membershipId)
    .eq('tenant_id', tenantContext.tenantId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  const eventType =
    nextStatus === 'suspended'
      ? 'member.suspended'
      : nextStatus === 'revoked'
        ? 'member.revoked'
        : 'member.reactivated'

  await logTeamActivity({
    tenantId: tenantContext.tenantId,
    actorUserId: tenantContext.userId,
    targetUserId: toText(data.user_id),
    eventType,
    metadata: { membershipId },
  })

  return data
}
