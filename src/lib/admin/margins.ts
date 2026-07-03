import 'server-only'
import { getAllUsers, type UserRecord } from '@/src/lib/airtable'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentPeriodMonth, getMonthlyUsageSummary } from '@/src/lib/usage/quotas'
import { getPlanLabel, normalizePlan } from '@/src/lib/plans'

type CostAlertLevel = 'ok' | 'warning' | 'danger' | 'non_rentable' | 'no_revenue' | 'price_missing' | 'unknown_plan'

type SupportedPlanKey = 'essentiel' | 'performance' | 'agence' | 'unknown'

type TrackedMetricStatus = 'tracked' | 'estimated' | 'not_tracked'

interface UsageCostBreakdown {
  voice: number
  sms: number
  email: number
  openai: number
  other: number
  fixed: number
  total: number
}

interface RevenueSummary {
  amount: number
  source: 'plan_default' | 'user_field' | 'none'
  note?: string
}

interface MarginRow {
  artisanId: string
  userId: string
  artisanName: string
  companyName: string
  planLabel: string
  planKey: SupportedPlanKey
  status: string
  revenueMonthlyEstimated: number
  revenueNote: string | null
  projectsCreatedThisMonth: number
  voiceCallsThisMonth: number
  voiceMinutesThisMonth: number
  smsSentThisMonth: number
  smsTracked: boolean
  emailsSentThisMonth: number
  emailsTracked: boolean
  costVoiceEstimated: number
  costSmsEstimated: number
  costEmailEstimated: number
  costOpenAiEstimated: number
  costOtherEstimated: number
  costFixedEstimated: number
  totalCostEstimated: number
  grossMarginEstimated: number
  grossMarginRate: number | null
  costToRevenueRatio: number | null
  alertLevel: CostAlertLevel
  alertLabel: string
  alertReason: string
}

export interface AdminMarginsData {
  periodMonth: string
  tracked: {
    revenue: TrackedMetricStatus
    voice: TrackedMetricStatus
    sms: TrackedMetricStatus
    email: TrackedMetricStatus
    openai: TrackedMetricStatus
    other: TrackedMetricStatus
  }
  assumptions: {
    revenueByPlan: Record<string, number>
    costPerVapiMinuteEur: number
    costPerSmsEur: number
    costPerEmailEur: number
    costPerProjectAiEur: number
    fixedCostPerArtisanEur: number
  }
  kpis: {
    revenueMonthlyEstimated: number
    costsUsageEstimated: number
    grossMarginEstimated: number
    grossMarginRate: number | null
    activeArtisans: number
    averageCostPerArtisan: number
    averageMarginPerArtisan: number
  }
  breakdown: UsageCostBreakdown
  artisans: MarginRow[]
}

const PLAN_REVENUE_DEFAULTS = {
  essentiel: 149,
  performance: 249,
  agence: 0,
} as const

const COST_PER_VAPI_MINUTE_EUR = 0.12
const COST_PER_SMS_EUR = 0.08
const COST_PER_EMAIL_EUR = 0
const COST_PER_PROJECT_AI_EUR = 0.18
const FIXED_COST_PER_ARTISAN_EUR = 0

const USER_PRICE_KEYS = [
  'mrr',
  'monthly_revenue',
  'monthly_price',
  'subscription_amount',
  'plan_price',
  'price_monthly',
] as const

const TABLE_CANDIDATES = {
  users: ['Users'],
  projects: ['Projects'],
  vapiCalls: ['VapiCalls', 'vapi_calls'],
} as const

const tableResolutionCache = new Map<string, string | null>()
const tableColumnCache = new Map<string, string[]>()

function getCurrentMonthBounds(date = new Date()) {
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const nextMonthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))

  return {
    monthStartIso: monthStart.toISOString(),
    nextMonthStartIso: nextMonthStart.toISOString(),
  }
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function asNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeSupportedPlan(plan: string): SupportedPlanKey {
  const normalized = normalizePlan(plan)
  if (normalized === 'essentiel' || normalized === 'performance') return normalized
  if (normalized === 'entreprise') return 'agence'
  if (normalized === 'agence') return 'agence'
  return 'unknown'
}

