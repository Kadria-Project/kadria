import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { buildArtisanAssistantContext, getAssistantPriorities, type KadriaAssistantContext } from '@/src/lib/kadria-assistant/context'
import { getKadriaAssistantOpenAIClient, KADRIA_ASSISTANT_MODEL } from '@/src/lib/kadria-assistant/openai-client'
import { sanitizeAssistantPageContext, type AssistantPageContext } from '@/src/lib/kadria-assistant/page-context'
import { canUseKadriaAssistant, recordKadriaAssistantUsage } from '@/src/lib/kadria-assistant/quotas'
import { buildKadriaAssistantSystemPrompt } from '@/src/lib/kadria-assistant/system-prompt'
import {
  buildProposedAction,
  type ProposedAction,
} from '@/src/lib/assistant/propose-action'
import { logAssistantAction } from '@/src/lib/assistant/actions'
import { isAssistantIntent } from '@/src/lib/kadria-assistant/assistant-intents'
import { resolveAssistantIntent } from '@/src/lib/kadria-assistant/assistant-intent-resolver'
import { getTrackingBriefForAssistant } from '@/src/lib/kadria-assistant/tracking-tools'
import { buildTrackingInsightResponse } from '@/src/lib/kadria-assistant/tracking-insights'
import { getPerformanceDataForAssistant } from '@/src/lib/kadria-assistant/performance-tools'
import { buildPerformanceAssistantResponse } from '@/src/lib/kadria-assistant/performance-insights'
import type { PerformancePeriodKey } from '@/src/lib/performance/performance-types'
import {
  formatProjectSummaryForAssistant,
  getProjectSummaryForAssistant,
  listProjectsWithDepositPaidForAssistant,
  listProjectsWithoutAppointmentForAssistant,
  listQuoteFollowUpsForAssistant,
  listTasksToDoForAssistant,
  listUpcomingAppointmentsForAssistant,
  searchProjectsForAssistant,
  type AssistantProjectSummary,
} from '@/src/lib/kadria-assistant/tools'

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

type ContextualAssistantReply = DeterministicAssistantReply

function buildProjectHref(projectId: string) {
  return `/dashboard-v2/projet/${encodeURIComponent(projectId)}`
}

function buildProjectAction(projectId: string, label = 'Ouvrir le dossier'): NavigationAction {
  return { label, href: buildProjectHref(projectId) }
}

function isTrackingIntent(intent: string): intent is 'tracking.blocked_projects' | 'tracking.followups' | 'tracking.next_actions' {
  return intent === 'tracking.blocked_projects' || intent === 'tracking.followups' || intent === 'tracking.next_actions'
}

function isPerformanceIntent(intent: string): intent is 'performance.summary' | 'performance.explain_change' | 'performance.contributing_projects' {
  return intent === 'performance.summary' || intent === 'performance.explain_change' || intent === 'performance.contributing_projects'
}

