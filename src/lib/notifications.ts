// Centre de notifications artisan V1 : boîte de réception globale et
// transverse de l'artisan (lu/non-lu), distincte de "ProjectClientEvents"
// (timeline client/portail, cf. src/lib/client-events.ts) et de "Activity"
// (journal interne plat). Toute lecture/écriture doit passer par ce module
// pour garder une seule source de vérité, et pour rester tolérant si la
// table n'existe pas encore (migration 20260713_artisan_notifications.sql
// pas forcément appliquée dans cet environnement — jamais de crash de
// route pour un incident de notification).

import { supabaseAdmin } from '@/src/lib/supabase/server'
import { attachTenantIdToPayload } from '@/src/lib/tenant-context'

export const ARTISAN_NOTIFICATIONS_TABLE = 'ArtisanNotifications'

export const NOTIFICATION_TYPES = [
  'new_project',
  'client_message',
  'client_info_updated',
  'quote_sent',
  'quote_accepted',
  'quote_declined',
  'deposit_requested',
  'deposit_paid',
  'followup_due',
  'appointment_due',
  'status_changed',
  'system',
] as const

export type ArtisanNotificationType = (typeof NOTIFICATION_TYPES)[number]

export const NOTIFICATION_PRIORITIES = ['high', 'medium', 'low'] as const
export type ArtisanNotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number]

export const NOTIFICATION_STATUSES = ['unread', 'read'] as const
export type ArtisanNotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

export interface ArtisanNotification {
  id: string
  artisanId: string
  projectId: string | null
  type: ArtisanNotificationType
  title: string
  message: string
  priority: ArtisanNotificationPriority
  status: ArtisanNotificationStatus
  readAt: string | null
  actionUrl: string | null
  metadata: Record<string, unknown>
  createdAt: string | null
  updatedAt: string | null
}

export interface CreateArtisanNotificationInput {
  artisanId: string
  projectId?: string | null
  tenantId?: string | null
  type: ArtisanNotificationType
  title: string
  message: string
  priority?: ArtisanNotificationPriority
  actionUrl?: string | null
  metadata?: Record<string, unknown> | null
  /**
   * Fenêtre anti-spam (ms) : si une notification non lue du même
   * artisan_id + project_id + type existe déjà dans cette fenêtre, on met à
   * jour son message/metadata au lieu d'en recréer une (évite le spam,
   * volontairement simple — pas de file/agrégation avancée en V1).
   */
  dedupeWindowMs?: number
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = String((error as { message?: unknown }).message || '')
  const code = String((error as { code?: unknown }).code || '')
  return code === '42P01' || /relation .* does not exist/i.test(message) || /could not find the table/i.test(message)
}

