import 'server-only'

import { getSession, type AuthPayload } from '@/src/lib/auth-utils'
import { TABLES } from '@/src/lib/airtable'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'

export const TENANTS_TABLE = 'tenants'
export const TENANT_MEMBERS_TABLE = 'tenant_members'

export type TenantRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer'
export type TenantMemberStatus = 'invited' | 'active' | 'suspended' | 'revoked'

type RawRow = Record<string, unknown>

function normalizeTenantRole(value: unknown): TenantRole {
  const normalized = toText(value).trim().toLowerCase()
  if (normalized === 'owner' || normalized === 'admin' || normalized === 'manager' || normalized === 'member' || normalized === 'viewer') {
    return normalized
  }
  return 'member'
}

function normalizeTenantMemberStatus(value: unknown): TenantMemberStatus {
  const normalized = toText(value).trim().toLowerCase()
  if (normalized === 'invited' || normalized === 'active' || normalized === 'suspended' || normalized === 'revoked') {
    return normalized
  }
  return 'active'
}

export interface Tenant {
  id: string
  name: string
  slug: string
  ownerUserId: string | null
  legacyArtisanId: string | null
  status: string
  plan: string | null
  timezone: string
  locale: string
  createdAt: string | null
  updatedAt: string | null
}

export interface TenantMember {
  id: string
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
}

export interface TenantContext {
  tenantId: string
  legacyArtisanId: string | null
  tenant: Tenant
  membership: TenantMember
  role: TenantRole
  userId: string
  user: AuthPayload
}

export interface TenantIdentity {
  tenantId: string | null
  legacyArtisanId: string | null
}

interface ResolvedSessionUser {
  id: string
  email: string
  recordId: string | null
  artisanId: string | null
  source: 'session-id' | 'session-email' | 'session-record-id'
}

const tableExistsCache = new Map<string, boolean>()
const columnExistsCache = new Map<string, boolean>()

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = String((error as { message?: unknown }).message || '')
  const code = String((error as { code?: unknown }).code || '')
  return code === '42P01' || /relation .* does not exist/i.test(message) || /could not find the table/i.test(message)
}

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = String((error as { message?: unknown }).message || '')
  const code = String((error as { code?: unknown }).code || '')
  return code === '42703' || /column .* does not exist/i.test(message)
}

function mapTenant(row: RawRow): Tenant {
  return {
    id: toText(row.id),
    name: toText(row.name),
    slug: toText(row.slug),
    ownerUserId: row.owner_user_id ? toText(row.owner_user_id) : null,
    legacyArtisanId: row.legacy_artisan_id ? toText(row.legacy_artisan_id) : null,
    status: toText(row.status) || 'active',
    plan: row.plan ? toText(row.plan) : null,
    timezone: toText(row.timezone) || 'Europe/Paris',
    locale: toText(row.locale) || 'fr-FR',
    createdAt: row.created_at ? toText(row.created_at) : null,
    updatedAt: row.updated_at ? toText(row.updated_at) : null,
  }
}

function mapTenantMember(row: RawRow): TenantMember {
  return {
    id: toText(row.id),
    tenantId: toText(row.tenant_id),
    userId: toText(row.user_id),
    role: normalizeTenantRole(row.role),
    status: normalizeTenantMemberStatus(row.status),
    jobTitle: row.job_title ? toText(row.job_title) : null,
    invitedBy: row.invited_by ? toText(row.invited_by) : null,
    invitedAt: row.invited_at ? toText(row.invited_at) : null,
    joinedAt: row.joined_at ? toText(row.joined_at) : null,
    lastActiveAt: row.last_active_at ? toText(row.last_active_at) : null,
    createdAt: row.created_at ? toText(row.created_at) : null,
    updatedAt: row.updated_at ? toText(row.updated_at) : null,
  }
}

