// Snapshots legaux immuables des devis (mission "legal-snapshot system").
// Capture un JSON figé a 3 moments : envoi, acceptation, refus.
// Ces snapshots sont des preuves — ils ne doivent jamais bloquer les flux
// d'envoi/acceptation/refus en cas d'erreur (toujours try/catch, jamais throw).

import { supabaseAdmin } from '@/src/lib/supabase/server'
import { mapSupabaseProject, type SupabaseProject } from '@/src/lib/supabase/mapping'
import type { SupabaseArtisanConfig } from '@/src/lib/supabase/mapping'
import type { DevisRecord } from '@/src/lib/airtable'
import {
  getPricingMention,
  getVatExemptionMention,
  getInsuranceLines,
  getDelayMention,
  getLaborMention,
  getTravelFeeMention,
} from '@/src/lib/devis-legal'
import type { QuoteCommercialSettings } from '@/src/lib/quote-suggestions'

const SNAPSHOT_TABLE = 'devis_snapshots'

export type DevisSnapshotType = 'sent' | 'accepted' | 'declined'

interface DevisLineLike {
  type?: 'item' | 'section'
  description?: string
  quantity?: number
  unit?: string
  unitPrice?: number
  tvaRate?: number
}

interface SnapshotLine {
  description: string
  quantity: number
  unit: string
  unitPriceHT: number
  vatRate: number
  totalHT: number
  totalVAT: number
  totalTTC: number
}

export interface DevisSnapshotPayload {
  snapshotVersion: 1
  snapshotType: DevisSnapshotType
  createdAt: string
  createdAsFallbackAtAcceptance?: true
  devis: {
    id: string
    number: string
    status: string
    publicToken: string
    issueDate: string
    validUntil: string
  }
  artisan: {
    id: string
    companyName: string
    legalStatus: string
    siret: string
    vatNumber: string
    email: string
    phone: string
    address: string
  }
  client: {
    name: string
    email: string
    phone: string
    address: string
  }
  project: {
    id: string | null
    title: string | null
    type: string | null
    address: string | null
    city: string | null
    postalCode: string | null
    summary: string | null
  }
  lines: SnapshotLine[]
  totals: {
    totalHT: number
    totalVAT: number
    totalTTC: number
    vatMode: string | null
  }
  legalMentions: {
    quotePricingMention: string | null
    vatMention: string | null
    insuranceMention: string[] | null
    estimatedDelayMention: string | null
    laborMention: string | null
    travelFeeMention: string | null
    paymentTerms: string | null
    validityMention: string | null
    acceptanceConsentText: string
  }
  acceptance: null | {
    acceptedAt: string
    acceptedByName: string | null
    acceptedByEmail: string | null
    ip: string | null
    userAgent: string | null
  }
  decline: null | {
    declinedAt: string
    reason: string | null
    ip: string | null
    userAgent: string | null
  }
}

const ACCEPTANCE_CONSENT_TEXT =
  "Devis accepté en ligne par le client — preuve d'acceptation non équivalente à une signature électronique qualifiée."

