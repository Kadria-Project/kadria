import { NextRequest, NextResponse } from 'next/server'
import { setAutomationPauseStateForCurrentTenant } from '@/src/lib/automations'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const state = await setAutomationPauseStateForCurrentTenant({
      paused: Boolean(body.paused),
      reason: typeof body.reason === 'string' ? body.reason : null,
    })

    return NextResponse.json({ success: true, systemState: state })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status =
      message === 'TENANT_CONTEXT_REQUIRED' ? 401 :
      message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
