import 'server-only'
import { TABLES, createEvent, getEvents, updateEvent, updateArtisanConfig } from '@/src/lib/airtable'
import { supabaseAdmin } from '@/src/lib/supabase/server'

// Registre des actions contrôlées de l'Assistant Kadria (V1).
//
// RÈGLE ABSOLUE : aucune écriture en base ne doit jamais se produire au
// moment où l'assistant formule une proposition. Ce fichier fournit
// uniquement :
//  - la liste blanche des types d'action autorisés (ACTION_TYPES)
//  - les validateurs de payload par type (jamais faire confiance au client)
//  - les exécuteurs par type (appelés UNIQUEMENT depuis
//    app/api/assistant/actions/execute/route.ts, après confirmation
//    explicite de l'artisan)
//  - le helper de journalisation best-effort (assistant_action_logs)
//
// Toute action doit être scopée à l'artisan authentifié (dérivé de la
// session serveur, jamais du payload client) et vérifier la propriété de la
// ressource ciblée avant toute écriture.

export const PROJECT_STATUS_VALUES = [
  'Nouveau',
  'À rappeler',
  'Qualifié',
  'Devis envoyé',
] as const

// 'Gagné' et 'Perdu' sont volontairement EXCLUS du whitelist V1 : ces statuts
// déclenchent des flux de clôture commerciale liés aux devis (voir
// requestCommercialClosure côté page projet) qui touchent à des logiques de
// devis/acompte que ce lot ne doit pas modifier. Documenté comme limitation
// connue V1.
export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number]

export const WIDGET_COLOR_MODES = ['sobriety', 'immersive', 'premium_dark'] as const
export type WidgetColorMode = (typeof WIDGET_COLOR_MODES)[number]

export const ACTION_TYPES = [
  'update_widget_welcome_text',
  'update_widget_primary_color',
  'update_widget_secondary_color',
  'update_widget_color_mode',
  'add_project_note',
  'update_project_status',
  'create_project_followup',
  'disable_project_followup',
] as const

export type ActionType = (typeof ACTION_TYPES)[number]

export function isKnownActionType(value: unknown): value is ActionType {
  return typeof value === 'string' && (ACTION_TYPES as readonly string[]).includes(value)
}

// Types explicitement interdits en V1 (documentation / défense en profondeur
// — même si un type non listé ici est déjà rejeté par isKnownActionType).
export const FORBIDDEN_ACTION_TYPES = [
  'delete_project',
  'delete_client',
  'delete_artisan',
  'send_email',
  'send_sms',
  'modify_accepted_devis',
  'modify_sent_devis',
  'accept_devis',
  'refuse_devis',
  'change_stripe_plan',
  'modify_subscription',
  'modify_quotas',
  'modify_admin_data',
  'execute_sql',
] as const

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/
const MAX_WELCOME_TEXT_LENGTH = 300
const MAX_NOTE_LENGTH = 2000

export interface ActionValidationResult {
  valid: boolean
  error?: string
}

export interface ActionExecutionContext {
  artisanId: string
  userId?: string
}

export interface ActionExecutionResult {
  success: boolean
  error?: string
  oldValue?: unknown
  newValue?: unknown
  targetType?: string
  targetId?: string
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false
  const d = new Date(value)
  return !Number.isNaN(d.getTime())
}

// --- Validation des payloads (jamais confiance au client) -----------------

