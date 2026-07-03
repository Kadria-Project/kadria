import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { getAdminMarginsData } from '@/src/lib/admin/margins'

export async function GET() {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const data = await getAdminMarginsData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[ADMIN MARGINS]', error)
    return NextResponse.json(
      { error: 'Erreur serveur', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
