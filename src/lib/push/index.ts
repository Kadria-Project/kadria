import 'server-only'

import webpush from 'web-push'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export const PUSH_TYPES = ['appointment_created', 'appointment_assigned', 'appointment_updated', 'appointment_cancelled', 'appointment_reminder'] as const
export type PushType = (typeof PUSH_TYPES)[number]

type SubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } }

export type PushAppointment = {
  id: string
  tenantId: string
  artisanId: string
  assignedUserId: string | null
  projectId: string | null
  title: string | null
  clientName: string | null
  start: string | null
  end: string | null
  eventVersion?: string | null
}

function configured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

export function validateSubscription(value: unknown): SubscriptionInput | null {
  if (!value || typeof value !== 'object') return null
  const item = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  const endpoint = typeof item.endpoint === 'string' ? item.endpoint.trim() : ''
  const p256dh = typeof item.keys?.p256dh === 'string' ? item.keys.p256dh : ''
  const auth = typeof item.keys?.auth === 'string' ? item.keys.auth : ''
  return endpoint.startsWith('https://') && p256dh && auth ? { endpoint, keys: { p256dh, auth } } : null
}

function preferenceKeyFor(type: PushType) {
  if (type === 'appointment_created' || type === 'appointment_assigned') return 'new_appointment_enabled'
  if (type === 'appointment_updated') return 'appointment_changed_enabled'
  if (type === 'appointment_cancelled') return 'appointment_cancelled_enabled'
  return 'appointment_reminder_enabled'
}

function buildAppointmentMessage(appointment: PushAppointment, type: PushType) {
  const label = appointment.clientName || appointment.title || 'Un rendez-vous'
  if (type === 'appointment_reminder') return { title: 'Rendez-vous dans 1 heure', body: `${label} commence dans 1 heure.` }
  if (type === 'appointment_cancelled') return { title: 'Rendez-vous annulé', body: `${label} a été retiré du planning.` }
  if (type === 'appointment_updated') return { title: 'Rendez-vous modifié', body: `${label} a été mis à jour dans votre planning.` }
  if (type === 'appointment_assigned') return { title: 'Nouveau rendez-vous', body: `${label} vous a été confié.` }
  return { title: 'Nouveau rendez-vous', body: `${label} est prévu dans votre planning.` }
}

export async function sendAppointmentPush(appointment: PushAppointment, type: PushType, actorUserId?: string | null) {
  if (!configured()) return

  const recipientId = appointment.assignedUserId || actorUserId
  if (!recipientId || (type === 'appointment_created' && recipientId === actorUserId)) return

  const { data: preferences } = await supabaseAdmin
    .from('push_notification_preferences')
    .select('*')
    .eq('tenant_id', appointment.tenantId)
    .eq('user_id', recipientId)
    .maybeSingle()
  if (preferences && preferences[preferenceKeyFor(type)] === false) return

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('tenant_id', appointment.tenantId)
    .eq('user_id', recipientId)
    .is('revoked_at', null)
  const { title, body } = buildAppointmentMessage(appointment, type)

  await Promise.all((subscriptions || []).map(async (subscription) => {
    // The event timestamp makes a rescheduled reminder a new, valid delivery.
    const version = type === 'appointment_reminder' ? appointment.start || 'none' : appointment.eventVersion || appointment.start || 'none'
    const dedupeKey = [type, appointment.id, version, recipientId, subscription.id].join(':')
    const { error } = await supabaseAdmin.from('push_notification_deliveries').insert({
      tenant_id: appointment.tenantId,
      artisan_id: appointment.artisanId,
      user_id: recipientId,
      subscription_id: subscription.id,
      appointment_id: appointment.id,
      notification_type: type,
      dedupe_key: dedupeKey,
      title,
    })
    if (error) return

    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify({
          title,
          body,
          tag: `kadria-${type}-${appointment.id}`,
          url: `/dashboard-v2?workspace=calendar&appointment=${encodeURIComponent(appointment.id)}`,
        }),
      )
      const sentAt = new Date().toISOString()
      await Promise.all([
        supabaseAdmin.from('push_notification_deliveries').update({ status: 'sent', sent_at: sentAt }).eq('dedupe_key', dedupeKey),
        supabaseAdmin.from('push_subscriptions').update({ last_success_at: sentAt, last_used_at: sentAt, failure_count: 0 }).eq('id', subscription.id),
      ])
    } catch (pushError) {
      const statusCode = (pushError as { statusCode?: number }).statusCode
      const failedAt = new Date().toISOString()
      await Promise.all([
        supabaseAdmin.from('push_notification_deliveries').update({ status: 'failed', failed_at: failedAt, failure_reason: `push_${statusCode || 'error'}` }).eq('dedupe_key', dedupeKey),
        supabaseAdmin.from('push_subscriptions').update({
          last_failure_at: failedAt,
          failure_count: 1,
          ...(statusCode === 404 || statusCode === 410 ? { revoked_at: failedAt } : {}),
        }).eq('id', subscription.id),
      ])
      console.warn('[PUSH][DELIVERY_FAILED]', { type, appointmentId: appointment.id, userId: recipientId, subscriptionId: subscription.id, statusCode: statusCode || null })
    }
  }))
}
