import 'server-only'

import { TABLES, getAllSentDevis, getArtisanConfig, resolveProjectId, updateDevis } from '@/src/lib/airtable'
import { notifyArtisanQuoteFollowedUp } from '@/src/lib/artisan-notifications'
import { getPublicDevisUrl } from '@/src/lib/base-url'
import { createArtisanNotification } from '@/src/lib/notifications'
import { generateQuoteFollowupEmailForStage, getQuoteFollowupState, type QuoteFollowupState } from '@/src/lib/quote-followup'
import { getProjectDisplayTitle } from '@/src/lib/project-detail/project-headline'
import { resolveDevisEmailBranding } from '@/src/lib/devis-email-branding'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { toUserFacingErrorMessage } from '@/src/lib/user-facing-errors'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext, tableExists, tableHasColumn, type TenantContext } from '@/src/lib/tenant-context'
import { listTeamMembers } from '@/src/lib/team/service'
import { checkPermission } from '@/src/lib/team/access'
import { Resend } from 'resend'

export const BUSINESS_AUTOMATIONS_TABLE = 'business_automations'
export const BUSINESS_AUTOMATION_RUNS_TABLE = 'business_automation_runs'

export const AUTOMATION_TYPES = [
  'quote_followup',
  'review_request',
  'won_project_followup',
  'unassigned_project_alert',
  'appointment_reminder',
  'assignment_notification',
] as const

export type BusinessAutomationType = (typeof AUTOMATION_TYPES)[number]
export type BusinessAutomationMode = 'manual' | 'approval_required' | 'automatic'
export type BusinessAutomationChannel = 'email' | 'internal'
export type BusinessAutomationRunStatus = 'pending' | 'prepared' | 'executing' | 'succeeded' | 'failed' | 'ignored'

export interface BusinessAutomationDefinition {
  type: BusinessAutomationType
  title: string
  description: string
  recommendedDelayValue: number
  recommendedDelayUnit: 'hours' | 'days'
  allowedChannels: BusinessAutomationChannel[]
  defaultChannel: BusinessAutomationChannel
  automaticAllowed: boolean
}

export interface BusinessAutomationRecord {
  id: string
  tenantId: string
  type: BusinessAutomationType
  enabled: boolean
  mode: BusinessAutomationMode
  delayValue: number | null
  delayUnit: 'hours' | 'days' | null
  channel: BusinessAutomationChannel | null
  requiresApproval: boolean
  conditions: Record<string, unknown>
  config: Record<string, unknown>
  createdBy: string | null
  createdAt: string | null
  updatedAt: string | null
  lastRunAt: string | null
  lastSuccessAt: string | null
  lastErrorAt: string | null
  lastErrorMessage: string | null
}

export interface BusinessAutomationRunRecord {
  id: string
  automationId: string
  tenantId: string
  entityType: 'project' | 'appointment' | 'configuration'
  entityId: string
  status: BusinessAutomationRunStatus
  triggerReason: string
  payload: Record<string, unknown>
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
  executedBy: string | null
  idempotencyKey: string
  createdAt: string | null
  updatedAt: string | null
  ignoredAt: string | null
}

export interface AutomationOverviewItem {
  definition: BusinessAutomationDefinition
  automation: BusinessAutomationRecord
}

export interface AutomationSystemState {
  paused: boolean
  pausedAt: string | null
  pausedBy: string | null
  pauseReason: string | null
  lastCronAt: string | null
  lastCronSuccessAt: string | null
  lastCronErrorAt: string | null
  lastCronErrorMessage: string | null
}

export interface AutomationMonitoringSummary {
  activeAutomations: number
  executedToday: number
  success: number
  failed: number
  pendingApproval: number
  ignored: number
  successRate: number
  estimatedMinutesSaved: number
}

export interface AutomationMonitoringOverview {
  items: AutomationOverviewItem[]
  systemState: AutomationSystemState
  summary: AutomationMonitoringSummary
  recentRuns: AutomationHistoryRunItem[]
}

export interface AutomationRunListFilters {
  page: number
  limit: number
  status: string[]
  type: BusinessAutomationType[]
  mode: BusinessAutomationMode[]
  entityType: Array<'project' | 'appointment' | 'configuration'>
  dateFrom: string | null
  dateTo: string | null
}

export interface AutomationHistoryRunItem {
  id: string
  automationId: string
  automationType: BusinessAutomationType
  automationTitle: string
  mode: BusinessAutomationMode
  modeLabel: 'Manuel' | 'A valider' | 'Automatique'
  status: BusinessAutomationRunStatus
  statusLabel: string
  entityType: 'project' | 'appointment' | 'configuration'
  entityId: string
  entityLabel: string
  entityHref: string | null
  triggerReason: string
  createdAt: string | null
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  executedBy: string | null
  executedByLabel: string | null
  errorMessage: string | null
  errorLabel: string | null
  idempotencyKeyPreview: string | null
  canExecute: boolean
  canIgnore: boolean
  canRetry: boolean
}

interface QuoteFollowupCronDebugSummary {
  automationsEvaluated: number
  projectsScanned: number
  quotesScanned: number
  eligibleQuotes: number
  runsCreated: number
  rejectedByReason: Record<string, number>
}

const TENANTS_TABLE = 'tenants'

const EMPTY_QUOTE_FOLLOWUP_CRON_DEBUG_SUMMARY: QuoteFollowupCronDebugSummary = {
  automationsEvaluated: 0,
  projectsScanned: 0,
  quotesScanned: 0,
  eligibleQuotes: 0,
  runsCreated: 0,
  rejectedByReason: {},
}

const AUTOMATION_TIME_SAVED_MINUTES: Record<BusinessAutomationType, number> = {
  quote_followup: 3,
  review_request: 2,
  won_project_followup: 1,
  unassigned_project_alert: 1,
  appointment_reminder: 2,
  assignment_notification: 1,
}

const DEFINITIONS: Record<BusinessAutomationType, BusinessAutomationDefinition> = {
  quote_followup: {
    type: 'quote_followup',
    title: 'Relance automatique des devis',
    description: 'Prepare ou envoie une relance email sur les devis deja envoyes sans reponse recente.',
    recommendedDelayValue: 5,
    recommendedDelayUnit: 'days',
    allowedChannels: ['email'],
    defaultChannel: 'email',
    automaticAllowed: true,
  },
  review_request: {
    type: 'review_request',
    title: "Demande d'avis apres chantier termine",
    description: "Declenche une demande d'avis via le flux deja existant quand le projet est termine.",
    recommendedDelayValue: 2,
    recommendedDelayUnit: 'days',
    allowedChannels: ['email'],
    defaultChannel: 'email',
    automaticAllowed: true,
  },
  won_project_followup: {
    type: 'won_project_followup',
    title: "Projet gagne sans intervention planifiee",
    description: "Prepare une action pour planifier l'intervention. Aucun rendez-vous n'est cree automatiquement.",
    recommendedDelayValue: 0,
    recommendedDelayUnit: 'days',
    allowedChannels: ['internal'],
    defaultChannel: 'internal',
    automaticAllowed: false,
  },
  unassigned_project_alert: {
    type: 'unassigned_project_alert',
    title: 'Dossiers sans responsable commercial',
    description: 'Signale ou affecte les dossiers actifs non assignes selon une regle deterministe.',
    recommendedDelayValue: 0,
    recommendedDelayUnit: 'days',
    allowedChannels: ['internal'],
    defaultChannel: 'internal',
    automaticAllowed: true,
  },
  appointment_reminder: {
    type: 'appointment_reminder',
    title: 'Rappel avant rendez-vous',
    description: 'Prepare un rappel interne avant les rendez-vous a venir. Aucun nouveau SMS n est envoye dans ce lot.',
    recommendedDelayValue: 24,
    recommendedDelayUnit: 'hours',
    allowedChannels: ['internal'],
    defaultChannel: 'internal',
    automaticAllowed: true,
  },
  assignment_notification: {
    type: 'assignment_notification',
    title: "Notification d'affectation",
    description: "Trace et signale en interne les changements de responsable commercial ou d'affectation planning.",
    recommendedDelayValue: 0,
    recommendedDelayUnit: 'hours',
    allowedChannels: ['internal'],
    defaultChannel: 'internal',
    automaticAllowed: true,
  },
}

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function toNullableText(value: unknown): string | null {
  const text = toText(value).trim()
  return text || null
}

function toNumberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function nowIso() {
  return new Date().toISOString()
}

function mapAutomation(row: Record<string, unknown>): BusinessAutomationRecord {
  return {
    id: toText(row.id),
    tenantId: toText(row.tenant_id),
    type: (toText(row.type) || 'quote_followup') as BusinessAutomationType,
    enabled: Boolean(row.enabled),
    mode: (toText(row.mode) || 'approval_required') as BusinessAutomationMode,
    delayValue: toNumberOrNull(row.delay_value),
    delayUnit: (toNullableText(row.delay_unit) as 'hours' | 'days' | null) || null,
    channel: (toNullableText(row.channel) as BusinessAutomationChannel | null) || null,
    requiresApproval: Boolean(row.requires_approval),
    conditions: (row.conditions && typeof row.conditions === 'object' ? row.conditions : {}) as Record<string, unknown>,
    config: (row.config && typeof row.config === 'object' ? row.config : {}) as Record<string, unknown>,
    createdBy: toNullableText(row.created_by),
    createdAt: toNullableText(row.created_at),
    updatedAt: toNullableText(row.updated_at),
    lastRunAt: toNullableText(row.last_run_at),
    lastSuccessAt: toNullableText(row.last_success_at),
    lastErrorAt: toNullableText(row.last_error_at),
    lastErrorMessage: toNullableText(row.last_error_message),
  }
}

