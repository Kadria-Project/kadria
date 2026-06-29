import { normalizeTrades } from '@/src/config/trades'

type RawRow = Record<string, unknown>

function getValue<T>(row: RawRow | null | undefined, keys: string[], fallback: T): T {
  if (!row) return fallback

  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null) {
      return value as T
    }
  }

  return fallback
}

function getString(row: RawRow | null | undefined, ...keys: string[]) {
  return String(getValue(row, keys, '') || '')
}

function getNumber(row: RawRow | null | undefined, ...keys: string[]) {
  const raw = getValue(row, keys, 0)
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function getBoolean(row: RawRow | null | undefined, ...keys: string[]) {
  const value = getValue<unknown>(row, keys, false)
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'yes'
  }
  if (typeof value === 'number') return value === 1
  return false
}

function getTradesArray(row: RawRow | null | undefined, ...keys: string[]): string[] {
  return normalizeTrades(getValue<unknown>(row, keys, []))
}

function getNullableNumber(row: RawRow | null | undefined, ...keys: string[]) {
  const value = getValue<unknown>(row, keys, null)
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getPhotos(row: RawRow | null | undefined) {
  const raw = getValue<unknown>(row, ['photos', 'Photos'], [])

  let list: unknown[]
  if (Array.isArray(raw)) {
    list = raw
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) {
      list = []
    } else if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      // Chaîne JSON sérialisée (tableau ou objet unique) : on tente un parse
      // avant de retomber sur une simple URL/liste séparée par virgules.
      try {
        const parsed = JSON.parse(trimmed)
        list = Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        list = trimmed.split(',').map((s) => s.trim()).filter(Boolean)
      }
    } else {
      // URL simple, ou plusieurs URLs séparées par des virgules.
      list = trimmed.split(',').map((s) => s.trim()).filter(Boolean)
    }
  } else {
    list = []
  }

  return list
    .map((item) => {
      if (typeof item === 'string') {
        return {
          url: item,
          thumbnailUrl: item,
          filename: '',
          size: 0,
        }
      }

      if (!item || typeof item !== 'object') {
        return null
      }

      const attachment = item as Record<string, unknown>
      const url = String(attachment.url || '')
      if (!url) return null

      const thumbnails = attachment.thumbnails as Record<string, unknown> | undefined
      const large = thumbnails?.large as Record<string, unknown> | undefined
      const small = thumbnails?.small as Record<string, unknown> | undefined

      return {
        url,
        thumbnailUrl: String(large?.url || small?.url || url),
        filename: String(attachment.filename || ''),
        size: Number(attachment.size || 0),
      }
    })
    .filter(
      (
        item,
      ): item is {
        url: string
        thumbnailUrl: string
        filename: string
        size: number
      } => Boolean(item),
    )
}

export interface SupabaseUserLookup {
  id: string
  artisanId: string
  companyName: string
  email: string
  firstName: string
  lastName: string
  primaryColor: string
  plan: string
  statut: string
  active: boolean
  role: string
}

export interface SupabaseArtisanConfig {
  id: string
  artisanId: string
  companyName: string
  primaryTrade: string
  phone: string
  email: string
  address: string
  hours: string
  logoUrl: string
  welcomeName: string
  welcomeMessage: string
  primaryColor: string
  secondaryColor: string
  qualificationFlow: string
  websiteUrl: string
  active: boolean
  aiInstructions: string
  trades: string[]
  raisonSociale: string
  formeJuridique: string
  siret: string
  tvaNumber: string
  tvaAssujetti: boolean
  adressePro: string
  cpPro: string
  villePro: string
  assureur: string
  numAssurance: string
  assuranceNonRequise: boolean
  devisPrefixe: string
  devisValidite: number
  devisTvaDefaut: number
  devisConditionsPaiement: string
  devisMentionLegale: string
  devisCompteur: number
  prestationsJson: string
  serviceArea: string
  interventionRadius: number
  notificationEmail: string
  vapiEnabled: boolean
  vapiGreeting: string
  onboardingCompleted: boolean
  onboardingCompletedAt: string
  travelConfig: Record<string, unknown>
  businessConfig: Record<string, unknown>
  assistantAvatarType: string
  assistantAvatarUrl: string
}

