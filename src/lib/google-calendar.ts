import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export const GOOGLE_CALENDAR_PROVIDER = 'google' as const

export interface CalendarIntegrationRow {
  id: string
  artisan_id: string
  provider: string
  access_token: string | null
  refresh_token: string | null
  token_expiry: string | null
  calendar_email: string | null
  is_connected: boolean
  created_at: string
  updated_at: string
}

function tableMissing(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message || ''
  return /relation .* does not exist/i.test(message) || (error as { code?: string } | null)?.code === '42P01'
}

/**
 * Charge la connexion Google Calendar d'un artisan. Gère gracieusement le
 * cas où la table calendar_integrations n'existe pas encore (migration non
 * exécutée) en renvoyant null plutôt que de faire planter la route.
 */
export async function getCalendarIntegration(
  artisanId: string
): Promise<{ row: CalendarIntegrationRow | null; tableMissing: boolean }> {
  const { data, error } = await supabaseAdmin
    .from('calendar_integrations')
    .select('*')
    .eq('artisan_id', artisanId)
    .eq('provider', GOOGLE_CALENDAR_PROVIDER)
    .maybeSingle()

  if (error) {
    if (tableMissing(error)) {
      console.error('[GOOGLE CALENDAR] Table calendar_integrations introuvable — migration non exécutée')
      return { row: null, tableMissing: true }
    }
    console.error('[GOOGLE CALENDAR] Erreur lecture integration:', error.message)
    return { row: null, tableMissing: false }
  }

  return { row: (data as CalendarIntegrationRow) || null, tableMissing: false }
}

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope?: string
}

/**
 * Retourne un access_token valide pour l'artisan, en le rafraîchissant via
 * le refresh_token si besoin et en persistant le nouveau token en base.
 * Retourne null si non connecté / pas de refresh_token / refresh échoué.
 */
export async function getValidAccessToken(
  row: CalendarIntegrationRow
): Promise<string | null> {
  if (!row.is_connected || !row.access_token) return null

  const expiry = row.token_expiry ? new Date(row.token_expiry).getTime() : 0
  const isExpired = !expiry || expiry <= Date.now() + 60_000 // marge de 60s

  if (!isExpired) {
    return row.access_token
  }

  if (!row.refresh_token) {
    console.error('[GOOGLE CALENDAR] Token expiré sans refresh_token disponible', { artisanId: row.artisan_id })
    return null
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('[GOOGLE CALENDAR] Variables GOOGLE_CLIENT_ID/SECRET manquantes')
    return null
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: row.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!response.ok) {
      console.error('[GOOGLE CALENDAR] Échec refresh token', response.status, await response.text())
      return null
    }

    const json = (await response.json()) as GoogleTokenResponse
    const newExpiry = new Date(Date.now() + json.expires_in * 1000).toISOString()

    const { error } = await supabaseAdmin
      .from('calendar_integrations')
      .update({
        access_token: json.access_token,
        token_expiry: newExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq('artisan_id', row.artisan_id)
      .eq('provider', GOOGLE_CALENDAR_PROVIDER)

    if (error) {
      console.error('[GOOGLE CALENDAR] Erreur mise à jour token rafraîchi:', error.message)
    }

    return json.access_token
  } catch (error) {
    console.error('[GOOGLE CALENDAR] Exception refresh token:', error instanceof Error ? error.message : String(error))
    return null
  }
}
