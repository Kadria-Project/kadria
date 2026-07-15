import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { validateSubscription } from '@/src/lib/push'
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ success: false, error: 'Origine non autorisée.' }, { status: 403 })
  const session = await getSession()
  const tenant = await getCurrentTenantContext()
  const subscription = validateSubscription(await request.json().catch(() => null))
  if (!session || !tenant) return NextResponse.json({ success: false, error: 'Reconnexion nécessaire.' }, { status: 401 })
  if (!subscription) return NextResponse.json({ success: false, error: 'Abonnement navigateur invalide.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('push_subscriptions').upsert({ tenant_id: tenant.tenantId, artisan_id: tenant.legacyArtisanId || session.artisanId, user_id: tenant.userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, user_agent: request.headers.get('user-agent'), revoked_at: null, last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'tenant_id,user_id,endpoint' })
  if (error) return NextResponse.json({ success: false, error: 'Impossible d’activer les notifications.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
