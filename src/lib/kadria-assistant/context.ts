import 'server-only'
import { getArtisanConfig, getProjectsByArtisan, getDevisByArtisan } from '@/src/lib/airtable'
import { getBusinessProfile } from '@/src/lib/business-profile'
import { listServiceProfiles } from '@/src/lib/service-profiles'
import { computeSetupProgress } from '@/src/lib/setup-progress'
import { normalizePlan, getPlanLabel, getMonthlyProjectLimit, hasFeature } from '@/src/config/plans'

// Construit un résumé compact du compte de l'artisan connecté, destiné à être
// injecté dans le system prompt de l'assistant IA interne. Volontairement
// PAS un dump complet de la base : uniquement des indicateurs agrégés et des
// booléens de configuration, jamais le détail des projets/devis individuels
// ni de données d'autres artisans.
export interface KadriaAssistantContext {
  artisanId: string
  companyName: string
  plan: string
  planLabel: string
  primaryTrade: string
  coveredTrades: string[]
  city: string
  widget: {
    primaryColorConfigured: boolean
    avatarConfigured: boolean
    whiteLabelEnabled: boolean
    whiteLabelAvailableOnPlan: boolean
    welcomeMessageConfigured: boolean
    websiteUrlConfigured: boolean
  }
  businessProfile: {
    primaryTradeConfigured: boolean
    specialtiesCount: number
    interventionZoneConfigured: boolean
    hourlyRateConfigured: boolean
    servicesConfiguredCount: number
    qualificationQuestionsCount: number
  }
  progressionCenter: {
    percent: number
    completedSteps: number
    totalSteps: number
    nextStepLabel: string | null
  }
  quotes: {
    recentCount: number
    hasAnyQuote: boolean
    automaticFollowupsAvailableOnPlan: boolean
  }
  usage: {
    monthlyProjectsCount: number
    monthlyProjectLimit: number | null
  }
}