export interface SupabaseProject {
  id: string
  projectNumber: string
  status: string
  leadStatus: string
  clientName: string
  clientFirstName: string
  clientEmail: string
  clientPhone: string
  siteAddress: string
  city: string
  postalCode: string
  trade: string
  projectType: string
  budget: string
  desiredTimeline: string
  maturity: string
  aiSummary: string
  chatHistory: string
  tradeAnswers: string
  internalNotes: string
  createdAt: string
  completenessScore: number
  contacted: boolean
  assignedTo: string
  artisanId: string
  source: string
  latitude: number | null
  longitude: number | null
  callbackDate: string
  devisAmount: number
  photos: Array<{
    url: string
    thumbnailUrl: string
    filename: string
    size: number
  }>
  recordId: string
}

export function mapSupabaseUserLookup(row: RawRow): SupabaseUserLookup {
  return {
    id: getString(row, 'id'),
    artisanId: getString(row, 'artisan_id', 'Artisan ID'),
    companyName: getString(row, 'company_name', 'Company Name', 'companyName'),
    email: getString(row, 'email', 'Email', 'E-mail', 'Mail'),
    firstName: getString(row, 'first_name', 'First Name'),
    lastName: getString(row, 'last_name', 'Last Name'),
    primaryColor: getString(row, 'primary_color', 'Primary Color', 'primaryColor') || '#22c55e',
    plan: getString(row, 'plan', 'Plan'),
    statut: getString(row, 'statut', 'Statut'),
    active: row.active === undefined ? true : getBoolean(row, 'active', 'Active'),
    role: getString(row, 'role', 'Role'),
  }
}

export function mapSupabaseArtisanConfig(row: RawRow): SupabaseArtisanConfig {
  return {
    id: getString(row, 'id'),
    artisanId: getString(row, 'artisan_id', 'Artisan ID'),
    companyName: getString(row, 'company_name', 'Company Name'),
    primaryTrade: getString(row, 'primary_trade', 'Primary Trade'),
    phone: getString(row, 'phone', 'Phone'),
    email: getString(row, 'email', 'Email'),
    address: getString(row, 'address', 'Address'),
    hours: getString(row, 'hours', 'Hours'),
    logoUrl: getString(row, 'logo_url', 'Logo URL'),
    welcomeName: getString(row, 'welcome_name', 'Welcome Name'),
    welcomeMessage: getString(row, 'welcome_message', 'Welcome Message'),
    primaryColor: getString(row, 'primary_color', 'Primary Color') || '#22c55e',
    secondaryColor: getString(row, 'secondary_color', 'Secondary Color') || '#18181b',
    qualificationFlow: getString(row, 'qualification_flow', 'Qualification Flow'),
    websiteUrl: getString(row, 'website_url', 'Website URL'),
    active: getBoolean(row, 'active', 'Active'),
    aiInstructions: getString(row, 'ai_instructions', 'AI Instructions'),
    trades: getTradesArray(row, 'trades', 'Trades'),
    raisonSociale: getString(row, 'raison_sociale', 'Raison Sociale'),
    formeJuridique: getString(row, 'forme_juridique', 'Forme Juridique'),
    siret: getString(row, 'siret', 'SIRET'),
    tvaNumber: getString(row, 'tva_number', 'TVA Number'),
    tvaAssujetti: getBoolean(row, 'tva_assujetti', 'TVA Assujetti'),
    adressePro: getString(row, 'adresse_pro', 'Adresse Pro'),
    cpPro: getString(row, 'cp_pro', 'CP Pro'),
    villePro: getString(row, 'ville_pro', 'Ville Pro'),
    assureur: getString(row, 'assureur', 'Assureur'),
    numAssurance: getString(row, 'num_assurance', 'Num Assurance'),
    assuranceNonRequise: getBoolean(row, 'assurance_non_requise', 'Assurance Non Requise'),
    devisPrefixe: getString(row, 'devis_prefixe', 'Devis Prefixe') || 'DEV',
    devisValidite: getNumber(row, 'devis_validite', 'Devis Validite') || 90,
    devisTvaDefaut: getNumber(row, 'devis_tva_defaut', 'Devis TVA Defaut') || 10,
    devisConditionsPaiement: getString(row, 'devis_conditions_paiement', 'Devis Conditions Paiement'),
    devisMentionLegale: getString(row, 'devis_mention_legale', 'Devis Mention Legale'),
    devisCompteur: getNumber(row, 'devis_compteur', 'Devis Compteur'),
    prestationsJson: getString(row, 'prestations_json', 'Prestations JSON'),
    serviceArea: getString(row, 'service_area'),
    interventionRadius: getNumber(row, 'intervention_radius'),
    notificationEmail: getString(row, 'notification_email'),
    vapiEnabled: getBoolean(row, 'vapi_enabled'),
    vapiGreeting: getString(row, 'vapi_greeting'),
    onboardingCompleted: getBoolean(row, 'onboarding_completed'),
    onboardingCompletedAt: getString(row, 'onboarding_completed_at'),
    travelConfig: getValue<Record<string, unknown>>(row, ['travel_config', 'Travel Config'], {}),
    businessConfig: getValue<Record<string, unknown>>(row, ['business_config', 'Business Config'], {}),
    assistantAvatarType: getString(row, 'assistant_avatar_type', 'Assistant Avatar Type') || 'kadria_default',
    assistantAvatarUrl: getString(row, 'assistant_avatar_url', 'Assistant Avatar URL'),
  }
}

