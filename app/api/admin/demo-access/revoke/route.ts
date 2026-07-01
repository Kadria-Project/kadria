import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { revokeDemoAccessRequest } from '@/src/lib/demo-access'

type RevokePayload = {
  requestId?: string
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
    const body = (await request.json().catch(() => null)) as RevokePayload | null
    const requestId = normalizeText(body?.requestId)
    if (!requestId) {
      return NextResponse.json({ error: 'requestId requis.' }, { status: 400 })
    }

    await revokeDemoAccessRequest({
      requestId,
      internalNote: normalizeText(body?.internalNote),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN DEMO ACCESS] Revoke error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