function performancePeriod(value: unknown): PerformancePeriodKey {
  return value === 'today' || value === 'yesterday' || value === '7d' || value === '30d' || value === '90d' || value === 'year' || value === 'custom' ? value : '30d'
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function buildDeterministicReply(userQuestion: string, context: KadriaAssistantContext): DeterministicAssistantReply | null {
  const text = normalizeText(userQuestion)

  if (/google review|avis google|demande d'avis|lien google review/.test(text)) {
    if (context.googleReview.configured) {
      return {
        answer: "Oui. Kadria peut preparer une demande d'avis Google depuis une fiche projet. L'envoi reste manuel : vous ouvrez un dossier gagne, cliquez sur 'Avis Google', puis vous confirmez l'envoi.",
        navigationActions: [
          { label: 'Voir les dossiers concernes', href: '/dashboard-v2' },
          { label: 'Ouvrir les actions du jour', href: '/dashboard-v2' },
        ],
      }
    }

    return {
      answer: "Oui, Kadria peut vous aider a envoyer une demande d'avis Google depuis un dossier, mais il faut d'abord renseigner votre URL avis Google dans les parametres.",
      navigationActions: [{ label: "Configurer l'URL avis Google", href: '/parametres?section=entreprise' }],
    }
  }

  if (/relance|relancer/.test(text) && /devis/.test(text)) {
    return {
      answer: "Je peux vous aider a traiter les devis a relancer. Ouvrez les dossiers concernes depuis les actions du jour : chaque relance se fera ensuite depuis la fiche projet, avec confirmation avant envoi.",
      navigationActions: [
        { label: 'Ouvrir les actions du jour', href: '/dashboard-v2' },
        { label: 'Ouvrir mon tableau de bord', href: '/dashboard-v2' },
      ],
    }
  }

  if (/actions du jour|priorites du jour|que dois-je faire aujourd'hui|que faire aujourd'hui/.test(text)) {
    return {
      answer: "Je peux vous proposer vos priorites du jour a partir de votre configuration, de vos devis et de votre suivi commercial, sans lancer d'action automatique.",
      navigationActions: [{ label: 'Ouvrir les actions du jour', href: '/dashboard-v2' }],
    }
  }

  if (/configur|parametr|url avis google/.test(text) && context.progressionCenter.percent < 100) {
    return {
      answer: `Votre configuration actuelle est a ${context.progressionCenter.percent} %. Je peux vous orienter vers le prochain reglage utile sans rien modifier a votre place.`,
      navigationActions: [{ label: 'Ouvrir Parametres', href: '/parametres' }],
    }
  }

  return null
}

function buildNavigationActions(userQuestion: string, context: KadriaAssistantContext): NavigationAction[] | undefined {
  const text = normalizeText(userQuestion)
  const actions: NavigationAction[] = []

  const addOnce = (action: NavigationAction) => {
    if (!actions.some((entry) => entry.href === action.href)) actions.push(action)
  }

  if (/metier|prestation|specialite|question/.test(text)) {
    addOnce({ label: 'Ouvrir Profil metier', href: '/parametres/profil-metier' })
  }
  if (/tarif|prix|devis/.test(text)) {
    addOnce({ label: 'Ouvrir Profil metier', href: '/parametres/profil-metier' })
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
  if (/progression|optimiser|priorite|etape|conseille/.test(text)) {
    addOnce({ label: 'Ouvrir le Centre de progression', href: '/dashboard-v2' })
  }
  if (/relance|prospect|convert/.test(text)) {
    addOnce({ label: 'Ouvrir mon tableau de bord', href: '/dashboard-v2' })
  }
  if (/parametre|general/.test(text)) {
    addOnce({ label: 'Ouvrir Parametres', href: '/parametres' })
  }

  if (actions.length === 0) {
    const priorities = getAssistantPriorities(context)
    const destinationToAction: Record<string, NavigationAction> = {
      'Profil métier': { label: 'Ouvrir Profil metier', href: '/parametres/profil-metier' },
      'Mon widget': { label: 'Ouvrir Mon widget', href: '/parametres?section=widget' },
      'Paramètres': { label: 'Ouvrir Parametres', href: '/parametres' },
      'Tableau de bord': { label: 'Ouvrir mon tableau de bord', href: '/dashboard-v2' },
    }
    for (const priority of priorities) {
      const action = destinationToAction[priority.destination]
      if (action) addOnce(action)
    }
  }

  return actions.length > 0 ? actions : undefined
}

function sanitizeMessages(raw: unknown): { role: 'user' | 'assistant'; content: string }[] {
  if (!Array.isArray(raw)) return []

  return (raw as IncomingMessage[])
    .filter((message) => message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string' && message.content.trim().length > 0)
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content.slice(0, MAX_MESSAGE_LENGTH),
    }))
    .slice(-MAX_HISTORY_MESSAGES)
}

