import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { buildArtisanAssistantContext, getAssistantPriorities, type KadriaAssistantContext } from '@/src/lib/kadria-assistant/context'
import { buildKadriaAssistantSystemPrompt } from '@/src/lib/kadria-assistant/system-prompt'
import { getKadriaAssistantOpenAIClient, KADRIA_ASSISTANT_MODEL } from '@/src/lib/kadria-assistant/openai-client'
import { canUseKadriaAssistant, recordKadriaAssistantUsage } from '@/src/lib/kadria-assistant/quotas'

// Assistant IA interne pour l'artisan connecté : strictement en lecture
// seule, contextualisé au compte de l'artisan, jamais exposé côté client.
// Ne touche à aucune route de mutation métier (config, devis, emails...).

const MAX_HISTORY_MESSAGES = 8
const MAX_MESSAGE_LENGTH = 2000

interface IncomingMessage {
  role: string
  content: string
}

interface NavigationAction {
  label: string
  href: string
}

// Détermine de simples suggestions de navigation (non destructives) à partir
// de mots-clés présents dans la question de l'artisan, complétées par les
// priorités détectées dans le contexte réel du compte (centre de
// progression, profil métier, widget...). Volontairement très simple (pas
// de routeur complexe) : un mapping mot-clé/priorité -> lien existant, sans
// jamais créer d'ancre vers une route qui n'existe pas.
function buildNavigationActions(userQuestion: string, context: KadriaAssistantContext): NavigationAction[] | undefined {
  const text = userQuestion.toLowerCase()
  const actions: NavigationAction[] = []

  const addOnce = (action: NavigationAction) => {
    if (!actions.some((a) => a.href === action.href)) actions.push(action)
  }

  if (/m[ée]tier|prestation|sp[ée]cialit[ée]|question/.test(text)) {
    addOnce({ label: 'Ouvrir Profil métier', href: '/parametres/profil-metier' })
  }
  if (/tarif|prix|devis/.test(text)) {
    addOnce({ label: 'Ouvrir Profil métier', href: '/parametres/profil-metier' })
  }
  if (/widget|avatar|logo|couleur|marque blanche|accueil/.test(text)) {
    addOnce({ label: 'Ouvrir Mon widget', href: '/parametres' })
  }
  if (/progression|optimiser|priorit[ée]|[ée]tape|conseille/.test(text)) {
    addOnce({ label: 'Ouvrir le Centre de progression', href: '/parametres' })
  }
  if (/relance|prospect|convert/.test(text)) {
    addOnce({ label: 'Ouvrir mon Tableau de bord', href: '/dashboard-v2' })
  }
  if (/param[èe]tre|g[ée]n[ée]ral/.test(text)) {
    addOnce({ label: 'Ouvrir Paramètres', href: '/parametres' })
  }

  // Complète avec les destinations des priorités réelles du compte si la
  // question est large/générale et n'a pas déjà produit d'action ciblée.
  if (actions.length === 0) {
    const priorities = getAssistantPriorities(context)
    const destinationToAction: Record<string, NavigationAction> = {
      'Profil métier': { label: 'Ouvrir Profil métier', href: '/parametres/profil-metier' },
      'Mon widget': { label: 'Ouvrir Mon widget', href: '/parametres' },
      'Paramètres': { label: 'Ouvrir Paramètres', href: '/parametres' },
      'Tableau de bord': { label: 'Ouvrir mon Tableau de bord', href: '/dashboard-v2' },
    }
    for (const p of priorities) {
      const action = destinationToAction[p.destination]
      if (action) addOnce(action)
    }
  }

  return actions.length > 0 ? actions : undefined
}

function sanitizeMessages(raw: unknown): { role: 'user' | 'assistant'; content: string }[] {
  if (!Array.isArray(raw)) return []

  const cleaned = (raw as IncomingMessage[])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content.slice(0, MAX_MESSAGE_LENGTH),
    }))

  // On ne garde que les derniers messages pour limiter le coût et la taille
  // du contexte envoyé à OpenAI.
  return cleaned.slice(-MAX_HISTORY_MESSAGES)
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  let artisanIdForLog = 'unknown'

  try {
    const session = await getSession()
    if (!session || !session.artisanId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }
    artisanIdForLog = session.artisanId

    let body: { messages?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Corps de requête invalide' },
        { status: 400 }
      )
    }

    const messages = sanitizeMessages(body?.messages)
    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucun message fourni' },
        { status: 400 }
      )
    }

    const quotaCheck = await canUseKadriaAssistant(session.artisanId, session.plan)
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          code: 'ASSISTANT_QUOTA_REACHED',
          error: 'Votre quota mensuel de questions Assistant Kadria est atteint.',
          usage: { used: quotaCheck.used, limit: quotaCheck.limit },
        },
        { status: 403 }
      )
    }

    let client
    try {
      client = getKadriaAssistantOpenAIClient()
    } catch {
      console.error('[KADRIA-ASSISTANT] OPENAI_API_KEY manquante')
      return NextResponse.json(
        { success: false, error: "L'assistant est temporairement indisponible. Merci de réessayer plus tard." },
        { status: 503 }
      )
    }

    const context = await buildArtisanAssistantContext(session.artisanId, session.plan || 'essentiel')
    const systemPrompt = buildKadriaAssistantSystemPrompt(context)

    const response = await client.chat.completions.create({
      model: KADRIA_ASSISTANT_MODEL,
      max_tokens: 700,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    })

    const answer = response.choices?.[0]?.message?.content?.trim() || ''

    if (!answer) {
      console.error('[KADRIA-ASSISTANT] Réponse vide de OpenAI', { artisanId: artisanIdForLog })
      return NextResponse.json(
        { success: false, error: "L'assistant n'a pas pu générer de réponse. Merci de reformuler votre question." },
        { status: 502 }
      )
    }

    console.info('[KADRIA-ASSISTANT] success', {
      artisanId: artisanIdForLog,
      durationMs: Date.now() - startedAt,
    })

    // Incrément du compteur de quota uniquement après succès OpenAI. Ne doit
    // jamais empêcher la réponse d'être retournée à l'utilisateur en cas
    // d'échec (table/colonne absente, etc.) : on logge et on continue.
    const incrementResult = await recordKadriaAssistantUsage(session.artisanId)
    const usage = {
      used: incrementResult.success && typeof incrementResult.used === 'number'
        ? incrementResult.used
        : quotaCheck.used + 1,
      limit: quotaCheck.limit,
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
    const navigationActions = buildNavigationActions(lastUserMessage, context)

    return NextResponse.json({ success: true, answer, usage, ...(navigationActions ? { navigationActions } : {}) })
  } catch (error) {
    const isQuotaOrTimeout = error instanceof Error && /timeout|quota|rate limit|429/i.test(error.message)
    console.error('[KADRIA-ASSISTANT] error', {
      artisanId: artisanIdForLog,
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        success: false,
        error: isQuotaOrTimeout
          ? "L'assistant est momentanément surchargé. Merci de réessayer dans quelques instants."
          : "Une erreur est survenue. Merci de réessayer plus tard.",
      },
      { status: 502 }
    )
  }
}