export async function buildArtisanAssistantContext(artisanId: string, planFromSession: string): Promise<KadriaAssistantContext> {
  const plan = normalizePlan(planFromSession)

  const [artisanConfig, businessProfileResult, projects, devis, serviceProfilesResult] = await Promise.all([
    getArtisanConfig(artisanId).catch(() => null),
    getBusinessProfile(artisanId).catch(() => ({ row: null, tableMissing: true as const })),
    getProjectsByArtisan(artisanId).catch(() => []),
    getDevisByArtisan(artisanId).catch(() => []),
    listServiceProfiles(artisanId).catch(() => ({ rows: [], tableMissing: true as const })),
  ])

  const businessProfileRow = businessProfileResult.row
  const serviceProfileRows = serviceProfilesResult.rows || []

  const progress = computeSetupProgress({
    businessProfile: businessProfileRow
      ? {
          primaryTrade: businessProfileRow.primary_trade,
          baseCity: businessProfileRow.base_city,
          interventionRadiusKm: businessProfileRow.intervention_radius_km,
          hourlyRateHt: businessProfileRow.hourly_rate_ht,
          defaultVatRate: businessProfileRow.default_vat_rate,
          workingDays: businessProfileRow.working_days,
          workStartTime: businessProfileRow.work_start_time,
          workEndTime: businessProfileRow.work_end_time,
        }
      : null,
    artisanConfig: artisanConfig
      ? {
          companyName: artisanConfig.companyName,
          phone: artisanConfig.phone,
          villePro: artisanConfig.villePro,
          address: artisanConfig.address,
          businessConfig: artisanConfig.businessConfig as { calendarMode?: string | null } | null,
        }
      : null,
    serviceProfiles: serviceProfileRows.map((s) => ({ id: s.id })),
  })

  // Nombre total de questions de qualification configurées, toutes
  // prestations confondues (déjà chargé ci-dessus, aucune requête
  // supplémentaire).
  const qualificationQuestionsCount = serviceProfileRows.reduce(
    (sum, s) => sum + (s.qualification_questions?.length || 0),
    0
  )

  // Réutilise directement les étapes "todo" déjà calculées par le Centre de
  // progression existant (src/lib/setup-progress.ts), sans dupliquer sa
  // logique de priorisation.
  const nextTodoStep = [...progress.steps]
    .filter((s) => s.status === 'todo')
    .sort((a, b) => a.priority - b.priority)[0]
  const nextStepLabel: string | null = nextTodoStep?.label ?? null

  const now = new Date()
  const monthlyProjectsCount = (projects || []).filter((p) => {
    if (!p.createdAt) return false
    const d = new Date(p.createdAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  return {
    artisanId,
    companyName: artisanConfig?.companyName || '',
    plan,
    planLabel: getPlanLabel(plan),
    primaryTrade: businessProfileRow?.primary_trade || artisanConfig?.primaryTrade || '',
    coveredTrades: businessProfileRow?.covered_trades || artisanConfig?.trades || [],
    city: businessProfileRow?.base_city || artisanConfig?.villePro || '',
    widget: {
      primaryColorConfigured: Boolean(artisanConfig?.primaryColor && artisanConfig.primaryColor !== '#22c55e'),
      avatarConfigured: Boolean(artisanConfig?.assistantAvatarUrl) || (artisanConfig?.assistantAvatarType ? artisanConfig.assistantAvatarType !== 'kadria_default' : false),
      whiteLabelEnabled: Boolean(artisanConfig?.whiteLabelEnabled),
      whiteLabelAvailableOnPlan: hasFeature(plan, 'whiteLabel'),
      welcomeMessageConfigured: Boolean(artisanConfig?.welcomeMessage),
      websiteUrlConfigured: Boolean(artisanConfig?.websiteUrl),
    },
    businessProfile: {
      primaryTradeConfigured: Boolean(businessProfileRow?.primary_trade),
      specialtiesCount: businessProfileRow?.specialties?.length || 0,
      interventionZoneConfigured: Boolean(businessProfileRow?.base_city && businessProfileRow?.intervention_radius_km),
      hourlyRateConfigured: Boolean(businessProfileRow?.hourly_rate_ht),
      servicesConfiguredCount: serviceProfileRows.length,
      qualificationQuestionsCount,
    },
    progressionCenter: {
      percent: progress.percent,
      completedSteps: progress.completedSteps,
      totalSteps: progress.totalSteps,
      nextStepLabel,
    },
    quotes: {
      recentCount: Math.min(devis?.length || 0, 999),
      hasAnyQuote: (devis?.length || 0) > 0,
      automaticFollowupsAvailableOnPlan: hasFeature(plan, 'automaticFollowups'),
    },
    usage: {
      monthlyProjectsCount,
      monthlyProjectLimit: getMonthlyProjectLimit(plan),
    },
  }
}

// Niveau global synthétique du compte, dérivé du score du Centre de
// progression déjà calculé par computeSetupProgress (aucun nouveau calcul
// lourd, juste une catégorisation lisible pour le LLM).
function getAccountLevelLabel(percent: number): string {
  if (percent >= 71) return 'solide'
  if (percent >= 26) return 'à compléter'
  return 'démarrage'
}

function getWidgetStatusLabel(widget: KadriaAssistantContext['widget']): string {
  const signals = [
    widget.welcomeMessageConfigured,
    widget.primaryColorConfigured,
    widget.avatarConfigured,
  ]
  const configuredCount = signals.filter(Boolean).length
  if (configuredCount === signals.length) return 'bien configuré'
  if (configuredCount === 0) return 'non configuré'
  return 'partiellement configuré'
}

function getBusinessProfileStatusLabel(bp: KadriaAssistantContext['businessProfile']): string {
  if (!bp.primaryTradeConfigured) return 'vide'
  if (bp.specialtiesCount > 0 && bp.qualificationQuestionsCount > 0 && bp.interventionZoneConfigured && bp.hourlyRateConfigured) {
    return 'complet'
  }
  return 'incomplet'
}

export interface AssistantPriority {
  label: string
  reason: string
  destination: string
}

// Détermine au maximum 3 priorités de configuration, dans l'ordre métier
// recommandé (métier > prestations > questions > widget > marque blanche >
// relances > optimisation). Logique simple, explicable, basée uniquement
// sur les booléens/compteurs déjà présents dans le contexte — aucune
// nouvelle requête, aucune donnée inventée.
export function getAssistantPriorities(ctx: KadriaAssistantContext): AssistantPriority[] {
  const priorities: AssistantPriority[] = []

  if (!ctx.businessProfile.primaryTradeConfigured) {
    priorities.push({
      label: 'Renseigner votre métier principal',
      reason: "Sans métier renseigné, Kadria ne peut pas qualifier vos demandes ni adapter vos prestations.",
      destination: 'Profil métier',
    })
  } else if (ctx.businessProfile.specialtiesCount === 0) {
    priorities.push({
      label: 'Ajouter vos prestations fréquentes',
      reason: 'Des prestations configurées permettent à Kadria de mieux qualifier les demandes et de préparer des dossiers plus faciles à chiffrer.',
      destination: 'Profil métier',
    })
  } else if (ctx.businessProfile.qualificationQuestionsCount === 0) {
    priorities.push({
      label: 'Ajouter des questions de qualification',
      reason: 'Des questions de qualification adaptées à votre métier améliorent la pertinence des demandes reçues.',
      destination: 'Profil métier',
    })
  }

  if (priorities.length < 3 && getWidgetStatusLabel(ctx.widget) !== 'bien configuré') {
    priorities.push({
      label: 'Compléter la configuration du widget',
      reason: "Un widget complet (message d'accueil, couleurs, avatar) inspire davantage confiance aux prospects.",
      destination: 'Mon widget',
    })
  }

  if (priorities.length < 3 && ctx.widget.whiteLabelAvailableOnPlan && !ctx.widget.whiteLabelEnabled) {
    priorities.push({
      label: 'Activer la marque blanche',
      reason: 'Votre plan inclut la marque blanche : l’activer renforce votre image de marque auprès de vos prospects.',
      destination: 'Paramètres',
    })
  }

  if (priorities.length < 3 && ctx.quotes.hasAnyQuote && ctx.quotes.automaticFollowupsAvailableOnPlan) {
    priorities.push({
      label: 'Mettre en place une routine de relance devis',
      reason: 'Des relances de devis bien suivies augmentent le taux de conversion de vos dossiers en cours.',
      destination: 'Tableau de bord',
    })
  }

  if (priorities.length === 0) {
    priorities.push({
      label: 'Optimiser vos tarifs et votre suivi commercial',
      reason: 'Votre configuration est globalement solide : la prochaine marge de progression porte sur l’optimisation tarifaire et le suivi commercial.',
      destination: 'Profil métier',
    })
  }

  return priorities.slice(0, 3)
}

// Sérialise le contexte en texte compact, lisible par le LLM, sans jamais
// inclure d'identifiants techniques bruts ni de données d'autres artisans.
export function formatContextForPrompt(ctx: KadriaAssistantContext): string {
  const lines: string[] = []
  lines.push(`Entreprise : ${ctx.companyName || 'non renseignée'}`)
  lines.push(`Plan actuel : ${ctx.planLabel} (${ctx.plan})`)
  lines.push(`Métier principal : ${ctx.primaryTrade || 'non renseigné'}`)
  if (ctx.coveredTrades.length > 0) {
    lines.push(`Métiers complémentaires : ${ctx.coveredTrades.join(', ')}`)
  }
  lines.push(`Zone / ville : ${ctx.city || 'non renseignée'}`)

  const widgetStatus = getWidgetStatusLabel(ctx.widget)
  lines.push(`\nWidget : ${widgetStatus}`)
  lines.push(`- message d'accueil configuré : ${ctx.widget.welcomeMessageConfigured ? 'oui' : 'non'}`)
  lines.push(`- couleurs personnalisées : ${ctx.widget.primaryColorConfigured ? 'oui' : 'non (couleur par défaut)'}`)
  lines.push(`- logo / lien site web configuré : ${ctx.widget.websiteUrlConfigured ? 'oui' : 'non'}`)
  lines.push(`- avatar assistant personnalisé : ${ctx.widget.avatarConfigured ? 'oui' : 'non'}`)
  lines.push(
    `- marque blanche : ${
      ctx.widget.whiteLabelEnabled
        ? 'active'
        : ctx.widget.whiteLabelAvailableOnPlan
          ? 'disponible sur votre plan mais inactive'
          : 'non disponible sur votre plan actuel'
    }`
  )

  const businessProfileStatus = getBusinessProfileStatusLabel(ctx.businessProfile)
  lines.push(`\nProfil métier : ${businessProfileStatus}`)
  lines.push(`- métier renseigné : ${ctx.businessProfile.primaryTradeConfigured ? (ctx.primaryTrade || 'oui') : 'non'}`)
  lines.push(`- prestations configurées : ${ctx.businessProfile.servicesConfiguredCount}`)
  lines.push(`- questions de qualification configurées : ${ctx.businessProfile.qualificationQuestionsCount}`)
  lines.push(`- zone d'intervention configurée : ${ctx.businessProfile.interventionZoneConfigured ? 'oui' : 'non'}`)
  lines.push(`- tarif horaire configuré : ${ctx.businessProfile.hourlyRateConfigured ? 'oui' : 'non'}`)

  lines.push('\nDevis :')
  lines.push(`- Devis existants : ${ctx.quotes.hasAnyQuote ? `oui (${ctx.quotes.recentCount})` : 'aucun pour le moment'}`)
  lines.push(
    `- Relances automatiques : ${
      !ctx.quotes.automaticFollowupsAvailableOnPlan
        ? 'non disponibles sur votre plan actuel'
        : ctx.quotes.hasAnyQuote
          ? 'disponibles sur votre plan (à mettre en place si pas encore fait)'
          : 'disponibles sur votre plan (pas encore de devis à relancer)'
    }`
  )

  lines.push(`\nCentre de progression : ${ctx.progressionCenter.percent}% (niveau ${getAccountLevelLabel(ctx.progressionCenter.percent)})`)
  lines.push(`- Étapes complétées : ${ctx.progressionCenter.completedSteps}/${ctx.progressionCenter.totalSteps}`)
  if (ctx.progressionCenter.nextStepLabel) {
    lines.push(`- Prochaine étape recommandée : ${ctx.progressionCenter.nextStepLabel}`)
  }

  lines.push('\nUsage :')
  lines.push(`- Dossiers créés ce mois-ci : ${ctx.usage.monthlyProjectsCount}`)
  lines.push(`- Limite mensuelle du plan : ${ctx.usage.monthlyProjectLimit === null ? 'illimitée' : ctx.usage.monthlyProjectLimit}`)

  const priorities = getAssistantPriorities(ctx)
  if (priorities.length > 0) {
    lines.push('\nPriorités recommandées (ordre décroissant) :')
    priorities.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.label} — ${p.reason} (à faire dans : ${p.destination})`)
    })
  }

  return lines.join('\n')
}