function getEstimatedPlanRevenue(plan: SupportedPlanKey) {
  if (plan === 'unknown') return 0
  return PLAN_REVENUE_DEFAULTS[plan]
}

function buildRevenueSummary(user: UserRecord, userRow: Record<string, unknown> | null) {
  for (const key of USER_PRICE_KEYS) {
    const candidate = asNumber(userRow?.[key])
    if (candidate !== null) {
      return {
        amount: roundCurrency(candidate),
        source: 'user_field' as const,
        note: `Prix réel depuis Users.${key}`,
      }
    }
  }

  const planKey = normalizeSupportedPlan(user.plan)
  if (planKey === 'unknown') {
    return {
      amount: 0,
      source: 'none' as const,
      note: 'Plan inconnu',
    }
  }

  if (planKey === 'agence') {
    return {
      amount: 0,
      source: 'plan_default' as const,
      note: 'Sur devis / prix non renseigné',
    }
  }

  if (user.statut === 'Trial' || user.statut === 'Suspendu' || user.statut === 'Résilié') {
    return {
      amount: 0,
      source: 'none' as const,
      note: `${user.statut || 'Statut non facturé'} : revenu estimé à 0 €`,
    }
  }

  return {
    amount: getEstimatedPlanRevenue(planKey),
    source: 'plan_default' as const,
    note: `Hypothèse plan ${getPlanLabel(user.plan)}`,
  }
}

async function resolveTableName(key: keyof typeof TABLE_CANDIDATES) {
  const cached = tableResolutionCache.get(key)
  if (cached !== undefined) return cached

  const supabase = getSupabaseAdmin()
  for (const table of TABLE_CANDIDATES[key]) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (!error) {
      tableResolutionCache.set(key, table)
      return table
    }
  }

  tableResolutionCache.set(key, null)
  return null
}

async function getTableColumns(tableName: string) {
  const cached = tableColumnCache.get(tableName)
  if (cached) return cached

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from(tableName).select('*').limit(1)
  if (error) {
    tableColumnCache.set(tableName, [])
    return []
  }

  const row = Array.isArray(data) && data[0] && typeof data[0] === 'object' ? (data[0] as Record<string, unknown>) : {}
  const columns = Object.keys(row)
  tableColumnCache.set(tableName, columns)
  return columns
}

function pickColumn(columns: string[], candidates: string[]) {
  return candidates.find((candidate) => columns.includes(candidate)) || null
}

async function getUserRowsMap() {
  const supabase = getSupabaseAdmin()
  const usersTable = await resolveTableName('users')
  if (!usersTable) return new Map<string, Record<string, unknown>>()

  const { data, error } = await supabase.from(usersTable).select('*')
  if (error || !data) return new Map<string, Record<string, unknown>>()

  const map = new Map<string, Record<string, unknown>>()
  for (const row of data as unknown as Record<string, unknown>[]) {
    const id = typeof row.id === 'string' ? row.id : ''
    const artisanId = typeof row.artisan_id === 'string' ? row.artisan_id : ''
    if (id) map.set(id, row)
    if (artisanId) map.set(artisanId, row)
  }
  return map
}

async function getSmsCountsByArtisan(monthStartIso: string, nextMonthStartIso: string) {
  const supabase = getSupabaseAdmin()
  const projectsTable = await resolveTableName('projects')
  const counts = new Map<string, number>()
  if (!projectsTable) return { counts, tracked: false }

  const columns = await getTableColumns(projectsTable)
  const artisanColumn = pickColumn(columns, ['artisan_id', 'Artisan ID'])
  const sentAtColumn = pickColumn(columns, ['sms_sent_at', 'SMS Sent At'])
  const statusColumn = pickColumn(columns, ['sms_status', 'SMS Status'])

  if (!artisanColumn || !sentAtColumn || !statusColumn) {
    return { counts, tracked: false }
  }

  const { data, error } = await supabase
    .from(projectsTable)
    .select(`${artisanColumn}, ${statusColumn}`)
    .gte(sentAtColumn, monthStartIso)
    .lt(sentAtColumn, nextMonthStartIso)
    .eq(statusColumn, 'sent')

  if (error || !data) return { counts, tracked: false }

  for (const row of data as unknown as Record<string, unknown>[]) {
    const artisanId = typeof row[artisanColumn] === 'string' ? String(row[artisanColumn]) : ''
    if (!artisanId) continue
    counts.set(artisanId, (counts.get(artisanId) || 0) + 1)
  }

  return { counts, tracked: true }
}