function buildPageContextSummary(pageContext: AssistantPageContext | null, currentProjectSummary: AssistantProjectSummary | null) {
  if (!pageContext) return null

  const lines = [`Type de page : ${pageContext.pageType}`]
  if (pageContext.route) lines.push(`Route normalisee : ${pageContext.route}`)
  if (pageContext.section) lines.push(`Section active : ${pageContext.section}`)
  if (pageContext.projectId) lines.push(`ProjectId transmis par le front : ${pageContext.projectId}`)
  if (pageContext.projectTitle) lines.push(`Titre visible : ${pageContext.projectTitle}`)
  if (pageContext.clientName) lines.push(`Client visible : ${pageContext.clientName}`)
  if (pageContext.status) lines.push(`Statut visible : ${pageContext.status}`)
  if (pageContext.lifecycleStage) lines.push(`Etape visible : ${pageContext.lifecycleStage}`)
  if (pageContext.recommendedAction) lines.push(`Action recommandee visible : ${pageContext.recommendedAction}`)
  if (currentProjectSummary) lines.push(`Projet serveur verifie : ${currentProjectSummary.projectTitle}`)
  return lines.join('\n')
}

function extractSearchQuery(message: string) {
  const trimmed = message.trim()
  const explicit = /(?:cherche|recherche|trouve)\s+(?:le\s+|la\s+|les\s+)?(?:dossier|projet|client)?\s*(.+)$/i.exec(trimmed)
  if (explicit?.[1]) return explicit[1].trim().replace(/[?.!]+$/, '')
  return null
}

function isProjectQuestion(text: string) {
  return /dossier|projet|devis|acompte|photo|photos|message|retour client|rendez-vous|rdv|activite|historique/.test(text)
}

function formatProjectSummaryAnswer(summary: AssistantProjectSummary) {
  const lines = [
    `Voici l'essentiel du dossier ${summary.clientName} :`,
    `- Statut : ${summary.status}`,
    `- Projet : ${summary.projectTitle}`,
    `- Budget : ${summary.budget || 'non renseigne'}`,
    `- Delai : ${summary.desiredTimeline || 'non renseigne'}`,
    `- Devis : ${summary.quote.status}${summary.quote.amount ? ` (${summary.quote.amount} EUR)` : ''}`,
    `- Acompte : ${summary.deposit.status}${summary.deposit.amount ? ` (${summary.deposit.amount} EUR)` : ''}`,
    `- Photos : ${summary.photos.count}`,
    `- Messages client : ${summary.clientMessages.count}`,
    `- Rendez-vous : ${summary.appointment.start || 'non planifie'}`,
    `- Action recommandee : ${summary.recommendedAction}`,
  ]

  if (summary.missingItems.length > 0) {
    lines.push(`- Elements encore manquants : ${summary.missingItems.join(', ')}`)
  }

  return lines.join('\n')
}

function formatRecommendedActionAnswer(summary: AssistantProjectSummary) {
  return [
    `La prochaine etape utile sur ce dossier est : ${summary.recommendedAction}.`,
    `- Pourquoi : ${summary.recommendedActionMeta}`,
    `- Statut actuel : ${summary.status}`,
    `- Devis : ${summary.quote.status}`,
    `- Acompte : ${summary.deposit.status}`,
    summary.missingItems.length > 0
      ? `- A verifier en plus : ${summary.missingItems.join(', ')}`
      : `- Le dossier est deja assez complet pour avancer sans attendre un nouveau complement.`,
  ].join('\n')
}

function formatPriorityReasonAnswer(summary: AssistantProjectSummary) {
  const reasons = [
    `Ce dossier ressort avec un score d'opportunite estime a ${summary.opportunityScore}/100.`,
    `- Statut : ${summary.status}`,
    `- Etape actuelle : ${summary.lifecycleStage}`,
    `- Action recommandee : ${summary.recommendedAction}`,
  ]

  if (summary.budget) reasons.push(`- Budget : ${summary.budget}`)
  if (summary.desiredTimeline) reasons.push(`- Delai : ${summary.desiredTimeline}`)
  if (summary.quote.status !== 'aucun devis') reasons.push(`- Devis : ${summary.quote.status}`)
  return reasons.join('\n')
}

function formatMissingItemsAnswer(summary: AssistantProjectSummary) {
  if (summary.missingItems.length === 0) {
    return "Je n'ai pas detecte d'element bloquant majeur sur ce dossier. Vous pouvez surtout vous concentrer sur l'etape commerciale suivante."
  }

  return [
    `Voici ce qui manque encore sur ce dossier :`,
    ...summary.missingItems.map((item) => `- ${item}`),
    `Impact : ces manques peuvent freiner le devis, la qualification ou la planification du chantier.`,
  ].join('\n')
}

