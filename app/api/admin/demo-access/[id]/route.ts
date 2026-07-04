import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { updateDemoAccessInternalNote } from '@/src/lib/demo-access'

type PatchPayload = {
  internalNote?: string
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

export async function PATCH(request: NextRequest, context: RouteContext<'/api/admin/demo-access/[id]'>) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const body = (await request.json().catch(() => null)) as PatchPayload | null

    const resolvedRequestId = await updateDemoAccessInternalNote({
      requestId: id,
      internalNote: normalizeText(body?.internalNote),
    })

    return NextResponse.json({ success: true, requestId: resolvedRequestId })
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_NOT_FOUND') {
      return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
    }
    console.error('[ADMIN DEMO ACCESS] Patch error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
