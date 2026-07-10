import {
  mapSupabaseArtisanConfig,
  mapSupabaseDevis,
  mapSupabaseProjectSummary,
  mapSupabaseUserLookup,
  toSupabaseDevisInsert,
  toSupabaseDevisUpdate,
  type SupabaseDevis,
} from '@/src/lib/supabase/mapping'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { attachTenantIdToPayload } from '@/src/lib/tenant-context'

export const TABLES = {
  projects: 'Projects',
  users: 'Users',
  artisanConfig: 'Artisan_config',
  activity: 'Activity',
  devis: process.env.AIRTABLE_DEVIS_TABLE || 'Devis',
  emailLogs: process.env.AIRTABLE_EMAIL_LOGS_TABLE || 'Email_logs',
} as const;

export async function getArtisanByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const { data, error } = await supabaseAdmin
    .from(TABLES.users)
    .select('*')
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const user = mapSupabaseUserLookup(data)
  return {
    ...user,
    email: user.email || email,
  }
}

export interface EventRecord {
  id: string
  title: string
  date: string
  type: string
  projectId: string
  artisanId: string
  status: string
  notes: string
}

function mapEventRow(row: Record<string, unknown>): EventRecord {
  return {
    id: String(row.id || ''),
    title: String(row.title || ''),
    date: String(row.event_date || ''),
    type: String(row.type || ''),
    projectId: String(row.project_id || ''),
    artisanId: String(row.artisan_id || ''),
    status: String(row.status || ''),
    notes: String(row.notes || ''),
  }
}

export async function getEvents(artisanId: string) {
  const { data, error } = await supabaseAdmin
    .from('Events')
    .select('*')
    .eq('artisan_id', artisanId)
    .order('event_date', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []).map(mapEventRow)
}

export async function getEventById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('Events')
    .select('*')
    .eq('id', id)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) return null
  return mapEventRow(data)
}

export async function createEvent(data: {
  title: string
  date: string
  type: string
  projectId?: string
  artisanId: string
  notes?: string
}) {
  const { data: row, error } = await supabaseAdmin
    .from('Events')
    .insert({
      title: data.title,
      event_date: data.date,
      type: data.type,
      project_id: data.projectId || null,
      artisan_id: data.artisanId,
      status: 'Prévu',
      notes: data.notes || '',
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapEventRow(row)
}

export async function updateEvent(id: string, fields: Record<string, unknown>) {
  const row: Record<string, unknown> = {}
  if (fields.title !== undefined || fields.Title !== undefined) row.title = fields.title ?? fields.Title
  if (fields.date !== undefined || fields.Date !== undefined) row.event_date = fields.date ?? fields.Date
  if (fields.type !== undefined || fields.Type !== undefined) row.type = fields.type ?? fields.Type
  if (fields.projectId !== undefined || fields.ProjectId !== undefined) row.project_id = fields.projectId ?? fields.ProjectId
  if (fields.status !== undefined || fields.Status !== undefined) row.status = fields.status ?? fields.Status
  if (fields.notes !== undefined || fields.Notes !== undefined) row.notes = fields.notes ?? fields.Notes

  const { data, error } = await supabaseAdmin
    .from('Events')
    .update(row)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapEventRow(data) : null
}

export async function deleteEvent(id: string) {
  const { error } = await supabaseAdmin.from('Events').delete().eq('id', id)

  if (error) {
    throw error
  }

  return { success: true }
}

export async function getUserByArtisanIdentifier(artisanId: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLES.users)
    .select('*')
    .eq('artisan_id', artisanId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) return null

  return mapSupabaseUserLookup(data)
}

export async function getArtisanConfig(artisanId: string) {
  if (!artisanId) return null

  const { data, error } = await supabaseAdmin
    .from(TABLES.artisanConfig)
    .select('*')
    .eq('artisan_id', artisanId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) return null

  return mapSupabaseArtisanConfig(data)
}

export async function updateArtisanConfig(
  artisanId: string,
  fields: Record<string, unknown>
) {
  if (!artisanId) {
    throw new Error('artisan_id requis pour mettre à jour Artisan_config')
  }

  console.info('[ARTISAN_CONFIG] Updating artisan_id:', artisanId, 'fields:', Object.keys(fields))

  const { data: existing, error: selectError } = await supabaseAdmin
    .from(TABLES.artisanConfig)
    .select('artisan_id')
    .eq('artisan_id', artisanId)
    .limit(1)
    .maybeSingle()

  if (selectError) {
    console.error('[ARTISAN_CONFIG] Lookup FULL error:', JSON.stringify(selectError, null, 2))
    throw selectError
  }

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.artisanConfig)
      .update(fields)
      .eq('artisan_id', artisanId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[ARTISAN_CONFIG] Update FULL error:', JSON.stringify(error, null, 2))
      throw error
    }

    console.info('[ARTISAN_CONFIG] Update status: success')
    return data
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.artisanConfig)
    .insert({ artisan_id: artisanId, ...fields })
    .select()
    .maybeSingle()

  if (error) {
    console.error('[ARTISAN_CONFIG] Insert FULL error:', JSON.stringify(error, null, 2))
    throw error
  }

  console.info('[ARTISAN_CONFIG] Insert status: success')
  return data
}