function formatPhotosAnswer(summary: AssistantProjectSummary) {
  if (summary.photos.count > 0) {
    return `Oui. Le client a deja envoye ${summary.photos.count} photo(s) sur ce dossier. Vous pouvez les retrouver dans la fiche projet.`
  }
  return "Non, je ne vois pas de photo client sur ce dossier pour le moment."
}

function formatQuoteStatusAnswer(summary: AssistantProjectSummary) {
  const lines = [`Statut du devis : ${summary.quote.status}.`]
  if (summary.quote.amount) lines.push(`- Montant : ${summary.quote.amount} EUR`)
  if (summary.quote.sentAt) lines.push(`- Envoye le : ${summary.quote.sentAt}`)
  if (summary.quote.acceptedAt) lines.push(`- Accepte le : ${summary.quote.acceptedAt}`)
  if (summary.quote.declinedAt) lines.push(`- Refuse le : ${summary.quote.declinedAt}`)
  if (summary.quote.declineReason) lines.push(`- Motif du refus : ${summary.quote.declineReason}`)
  if (summary.quote.followUpReason) lines.push(`- Suivi commercial : ${summary.quote.followUpReason}`)
  lines.push(`- Prochaine action : ${summary.recommendedAction}`)
  return lines.join('\n')
}

function formatDepositStatusAnswer(summary: AssistantProjectSummary) {
  const lines = [`Statut de l'acompte : ${summary.deposit.status}.`]
  if (summary.deposit.amount) lines.push(`- Montant : ${summary.deposit.amount} EUR`)
  if (summary.deposit.requestedAt) lines.push(`- Demande le : ${summary.deposit.requestedAt}`)
  if (summary.deposit.paidAt) lines.push(`- Paye le : ${summary.deposit.paidAt}`)
  lines.push(`- Suite logique : ${summary.recommendedAction}`)
  return lines.join('\n')
}

function formatMessagesAnswer(summary: AssistantProjectSummary) {
  if (summary.clientMessages.count === 0) {
    return "Je ne vois pas de message client recent sur ce dossier."
  }

  return [
    `Oui, il y a ${summary.clientMessages.count} message(s) ou retour(s) client sur ce dossier.`,
    summary.clientMessages.latestAt ? `- Dernier signal : ${summary.clientMessages.latestAt}` : null,
    `- Ouvrez la fiche projet pour voir le detail de la discussion et de l'activite.`,
  ]
    .filter(Boolean)
    .join('\n')
}

