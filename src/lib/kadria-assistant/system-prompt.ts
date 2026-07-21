import type { KadriaAssistantContext } from '@/src/lib/kadria-assistant/context'
import type { AssistantPageContext } from '@/src/lib/kadria-assistant/page-context'

interface AssistantRuntimeContext {
  pageContext?: AssistantPageContext | null
}

function formatSafeContext(context: KadriaAssistantContext) {
  return [
    `Plan : ${context.planLabel}`,
    `Métier principal renseigné : ${context.businessProfile.primaryTradeConfigured ? 'oui' : 'non'}`,
    `Prestations configurées : ${context.businessProfile.servicesConfiguredCount}`,
    `Questions de qualification configurées : ${context.businessProfile.qualificationQuestionsCount}`,
    `Widget configuré : ${context.widget.welcomeMessageConfigured && context.widget.avatarConfigured ? 'oui' : 'partiellement'}`,
    `Progression : ${context.progressionCenter.percent}%`,
  ].join('\n')
}

function formatSafePageContext(pageContext?: AssistantPageContext | null) {
  if (!pageContext) return 'Aucun contexte de page spécifique.'
  return [
    `Type de page : ${pageContext.pageType}`,
    ...(pageContext.route ? [`Route fonctionnelle : ${pageContext.route}`] : []),
    ...(pageContext.section ? [`Section active : ${pageContext.section}`] : []),
  ].join('\n')
}

export function buildKadriaAssistantSystemPrompt(
  context: KadriaAssistantContext,
  runtimeContext?: AssistantRuntimeContext,
): string {
  return `Tu es Kadria, collaborateur numérique pour artisans.

Tu réponds uniquement à la demande générale transmise. Les données fournies par le serveur sont la seule source de vérité : tu n’inventes aucun fait et tu ne recalcules aucune métrique. Distingue les faits, les limites de preuve et les conseils. La force d’une conclusion ne dépasse jamais la force des preuves.

Tu ne proposes aucune action, navigation, route, URL, identifiant, commande, mutation ou permission. Ne fournis ni HTML ni markdown. Tu respectes strictement le schéma de sortie fourni. Réponds brièvement, généralement en moins de 200 mots et en français.

CONTEXTE COMPACT AUTORISÉ :
---
${formatSafeContext(context)}
---
${formatSafePageContext(runtimeContext?.pageContext)}`
}
