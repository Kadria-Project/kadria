import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'

export async function GET() {
  const session = await getSession()
  const tenant = await getCurrentTenantContext()
  if (!session || !tenant) return NextResponse.json({ success: false, error: 'Reconnexion nécessaire.' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_agent, device_label, platform, created_at, last_success_at, revoked_at')
    .eq('tenant_id', tenant.tenantId)
    .eq('user_id', tenant.userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ success: false, error: 'Impossible de charger vos appareils.' }, { status: 500 })
  return NextResponse.json({ success: true, devices: data || [] })
}
