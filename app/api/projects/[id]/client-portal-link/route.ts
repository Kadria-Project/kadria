import { NextResponse } from 'next/server'
import { getClientPortalUrl } from '@/src/lib/client-portal'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { PermissionError } from '@/src/lib/team/access'

// Endpoint interne authentifié qui génère paresseusement le token du portail client
// si nécessaire, puis renvoie l'URL publique correspondante.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authResult = await authorizeProjectAccess({
      projectId: id,
      allowAppointmentAccess: true,
      select: 'id',
    })

    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    const url = await getClientPortalUrl(authResult.projectId, authResult.session.artisanId)

    if (!url) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, url })
  } catch (e) {
    const permissionError = e as PermissionError
    if (permissionError?.status) {
      return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status })
    }

    console.error('[CLIENT-PORTAL LINK] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
