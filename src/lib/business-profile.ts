import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export interface ArtisanBusinessProfileRow {
  id: string
  artisan_id: string
  primary_trade: string | null
  specialties: string[]
  excluded_services: string[]
  base_city: string | null
  intervention_radius_km: number | null
  travel_fee_ht: number | null
  travel_fee_per_km: number | null
  working_days: string[]
  work_start_time: string | null
  work_end_time: string | null
  urgent_available: boolean
  default_vat_rate: number | null
  hourly_rate_ht: number | null
  diagnostic_fee_ht: number | null
  default_margin_percent: number | null
  payment_terms: string | null
  preferred_brands: string[]
  avoided_brands: string[]
  internal_notes: string | null
  created_at: string
  updated_at: string
}

export interface ArtisanServiceCatalogRow {
  id: string
  artisan_id: string
  name: string
  category: string | null
  price_ht: number | null
  unit: string | null
  estimated_duration_minutes: number | null
  vat_rate: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

function tableMissing(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message || ''
  return /relation .* does not exist/i.test(message) || (error as { code?: string } | null)?.code === '42P01'
}

export async function getBusinessProfile(
  artisanId: string
): Promise<{ row: ArtisanBusinessProfileRow | null; tableMissing: boolean }> {
  const { data, error } = await supabaseAdmin
    .from('artisan_business_profile')
    .select('*')
    .eq('artisan_id', artisanId)
    .maybeSingle()

  if (error) {
    if (tableMissing(error)) {
      console.error('[BUSINESS PROFILE] Table artisan_business_profile introuvable — migration non exécutée')
      return { row: null, tableMissing: true }
    }
    console.error('[BUSINESS PROFILE] Erreur lecture profil:', error.message)
    return { row: null, tableMissing: false }
  }

  return { row: (data as ArtisanBusinessProfileRow) || null, tableMissing: false }
}

export async function upsertBusinessProfile(
  artisanId: string,
  fields: Record<string, unknown>
): Promise<{ row: ArtisanBusinessProfileRow | null; error: string | null; tableMissing: boolean }> {
  const { data, error } = await supabaseAdmin
    .from('artisan_business_profile')
    .upsert({ artisan_id: artisanId, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'artisan_id' })
    .select('*')
    .maybeSingle()

  if (error) {
    if (tableMissing(error)) {
      return { row: null, error: 'Table artisan_business_profile introuvable — migration non exécutée', tableMissing: true }
    }
    return { row: null, error: error.message, tableMissing: false }
  }

  return { row: (data as ArtisanBusinessProfileRow) || null, error: null, tableMissing: false }
}

export async function listServiceCatalog(
  artisanId: string
): Promise<{ rows: ArtisanServiceCatalogRow[]; tableMissing: boolean }> {
  const { data, error } = await supabaseAdmin
    .from('artisan_service_catalog')
    .select('*')
    .eq('artisan_id', artisanId)
    .order('created_at', { ascending: true })

  if (error) {
    if (tableMissing(error)) {
      console.error('[SERVICE CATALOG] Table artisan_service_catalog introuvable — migration non exécutée')
      return { rows: [], tableMissing: true }
    }
    console.error('[SERVICE CATALOG] Erreur lecture catalogue:', error.message)
    return { rows: [], tableMissing: false }
  }

  return { rows: (data as ArtisanServiceCatalogRow[]) || [], tableMissing: false }
}

export async function createServiceCatalogItem(
  artisanId: string,
  fields: Record<string, unknown>
): Promise<{ row: ArtisanServiceCatalogRow | null; error: string | null; tableMissing: boolean }> {
  const { data, error } = await supabaseAdmin
    .from('artisan_service_catalog')
    .insert({ artisan_id: artisanId, ...fields })
    .select('*')
    .maybeSingle()

  if (error) {
    if (tableMissing(error)) {
      return { row: null, error: 'Table artisan_service_catalog introuvable — migration non exécutée', tableMissing: true }
    }
    return { row: null, error: error.message, tableMissing: false }
  }

  return { row: (data as ArtisanServiceCatalogRow) || null, error: null, tableMissing: false }
}

export async function updateServiceCatalogItem(
  artisanId: string,
  id: string,
  fields: Record<string, unknown>
): Promise<{ row: ArtisanServiceCatalogRow | null; error: string | null; tableMissing: boolean }> {
  const { data, error } = await supabaseAdmin
    .from('artisan_service_catalog')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('artisan_id', artisanId)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    if (tableMissing(error)) {
      return { row: null, error: 'Table artisan_service_catalog introuvable — migration non exécutée', tableMissing: true }
    }
    return { row: null, error: error.message, tableMissing: false }
  }

  return { row: (data as ArtisanServiceCatalogRow) || null, error: null, tableMissing: false }
}
