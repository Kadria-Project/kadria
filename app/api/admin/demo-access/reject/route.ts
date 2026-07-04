import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { rejectDemoAccessRequest } from '@/src/lib/demo-access'

type RejectPayload = {
  requestId?: string
  email?: string
  internalNote?: string
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = (await request.json().catch(() => null)) as RejectPayload | null
    const requestId = normalizeText(body?.requestId)
    const email = normalizeText(body?.email).toLowerCase()
    if (!requestId && !email) {
      return NextResponse.json({ error: 'requestId ou email requis.' }, { status: 400 })
    }

    const resolvedRequestId = await rejectDemoAccessRequest({
      requestId,
      email,
      internalNote: normalizeText(body?.internalNote),
    })

    return NextResponse.json({ success: true, requestId: resolvedRequestId })
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_NOT_FOUND') {
      return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
    }
    if (error instanceof Error && (error.message === 'REQUEST_ID_MISSING' || error.message === 'REQUEST_UPDATE_CONFLICT')) {
      return NextResponse.json({ error: 'Aucune demande mise a jour. Verifiez l identifiant de la demande.' }, { status: 409 })
    }
    console.error('[ADMIN DEMO ACCESS] Reject error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
