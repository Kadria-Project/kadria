import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { supabaseAdmin } from '@/src/lib/supabase/server'
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ success: false, error: 'Origine non autorisée.' }, { status: 403 })
  const session = await getSession()
  const tenant = await getCurrentTenantContext()
  const body = await request.json().catch(() => null)
  if (!session || !tenant) return NextResponse.json({ success: false, error: 'Reconnexion nécessaire.' }, { status: 401 })
  if (!body?.endpoint || typeof body.endpoint !== 'string') return NextResponse.json({ success: false, error: 'Appareil invalide.' }, { status: 400 })
  await supabaseAdmin.from('push_subscriptions').update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('tenant_id', tenant.tenantId).eq('user_id', tenant.userId).eq('endpoint', body.endpoint)
  return NextResponse.json({ success: true })
}
