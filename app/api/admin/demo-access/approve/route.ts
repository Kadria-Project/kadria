import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { approveDemoAccessRequest } from '@/src/lib/demo-access'

type ApprovePayload = {
  requestId?: string
  email?: string
  sendEmail?: boolean
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
    const body = (await request.json().catch(() => null)) as ApprovePayload | null
    if (!body) {
      return NextResponse.json({ error: 'Requete invalide.' }, { status: 400 })
    }

    const requestId = normalizeText(body.requestId)
    const email = normalizeText(body.email).toLowerCase()

    if (!requestId && !email) {
      return NextResponse.json({ error: 'requestId ou email requis.' }, { status: 400 })
    }

    const result = await approveDemoAccessRequest({
      requestId,
      email,
      approvedBy: session.email,
      sendEmail: body.sendEmail,
    })

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      status: result.status,
      expiresAt: result.expiresAt,
      verifyUrl: result.verifyUrl,
      emailed: result.emailed,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_NOT_FOUND') {
      return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
    }

    console.error('[ADMIN DEMO ACCESS] Approve error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
