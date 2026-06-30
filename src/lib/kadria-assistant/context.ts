import 'server-only'
import { getArtisanConfig, getProjectsByArtisan, getDevisByArtisan } from '@/src/lib/airtable'
import { getBusinessProfile } from '@/src/lib/business-profile'
import { computeSetupProgress } from '@/src/lib/setup-progress'
import { normalizePlan, getPlanLabel, getMonthlyProjectLimit } from '@/src/config/plans'

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
    welcomeMessageConfigured: boolean
    websiteUrlConfigured: boolean
  }
  businessProfile: {
    primaryTradeConfigured: boolean
    specialtiesCount: number
    interventionZoneConfigured: boolean
    hourlyRateConfigured: boolean
    servicesConfiguredCount: number
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
  }
  usage: {
    monthlyProjectsCount: number
    monthlyProjectLimit: number | null
  }
}

export async function buildArtisanAssistantContext(artisanId: string, planFromSession: string): Promise<KadriaAssistantContext> {
  const plan = normalizePlan(planFromSession)

  const [artisanConfig, businessProfileResult, projects, devis] = await Promise.all([
    getArtisanConfig(artisanId).catch(() => null),
    getBusinessProfile(artisanId).catch(() => ({ row: null, tableMissing: true as const })),
    getProjectsByArtisan(artisanId).catch(() => []),
    getDevisByArtisan(artisanId).catch(() => []),
  ])

  const businessProfileRow = businessProfileResult.row

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
  })

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
      welcomeMessageConfigured: Boolean(artisanConfig?.welcomeMessage),
      websiteUrlConfigured: Boolean(artisanConfig?.websiteUrl),
    },
    businessProfile: {
      primaryTradeConfigured: Boolean(businessProfileRow?.primary_trade),
      specialtiesCount: businessProfileRow?.specialties?.length || 0,
      interventionZoneConfigured: Boolean(businessProfileRow?.base_city && businessProfileRow?.intervention_radius_km),
      hourlyRateConfigured: Boolean(businessProfileRow?.hourly_rate_ht),
      servicesConfiguredCount: businessProfileRow?.specialties?.length || 0,
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
    },
    usage: {
      monthlyProjectsCount,
      monthlyProjectLimit: getMonthlyProjectLimit(plan),
    },
  }
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

  lines.push('\nConfiguration du widget :')
  lines.push(`- Couleur principale personnalisée : ${ctx.widget.primaryColorConfigured ? 'oui' : 'non (couleur par défaut)'}`)
  lines.push(`- Avatar personnalisé : ${ctx.widget.avatarConfigured ? 'oui' : 'non'}`)
  lines.push(`- Marque blanche active : ${ctx.widget.whiteLabelEnabled ? 'oui' : 'non'}`)
  lines.push(`- Message d'accueil configuré : ${ctx.widget.welcomeMessageConfigured ? 'oui' : 'non'}`)
  lines.push(`- Lien site web configuré : ${ctx.widget.websiteUrlConfigured ? 'oui' : 'non'}`)

  lines.push('\nProfil métier :')
  lines.push(`- Métier principal renseigné : ${ctx.businessProfile.primaryTradeConfigured ? 'oui' : 'non'}`)
  lines.push(`- Nombre de spécialités/prestations configurées : ${ctx.businessProfile.specialtiesCount}`)
  lines.push(`- Zone d'intervention configurée : ${ctx.businessProfile.interventionZoneConfigured ? 'oui' : 'non'}`)
  lines.push(`- Tarif horaire configuré : ${ctx.businessProfile.hourlyRateConfigured ? 'oui' : 'non'}`)

  lines.push('\nCentre de progression :')
  lines.push(`- Avancement : ${ctx.progressionCenter.percent}% (${ctx.progressionCenter.completedSteps}/${ctx.progressionCenter.totalSteps} étapes complétées)`)
  if (ctx.progressionCenter.nextStepLabel) {
    lines.push(`- Prochaine étape recommandée : ${ctx.progressionCenter.nextStepLabel}`)
  }

  lines.push('\nDevis :')
  lines.push(`- Devis existants : ${ctx.quotes.hasAnyQuote ? `oui (${ctx.quotes.recentCount})` : 'aucun pour le moment'}`)

  lines.push('\nUsage :')
  lines.push(`- Dossiers créés ce mois-ci : ${ctx.usage.monthlyProjectsCount}`)
  lines.push(`- Limite mensuelle du plan : ${ctx.usage.monthlyProjectLimit === null ? 'illimitée' : ctx.usage.monthlyProjectLimit}`)

  return lines.join('\n')
}
