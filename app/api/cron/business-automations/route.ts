import { NextRequest, NextResponse } from 'next/server'
import { processBusinessAutomationsCron } from '@/src/lib/automations'

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return { ok: false, error: 'CRON_SECRET manquant', status: 500 }
  }
  const provided = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (provided !== secret) {
    return { ok: false, error: 'Non autorise', status: 403 }
  }
  return { ok: true, status: 200 }
}

export async function POST(request: NextRequest) {
  const auth = isAuthorized(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const result = await processBusinessAutomationsCron()
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