async function getVoiceCostByArtisan(monthStartIso: string, nextMonthStartIso: string) {
  const supabase = getSupabaseAdmin()
  const vapiTable = await resolveTableName('vapiCalls')
  const totals = new Map<string, { trackedCost: number; minutes: number }>()
  if (!vapiTable) return { totals, costTracked: false }

  const columns = await getTableColumns(vapiTable)
  const artisanColumn = pickColumn(columns, ['artisan_id', 'Artisan ID'])
  const createdAtColumn = pickColumn(columns, ['created_at', 'Created At'])
  const costColumn = pickColumn(columns, ['estimated_cost', 'cost'])
  const minutesColumn = pickColumn(columns, ['duration_minutes'])
  const secondsColumn = pickColumn(columns, ['duration_seconds'])

  if (!artisanColumn || !createdAtColumn) {
    return { totals, costTracked: false }
  }

  const selectedColumns = [artisanColumn]
  if (costColumn) selectedColumns.push(costColumn)
  if (minutesColumn) selectedColumns.push(minutesColumn)
  if (secondsColumn) selectedColumns.push(secondsColumn)

  const { data, error } = await supabase
    .from(vapiTable)
    .select(selectedColumns.join(', '))
    .gte(createdAtColumn, monthStartIso)
    .lt(createdAtColumn, nextMonthStartIso)

  if (error || !data) return { totals, costTracked: false }

  for (const row of data as unknown as Record<string, unknown>[]) {
    const artisanId = typeof row[artisanColumn] === 'string' ? String(row[artisanColumn]) : ''
    if (!artisanId) continue

    const trackedCost = costColumn ? asNumber(row[costColumn]) || 0 : 0
    const explicitMinutes = minutesColumn ? asNumber(row[minutesColumn]) : null
    const seconds = secondsColumn ? asNumber(row[secondsColumn]) : null
    const derivedMinutes = explicitMinutes ?? (seconds !== null ? seconds / 60 : 0)
    const entry = totals.get(artisanId) || { trackedCost: 0, minutes: 0 }
    entry.trackedCost += trackedCost
    entry.minutes += derivedMinutes
    totals.set(artisanId, entry)
  }

  return { totals, costTracked: Boolean(costColumn) }
}

function computeAlert(revenue: number, totalCost: number, planKey: SupportedPlanKey) {
  if (planKey === 'unknown') {
    return { level: 'unknown_plan' as const, label: 'Plan inconnu', reason: 'Plan non reconnu, revenu estimé à 0 €.' }
  }
  if (planKey === 'agence' && revenue === 0) {
    return { level: 'price_missing' as const, label: 'Prix non renseigné', reason: 'Compte Agence sans prix mensuel réel connu.' }
  }
  if (revenue === 0 && totalCost === 0) {
    return { level: 'no_revenue' as const, label: 'Sans revenu', reason: 'Aucun revenu ni coût suivi sur le mois.' }
  }
  if (revenue === 0 && totalCost > 0) {
    return { level: 'non_rentable' as const, label: 'Non rentable', reason: 'Coûts présents sans revenu associé.' }
  }

  const ratio = totalCost / revenue
  if (ratio >= 1) {
    return { level: 'non_rentable' as const, label: 'Non rentable', reason: 'Le coût estimé dépasse ou égale le revenu mensuel.' }
  }
  if (ratio > 0.4) {
    return { level: 'danger' as const, label: 'Risque', reason: 'Le ratio coût / revenu dépasse 40 %.' }
  }
  if (ratio > 0.25) {
    return { level: 'warning' as const, label: 'À surveiller', reason: 'Le ratio coût / revenu dépasse 25 %.' }
  }
  return { level: 'ok' as const, label: 'OK', reason: 'Le ratio coût / revenu reste sous contrôle.' }
}