export async function createCommercialLead(data: {
  nom: string
  prenom: string
  societe: string
  trade: string
  offer: string
  answers: string | Record<string, unknown> | unknown[]
  email?: string
  phone?: string
  preferredSlot?: string
  demand?: string
  teamSize?: string
  website?: string
  source?: string
  status?: string
}) {
  console.info('[COMMERCIAL] Creating lead')

  const answers = typeof data.answers === 'string' ? data.answers : JSON.stringify(data.answers)

  const { data: row, error } = await supabaseAdmin
    .from('Commercial')
    .insert({
      first_name: data.prenom,
      last_name: data.nom,
      company_name: data.societe,
      email: data.email || '',
      phone: data.phone || '',
      trade: data.trade,
      offer: data.offer,
      answers,
      preferred_slot: data.preferredSlot || '',
      source: data.source || 'demo_request',
      status: data.status || 'Nouveau',
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[COMMERCIAL] Supabase insert error:', error.message)
    throw error
  }

  console.info('[COMMERCIAL] Response status: success, record:', row.id)
  return row
}

export type DevisRecord = SupabaseDevis

export async function resolveProjectId(projectIdOrRecordId: string): Promise<{ id: string; artisanId: string } | null> {
  if (!projectIdOrRecordId) return null

  const direct = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, artisan_id')
    .eq('id', projectIdOrRecordId)
    .limit(1)
    .maybeSingle()

  if (direct.error) throw direct.error
  if (direct.data) {
    return { id: direct.data.id as string, artisanId: direct.data.artisan_id as string }
  }

  const legacy = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, artisan_id')
    .eq('record_id', projectIdOrRecordId)
    .limit(1)
    .maybeSingle()

  if (legacy.error) throw legacy.error
  if (!legacy.data) return null

  return { id: legacy.data.id as string, artisanId: legacy.data.artisan_id as string }
}

export async function createDevis(
  input: Record<string, unknown> & { artisanId: string; tenantId?: string | null }
): Promise<DevisRecord> {
  const row = await attachTenantIdToPayload(
    TABLES.devis,
    toSupabaseDevisInsert(input),
    {
      tenantId: input.tenantId ?? null,
      artisanId: input.artisanId,
      projectId: typeof input.projectId === 'string' ? input.projectId : null,
    },
  )
  row.artisan_id = input.artisanId

  const { data, error } = await supabaseAdmin
    .from(TABLES.devis)
    .insert(row)
    .select()
    .single()

  if (error) throw error
  return mapSupabaseDevis(data)
}

export async function getDevisById(id: string): Promise<DevisRecord | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.devis)
    .select('*')
    .eq('id', id)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return mapSupabaseDevis(data)
}

export async function getDevisByToken(token: string): Promise<DevisRecord | null> {
  if (!token) return null

  const { data, error } = await supabaseAdmin
    .from(TABLES.devis)
    .select('*')
    .eq('token', token)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return mapSupabaseDevis(data)
}

export async function getDevisByProjet(projectId: string): Promise<DevisRecord[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.devis)
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(mapSupabaseDevis)
}

export async function getDevisByArtisan(artisanId: string): Promise<DevisRecord[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.devis)
    .select('*')
    .eq('artisan_id', artisanId)

  if (error) throw error
  return (data || []).map(mapSupabaseDevis)
}

