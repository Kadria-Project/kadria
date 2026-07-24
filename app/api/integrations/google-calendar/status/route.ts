import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getCalendarIntegration } from '@/src/lib/google-calendar'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { checkPermission } from '@/src/lib/team/access'

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const tenantContext = await getCurrentTenantContext()
    if (!checkPermission(tenantContext, 'integrations.read')) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    const { row, tableMissing } = await getCalendarIntegration(session.artisanId)

    if (tableMissing) {
      // Table pas encore créée en base (migration non exécutée) : on
      // renvoie un état "non connecté" propre plutôt que de faire planter
      // la requête.
      return NextResponse.json({ success: true, connected: false, provider: null, email: null, connectedAt: null, updatedAt: null })
    }

    if (!row || !row.is_connected) {
      return NextResponse.json({ success: true, connected: false, provider: null, email: null, connectedAt: null, updatedAt: null })
    }

    return NextResponse.json({
      success: true,
      connected: true,
      provider: row.provider,
      email: row.calendar_email,
      connectedAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error) {
    console.error('[GOOGLE CALENDAR STATUS]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