function mapRun(row: Record<string, unknown>): BusinessAutomationRunRecord {
  return {
    id: toText(row.id),
    automationId: toText(row.automation_id),
    tenantId: toText(row.tenant_id),
    entityType: (toText(row.entity_type) || 'project') as BusinessAutomationRunRecord['entityType'],
    entityId: toText(row.entity_id),
    status: (toText(row.status) || 'pending') as BusinessAutomationRunStatus,
    triggerReason: toText(row.trigger_reason),
    payload: (row.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<string, unknown>,
    startedAt: toNullableText(row.started_at),
    completedAt: toNullableText(row.completed_at),
    errorMessage: toNullableText(row.error_message),
    executedBy: toNullableText(row.executed_by),
    idempotencyKey: toText(row.idempotency_key),
    createdAt: toNullableText(row.created_at),
    updatedAt: toNullableText(row.updated_at),
    ignoredAt: toNullableText(row.ignored_at),
  }
}

function buildDefaultAutomation(tenantId: string, type: BusinessAutomationType): BusinessAutomationRecord {
  const definition = DEFINITIONS[type]
  return {
    id: '',
    tenantId,
    type,
    enabled: false,
    mode: 'approval_required',
    delayValue: definition.recommendedDelayValue,
    delayUnit: definition.recommendedDelayUnit,
    channel: definition.defaultChannel,
    requiresApproval: true,
    conditions: {},
    config: {},
    createdBy: null,
    createdAt: null,
    updatedAt: null,
    lastRunAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
  }
}

function formatModeLabel(mode: BusinessAutomationMode): 'Manuel' | 'A valider' | 'Automatique' {
  if (mode === 'automatic') return 'Automatique'
  if (mode === 'approval_required') return 'A valider'
  return 'Manuel'
}

function formatRunStatusLabel(status: BusinessAutomationRunStatus): string {
  switch (status) {
    case 'pending':
      return 'En attente'
    case 'prepared':
      return 'A valider'
    case 'executing':
      return 'En cours'
    case 'succeeded':
      return 'Reussi'
    case 'failed':
      return 'Echoue'
    case 'ignored':
      return 'Ignore'
  }
}

function mapAutomationErrorToLabel(message: string | null): string | null {
  if (!message) return null
  if (message.includes('plus necessaire')) return 'Cette action n’est plus nécessaire.'
  if (message === 'GOOGLE_REVIEW_URL_MISSING') return 'Le lien de demande d’avis n’est pas encore configuré.'
  if (message === 'LEGACY_ARTISAN_ID_MISSING') return 'Cette action n’est pas disponible pour le moment.'
  return toUserFacingErrorMessage(message, 'automation')
}

function buildEntityHref(entityType: BusinessAutomationRunRecord['entityType'], payload: Record<string, unknown>, entityId: string): string | null {
  const projectId = toNullableText(payload.projectId)
  if (entityType === 'project' && projectId) return `/dashboard-v2/projet/${projectId}`
  if (entityType === 'project') return `/dashboard-v2/projet/${entityId}`
  if (entityType === 'appointment') {
    const targetProjectId = projectId
    if (targetProjectId) {
      return `/dashboard-v2/projet/${targetProjectId}?tab=rendez-vous`
    }
    return '/dashboard-v2?mode=calendar'
  }
  return '/parametres'
}

function buildEntityLabel(run: BusinessAutomationRunRecord, payload: Record<string, unknown>, projectLabels: Map<string, string>, appointmentLabels: Map<string, string>): string {
  if (run.entityType === 'project') {
    const projectId = toNullableText(payload.projectId) || run.entityId
    return projectLabels.get(projectId) || `Projet ${projectId.slice(0, 8)}`
  }
  if (run.entityType === 'appointment') {
    return appointmentLabels.get(run.entityId) || toNullableText(payload.title) || `Rendez-vous ${run.entityId.slice(0, 8)}`
  }
  return 'Configuration'
}

function buildIdempotencyPreview(key: string | null): string | null {
  if (!key) return null
  if (key.length <= 18) return key
  return `${key.slice(0, 10)}...${key.slice(-6)}`
}

function toStartOfDayIso() {
  const value = new Date()
  value.setHours(0, 0, 0, 0)
  return value.toISOString()
}

function clampPage(value: number) {
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.floor(value)
}

function clampLimit(value: number) {
  if (!Number.isFinite(value) || value < 1) return 25
  return Math.min(100, Math.floor(value))
}

function incrementQuoteFollowupDebugReason(
  summary: QuoteFollowupCronDebugSummary,
  reason: string,
) {
  summary.rejectedByReason[reason] = (summary.rejectedByReason[reason] || 0) + 1
}

function getQuoteFollowupRejectionReason(
  devis: {
    statut?: string | null
    sent?: boolean | null
    quoteSentAt?: string | null
    accepted?: boolean | null
    acceptedAt?: string | null
    declined?: boolean | null
    declinedAt?: string | null
    declineReason?: string | null
    followUpDisabled?: boolean | null
    followUpCount?: number | null
    clientEmail?: string | null
  },
  state: QuoteFollowupState,
) {
  if (state.shouldAutoFollowUp) return null
  if (state.stage === 'completed') {
    if (Boolean(devis.accepted) || devis.acceptedAt) return 'accepted_or_completed'
    if (Boolean(devis.declined) || devis.declinedAt || devis.declineReason) return 'declined_or_completed'
    if ((devis.followUpCount || 0) >= 3) return 'max_followups_reached'
    return 'completed_status'
  }
  if (state.stage === 'expired') return 'quote_expired'
  if (state.stage === 'stopped') return 'followup_disabled'
  if (state.stage === 'none') {
    if (!Boolean(devis.sent) && !(devis.statut || '').toLowerCase().trim().startsWith('envoy')) return 'quote_not_sent'
    if (!devis.quoteSentAt) return 'quote_sent_at_missing'
    if (state.reason.includes('invalide')) return 'quote_sent_at_invalid'
    if (state.canFollowUp && !devis.clientEmail) return 'client_email_missing'
    return 'not_due_yet'
  }
  if (state.canFollowUp && !devis.clientEmail) return 'client_email_missing'
  return 'not_eligible'
}

async function ensureTenantAutomationRows(tenantId: string, createdBy: string | null) {
  if (!(await tableExists(BUSINESS_AUTOMATIONS_TABLE))) return

  const defaults = AUTOMATION_TYPES.map((type) => {
    const definition = DEFINITIONS[type]
    return {
      tenant_id: tenantId,
      type,
      enabled: false,
      mode: 'approval_required' satisfies BusinessAutomationMode,
      delay_value: definition.recommendedDelayValue,
      delay_unit: definition.recommendedDelayUnit,
      channel: definition.defaultChannel,
      requires_approval: true,
      conditions: {},
      config: {},
      created_by: createdBy,
      updated_at: nowIso(),
    }
  })

  const { error } = await supabaseAdmin
    .from(BUSINESS_AUTOMATIONS_TABLE)
    .upsert(defaults, { onConflict: 'tenant_id,type', ignoreDuplicates: true })

  if (error) throw new Error(error.message)
}

async function tenantsSupportAutomationSystemState() {
  const requiredColumns = [
    'automation_paused',
    'automation_paused_at',
    'automation_paused_by',
    'automation_pause_reason',
    'automation_last_cron_at',
    'automation_last_cron_success_at',
    'automation_last_cron_error_at',
    'automation_last_cron_error_message',
  ]

  for (const column of requiredColumns) {
    if (!(await tableHasColumn(TENANTS_TABLE, column))) {
      return false
    }
  }

  return true
}

const DEFAULT_AUTOMATION_SYSTEM_STATE: AutomationSystemState = {
  paused: false,
  pausedAt: null,
  pausedBy: null,
  pauseReason: null,
  lastCronAt: null,
  lastCronSuccessAt: null,
  lastCronErrorAt: null,
  lastCronErrorMessage: null,
}

async function getTenantAutomationSystemState(tenantId: string): Promise<AutomationSystemState> {
  if (!(await tenantsSupportAutomationSystemState())) {
    return { ...DEFAULT_AUTOMATION_SYSTEM_STATE }
  }

  const { data, error } = await supabaseAdmin
    .from(TENANTS_TABLE)
    .select('automation_paused, automation_paused_at, automation_paused_by, automation_pause_reason, automation_last_cron_at, automation_last_cron_success_at, automation_last_cron_error_at, automation_last_cron_error_message')
    .eq('id', tenantId)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (!data) {
    return { ...DEFAULT_AUTOMATION_SYSTEM_STATE }
  }

  return {
    paused: Boolean(data.automation_paused),
    pausedAt: toNullableText(data.automation_paused_at),
    pausedBy: toNullableText(data.automation_paused_by),
    pauseReason: toNullableText(data.automation_pause_reason),
    lastCronAt: toNullableText(data.automation_last_cron_at),
    lastCronSuccessAt: toNullableText(data.automation_last_cron_success_at),
    lastCronErrorAt: toNullableText(data.automation_last_cron_error_at),
    lastCronErrorMessage: toNullableText(data.automation_last_cron_error_message),
  }
}

async function updateTenantAutomationSystemState(
  tenantId: string,
  patch: Partial<{
    paused: boolean
    pausedAt: string | null
    pausedBy: string | null
    pauseReason: string | null
    lastCronAt: string | null
    lastCronSuccessAt: string | null
    lastCronErrorAt: string | null
    lastCronErrorMessage: string | null
  }>,
) {
  if (!(await tenantsSupportAutomationSystemState())) return

  const payload: Record<string, unknown> = {}
  if (patch.paused !== undefined) payload.automation_paused = patch.paused
  if (patch.pausedAt !== undefined) payload.automation_paused_at = patch.pausedAt
  if (patch.pausedBy !== undefined) payload.automation_paused_by = patch.pausedBy
  if (patch.pauseReason !== undefined) payload.automation_pause_reason = patch.pauseReason
  if (patch.lastCronAt !== undefined) payload.automation_last_cron_at = patch.lastCronAt
  if (patch.lastCronSuccessAt !== undefined) payload.automation_last_cron_success_at = patch.lastCronSuccessAt
  if (patch.lastCronErrorAt !== undefined) payload.automation_last_cron_error_at = patch.lastCronErrorAt
  if (patch.lastCronErrorMessage !== undefined) payload.automation_last_cron_error_message = patch.lastCronErrorMessage
  if (Object.keys(payload).length === 0) return

  const { error } = await supabaseAdmin.from(TENANTS_TABLE).update(payload).eq('id', tenantId)
  if (error) throw new Error(error.message)
}

function requireAutomationPermission(
  tenantContext: TenantContext | null,
  permission: 'automations.read' | 'automations.manage',
): TenantContext {
  if (!tenantContext) throw new Error('TENANT_CONTEXT_REQUIRED')
  if (!checkPermission(tenantContext, permission)) throw new Error('FORBIDDEN')
  return tenantContext
}

export async function listAutomationOverviewForCurrentTenant(
  tenantContextInput?: TenantContext | null,
): Promise<AutomationOverviewItem[]> {
  const tenantContext = requireAutomationPermission(
    tenantContextInput ?? await getCurrentTenantContext(),
    'automations.read',
  )
  if (!(await tableExists(BUSINESS_AUTOMATIONS_TABLE))) {
    return AUTOMATION_TYPES.map((type) => ({ definition: DEFINITIONS[type], automation: buildDefaultAutomation(tenantContext.tenantId, type) }))
  }

  await ensureTenantAutomationRows(tenantContext.tenantId, tenantContext.userId)

  const { data, error } = await supabaseAdmin
    .from(BUSINESS_AUTOMATIONS_TABLE)
    .select('*')
    .eq('tenant_id', tenantContext.tenantId)

  if (error) throw new Error(error.message)
  const byType = new Map(
    ((data || []) as Record<string, unknown>[]).map((row) => {
      const automation = mapAutomation(row)
      return [automation.type, automation] as const
    }),
  )

  return AUTOMATION_TYPES.map((type) => ({
    definition: DEFINITIONS[type],
    automation: byType.get(type) || buildDefaultAutomation(tenantContext.tenantId, type),
  }))
}

export async function upsertAutomationForCurrentTenant(input: {
  type: BusinessAutomationType
  enabled: boolean
  mode: BusinessAutomationMode
  delayValue: number | null
  delayUnit: 'hours' | 'days' | null
  channel: BusinessAutomationChannel | null
}, tenantContextInput?: TenantContext | null): Promise<BusinessAutomationRecord> {
  const tenantContext = requireAutomationPermission(
    tenantContextInput ?? await getCurrentTenantContext(),
    'automations.manage',
  )
  if (!(await tableExists(BUSINESS_AUTOMATIONS_TABLE))) throw new Error('AUTOMATIONS_TABLE_MISSING')

  const definition = DEFINITIONS[input.type]
  const normalizedMode =
    input.mode === 'automatic' && !definition.automaticAllowed
      ? 'approval_required'
      : input.mode
  const normalizedChannel =
    input.channel && definition.allowedChannels.includes(input.channel)
      ? input.channel
      : definition.defaultChannel

  const payload = {
    tenant_id: tenantContext.tenantId,
    type: input.type,
    enabled: Boolean(input.enabled),
    mode: normalizedMode,
    delay_value: input.delayValue ?? definition.recommendedDelayValue,
    delay_unit: input.delayUnit ?? definition.recommendedDelayUnit,
    channel: normalizedChannel,
    requires_approval: normalizedMode !== 'automatic',
    updated_at: nowIso(),
    created_by: tenantContext.userId,
  }

  const { data, error } = await supabaseAdmin
    .from(BUSINESS_AUTOMATIONS_TABLE)
    .upsert(payload, { onConflict: 'tenant_id,type' })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapAutomation(data as Record<string, unknown>)
}

export async function listPendingAutomationRunsForTenant(tenantId: string) {
  if (!(await tableExists(BUSINESS_AUTOMATION_RUNS_TABLE))) return []
  const { data, error } = await supabaseAdmin
    .from(BUSINESS_AUTOMATION_RUNS_TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'prepared'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(mapRun)
}

async function loadProjectLabels(tenantId: string, projectIds: string[]) {
  const result = new Map<string, string>()
  if (!projectIds.length) return result
  const { data, error } = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, client_name, city, project_type, trade')
    .eq('tenant_id', tenantId)
    .in('id', projectIds)

  if (error) throw new Error(error.message)

  for (const row of (data || []) as Record<string, unknown>[]) {
    const parts = [
      toNullableText(row.client_name),
      toNullableText(row.project_type) || toNullableText(row.trade),
      toNullableText(row.city),
    ].filter(Boolean)
    result.set(toText(row.id), parts.join(' · ') || `Projet ${toText(row.id).slice(0, 8)}`)
  }

  return result
}

async function loadAppointmentLabels(tenantId: string, appointmentIds: string[]) {
  const result = new Map<string, string>()
  if (!appointmentIds.length || !(await tableExists('project_appointments'))) return result

  const { data, error } = await supabaseAdmin
    .from('project_appointments')
    .select('id, title, start_time')
    .eq('tenant_id', tenantId)
    .in('id', appointmentIds)

  if (error) throw new Error(error.message)

  for (const row of (data || []) as Record<string, unknown>[]) {
    const title = toNullableText(row.title) || 'Rendez-vous'
    const start = toNullableText(row.start_time)
    const dateLabel = start ? new Date(start).toLocaleString('fr-FR') : null
    result.set(toText(row.id), dateLabel ? `${title} · ${dateLabel}` : title)
  }

  return result
}

async function loadUserLabels(userIds: string[]) {
  const result = new Map<string, string>()
  if (!userIds.length) return result

  const { data, error } = await supabaseAdmin
    .from('Users')
    .select('id, first_name, last_name, email')
    .in('id', userIds)

  if (error) throw new Error(error.message)

  for (const row of (data || []) as Record<string, unknown>[]) {
    const name = [toNullableText(row.first_name), toNullableText(row.last_name)].filter(Boolean).join(' ').trim()
    result.set(toText(row.id), name || toText(row.email) || 'Utilisateur')
  }

  return result
}

function buildHistoryRunItem(input: {
  run: BusinessAutomationRunRecord
  automation: BusinessAutomationRecord
  projectLabels: Map<string, string>
  appointmentLabels: Map<string, string>
  userLabels: Map<string, string>
}): AutomationHistoryRunItem {
  const { run, automation, projectLabels, appointmentLabels, userLabels } = input
  const startedAt = run.startedAt ? new Date(run.startedAt).getTime() : null
  const completedAt = run.completedAt ? new Date(run.completedAt).getTime() : null
  const durationMs =
    startedAt !== null && completedAt !== null && !Number.isNaN(startedAt) && !Number.isNaN(completedAt)
      ? Math.max(0, completedAt - startedAt)
      : null

  return {
    id: run.id,
    automationId: automation.id,
    automationType: automation.type,
    automationTitle: DEFINITIONS[automation.type].title,
    mode: automation.mode,
    modeLabel: formatModeLabel(automation.mode),
    status: run.status,
    statusLabel: formatRunStatusLabel(run.status),
    entityType: run.entityType,
    entityId: run.entityId,
    entityLabel: buildEntityLabel(run, run.payload, projectLabels, appointmentLabels),
    entityHref: buildEntityHref(run.entityType, run.payload, run.entityId),
    triggerReason: run.triggerReason,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationMs,
    executedBy: run.executedBy,
    executedByLabel: run.executedBy ? userLabels.get(run.executedBy) || null : null,
    errorMessage: run.errorMessage,
    errorLabel: mapAutomationErrorToLabel(run.errorMessage),
    idempotencyKeyPreview: buildIdempotencyPreview(run.idempotencyKey),
    canExecute: run.status === 'prepared',
    canIgnore: run.status === 'pending' || run.status === 'prepared',
    canRetry: run.status === 'failed',
  }
}

async function buildAutomationSummaryForTenant(tenantId: string, automations: BusinessAutomationRecord[]) {
  if (!(await tableExists(BUSINESS_AUTOMATION_RUNS_TABLE))) {
    return {
      activeAutomations: automations.filter((item) => item.enabled).length,
      executedToday: 0,
      success: 0,
      failed: 0,
      pendingApproval: 0,
      ignored: 0,
      successRate: 0,
      estimatedMinutesSaved: 0,
    } satisfies AutomationMonitoringSummary
  }

  const baseQuery = () => supabaseAdmin.from(BUSINESS_AUTOMATION_RUNS_TABLE).select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId)
  const [success, failed, pendingApproval, ignored, executedToday] = await Promise.all([
    baseQuery().eq('status', 'succeeded'),
    baseQuery().eq('status', 'failed'),
    baseQuery().eq('status', 'prepared'),
    baseQuery().eq('status', 'ignored'),
    baseQuery().gte('created_at', toStartOfDayIso()).in('status', ['succeeded', 'prepared', 'ignored']),
  ])

  const successCount = success.count || 0
  const failedCount = failed.count || 0
  const pendingApprovalCount = pendingApproval.count || 0
  const ignoredCount = ignored.count || 0
  const denominator = successCount + failedCount
  const successRate = denominator > 0 ? Number(((successCount / denominator) * 100).toFixed(1)) : 0

  const estimatedMinutesSaved = automations.reduce((total, automation) => {
    if (!automation.enabled) return total
    return total + (AUTOMATION_TIME_SAVED_MINUTES[automation.type] || 0)
  }, 0) * successCount

  return {
    activeAutomations: automations.filter((item) => item.enabled).length,
    executedToday: executedToday.count || 0,
    success: successCount,
    failed: failedCount,
    pendingApproval: pendingApprovalCount,
    ignored: ignoredCount,
    successRate,
    estimatedMinutesSaved,
  } satisfies AutomationMonitoringSummary
}

export async function listAutomationRunsForCurrentTenant(
  filters: Partial<AutomationRunListFilters> = {},
  tenantContextInput?: TenantContext | null,
) {
  const tenantContext = requireAutomationPermission(
    tenantContextInput ?? await getCurrentTenantContext(),
    'automations.read',
  )

  if (!(await tableExists(BUSINESS_AUTOMATION_RUNS_TABLE))) {
    return {
      runs: [] as AutomationHistoryRunItem[],
      pagination: { page: 1, limit: clampLimit(filters.limit ?? 25), total: 0, totalPages: 0 },
      summary: await buildAutomationSummaryForTenant(tenantContext.tenantId, []),
      systemState: await getTenantAutomationSystemState(tenantContext.tenantId),
    }
  }

  await ensureTenantAutomationRows(tenantContext.tenantId, tenantContext.userId)

  const page = clampPage(filters.page ?? 1)
  const limit = clampLimit(filters.limit ?? 25)
  const status = (filters.status || []).filter(Boolean) as BusinessAutomationRunStatus[]
  const type = (filters.type || []).filter(Boolean) as BusinessAutomationType[]
  const mode = (filters.mode || []).filter(Boolean) as BusinessAutomationMode[]
  const entityType = (filters.entityType || []).filter(Boolean) as Array<'project' | 'appointment' | 'configuration'>

  const overview = await listAutomationOverviewForCurrentTenant(tenantContext)
  const automationRows = overview.map((item) => item.automation)
  const allowedAutomationIds = automationRows
    .filter((automation) => (!type.length || type.includes(automation.type)) && (!mode.length || mode.includes(automation.mode)))
    .map((automation) => automation.id)

  if ((type.length || mode.length) && allowedAutomationIds.length === 0) {
    return {
      runs: [] as AutomationHistoryRunItem[],
      pagination: { page, limit, total: 0, totalPages: 0 },
      summary: await buildAutomationSummaryForTenant(tenantContext.tenantId, automationRows),
      systemState: await getTenantAutomationSystemState(tenantContext.tenantId),
    }
  }

  let query = supabaseAdmin
    .from(BUSINESS_AUTOMATION_RUNS_TABLE)
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantContext.tenantId)
    .order('created_at', { ascending: false })

  if (status.length) query = query.in('status', status)
  if (entityType.length) query = query.in('entity_type', entityType)
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo)
  if (allowedAutomationIds.length) query = query.in('automation_id', allowedAutomationIds)

  const from = (page - 1) * limit
  const to = from + limit - 1
  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  const runs = ((data || []) as Record<string, unknown>[]).map(mapRun)
  const automationById = new Map(automationRows.map((item) => [item.id, item] as const))
  const projectIds = Array.from(
    new Set(
      runs
        .filter((run) => run.entityType === 'project')
        .map((run) => toNullableText(run.payload.projectId) || run.entityId)
        .filter(Boolean),
    ),
  ) as string[]
  const appointmentIds = Array.from(new Set(runs.filter((run) => run.entityType === 'appointment').map((run) => run.entityId)))
  const executedByIds = Array.from(new Set(runs.map((run) => run.executedBy).filter(Boolean))) as string[]
  const [projectLabels, appointmentLabels, userLabels, systemState, summary] = await Promise.all([
    loadProjectLabels(tenantContext.tenantId, projectIds),
    loadAppointmentLabels(tenantContext.tenantId, appointmentIds),
    loadUserLabels(executedByIds),
    getTenantAutomationSystemState(tenantContext.tenantId),
    buildAutomationSummaryForTenant(tenantContext.tenantId, automationRows),
  ])

  return {
    runs: runs
      .map((run) => {
        const automation = automationById.get(run.automationId)
        if (!automation) return null
        return buildHistoryRunItem({ run, automation, projectLabels, appointmentLabels, userLabels })
      })
      .filter(Boolean) as AutomationHistoryRunItem[],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: count ? Math.ceil(count / limit) : 0,
    },
    summary,
    systemState,
  }
}

