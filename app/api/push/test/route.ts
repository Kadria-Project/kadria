import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ success: false, error: 'Origine non autorisée.' }, { status: 403 })
  const session = await getSession()
  const tenant = await getCurrentTenantContext()
  if (!session || !tenant) return NextResponse.json({ success: false, error: 'Reconnexion nécessaire.' }, { status: 401 })
  if (!configureVapid()) return NextResponse.json({ success: false, error: 'Les notifications ne sont pas encore configurées.' }, { status: 503 })
  const { data: subscriptions, error } = await supabaseAdmin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('tenant_id', tenant.tenantId).eq('user_id', tenant.userId).is('revoked_at', null).limit(5)
  if (error || !subscriptions?.length) return NextResponse.json({ success: false, error: 'Aucun appareil actif pour ce compte.' }, { status: 400 })
  const currentMinute = new Date().toISOString().slice(0, 16)
  await Promise.all(subscriptions.map(async (subscription) => {
    // One delivery per subscription and minute prevents this authenticated test from being spammed.
    const { error: deliveryError } = await supabaseAdmin.from('push_notification_deliveries').insert({
      tenant_id: tenant.tenantId,
      artisan_id: tenant.legacyArtisanId || session.artisanId,
      user_id: tenant.userId,
      subscription_id: subscription.id,
      notification_type: 'test',
      dedupe_key: `test:${tenant.userId}:${subscription.id}:${currentMinute}`,
      title: 'Notifications Kadria activées',
    })
    if (deliveryError) return
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: 'Notifications Kadria activées', body: 'Cet appareil recevra désormais vos rappels importants.', tag: `kadria-push-test-${subscription.id}`, url: '/parametres/notifications' }))
      await supabaseAdmin.from('push_notification_deliveries').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('dedupe_key', `test:${tenant.userId}:${subscription.id}:${currentMinute}`)
    } catch (pushError) {
      const statusCode = (pushError as { statusCode?: number }).statusCode
      await supabaseAdmin.from('push_notification_deliveries').update({ status: 'failed', failed_at: new Date().toISOString(), failure_reason: `push_${statusCode || 'error'}` }).eq('dedupe_key', `test:${tenant.userId}:${subscription.id}:${currentMinute}`)
      if (statusCode === 404 || statusCode === 410) await supabaseAdmin.from('push_subscriptions').update({ revoked_at: new Date().toISOString() }).eq('id', subscription.id)
    }
  }))
  return NextResponse.json({ success: true })
}