export async function tableExists(tableName: string): Promise<boolean> {
  if (tableExistsCache.has(tableName)) {
    return tableExistsCache.get(tableName) || false
  }

  const { error } = await getSupabaseAdmin()
    .from(tableName)
    .select('*', { count: 'exact', head: true })

  const exists = !error || !isMissingRelationError(error)
  tableExistsCache.set(tableName, exists)
  return exists
}

export async function tableHasColumn(tableName: string, columnName: string): Promise<boolean> {
  const cacheKey = `${tableName}:${columnName}`
  if (columnExistsCache.has(cacheKey)) {
    return columnExistsCache.get(cacheKey) || false
  }

  const { error } = await getSupabaseAdmin()
    .from(tableName)
    .select(columnName, { count: 'exact', head: true })

  const exists = !error || (!isMissingColumnError(error) && !isMissingRelationError(error))
  columnExistsCache.set(cacheKey, exists)
  return exists
}

export async function getTenantByLegacyArtisanId(artisanId: string): Promise<Tenant | null> {
  if (!artisanId || !(await tableExists(TENANTS_TABLE))) {
    return null
  }

  const { data, error } = await getSupabaseAdmin()
    .from(TENANTS_TABLE)
    .select('id, name, slug, owner_user_id, legacy_artisan_id, status, plan, timezone, locale, created_at, updated_at')
    .eq('legacy_artisan_id', artisanId)
    .limit(1)
    .maybeSingle()

  if (error) {
    if (!isMissingRelationError(error)) {
      console.error('[TENANT] Unable to load tenant from legacy artisan id:', error.message)
    }
    return null
  }

  return data ? mapTenant(data as RawRow) : null
}

async function getProjectTenantIdentity(projectId: string): Promise<TenantIdentity | null> {
  if (!projectId || !(await tableExists(TABLES.projects))) {
    return null
  }

  const supportsTenantId = await tableHasColumn(TABLES.projects, 'tenant_id')
  const supportsRecordId = await tableHasColumn(TABLES.projects, 'record_id')
  const columns = supportsTenantId ? 'id, tenant_id, artisan_id' : 'id, artisan_id'

  const direct = await getSupabaseAdmin()
    .from(TABLES.projects)
    .select(columns)
    .eq('id', projectId)
    .limit(1)
    .maybeSingle()

  let row = direct.data as RawRow | null
  let error = direct.error

  if (!row && !error && supportsRecordId) {
    const legacy = await getSupabaseAdmin()
      .from(TABLES.projects)
      .select(columns)
      .eq('record_id', projectId)
      .limit(1)
      .maybeSingle()

    row = legacy.data as RawRow | null
    error = legacy.error
  }

  if (error) {
    console.error('[TENANT] Unable to resolve project tenant identity:', error.message)
    return null
  }

  if (!row) {
    return null
  }

  const legacyArtisanId = toText(row.artisan_id) || null
  if (supportsTenantId && row.tenant_id) {
    return {
      tenantId: toText(row.tenant_id) || null,
      legacyArtisanId,
    }
  }

  if (!legacyArtisanId) {
    return { tenantId: null, legacyArtisanId: null }
  }

  const tenant = await getTenantByLegacyArtisanId(legacyArtisanId)
  return {
    tenantId: tenant?.id || null,
    legacyArtisanId,
  }
}

export async function resolveTenantIdentity(input: {
  tenantId?: string | null
  artisanId?: string | null
  projectId?: string | null
}): Promise<TenantIdentity | null> {
  if (input.tenantId) {
    return {
      tenantId: input.tenantId,
      legacyArtisanId: input.artisanId || null,
    }
  }

  if (input.projectId) {
    const fromProject = await getProjectTenantIdentity(input.projectId)
    if (fromProject?.tenantId || fromProject?.legacyArtisanId) {
      return fromProject
    }
  }

  if (input.artisanId) {
    const tenant = await getTenantByLegacyArtisanId(input.artisanId)
    return {
      tenantId: tenant?.id || null,
      legacyArtisanId: input.artisanId,
    }
  }

  return null
}

