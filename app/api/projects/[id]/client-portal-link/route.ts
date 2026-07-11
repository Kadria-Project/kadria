import { NextResponse } from 'next/server'
import { getClientPortalUrl } from '@/src/lib/client-portal'
import { authorizeProjectAccess, ProjectAccessError } from '@/src/lib/project-responsibility'
import { PermissionError } from '@/src/lib/team/access'

// Endpoint interne authentifié qui génère paresseusement le token du portail client
// si nécessaire, puis renvoie l'URL publique correspondante.

interface StructuredSupabaseErrorLike {
  code?: unknown
  message?: unknown
  details?: unknown
  hint?: unknown
}

function logClientPortalLinkError(projectId: string, error: unknown) {
  const supabaseError = error as StructuredSupabaseErrorLike
  console.error('[CLIENT-PORTAL LINK]', {
    projectId,
    code:
      error instanceof ProjectAccessError
        ? error.code
        : typeof supabaseError?.code === 'string'
          ? supabaseError.code
          : null,
    message:
      error instanceof Error
        ? error.message
        : typeof supabaseError?.message === 'string' && supabaseError.message.trim()
          ? supabaseError.message
          : 'Unknown route error',
    details:
      error instanceof ProjectAccessError
        ? error.details
        : typeof supabaseError?.details === 'string'
          ? supabaseError.details
          : null,
    hint:
      error instanceof ProjectAccessError
        ? error.hint
        : typeof supabaseError?.hint === 'string'
          ? supabaseError.hint
          : null,
    context: error instanceof ProjectAccessError ? error.context : 'client-portal-link.route',
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let projectId = ''
  try {
    const { id } = await params
    projectId = id
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

    logClientPortalLinkError(projectId, e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
