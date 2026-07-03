import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { buildArtisanAssistantContext, getAssistantPriorities, type KadriaAssistantContext } from '@/src/lib/kadria-assistant/context'
import { buildKadriaAssistantSystemPrompt } from '@/src/lib/kadria-assistant/system-prompt'
import { getKadriaAssistantOpenAIClient, KADRIA_ASSISTANT_MODEL } from '@/src/lib/kadria-assistant/openai-client'
import { canUseKadriaAssistant, recordKadriaAssistantUsage } from '@/src/lib/kadria-assistant/quotas'
import { buildProposedAction, type ProposedAction } from '@/src/lib/assistant/propose-action'
import { logAssistantAction } from '@/src/lib/assistant/actions'

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

interface DeterministicAssistantReply {
  answer: string
  navigationActions?: NavigationAction[]
}

function buildDeterministicReply(userQuestion: string, context: KadriaAssistantContext): DeterministicAssistantReply | null {
  const text = userQuestion.toLowerCase()

  if (/google review|avis google|demande d'avis|lien google review/.test(text)) {
    if (context.googleReview.configured) {
      return {
        answer: "Oui. Kadria peut preparer une demande d'avis Google depuis une fiche projet. L'envoi reste manuel : vous ouvrez un dossier gagne, cliquez sur 'Avis Google', puis vous confirmez l'envoi.",
        navigationActions: [
          { label: "Voir les dossiers concernes", href: '/dashboard-v2' },
          { label: 'Ouvrir les actions du jour', href: '/dashboard-v2' },
        ],
      }
    }

    return {
      answer: "Oui, Kadria peut vous aider a envoyer une demande d'avis Google depuis un dossier, mais il faut d'abord renseigner votre URL avis Google dans les parametres.",
      navigationActions: [
        { label: "Configurer l'URL avis Google", href: '/parametres?section=entreprise' },
      ],
    }
  }

  if (/relance|relancer/.test(text) && /devis/.test(text)) {
    return {
      answer: "Je peux vous aider a traiter les devis a relancer. Ouvrez les dossiers concernes depuis les actions du jour : chaque relance se fera ensuite depuis la fiche projet, avec confirmation avant envoi.",
      navigationActions: [
        { label: 'Ouvrir les actions du jour', href: '/dashboard-v2' },
        { label: 'Ouvrir mon Tableau de bord', href: '/dashboard-v2' },
      ],
    }
  }

  if (/actions du jour|priorites du jour|que dois-je faire aujourd'hui|que faire aujourd'hui/.test(text)) {
    return {
      answer: "Je peux vous proposer vos priorites du jour a partir de votre configuration, de vos devis et de votre suivi commercial, sans lancer d'action automatique.",
      navigationActions: [
        { label: 'Ouvrir les actions du jour', href: '/dashboard-v2' },
      ],
    }
  }

  if (/configur|parametr|url avis google/.test(text) && context.progressionCenter.percent < 100) {
    return {
      answer: `Votre configuration actuelle est a ${context.progressionCenter.percent} %. Je peux vous orienter vers le prochain reglage utile sans rien modifier a votre place.`,
      navigationActions: [
        { label: 'Ouvrir Parametres', href: '/parametres' },
      ],
    }
  }

  return null
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
  if (/marque blanche/.test(text)) {
    addOnce({ label: 'Ouvrir Marque blanche', href: '/parametres?section=widget' })
  } else if (/widget|avatar|logo|couleur|accueil/.test(text)) {
    addOnce({ label: 'Ouvrir Mon widget', href: '/parametres?section=widget' })
  }
  if (/quota/.test(text)) {
    addOnce({ label: 'Ouvrir Offre / Quotas', href: '/parametres?section=quotas' })
  } else if (/abonnement|offre|plan/.test(text)) {
    addOnce({ label: 'Ouvrir Offre / Quotas', href: '/parametres?section=offre' })
  }
  if (/progression|optimiser|priorit[ée]|[ée]tape|conseille/.test(text)) {
    addOnce({ label: 'Ouvrir le Centre de progression', href: '/dashboard-v2' })
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
      'Mon widget': { label: 'Ouvrir Mon widget', href: '/parametres?section=widget' },
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

    const context = await buildArtisanAssistantContext(session.artisanId, session.plan || 'essentiel')
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
    const deterministicReply = buildDeterministicReply(lastUserMessage, context)

    // Détection déterministe (mots-clés) d'une action contrôlée éventuelle.
    // Ne modifie JAMAIS la base ici : uniquement une proposition affichée à
    // l'artisan, qui devra cliquer "Appliquer" pour déclencher une écriture
    // via /api/assistant/actions/execute. Best-effort : une erreur ici ne
    // doit jamais empêcher la réponse conversationnelle de partir.
    let proposedAction: ProposedAction | null = null
    try {
      proposedAction = await buildProposedAction(lastUserMessage, session.artisanId)
    } catch (err) {
      console.error('[KADRIA-ASSISTANT] proposedAction detection failed', err instanceof Error ? err.message : String(err))
    }
    if (proposedAction) {
      await logAssistantAction({
        artisanId: session.artisanId,
        userId: session.id,
        actionType: proposedAction.type,
        status: 'proposed',
        summary: proposedAction.summary,
        payload: proposedAction.payload,
      })
    }

    if (deterministicReply) {
      return NextResponse.json({
        success: true,
        answer: deterministicReply.answer,
        usage: null,
        ...(deterministicReply.navigationActions ? { navigationActions: deterministicReply.navigationActions } : {}),
        ...(proposedAction ? { proposedAction } : {}),
      })
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

    const navigationActions = buildNavigationActions(lastUserMessage, context)

    return NextResponse.json({
      success: true,
      answer,
      usage,
      ...(navigationActions ? { navigationActions } : {}),
      ...(proposedAction ? { proposedAction } : {}),
    })
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