export async function getAutomationMonitoringOverviewForCurrentTenant(
  tenantContextInput?: TenantContext | null,
): Promise<AutomationMonitoringOverview> {
  const tenantContext = requireAutomationPermission(
    tenantContextInput ?? await getCurrentTenantContext(),
    'automations.read',
  )

  const items = await listAutomationOverviewForCurrentTenant(tenantContext)
  const history = await listAutomationRunsForCurrentTenant({ page: 1, limit: 6 }, tenantContext)

  return {
    items,
    systemState: history.systemState,
    summary: history.summary,
    recentRuns: history.runs,
  }
}

export function buildIdempotencyKey(params: {
  tenantId: string
  type: BusinessAutomationType
  entityType: 'project' | 'appointment' | 'configuration'
  entityId: string
  windowKey: string
}) {
  return `${params.type}:${params.tenantId}:${params.entityType}:${params.entityId}:${params.windowKey}`
}

async function createAutomationRun(input: {
  automation: BusinessAutomationRecord
  entityType: 'project' | 'appointment' | 'configuration'
  entityId: string
  triggerReason: string
  payload: Record<string, unknown>
  idempotencyKey: string
  status?: BusinessAutomationRunStatus
}) {
  if (!(await tableExists(BUSINESS_AUTOMATION_RUNS_TABLE))) return null
  const { data, error } = await supabaseAdmin
    .from(BUSINESS_AUTOMATION_RUNS_TABLE)
    .insert({
      automation_id: input.automation.id,
      tenant_id: input.automation.tenantId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      status: input.status || 'pending',
      trigger_reason: input.triggerReason,
      payload: input.payload,
      idempotency_key: input.idempotencyKey,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .maybeSingle()

  if (error) {
    if (String(error.code || '') === '23505') {
      console.info('[AUTOMATIONS][RUN_DUPLICATE]', {
        automation_type: input.automation.type,
        tenant_id: input.automation.tenantId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        idempotency_key: input.idempotencyKey,
      })
      return null
    }
    throw new Error(error.message)
  }
  return data ? mapRun(data as Record<string, unknown>) : null
}

async function markRunStatus(runId: string, status: BusinessAutomationRunStatus, values?: Partial<Record<'error_message' | 'executed_by', string | null>>) {
  if (!(await tableExists(BUSINESS_AUTOMATION_RUNS_TABLE))) return
  const patch: Record<string, unknown> = {
    status,
    updated_at: nowIso(),
  }
  if (status === 'executing') patch.started_at = nowIso()
  if (status === 'succeeded' || status === 'failed' || status === 'ignored') patch.completed_at = nowIso()
  if (status === 'ignored') patch.ignored_at = nowIso()
  if (values?.error_message !== undefined) patch.error_message = values.error_message
  if (values?.executed_by !== undefined) patch.executed_by = values.executed_by
  const { error } = await supabaseAdmin.from(BUSINESS_AUTOMATION_RUNS_TABLE).update(patch).eq('id', runId)
  if (error) throw new Error(error.message)
}

async function touchAutomation(automationId: string, values: Partial<Record<'last_run_at' | 'last_success_at' | 'last_error_at' | 'last_error_message', string | null>>) {
  if (!(await tableExists(BUSINESS_AUTOMATIONS_TABLE))) return
  const patch: Record<string, unknown> = { updated_at: nowIso() }
  for (const [key, value] of Object.entries(values)) patch[key] = value
  const { error } = await supabaseAdmin.from(BUSINESS_AUTOMATIONS_TABLE).update(patch).eq('id', automationId)
  if (error) throw new Error(error.message)
}

async function createActivity(projectId: string, action: string, description: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action,
    description,
    created_at: nowIso(),
  })
  if (error) console.error('[AUTOMATIONS][ACTIVITY]', error.message)
}

