// Timeline client V1 : accès partagé à la table "ProjectClientEvents"
// (migration 20260711_project_client_events.sql, pas encore forcément
// appliquée en base selon l'environnement). Toute lecture/écriture doit
// passer par ce module pour garder une seule source de vérité sur la liste
// blanche event_type/visibility/source, et pour rester tolérant si la table
// n'existe pas encore (fallback silencieux, jamais de crash de route).

import { supabaseAdmin } from '@/src/lib/supabase/server'
import { attachTenantIdToPayload } from '@/src/lib/tenant-context'

export const CLIENT_EVENTS_TABLE = 'ProjectClientEvents'

export const EVENT_TYPES = [
  'client_message',
  'artisan_reply',
  'client_info_updated',
  'appointment_scheduled',
  'appointment_updated',
  'quote_sent',
  'quote_accepted',
  'quote_declined',
  'project_status_updated',
] as const

export type ClientEventType = (typeof EVENT_TYPES)[number]

// Types qu'un événement peut avoir dans ce lot (les autres sont réservés
// pour de futurs lots, whitelist seulement, pas de production ici).
export const PRODUCED_EVENT_TYPES = new Set<ClientEventType>([
  'client_message',
  'artisan_reply',
  'client_info_updated',
])

// Événements "significatifs" côté artisan pour la colonne Activité du suivi
// commercial : des nouveautés que l'artisan doit voir/lire. On exclut
// explicitement artisan_reply (action de l'artisan lui-même, jamais une
// nouveauté pour lui) et tout futur type interne non listé ici. Liste
// blanche volontairement restrictive plutôt que "tout sauf artisan_reply",
// pour rester sûr si de nouveaux types internes apparaissent plus tard.
export const SIGNIFICANT_CLIENT_EVENT_TYPES = new Set<ClientEventType>([
  'client_message',
  'client_info_updated',
  'quote_accepted',
  'quote_declined',
  'appointment_scheduled',
  'appointment_updated',
])

// Libellés courts affichés dans la colonne Activité ("Message client",
// "Infos complétées"...).
export const SIGNIFICANT_EVENT_LABELS: Record<string, string> = {
  client_message: 'Message client',
  client_info_updated: 'Infos complétées',
  quote_accepted: 'Devis accepté',
  quote_declined: 'Devis refusé',
  appointment_scheduled: 'RDV planifié',
  appointment_updated: 'RDV mis à jour',
}

export interface ClientActivitySummary {
  unreadCount: number
  lastEventType: string | null
  lastEventAt: string | null
}

// Récupère, en une seule requête groupée, les événements client
// significatifs pour un lot de projets (utilisé par la liste de suivi
// commercial pour éviter tout N+1). Tolérant à l'absence de la table (V1 pas
// encore appliquée dans cet environnement) : retourne une map vide plutôt
// que de faire planter la liste.
export async function getClientActivitySummaries(
  projectIds: string[],
  lastSeenAtByProjectId: Map<string, string | null>,
): Promise<Map<string, ClientActivitySummary>> {
  const result = new Map<string, ClientActivitySummary>()
  if (!projectIds.length) return result

  try {
    const { data, error } = await supabaseAdmin
      .from(CLIENT_EVENTS_TABLE)
      .select('project_id, event_type, created_at')
      .in('project_id', projectIds)
      .eq('visibility', 'client')
      .order('created_at', { ascending: false })
      .limit(2000)

    if (error) {
      if (!isMissingTableError(error)) {
        console.error('[CLIENT-EVENTS] getClientActivitySummaries fetch error:', error.message)
      }
      return result
    }

    for (const row of (data || []) as Record<string, unknown>[]) {
      const eventType = String(row.event_type || '')
      if (!SIGNIFICANT_CLIENT_EVENT_TYPES.has(eventType as ClientEventType)) continue

      const projectId = String(row.project_id || '')
      if (!projectId) continue

      const createdAt = row.created_at ? String(row.created_at) : null

      const existing = result.get(projectId)
      if (!existing) {
        // Premier événement rencontré pour ce projet = le plus récent
        // (tri created_at desc), donc c'est le "dernier événement".
        result.set(projectId, { unreadCount: 0, lastEventType: eventType, lastEventAt: createdAt })
      }

      const lastSeenAt = lastSeenAtByProjectId.get(projectId) ?? null
      const isUnread = !lastSeenAt || (createdAt !== null && createdAt > lastSeenAt)
      if (isUnread) {
        const entry = result.get(projectId)
        if (entry) entry.unreadCount += 1
      }
    }

    return result
  } catch (e) {
    console.error('[CLIENT-EVENTS] getClientActivitySummaries threw:', e instanceof Error ? e.message : String(e))
    return result
  }
}

export const VISIBILITIES = ['client', 'internal'] as const
export type ClientEventVisibility = (typeof VISIBILITIES)[number]

export const SOURCES = ['client', 'artisan', 'system'] as const
export type ClientEventSource = (typeof SOURCES)[number]

export interface ClientEventInput {
  projectId: string
  artisanId: string
  tenantId?: string | null
  eventType: ClientEventType
  visibility: ClientEventVisibility
  source: ClientEventSource
  title: string
  message?: string | null
  metadata?: Record<string, unknown> | null
  createdBy?: string | null
}

