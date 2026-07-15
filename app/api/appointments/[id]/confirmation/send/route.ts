import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSession } from '@/src/lib/auth-utils'
import { canEditAppointment } from '@/src/lib/appointments/access'
import { getArtisanConfig } from '@/src/lib/airtable'
import { getClientPortalUrl } from '@/src/lib/client-portal'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { isConfirmationStatus, type AppointmentConfirmationStatus } from '@/src/lib/appointment-confirmation'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'

function cleanMessage(value: unknown) { return typeof value === 'string' ? value.trim().slice(0, 1200) : '' }
function isEmail(value: string | null) { return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) }
function emailMeta(status: AppointmentConfirmationStatus, companyName: string) {
  if (status === 'pending') return { subject: `Rendez-vous à confirmer avec ${companyName}`, cta: 'Confirmer ou répondre' }
  if (status === 'change_requested') return { subject: 'Modification demandée pour votre rendez-vous', cta: 'Consulter la demande' }
  if (status === 'cancelled') return { subject: `Annulation de votre rendez-vous avec ${companyName}`, cta: 'Accéder à mon espace client' }
  return { subject: `Confirmation de votre rendez-vous avec ${companyName}`, cta: 'Consulter mon rendez-vous' }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!await getSession()) return NextResponse.json({ success: false, error: 'Votre session a expiré. Reconnectez-vous.' }, { status: 401 })
    const tenant = await getCurrentTenantContext()
    if (!tenant) return NextResponse.json({ success: false, error: "Vous n’avez pas accès à cette action." }, { status: 403 })
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const message = cleanMessage(body?.message)
    if (!body || !isConfirmationStatus(body.status) || !message) return NextResponse.json({ success: false, error: 'Vérifiez le statut et le contenu de l’email.' }, { status: 400 })
    const { data: appointment, error: appointmentError } = await supabaseAdmin.from('project_appointments').select('id, tenant_id, artisan_id, project_id, assigned_user_id, confirmation_version').eq('id', id).maybeSingle()
    if (appointmentError) throw appointmentError
    if (!appointment || appointment.tenant_id !== tenant.tenantId) return NextResponse.json({ success: false, error: 'Ce rendez-vous n’est plus disponible.' }, { status: 404 })
    if (!canEditAppointment(tenant, appointment.assigned_user_id ? String(appointment.assigned_user_id) : null)) return NextResponse.json({ success: false, error: "Vous n’avez pas accès à cette action." }, { status: 403 })
    if (!appointment.project_id) return NextResponse.json({ success: false, error: 'Ce rendez-vous n’est pas lié à un dossier client. Enregistrez le statut sans envoi.' }, { status: 400 })
    const { data: project, error: projectError } = await supabaseAdmin.from('Projects').select('id, tenant_id, artisan_id, client_email').eq('id', appointment.project_id).maybeSingle()
    if (projectError) throw projectError
    if (!project || project.tenant_id !== tenant.tenantId || !isEmail(project.client_email ? String(project.client_email).trim().toLowerCase() : null)) return NextResponse.json({ success: false, error: 'Aucun email client valide n’est renseigné pour ce rendez-vous. Ajoutez une adresse email au dossier avant l’envoi.' }, { status: 400 })
    const artisanId = String(appointment.artisan_id || project.artisan_id || tenant.legacyArtisanId || '')
    const portalUrl = await getClientPortalUrl(String(project.id), artisanId)
    if (!portalUrl) return NextResponse.json({ success: false, error: 'Le portail client ne peut pas être préparé. Enregistrez le statut sans envoi.' }, { status: 409 })
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ success: false, error: 'L’envoi d’email n’est pas disponible pour le moment.' }, { status: 503 })
    const config = await getArtisanConfig(artisanId)
    const companyName = config?.companyName || config?.raisonSociale || 'Kadria'
    const meta = emailMeta(body.status, companyName)
    const emailPayload = { preheader: meta.subject, title: meta.subject, intro: message, ctaLabel: meta.cta, ctaUrl: portalUrl, secondaryText: `Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :\n${portalUrl}`, artisanName: companyName }
    const result = await new Resend(apiKey).emails.send({ from: process.env.RESEND_FROM_EMAIL || 'Kadria <noreply@kadria.fr>', to: String(project.client_email).trim().toLowerCase(), subject: meta.subject, text: renderBaseEmailText(emailPayload), html: renderBaseEmail(emailPayload) })
    if (result.error) { console.error('[APPOINTMENT][STATUS_EMAIL_ERROR]', { appointmentId: id, projectId: project.id, tenantId: tenant.tenantId, status: body.status }); return NextResponse.json({ success: false, error: 'Le statut n’a pas été enregistré car l’email n’a pas pu être envoyé. Réessayez dans un instant.' }, { status: 502 }) }
    const { data, error } = await supabaseAdmin.rpc('confirm_project_appointment', { p_appointment_id: id, p_tenant_id: tenant.tenantId, p_status: body.status, p_source: 'artisan', p_note: `Email envoyé pour le statut : ${body.status}.`, p_expected_version: Number.isInteger(body.expectedVersion) ? body.expectedVersion : Number(appointment.confirmation_version || 0), p_request_id: typeof body.requestId === 'string' ? body.requestId.slice(0, 120) : null, p_actor_user_id: tenant.userId })
    if (error) throw error
    console.info('[APPOINTMENT][STATUS_EMAIL_SENT]', { appointmentId: id, projectId: project.id, tenantId: tenant.tenantId, status: body.status })
    return NextResponse.json({ success: true, result: data })
  } catch (error) {
    console.error('[APPOINTMENT][STATUS_EMAIL_ERROR]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Kadria n’a pas pu terminer cette action. Réessayez dans un instant.' }, { status: 500 })
  }
}
