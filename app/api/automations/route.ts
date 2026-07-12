import { NextRequest, NextResponse } from 'next/server'
import { listAutomationOverviewForCurrentTenant, upsertAutomationForCurrentTenant, type BusinessAutomationChannel, type BusinessAutomationMode, type BusinessAutomationType } from '@/src/lib/automations'

export async function GET() {
  try {
    const items = await listAutomationOverviewForCurrentTenant()
    return NextResponse.json({ success: true, items })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status =
      message === 'TENANT_CONTEXT_REQUIRED' ? 401 :
      message === 'FORBIDDEN' ? 403 :
      message === 'AUTOMATIONS_TABLE_MISSING' ? 503 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const automation = await upsertAutomationForCurrentTenant({
      type: String(body.type) as BusinessAutomationType,
      enabled: Boolean(body.enabled),
      mode: String(body.mode || 'approval_required') as BusinessAutomationMode,
      delayValue: body.delayValue === null || body.delayValue === undefined ? null : Number(body.delayValue),
      delayUnit: body.delayUnit === 'hours' || body.delayUnit === 'days' ? body.delayUnit : null,
      channel: body.channel === 'email' || body.channel === 'internal' ? (body.channel as BusinessAutomationChannel) : null,
    })
    return NextResponse.json({ success: true, automation })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status =
      message === 'TENANT_CONTEXT_REQUIRED' ? 401 :
      message === 'FORBIDDEN' ? 403 :
      message === 'AUTOMATIONS_TABLE_MISSING' ? 503 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
