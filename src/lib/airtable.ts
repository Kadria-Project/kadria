import Airtable from 'airtable';

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey) {
  throw new Error('Missing AIRTABLE_API_KEY');
}

if (!baseId) {
  throw new Error('Missing AIRTABLE_BASE_ID');
}

export const airtableBase = new Airtable({ apiKey }).base(baseId);

export const TABLES = {
  projects: process.env.AIRTABLE_PROJECTS_TABLE || 'Projects',
  users: process.env.AIRTABLE_USERS_TABLE || 'Users',
  artisanConfig: process.env.AIRTABLE_ARTISAN_CONFIG_TABLE || 'Artisan_config',
  activity: 'Activity',
  devis: process.env.AIRTABLE_DEVIS_TABLE || 'Devis',
  emailLogs: process.env.AIRTABLE_EMAIL_LOGS_TABLE || 'Email_logs',
} as const;

function escapeFormulaValue(value: string) {
  return value.replace(/"/g, '\\"')
}

function airtableApiUrl(table: string, query = '') {
  return `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}${query}`
}

async function airtableFetch(url: string, init: RequestInit = {}) {
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
  const table = process.env.AIRTABLE_USERS_TABLE || 'Users'
  const safeEmail = escapeFormulaValue(email)

  const filters = [
    `{Email}="${safeEmail}"`,
    `{email}="${safeEmail}"`,
    `{E-mail}="${safeEmail}"`,
    `{Mail}="${safeEmail}"`,
  ]

  for (const filter of filters) {
    const url = airtableApiUrl(table, `?filterByFormula=${encodeURIComponent(filter)}&maxRecords=1`)
    const res = await airtableFetch(url)
    const data = await res.json()

    if (data.records?.length > 0) {
      const record = data.records[0]

      return {
        id: record.id,
        artisanId: (record.fields['Artisan ID'] || '') as string,
        companyName: (record.fields['Company Name'] || record.fields['companyName'] || '') as string,
        email: email,
        firstName: (record.fields['First Name'] || '') as string,
        lastName: (record.fields['Last Name'] || '') as string,
        primaryColor: (record.fields['Primary Color'] || record.fields['primaryColor'] || '#22c55e') as string,
        plan: (record.fields['Plan'] || '') as string,
        statut: (record.fields['Statut'] || '') as string,
        active: record.fields['Active'] !== false,
        role: (record.fields['Role'] || '') as string,
      }
    }
  }

  return null
}

export async function getEvents(artisanId: string) {
  const safeArtisanId = escapeFormulaValue(artisanId)
  const url = airtableApiUrl('Events', `?filterByFormula=${encodeURIComponent(`{Artisan ID}="${safeArtisanId}"`)}&sort[0][field]=Date&sort[0][direction]=asc`)

  const res = await airtableFetch(url)
  const data = await res.json()
  return (data.records || []).map((r: any) => ({
    id: r.id,
    title: r.fields.Title as string,
    date: r.fields.Date as string,
    type: r.fields.Type as string,
    projectId: r.fields.ProjectId as string,
    artisanId: r.fields['Artisan ID'] as string,
    status: r.fields.Status as string,
    notes: r.fields.Notes as string,
  }))
}

export async function createEvent(data: {
  title: string
  date: string
  type: string
  projectId?: string
  artisanId: string
  notes?: string
}) {
  const res = await airtableFetch(airtableApiUrl('Events'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        Title: data.title,
        Date: data.date,
        Type: data.type,
        ProjectId: data.projectId || '',
        'Artisan ID': data.artisanId,
        Status: 'Prévu',
        Notes: data.notes || '',
      },
    }),
  })
  return res.json()
}

