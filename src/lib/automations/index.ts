import 'server-only'

import { TABLES, getAllSentDevis, getArtisanConfig, resolveProjectId, updateDevis } from '@/src/lib/airtable'
import { notifyArtisanQuoteFollowedUp } from '@/src/lib/artisan-notifications'
import { getPublicDevisUrl } from '@/src/lib/base-url'
import { createArtisanNotification } from '@/src/lib/notifications'
import { generateQuoteFollowupEmailForStage, getQuoteFollowupState } from '@/src/lib/quote-followup'
import { getProjectDisplayTitle } from '@/src/lib/project-detail/project-headline'
import { resolveDevisEmailBranding } from '@/src/lib/devis-email-branding'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext, tableExists } from '@/src/lib/tenant-context'
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

export async function listAutomationOverviewForCurrentTenant(): Promise<AutomationOverviewItem[]> {
  const tenantContext = await getCurrentTenantContext()
  if (!tenantContext) throw new Error('TENANT_CONTEXT_REQUIRED')
  if (!checkPermission(tenantContext, 'automations.read')) throw new Error('FORBIDDEN')
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
}): Promise<BusinessAutomationRecord> {
  const tenantContext = await getCurrentTenantContext()
  if (!tenantContext) throw new Error('TENANT_CONTEXT_REQUIRED')
  if (!checkPermission(tenantContext, 'automations.manage')) throw new Error('FORBIDDEN')
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
    if (String(error.code || '') === '23505') return null
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

async function evaluateForAutomation(automation: BusinessAutomationRecord, tenant: { id: string; name: string; legacyArtisanId: string | null }) {
  switch (automation.type) {
    case 'quote_followup': {
      const allSent = await getAllSentDevis()
      const due = allSent
        .filter((devis) => devis.artisanId === tenant.legacyArtisanId)
        .map((devis) => ({ devis, state: getQuoteFollowupState(devis) }))
        .filter(({ state }) => state.shouldAutoFollowUp)
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
    .select('*, tenants!inner(id, name, legacy_artisan_id)')
    .eq('enabled', true)
  if (error) throw new Error(error.message)

  let createdRuns = 0
  let executedRuns = 0
  const failures: string[] = []
  const rows = (data || []) as Array<Record<string, unknown> & { tenants?: Record<string, unknown> }>

  for (const row of rows) {
    const automation = mapAutomation(row)
    const tenantRow = row.tenants || {}
    const tenant = {
      id: automation.tenantId,
      name: toText((tenantRow as Record<string, unknown>).name),
      legacyArtisanId: toNullableText((tenantRow as Record<string, unknown>).legacy_artisan_id),
    }
    try {
      const candidates = await evaluateForAutomation(automation, tenant)
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
        if (!run) continue
        createdRuns += 1
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

  return {
    processedTenants: new Set(rows.map((row) => toText(row.tenant_id))).size,
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
  return { automations: overview, runs }
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
