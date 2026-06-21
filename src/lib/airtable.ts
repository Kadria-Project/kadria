import Airtable from 'airtable';
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

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

function createAirtableFallbackError() {
  return new Error('Missing Airtable environment variables for legacy routes')
}

function getAirtableBaseClient() {
  if (!apiKey || !baseId) {
    throw createAirtableFallbackError()
  }

  return new Airtable({ apiKey }).base(baseId)
}

export const airtableBase = ((...args: Parameters<ReturnType<typeof getAirtableBaseClient>>) =>
  getAirtableBaseClient()(...args)) as ReturnType<typeof getAirtableBaseClient>;

export const TABLES = {
  projects: 'Projects',
  users: 'Users',
  artisanConfig: 'Artisan_config',
  activity: 'Activity',
  devis: process.env.AIRTABLE_DEVIS_TABLE || 'Devis',
  emailLogs: process.env.AIRTABLE_EMAIL_LOGS_TABLE || 'Email_logs',
} as const;

function escapeFormulaValue(value: string) {
  return value.replace(/"/g, '\\"')
}

function airtableApiUrl(table: string, query = '') {
  if (!baseId) {
    throw createAirtableFallbackError()
  }
  return `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}${query}`
}

async function airtableFetch(url: string, init: RequestInit = {}) {
  if (!apiKey) {
    throw createAirtableFallbackError()
  }
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
}

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
  answers: string
  email?: string
  phone?: string
  preferredSlot?: string
  demand?: string
  teamSize?: string
  website?: string
}) {
  console.info('[COMMERCIAL] Creating lead')

  const res = await airtableFetch(airtableApiUrl('Commercial'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        'Nom': data.nom,
        'Prenom': data.prenom,
        'Societe': data.societe,
        'Trade': data.trade,
        'Offer': data.offer,
        'Answers': data.answers,
        'Email': data.email || '',
        'Phone': data.phone || '',
        'Preferred Slot': data.preferredSlot || '',
      },
    }),
  })
  const result = await res.json()
  console.info('[COMMERCIAL] Response status:', res.status, 'record:', result.id || 'none')
  return result
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

export async function createDevis(input: Record<string, unknown> & { artisanId: string }): Promise<DevisRecord> {
  const row = toSupabaseDevisInsert(input)
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
    .select('id, record_id, status, created_at, devis_amount')
    .eq('artisan_id', artisanId)

  if (error) {
    throw error
  }

  return (data || []).map(mapSupabaseProjectSummary)
}

export async function createActivityLog(
  projectId: string,
  action: string,
  description: string,
): Promise<void> {
  await airtableBase(TABLES.activity).create({
    'Project ID': projectId,
    Action: action,
    Description: description,
  })
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
}

function mapUserRecord(record: { id: string; fields: Record<string, unknown> }): UserRecord {
  const fields = record.fields
  return {
    id: record.id,
    email: fields['Email'] as string || '',
    firstName: fields['First Name'] as string || '',
    lastName: fields['Last Name'] as string || '',
    company: fields['Company Name'] as string || '',
    role: fields['Role'] as string || '',
    plan: fields['Plan'] as string || '',
    statut: fields['Statut'] as string || '',
    artisanId: fields['Artisan ID'] as string || '',
    phone: fields['Phone'] as string || '',
    siret: fields['SIRET'] as string || '',
    address: fields['Address'] as string || '',
    trialEndDate: fields['Trial_end_date'] as string || '',
    subscriptionStart: fields['Subscription_start'] as string || '',
    nextBilling: fields['Next_billing'] as string || '',
    lastLogin: fields['Last_login'] as string || '',
    createdAt: fields['Created At'] as string || fields['Created_at'] as string || '',
    notesAdmin: fields['Notes_admin'] as string || '',
    suspendedAt: fields['Suspended_at'] as string || '',
    cancelledAt: fields['Cancelled_at'] as string || '',
    cancellationReason: fields['Cancellation_reason'] as string || '',
    theme: fields['Theme'] as string || '',
  }
}

export async function getAllUsers(): Promise<UserRecord[]> {
  const records: UserRecord[] = []
  await airtableBase(TABLES.users)
    .select({ pageSize: 100 })
    .eachPage((pageRecords, fetchNextPage) => {
      for (const record of pageRecords) {
        records.push(mapUserRecord({ id: record.id, fields: record.fields }))
      }
      fetchNextPage()
    })
  return records
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  try {
    const record = await airtableBase(TABLES.users).find(id)
    return mapUserRecord({ id: record.id, fields: record.fields })
  } catch {
    return null
  }
}

export async function updateUser(id: string, fields: Record<string, unknown>): Promise<UserRecord> {
  const record = await airtableBase(TABLES.users).update(id, fields as Partial<Airtable.FieldSet>)
  return mapUserRecord({ id: record.id, fields: record.fields })
}
