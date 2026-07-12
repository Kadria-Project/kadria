import { NextRequest, NextResponse } from 'next/server'
import { listAutomationOverviewForCurrentTenant, upsertAutomationForCurrentTenant, type BusinessAutomationChannel, type BusinessAutomationMode, type BusinessAutomationType } from '@/src/lib/automations'
import { getSession } from '@/src/lib/auth-utils'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { checkPermission } from '@/src/lib/team/access'

export async function GET() {
  try {
    const session = await getSession().catch(() => null)
    const tenantContext = await getCurrentTenantContext().catch(() => null)
    const canRead = tenantContext ? checkPermission(tenantContext, 'automations.read') : false
    const canManage = tenantContext ? checkPermission(tenantContext, 'automations.manage') : false

    console.info('[AUTOMATIONS GET]', {
      sessionUserId: session?.id || null,
      sessionEmail: session?.email || null,
      tenantContext: tenantContext
        ? {
            tenantId: tenantContext.tenantId,
            role: tenantContext.role,
            membershipStatus: tenantContext.membership.status,
            userId: tenantContext.userId,
            legacyArtisanId: tenantContext.legacyArtisanId,
            tenantName: tenantContext.tenant.name,
          }
        : null,
      tenantContextRole: tenantContext?.role || null,
      tenantContextMembershipStatus: tenantContext?.membership.status || null,
      tenantContextTenantId: tenantContext?.tenantId || null,
      automationsRead: canRead,
      automationsManage: canManage,
    })

    const items = await listAutomationOverviewForCurrentTenant(tenantContext)
    return NextResponse.json({ success: true, items })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status =
      message === 'TENANT_CONTEXT_REQUIRED' ? 401 :
      message === 'FORBIDDEN' ? 403 :
      message === 'AUTOMATIONS_TABLE_MISSING' ? 503 : 500
    console.error('[AUTOMATIONS GET ERROR]', {
      status,
      message,
    })
    return NextResponse.json({ success: false, error: message }, { status })
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