export async function getAdminMarginsData(): Promise<AdminMarginsData> {
  const users = (await getAllUsers()).filter((user) => user.role !== 'Admin')
  const [userRowsMap, smsData, voiceData] = await Promise.all([
    getUserRowsMap(),
    (() => {
      const { monthStartIso, nextMonthStartIso } = getCurrentMonthBounds()
      return getSmsCountsByArtisan(monthStartIso, nextMonthStartIso)
    })(),
    (() => {
      const { monthStartIso, nextMonthStartIso } = getCurrentMonthBounds()
      return getVoiceCostByArtisan(monthStartIso, nextMonthStartIso)
    })(),
  ])

  const artisans = await Promise.all(
    users.map(async (user) => {
      const usageSummary = user.artisanId ? await getMonthlyUsageSummary(user.artisanId) : null
      const usageData = usageSummary?.success ? usageSummary.data : null
      const userRow = userRowsMap.get(user.id) || userRowsMap.get(user.artisanId) || null
      const revenue = buildRevenueSummary(user, userRow)
      const planKey = normalizeSupportedPlan(user.plan)
      const planLabel = getPlanLabel(user.plan)

      const projectsCreatedThisMonth = usageData?.projects.used ?? 0
      const voiceCallsThisMonth = usageData?.vapi.callsUsed ?? 0
      const voiceMinutesThisMonth = usageData?.vapi.minutesUsed ?? 0

      const smsSentThisMonth = smsData.counts.get(user.artisanId) || 0
      const emailsSentThisMonth = 0

      const voiceCostTracked = voiceData.totals.get(user.artisanId)?.trackedCost ?? 0
      const voiceCostFallback = voiceMinutesThisMonth * COST_PER_VAPI_MINUTE_EUR
      const costVoiceEstimated = roundCurrency(voiceCostTracked > 0 ? voiceCostTracked : voiceCostFallback)
      const costSmsEstimated = roundCurrency(smsSentThisMonth * COST_PER_SMS_EUR)
      const costEmailEstimated = roundCurrency(emailsSentThisMonth * COST_PER_EMAIL_EUR)
      const costOpenAiEstimated = roundCurrency(projectsCreatedThisMonth * COST_PER_PROJECT_AI_EUR)
      const costOtherEstimated = 0
      const costFixedEstimated = roundCurrency(FIXED_COST_PER_ARTISAN_EUR)
      const totalCostEstimated = roundCurrency(
        costVoiceEstimated + costSmsEstimated + costEmailEstimated + costOpenAiEstimated + costOtherEstimated + costFixedEstimated,
      )
      const grossMarginEstimated = roundCurrency(revenue.amount - totalCostEstimated)
      const grossMarginRate = revenue.amount > 0 ? grossMarginEstimated / revenue.amount : null
      const costToRevenueRatio = revenue.amount > 0 ? totalCostEstimated / revenue.amount : null
      const alert = computeAlert(revenue.amount, totalCostEstimated, planKey)

      return {
        artisanId: user.artisanId,
        userId: user.id,
        artisanName: `${user.firstName} ${user.lastName}`.trim() || '—',
        companyName: user.company || '—',
        planLabel,
        planKey,
        status: user.statut || 'Actif',
        revenueMonthlyEstimated: revenue.amount,
        revenueNote: revenue.note || null,
        projectsCreatedThisMonth,
        voiceCallsThisMonth,
        voiceMinutesThisMonth,
        smsSentThisMonth,
        smsTracked: smsData.tracked,
        emailsSentThisMonth,
        emailsTracked: false,
        costVoiceEstimated,
        costSmsEstimated,
        costEmailEstimated,
        costOpenAiEstimated,
        costOtherEstimated,
        costFixedEstimated,
        totalCostEstimated,
        grossMarginEstimated,
        grossMarginRate,
        costToRevenueRatio,
        alertLevel: alert.level,
        alertLabel: alert.label,
        alertReason: alert.reason,
      } satisfies MarginRow
    }),
  )

  const activeArtisans = artisans.filter((artisan) => ['Actif', 'Trial'].includes(artisan.status)).length
  const revenueMonthlyEstimated = roundCurrency(artisans.reduce((sum, artisan) => sum + artisan.revenueMonthlyEstimated, 0))
  const breakdown = {
    voice: roundCurrency(artisans.reduce((sum, artisan) => sum + artisan.costVoiceEstimated, 0)),
    sms: roundCurrency(artisans.reduce((sum, artisan) => sum + artisan.costSmsEstimated, 0)),
    email: roundCurrency(artisans.reduce((sum, artisan) => sum + artisan.costEmailEstimated, 0)),
    openai: roundCurrency(artisans.reduce((sum, artisan) => sum + artisan.costOpenAiEstimated, 0)),
    other: roundCurrency(artisans.reduce((sum, artisan) => sum + artisan.costOtherEstimated + artisan.costFixedEstimated, 0)),
    fixed: roundCurrency(artisans.reduce((sum, artisan) => sum + artisan.costFixedEstimated, 0)),
    total: roundCurrency(artisans.reduce((sum, artisan) => sum + artisan.totalCostEstimated, 0)),
  }
  const grossMarginEstimated = roundCurrency(artisans.reduce((sum, artisan) => sum + artisan.grossMarginEstimated, 0))
  const grossMarginRate = revenueMonthlyEstimated > 0 ? grossMarginEstimated / revenueMonthlyEstimated : null
  const averageCostPerArtisan = activeArtisans > 0 ? roundCurrency(breakdown.total / activeArtisans) : 0
  const averageMarginPerArtisan = activeArtisans > 0 ? roundCurrency(grossMarginEstimated / activeArtisans) : 0

  return {
    periodMonth: getCurrentPeriodMonth(),
    tracked: {
      revenue: 'estimated',
      voice: voiceData.costTracked ? 'tracked' : 'estimated',
      sms: smsData.tracked ? 'tracked' : 'not_tracked',
      email: 'not_tracked',
      openai: 'estimated',
      other: FIXED_COST_PER_ARTISAN_EUR > 0 ? 'estimated' : 'not_tracked',
    },
    assumptions: {
      revenueByPlan: {
        Essentiel: PLAN_REVENUE_DEFAULTS.essentiel,
        Performance: PLAN_REVENUE_DEFAULTS.performance,
        Agence: PLAN_REVENUE_DEFAULTS.agence,
      },
      costPerVapiMinuteEur: COST_PER_VAPI_MINUTE_EUR,
      costPerSmsEur: COST_PER_SMS_EUR,
      costPerEmailEur: COST_PER_EMAIL_EUR,
      costPerProjectAiEur: COST_PER_PROJECT_AI_EUR,
      fixedCostPerArtisanEur: FIXED_COST_PER_ARTISAN_EUR,
    },
    kpis: {
      revenueMonthlyEstimated,
      costsUsageEstimated: breakdown.total,
      grossMarginEstimated,
      grossMarginRate,
      activeArtisans,
      averageCostPerArtisan,
      averageMarginPerArtisan,
    },
    breakdown,
    artisans: artisans.sort((a, b) => {
      const ratioA = a.costToRevenueRatio ?? (a.totalCostEstimated > 0 ? Number.POSITIVE_INFINITY : -1)
      const ratioB = b.costToRevenueRatio ?? (b.totalCostEstimated > 0 ? Number.POSITIVE_INFINITY : -1)
      return ratioB - ratioA
    }),
  }
}