export function mapSupabaseProject(row: RawRow): SupabaseProject {
  const id = getString(row, 'id', 'record_id')

  return {
    id,
    projectNumber: id ? id.slice(-6) : '',
    status: getString(row, 'status', 'Status') || 'Inconnu',
    leadStatus: getString(row, 'lead_status', 'Lead Status'),
    clientName: getString(row, 'client_name', 'Client Name'),
    clientFirstName: getString(row, 'client_first_name', 'Client First Name'),
    clientEmail: getString(row, 'client_email', 'Client Email'),
    clientPhone: getString(row, 'client_phone', 'Client Phone'),
    siteAddress: getString(row, 'site_address', 'Site Address'),
    city: getString(row, 'city', 'City'),
    postalCode: getString(row, 'postal_code', 'Postal Code'),
    trade: getString(row, 'trade', 'Trade'),
    projectType: getString(row, 'project_type', 'Project Type'),
    budget: getString(row, 'budget', 'Budget'),
    desiredTimeline: getString(row, 'desired_timeline', 'Desired Timeline'),
    maturity: getString(row, 'maturity', 'Maturity'),
    aiSummary: getString(row, 'ai_summary', 'AI Summary'),
    chatHistory: getString(row, 'chat_history', 'Chat History'),
    tradeAnswers: (() => {
      const raw = getValue<unknown>(row, ['trade_answers', 'Trade Answers'], '')
      return typeof raw === 'string' ? raw : JSON.stringify(raw || '')
    })(),
    internalNotes: getString(row, 'artisan_notes', 'Artisan Notes'),
    createdAt: getString(row, 'created_at', 'Created At'),
    completenessScore: getNumber(row, 'completeness_score', 'Completeness Score'),
    contacted: getBoolean(row, 'contacted', 'Contacted'),
    assignedTo: getString(row, 'assigned_to', 'Assigned To'),
    artisanId: getString(row, 'artisan_id', 'Artisan ID'),
    source: getString(row, 'source', 'Source'),
    latitude: getNullableNumber(row, 'latitude', 'Latitude'),
    longitude: getNullableNumber(row, 'longitude', 'Longitude'),
    callbackDate: getString(row, 'callback_date', 'Callback Date'),
    devisAmount: getNumber(row, 'devis_amount', 'Devis_amount'),
    photos: getPhotos(row),
    recordId: getString(row, 'record_id'),
  }
}

