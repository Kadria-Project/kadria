import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { listDemoAccessRequests } from '@/src/lib/demo-access'

export async function GET(request: NextRequest) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const status = request.nextUrl.searchParams.get('status') || ''
    const search = request.nextUrl.searchParams.get('search') || ''
    const rows = await listDemoAccessRequests({ status, search })
    return NextResponse.json(rows)
  } catch (error) {
    console.error('[ADMIN DEMO ACCESS] List error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
