import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { listUnknownTrades } from '@/src/lib/unknown-trades'

export async function GET() {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { rows, tableMissing } = await listUnknownTrades()
  if (tableMissing) {
    return NextResponse.json({ success: true, trades: [] })
  }

  return NextResponse.json({ success: true, trades: rows })
}
