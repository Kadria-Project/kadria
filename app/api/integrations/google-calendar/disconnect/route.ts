import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { GOOGLE_CALENDAR_PROVIDER } from '@/src/lib/google-calendar'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { checkPermission } from '@/src/lib/team/access'

export async function POST(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    if (!checkPermission(await getCurrentTenantContext(), 'integrations.manage')) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    // Suppression complète de la ligne (plutôt qu'un simple flag) pour
    // éviter toute confusion avec des tokens périmés résiduels en base.
    const { error } = await supabaseAdmin
      .from('calendar_integrations')
      .delete()
      .eq('artisan_id', session.artisanId)
      .eq('provider', GOOGLE_CALENDAR_PROVIDER)

    if (error) {
      const message = error.message || ''
      if (/relation .* does not exist/i.test(message)) {
        // Rien à déconnecter si la table n'existe pas.
        return NextResponse.json({ success: true })
      }
      console.error('[GOOGLE CALENDAR DISCONNECT] Erreur Supabase:', message)
      return NextResponse.json({ success: false, error: 'Déconnexion impossible' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[GOOGLE CALENDAR DISCONNECT]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