// Construit un resume court et factuel a partir des champs du dossier quand
// le modele n'a pas rempli aiSummary. Ne sert qu'a eviter un resume vide
// quand des informations exploitables existent deja — n'invente rien.
function buildFallbackAiSummary(input: Record<string, unknown>): string {
  const parts: string[] = []

  const projectType = typeof input.projectType === 'string' ? input.projectType.trim() : ''
  const trade = typeof input.trade === 'string' ? input.trade.trim() : ''
  if (projectType || trade) {
    parts.push(`Demande concernant : ${[projectType, trade].filter(Boolean).join(' - ')}.`)
  }

  let tradeAnswersText = ''
  const tradeAnswersRaw = input.tradeAnswers
  try {
    const tradeAnswers = typeof tradeAnswersRaw === 'string' ? JSON.parse(tradeAnswersRaw) : tradeAnswersRaw
    if (Array.isArray(tradeAnswers) && tradeAnswers.length > 0) {
      tradeAnswersText = tradeAnswers
        .map((qa) => (qa && typeof qa === 'object' ? `${(qa as { question?: string }).question || ''} : ${(qa as { answer?: string }).answer || ''}` : ''))
        .filter(Boolean)
        .join('. ')
    }
  } catch {
    // tradeAnswers non parsable, ignore sans bloquer le fallback
  }
  if (tradeAnswersText) parts.push(`${tradeAnswersText}.`)

  const budget = typeof input.budget === 'string' ? input.budget.trim() : ''
  if (budget) parts.push(`Budget : ${budget}.`)

  const timeline = typeof input.desiredTimeline === 'string' ? input.desiredTimeline.trim() : ''
  if (timeline) parts.push(`Délai : ${timeline}.`)

  const siteAddress = typeof input.siteAddress === 'string' ? input.siteAddress.trim() : ''
  if (siteAddress) parts.push('Adresse chantier renseignée.')

  const hasPhotos = Array.isArray(input.photos) && input.photos.length > 0
  parts.push(hasPhotos ? 'Photos disponibles.' : 'Photos non disponibles pour le moment.')

  return parts.join(' ')
}

export function toSupabaseProjectInsert(input: Record<string, unknown>) {
  const postalCodeRaw = input.postalCode
  const latitudeRaw = input.latitude
  const longitudeRaw = input.longitude

  const postalCode =
    postalCodeRaw === undefined || postalCodeRaw === null || postalCodeRaw === ''
      ? null
      : String(postalCodeRaw)

  const latitude =
    latitudeRaw === undefined || latitudeRaw === null || latitudeRaw === ''
      ? null
      : Number(latitudeRaw)

  const longitude =
    longitudeRaw === undefined || longitudeRaw === null || longitudeRaw === ''
      ? null
      : Number(longitudeRaw)

  return {
    client_name: String(input.clientName || ''),
    client_first_name: String(input.clientFirstName || ''),
    client_phone: String(input.clientPhone || ''),
    client_email: String(input.clientEmail || ''),
    site_address: String(input.siteAddress || ''),
    city: String(input.city || ''),
    postal_code: postalCode,
    latitude: Number.isFinite(latitude as number) ? latitude : null,
    longitude: Number.isFinite(longitude as number) ? longitude : null,
    trade: String(input.trade || 'Autre'),
    project_type: String(input.projectType || ''),
    budget: String(input.budget || ''),
    desired_timeline: String(input.desiredTimeline || ''),
    maturity: String(input.maturity || ''),
    ai_summary: String(input.aiSummary || '').trim() || buildFallbackAiSummary(input),
    chat_history: String(input.chatHistory || input.projectDetails || ''),
    trade_answers:
      input.tradeAnswers === undefined || input.tradeAnswers === null || input.tradeAnswers === ''
        ? ''
        : typeof input.tradeAnswers === 'string'
          ? input.tradeAnswers
          : JSON.stringify(input.tradeAnswers),
    completeness_score: Number(input.completenessScore || 0),
    status: 'Nouveau',
    lead_status: 'Nouveau',
    contacted: false,
    artisan_id: String(input.artisanId || ''),
    source: String(input.source || 'web'),
    call_id: String(input.callId || ''),
    assigned_to: String(input.assignedTo || ''),
    photos: Array.isArray(input.photos)
      ? input.photos.map((photo) => {
          if (typeof photo === 'string') {
            return { url: photo }
          }
          if (photo && typeof photo === 'object' && 'url' in photo) {
            return { url: String((photo as { url?: string }).url || '') }
          }
          return null
        }).filter(Boolean)
      : [],
  }
}