function parseLignes(lignesJson: string | null | undefined): DevisLineLike[] {
  try {
    const parsed = JSON.parse(lignesJson || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((l) => l && typeof l === 'object' && l.type !== 'section')
  } catch {
    return []
  }
}

function buildSnapshotLines(lignes: DevisLineLike[]): SnapshotLine[] {
  return lignes.map((line) => {
    const quantity = Number(line.quantity) || 0
    const unitPriceHT = Number(line.unitPrice) || 0
    const vatRate = Number(line.tvaRate) || 0
    const totalHT = quantity * unitPriceHT
    const totalVAT = totalHT * (vatRate / 100)
    const totalTTC = totalHT + totalVAT

    return {
      description: String(line.description || ''),
      quantity,
      unit: String(line.unit || ''),
      unitPriceHT,
      vatRate,
      totalHT,
      totalVAT,
      totalTTC,
    }
  })
}

async function fetchProjectForSnapshot(projectId: string | null | undefined): Promise<SupabaseProject | null> {
  if (!projectId) return null

  try {
    const { data, error } = await supabaseAdmin
      .from('Projects')
      .select('*')
      .eq('id', projectId)
      .limit(1)
      .maybeSingle()

    if (error || !data) return null
    return mapSupabaseProject(data)
  } catch (error) {
    console.error('[DEVIS SNAPSHOT] Erreur récupération projet pour snapshot', error)
    return null
  }
}

export interface BuildSnapshotArgs {
  devis: DevisRecord
  config: SupabaseArtisanConfig | null
  project: SupabaseProject | null
  snapshotType: DevisSnapshotType
  isFallback?: boolean
  acceptance?: {
    acceptedAt: string
    acceptedByName?: string | null
    acceptedByEmail?: string | null
    ip?: string | null
    userAgent?: string | null
  } | null
  decline?: {
    declinedAt: string
    reason?: string | null
    ip?: string | null
    userAgent?: string | null
  } | null
}

export function buildDevisSnapshotPayload(args: BuildSnapshotArgs): DevisSnapshotPayload {
  const { devis, config, project, snapshotType, isFallback, acceptance, decline } = args

  const lignes = parseLignes(devis.lignesJson)
  const lines = buildSnapshotLines(lignes)

  const quoteSettings = (config?.businessConfig as { quoteSettings?: QuoteCommercialSettings } | undefined)
    ?.quoteSettings

  const pricingMention = getPricingMention(quoteSettings)
  const vatMention = getVatExemptionMention(quoteSettings?.vatMode)
  const insuranceLines = getInsuranceLines({
    ...quoteSettings,
    insuranceCompany: quoteSettings?.insuranceCompany || config?.assureur,
    insurancePolicyNumber: quoteSettings?.insurancePolicyNumber || config?.numAssurance,
  })
  const fallbackInsuranceMention =
    !insuranceLines && !config?.assuranceNonRequise && config?.assureur
      ? [`Assurance : ${config.assureur}${config.numAssurance ? ` — N° ${config.numAssurance}` : ''}`]
      : null
  const delayMention = getDelayMention(devis.delaiExecution, quoteSettings?.defaultEstimatedDelay)
  const laborMention = getLaborMention(quoteSettings?.laborMentionMode, lignes as { description?: string }[])
  const travelFeeMention = getTravelFeeMention(quoteSettings?.travelFeeMentionMode, lignes as { description?: string }[])

  const payload: DevisSnapshotPayload = {
    snapshotVersion: 1,
    snapshotType,
    createdAt: new Date().toISOString(),
    ...(isFallback ? { createdAsFallbackAtAcceptance: true as const } : {}),
    devis: {
      id: devis.id,
      number: devis.devisNumber,
      status: devis.statut,
      publicToken: devis.token,
      issueDate: devis.dateEmission || null as unknown as string,
      validUntil: devis.dateValidite || null as unknown as string,
    },
    artisan: {
      id: devis.artisanId,
      companyName: config?.raisonSociale || config?.companyName || '',
      legalStatus: config?.formeJuridique || '',
      siret: config?.siret || '',
      vatNumber: config?.tvaNumber || '',
      email: config?.email || '',
      phone: config?.phone || '',
      address: [config?.adressePro, config?.cpPro, config?.villePro].filter(Boolean).join(' '),
    },
    client: {
      name: devis.clientName || '',
      email: devis.clientEmail || '',
      phone: devis.clientPhone || '',
      address: devis.clientAddress || '',
    },
    project: {
      id: project?.id ?? null,
      title: project?.projectType || project?.trade || null,
      type: project?.projectType ?? null,
      address: project?.siteAddress ?? null,
      city: project?.city ?? null,
      postalCode: project?.postalCode ?? null,
      summary: project?.aiSummary ?? null,
    },
    lines,
    totals: {
      totalHT: devis.totalHT,
      totalVAT: devis.totalTVA,
      totalTTC: devis.totalTTC,
      vatMode: quoteSettings?.vatMode ?? null,
    },
    legalMentions: {
      quotePricingMention: pricingMention ?? null,
      vatMention: vatMention ?? null,
      insuranceMention: insuranceLines || fallbackInsuranceMention || null,
      estimatedDelayMention: delayMention ?? null,
      laborMention: laborMention ?? null,
      travelFeeMention: travelFeeMention ?? null,
      paymentTerms: devis.conditionsPaiement || null,
      validityMention: devis.dateValidite || null,
      acceptanceConsentText: ACCEPTANCE_CONSENT_TEXT,
    },
    acceptance: acceptance
      ? {
          acceptedAt: acceptance.acceptedAt,
          acceptedByName: acceptance.acceptedByName ?? null,
          acceptedByEmail: acceptance.acceptedByEmail ?? null,
          ip: acceptance.ip ?? null,
          userAgent: acceptance.userAgent ?? null,
        }
      : null,
    decline: decline
      ? {
          declinedAt: decline.declinedAt,
          reason: decline.reason ?? null,
          ip: decline.ip ?? null,
          userAgent: decline.userAgent ?? null,
        }
      : null,
  }

  return payload
}

export interface DevisSnapshotRow {
  id: string
  devis_id?: string
  snapshot_type?: string
  snapshot_json?: unknown
  created_at?: string
  [key: string]: unknown
}

// Cache des colonnes réellement présentes sur devis_snapshots, pour éviter de
// sonder la table à chaque insertion (mais sans jamais throw si la sonde échoue).
// IMPORTANT : ce set de repli doit toujours contenir les colonnes NOT NULL réelles
// (artisan_id notamment) — sinon une table vide forcerait un insert sans artisan_id
// à chaque tentative, qui échouerait, qui laisserait la table vide, indéfiniment.
let cachedColumns: Set<string> | null = null

const FALLBACK_SNAPSHOT_COLUMNS = ['devis_id', 'snapshot_type', 'snapshot_json', 'created_at', 'artisan_id']

async function getSnapshotTableColumns(): Promise<Set<string>> {
  if (cachedColumns) return cachedColumns

  try {
    const { data, error } = await supabaseAdmin.from(SNAPSHOT_TABLE).select('*').limit(1)
    if (error || !data) {
      cachedColumns = new Set(FALLBACK_SNAPSHOT_COLUMNS)
      return cachedColumns
    }

    if (data.length > 0) {
      cachedColumns = new Set(Object.keys(data[0] as Record<string, unknown>))
    } else {
      // Table vide : on ne peut pas déduire les colonnes, on retombe sur le set minimal sûr.
      cachedColumns = new Set(FALLBACK_SNAPSHOT_COLUMNS)
    }

    return cachedColumns
  } catch (error) {
    console.error('[DEVIS SNAPSHOT] Erreur sondage colonnes devis_snapshots', error)
    cachedColumns = new Set(FALLBACK_SNAPSHOT_COLUMNS)
    return cachedColumns
  }
}

// Résout l'artisan_id à utiliser pour un snapshot, dans l'ordre de confiance suivant :
// 1. devis.artisan_id (source la plus fiable, fixée à la création du devis)
// 2. project.artisan_id (projet lié, utile pour les routes publiques sans session)
// 3. fallbackArtisanId (ex: session.artisanId pour les routes authentifiées)
// Ne retourne jamais une chaîne vide silencieuse : retourne null si rien n'est résolu,
// pour que l'appelant logue et abandonne l'insertion plutôt que de violer la contrainte NOT NULL.
export function resolveDevisSnapshotArtisanId(
  devis: DevisRecord,
  project: SupabaseProject | null,
  fallbackArtisanId?: string | null
): string | null {
  if (devis.artisanId) return devis.artisanId
  if (project?.artisanId) return project.artisanId
  if (fallbackArtisanId) return fallbackArtisanId
  return null
}

export async function getExistingSnapshot(
  devisId: string,
  snapshotType: DevisSnapshotType
): Promise<DevisSnapshotRow | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from(SNAPSHOT_TABLE)
      .select('*')
      .eq('devis_id', devisId)
      .eq('snapshot_type', snapshotType)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[DEVIS SNAPSHOT] Erreur lecture snapshot existant', error)
      return null
    }

    return (data as DevisSnapshotRow) || null
  } catch (error) {
    console.error('[DEVIS SNAPSHOT] Exception lecture snapshot existant', error)
    return null
  }
}