async function sendQuoteFollowupForDevis(devisId: string) {
  const allSent = await getAllSentDevis()
  const devis = allSent.find((item) => item.id === devisId)
  if (!devis) throw new Error('DEVIS_NOT_FOUND')
  const state = getQuoteFollowupState(devis)
  if (!state.canFollowUp) throw new Error(state.reason)
  if (!devis.clientEmail) throw new Error('CLIENT_EMAIL_MISSING')
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY_MISSING')

  const project = await resolveProjectId(devis.projectId)
  if (!project) throw new Error('PROJECT_NOT_FOUND')
  const { data: projectRow, error: projectError } = await supabaseAdmin
    .from(TABLES.projects)
    .select('client_first_name, project_type, trade, ai_summary, project_title')
    .eq('id', project.id)
    .limit(1)
    .maybeSingle()
  if (projectError) throw new Error(projectError.message)

  const config = await getArtisanConfig(devis.artisanId)
  const artisanName = config?.raisonSociale || config?.companyName || 'Votre artisan'
  const firstName = (projectRow?.client_first_name as string) || devis.clientName.split(' ')[0] || ''
  const projectType = getProjectDisplayTitle(
    {
      projectTitle: projectRow?.project_title,
      projectType: projectRow?.project_type,
      trade: projectRow?.trade,
      aiSummary: projectRow?.ai_summary,
    },
    devis.objet || (projectRow?.project_type as string) || (projectRow?.trade as string) || 'votre projet',
  )
  const email = generateQuoteFollowupEmailForStage(state.stage, {
    firstName,
    quoteSentAt: devis.quoteSentAt || devis.dateEmission,
    projectType,
    artisanName,
  })
  const branding = resolveDevisEmailBranding({
    plan: 'performance',
    whiteLabelEnabled: config?.whiteLabelEnabled,
    widgetBrandName: config?.widgetBrandName,
    widgetBrandLogoUrl: config?.widgetBrandLogoUrl,
    logoUrl: config?.logoUrl,
    companyName: config?.companyName,
    raisonSociale: config?.raisonSociale,
    primaryColor: config?.primaryColor,
    secondaryColor: config?.secondaryColor,
  })
  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: `"${(branding.brandName || 'Kadria').replace(/["\r\n]/g, '')}" <${process.env.RESEND_FROM_EMAIL || 'devis@kadria.fr'}>`,
    to: devis.clientEmail,
    subject: email.subject,
    text: renderBaseEmailText({
      preheader: email.subject,
      brand: branding.brandName || 'Kadria',
      title: state.stage === 'j10_final' ? 'Dernier rappel concernant votre devis' : 'Votre devis est toujours disponible',
      body: email.text,
      ctaLabel: 'Consulter le devis',
      ctaUrl: getPublicDevisUrl(devis.token || ''),
      artisanName,
      accentColor: branding.ctaColor,
    }),
    html: renderBaseEmail({
      preheader: email.subject,
      brand: branding.brandName || 'Kadria',
      title: state.stage === 'j10_final' ? 'Dernier rappel concernant votre devis' : 'Votre devis est toujours disponible',
      body: email.text,
      ctaLabel: 'Consulter le devis',
      ctaUrl: getPublicDevisUrl(devis.token || ''),
      artisanName,
      accentColor: branding.ctaColor,
    }),
    headers: { 'X-Entity-Ref-ID': `automation-follow-up-${devis.id}-${state.stage}` },
  })
  if (result.error) throw new Error(result.error.message || 'RESEND_ERROR')
  await updateDevis(devis.id, {
    lastFollowUpAt: nowIso(),
    followUpCount: (devis.followUpCount || 0) + 1,
  })
  await createActivity(project.id, 'DEVIS_FOLLOW_UP_SENT', `Relance automatique envoyee - ${devis.devisNumber}`)
  await notifyArtisanQuoteFollowedUp({
    artisanId: devis.artisanId,
    projectId: project.id,
    devisNumber: devis.devisNumber,
    clientName: devis.clientName,
    stage: state.stage as 'j2_unopened' | 'j5_opened_no_decision' | 'j10_final' | 'none',
  })
}