function formatAppointmentAnswer(summary: AssistantProjectSummary) {
  if (!summary.appointment.present || !summary.appointment.start) {
    return "Je ne vois pas de rendez-vous planifie sur ce dossier pour le moment."
  }

  return [
    `Prochain rendez-vous : ${summary.appointment.start}`,
    summary.appointment.end ? `- Fin prevue : ${summary.appointment.end}` : null,
    summary.appointment.location ? `- Lieu : ${summary.appointment.location}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function formatActivityAnswer(summary: AssistantProjectSummary) {
  if (summary.activity.length === 0) {
    return "Je n'ai pas trouve d'activite recente sur ce dossier."
  }

  return [
    `Derniers evenements du dossier :`,
    ...summary.activity.slice(0, 4).map((entry) => `- ${entry.title} : ${entry.description}`),
  ].join('\n')
}

async function buildContextualReadOnlyReply(params: {
  lastUserMessage: string
  pageContext: AssistantPageContext | null
  currentProjectSummary: AssistantProjectSummary | null
  artisanId: string
}): Promise<ContextualAssistantReply | null> {
  const normalized = normalizeText(params.lastUserMessage)
  const currentProject = params.currentProjectSummary
  const searchQuery = extractSearchQuery(params.lastUserMessage)

  if (searchQuery) {
    const matches = await searchProjectsForAssistant(searchQuery, params.artisanId)
    if (matches.length === 0) {
      return { answer: `Je n'ai pas trouve de dossier correspondant a "${searchQuery}".` }
    }

    return {
      answer: [
        `J'ai trouve ${matches.length} dossier(s) pour "${searchQuery}" :`,
        ...matches.map((match) => `- ${match.clientName} - ${match.projectTitle} (${match.status}) [${match.projectNumber}]`),
      ].join('\n'),
      navigationActions: matches.slice(0, 3).map((match) => buildProjectAction(match.id, `Ouvrir ${match.clientName}`)),
    }
  }

  if (currentProject && /resum|resume ce dossier|resumer ce dossier/.test(normalized)) {
    return {
      answer: formatProjectSummaryAnswer(currentProject),
      navigationActions: [buildProjectAction(currentProject.projectId)],
    }
  }

  if (currentProject && /(que dois-je faire|que faire maintenant|prochaine etape|action recommandee)/.test(normalized)) {
    return {
      answer: formatRecommendedActionAnswer(currentProject),
      navigationActions: [buildProjectAction(currentProject.projectId)],
    }
  }

  if (currentProject && /pourquoi.*priorit|pourquoi ce dossier/.test(normalized)) {
    return {
      answer: formatPriorityReasonAnswer(currentProject),
      navigationActions: [buildProjectAction(currentProject.projectId)],
    }
  }

  if (currentProject && /quels?.*manqu|que manque/.test(normalized)) {
    return {
      answer: formatMissingItemsAnswer(currentProject),
      navigationActions: [buildProjectAction(currentProject.projectId)],
    }
  }

  if (currentProject && /photo/.test(normalized)) {
    return {
      answer: formatPhotosAnswer(currentProject),
      navigationActions: [buildProjectAction(currentProject.projectId, 'Voir le dossier')],
    }
  }

  if (currentProject && /devis/.test(normalized) && /statut|ou en est|quel/.test(normalized)) {
    return {
      answer: formatQuoteStatusAnswer(currentProject),
      navigationActions: [buildProjectAction(currentProject.projectId)],
    }
  }

  if (currentProject && /acompte/.test(normalized)) {
    return {
      answer: formatDepositStatusAnswer(currentProject),
      navigationActions: [buildProjectAction(currentProject.projectId)],
    }
  }

  if (currentProject && /(message|retour).*(client)|y a-t-il des messages|a-t-il envoye/.test(normalized)) {
    return {
      answer: formatMessagesAnswer(currentProject),
      navigationActions: [buildProjectAction(currentProject.projectId)],
    }
  }

  if (currentProject && /(prochain rendez-vous|rendez-vous|rdv)/.test(normalized)) {
    return {
      answer: formatAppointmentAnswer(currentProject),
      navigationActions: [buildProjectAction(currentProject.projectId)],
    }
  }

  if (currentProject && /(activite du dossier|historique|timeline|activite)/.test(normalized)) {
    return {
      answer: formatActivityAnswer(currentProject),
      navigationActions: [buildProjectAction(currentProject.projectId)],
    }
  }

  if (params.pageContext?.pageType === 'project_detail' && params.pageContext.projectId && !currentProject && isProjectQuestion(normalized)) {
    return {
      answer: "Je n'ai pas pu verifier le dossier courant. Il est peut-etre introuvable ou non accessible avec votre session.",
    }
  }

  if (/quels devis sont a relancer|devis.*relancer|devis.*a relancer/.test(normalized)) {
    const items = await listQuoteFollowUpsForAssistant(params.artisanId)
    if (items.length === 0) {
      return { answer: "Je n'ai pas detecte de devis a relancer pour le moment." }
    }

    return {
      answer: [
        `Voici les devis a relancer en priorite :`,
        ...items.map((item) => `- ${item.clientName} - ${item.projectTitle} (${item.status}) : ${item.reason}`),
      ].join('\n'),
      navigationActions: items.slice(0, 3).map((item) => buildProjectAction(item.projectId, `Ouvrir ${item.clientName}`)),
    }
  }

  if (/acompte/.test(normalized) && /(paye|payes|regle|regles)/.test(normalized)) {
    const items = await listProjectsWithDepositPaidForAssistant(params.artisanId)
    if (items.length === 0) {
      return { answer: "Je ne vois pas de dossier avec acompte paye pour le moment." }
    }

    return {
      answer: [
        `Voici les dossiers avec acompte paye :`,
        ...items.map((item) => `- ${item.clientName || item.clientFirstName || 'Client'} - ${item.projectTitle || item.projectType || item.trade || 'Projet'} (${item.status})`),
      ].join('\n'),
      navigationActions: items.slice(0, 3).map((item) => buildProjectAction(item.id, `Ouvrir ${item.clientName || 'le dossier'}`)),
    }
  }

  if (/pas encore de rendez-vous|sans rendez-vous|sans rdv|n'ont pas encore de rendez-vous/.test(normalized)) {
    const items = await listProjectsWithoutAppointmentForAssistant(params.artisanId)
    if (items.length === 0) {
      return { answer: "Je ne vois pas de dossier ouvert sans rendez-vous dans la selection recente." }
    }

    return {
      answer: [
        `Voici les dossiers sans rendez-vous planifie :`,
        ...items.map((item) => `- ${item.clientName || item.clientFirstName || 'Client'} - ${item.projectTitle || item.projectType || item.trade || 'Projet'} (${item.status})`),
      ].join('\n'),
      navigationActions: items.slice(0, 3).map((item) => buildProjectAction(item.id, `Ouvrir ${item.clientName || 'le dossier'}`)),
    }
  }

  if (/(taches|actions).*(aujourd'hui|a faire)|que dois-je traiter aujourd'hui/.test(normalized)) {
    const tasks = await listTasksToDoForAssistant(params.artisanId)
    if (tasks.length === 0) {
      return { answer: "Je n'ai pas detecte de tache prioritaire pour le moment." }
    }

    return {
      answer: [
        `Voici les taches a traiter en priorite :`,
        ...tasks.map((task) => `- ${task.clientName} - ${task.title} (${task.priority})`),
      ].join('\n'),
      navigationActions: tasks.slice(0, 3).map((task) => buildProjectAction(task.projectId, `Ouvrir ${task.clientName}`)),
    }
  }

  if (/(rendez-vous|rdv).*(cette semaine|a venir|prochains)/.test(normalized)) {
    const appointments = await listUpcomingAppointmentsForAssistant(params.artisanId)
    if (appointments.length === 0) {
      return { answer: "Je ne vois pas de rendez-vous a venir pour le moment." }
    }

    return {
      answer: [
        `Voici vos prochains rendez-vous :`,
        ...appointments.map((appointment) => `- ${appointment.clientName} - ${appointment.start}`),
      ].join('\n'),
      navigationActions: appointments.slice(0, 3).map((appointment) => buildProjectAction(appointment.projectId, `Ouvrir ${appointment.clientName}`)),
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  let artisanIdForLog = 'unknown'

  try {
    const session = await getSession()
    if (!session || !session.artisanId) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }
    artisanIdForLog = session.artisanId

    let body: { messages?: unknown; pageContext?: unknown; context?: unknown; kind?: unknown; intent?: unknown; parameters?: unknown; message?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Corps de requete invalide' }, { status: 400 })
    }

    const messages = sanitizeMessages(body?.messages)
    if (messages.length === 0 && !(body?.kind === 'intent' && isAssistantIntent(body.intent))) {
      return NextResponse.json({ success: false, error: 'Aucun message fourni' }, { status: 400 })
    }

    const pageContext = sanitizeAssistantPageContext(body?.context || body?.pageContext)
    const currentProjectSummary = pageContext?.projectId
      ? await getProjectSummaryForAssistant(pageContext.projectId, session.artisanId)
      : null

    const context = await buildArtisanAssistantContext(session.artisanId, session.plan || 'essentiel')
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || ''
    const requestIntent = body?.kind === 'intent' && isAssistantIntent(body.intent) && pageContext
      ? { kind: 'intent' as const, intent: body.intent, context: pageContext, ...(body.parameters && typeof body.parameters === 'object' ? { parameters: body.parameters as Record<string, unknown> } : {}) }
      : pageContext
        ? { kind: 'message' as const, message: typeof body?.message === 'string' ? body.message.slice(0, MAX_MESSAGE_LENGTH) : lastUserMessage, context: pageContext }
        : null
    const resolution = requestIntent ? resolveAssistantIntent(requestIntent) : null
    if (resolution?.kind === 'capability' && isTrackingIntent(resolution.intent)) {
      const tracking = await getTrackingBriefForAssistant(session)
      if (tracking.kind === 'forbidden') {
        return NextResponse.json({ success: false, error: 'Vous n’avez pas accès à ces dossiers.' }, { status: 403 })
      }
      const assistantResponse = buildTrackingInsightResponse(resolution.intent, tracking.brief)
      console.info('[KADRIA-ORCHESTRATOR]', { intent: resolution.intent, capability: 'tracking-insights', durationMs: Date.now() - startedAt, resultCount: assistantResponse.details?.length || 0, responseMode: 'deterministic', success: true })
      return NextResponse.json({
        success: true,
        answer: assistantResponse.summary,
        assistantResponse,
        usage: null,
        navigationActions: assistantResponse.actions?.filter((action) => action.kind === 'navigate').map((action) => ({ label: action.label, href: action.href })),
      })
    }
    if (resolution?.kind === 'capability' && isPerformanceIntent(resolution.intent)) {
      const period = performancePeriod(resolution.parameters.period)
      const performance = await getPerformanceDataForAssistant(session, period)
      if (performance.kind === 'forbidden') {
        return NextResponse.json({ success: false, error: 'Vous n’avez pas accès aux performances de cette entreprise.' }, { status: 403 })
      }
      const assistantResponse = buildPerformanceAssistantResponse(resolution.intent, performance.data)
      console.info('[KADRIA-ORCHESTRATOR]', { intent: resolution.intent, capability: 'performance-insights', period, durationMs: Date.now() - startedAt, resultCount: assistantResponse.details?.length || 0, responseMode: 'deterministic', success: true })
      return NextResponse.json({ success: true, answer: assistantResponse.summary, assistantResponse, usage: null, navigationActions: assistantResponse.actions?.filter((action) => action.kind === 'navigate').map((action) => ({ label: action.label, href: action.href })) })
    }
    const contextualReply = await buildContextualReadOnlyReply({
      lastUserMessage,
      pageContext,
      currentProjectSummary,
      artisanId: session.artisanId,
    })
    const deterministicReply = buildDeterministicReply(lastUserMessage, context)

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

    const immediateReply = contextualReply || deterministicReply
    if (immediateReply) {
      return NextResponse.json({
        success: true,
        answer: immediateReply.answer,
        usage: null,
        ...(immediateReply.navigationActions ? { navigationActions: immediateReply.navigationActions } : {}),
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
        { status: 403 },
      )
    }

    let client
    try {
      client = getKadriaAssistantOpenAIClient()
    } catch {
      console.error('[KADRIA-ASSISTANT] OPENAI_API_KEY manquante')
      return NextResponse.json(
        { success: false, error: "L'assistant est temporairement indisponible. Merci de reessayer plus tard." },
        { status: 503 },
      )
    }

    const systemPrompt = buildKadriaAssistantSystemPrompt(context, {
      pageContextSummary: buildPageContextSummary(pageContext, currentProjectSummary),
      currentProjectSummary: currentProjectSummary ? formatProjectSummaryForAssistant(currentProjectSummary) : null,
    })

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
      console.error('[KADRIA-ASSISTANT] Reponse vide de OpenAI', { artisanId: artisanIdForLog })
      return NextResponse.json(
        { success: false, error: "L'assistant n'a pas pu generer de reponse. Merci de reformuler votre question." },
        { status: 502 },
      )
    }

    console.info('[KADRIA-ASSISTANT] success', {
      artisanId: artisanIdForLog,
      durationMs: Date.now() - startedAt,
    })

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
          ? "L'assistant est momentanement surcharge. Merci de reessayer dans quelques instants."
          : "Une erreur est survenue. Merci de reessayer plus tard.",
      },
      { status: 502 },
    )
  }
}