async function insertSnapshotRow(
  devis: DevisRecord,
  payload: DevisSnapshotPayload,
  extraFields: Record<string, unknown>,
  resolvedArtisanId: string | null,
  projectId: string | null
): Promise<DevisSnapshotRow | null> {
  if (!resolvedArtisanId) {
    console.error('[DEVIS SNAPSHOT] artisan_id introuvable', {
      devisId: devis.id,
      projectId,
      snapshotType: payload.snapshotType,
    })
    return null
  }

  try {
    const columns = await getSnapshotTableColumns()

    const row: Record<string, unknown> = {
      devis_id: devis.id,
      snapshot_type: payload.snapshotType,
      snapshot_json: payload,
    }

    if (columns.has('created_at')) row.created_at = payload.createdAt
    if (columns.has('devis_number')) row.devis_number = devis.devisNumber
    if (columns.has('public_token')) row.public_token = devis.token
    if (columns.has('sent_to_email')) row.sent_to_email = devis.clientEmail || null
    if (columns.has('artisan_id')) row.artisan_id = resolvedArtisanId
    if (columns.has('legal_mentions_json')) row.legal_mentions_json = payload.legalMentions
    if (columns.has('totals_json')) row.totals_json = payload.totals
    if (columns.has('client_json')) row.client_json = payload.client
    if (columns.has('artisan_json')) row.artisan_json = payload.artisan
    if (columns.has('project_json')) row.project_json = payload.project
    if (columns.has('lines_json')) row.lines_json = payload.lines

    for (const [key, value] of Object.entries(extraFields)) {
      if (columns.has(key)) row[key] = value
    }

    const { data, error } = await supabaseAdmin.from(SNAPSHOT_TABLE).insert(row).select().single()

    if (error) {
      console.error('[DEVIS SNAPSHOT] Erreur insertion snapshot', error)
      return null
    }

    return data as DevisSnapshotRow
  } catch (error) {
    console.error('[DEVIS SNAPSHOT] Exception insertion snapshot', error)
    return null
  }
}

