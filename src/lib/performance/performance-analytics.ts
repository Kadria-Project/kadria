/**
 * Analytics core for the /performance workspace (Lot 2).
 *
 * Extends performanceService.ts without duplicating its KPI definitions —
 * every function below either reuses those definitions directly or documents
 * precisely why a different (but compatible) rule was needed.
 *
 * Nothing here talks to Supabase — pure functions over already-fetched rows.
 */

import { getComparisonRange } from './date-range'
import { getRevenue } from './performanceService'
import type {
  AtRiskOpportunitySummary,
  ConversionRateDataPoint,
  ConversionRateSeries,
  DateRange,
  FunnelStage,
  LeadSourceDistribution,
  LeadSourceFamily,
  LeadSourceMetric,
  PipelineDistribution,
  PipelineStatusMetric,
  RevenueDataPoint,
  RevenueSeries,
  StageDurationMetric,
} from './performance-types'

type Row = Record<string, unknown>

/** Shared with performance-actions.ts (Lot 3) \u2014 single normalization rule for statuses. */
export function normalizeStatus(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function toDate(value: unknown): Date | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

export function inRange(value: unknown, range: DateRange): boolean {
  const date = toDate(value)
  if (!date) return false
  return date >= range.start && date < range.end
}

export const WON_PROJECT_STATUSES = new Set(['gagne', 'won'])
export const QUALIFIED_PROJECT_STATUSES = new Set([
  'qualifie',
  'en cours',
  'devis envoye',
  'gagne', 'won',
  'perdu', 'lost',
])
export const LOST_PROJECT_STATUSES = new Set(['perdu', 'lost'])

/** Un devis envoy\u00e9 depuis plus longtemps que ce d\u00e9lai, sans d\u00e9cision, est consid\u00e9r\u00e9 "\u00e0 relancer" / "\u00e0 risque". Source unique \u2014 voir getAtRiskOpportunityValue. */
export const STALE_QUOTE_MS = 5 * 24 * 60 * 60 * 1000

export function isAcceptedQuote(quote: Row): boolean {
  return quote.accepted === true || normalizeStatus(quote.accepted) === 'true' || Boolean(quote.accepted_at) || normalizeStatus(quote.statut ?? quote.status) === 'accepte'
}

export function isDeclinedQuote(quote: Row): boolean {
  return Boolean(quote.declined_at) || Boolean(quote.decline_reason) || normalizeStatus(quote.statut ?? quote.status) === 'refuse'
}

export function isSentQuote(quote: Row): boolean {
  return Boolean(quote.quote_sent_at) || normalizeStatus(quote.statut ?? quote.status).startsWith('envoy')
}

export function quoteAmount(quote: Row): number {
  return Number(quote.total_ttc ?? quote.total_ht ?? 0) || 0
}

/* ------------------------------------------------------------------ */
/* 1. Revenue evolution                                                */
/* ------------------------------------------------------------------ */

type Granularity = RevenueSeries['granularity']

function pickGranularity(range: DateRange): Granularity {
  const spanMs = range.end.getTime() - range.start.getTime()
  const hour = 60 * 60 * 1000
  const day = 24 * hour
  if (spanMs <= day) return 'hour'
  if (spanMs <= 31 * day) return 'day'
  if (spanMs <= 120 * day) return 'week'
  return 'month'
}

function bucketStart(date: Date, granularity: Granularity): Date {
  if (granularity === 'hour') return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours())
  if (granularity === 'day') return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (granularity === 'week') {
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const weekday = (day.getDay() + 6) % 7 // Monday = 0
    day.setDate(day.getDate() - weekday)
    return day
  }
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function bucketLabel(date: Date, granularity: Granularity): string {
  if (granularity === 'hour') return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (granularity === 'day') return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  if (granularity === 'week') return `Sem. du ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

function quoteWonDate(quote: Row): unknown {
  // `Devis.updated_at` is not part of the historical schema. A missing
  // acceptance date falls back to creation solely to place legacy accepted
  // quotes in a chronological bucket.
  return quote.accepted_at ?? quote.created_at
}

/**
 * Chiffre d'affaires par intervalle — même définition que le KPI CA du Lot 1
 * (`getRevenue` de performanceService.ts) : somme des `total_ttc` des devis
 * gagnés, ventilée par bucket temporel plutôt qu'agrégée sur toute la période.
 */
export function getRevenueSeries(quotes: Row[], range: DateRange, previousRange: DateRange): RevenueSeries {
  const granularity = pickGranularity(range)
  const buckets = new Map<string, { start: Date; revenue: number }>()

  for (const quote of quotes) {
    if (!isAcceptedQuote(quote)) continue
    const wonDate = toDate(quoteWonDate(quote))
    if (!wonDate || !inRange(wonDate, range)) continue
    const start = bucketStart(wonDate, granularity)
    const key = start.toISOString()
    const existing = buckets.get(key)
    if (existing) existing.revenue += quoteAmount(quote)
    else buckets.set(key, { start, revenue: quoteAmount(quote) })
  }

  const points: RevenueDataPoint[] = Array.from(buckets.values())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((bucket) => ({ bucketStart: bucket.start.toISOString(), label: bucketLabel(bucket.start, granularity), revenue: bucket.revenue }))

  const total = getRevenue(quotes, range)
  const previousTotal = getRevenue(quotes, previousRange)

  return { points, granularity, total, previousTotal }
}

/* ------------------------------------------------------------------ */
/* 2. Lead sources                                                     */
/* ------------------------------------------------------------------ */

/**
 * Normalizes the raw `source` value stored on a project
 * into one of the honest families we can actually observe in the data.
 * Values with no recognizable meaning are grouped under "Source inconnue"
 * rather than dropped or invented.
 */
export function normalizeProjectSource(rawSource: unknown): LeadSourceFamily {
  const raw = String(rawSource ?? '').toLowerCase().trim()
  if (!raw) return 'Source inconnue'
  if (['vapi', 'voice', 'telephone', 'téléphone', 'phone'].includes(raw)) return 'Assistant vocal'
  if (['chat-widget', 'assistant-web', 'widget'].includes(raw)) return 'Assistant web'
  if (['site-vitrine', 'site_vitrine', 'site_vitrine_demo'].includes(raw)) return 'Site vitrine'
  if (raw.includes('google')) return 'Google'
  if (raw.includes('whatsapp')) return 'WhatsApp'
  if (['facebook', 'instagram', 'linkedin', 'reseaux-sociaux', 'reseaux_sociaux', 'social'].some((token) => raw.includes(token))) return 'Réseaux sociaux'
  if (raw.includes('recommand')) return 'Recommandation'
  if (['artisan', 'manual', 'team-planning'].includes(raw)) return 'Saisie manuelle'
  if (raw === 'web' || raw === 'client') return 'Source inconnue'
  return 'Autres'
}

/** Répartition des dossiers créés sur la période, par source normalisée. */
export function getLeadSourceDistribution(projects: Row[], range: DateRange): LeadSourceDistribution {
  const inPeriod = projects.filter((project) => inRange(project.created_at, range))
  const counts = new Map<LeadSourceFamily, number>()
  for (const project of inPeriod) {
    const family = normalizeProjectSource(project.source)
    counts.set(family, (counts.get(family) || 0) + 1)
  }
  const total = inPeriod.length
  const sources: LeadSourceMetric[] = Array.from(counts.entries())
    .map(([source, count]) => ({ source, count, percent: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count)
  return { total, sources }
}

/* ------------------------------------------------------------------ */
/* 3. Conversion funnel                                                */
/* ------------------------------------------------------------------ */

/**
 * Tunnel de conversion commercial pour les dossiers créés sur la période.
 * Étapes déterminées à partir des vrais statuts (`Projects.status`, réutilise
 * la même définition "qualifié"/"gagné" que le KPI Lot 1) et des vrais
 * événements devis (`quote_sent_at`, `accepted`/`accepted_at`).
 */
export function getConversionFunnel(projects: Row[], quotes: Row[], range: DateRange): FunnelStage[] {
  const inPeriod = projects.filter((project) => inRange(project.created_at, range))
  const idsInPeriod = new Set(inPeriod.map((project) => String(project.id)))
  const quotesByProject = new Map<string, Row[]>()
  for (const quote of quotes) {
    const projectId = String(quote.project_id ?? '')
    if (!idsInPeriod.has(projectId)) continue
    const list = quotesByProject.get(projectId) || []
    list.push(quote)
    quotesByProject.set(projectId, list)
  }

  const received = inPeriod
  const qualified = inPeriod.filter((project) => QUALIFIED_PROJECT_STATUSES.has(normalizeStatus(project.status)))
  const quoteSentProjects = inPeriod.filter((project) => (quotesByProject.get(String(project.id)) || []).some(isSentQuote))
  const quoteAcceptedProjects = inPeriod.filter((project) => (quotesByProject.get(String(project.id)) || []).some(isAcceptedQuote))
  const won = inPeriod.filter((project) => WON_PROJECT_STATUSES.has(normalizeStatus(project.status)))

  function stageValue(list: Row[], predicate: (quote: Row) => boolean): number {
    let total = 0
    for (const project of list) {
      const quoteList = quotesByProject.get(String(project.id)) || []
      const relevant = quoteList.filter(predicate)
      if (relevant.length === 0) continue
      total += Math.max(...relevant.map(quoteAmount))
    }
    return total
  }

  function rate(count: number, previousCount: number): number | null {
    if (previousCount <= 0) return count > 0 ? null : 0
    return count / previousCount
  }

  const stages: FunnelStage[] = [
    { id: 'received', label: 'Demandes reçues', count: received.length, conversionFromPrevious: null, value: null },
    { id: 'qualified', label: 'Dossiers qualifiés', count: qualified.length, conversionFromPrevious: rate(qualified.length, received.length), value: null },
    {
      id: 'quoteSent',
      label: 'Devis envoyés',
      count: quoteSentProjects.length,
      conversionFromPrevious: rate(quoteSentProjects.length, qualified.length),
      value: stageValue(quoteSentProjects, isSentQuote),
    },
    {
      id: 'quoteAccepted',
      label: 'Devis acceptés',
      count: quoteAcceptedProjects.length,
      conversionFromPrevious: rate(quoteAcceptedProjects.length, quoteSentProjects.length),
      value: stageValue(quoteAcceptedProjects, isAcceptedQuote),
    },
    {
      id: 'won',
      label: 'Chantiers gagnés',
      count: won.length,
      conversionFromPrevious: rate(won.length, quoteAcceptedProjects.length),
      value: stageValue(won, isAcceptedQuote),
    },
  ]

  return stages
}

/* ------------------------------------------------------------------ */
/* 4. At-risk opportunity value                                        */
/* ------------------------------------------------------------------ */

/**
 * Valeur actuellement à risque (jamais "perdue" — on ne peut pas prouver
 * qu'une opportunité est définitivement perdue à partir des données
 * disponibles) : devis envoyés depuis plus de 5 jours, non acceptés et non
 * refusés, pour des dossiers non clôturés. Règle unique, déterministe.
 */
export function getAtRiskOpportunityValue(projects: Row[], quotes: Row[], now: Date = new Date()): AtRiskOpportunitySummary {
  const projectStatusById = new Map(projects.map((project) => [String(project.id), normalizeStatus(project.status)]))

  const atRiskQuotes = quotes.filter((quote) => {
    if (isAcceptedQuote(quote) || isDeclinedQuote(quote)) return false
    if (!isSentQuote(quote)) return false
    const sentAt = toDate(quote.quote_sent_at)
    if (!sentAt) return false
    if (now.getTime() - sentAt.getTime() < STALE_QUOTE_MS) return false
    const projectStatus = projectStatusById.get(String(quote.project_id ?? ''))
    if (projectStatus && (WON_PROJECT_STATUSES.has(projectStatus) || LOST_PROJECT_STATUSES.has(projectStatus))) return false
    return true
  })

  const amount = atRiskQuotes.reduce((total, quote) => total + quoteAmount(quote), 0)
  const count = atRiskQuotes.length

  return {
    nature: 'atRisk',
    amount,
    count,
    ruleDescription:
      "Devis envoyés depuis plus de 5 jours, sans acceptation ni refus, pour des dossiers toujours ouverts.",
    mainLeak: count > 0 ? `${count} devis sans décision depuis plus de 5 jours` : null,
  }
}

/* ------------------------------------------------------------------ */
/* 5. Conversion rate evolution                                        */
/* ------------------------------------------------------------------ */

/**
 * Série temporelle du taux de transformation — même définition que le KPI
 * Lot 1 (`getConversionRate` de performanceService.ts) : dossiers gagnés /
 * dossiers qualifiés, ventilée par bucket au lieu d'agrégée sur la période.
 */
export function getConversionRateSeries(projects: Row[], range: DateRange, previousRange: DateRange | null): ConversionRateSeries {
  const granularity = pickGranularity(range)
  const buckets = new Map<string, { start: Date; qualified: number; won: number }>()

  for (const project of projects) {
    const createdAt = toDate(project.created_at)
    if (!createdAt || !inRange(createdAt, range)) continue
    const status = normalizeStatus(project.status)
    if (!QUALIFIED_PROJECT_STATUSES.has(status)) continue
    const start = bucketStart(createdAt, granularity)
    const key = start.toISOString()
    const bucket = buckets.get(key) || { start, qualified: 0, won: 0 }
    bucket.qualified += 1
    if (WON_PROJECT_STATUSES.has(status)) bucket.won += 1
    buckets.set(key, bucket)
  }

  const points: ConversionRateDataPoint[] = Array.from(buckets.values())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((bucket) => ({
      bucketStart: bucket.start.toISOString(),
      label: bucketLabel(bucket.start, granularity),
      rate: bucket.qualified > 0 ? bucket.won / bucket.qualified : 0,
      qualifiedCount: bucket.qualified,
      wonCount: bucket.won,
    }))

  const totalQualified = points.reduce((sum, point) => sum + point.qualifiedCount, 0)
  const totalWon = points.reduce((sum, point) => sum + point.wonCount, 0)
  const average = totalQualified > 0 ? totalWon / totalQualified : 0

  let previousAverage: number | null = null
  if (previousRange) {
    const prevQualified = projects.filter((project) => {
      const createdAt = project.created_at
      return inRange(createdAt, previousRange) && QUALIFIED_PROJECT_STATUSES.has(normalizeStatus(project.status))
    })
    const prevWon = prevQualified.filter((project) => WON_PROJECT_STATUSES.has(normalizeStatus(project.status)))
    previousAverage = prevQualified.length > 0 ? prevWon.length / prevQualified.length : null
  }

  return { points, average, previousAverage }
}

/* ------------------------------------------------------------------ */
/* 6. Average stage durations                                          */
/* ------------------------------------------------------------------ */

function averageMinutesBetween(pairs: Array<[Date, Date]>): { averageMinutes: number; sampleSize: number } {
  const valid = pairs.filter(([from, to]) => to.getTime() >= from.getTime())
  if (valid.length === 0) return { averageMinutes: 0, sampleSize: 0 }
  const totalMinutes = valid.reduce((sum, [from, to]) => sum + (to.getTime() - from.getTime()) / 60000, 0)
  return { averageMinutes: totalMinutes / valid.length, sampleSize: valid.length }
}

/**
 * Délais moyens entre étapes, calculés UNIQUEMENT à partir de dates métier
 * probantes (jamais `updated_at`). "Qualification" n'a pas de date dédiée en
 * base (seul `status` existe, sans horodatage de transition fiable) : cette
 * étape est donc explicitement indisponible plutôt que devinée.
 */
export function getAverageStageDurations(projects: Row[], quotes: Row[], range: DateRange): StageDurationMetric[] {
  const quotesByProject = new Map<string, Row[]>()
  for (const quote of quotes) {
    const projectId = String(quote.project_id ?? '')
    const list = quotesByProject.get(projectId) || []
    list.push(quote)
    quotesByProject.set(projectId, list)
  }

  const projectsInPeriod = projects.filter((project) => inRange(project.created_at, range))

  const createdToSentPairs: Array<[Date, Date]> = []
  const sentToAcceptedPairs: Array<[Date, Date]> = []
  const createdToWonPairs: Array<[Date, Date]> = []

  for (const project of projectsInPeriod) {
    const createdAt = toDate(project.created_at)
    if (!createdAt) continue
    const quoteList = quotesByProject.get(String(project.id)) || []
    const firstSent = quoteList
      .map((quote) => toDate(quote.quote_sent_at))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime())[0]
    if (firstSent) createdToSentPairs.push([createdAt, firstSent])

    for (const quote of quoteList) {
      const sentAt = toDate(quote.quote_sent_at)
      const acceptedAt = toDate(quote.accepted_at)
      if (sentAt && acceptedAt) sentToAcceptedPairs.push([sentAt, acceptedAt])
      if (acceptedAt && WON_PROJECT_STATUSES.has(normalizeStatus(project.status))) createdToWonPairs.push([createdAt, acceptedAt])
    }
  }

  const createdToSent = averageMinutesBetween(createdToSentPairs)
  const sentToAccepted = averageMinutesBetween(sentToAcceptedPairs)
  const createdToWon = averageMinutesBetween(createdToWonPairs)

  return [
    {
      id: 'createdToQuoteSent',
      label: 'Création → Devis envoyé',
      available: createdToSent.sampleSize > 0,
      averageMinutes: createdToSent.sampleSize > 0 ? createdToSent.averageMinutes : null,
      sampleSize: createdToSent.sampleSize,
      unavailableReason: createdToSent.sampleSize > 0 ? null : 'Aucun devis envoyé avec date connue sur la période.',
    },
    {
      id: 'quoteSentToAccepted',
      label: 'Devis envoyé → Acceptation',
      available: sentToAccepted.sampleSize > 0,
      averageMinutes: sentToAccepted.sampleSize > 0 ? sentToAccepted.averageMinutes : null,
      sampleSize: sentToAccepted.sampleSize,
      unavailableReason: sentToAccepted.sampleSize > 0 ? null : 'Aucun devis accepté avec date d\'envoi connue sur la période.',
    },
    {
      id: 'createdToWon',
      label: 'Création → Gain',
      available: createdToWon.sampleSize > 0,
      averageMinutes: createdToWon.sampleSize > 0 ? createdToWon.averageMinutes : null,
      sampleSize: createdToWon.sampleSize,
      unavailableReason:
        createdToWon.sampleSize > 0
          ? null
          : "Aucun dossier gagné avec date d'acceptation de devis connue sur la période.",
    },
  ]
}

/* ------------------------------------------------------------------ */
/* 7. Pipeline distribution                                             */
/* ------------------------------------------------------------------ */

const PIPELINE_STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  'a rappeler': 'À rappeler',
  qualifie: 'Qualifié',
  'en cours': 'En cours',
  'devis envoye': 'Devis envoyé',
  'devis accepte': 'Devis accepté',
  'acompte demande': 'Acompte demandé',
  'acompte paye': 'Acompte payé',
  'realisation du projet': 'Réalisation du projet',
  gagne: 'Gagné',
  perdu: 'Perdu',
}

/**
 * Répartition du statut actuel des dossiers CRÉÉS pendant la période
 * sélectionnée (et non de l'ensemble du pipeline à date actuelle — voir
 * consigne du lot). Les statuts inconnus sont regroupés explicitement sous
 * "Statut inconnu" plutôt que masqués.
 */
export function getPipelineDistribution(projects: Row[], range: DateRange): PipelineDistribution {
  const inPeriod = projects.filter((project) => inRange(project.created_at, range))
  const counts = new Map<string, number>()
  for (const project of inPeriod) {
    const normalized = normalizeStatus(project.status)
    const label = PIPELINE_STATUS_LABELS[normalized] || (normalized ? String(project.status) : 'Statut inconnu')
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  const total = inPeriod.length
  const statuses: PipelineStatusMetric[] = Array.from(counts.entries())
    .map(([status, count]) => ({ status, count, percent: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count)
  return { total, statuses }
}

export { getComparisonRange }