export function validateActionPayload(type: ActionType, payload: unknown): ActionValidationResult {
  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, error: 'Payload invalide' }
  }
  const p = payload as Record<string, unknown>

  switch (type) {
    case 'update_widget_welcome_text': {
      if (!isNonEmptyString(p.newValue, MAX_WELCOME_TEXT_LENGTH)) {
        return { valid: false, error: `Le texte d'accueil doit être une chaîne non vide de ${MAX_WELCOME_TEXT_LENGTH} caractères maximum` }
      }
      return { valid: true }
    }
    case 'update_widget_primary_color':
    case 'update_widget_secondary_color': {
      if (typeof p.newValue !== 'string' || !HEX_COLOR_RE.test(p.newValue)) {
        return { valid: false, error: 'La couleur doit être un code hexadécimal valide (ex : #22c55e)' }
      }
      return { valid: true }
    }
    case 'update_widget_color_mode': {
      if (typeof p.newValue !== 'string' || !(WIDGET_COLOR_MODES as readonly string[]).includes(p.newValue)) {
        return { valid: false, error: 'Le mode visuel doit être sobriety, immersive ou premium_dark' }
      }
      return { valid: true }
    }
    case 'add_project_note': {
      if (typeof p.projectId !== 'string' || !p.projectId) {
        return { valid: false, error: 'projectId requis' }
      }
      if (!isNonEmptyString(p.note, MAX_NOTE_LENGTH)) {
        return { valid: false, error: `La note doit être une chaîne non vide de ${MAX_NOTE_LENGTH} caractères maximum` }
      }
      return { valid: true }
    }
    case 'update_project_status': {
      if (typeof p.projectId !== 'string' || !p.projectId) {
        return { valid: false, error: 'projectId requis' }
      }
      if (typeof p.newStatus !== 'string' || !(PROJECT_STATUS_VALUES as readonly string[]).includes(p.newStatus)) {
        return { valid: false, error: `Le statut doit être l'un de : ${PROJECT_STATUS_VALUES.join(', ')}` }
      }
      return { valid: true }
    }
    case 'create_project_followup': {
      if (typeof p.projectId !== 'string' || !p.projectId) {
        return { valid: false, error: 'projectId requis' }
      }
      if (!isValidDateString(p.date)) {
        return { valid: false, error: 'date de relance invalide' }
      }
      return { valid: true }
    }
    case 'disable_project_followup': {
      if (typeof p.projectId !== 'string' || !p.projectId) {
        return { valid: false, error: 'projectId requis' }
      }
      return { valid: true }
    }
    default:
      return { valid: false, error: 'Type d\'action inconnu' }
  }
}

// --- Vérifications de propriété multi-tenant -------------------------------

async function getOwnedProject(projectId: string, artisanId: string) {
  const direct = await supabaseAdmin
    .from(TABLES.projects)
    .select('*')
    .eq('id', projectId)
    .limit(1)
    .maybeSingle()

  if (direct.error) throw direct.error
  let record = direct.data

  if (!record) {
    const legacy = await supabaseAdmin
      .from(TABLES.projects)
      .select('*')
      .eq('record_id', projectId)
      .limit(1)
      .maybeSingle()
    if (legacy.error) throw legacy.error
    record = legacy.data
  }

  if (!record) return null
  if (record.artisan_id !== artisanId) return null
  return record
}

