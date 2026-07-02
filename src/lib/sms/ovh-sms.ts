import 'server-only'
import { createHash } from 'crypto'

// Client SMS OVH minimal. Toutes les variables d'environnement OVH sont lues
// au moment de l'appel (runtime), jamais au chargement du module, afin de ne
// jamais faire échouer le build Next.js si elles sont absentes au moment du
// build (cf. src/lib/kadria-assistant/openai-client.ts pour le même pattern
// avec OPENAI_API_KEY).

export interface SendOvhSmsParams {
  to: string
  message: string
}

export interface SendOvhSmsResult {
  success: boolean
  ids?: number[]
  error?: string
}

// Rend une erreur exploitable en log, quel que soit son type. Reprend le
// pattern serializeErrorForLog de app/api/devis/[id]/follow-up/route.ts.
// Dupliqué ici volontairement (pas d'export partagé existant pour ce
// helper) plutôt que d'introduire un couplage entre modules indépendants.
function serializeErrorForLog(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack.split('\n').slice(0, 5).join('\n')}` : ''}`
  }
  if (typeof error === 'string') return error
  try {
    const json = JSON.stringify(error, null, 2)
    if (json && json !== '{}') return json
  } catch {
    // ignore, fallback below
  }
  try {
    return String(error)
  } catch {
    return 'Erreur non serialisable'
  }
}

// Normalise un numéro de téléphone français vers le format attendu par
// l'API OVH SMS (préfixe 0033, sans "+", sans espaces/points/tirets).
// Exemples : "06 12 34 56 78" -> "0033612345678"
//            "+33612345678"   -> "0033612345678"
//            "0033612345678"  -> "0033612345678" (inchangé)
export function normalizeFrenchPhoneForOvh(rawPhone: string): string {
  const stripped = String(rawPhone || '').replace(/[\s.\-()]/g, '')

  if (stripped.startsWith('0033')) {
    return stripped
  }
  if (stripped.startsWith('+33')) {
    return `0033${stripped.slice(3)}`
  }
  if (stripped.startsWith('0')) {
    return `0033${stripped.slice(1)}`
  }
  if (stripped.startsWith('+')) {
    // Autre indicatif international : on retire simplement le "+" et on
    // préfixe par 00 (format international OVH générique).
    return `00${stripped.slice(1)}`
  }

  return stripped
}

function getOvhBaseUrl(endpoint: string): string {
  return endpoint === 'ovh-ca' ? 'https://ca.api.ovh.com/1.0' : 'https://eu.api.ovh.com/1.0'
}

async function getOvhServerTimestamp(baseUrl: string): Promise<number> {
  try {
    const res = await fetch(`${baseUrl}/auth/time`, { method: 'GET', cache: 'no-store' })
    if (!res.ok) throw new Error(`auth/time HTTP ${res.status}`)
    const text = await res.text()
    const parsed = Number(text.trim())
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  } catch (error) {
    console.warn('[OVH SMS] Impossible de récupérer l\'heure serveur OVH, utilisation de l\'heure locale -', serializeErrorForLog(error))
  }
  return Math.floor(Date.now() / 1000)
}

function signOvhRequest(params: {
  appSecret: string
  consumerKey: string
  method: string
  fullUrl: string
  body: string
  timestamp: number
}): string {
  const { appSecret, consumerKey, method, fullUrl, body, timestamp } = params
  const toSign = `${appSecret}+${consumerKey}+${method}+${fullUrl}+${body}+${timestamp}`
  const hash = createHash('sha1').update(toSign).digest('hex')
  return `$1$${hash}`
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value.trim() === '') return defaultValue
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

export async function sendOvhSms({ to, message }: SendOvhSmsParams): Promise<SendOvhSmsResult> {
  try {
    const endpoint = process.env.OVH_ENDPOINT || 'ovh-eu'
    const appKey = process.env.OVH_APP_KEY
    const appSecret = process.env.OVH_APP_SECRET
    const consumerKey = process.env.OVH_CONSUMER_KEY
    const serviceName = process.env.OVH_SMS_SERVICE_NAME
    const sender = (process.env.OVH_SMS_SENDER || '').trim()
    const senderForResponseEnv = process.env.OVH_SMS_SENDER_FOR_RESPONSE

    console.log('[OVH SMS] Config presence check -', {
      hasAppKey: Boolean(appKey),
      hasAppSecret: Boolean(appSecret),
      hasConsumerKey: Boolean(consumerKey),
      hasServiceName: Boolean(serviceName),
      hasSender: Boolean(sender),
    })

    if (!appKey || !appSecret || !consumerKey || !serviceName) {
      return { success: false, error: 'Configuration OVH SMS incomplète (variables manquantes)' }
    }

    const receiver = normalizeFrenchPhoneForOvh(to)
    if (!receiver) {
      return { success: false, error: 'Numéro de téléphone destinataire invalide' }
    }

    const baseUrl = getOvhBaseUrl(endpoint)
    const path = `/sms/${encodeURIComponent(serviceName)}/jobs`
    const fullUrl = `${baseUrl}${path}`

    const payload: Record<string, unknown> = {
      message,
      receivers: [receiver],
    }

    if (sender) {
      payload.sender = sender
      payload.senderForResponse = parseBooleanEnv(senderForResponseEnv, false)
    } else {
      payload.senderForResponse = true
    }

    const body = JSON.stringify(payload)
    const timestamp = await getOvhServerTimestamp(baseUrl)
    const signature = signOvhRequest({
      appSecret,
      consumerKey,
      method: 'POST',
      fullUrl,
      body,
      timestamp,
    })

    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ovh-Application': appKey,
        'X-Ovh-Consumer': consumerKey,
        'X-Ovh-Timestamp': String(timestamp),
        'X-Ovh-Signature': signature,
      },
      body,
    })

    const text = await res.text()
    let json: unknown = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      // réponse non-JSON, on gardera le texte brut pour le log d'erreur
    }

    if (!res.ok) {
      const errorMessage =
        (json && typeof json === 'object' && 'message' in (json as Record<string, unknown>)
          ? String((json as Record<string, unknown>).message)
          : text) || `HTTP ${res.status}`
      console.error('[OVH SMS] Envoi échoué - status:', res.status, '- message:', errorMessage)
      return { success: false, error: errorMessage }
    }

    const ids =
      json && typeof json === 'object' && Array.isArray((json as Record<string, unknown>).ids)
        ? ((json as Record<string, unknown>).ids as number[])
        : undefined

    console.log('[OVH SMS] Envoi réussi - ids:', ids || '-')
    return { success: true, ids }
  } catch (error) {
    console.error('[OVH SMS] Erreur inattendue -', serializeErrorForLog(error))
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}