async function listActiveMembershipsForUser(userId: string): Promise<TenantMember[]> {
  if (!userId || !(await tableExists(TENANT_MEMBERS_TABLE))) {
    return []
  }

  const { data, error } = await getSupabaseAdmin()
    .from(TENANT_MEMBERS_TABLE)
    .select('id, tenant_id, user_id, role, status, job_title, invited_by, invited_at, joined_at, last_active_at, created_at, updated_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[TENANT] Unable to load tenant memberships:', error.message)
    return []
  }

  return ((data || []) as RawRow[]).map(mapTenantMember)
}

async function resolveSessionUser(session: AuthPayload): Promise<ResolvedSessionUser | null> {
  const supabase = getSupabaseAdmin()
  const normalizedEmail = String(session.email || '').trim().toLowerCase()

  if (session.id) {
    const byId = await supabase
      .from(TABLES.users)
      .select('id, email, record_id, artisan_id')
      .eq('id', session.id)
      .limit(1)
      .maybeSingle()

    if (!byId.error && byId.data) {
      return {
        id: toText(byId.data.id),
        email: toText(byId.data.email) || normalizedEmail,
        recordId: byId.data.record_id ? toText(byId.data.record_id) : null,
        artisanId: byId.data.artisan_id ? toText(byId.data.artisan_id) : null,
        source: 'session-id',
      }
    }
  }

  if (normalizedEmail) {
    const byEmail = await supabase
      .from(TABLES.users)
      .select('id, email, record_id, artisan_id')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle()

    if (!byEmail.error && byEmail.data) {
      return {
        id: toText(byEmail.data.id),
        email: toText(byEmail.data.email) || normalizedEmail,
        recordId: byEmail.data.record_id ? toText(byEmail.data.record_id) : null,
        artisanId: byEmail.data.artisan_id ? toText(byEmail.data.artisan_id) : null,
        source: 'session-email',
      }
    }
  }

  if (session.id && (await tableHasColumn(TABLES.users, 'record_id'))) {
    const byRecordId = await supabase
      .from(TABLES.users)
      .select('id, email, record_id, artisan_id')
      .eq('record_id', session.id)
      .limit(1)
      .maybeSingle()

    if (!byRecordId.error && byRecordId.data) {
      return {
        id: toText(byRecordId.data.id),
        email: toText(byRecordId.data.email) || normalizedEmail,
        recordId: byRecordId.data.record_id ? toText(byRecordId.data.record_id) : null,
        artisanId: byRecordId.data.artisan_id ? toText(byRecordId.data.artisan_id) : null,
        source: 'session-record-id',
      }
    }
  }

  return null
}

async function listTenantsByIds(tenantIds: string[]): Promise<Map<string, Tenant>> {
  const tenantMap = new Map<string, Tenant>()
  if (!tenantIds.length || !(await tableExists(TENANTS_TABLE))) {
    return tenantMap
  }

  const { data, error } = await getSupabaseAdmin()
    .from(TENANTS_TABLE)
    .select('id, name, slug, owner_user_id, legacy_artisan_id, status, plan, timezone, locale, created_at, updated_at')
    .in('id', tenantIds)

  if (error) {
    console.error('[TENANT] Unable to load tenants by ids:', error.message)
    return tenantMap
  }

  for (const row of ((data || []) as RawRow[]).map(mapTenant)) {
    tenantMap.set(row.id, row)
  }

  return tenantMap
}

function pickActiveMembership(params: {
  memberships: TenantMember[]
  tenantById: Map<string, Tenant>
  session: AuthPayload
  preferredTenantId?: string | null
}): TenantMember | null {
  const { memberships, tenantById, session, preferredTenantId } = params
  if (!memberships.length) return null

  if (preferredTenantId) {
    const explicit = memberships.find((membership) => membership.tenantId === preferredTenantId)
    if (explicit) return explicit
  }

  if (session.artisanId) {
    const matchingLegacy = memberships.find((membership) => {
      const tenant = tenantById.get(membership.tenantId)
      return tenant?.legacyArtisanId === session.artisanId
    })
    if (matchingLegacy) return matchingLegacy
  }

  const ownerOrAdmin = memberships.find((membership) => membership.role === 'owner' || membership.role === 'admin')
  if (ownerOrAdmin) return ownerOrAdmin

  return memberships[0]
}