function mapRow(row: Record<string, unknown>): ArtisanNotification {
  return {
    id: String(row.id),
    artisanId: String(row.artisan_id || ''),
    projectId: row.project_id ? String(row.project_id) : null,
    type: (row.type as ArtisanNotificationType) || 'system',
    title: String(row.title || ''),
    message: String(row.message || ''),
    priority: (row.priority as ArtisanNotificationPriority) || 'medium',
    status: (row.status as ArtisanNotificationStatus) || 'unread',
    readAt: row.read_at ? String(row.read_at) : null,
    actionUrl: row.action_url ? String(row.action_url) : null,
    metadata: (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  }
}

const SELECT_COLUMNS =
  'id, artisan_id, project_id, type, title, message, priority, status, read_at, action_url, metadata, created_at, updated_at'

const DEFAULT_DEDUPE_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

// Crée une notification artisan. Ne throw jamais : une erreur d'insertion
// (table absente, contrainte...) ne doit jamais faire échouer le flux métier
// principal (création de projet, réponse client, paiement...), elle est
// seulement loggée.
export async function createArtisanNotification(
  input: CreateArtisanNotificationInput,
): Promise<{ ok: boolean; notification: ArtisanNotification | null }> {
  try {
    if (!NOTIFICATION_TYPES.includes(input.type)) {
      console.error('[NOTIFICATIONS] Type refusé:', input.type)
      return { ok: false, notification: null }
    }
    if (!input.artisanId) {
      console.error('[NOTIFICATIONS] artisanId manquant')
      return { ok: false, notification: null }
    }

    // Anti-spam simple : si une notification identique (même artisan +
    // projet + type) non lue existe déjà récemment, on la met à jour plutôt
    // que d'en créer une nouvelle.
    const dedupeWindowMs = input.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS
    if (input.projectId && dedupeWindowMs > 0) {
      const sinceIso = new Date(Date.now() - dedupeWindowMs).toISOString()
      const { data: existing, error: existingError } = await supabaseAdmin
        .from(ARTISAN_NOTIFICATIONS_TABLE)
        .select(SELECT_COLUMNS)
        .eq('artisan_id', input.artisanId)
        .eq('project_id', input.projectId)
        .eq('type', input.type)
        .eq('status', 'unread')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingError && !isMissingTableError(existingError)) {
        console.error('[NOTIFICATIONS] Dedupe lookup error:', existingError.message)
      }

      if (existing) {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from(ARTISAN_NOTIFICATIONS_TABLE)
          .update({
            title: input.title,
            message: input.message,
            priority: input.priority || 'medium',
            action_url: input.actionUrl || null,
            metadata: input.metadata || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select(SELECT_COLUMNS)
          .maybeSingle()

        if (updateError) {
          console.error('[NOTIFICATIONS] Dedupe update error:', updateError.message)
        } else if (updated) {
          return { ok: true, notification: mapRow(updated as Record<string, unknown>) }
        }
      }
    }

    const insertPayload = await attachTenantIdToPayload(
      ARTISAN_NOTIFICATIONS_TABLE,
      {
        artisan_id: input.artisanId,
        project_id: input.projectId || null,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority || 'medium',
        action_url: input.actionUrl || null,
        metadata: input.metadata || null,
      },
      {
        tenantId: input.tenantId ?? null,
        artisanId: input.artisanId,
        projectId: input.projectId || null,
      },
    )

    const { data, error } = await supabaseAdmin
      .from(ARTISAN_NOTIFICATIONS_TABLE)
      .insert(insertPayload)
      .select(SELECT_COLUMNS)
      .maybeSingle()

    if (error) {
      if (isMissingTableError(error)) {
        console.error('[NOTIFICATIONS] Table ArtisanNotifications absente (migration non appliquée) — insertion ignorée.')
      } else {
        console.error('[NOTIFICATIONS] Insert error:', error.message)
      }
      return { ok: false, notification: null }
    }

    if (!data) return { ok: false, notification: null }

    return { ok: true, notification: mapRow(data as Record<string, unknown>) }
  } catch (e) {
    console.error('[NOTIFICATIONS] createArtisanNotification threw:', e instanceof Error ? e.message : String(e))
    return { ok: false, notification: null }
  }
}

// Sucre pour créer une notification liée à un projet, avec action_url
// pointant vers le dossier par défaut.
export async function createProjectNotification(
  project: { id: string; artisanId: string },
  type: ArtisanNotificationType,
  options: {
    title: string
    message: string
    priority?: ArtisanNotificationPriority
    actionUrl?: string | null
    metadata?: Record<string, unknown> | null
    dedupeWindowMs?: number
  },
): Promise<{ ok: boolean; notification: ArtisanNotification | null }> {
  return createArtisanNotification({
    artisanId: project.artisanId,
    projectId: project.id,
    type,
    title: options.title,
    message: options.message,
    priority: options.priority,
    actionUrl: options.actionUrl ?? `/dashboard-v2/projet/${project.id}`,
    metadata: options.metadata,
    dedupeWindowMs: options.dedupeWindowMs,
  })
}

export interface ListNotificationsOptions {
  limit?: number
  unreadOnly?: boolean
  cursor?: string | null // created_at ISO du dernier élément déjà chargé
}

// Liste les notifications d'un artisan, triées du plus récent au plus
// ancien. Tolérant à l'absence de la table (retourne une liste vide et un
// compteur à 0 plutôt que de crasher le dashboard).
export async function listArtisanNotifications(
  artisanId: string,
  options: ListNotificationsOptions = {},
): Promise<{ notifications: ArtisanNotification[]; unreadCount: number }> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100)

  try {
    let query = supabaseAdmin
      .from(ARTISAN_NOTIFICATIONS_TABLE)
      .select(SELECT_COLUMNS)
      .eq('artisan_id', artisanId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (options.unreadOnly) {
      query = query.eq('status', 'unread')
    }
    if (options.cursor) {
      query = query.lt('created_at', options.cursor)
    }

    const { data, error } = await query

    if (error) {
      if (!isMissingTableError(error)) {
        console.error('[NOTIFICATIONS] listArtisanNotifications fetch error:', error.message)
      }
      return { notifications: [], unreadCount: 0 }
    }

    const notifications = (data || []).map((row) => mapRow(row as Record<string, unknown>))
    const unreadCount = await getUnreadNotificationCount(artisanId)

    return { notifications, unreadCount }
  } catch (e) {
    console.error('[NOTIFICATIONS] listArtisanNotifications threw:', e instanceof Error ? e.message : String(e))
    return { notifications: [], unreadCount: 0 }
  }
}

// Compte le nombre de notifications non lues d'un artisan. Tolérant à
// l'absence de la table (retourne 0).
export async function getUnreadNotificationCount(artisanId: string): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from(ARTISAN_NOTIFICATIONS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('artisan_id', artisanId)
      .eq('status', 'unread')

    if (error) {
      if (!isMissingTableError(error)) {
        console.error('[NOTIFICATIONS] getUnreadNotificationCount error:', error.message)
      }
      return 0
    }

    return count || 0
  } catch (e) {
    console.error('[NOTIFICATIONS] getUnreadNotificationCount threw:', e instanceof Error ? e.message : String(e))
    return 0
  }
}

