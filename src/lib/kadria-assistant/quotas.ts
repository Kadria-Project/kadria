import 'server-only'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentPeriodMonth, QUOTA_TABLES } from '@/src/lib/usage/quotas'

// Quotas mensuels pour l'assistant interne (chat artisan connecté).
// Réutilise la table UsageMonthly déjà utilisée pour dossiers/Vapi/devis,
// avec une colonne dédiée `assistant_messages`. Si la colonne n'existe pas
// encore en base (migration non appliquée), tout le système est robuste :
// lecture -> 0, vérification -> autorisé, incrément -> échoue silencieusement
// (loggé côté serveur) sans jamais faire planter la page /parametres ni
// l'API chat.

export type AssistantPlanKey = 'essentiel' | 'performance' | 'entreprise'

const ASSISTANT_MESSAGE_COLUMN_CANDIDATES = ['assistant_messages', 'kadria_assistant_messages'] as const

const ASSISTANT_MONTHLY_LIMITS: Record<AssistantPlanKey, number> = {
  essentiel: 50,
  performance: 200,
  entreprise: 500,
}

let cachedUsageMonthlyTable: string | null | undefined
let cachedAssistantColumn: string | null | undefined

export function getAssistantMonthlyLimit(plan?: string | null): number {
  const normalized = normalizeAssistantPlan(plan)
  return ASSISTANT_MONTHLY_LIMITS[normalized]
}

function normalizeAssistantPlan(plan?: string | null): AssistantPlanKey {
  const value = String(plan || '').trim().toLowerCase()
  if (value === 'performance' || value === 'pro') return 'performance'
  if (value === 'entreprise' || value === 'agence' || value === 'agency') return 'entreprise'
  return 'essentiel'
}

async function resolveUsageMonthlyTable(): Promise<string | null> {
  if (cachedUsageMonthlyTable !== undefined) return cachedUsageMonthlyTable

  const supabase = getSupabaseAdmin()
  for (const tableName of QUOTA_TABLES.usageMonthly) {
    const { error } = await supabase.from(tableName).select('*', { count: 'exact', head: true })
    if (!error) {
      cachedUsageMonthlyTable = tableName
      return tableName
    }
  }

  cachedUsageMonthlyTable = null
  return null
}

async function resolveAssistantColumn(tableName: string): Promise<string | null> {
  if (cachedAssistantColumn !== undefined) return cachedAssistantColumn

  const supabase = getSupabaseAdmin()
  for (const column of ASSISTANT_MESSAGE_COLUMN_CANDIDATES) {
    const { error } = await supabase.from(tableName).select(column).limit(1)
    if (!error) {
      cachedAssistantColumn = column
      return column
    }
  }

  cachedAssistantColumn = null
  return null
}

export interface AssistantUsageSummary {
  used: number
  limit: number
  tracked?: boolean
}

/**
 * Retourne {used, limit} pour l'artisan/plan donné. Robuste si la table ou
 * la colonne n'existe pas encore : renvoie used=0 dans ce cas plutôt que de
 * jeter une erreur.
 */
export async function getKadriaAssistantUsageSummary(
  artisanId: string,
  plan?: string | null,
): Promise<AssistantUsageSummary> {
  const limit = getAssistantMonthlyLimit(plan)

  try {
    const tableName = await resolveUsageMonthlyTable()
    if (!tableName) {
      return { used: 0, limit, tracked: false }
    }

    const column = await resolveAssistantColumn(tableName)
    if (!column) {
      return { used: 0, limit, tracked: false }
    }

    const supabase = getSupabaseAdmin()
    const periodMonth = getCurrentPeriodMonth()
    const { data, error } = await supabase
      .from(tableName)
      .select(column)
      .eq('artisan_id', artisanId)
      .eq('period_month', periodMonth)
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return { used: 0, limit, tracked: true }
    }

    const row = data as unknown as Record<string, unknown>
    const rawUsed = row[column]
    const used = typeof rawUsed === 'number' && Number.isFinite(rawUsed) ? rawUsed : 0

    return { used, limit, tracked: true }
  } catch (error) {
    console.error('[KADRIA-ASSISTANT-QUOTA] getKadriaAssistantUsageSummary error', {
      artisanId,
      message: error instanceof Error ? error.message : String(error),
    })
    return { used: 0, limit, tracked: false }
  }
}

export interface AssistantQuotaCheck {
  allowed: boolean
  used: number
  limit: number
}

/**
 * Vérifie si l'artisan peut encore poser une question ce mois-ci. En cas
 * d'erreur de lecture, on autorise par défaut (fail-open) plutôt que de
 * bloquer l'assistant pour un problème d'infrastructure de quota.
 */
export async function canUseKadriaAssistant(
  artisanId: string,
  plan?: string | null,
): Promise<AssistantQuotaCheck> {
  const { used, limit } = await getKadriaAssistantUsageSummary(artisanId, plan)
  return {
    allowed: used < limit,
    used,
    limit,
  }
}

/**
 * Incrémente le compteur de messages assistant pour le mois en cours.
 * À appeler UNIQUEMENT après une réponse OpenAI réussie. Ne jette jamais :
 * si la colonne/table n'existe pas ou que l'écriture échoue, on logge et on
 * continue (la réponse OpenAI doit toujours être retournée à l'utilisateur).
 */
export async function recordKadriaAssistantUsage(artisanId: string): Promise<{ success: boolean; used?: number }> {
  try {
    const tableName = await resolveUsageMonthlyTable()
    if (!tableName) {
      console.error('[KADRIA-ASSISTANT-QUOTA] UsageMonthly table introuvable, incrément ignoré')
      return { success: false }
    }

    const column = await resolveAssistantColumn(tableName)
    if (!column) {
      console.error('[KADRIA-ASSISTANT-QUOTA] Colonne assistant_messages introuvable, incrément ignoré (migration non appliquée ?)')
      return { success: false }
    }

    const supabase = getSupabaseAdmin()
    const periodMonth = getCurrentPeriodMonth()

    const { data: existing, error: existingError } = await supabase
      .from(tableName)
      .select(`${column}, artisan_id, period_month`)
      .eq('artisan_id', artisanId)
      .eq('period_month', periodMonth)
      .limit(1)
      .maybeSingle()

    if (existingError) {
      console.error('[KADRIA-ASSISTANT-QUOTA] Erreur lecture avant incrément', existingError.message)
      return { success: false }
    }

    if (existing) {
      const row = existing as unknown as Record<string, unknown>
      const currentUsed = typeof row[column] === 'number' && Number.isFinite(row[column] as number)
        ? (row[column] as number)
        : 0
      const nextUsed = currentUsed + 1

      const { error: updateError } = await supabase
        .from(tableName)
        .update({ [column]: nextUsed })
        .eq('artisan_id', artisanId)
        .eq('period_month', periodMonth)

      if (updateError) {
        console.error('[KADRIA-ASSISTANT-QUOTA] Erreur incrément (update)', updateError.message)
        return { success: false }
      }

      return { success: true, used: nextUsed }
    }

    const { error: insertError } = await supabase
      .from(tableName)
      .insert({ artisan_id: artisanId, period_month: periodMonth, [column]: 1 })

    if (insertError) {
      console.error('[KADRIA-ASSISTANT-QUOTA] Erreur incrément (insert)', insertError.message)
      return { success: false }
    }

    return { success: true, used: 1 }
  } catch (error) {
    console.error('[KADRIA-ASSISTANT-QUOTA] recordKadriaAssistantUsage exception', {
      artisanId,
      message: error instanceof Error ? error.message : String(error),
    })
    return { success: false }
  }
}
