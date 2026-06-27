import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export interface UnknownTradeReportRow {
  id: string
  trade_name: string
  normalized_name: string
  occurrence_count: number
  specialties: string[]
  last_artisan_id: string | null
  first_reported_at: string
  last_reported_at: string
}

function tableMissing(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message || ''
  return /relation .* does not exist/i.test(message) || (error as { code?: string } | null)?.code === '42P01'
}

function normalizeTradeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Enregistre un métier "Autre" saisi librement par un artisan. Si le même
 * métier (comparé après normalisation) a déjà été signalé, incrémente
 * simplement son compteur d'occurrences au lieu de créer un doublon.
 */
export async function recordUnknownTrade(
  artisanId: string,
  tradeName: string,
  specialties?: string[]
): Promise<{ ok: boolean; tableMissing: boolean }> {
  const trimmed = tradeName.trim()
  if (!trimmed) return { ok: false, tableMissing: false }
  const normalized = normalizeTradeName(trimmed)
  if (!normalized) return { ok: false, tableMissing: false }

  const { data: existing, error: selectError } = await supabaseAdmin
    .from('unknown_trade_reports')
    .select('id, occurrence_count')
    .eq('normalized_name', normalized)
    .maybeSingle()

  if (selectError) {
    if (tableMissing(selectError)) return { ok: false, tableMissing: true }
    console.error('[UNKNOWN TRADE] Erreur lecture:', selectError.message)
    return { ok: false, tableMissing: false }
  }

  const now = new Date().toISOString()

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from('unknown_trade_reports')
      .update({
        occurrence_count: existing.occurrence_count + 1,
        last_artisan_id: artisanId,
        last_reported_at: now,
        ...(specialties && specialties.length > 0 ? { specialties } : {}),
      })
      .eq('id', existing.id)
    if (updateError) {
      console.error('[UNKNOWN TRADE] Erreur mise à jour:', updateError.message)
      return { ok: false, tableMissing: false }
    }
    return { ok: true, tableMissing: false }
  }

  const { error: insertError } = await supabaseAdmin.from('unknown_trade_reports').insert({
    trade_name: trimmed,
    normalized_name: normalized,
    occurrence_count: 1,
    specialties: specialties || [],
    last_artisan_id: artisanId,
    first_reported_at: now,
    last_reported_at: now,
  })

  if (insertError) {
    if (tableMissing(insertError)) return { ok: false, tableMissing: true }
    console.error('[UNKNOWN TRADE] Erreur création:', insertError.message)
    return { ok: false, tableMissing: false }
  }

  return { ok: true, tableMissing: false }
}

export async function listUnknownTrades(): Promise<{ rows: UnknownTradeReportRow[]; tableMissing: boolean }> {
  const { data, error } = await supabaseAdmin
    .from('unknown_trade_reports')
    .select('*')
    .order('occurrence_count', { ascending: false })

  if (error) {
    if (tableMissing(error)) return { rows: [], tableMissing: true }
    console.error('[UNKNOWN TRADE] Erreur liste:', error.message)
    return { rows: [], tableMissing: false }
  }

  return { rows: (data as UnknownTradeReportRow[]) || [], tableMissing: false }
}