export interface PublicTimelineEvent {
  id: string
  type: string
  title: string
  message: string | null
  source: string
  createdAt: string | null
  metadata: Record<string, unknown>
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = String((error as { message?: unknown }).message || '')
  const code = String((error as { code?: unknown }).code || '')
  // Postgres "undefined_table" (42P01) ou message PostgREST correspondant :
  // la migration n'a pas encore été appliquée dans cet environnement.
  return code === '42P01' || /relation .* does not exist/i.test(message) || /could not find the table/i.test(message)
}

// Insère un événement de timeline client. Ne throw jamais : une erreur
// d'insertion (table absente, contrainte, etc.) ne doit jamais faire
// échouer le flux principal (sauvegarde du message client / réponse
// artisan), elle est seulement loggée.
export async function createClientEvent(input: ClientEventInput): Promise<{ ok: boolean; event: PublicTimelineEvent | null }> {
  try {
    if (!EVENT_TYPES.includes(input.eventType)) {
      console.error('[CLIENT-EVENTS] Type événement refusé:', input.eventType)
      return { ok: false, event: null }
    }
    if (!VISIBILITIES.includes(input.visibility)) {
      console.error('[CLIENT-EVENTS] Visibilité refusée:', input.visibility)
      return { ok: false, event: null }
    }
    if (!SOURCES.includes(input.source)) {
      console.error('[CLIENT-EVENTS] Source refusée:', input.source)
      return { ok: false, event: null }
    }

    const insertPayload = await attachTenantIdToPayload(
      CLIENT_EVENTS_TABLE,
      {
        project_id: input.projectId,
        artisan_id: input.artisanId,
        event_type: input.eventType,
        visibility: input.visibility,
        source: input.source,
        title: input.title,
        message: input.message || null,
        metadata: input.metadata || null,
        created_by: input.createdBy || null,
      },
      {
        tenantId: input.tenantId ?? null,
        artisanId: input.artisanId,
        projectId: input.projectId,
      },
    )

    const { data, error } = await supabaseAdmin
      .from(CLIENT_EVENTS_TABLE)
      .insert(insertPayload)
      .select('id, event_type, title, message, source, created_at, metadata')
      .maybeSingle()

    if (error) {
      if (isMissingTableError(error)) {
        console.error('[CLIENT-EVENTS] Table ProjectClientEvents absente (migration non appliquée) — insertion ignorée.')
      } else {
        console.error('[CLIENT-EVENTS] Insert error:', error.message)
      }
      return { ok: false, event: null }
    }

    if (!data) return { ok: false, event: null }

    return {
      ok: true,
      event: {
        id: String(data.id),
        type: String(data.event_type),
        title: String(data.title),
        message: data.message ? String(data.message) : null,
        source: String(data.source),
        createdAt: data.created_at ? String(data.created_at) : null,
        metadata: (data.metadata && typeof data.metadata === 'object' ? data.metadata : {}) as Record<string, unknown>,
      },
    }
  } catch (e) {
    console.error('[CLIENT-EVENTS] createClientEvent threw:', e instanceof Error ? e.message : String(e))
    return { ok: false, event: null }
  }
}

// Récupère les événements visibles côté client pour un projet, triés du
// plus ancien au plus récent (pour raconter l'histoire de la demande).
// Tolérant à l'absence de la table (retourne [] plutôt que de crasher).
export async function getPublicTimelineEvents(projectId: string): Promise<PublicTimelineEvent[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from(CLIENT_EVENTS_TABLE)
      .select('id, event_type, title, message, source, created_at, metadata')
      .eq('project_id', projectId)
      .eq('visibility', 'client')
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      if (!isMissingTableError(error)) {
        console.error('[CLIENT-EVENTS] Fetch error:', error.message)
      }
      return []
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      type: String(row.event_type),
      title: String(row.title),
      message: row.message ? String(row.message) : null,
      source: String(row.source),
      createdAt: row.created_at ? String(row.created_at) : null,
      metadata: (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>,
    }))
  } catch (e) {
    console.error('[CLIENT-EVENTS] getPublicTimelineEvents threw:', e instanceof Error ? e.message : String(e))
    return []
  }
}

// Récupère les événements pour l'artisan (client + les futurs internes le
// cas échéant), utilisé sur la fiche projet. Aujourd'hui V1 : on ne produit
// que des événements visibility=client, donc identique à
// getPublicTimelineEvents, mais gardé séparé pour ne pas coupler la lecture
// côté portail public à celle côté artisan (évolutivité future : afficher
// aussi des événements internes sur la fiche projet sans y toucher côté
// portail).
export async function getArtisanTimelineEvents(projectId: string): Promise<PublicTimelineEvent[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from(CLIENT_EVENTS_TABLE)
      .select('id, event_type, title, message, source, created_at, metadata, visibility')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      if (!isMissingTableError(error)) {
        console.error('[CLIENT-EVENTS] Fetch error:', error.message)
      }
      return []
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      type: String(row.event_type),
      title: String(row.title),
      message: row.message ? String(row.message) : null,
      source: String(row.source),
      createdAt: row.created_at ? String(row.created_at) : null,
      metadata: (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>,
    }))
  } catch (e) {
    console.error('[CLIENT-EVENTS] getArtisanTimelineEvents threw:', e instanceof Error ? e.message : String(e))
    return []
  }
}
