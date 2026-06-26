import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export interface ServicePhotoRequirement {
  id: string
  title: string
  description: string
  required: boolean
  order: number
}

export interface ServiceProfileRow {
  id: string
  artisan_id: string
  service_catalog_id: string | null
  name: string
  category: string | null
  description: string | null
  is_active: boolean
  detection_keywords: string[]
  qualification_questions: string[]
  required_information: string[]
  required_photos: boolean
  required_photos_list: ServicePhotoRequirement[]
  recommended_quote_lines: unknown[]
  average_duration_minutes: number | null
  default_vat_rate: number | null
  travel_required: boolean
  appointment_recommended: boolean
  emergency_supported: boolean
  related_services: string[]
  internal_notes: string | null
  created_at: string
  updated_at: string
}

function tableMissing(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message || ''
  return /relation .* does not exist/i.test(message) || (error as { code?: string } | null)?.code === '42P01'
}

export async function listServiceProfiles(
  artisanId: string
): Promise<{ rows: ServiceProfileRow[]; tableMissing: boolean }> {
  const { data, error } = await supabaseAdmin
    .from('service_profiles')
    .select('*')
    .eq('artisan_id', artisanId)
    .order('created_at', { ascending: true })

  if (error) {
    if (tableMissing(error)) {
      console.error('[SERVICE PROFILES] Table service_profiles introuvable — migration non exécutée')
      return { rows: [], tableMissing: true }
    }
    console.error('[SERVICE PROFILES] Erreur lecture liste:', error.message)
    return { rows: [], tableMissing: false }
  }

  return { rows: (data as ServiceProfileRow[]) || [], tableMissing: false }
}

export async function getServiceProfile(
  artisanId: string,
  id: string
): Promise<{ row: ServiceProfileRow | null; error: string | null; tableMissing: boolean }> {
  const { data, error } = await supabaseAdmin
    .from('service_profiles')
    .select('*')
    .eq('artisan_id', artisanId)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    if (tableMissing(error)) {
      return { row: null, error: null, tableMissing: true }
    }
    return { row: null, error: error.message, tableMissing: false }
  }

  return { row: (data as ServiceProfileRow) || null, error: null, tableMissing: false }
}

export async function createServiceProfile(
  artisanId: string,
  fields: Record<string, unknown>
): Promise<{ row: ServiceProfileRow | null; error: string | null; tableMissing: boolean }> {
  const { data, error } = await supabaseAdmin
    .from('service_profiles')
    .insert({ artisan_id: artisanId, ...fields })
    .select('*')
    .maybeSingle()

  if (error) {
    if (tableMissing(error)) {
      return { row: null, error: 'Table service_profiles introuvable — migration non exécutée', tableMissing: true }
    }
    return { row: null, error: error.message, tableMissing: false }
  }

  return { row: (data as ServiceProfileRow) || null, error: null, tableMissing: false }
}

export async function updateServiceProfile(
  artisanId: string,
  id: string,
  fields: Record<string, unknown>
): Promise<{ row: ServiceProfileRow | null; error: string | null; tableMissing: boolean }> {
  const { data, error } = await supabaseAdmin
    .from('service_profiles')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('artisan_id', artisanId)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    if (tableMissing(error)) {
      return { row: null, error: 'Table service_profiles introuvable — migration non exécutée', tableMissing: true }
    }
    return { row: null, error: error.message, tableMissing: false }
  }

  return { row: (data as ServiceProfileRow) || null, error: null, tableMissing: false }
}

export async function deleteOrDeactivateServiceProfile(
  artisanId: string,
  id: string
): Promise<{ deleted: boolean; row: ServiceProfileRow | null; error: string | null; tableMissing: boolean }> {
  const { error: deleteError } = await supabaseAdmin
    .from('service_profiles')
    .delete()
    .eq('artisan_id', artisanId)
    .eq('id', id)

  if (!deleteError) {
    return { deleted: true, row: null, error: null, tableMissing: false }
  }

  if (tableMissing(deleteError)) {
    return { deleted: false, row: null, error: 'Table service_profiles introuvable — migration non exécutée', tableMissing: true }
  }

  // Suppression impossible (ex: contrainte de référence) : on désactive
  // proprement la fiche plutôt que de faire échouer l'opération.
  const { row, error, tableMissing: missing } = await updateServiceProfile(artisanId, id, { is_active: false })
  if (error) {
    return { deleted: false, row: null, error, tableMissing: missing }
  }
  return { deleted: false, row, error: null, tableMissing: false }
}
