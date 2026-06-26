import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import {
  computeSetupProgress,
  type SetupProgressArtisanConfig,
  type SetupProgressResult,
} from '@/src/lib/setup-progress'

function tableMissing(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message || ''
  return /relation .* does not exist/i.test(message) || (error as { code?: string } | null)?.code === '42P01'
}

export interface SetupProgressTablesMissing {
  businessProfile: boolean
  serviceProfiles: boolean
  calendar: boolean
}

export interface SetupProgressBatchEntry {
  progress: SetupProgressResult
  tablesMissing: SetupProgressTablesMissing
  /** false uniquement si aucune des trois tables métier n'est accessible. */
  dataAvailable: boolean
}

/**
 * Calcule computeSetupProgress() pour plusieurs artisans en une seule passe
 * de requêtes groupées (.in('artisan_id', ids)) plutôt qu'une requête par
 * client, pour éviter le N+1 sur /admin/clients. Ne recalcule pas le score
 * lui-même : computeSetupProgress reste la seule source de vérité.
 */
export async function batchGetSetupProgress(
  artisanConfigs: Map<string, SetupProgressArtisanConfig>
): Promise<Map<string, SetupProgressBatchEntry>> {
  const result = new Map<string, SetupProgressBatchEntry>()
  const artisanIds = Array.from(artisanConfigs.keys()).filter(Boolean)
  if (artisanIds.length === 0) return result

  const [profilesRes, serviceProfilesRes, calendarRes] = await Promise.all([
    supabaseAdmin
      .from('artisan_business_profile')
      .select(
        'artisan_id, primary_trade, base_city, intervention_radius_km, hourly_rate_ht, default_vat_rate, working_days, work_start_time, work_end_time'
      )
      .in('artisan_id', artisanIds),
    supabaseAdmin.from('service_profiles').select('artisan_id').in('artisan_id', artisanIds),
    // Jamais access_token / refresh_token : uniquement les colonnes nécessaires au statut.
    supabaseAdmin
      .from('calendar_integrations')
      .select('artisan_id, provider, is_connected, calendar_email, created_at')
      .in('artisan_id', artisanIds)
      .eq('provider', 'google'),
  ])

  const tablesMissing: SetupProgressTablesMissing = {
    businessProfile: !!profilesRes.error && tableMissing(profilesRes.error),
    serviceProfiles: !!serviceProfilesRes.error && tableMissing(serviceProfilesRes.error),
    calendar: !!calendarRes.error && tableMissing(calendarRes.error),
  }

  if (profilesRes.error && !tablesMissing.businessProfile) {
    console.error('[ADMIN SETUP PROGRESS] Erreur lecture artisan_business_profile:', profilesRes.error.message)
  }
  if (serviceProfilesRes.error && !tablesMissing.serviceProfiles) {
    console.error('[ADMIN SETUP PROGRESS] Erreur lecture service_profiles:', serviceProfilesRes.error.message)
  }
  if (calendarRes.error && !tablesMissing.calendar) {
    console.error('[ADMIN SETUP PROGRESS] Erreur lecture calendar_integrations:', calendarRes.error.message)
  }

  const profileByArtisan = new Map<string, Record<string, unknown>>()
  if (!profilesRes.error) {
    for (const row of profilesRes.data || []) {
      profileByArtisan.set(String((row as Record<string, unknown>).artisan_id), row as Record<string, unknown>)
    }
  }

  const serviceProfileCounts = new Map<string, number>()
  if (!serviceProfilesRes.error) {
    for (const row of serviceProfilesRes.data || []) {
      const artisanId = String((row as Record<string, unknown>).artisan_id)
      serviceProfileCounts.set(artisanId, (serviceProfileCounts.get(artisanId) || 0) + 1)
    }
  }

  const calendarByArtisan = new Map<string, Record<string, unknown>>()
  if (!calendarRes.error) {
    for (const row of calendarRes.data || []) {
      calendarByArtisan.set(String((row as Record<string, unknown>).artisan_id), row as Record<string, unknown>)
    }
  }

  const dataAvailable = !(tablesMissing.businessProfile && tablesMissing.serviceProfiles && tablesMissing.calendar)

  for (const [artisanId, artisanConfig] of artisanConfigs) {
    const row = profileByArtisan.get(artisanId)
    const serviceProfilesCount = serviceProfileCounts.get(artisanId) || 0
    const calendarRow = calendarByArtisan.get(artisanId)

    const progress = computeSetupProgress({
      businessProfile: row
        ? {
            primaryTrade: row.primary_trade as string | null,
            baseCity: row.base_city as string | null,
            interventionRadiusKm: row.intervention_radius_km as number | null,
            hourlyRateHt: row.hourly_rate_ht as number | null,
            defaultVatRate: row.default_vat_rate as number | null,
            workingDays: row.working_days as string[] | null,
            workStartTime: row.work_start_time as string | null,
            workEndTime: row.work_end_time as string | null,
          }
        : null,
      serviceProfiles: Array.from({ length: serviceProfilesCount }, () => ({})),
      calendarIntegration: calendarRow ? { connected: !!calendarRow.is_connected } : null,
      artisanConfig,
    })

    result.set(artisanId, { progress, tablesMissing, dataAvailable })
  }

  return result
}

/** Variante mono-client, réutilisée par /admin/clients/[id] sans dupliquer la logique de batch. */
export async function getSetupProgressForArtisan(
  artisanId: string,
  artisanConfig: SetupProgressArtisanConfig
): Promise<SetupProgressBatchEntry | null> {
  if (!artisanId) return null
  const batch = await batchGetSetupProgress(new Map([[artisanId, artisanConfig]]))
  return batch.get(artisanId) || null
}