async function createActivityLog(projectId: string, action: string, description: string) {
  try {
    await supabaseAdmin.from(TABLES.activity).insert({
      project_id: projectId,
      action,
      description,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[ASSISTANT-ACTIONS] activity log failed', err instanceof Error ? err.message : String(err))
  }
}

// --- Exécuteurs (écriture réelle en base, appelés uniquement après clic) --

async function executeUpdateWidgetWelcomeText(ctx: ActionExecutionContext, payload: { newValue: string }): Promise<ActionExecutionResult> {
  const { data: existing } = await supabaseAdmin
    .from(TABLES.artisanConfig)
    .select('welcome_message')
    .eq('artisan_id', ctx.artisanId)
    .maybeSingle()

  const oldValue = existing?.welcome_message ?? null
  await updateArtisanConfig(ctx.artisanId, { welcome_message: payload.newValue })

  return { success: true, oldValue, newValue: payload.newValue, targetType: 'widget_config', targetId: ctx.artisanId }
}

async function executeUpdateWidgetColor(
  ctx: ActionExecutionContext,
  column: 'primary_color' | 'secondary_color',
  payload: { newValue: string }
): Promise<ActionExecutionResult> {
  const { data: existing } = await supabaseAdmin
    .from(TABLES.artisanConfig)
    .select(column)
    .eq('artisan_id', ctx.artisanId)
    .maybeSingle()

  const oldValue = (existing as Record<string, unknown> | null)?.[column] ?? null
  await updateArtisanConfig(ctx.artisanId, { [column]: payload.newValue })

  return { success: true, oldValue, newValue: payload.newValue, targetType: 'widget_config', targetId: ctx.artisanId }
}

async function executeUpdateWidgetColorMode(ctx: ActionExecutionContext, payload: { newValue: WidgetColorMode }): Promise<ActionExecutionResult> {
  const { data: existing } = await supabaseAdmin
    .from(TABLES.artisanConfig)
    .select('widget_color_mode')
    .eq('artisan_id', ctx.artisanId)
    .maybeSingle()

  const oldValue = existing?.widget_color_mode ?? 'sobriety'
  await updateArtisanConfig(ctx.artisanId, { widget_color_mode: payload.newValue })

  return { success: true, oldValue, newValue: payload.newValue, targetType: 'widget_config', targetId: ctx.artisanId }
}

async function executeAddProjectNote(ctx: ActionExecutionContext, payload: { projectId: string; note: string }): Promise<ActionExecutionResult> {
  const project = await getOwnedProject(payload.projectId, ctx.artisanId)
  if (!project) return { success: false, error: 'Projet introuvable ou non autorisé' }

  const oldValue = project.artisan_notes || ''
  const separator = oldValue && oldValue.trim().length > 0 ? '\n\n' : ''
  const timestamp = new Date().toLocaleString('fr-FR')
  const newValue = `${oldValue}${separator}[${timestamp}] ${payload.note}`

  const { error } = await supabaseAdmin
    .from(TABLES.projects)
    .update({ artisan_notes: newValue })
    .eq('id', project.id)
    .eq('artisan_id', ctx.artisanId)

  if (error) return { success: false, error: 'Échec de l\'écriture en base' }

  await createActivityLog(project.id, 'NOTE_UPDATED', 'Note interne ajoutée par l\'assistant (validée par l\'artisan)')

  return { success: true, oldValue, newValue, targetType: 'project', targetId: project.id }
}

async function executeUpdateProjectStatus(ctx: ActionExecutionContext, payload: { projectId: string; newStatus: ProjectStatusValue }): Promise<ActionExecutionResult> {
  const project = await getOwnedProject(payload.projectId, ctx.artisanId)
  if (!project) return { success: false, error: 'Projet introuvable ou non autorisé' }

  const oldValue = project.status || 'Nouveau'

  const { error } = await supabaseAdmin
    .from(TABLES.projects)
    .update({ status: payload.newStatus })
    .eq('id', project.id)
    .eq('artisan_id', ctx.artisanId)

  if (error) return { success: false, error: 'Échec de l\'écriture en base' }

  await createActivityLog(project.id, 'STATUS_UPDATED', `Statut modifié par l'assistant (validé par l'artisan) : ${payload.newStatus}`)

  return { success: true, oldValue, newValue: payload.newStatus, targetType: 'project', targetId: project.id }
}

async function executeCreateProjectFollowup(ctx: ActionExecutionContext, payload: { projectId: string; date: string }): Promise<ActionExecutionResult> {
  const project = await getOwnedProject(payload.projectId, ctx.artisanId)
  if (!project) return { success: false, error: 'Projet introuvable ou non autorisé' }

  const oldValue = project.callback_date || null

  const { error } = await supabaseAdmin
    .from(TABLES.projects)
    .update({ callback_date: payload.date })
    .eq('id', project.id)
    .eq('artisan_id', ctx.artisanId)

  if (error) return { success: false, error: 'Échec de l\'écriture en base' }

  // Réutilise le mécanisme "Relance" existant (table Events), même logique
  // que app/api/projects/[id]/route.ts pour rester cohérent.
  try {
    const existingEvents = await getEvents(ctx.artisanId)
    const existingRelance = existingEvents.find(
      (e: { projectId: string; type: string }) => e.projectId === project.id && e.type === 'Relance'
    )
    const clientName = project.client_name || 'Prospect'

    if (existingRelance) {
      await updateEvent(existingRelance.id, { Date: payload.date, Title: `Relance — ${clientName}` })
    } else {
      await createEvent({
        title: `Relance — ${clientName}`,
        date: payload.date,
        type: 'Relance',
        projectId: project.id,
        artisanId: ctx.artisanId,
        notes: 'Relance programmée par l\'assistant Kadria (validée par l\'artisan)',
      })
    }
  } catch (err) {
    console.error('[ASSISTANT-ACTIONS] relance event sync failed', err instanceof Error ? err.message : String(err))
  }

  await createActivityLog(project.id, 'CALLBACK_DATE_UPDATED', `Relance programmée par l'assistant (validée par l'artisan) : ${payload.date}`)

  return { success: true, oldValue, newValue: payload.date, targetType: 'project', targetId: project.id }
}

async function executeDisableProjectFollowup(ctx: ActionExecutionContext, payload: { projectId: string }): Promise<ActionExecutionResult> {
  const project = await getOwnedProject(payload.projectId, ctx.artisanId)
  if (!project) return { success: false, error: 'Projet introuvable ou non autorisé' }

  const oldValue = project.callback_date || null

  const { error } = await supabaseAdmin
    .from(TABLES.projects)
    .update({ callback_date: null })
    .eq('id', project.id)
    .eq('artisan_id', ctx.artisanId)

  if (error) return { success: false, error: 'Échec de l\'écriture en base' }

  await createActivityLog(project.id, 'CALLBACK_DATE_UPDATED', 'Relance désactivée par l\'assistant (validée par l\'artisan)')

  return { success: true, oldValue, newValue: null, targetType: 'project', targetId: project.id }
}

export async function executeAction(
  type: ActionType,
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext
): Promise<ActionExecutionResult> {
  switch (type) {
    case 'update_widget_welcome_text':
      return executeUpdateWidgetWelcomeText(ctx, payload as { newValue: string })
    case 'update_widget_primary_color':
      return executeUpdateWidgetColor(ctx, 'primary_color', payload as { newValue: string })
    case 'update_widget_secondary_color':
      return executeUpdateWidgetColor(ctx, 'secondary_color', payload as { newValue: string })
    case 'update_widget_color_mode':
      return executeUpdateWidgetColorMode(ctx, payload as { newValue: WidgetColorMode })
    case 'add_project_note':
      return executeAddProjectNote(ctx, payload as { projectId: string; note: string })
    case 'update_project_status':
      return executeUpdateProjectStatus(ctx, payload as { projectId: string; newStatus: ProjectStatusValue })
    case 'create_project_followup':
      return executeCreateProjectFollowup(ctx, payload as { projectId: string; date: string })
    case 'disable_project_followup':
      return executeDisableProjectFollowup(ctx, payload as { projectId: string })
    default:
      return { success: false, error: 'Type d\'action inconnu' }
  }
}

// --- Journalisation best-effort --------------------------------------------
// La table assistant_action_logs est proposée via une migration NON
// appliquée automatiquement. Tant qu'elle n'existe pas en base, ces appels
// échouent silencieusement (catch) et ne doivent JAMAIS bloquer la
// proposition ni l'exécution réelle de l'action.

export type AssistantActionLogStatus = 'proposed' | 'executed' | 'cancelled' | 'failed'

export interface AssistantActionLogInput {
  artisanId: string
  userId?: string | null
  actionType: string
  status: AssistantActionLogStatus
  targetType?: string | null
  targetId?: string | null
  summary?: string | null
  oldValue?: unknown
  newValue?: unknown
  payload?: unknown
  errorMessage?: string | null
}

export async function logAssistantAction(input: AssistantActionLogInput): Promise<void> {
  try {
    await supabaseAdmin.from('assistant_action_logs').insert({
      artisan_id: input.artisanId,
      user_id: input.userId ?? null,
      action_type: input.actionType,
      status: input.status,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      summary: input.summary ?? null,
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
      payload: input.payload ?? null,
      error_message: input.errorMessage ?? null,
      executed_at: input.status === 'executed' || input.status === 'failed' ? new Date().toISOString() : null,
    })
  } catch (err) {
    // Observabilité best-effort uniquement : ne doit jamais faire échouer
    // l'action elle-même (la table peut ne pas encore exister tant que la
    // migration n'a pas été appliquée manuellement).
    console.error('[ASSISTANT-ACTIONS] log failed', err instanceof Error ? err.message : String(err))
  }
}