async function sendReviewRequestForProject(projectId: string, artisanId: string) {
  const { data: project, error: projectError } = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, client_name, client_first_name, client_email, project_type, trade')
    .eq('id', projectId)
    .limit(1)
    .maybeSingle()
  if (projectError) throw new Error(projectError.message)
  if (!project) throw new Error('PROJECT_NOT_FOUND')
  const clientEmail = toText(project.client_email).trim()
  if (!clientEmail) throw new Error('CLIENT_EMAIL_MISSING')
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY_MISSING')
  const config = await getArtisanConfig(artisanId)
  const googleReviewUrl = toText(config?.googleReviewUrl).trim()
  if (!googleReviewUrl) throw new Error('GOOGLE_REVIEW_URL_MISSING')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: `"Kadria" <${process.env.RESEND_FROM_EMAIL || 'devis@kadria.fr'}>`,
    to: clientEmail,
    subject: 'Votre avis compte pour nous',
    text: renderBaseEmailText({
      preheader: 'Votre avis compte beaucoup',
      brand: 'Kadria',
      title: 'Votre avis compte beaucoup',
      intro: `Bonjour ${toText(project.client_first_name || project.client_name) || ''},`,
      body: `Merci pour votre confiance. Si vous etes satisfait, vous pouvez laisser un avis via le lien ci-dessous.`,
      ctaLabel: 'Laisser un avis',
      ctaUrl: googleReviewUrl,
      artisanName: toText(config?.raisonSociale || config?.companyName || 'Votre artisan'),
      accentColor: '#22c55e',
    }),
    html: renderBaseEmail({
      preheader: 'Votre avis compte beaucoup',
      brand: 'Kadria',
      title: 'Votre avis compte beaucoup',
      intro: `Bonjour ${toText(project.client_first_name || project.client_name) || ''},`,
      body: `Merci pour votre confiance. Si vous etes satisfait, vous pouvez laisser un avis via le lien ci-dessous.`,
      ctaLabel: 'Laisser un avis',
      ctaUrl: googleReviewUrl,
      artisanName: toText(config?.raisonSociale || config?.companyName || 'Votre artisan'),
      accentColor: '#22c55e',
    }),
    headers: { 'X-Entity-Ref-ID': `automation-review-${projectId}` },
  })
  if (result.error) throw new Error(result.error.message || 'RESEND_ERROR')
  await createActivity(projectId, 'GOOGLE_REVIEW_REQUEST_SENT', `Demande avis Google envoyee automatiquement - ${clientEmail}`)
}

async function autoAssignProjectToFallback(tenantId: string, projectId: string) {
  const members = await listTeamMembers(tenantId)
  const activeOwner = members.find((member) => member.status === 'active' && member.role === 'owner')
  const activeAdmin = members.find((member) => member.status === 'active' && member.role === 'admin')
  const fallback = activeOwner || activeAdmin
  if (!fallback) return { assigned: false }
  const { error } = await supabaseAdmin
    .from(TABLES.projects)
    .update({
      responsible_user_id: fallback.userId,
      responsible_assigned_at: nowIso(),
      responsible_assigned_by: fallback.userId,
    })
    .eq('id', projectId)
    .eq('tenant_id', tenantId)
    .is('responsible_user_id', null)
  if (error) throw new Error(error.message)
  await createActivity(projectId, 'PROJECT_RESPONSIBLE_ASSIGNED', `Affectation automatique au ${fallback.role === 'owner' ? 'proprietaire' : 'premier administrateur'} actif`)
  return { assigned: true, responsibleUserId: fallback.userId }
}

async function createInternalReminderNotification(input: { artisanId: string; tenantId: string; projectId: string | null; title: string; message: string; actionUrl?: string | null }) {
  await createArtisanNotification({
    artisanId: input.artisanId,
    tenantId: input.tenantId,
    projectId: input.projectId,
    type: 'appointment_due',
    title: input.title,
    message: input.message,
    priority: 'medium',
    actionUrl: input.actionUrl || null,
    dedupeWindowMs: 2 * 60 * 60 * 1000,
  })
}

