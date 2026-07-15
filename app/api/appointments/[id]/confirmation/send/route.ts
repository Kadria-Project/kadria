import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSession } from '@/src/lib/auth-utils'
import { canEditAppointment } from '@/src/lib/appointments/access'
import { getArtisanConfig } from '@/src/lib/airtable'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { sendOvhSms } from '@/src/lib/sms/ovh-sms'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'

function cleanMessage(value: unknown) { return typeof value === 'string' ? value.trim().slice(0, 1200) : '' }

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!await getSession()) return NextResponse.json({ success: false, error: 'Votre session a expiré. Reconnectez-vous.' }, { status: 401 })
    const tenant = await getCurrentTenantContext()
    if (!tenant) return NextResponse.json({ success: false, error: "Vous n’avez pas accès à cette action." }, { status: 403 })
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const channel = body?.channel === 'email' ? 'email' : body?.channel === 'sms' ? 'sms' : null
    const message = cleanMessage(body?.message)
    if (!channel || !message) return NextResponse.json({ success: false, error: 'Choisissez un destinataire et rédigez un message.' }, { status: 400 })
    const { data: appointment, error: appointmentError } = await supabaseAdmin.from('project_appointments').select('id, tenant_id, project_id, assigned_user_id, client_name, client_phone, title, start_time, confirmation_version').eq('id', id).maybeSingle()
    if (appointmentError) throw appointmentError
    if (!appointment || appointment.tenant_id !== tenant.tenantId) return NextResponse.json({ success: false, error: 'Ce rendez-vous n’est plus disponible.' }, { status: 404 })
    if (!canEditAppointment(tenant, appointment.assigned_user_id ? String(appointment.assigned_user_id) : null)) return NextResponse.json({ success: false, error: "Vous n’avez pas accès à cette action." }, { status: 403 })
    let email: string | null = null
    if (appointment.project_id) {
      const { data: project } = await supabaseAdmin.from('Projects').select('client_email').eq('id', appointment.project_id).maybeSingle()
      email = project?.client_email ? String(project.client_email) : null
    }
    if (channel === 'sms' && !appointment.client_phone) return NextResponse.json({ success: false, error: 'Le numéro du client est manquant.' }, { status: 400 })
    if (channel === 'email' && !email) return NextResponse.json({ success: false, error: 'L’adresse email du client est manquante.' }, { status: 400 })
    if (channel === 'sms') {
      const result = await sendOvhSms({ to: String(appointment.client_phone), message })
      if (!result.success) return NextResponse.json({ success: false, error: 'Kadria n’a pas pu envoyer le SMS. Réessayez dans un instant.' }, { status: 502 })
    } else {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) return NextResponse.json({ success: false, error: 'L’envoi d’email n’est pas disponible pour le moment.' }, { status: 503 })
      const config = await getArtisanConfig(tenant.legacyArtisanId || '')
      const companyName = config?.companyName || 'Kadria'
      const emailPayload = { title: 'Confirmation de rendez-vous', intro: message, artisanName: companyName }
      const result = await new Resend(apiKey).emails.send({ from: process.env.RESEND_FROM_EMAIL || 'Kadria <noreply@kadria.fr>', to: email as string, subject: `Confirmation de rendez-vous - ${companyName}`, text: renderBaseEmailText(emailPayload), html: renderBaseEmail(emailPayload) })
      if (result.error) return NextResponse.json({ success: false, error: 'Kadria n’a pas pu envoyer l’email. Réessayez dans un instant.' }, { status: 502 })
    }
    const { data, error } = await supabaseAdmin.rpc('confirm_project_appointment', { p_appointment_id: id, p_tenant_id: tenant.tenantId, p_status: 'confirmed', p_source: 'artisan', p_note: `Confirmation envoyée par ${channel === 'sms' ? 'SMS' : 'email'}.`, p_expected_version: Number(appointment.confirmation_version || 0), p_request_id: typeof body?.requestId === 'string' ? body.requestId.slice(0, 120) : null, p_actor_user_id: tenant.userId })
    if (error) throw error
    return NextResponse.json({ success: true, result: data })
  } catch (error) {
    console.error('[APPOINTMENT CONFIRMATION SEND]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Kadria n’a pas pu terminer cette action. Réessayez dans un instant.' }, { status: 500 })
  }
}
