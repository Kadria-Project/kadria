import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getMonthlyUsageSummary, getAccountStatusForArtisan } from '@/src/lib/usage/quotas'
import { getKadriaAssistantUsageSummary } from '@/src/lib/kadria-assistant/quotas'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const result = await getMonthlyUsageSummary(session.artisanId)
    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || 'Impossible de charger l’utilisation mensuelle' },
        { status: 500 },
      )
    }

    const accountResult = await getAccountStatusForArtisan(session.artisanId)

    // Usage de l'Assistant Kadria interne : robuste si la colonne n'est pas
    // encore créée en base (renvoie used: 0 dans ce cas, jamais d'erreur).
    const assistantUsage = await getKadriaAssistantUsageSummary(session.artisanId, session.plan)
    const assistantPercent = assistantUsage.limit > 0
      ? Math.round((assistantUsage.used / assistantUsage.limit) * 1000) / 10
      : null
    const assistantStatus =
      assistantPercent === null ? 'ok'
        : assistantPercent > 100 ? 'exceeded'
        : assistantPercent === 100 ? 'limit_reached'
        : assistantPercent >= 80 ? 'warning'
        : 'ok'

    return NextResponse.json({
      success: true,
      usage: {
        ...result.data,
        assistant: {
          used: assistantUsage.used,
          limit: assistantUsage.limit,
          percent: assistantPercent,
          status: assistantStatus,
        },
      },
      ...(accountResult.success && accountResult.data ? { account: accountResult.data } : {}),
    })
  } catch (error) {
    console.error('[USAGE MONTHLY]', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