export async function getCurrentTenantContext(options?: {
  preferredTenantId?: string | null
}): Promise<TenantContext | null> {
  const session = await getSession()
  if (!session) {
    console.warn('[TENANT][SESSION_MISSING] Missing authenticated session')
    return null
  }

  // Ne jamais bloquer ici sur l'absence de session.id : les anciens cookies
  // `kadria-auth` peuvent ne pas contenir de champ `id`. resolveSessionUser()
  // sait retomber sur l'email de session (puis sur record_id si session.id
  // existe). On ne refuse la session que si elle n'a NI id NI email
  // exploitable, ce qui est vérifié juste après par resolveSessionUser.
  if (!session.id && session.email) {
    console.warn('[TENANT][SESSION_ID_MISSING_EMAIL_FALLBACK] Session has no id, falling back to email resolution', {
      email: session.email,
      artisanId: session.artisanId || null,
    })
  } else if (!session.id && !session.email) {
    console.warn('[TENANT][SESSION_MISSING] Session has neither id nor email', {
      artisanId: session.artisanId || null,
    })
    return null
  }

  const resolvedUser = await resolveSessionUser(session)
  if (!resolvedUser) {
    console.warn('[TENANT][USER_RESOLUTION_FAILED] Unable to resolve application user for session', {
      sessionId: session.id || null,
      email: session.email || null,
      artisanId: session.artisanId || null,
    })
    return null
  }

  const memberships = await listActiveMembershipsForUser(resolvedUser.id)
  if (!memberships.length) {
    console.warn('[TENANT][MEMBERSHIP_NOT_FOUND] No active membership found for current session user', {
      sessionId: session.id || null,
      resolvedUserId: resolvedUser.id,
      source: resolvedUser.source,
      artisanId: resolvedUser.artisanId || session.artisanId || null,
    })
    return null
  }

  const tenantById = await listTenantsByIds(memberships.map((membership) => membership.tenantId))
  const membership = pickActiveMembership({
    memberships,
    tenantById,
    session,
    preferredTenantId: options?.preferredTenantId || null,
  })

  if (!membership) {
    console.warn('[TENANT][MEMBERSHIP_INACTIVE] Unable to select an active tenant membership', {
      userId: resolvedUser.id,
      artisanId: resolvedUser.artisanId || session.artisanId || null,
      memberships: memberships.length,
    })
    return null
  }

  const tenant = tenantById.get(membership.tenantId)
  if (!tenant) {
    console.warn('[TENANT][TENANT_NOT_FOUND] Active membership points to a missing tenant', {
      userId: resolvedUser.id,
      tenantId: membership.tenantId,
    })
    return null
  }

  return {
    tenantId: tenant.id,
    legacyArtisanId: tenant.legacyArtisanId,
    tenant,
    membership,
    role: membership.role,
    userId: resolvedUser.id,
    user: session,
  }
}

export async function attachTenantIdToPayload(
  tableName: string,
  payload: Record<string, unknown>,
  resolutionInput: {
    tenantId?: string | null
    artisanId?: string | null
    projectId?: string | null
  },
): Promise<Record<string, unknown>> {
  const nextPayload = { ...payload }

  if (!(await tableHasColumn(tableName, 'tenant_id'))) {
    delete nextPayload.tenant_id
    return nextPayload
  }

  const tenantIdentity = await resolveTenantIdentity(resolutionInput)
  if (tenantIdentity?.tenantId) {
    nextPayload.tenant_id = tenantIdentity.tenantId
  } else {
    delete nextPayload.tenant_id
  }

  return nextPayload
}
