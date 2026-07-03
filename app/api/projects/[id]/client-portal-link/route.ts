import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { TABLES } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getBaseUrl } from '@/src/lib/base-url'

// Endpoint interne authentifié (même pattern que send-completion-sms) qui
// génère paresseusement le token du portail client (client_portal_token)
// s'il n'existe pas encore, puis renvoie l'URL publique correspondante.
// Ne crée aucun accès public à ce projet par ailleurs : le token reste
// opaque, jamais l'id du projet. L'intégration d'un bouton "copier le lien"
// dans le dashboard est volontairement laissée à un lot ultérieur (le
// périmètre de ce lot exclut la refonte du dashboard).

function getProjectById(id: string, artisanId: string) {
  return supabaseAdmin
    .from(TABLES.projects)
    .select('id, client_portal_token')
    .eq('id', id)
    .eq('artisan_id', artisanId)
    .limit(1)
    .maybeSingle()
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const { data: project, error } = await getProjectById(id, session.artisanId)

    if (error) throw error
    if (!project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    let token = project.client_portal_token as string | null

    if (!token) {
      token = randomBytes(24).toString('hex')
      const { error: updateError } = await supabaseAdmin
        .from(TABLES.projects)
        .update({ client_portal_token: token })
        .eq('id', project.id)
        .eq('artisan_id', session.artisanId)

      if (updateError) throw updateError
    }

    const url = `${getBaseUrl()}/client/projet/${token}`

    return NextResponse.json({ success: true, url })
  } catch (e) {
    console.error('[CLIENT-PORTAL LINK] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