// Marque une notification comme lue. Scoping strict par artisan_id : ne
// marque jamais une notification d'un autre artisan (renvoie ok: false,
// jamais d'erreur bruyante côté client pour un id inexistant/étranger).
export async function markNotificationRead(
  notificationId: string,
  artisanId: string,
): Promise<{ ok: boolean }> {
  try {
    const { data, error } = await supabaseAdmin
      .from(ARTISAN_NOTIFICATIONS_TABLE)
      .update({ status: 'read', read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('artisan_id', artisanId)
      .select('id')
      .maybeSingle()

    if (error) {
      if (!isMissingTableError(error)) {
        console.error('[NOTIFICATIONS] markNotificationRead error:', error.message)
      }
      return { ok: false }
    }

    return { ok: Boolean(data) }
  } catch (e) {
    console.error('[NOTIFICATIONS] markNotificationRead threw:', e instanceof Error ? e.message : String(e))
    return { ok: false }
  }
}

// Marque toutes les notifications non lues d'un artisan comme lues.
export async function markAllNotificationsRead(artisanId: string): Promise<{ ok: boolean }> {
  try {
    const { error } = await supabaseAdmin
      .from(ARTISAN_NOTIFICATIONS_TABLE)
      .update({ status: 'read', read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('artisan_id', artisanId)
      .eq('status', 'unread')

    if (error) {
      if (!isMissingTableError(error)) {
        console.error('[NOTIFICATIONS] markAllNotificationsRead error:', error.message)
      }
      return { ok: false }
    }

    return { ok: true }
  } catch (e) {
    console.error('[NOTIFICATIONS] markAllNotificationsRead threw:', e instanceof Error ? e.message : String(e))
    return { ok: false }
  }
}
