import { NextResponse } from 'next/server'
import { approveDemoAccessRequest } from '@/src/lib/demo-access'

type ApprovePayload = {
  requestId?: string
  email?: string
  sendEmail?: boolean
}

function getAdminSecret() {
  return process.env.DEMO_ACCESS_ADMIN_SECRET || ''
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

export async function POST(request: Request) {
  try {
    const providedSecret = request.headers.get('x-admin-secret') || ''
    const expectedSecret = getAdminSecret()

    if (!expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'DEMO_ACCESS_ADMIN_SECRET manquant.' },
        { status: 503 },
      )
    }

    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Acces refuse.' },
        { status: 401 },
      )
    }

    const body = (await request.json().catch(() => null)) as ApprovePayload | null
    if (!body) {
      return NextResponse.json({ success: false, error: 'Requete invalide.' }, { status: 400 })
    }

    const requestId = normalizeText(body.requestId)
    const email = normalizeText(body.email).toLowerCase()

    if (!requestId && !email) {
      return NextResponse.json(
        { success: false, error: 'requestId ou email requis.' },
        { status: 400 },
      )
    }

    const result = await approveDemoAccessRequest({
      requestId,
      email,
      approvedBy: request.headers.get('x-admin-id') || 'manual_admin_secret',
      sendEmail: body.sendEmail,
    })

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      status: result.status,
      expiresAt: result.expiresAt,
      accessUrl: result.accessUrl,
      verifyUrl: result.verifyUrl,
      emailed: result.emailed,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Demande introuvable.' }, { status: 404 })
    }

    console.error('[DEMO ACCESS APPROVE] Error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur.' }, { status: 500 })
  }
}