export function toSupabaseProjectUpdate(input: Record<string, unknown>) {
  const row: Record<string, unknown> = {}

  if (input.status !== undefined) row.status = input.status
  if (input.contacted !== undefined) row.contacted = input.contacted
  if (input.internalNotes !== undefined) row.artisan_notes = input.internalNotes
  if (input.callbackDate !== undefined) row.callback_date = input.callbackDate || null

  const fieldMap: Record<string, string> = {
    'Lead Status': 'lead_status',
    'Client Name': 'client_name',
    'Client First Name': 'client_first_name',
    'Client Email': 'client_email',
    'Client Phone': 'client_phone',
    'Site Address': 'site_address',
    City: 'city',
    'Postal Code': 'postal_code',
    Trade: 'trade',
    'Project Type': 'project_type',
    Budget: 'budget',
    'Desired Timeline': 'desired_timeline',
    Maturity: 'maturity',
    'AI Summary': 'ai_summary',
    'Chat History': 'chat_history',
    'Trade Answers': 'trade_answers',
    'Artisan Notes': 'artisan_notes',
    'Created At': 'created_at',
    'Completeness Score': 'completeness_score',
    Contacted: 'contacted',
    'Assigned To': 'assigned_to',
    Source: 'source',
    Latitude: 'latitude',
    Longitude: 'longitude',
    'Callback Date': 'callback_date',
    Devis_amount: 'devis_amount',
    Photos: 'photos',
    record_id: 'record_id',
  }

  for (const [key, value] of Object.entries(input)) {
    const targetKey = fieldMap[key] || key
    if (targetKey === 'artisan_id' || key === 'Artisan ID') continue
    row[targetKey] = value
  }

  return row
}

export interface SupabaseProjectSummary {
  id: string
  status: string
  createdAt: string
  devisAmount: number
}

export function mapSupabaseProjectSummary(row: RawRow): SupabaseProjectSummary {
  return {
    id: getString(row, 'id', 'record_id'),
    status: getString(row, 'status', 'Status'),
    createdAt: getString(row, 'created_at', 'Created At'),
    devisAmount: getNumber(row, 'devis_amount', 'Devis_amount'),
  }
}

export interface SupabaseActivity {
  id: string
  projectId: string
  action: string
  description: string
  createdAt: string
}

export function mapSupabaseActivity(row: RawRow, index: number): SupabaseActivity {
  return {
    id: `activity-${index}`,
    projectId: getString(row, 'project_id', 'Project ID'),
    action: getString(row, 'action', 'Action'),
    description: getString(row, 'description', 'Description'),
    createdAt: getString(row, 'created_at', 'Created At'),
  }
}

export interface SupabaseDevis {
  id: string
  devisNumber: string
  projectId: string
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
  quoteSentAt: string | null
  lastFollowUpAt: string | null
  followUpCount: number
  declinedAt: string | null
  declineReason: string
  followUpDisabled: boolean
  followUpDisabledAt: string | null
  sentAt: string | null
  sentSnapshotId: string | null
  acceptedSnapshotId: string | null
  declinedSnapshotId: string | null
  acceptedByName: string | null
  acceptedByEmail: string | null
  acceptedUserAgent: string | null
}

