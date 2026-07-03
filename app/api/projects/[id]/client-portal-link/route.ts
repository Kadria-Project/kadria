import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getClientPortalUrl } from '@/src/lib/client-portal'

// Endpoint interne authentifié (même pattern que send-completion-sms) qui
// génère paresseusement le token du portail client (client_portal_token)
// s'il n'existe pas encore, puis renvoie l'URL publique correspondante.
// Ne crée aucun accès public à ce projet par ailleurs : le token reste
// opaque, jamais l'id du projet. L'intégration d'un bouton "copier le lien"
// dans le dashboard est volontairement laissée à un lot ultérieur (le
// périmètre de ce lot exclut la refonte du dashboard).
// La génération/récupération du token est mutualisée dans
// src/lib/client-portal.ts (réutilisée aussi partout où le lien du portail
// client doit être construit côté serveur).

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
    const url = await getClientPortalUrl(id, session.artisanId)

    if (!url) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, url })
  } catch (e) {
    console.error('[CLIENT-PORTAL LINK] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