export async function updateEvent(id: string, fields: Record<string, unknown>) {
  const res = await airtableFetch(airtableApiUrl(`Events/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  return res.json()
}

export async function deleteEvent(id: string) {
  const res = await airtableFetch(airtableApiUrl(`Events/${id}`), { method: 'DELETE' })
  return res.json()
}

export async function getUserByArtisanIdentifier(artisanId: string) {
  const table = process.env.AIRTABLE_USERS_TABLE || 'Users'
  const safeArtisanId = escapeFormulaValue(artisanId)
  const url = airtableApiUrl(table, `?filterByFormula=${encodeURIComponent(`{Artisan ID}="${safeArtisanId}"`)}&maxRecords=1`)

  const res = await airtableFetch(url)
  const data = await res.json()
  const record = data.records?.[0]
  if (!record) return null

  return {
    id: record.id,
    artisanId: (record.fields['Artisan ID'] || '') as string,
    companyName: (record.fields['Company Name'] || '') as string,
    primaryColor: (record.fields['Primary Color'] || '#22c55e') as string,
    plan: (record.fields['Plan'] || '') as string,
    active: record.fields['Active'] !== false,
  }
}

export async function getArtisanConfig(artisanId: string) {
  let record: { id: string; fields: Record<string, unknown> } | undefined

  if (artisanId?.startsWith('rec')) {
    const res = await airtableFetch(airtableApiUrl(`Artisan_config/${artisanId}`))
    if (res.ok) {
      record = await res.json()
    }
  }

  if (!record) {
    const safeArtisanId = escapeFormulaValue(artisanId)
    const url = airtableApiUrl('Artisan_config', `?filterByFormula=${encodeURIComponent(`{Artisan ID}="${safeArtisanId}"`)}&maxRecords=1`)
    const res = await airtableFetch(url)
    const data = await res.json()
    record = data.records?.[0]
  }

  if (!record) return null

  return {
    id: record.id,
    artisanId: record.fields['Artisan ID'] as string || '',
    companyName: record.fields['Company Name'] as string || '',
    primaryTrade: record.fields['Primary Trade'] as string || '',
    phone: record.fields['Phone'] as string || '',
    email: record.fields['Email'] as string || '',
    address: record.fields['Address'] as string || '',
    hours: record.fields['Hours'] as string || '',
    logoUrl: record.fields['Logo URL'] as string || '',
    welcomeName: record.fields['Welcome Name'] as string || '',
    welcomeMessage: record.fields['Welcome Message'] as string || '',
    primaryColor: record.fields['Primary Color'] as string || '#22c55e',
    secondaryColor: record.fields['Secondary Color'] as string || '#18181b',
    qualificationFlow: record.fields['Qualification Flow'] as string || '',
    websiteUrl: record.fields['Website URL'] as string || '',
    active: record.fields['Active'] === true || record.fields['Active'] === 'True' || record.fields['Active'] === 'true',
    aiInstructions: record.fields['AI Instructions'] as string || '',
    trades: record.fields['Trades'] as string || '',

    raisonSociale: record.fields['raison_sociale'] as string || record.fields['Raison Sociale'] as string || '',
    formeJuridique: record.fields['forme_juridique'] as string || record.fields['Forme Juridique'] as string || '',
    siret: record.fields['siret'] as string || record.fields['SIRET'] as string || '',
    tvaNumber: record.fields['tva_number'] as string || record.fields['TVA Number'] as string || '',
    tvaAssujetti: record.fields['tva_assujetti'] !== undefined
      ? record.fields['tva_assujetti'] !== false
      : record.fields['TVA Assujetti'] !== false,
    adressePro: record.fields['adresse_pro'] as string || record.fields['Adresse Pro'] as string || '',
    cpPro: record.fields['cp_pro'] as string || record.fields['CP Pro'] as string || '',
    villePro: record.fields['ville_pro'] as string || record.fields['Ville Pro'] as string || '',

    assureur: record.fields['assureur'] as string || record.fields['Assureur'] as string || '',
    numAssurance: record.fields['num_assurance'] as string || record.fields['Num Assurance'] as string || '',
    assuranceNonRequise: record.fields['assurance_non_requise'] === true || record.fields['Assurance Non Requise'] === true,

    devisPrefixe: record.fields['devis_prefixe'] as string || record.fields['Devis Prefixe'] as string || 'DEV',
    devisValidite: Number(record.fields['devis_validite'] ?? record.fields['Devis Validite']) || 90,
    devisTvaDefaut: Number(record.fields['devis_tva_defaut'] ?? record.fields['Devis TVA Defaut']) || 10,
    devisConditionsPaiement: record.fields['devis_conditions_paiement'] as string || record.fields['Devis Conditions Paiement'] as string || '',
    devisMentionLegale: record.fields['devis_mention_legale'] as string || record.fields['Devis Mention Legale'] as string || '',
    devisCompteur: Number(record.fields['devis_compteur'] ?? record.fields['Devis Compteur']) || 0,
    prestationsJson: record.fields['prestations_json'] as string || record.fields['Prestations JSON'] as string || '',
  }
}

export async function updateArtisanConfig(
  recordId: string,
  fields: Record<string, unknown>
) {
  console.info('[ARTISAN_CONFIG] Updating record:', recordId, 'fields:', Object.keys(fields))

  const res = await airtableFetch(airtableApiUrl(`Artisan_config/${recordId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  const result = await res.json()
  console.info('[ARTISAN_CONFIG] Update status:', result.id ? 'success' : 'error')
  return result
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

export interface DevisRecord {
  id: string
  devisNumber: string
  projetId: string
  artisanId: string
  dateEmission: string
  dateValidite: string
  objet: string
  lignesJson: string
  totalHT: number
  totalTVA: number
  tvaBreakdownJson: string
  totalTTC: number
  conditionsPaiement: string
  delaiExecution: string
  mentionsLegales: string
  noteInterne: string
  statut: string
  clientName: string
  clientAddress: string
  clientEmail: string
  clientPhone: string
  createdAt: string
  sent: boolean
  pdfUrl: string | null
  token: string
  opensCount: number
  lastOpenedDate: string | null
  firstOpenedAt: string | null
  accepted: boolean
  acceptedAt: string | null
  acceptedIp: string | null
  quoteSentAt: string
  lastFollowUpAt: string | null
  followUpCount: number
}

function mapDevisRecord(record: { id: string; fields: Record<string, unknown> }): DevisRecord {
  const fields = record.fields
  const pdfFile = fields['PDF File'] as Array<{ url?: string }> | undefined
  return {
    id: record.id,
    devisNumber: fields['Devis Number'] as string || '',
    projetId: fields['Projet ID'] as string || '',
    artisanId: fields['Artisan ID'] as string || '',
    dateEmission: fields['Date Emission'] as string || '',
    dateValidite: fields['Date Validite'] as string || '',
    objet: fields['Objet'] as string || '',
    lignesJson: fields['Lignes JSON'] as string || '',
    totalHT: Number(fields['Total HT']) || 0,
    totalTVA: Number(fields['Total TVA']) || 0,
    tvaBreakdownJson: fields['TVA Breakdown JSON'] as string || '',
    totalTTC: Number(fields['Total TTC']) || 0,
    conditionsPaiement: fields['Conditions Paiement'] as string || '',
    delaiExecution: fields['Delai Execution'] as string || '',
    mentionsLegales: fields['Mentions Legales'] as string || '',
    noteInterne: fields['Note Interne'] as string || '',
    statut: fields['Statut'] as string || 'Brouillon',
    clientName: fields['Client Name'] as string || '',
    clientAddress: fields['Client Address'] as string || '',
    clientEmail: fields['Client Email'] as string || '',
    clientPhone: fields['Client Phone'] as string || '',
    createdAt: fields['Created At'] as string || '',
    sent: fields['Sent'] === true,
    pdfUrl: pdfFile?.[0]?.url || null,
    token: fields['Token'] as string || '',
    opensCount: Number(fields['Opens_count']) || 0,
    lastOpenedDate: fields['Last_opened_date'] as string || null,
    firstOpenedAt: fields['First_opened_at'] as string || null,
    accepted: fields['Accepted'] === true,
    acceptedAt: fields['Accepted_at'] as string || null,
    acceptedIp: fields['Accepted_ip'] as string || null,
    quoteSentAt: fields['Quote Sent At'] as string || fields['Date Emission'] as string || '',
    lastFollowUpAt: fields['Last Follow Up At'] as string || null,
    followUpCount: Number(fields['Follow Up Count']) || 0,
  }
}

export async function createDevis(fields: Record<string, unknown>): Promise<DevisRecord> {
  const record = await airtableBase(TABLES.devis).create(fields as Partial<Airtable.FieldSet>)
  return mapDevisRecord({ id: record.id, fields: record.fields })
}

export async function getDevisById(id: string): Promise<DevisRecord | null> {
  try {
    const record = await airtableBase(TABLES.devis).find(id)
    return mapDevisRecord({ id: record.id, fields: record.fields })
  } catch {
    return null
  }
}

export async function getDevisByToken(token: string): Promise<DevisRecord | null> {
  const safeToken = escapeFormulaValue(token)
  const url = airtableApiUrl(TABLES.devis, `?filterByFormula=${encodeURIComponent(`{Token}="${safeToken}"`)}&maxRecords=1`)

  const res = await airtableFetch(url)
  const data = await res.json()
  const record = data.records?.[0]
  if (!record) return null
  return mapDevisRecord({ id: record.id, fields: record.fields })
}

export async function getDevisByProjet(projetId: string): Promise<DevisRecord[]> {
  const safeProjetId = escapeFormulaValue(projetId)
  const url = airtableApiUrl(TABLES.devis, `?filterByFormula=${encodeURIComponent(`{Projet ID}="${safeProjetId}"`)}&sort[0][field]=Created At&sort[0][direction]=desc`)

  const res = await airtableFetch(url)
  const data = await res.json()
  return (data.records || []).map((r: { id: string; fields: Record<string, unknown> }) => mapDevisRecord(r))
}

export async function getDevisByArtisan(artisanId: string): Promise<DevisRecord[]> {
  const safeArtisanId = escapeFormulaValue(artisanId)
  const url = airtableApiUrl(TABLES.devis, `?filterByFormula=${encodeURIComponent(`{Artisan ID}="${safeArtisanId}"`)}`)

  const res = await airtableFetch(url)
  const data = await res.json()
  return (data.records || []).map((r: { id: string; fields: Record<string, unknown> }) => mapDevisRecord(r))
}

export async function updateDevis(id: string, fields: Record<string, unknown>): Promise<DevisRecord> {
  const record = await airtableBase(TABLES.devis).update(id, fields as Partial<Airtable.FieldSet>)
  return mapDevisRecord({ id: record.id, fields: record.fields })
}

export async function deleteDevis(id: string): Promise<void> {
  await airtableBase(TABLES.devis).destroy(id)
}

export interface ProjectSummary {
  id: string
  status: string
  createdAt: string
  devisAmount: number
}

export async function getProjectsByArtisan(artisanId: string): Promise<ProjectSummary[]> {
  const records = await airtableBase(TABLES.projects)
    .select({
      filterByFormula: `{Artisan ID}="${escapeFormulaValue(artisanId)}"`,
    })
    .firstPage()

  return records.map((record) => ({
    id: record.id,
    status: record.fields['Status'] as string || '',
    createdAt: record.fields['Created At'] as string || '',
    devisAmount: (record.fields['Devis_amount'] as number) || 0,
  }))
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