export function mapSupabaseDevis(row: RawRow): SupabaseDevis {
  return {
    id: getString(row, 'id'),
    devisNumber: getString(row, 'devis_number'),
    projectId: getString(row, 'project_id'),
    artisanId: getString(row, 'artisan_id'),
    dateEmission: getString(row, 'date_emission'),
    dateValidite: getString(row, 'date_validite'),
    objet: getString(row, 'objet'),
    lignesJson: getString(row, 'lignes_json'),
    totalHT: getNumber(row, 'total_ht'),
    totalTVA: getNumber(row, 'total_tva'),
    tvaBreakdownJson: getString(row, 'tva_breakdown_json'),
    totalTTC: getNumber(row, 'total_ttc'),
    conditionsPaiement: getString(row, 'conditions_paiement'),
    delaiExecution: getString(row, 'delai_execution'),
    mentionsLegales: getString(row, 'mentions_legales'),
    noteInterne: getString(row, 'note_interne'),
    statut: getString(row, 'statut') || 'Brouillon',
    clientName: getString(row, 'client_name'),
    clientAddress: getString(row, 'client_address'),
    clientEmail: getString(row, 'client_email'),
    clientPhone: getString(row, 'client_phone'),
    createdAt: getString(row, 'created_at'),
    sent: getBoolean(row, 'sent'),
    pdfUrl: getValue<string | null>(row, ['pdf_url'], null),
    token: getString(row, 'token'),
    opensCount: getNumber(row, 'opens_count'),
    lastOpenedDate: getValue<string | null>(row, ['last_opened_date'], null),
    firstOpenedAt: getValue<string | null>(row, ['first_opened_at'], null),
    accepted: getBoolean(row, 'accepted'),
    acceptedAt: getValue<string | null>(row, ['accepted_at'], null),
    acceptedIp: getValue<string | null>(row, ['accepted_ip'], null),
    // Ne PAS retomber sur date_emission ici : date_emission est toujours
    // renseignée dès la création (même en brouillon), ce qui masquerait
    // l'absence réelle d'envoi. quoteSentAt doit rester null tant que le
    // devis n'a pas été réellement envoyé au client.
    quoteSentAt: getValue<string | null>(row, ['quote_sent_at'], null),
    lastFollowUpAt: getValue<string | null>(row, ['last_follow_up_at'], null),
    followUpCount: getNumber(row, 'follow_up_count'),
    declinedAt: getValue<string | null>(row, ['declined_at', 'declinedAt'], null),
    declineReason: getString(row, 'decline_reason', 'declineReason'),
    followUpDisabled: getBoolean(row, 'follow_up_disabled'),
    followUpDisabledAt: getValue<string | null>(row, ['follow_up_disabled_at'], null),
    sentAt: getValue<string | null>(row, ['sent_at'], null),
    sentSnapshotId: getValue<string | null>(row, ['sent_snapshot_id'], null),
    acceptedSnapshotId: getValue<string | null>(row, ['accepted_snapshot_id'], null),
    declinedSnapshotId: getValue<string | null>(row, ['declined_snapshot_id'], null),
    acceptedByName: getValue<string | null>(row, ['accepted_by_name'], null),
    acceptedByEmail: getValue<string | null>(row, ['accepted_by_email'], null),
    acceptedUserAgent: getValue<string | null>(row, ['accepted_user_agent'], null),
  }
}

export function toSupabaseDevisInsert(input: Record<string, unknown>) {
  return {
    devis_number: String(input.devisNumber || ''),
    project_id: String(input.projectId || ''),
    artisan_id: String(input.artisanId || ''),
    date_emission: input.dateEmission ? String(input.dateEmission) : null,
    date_validite: input.dateValidite ? String(input.dateValidite) : null,
    objet: String(input.objet || ''),
    lignes_json: typeof input.lignesJson === 'string' ? input.lignesJson : JSON.stringify(input.lignes || []),
    total_ht: Number(input.totalHT) || 0,
    total_tva: Number(input.totalTVA) || 0,
    tva_breakdown_json:
      typeof input.tvaBreakdownJson === 'string' ? input.tvaBreakdownJson : JSON.stringify(input.tvaBreakdown || {}),
    total_ttc: Number(input.totalTTC) || 0,
    conditions_paiement: String(input.conditionsPaiement || ''),
    delai_execution: String(input.delaiExecution || ''),
    mentions_legales: String(input.mentionsLegales || ''),
    note_interne: String(input.noteInterne || ''),
    statut: String(input.statut || 'Brouillon'),
    client_name: String(input.clientName || ''),
    client_address: String(input.clientAddress || ''),
    client_email: String(input.clientEmail || ''),
    client_phone: String(input.clientPhone || ''),
    created_at: String(input.createdAt || new Date().toISOString()),
    sent: Boolean(input.sent) || false,
    token: String(input.token || ''),
  }
}

