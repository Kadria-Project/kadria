import { NextRequest, NextResponse } from 'next/server'
import {
  getAutomationSettingsCriticalDataForCurrentTenant,
  upsertAutomationForCurrentTenant,
  type BusinessAutomationChannel,
  type BusinessAutomationMode,
  type BusinessAutomationType,
} from '@/src/lib/automations'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { checkPermission } from '@/src/lib/team/access'

export async function GET() {
  const startedAt = Date.now()
  try {
    const tenantContext = await getCurrentTenantContext().catch(() => null)
    const canRead = tenantContext ? checkPermission(tenantContext, 'automations.read') : false
    const canManage = tenantContext ? checkPermission(tenantContext, 'automations.manage') : false

    const overview = await getAutomationSettingsCriticalDataForCurrentTenant(tenantContext)
    console.info('[SETTINGS_METRIC]', { page: 'automations', operation: 'critical-load', durationMs: Date.now() - startedAt, outcome: 'success' })
    return NextResponse.json({
      success: true,
      items: overview.items,
      systemState: overview.systemState,
      permissions: {
        canRead,
        canManage,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status =
      message === 'TENANT_CONTEXT_REQUIRED' ? 401 :
      message === 'FORBIDDEN' ? 403 :
      message === 'AUTOMATIONS_TABLE_MISSING' ? 503 : 500
    console.error('[SETTINGS_METRIC]', { page: 'automations', operation: 'critical-load', durationMs: Date.now() - startedAt, outcome: 'error', status, code: message })
    return NextResponse.json({ success: false, error: 'Chargement des automatisations impossible. Réessayez dans quelques instants.' }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const tenantContext = await getCurrentTenantContext()
    const automation = await upsertAutomationForCurrentTenant({
      type: String(body.type) as BusinessAutomationType,
      enabled: Boolean(body.enabled),
      mode: String(body.mode || 'approval_required') as BusinessAutomationMode,
      delayValue: body.delayValue === null || body.delayValue === undefined ? null : Number(body.delayValue),
      delayUnit: body.delayUnit === 'hours' || body.delayUnit === 'days' ? body.delayUnit : null,
      channel: body.channel === 'email' || body.channel === 'internal' ? (body.channel as BusinessAutomationChannel) : null,
    }, tenantContext)
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