async function evaluateForAutomation(
  automation: BusinessAutomationRecord,
  tenant: { id: string; name: string; legacyArtisanId: string | null },
  diagnostics?: { quoteFollowup?: QuoteFollowupCronDebugSummary },
) {
  switch (automation.type) {
    case 'quote_followup': {
      const allSent = await getAllSentDevis()
      const quoteSummary = diagnostics?.quoteFollowup
      if (quoteSummary) {
        quoteSummary.automationsEvaluated += 1
        quoteSummary.quotesScanned += allSent.length
      }

      const due = allSent
        .filter((devis) => {
          const sameTenant = devis.artisanId === tenant.legacyArtisanId
          if (!sameTenant && quoteSummary) {
            incrementQuoteFollowupDebugReason(quoteSummary, 'tenant_legacy_artisan_mismatch')
          }
          return sameTenant
        })
        .map((devis) => {
          const state = getQuoteFollowupState(devis)
          const rejectionReason = getQuoteFollowupRejectionReason(devis, state)
          console.info('[AUTOMATIONS][QUOTE_FOLLOWUP][EVALUATE]', {
            tenant_id: tenant.id,
            tenant_legacy_artisan_id: tenant.legacyArtisanId,
            project_id: devis.projectId,
            devis_id: devis.id,
            project_status: null,
            lead_status: null,
            devis_status: devis.statut || null,
            quote_sent_at: devis.quoteSentAt || null,
            accepted: Boolean(devis.accepted),
            accepted_at: devis.acceptedAt || null,
            declined_at: devis.declinedAt || null,
            last_follow_up_at: devis.lastFollowUpAt || null,
            follow_up_count: devis.followUpCount || 0,
            client_channel_email_available: Boolean(devis.clientEmail),
            automation_enabled: automation.enabled,
            mode: automation.mode,
            delay_value: automation.delayValue,
            delay_unit: automation.delayUnit,
            threshold_calculated: state.stage,
            should_auto_follow_up: state.shouldAutoFollowUp,
            can_follow_up: state.canFollowUp,
            idempotency_key: buildIdempotencyKey({
              tenantId: automation.tenantId,
              type: automation.type,
              entityType: 'project',
              entityId: devis.projectId,
              windowKey: `${new Date().toISOString().slice(0, 10)}-${state.stage}`,
            }),
            blocked_by_existing_run_or_activity: false,
            rejection_reason: rejectionReason,
            decision_reason: state.reason,
          })
          if (quoteSummary) {
            quoteSummary.projectsScanned += devis.projectId ? 1 : 0
            if (rejectionReason) incrementQuoteFollowupDebugReason(quoteSummary, rejectionReason)
          }
          return { devis, state }
        })
        .filter(({ state }) => state.shouldAutoFollowUp)

      if (quoteSummary) {
        quoteSummary.eligibleQuotes += due.length
      }
      return due.map(({ devis, state }) => ({
        entityType: 'project' as const,
        entityId: devis.projectId,
        triggerReason: state.reason,
        payload: { devisId: devis.id, projectId: devis.projectId, devisNumber: devis.devisNumber, stage: state.stage },
        windowKey: `${new Date().toISOString().slice(0, 10)}-${state.stage}`,
      }))
    }
    case 'review_request': {
      const { data, error } = await supabaseAdmin
        .from(TABLES.projects)
        .select('id, completion_completed_at, client_email')
        .eq('tenant_id', tenant.id)
        .not('completion_completed_at', 'is', null)
        .limit(200)
      if (error) throw new Error(error.message)
      const { data: activities } = await supabaseAdmin
        .from(TABLES.activity)
        .select('project_id, action')
        .eq('action', 'GOOGLE_REVIEW_REQUEST_SENT')
        .limit(400)
      const requested = new Set(((activities || []) as Record<string, unknown>[]).map((row) => toText(row.project_id)))
      return ((data || []) as Record<string, unknown>[])
        .filter((row) => !requested.has(toText(row.id)) && toText(row.client_email))
        .map((row) => ({
          entityType: 'project' as const,
          entityId: toText(row.id),
          triggerReason: 'Projet termine sans demande d avis deja envoyee.',
          payload: { projectId: toText(row.id) },
          windowKey: 'completed',
        }))
    }
    case 'won_project_followup': {
      const { data, error } = await supabaseAdmin
        .from(TABLES.projects)
        .select('id, status, accepted_at')
        .eq('tenant_id', tenant.id)
        .or('status.eq.GagnÃƒÂ©,accepted_at.not.is.null')
        .limit(200)
      if (error) throw new Error(error.message)
      const { data: appointments } = await supabaseAdmin
        .from('project_appointments')
        .select('project_id, start_time')
        .eq('tenant_id', tenant.id)
        .gte('start_time', nowIso())
      const planned = new Set(((appointments || []) as Record<string, unknown>[]).map((row) => toText(row.project_id)).filter(Boolean))
      return ((data || []) as Record<string, unknown>[])
        .filter((row) => !planned.has(toText(row.id)))
        .map((row) => ({
          entityType: 'project' as const,
          entityId: toText(row.id),
          triggerReason: 'Projet gagne sans intervention planifiee.',
          payload: { projectId: toText(row.id) },
          windowKey: 'won',
        }))
    }
    case 'unassigned_project_alert': {
      const { data, error } = await supabaseAdmin
        .from(TABLES.projects)
        .select('id')
        .eq('tenant_id', tenant.id)
        .is('responsible_user_id', null)
        .limit(200)
      if (error) throw new Error(error.message)
      return ((data || []) as Record<string, unknown>[]).map((row) => ({
        entityType: 'project' as const,
        entityId: toText(row.id),
        triggerReason: 'Projet actif sans responsable commercial.',
        payload: { projectId: toText(row.id) },
        windowKey: 'unassigned',
      }))
    }
    case 'appointment_reminder': {
      const hoursBefore = Math.max(1, automation.delayValue || 24)
      const startWindow = new Date(Date.now() + (hoursBefore - 1) * 60 * 60 * 1000).toISOString()
      const endWindow = new Date(Date.now() + hoursBefore * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabaseAdmin
        .from('project_appointments')
        .select('id, project_id, start_time, title')
        .eq('tenant_id', tenant.id)
        .gte('start_time', startWindow)
        .lt('start_time', endWindow)
        .limit(200)
      if (error) throw new Error(error.message)
      return ((data || []) as Record<string, unknown>[]).map((row) => ({
        entityType: 'appointment' as const,
        entityId: toText(row.id),
        triggerReason: `Rendez-vous dans moins de ${hoursBefore} heure(s).`,
        payload: {
          appointmentId: toText(row.id),
          projectId: toText(row.project_id),
          title: toText(row.title),
          hoursBefore,
        },
        windowKey: `${new Date().toISOString().slice(0, 13)}:${hoursBefore}`,
      }))
    }
    case 'assignment_notification':
      return []
  }
}

async function executeRun(automation: BusinessAutomationRecord, tenant: { id: string; name: string; legacyArtisanId: string | null }, run: BusinessAutomationRunRecord, executedBy: string | null) {
  await markRunStatus(run.id, 'executing', { executed_by: executedBy })
  await touchAutomation(automation.id, { last_run_at: nowIso() })
  try {
    if (automation.type === 'quote_followup') {
      await sendQuoteFollowupForDevis(toText(run.payload.devisId))
    } else if (automation.type === 'review_request') {
      if (!tenant.legacyArtisanId) throw new Error('LEGACY_ARTISAN_ID_MISSING')
      await sendReviewRequestForProject(toText(run.payload.projectId), tenant.legacyArtisanId)
    } else if (automation.type === 'won_project_followup') {
      await createActivity(toText(run.payload.projectId), 'AUTOMATION_PREPARED', "Action preparee : planifier l'intervention")
    } else if (automation.type === 'unassigned_project_alert') {
      const result = await autoAssignProjectToFallback(tenant.id, toText(run.payload.projectId))
      if (!result.assigned) {
        await createActivity(toText(run.payload.projectId), 'AUTOMATION_ALERT', 'Aucun owner/admin actif pour affectation automatique')
      }
    } else if (automation.type === 'appointment_reminder') {
      const artisanId = tenant.legacyArtisanId
      if (!artisanId) throw new Error('LEGACY_ARTISAN_ID_MISSING')
      await createInternalReminderNotification({
        artisanId,
        tenantId: tenant.id,
        projectId: toNullableText(run.payload.projectId),
        title: 'Rappel de rendez-vous a verifier',
        message: `${toText(run.payload.title || 'Rendez-vous')} approche. Ouvrez le planning pour confirmer le suivi.`,
        actionUrl: '/dashboard-v2?mode=calendar',
      })
    } else if (automation.type === 'assignment_notification') {
      await createActivity(toText(run.payload.projectId || ''), 'AUTOMATION_ASSIGNMENT_NOTIFICATION', 'Notification d affectation traitee')
    }
    await markRunStatus(run.id, 'succeeded', { executed_by: executedBy, error_message: null })
    await touchAutomation(automation.id, { last_success_at: nowIso(), last_error_at: null, last_error_message: null })
    return { status: 'succeeded' as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await markRunStatus(run.id, 'failed', { executed_by: executedBy, error_message: message })
    await touchAutomation(automation.id, { last_error_at: nowIso(), last_error_message: message })
    return { status: 'failed' as const, error: message }
  }
}

export async function processBusinessAutomationsCron() {
  if (!(await tableExists(BUSINESS_AUTOMATIONS_TABLE))) {
    return { processedTenants: 0, createdRuns: 0, executedRuns: 0, failures: [] as string[] }
  }
  const { data, error } = await supabaseAdmin
    .from(BUSINESS_AUTOMATIONS_TABLE)
    .select('*, tenants!inner(id, name, legacy_artisan_id, automation_paused)')
    .eq('enabled', true)
  if (error) throw new Error(error.message)

  let createdRuns = 0
  let executedRuns = 0
  const failures: string[] = []
  const diagnostics = {
    quoteFollowup: { ...EMPTY_QUOTE_FOLLOWUP_CRON_DEBUG_SUMMARY, rejectedByReason: {} as Record<string, number> },
  }
  const rows = (data || []) as Array<Record<string, unknown> & { tenants?: Record<string, unknown> }>

  const tenantBuckets = new Map<
    string,
    {
      tenant: { id: string; name: string; legacyArtisanId: string | null; paused: boolean }
      automations: BusinessAutomationRecord[]
    }
  >()

  for (const row of rows) {
    const automation = mapAutomation(row)
    const tenantRow = row.tenants || {}
    const tenantId = automation.tenantId
    const existing = tenantBuckets.get(tenantId)
    if (existing) {
      existing.automations.push(automation)
      continue
    }
    tenantBuckets.set(tenantId, {
      tenant: {
        id: tenantId,
        name: toText((tenantRow as Record<string, unknown>).name),
        legacyArtisanId: toNullableText((tenantRow as Record<string, unknown>).legacy_artisan_id),
        paused: Boolean((tenantRow as Record<string, unknown>).automation_paused),
      },
      automations: [automation],
    })
  }

  for (const { tenant, automations } of tenantBuckets.values()) {
    try {
      await updateTenantAutomationSystemState(tenant.id, {
        lastCronAt: nowIso(),
        lastCronErrorAt: null,
        lastCronErrorMessage: null,
      })

      if (tenant.paused) {
        continue
      }

      for (const automation of automations) {
        try {
          const candidates = await evaluateForAutomation(automation, tenant, diagnostics)
          for (const candidate of candidates) {
            const run = await createAutomationRun({
              automation,
              entityType: candidate.entityType,
              entityId: candidate.entityId,
              triggerReason: candidate.triggerReason,
              payload: candidate.payload,
              idempotencyKey: buildIdempotencyKey({
                tenantId: automation.tenantId,
                type: automation.type,
                entityType: candidate.entityType,
                entityId: candidate.entityId,
                windowKey: candidate.windowKey,
              }),
              status: automation.mode === 'automatic' && DEFINITIONS[automation.type].automaticAllowed ? 'pending' : 'prepared',
            })
            if (!run) {
              if (automation.type === 'quote_followup') {
                incrementQuoteFollowupDebugReason(diagnostics.quoteFollowup, 'duplicate_idempotency_key')
              }
              continue
            }
            createdRuns += 1
            if (automation.type === 'quote_followup') {
              diagnostics.quoteFollowup.runsCreated += 1
            }
            if (automation.mode === 'automatic' && DEFINITIONS[automation.type].automaticAllowed) {
              const result = await executeRun(automation, tenant, run, null)
              if (result.status === 'succeeded') executedRuns += 1
              else failures.push(`${automation.type}:${candidate.entityId}:${result.error || 'UNKNOWN_ERROR'}`)
            }
          }
        } catch (error) {
          failures.push(`${automation.type}:${automation.tenantId}:${error instanceof Error ? error.message : String(error)}`)
        }
      }

      await updateTenantAutomationSystemState(tenant.id, {
        lastCronSuccessAt: nowIso(),
        lastCronErrorAt: null,
        lastCronErrorMessage: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`tenant:${tenant.id}:${message}`)
      await updateTenantAutomationSystemState(tenant.id, {
        lastCronErrorAt: nowIso(),
        lastCronErrorMessage: message,
      }).catch(() => undefined)
    }
  }

  console.info('[AUTOMATIONS][QUOTE_FOLLOWUP][SUMMARY]', diagnostics.quoteFollowup)

  return {
    processedTenants: tenantBuckets.size,
    createdRuns,
    executedRuns,
    failures,
  }
}

export async function executeAutomationRunForCurrentTenant(runId: string) {
  const tenantContext = await getCurrentTenantContext()
  if (!tenantContext) throw new Error('TENANT_CONTEXT_REQUIRED')
  const { data, error } = await supabaseAdmin
    .from(BUSINESS_AUTOMATION_RUNS_TABLE)
    .select('*, business_automations!inner(*)')
    .eq('id', runId)
    .eq('tenant_id', tenantContext.tenantId)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('RUN_NOT_FOUND')
  const run = mapRun(data as Record<string, unknown>)
  const automation = mapAutomation((data as Record<string, unknown>).business_automations as Record<string, unknown>)
  if (!checkPermission(tenantContext, automation.type === 'assignment_notification' ? 'automations.read' : 'projects.update')) {
    if (!checkPermission(tenantContext, 'automations.manage')) throw new Error('FORBIDDEN')
  }
  return executeRun(automation, { id: tenantContext.tenantId, name: tenantContext.tenant.name, legacyArtisanId: tenantContext.legacyArtisanId }, run, tenantContext.userId)
}

export async function ignoreAutomationRunForCurrentTenant(runId: string) {
  const tenantContext = await getCurrentTenantContext()
  if (!tenantContext) throw new Error('TENANT_CONTEXT_REQUIRED')
  if (!checkPermission(tenantContext, 'automations.read')) throw new Error('FORBIDDEN')
  const { error } = await supabaseAdmin
    .from(BUSINESS_AUTOMATION_RUNS_TABLE)
    .update({ status: 'ignored', ignored_at: nowIso(), updated_at: nowIso(), completed_at: nowIso(), executed_by: tenantContext.userId })
    .eq('id', runId)
    .eq('tenant_id', tenantContext.tenantId)
    .in('status', ['pending', 'prepared'])
  if (error) throw new Error(error.message)
  return { ok: true }
}

export async function buildAutomationMetadataForTenant(tenantId: string) {
  if (await tableExists(BUSINESS_AUTOMATIONS_TABLE)) {
    await ensureTenantAutomationRows(tenantId, null)
  }
  const overview = (await tableExists(BUSINESS_AUTOMATIONS_TABLE))
    ? ((await supabaseAdmin.from(BUSINESS_AUTOMATIONS_TABLE).select('*').eq('tenant_id', tenantId)).data || []).map((row) => mapAutomation(row as Record<string, unknown>))
    : []
  const runs = await listPendingAutomationRunsForTenant(tenantId)
  const systemState = await getTenantAutomationSystemState(tenantId)
  const summary = await buildAutomationSummaryForTenant(tenantId, overview)
  return { automations: overview, runs, systemState, summary }
}

export async function setAutomationPauseStateForCurrentTenant(input: { paused: boolean; reason?: string | null }) {
  const tenantContext = requireAutomationPermission(await getCurrentTenantContext(), 'automations.manage')
  await updateTenantAutomationSystemState(tenantContext.tenantId, {
    paused: input.paused,
    pausedAt: input.paused ? nowIso() : null,
    pausedBy: input.paused ? tenantContext.userId : null,
    pauseReason: input.paused ? toNullableText(input.reason) : null,
  })
  return getTenantAutomationSystemState(tenantContext.tenantId)
}

async function findEligibleCandidateForRun(
  automation: BusinessAutomationRecord,
  tenant: { id: string; name: string; legacyArtisanId: string | null; paused?: boolean },
  run: BusinessAutomationRunRecord,
) {
  const candidates = await evaluateForAutomation(automation, tenant)
  return candidates.find((candidate) => candidate.entityType === run.entityType && candidate.entityId === run.entityId) || null
}

export async function retryAutomationRunForCurrentTenant(runId: string) {
  const tenantContext = requireAutomationPermission(await getCurrentTenantContext(), 'automations.manage')
  const { data, error } = await supabaseAdmin
    .from(BUSINESS_AUTOMATION_RUNS_TABLE)
    .select('*, business_automations!inner(*)')
    .eq('id', runId)
    .eq('tenant_id', tenantContext.tenantId)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('RUN_NOT_FOUND')

  const run = mapRun(data as Record<string, unknown>)
  if (run.status !== 'failed') throw new Error('RUN_NOT_RETRYABLE')
  const automation = mapAutomation((data as Record<string, unknown>).business_automations as Record<string, unknown>)
  if (!automation.enabled) throw new Error('AUTOMATION_DISABLED')

  const tenant = {
    id: tenantContext.tenantId,
    name: tenantContext.tenant.name,
    legacyArtisanId: tenantContext.legacyArtisanId,
  }

  const candidate = await findEligibleCandidateForRun(automation, tenant, run)
  if (!candidate) {
    throw new Error('RUN_NOT_ELIGIBLE')
  }

  const retryRun = await createAutomationRun({
    automation,
    entityType: candidate.entityType,
    entityId: candidate.entityId,
    triggerReason: `${candidate.triggerReason} (retry)`,
    payload: candidate.payload,
    idempotencyKey: buildIdempotencyKey({
      tenantId: automation.tenantId,
      type: automation.type,
      entityType: candidate.entityType,
      entityId: candidate.entityId,
      windowKey: `retry-${Date.now()}`,
    }),
    status: 'pending',
  })

  if (!retryRun) {
    throw new Error('RETRY_DUPLICATE')
  }

  return executeRun(automation, tenant, retryRun, tenantContext.userId)
}

export async function notifyAssignmentAutomationEvent(input: {
  tenantId: string
  artisanId: string | null
  projectId: string
  title: string
  message: string
  type: 'responsible' | 'appointment'
}) {
  if (!(await tableExists(BUSINESS_AUTOMATIONS_TABLE))) return
  const { data, error } = await supabaseAdmin
    .from(BUSINESS_AUTOMATIONS_TABLE)
    .select('*')
    .eq('tenant_id', input.tenantId)
    .eq('type', 'assignment_notification')
    .eq('enabled', true)
    .limit(1)
    .maybeSingle()
  if (error || !data || !input.artisanId) return
  await createInternalReminderNotification({
    artisanId: input.artisanId,
    tenantId: input.tenantId,
    projectId: input.projectId,
    title: input.title,
    message: input.message,
    actionUrl: `/dashboard-v2/projet/${input.projectId}`,
  })
  await createAutomationRun({
    automation: mapAutomation(data as Record<string, unknown>),
    entityType: 'project',
    entityId: input.projectId,
    triggerReason: input.message,
    payload: { projectId: input.projectId, notificationType: input.type },
    idempotencyKey: buildIdempotencyKey({
      tenantId: input.tenantId,
      type: 'assignment_notification',
      entityType: 'project',
      entityId: input.projectId,
      windowKey: `${new Date().toISOString().slice(0, 13)}:${input.type}`,
    }),
    status: 'succeeded',
  })
}