export async function getAllSentDevis(): Promise<DevisRecord[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.devis)
    .select('*')
    .eq('sent', true)

  if (error) throw error
  return (data || []).map(mapSupabaseDevis)
}

export async function updateDevis(id: string, fields: Record<string, unknown>): Promise<DevisRecord> {
  const row = toSupabaseDevisUpdate(fields)

  const { data, error } = await supabaseAdmin
    .from(TABLES.devis)
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapSupabaseDevis(data)
}

export async function deleteDevis(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLES.devis).delete().eq('id', id)
  if (error) throw error
}

export interface ProjectSummary {
  id: string
  status: string
  createdAt: string
  devisAmount: number
}

export async function getProjectsByArtisan(artisanId: string): Promise<ProjectSummary[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, status, created_at, devis_amount')
    .eq('artisan_id', artisanId)

  if (error) {
    throw error
  }

  return (data || []).map(mapSupabaseProjectSummary)
}

export interface UserRecord {
  id: string
  email: string
  firstName: string
  lastName: string
  company: string
  role: string
  plan: string
  statut: string
  artisanId: string
  phone: string
  siret: string
  address: string
  trialEndDate: string
  subscriptionStart: string
  nextBilling: string
  lastLogin: string
  createdAt: string
  notesAdmin: string
  suspendedAt: string
  cancelledAt: string
  cancellationReason: string
  theme: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  billingStatus: string
  billingInterval: string
  currentPeriodEnd: string
  trialEnd: string
  cancelAtPeriodEnd: boolean
  billingUpdatedAt: string
}

function mapSupabaseAdminUser(row: Record<string, unknown>): UserRecord {
  const s = (value: unknown) => (value === null || value === undefined ? '' : String(value))
  if (!row.id) {
    console.error('[ADMIN CLIENTS] User without Supabase id', row)
  }
  return {
    id: s(row.id),
    email: s(row.email),
    firstName: s(row.first_name),
    lastName: s(row.last_name),
    company: s(row.company_name),
    role: s(row.role),
    plan: s(row.plan),
    statut: s(row.statut),
    artisanId: s(row.artisan_id),
    phone: s(row.phone),
    siret: s(row.siret),
    address: s(row.address),
    trialEndDate: s(row.trial_end_date),
    subscriptionStart: s(row.subscription_start),
    nextBilling: s(row.next_billing),
    lastLogin: s(row.last_login),
    createdAt: s(row.created_at),
    notesAdmin: s(row.notes_admin),
    suspendedAt: s(row.suspended_date),
    cancelledAt: s(row.cancelled_at),
    cancellationReason: s(row.cancellation_reason),
    theme: s(row.theme),
    stripeCustomerId: s(row.stripe_customer_id),
    stripeSubscriptionId: s(row.stripe_subscription_id),
    billingStatus: s(row.billing_status),
    billingInterval: s(row.billing_interval),
    currentPeriodEnd: s(row.current_period_end),
    trialEnd: s(row.trial_end),
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    billingUpdatedAt: s(row.billing_updated_at),
  }
}

export async function getAllUsers(): Promise<UserRecord[]> {
  const { data, error } = await supabaseAdmin.from(TABLES.users).select('*')

  if (error) {
    throw error
  }

  return (data || []).map(mapSupabaseAdminUser)
}

const USER_ID_LOOKUP_COLUMNS = ['id', 'record_id', 'airtable_id', 'artisan_id'] as const

async function findUserRow(
  idOrArtisanId: string
): Promise<{ row: Record<string, unknown>; matchedColumn: string } | null> {
  for (const column of USER_ID_LOOKUP_COLUMNS) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.users)
      .select('*')
      .eq(column, idOrArtisanId)
      .limit(1)
      .maybeSingle()

    if (error) {
      // Column may not exist on this table (legacy/optional identifier) — try the next one.
      continue
    }
    if (data) return { row: data, matchedColumn: column }
  }
  return null
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const found = await findUserRow(id)
  if (!found) return null
  return mapSupabaseAdminUser(found.row)
}

export async function updateUser(id: string, fields: Record<string, unknown>): Promise<UserRecord> {
  const found = await findUserRow(id)
  if (!found) {
    throw new Error('User not found')
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.users)
    .update(fields)
    .eq(found.matchedColumn, id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapSupabaseAdminUser(data)
}