export function toSupabaseDevisUpdate(input: Record<string, unknown>) {
  const row: Record<string, unknown> = {}

  if (input.objet !== undefined) row.objet = input.objet
  if (input.dateEmission !== undefined) row.date_emission = input.dateEmission || null
  if (input.dateValidite !== undefined) row.date_validite = input.dateValidite || null
  if (input.lignesJson !== undefined) row.lignes_json = input.lignesJson
  if (input.totalHT !== undefined) row.total_ht = Number(input.totalHT) || 0
  if (input.totalTVA !== undefined) row.total_tva = Number(input.totalTVA) || 0
  if (input.tvaBreakdownJson !== undefined) row.tva_breakdown_json = input.tvaBreakdownJson
  if (input.totalTTC !== undefined) row.total_ttc = Number(input.totalTTC) || 0
  if (input.conditionsPaiement !== undefined) row.conditions_paiement = input.conditionsPaiement
  if (input.delaiExecution !== undefined) row.delai_execution = input.delaiExecution
  if (input.mentionsLegales !== undefined) row.mentions_legales = input.mentionsLegales
  if (input.noteInterne !== undefined) row.note_interne = input.noteInterne
  if (input.statut !== undefined) row.statut = input.statut
  if (input.clientName !== undefined) row.client_name = input.clientName
  if (input.clientAddress !== undefined) row.client_address = input.clientAddress
  if (input.clientEmail !== undefined) row.client_email = input.clientEmail
  if (input.clientPhone !== undefined) row.client_phone = input.clientPhone
  if (input.sent !== undefined) row.sent = input.sent
  if (input.pdfUrl !== undefined) row.pdf_url = input.pdfUrl
  if (input.token !== undefined) row.token = input.token
  if (input.opensCount !== undefined) row.opens_count = input.opensCount
  if (input.lastOpenedDate !== undefined) row.last_opened_date = input.lastOpenedDate
  if (input.firstOpenedAt !== undefined) row.first_opened_at = input.firstOpenedAt
  if (input.accepted !== undefined) row.accepted = input.accepted
  if (input.acceptedAt !== undefined) row.accepted_at = input.acceptedAt
  if (input.acceptedIp !== undefined) row.accepted_ip = input.acceptedIp
  if (input.quoteSentAt !== undefined) row.quote_sent_at = input.quoteSentAt
  if (input.lastFollowUpAt !== undefined) row.last_follow_up_at = input.lastFollowUpAt
  if (input.followUpCount !== undefined) row.follow_up_count = input.followUpCount
  if (input.declinedAt !== undefined) row.declined_at = input.declinedAt
  if (input.declineReason !== undefined) row.decline_reason = input.declineReason
  if (input.followUpDisabled !== undefined) row.follow_up_disabled = input.followUpDisabled
  if (input.followUpDisabledAt !== undefined) row.follow_up_disabled_at = input.followUpDisabledAt
  // Pas de colonne sent_at sur Devis (cf. quoteSentAt pour la date de premier envoi) —
  // ne jamais écrire input.sentAt ici sous peine de PGRST204 (échec atomique de l'update).
  if (input.sentSnapshotId !== undefined) row.sent_snapshot_id = input.sentSnapshotId
  if (input.acceptedSnapshotId !== undefined) row.accepted_snapshot_id = input.acceptedSnapshotId
  if (input.declinedSnapshotId !== undefined) row.declined_snapshot_id = input.declinedSnapshotId
  if (input.acceptedByName !== undefined) row.accepted_by_name = input.acceptedByName
  if (input.acceptedByEmail !== undefined) row.accepted_by_email = input.acceptedByEmail
  if (input.acceptedUserAgent !== undefined) row.accepted_user_agent = input.acceptedUserAgent

  delete row.artisan_id

  return row
}