export interface CreateSnapshotArgs {
  devis: DevisRecord
  config: SupabaseArtisanConfig | null
  project?: SupabaseProject | null
  options?: { isFallback?: boolean }
  fallbackArtisanId?: string | null
}

// Création du snapshot "sent" — idempotente : si un snapshot sent existe déjà
// pour ce devis, on le renvoie tel quel sans dupliquer ni écraser.
export async function createSentDevisSnapshot(args: CreateSnapshotArgs): Promise<DevisSnapshotRow | null> {
  const { devis, config, options } = args

  try {
    const existing = await getExistingSnapshot(devis.id, 'sent')
    if (existing) return existing

    const project = args.project !== undefined ? args.project : await fetchProjectForSnapshot(devis.projectId)
    const artisanId = resolveDevisSnapshotArtisanId(devis, project, args.fallbackArtisanId)

    const payload = buildDevisSnapshotPayload({
      devis,
      config,
      project,
      snapshotType: 'sent',
      isFallback: options?.isFallback,
    })

    return await insertSnapshotRow(devis, payload, {}, artisanId, project?.id ?? devis.projectId ?? null)
  } catch (error) {
    console.error('[DEVIS SNAPSHOT] Erreur création snapshot sent', error)
    return null
  }
}

export interface CreateAcceptedSnapshotArgs {
  devis: DevisRecord
  config: SupabaseArtisanConfig | null
  project?: SupabaseProject | null
  fallbackArtisanId?: string | null
  acceptance: {
    acceptedAt: string
    acceptedByName?: string | null
    acceptedByEmail?: string | null
    ip?: string | null
    userAgent?: string | null
  }
}

// Création du snapshot "accepted" — idempotente, comme pour "sent".
export async function createAcceptedDevisSnapshot(
  args: CreateAcceptedSnapshotArgs
): Promise<DevisSnapshotRow | null> {
  const { devis, config, acceptance } = args

  try {
    const existing = await getExistingSnapshot(devis.id, 'accepted')
    if (existing) return existing

    const project = args.project !== undefined ? args.project : await fetchProjectForSnapshot(devis.projectId)
    const artisanId = resolveDevisSnapshotArtisanId(devis, project, args.fallbackArtisanId)

    const payload = buildDevisSnapshotPayload({
      devis,
      config,
      project,
      snapshotType: 'accepted',
      acceptance,
    })

    return await insertSnapshotRow(
      devis,
      payload,
      {
        accepted_by_name: acceptance.acceptedByName ?? null,
        accepted_by_email: acceptance.acceptedByEmail ?? null,
        accepted_ip: acceptance.ip ?? null,
        accepted_user_agent: acceptance.userAgent ?? null,
      },
      artisanId,
      project?.id ?? devis.projectId ?? null
    )
  } catch (error) {
    console.error('[DEVIS SNAPSHOT] Erreur création snapshot accepted', error)
    return null
  }
}

export interface CreateDeclinedSnapshotArgs {
  devis: DevisRecord
  config: SupabaseArtisanConfig | null
  project?: SupabaseProject | null
  fallbackArtisanId?: string | null
  decline: {
    declinedAt: string
    reason?: string | null
    ip?: string | null
    userAgent?: string | null
  }
}

// Création du snapshot "declined" — idempotente, comme pour "sent"/"accepted".
export async function createDeclinedDevisSnapshot(
  args: CreateDeclinedSnapshotArgs
): Promise<DevisSnapshotRow | null> {
  const { devis, config, decline } = args

  try {
    const existing = await getExistingSnapshot(devis.id, 'declined')
    if (existing) return existing

    const project = args.project !== undefined ? args.project : await fetchProjectForSnapshot(devis.projectId)
    const artisanId = resolveDevisSnapshotArtisanId(devis, project, args.fallbackArtisanId)

    const payload = buildDevisSnapshotPayload({
      devis,
      config,
      project,
      snapshotType: 'declined',
      decline,
    })

    return await insertSnapshotRow(
      devis,
      payload,
      { declined_reason: decline.reason ?? null },
      artisanId,
      project?.id ?? devis.projectId ?? null
    )
  } catch (error) {
    console.error('[DEVIS SNAPSHOT] Erreur création snapshot declined', error)
    return null
  }
}
