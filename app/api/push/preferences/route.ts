import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'

const defaults = {
  new_appointment_enabled: true,
  appointment_reminder_enabled: true,
  appointment_changed_enabled: true,
  appointment_cancelled_enabled: true,
  appointment_qualification_enabled: false,
  reminder_minutes_before: 60,
}

async function getIdentity() {
  const session = await getSession()
  const tenant = await getCurrentTenantContext()
  return session && tenant ? { session, tenant } : null
}

export async function GET() {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ success: false, error: 'Reconnexion nécessaire.' }, { status: 401 })
  const { tenant } = identity
  const { data, error } = await supabaseAdmin.from('push_notification_preferences').select('*').eq('tenant_id', tenant.tenantId).eq('user_id', tenant.userId).maybeSingle()
  if (error) return NextResponse.json({ success: false, error: 'Impossible de charger vos préférences.' }, { status: 500 })
  return NextResponse.json({ success: true, preferences: data || defaults })
}

export async function PATCH(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ success: false, error: 'Origine non autorisée.' }, { status: 403 })
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ success: false, error: 'Reconnexion nécessaire.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ success: false, error: 'Préférences invalides.' }, { status: 400 })
  const patch = body as Record<string, unknown>
  const allowed = Object.keys(defaults).filter((key) => key !== 'reminder_minutes_before')
  const updates = Object.fromEntries(allowed.filter((key) => typeof patch[key] === 'boolean').map((key) => [key, patch[key]]))
  if (!Object.keys(updates).length) return NextResponse.json({ success: false, error: 'Aucune préférence à enregistrer.' }, { status: 400 })

  const { tenant } = identity
  const { error } = await supabaseAdmin.from('push_notification_preferences').upsert({
    ...defaults,
    ...updates,
    tenant_id: tenant.tenantId,
    artisan_id: tenant.legacyArtisanId || identity.session.artisanId,
    user_id: tenant.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,user_id' })
  if (error) return NextResponse.json({ success: false, error: 'Impossible d’enregistrer vos préférences.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
