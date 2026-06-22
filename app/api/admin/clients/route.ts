import { NextResponse } from 'next/server'
import { getAllUsers } from '@/src/lib/airtable'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { getPlanLabel, normalizePlan, hasFeature } from '@/src/lib/plans'
import { getMonthlyUsageSummary, type UsageStatus } from '@/src/lib/usage/quotas'

type AlertLevel = 'ok' | 'warning' | 'danger'

function formatUsageLabel(used: number, limit: number | null) {
  return `${used} / ${limit === null ? 'Illimité' : limit}`
}

function toAlertLevel(status: UsageStatus): AlertLevel {
  if (status === 'exceeded' || status === 'limit_reached') return 'danger'
  if (status === 'warning') return 'warning'
  return 'ok'
}

function combineAlertLevel(a: AlertLevel, b: AlertLevel): AlertLevel {
  const order: AlertLevel[] = ['ok', 'warning', 'danger']
  return order[Math.max(order.indexOf(a), order.indexOf(b))]
}

export async function GET() {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const users = await getAllUsers()
    const artisans = users.filter((u) => u.role !== 'Admin')

    const clients = await Promise.all(
      artisans.map(async (u) => {
        const plan = normalizePlan(u.plan)
        const planLabel = getPlanLabel(u.plan)
        const statut = u.statut || 'Actif'

        const usageResult = u.artisanId ? await getMonthlyUsageSummary(u.artisanId) : null
        const usageData = usageResult?.success ? usageResult.data : null

        const projectsUsed = usageData?.projects.used ?? 0
        const projectLimit = usageData ? (usageData.projects.unlimited ? null : usageData.projects.limit) : null
        const voiceCallsUsed = usageData?.vapi.callsUsed ?? 0
        const voiceCallLimit = usageData ? (usageData.vapi.callsUnlimited ? null : usageData.vapi.callsLimit) : null
        const voiceMinutesUsed = usageData?.vapi.minutesUsed ?? 0
        const voiceMinuteLimit = usageData?.vapi.minutesLimit ?? null

        const usage = {
          projectsThisMonth: projectsUsed,
          projectLimit,
          projectUsageLabel: formatUsageLabel(projectsUsed, projectLimit),
          voiceCallsThisMonth: voiceCallsUsed,
          voiceCallLimit,
          voiceCallUsageLabel: formatUsageLabel(voiceCallsUsed, voiceCallLimit),
          voiceMinutesThisMonth: voiceMinutesUsed,
          voiceMinuteLimit,
          voiceMinuteUsageLabel: formatUsageLabel(voiceMinutesUsed, voiceMinuteLimit),
        }

        const features = {
          pdfExports: hasFeature(plan, 'pdfExports'),
          advancedPipeline: hasFeature(plan, 'commercialPipeline'),
          autoFollowups: hasFeature(plan, 'automaticFollowups'),
          voiceAssistant: hasFeature(plan, 'voiceAssistant'),
          quoteAssistant: hasFeature(plan, 'quoteGeneration'),
          multiUsers: hasFeature(plan, 'teamWorkspace'),
        }

        let level: AlertLevel = 'ok'
        const messages: string[] = []

        if (statut === 'Suspendu') {
          level = combineAlertLevel(level, 'danger')
          messages.push('Compte suspendu')
        }
        if (statut === 'Résilié') {
          level = combineAlertLevel(level, 'danger')
          messages.push('Abonnement résilié')
        }

        if (usageData) {
          const projectsLevel = toAlertLevel(usageData.projects.status)
          level = combineAlertLevel(level, projectsLevel)
          if (projectsLevel !== 'ok') {
            messages.push(`Dossiers : ${usage.projectUsageLabel}`)
          }

          const vapiLevel = toAlertLevel(usageData.vapi.status)
          level = combineAlertLevel(level, vapiLevel)
          if (vapiLevel !== 'ok') {
            messages.push(`Appels vocaux : ${usage.voiceCallUsageLabel}`)
          }
        }

        return {
          id: u.id,
          email: u.email,
          first_name: u.firstName,
          last_name: u.lastName,
          company: u.company,
          role: u.role,
          plan: planLabel,
          statut,
          trial_end_date: u.trialEndDate,
          subscription_start: u.subscriptionStart,
          next_billing: u.nextBilling,
          last_login: u.lastLogin,
          created_at: u.createdAt,
          artisan_id: u.artisanId,

          artisanId: u.artisanId,
          name: `${u.firstName} ${u.lastName}`.trim(),
          companyName: u.company,
          planKey: plan,
          planLabel,
          status: statut,
          createdAt: u.createdAt,
          usage,
          features,
          alerts: { level, messages },
        }
      })
    )

    if (clients[0]) {
      console.log('[ADMIN CLIENTS] API payload sample (debug)', {
        id: clients[0].id,
        artisanId: clients[0].artisanId,
        artisan_id: clients[0].artisan_id,
        keys: Object.keys(clients[0]),
      })
    }

    return NextResponse.json(clients)
  } catch (error) {
    console.error('[ADMIN CLIENTS]', error)
    return NextResponse.json({ error: 'Erreur serveur', detail: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
