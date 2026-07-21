import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSession } from '@/src/lib/auth-utils'
import { canEditAppointment } from '@/src/lib/appointments/access'
import { getArtisanConfig } from '@/src/lib/airtable'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { isConfirmationStatus, type AppointmentConfirmationStatus } from '@/src/lib/appointment-confirmation'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'

type ConfirmationSendStage =
  | 'authenticate'
  | 'load_appointment'
  | 'load_project'
  | 'prepare_portal'
  | 'load_artisan'
  | 'save_status'
  | 'send_email'

type ErrorLike = {
  code?: unknown
  message?: unknown
  details?: unknown
  hint?: unknown
  statusCode?: unknown
  status?: unknown
  name?: unknown
}

function cleanMessage(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 1200) : ''
}

function isEmail(value: string | null) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
}

function safeErrorDetails(error: unknown) {
  const source = (typeof error === 'object' && error !== null ? error : {}) as ErrorLike
  const read = (value: unknown) => typeof value === 'string' && value.trim() ? value.slice(0, 500) : null

  return {
    errorName: error instanceof Error ? error.name : read(source.name) || 'UnknownError',
    errorMessage: error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : read(source.message) || 'Unknown object error',
    code: read(source.code),
    statusCode: typeof source.statusCode === 'number' ? source.statusCode : typeof source.status === 'number' ? source.status : null,
    details: read(source.details),
    hint: read(source.hint),
    stack: error instanceof Error ? error.stack : undefined,
  }
}

function logFailure(input: {
  stage: ConfirmationSendStage
  appointmentId: string | null
  projectId: string | null
  tenantId: string | null
  status: string | null
  error: unknown
}) {
  console.error('[APPOINTMENT][CONFIRMATION_EMAIL_ERROR]', {
    stage: input.stage,
    appointmentId: input.appointmentId,
    projectId: input.projectId,
    tenantId: input.tenantId,
    confirmationStatus: input.status,
    ...safeErrorDetails(input.error),
  })
}

function failure(
  status: number,
  errorCode: string,
  error: string,
  state: { statusSaved?: boolean; emailSent?: boolean } = {},
) {
  return NextResponse.json({
    success: false,
    statusSaved: state.statusSaved ?? false,
    emailSent: state.emailSent ?? false,
    errorCode,
    error,
  }, { status })
}

function emailMeta(status: AppointmentConfirmationStatus, companyName: string) {
  if (status === 'pending') return { subject: `Rendez-vous à confirmer avec ${companyName}`, cta: 'Confirmer ou répondre' }
  if (status === 'change_requested') return { subject: 'Modification demandée pour votre rendez-vous', cta: 'Consulter la demande' }
  if (status === 'cancelled') return { subject: `Annulation de votre rendez-vous avec ${companyName}`, cta: 'Accéder à mon espace client' }
  return { subject: `Confirmation de votre rendez-vous avec ${companyName}`, cta: 'Consulter mon rendez-vous' }
}

function getSender() {
  const from = process.env.RESEND_FROM_EMAIL?.trim() || 'Kadria <devis@kadria.fr>'
  const match = from.match(/<([^>]+)>$/)
  return { from, email: (match ? match[1] : from).trim() }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let stage: ConfirmationSendStage = 'authenticate'
  let appointmentId: string | null = null
  let projectId: string | null = null
  let tenantId: string | null = null
  let confirmationStatus: AppointmentConfirmationStatus | null = null
  let statusSaved = false

  try {
    if (!await getSession()) {
      return failure(401, 'AUTHENTICATION_REQUIRED', 'Votre session a expiré. Reconnectez-vous.')
    }

    const tenant = await getCurrentTenantContext()
    if (!tenant) return failure(403, 'FORBIDDEN', 'Vous n’avez pas accès à cette action.')
    tenantId = tenant.tenantId
    appointmentId = (await context.params).id

    const body = await request.json().catch(() => null)
    const message = cleanMessage(body?.message)
    if (!body || !isConfirmationStatus(body.status) || !message) {
      return failure(400, 'INVALID_CONFIRMATION_PAYLOAD', 'Vérifiez le statut et le contenu de l’email.')
    }
    const requestedStatus = body.status
    confirmationStatus = requestedStatus

    stage = 'load_appointment'
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('project_appointments')
      .select('id, tenant_id, artisan_id, project_id, assigned_user_id, client_email, confirmation_version')
      .eq('id', appointmentId)
      .maybeSingle()
    if (appointmentError) throw appointmentError
    if (!appointment || appointment.tenant_id !== tenant.tenantId) {
      return failure(404, 'APPOINTMENT_NOT_FOUND', 'Ce rendez-vous n’est plus disponible.')
    }
    if (!canEditAppointment(tenant, appointment.assigned_user_id ? String(appointment.assigned_user_id) : null)) {
      return failure(403, 'FORBIDDEN', 'Vous n’avez pas accès à cette action.')
    }
    let project: { id: string; tenant_id: string; artisan_id: string | null; client_email: string | null } | null = null
    if (appointment.project_id) {
      stage = 'load_project'
      const { data, error: projectError } = await supabaseAdmin
        .from('Projects')
        .select('id, tenant_id, artisan_id, client_email')
        .eq('id', appointment.project_id)
        .maybeSingle()
      if (projectError) throw projectError
      if (!data || data.tenant_id !== tenant.tenantId) return failure(404, 'PROJECT_NOT_FOUND', 'Le dossier associé n’est plus disponible.')
      project = data
      projectId = String(data.id)
    }
    const localEmail = appointment.client_email ? String(appointment.client_email).trim().toLowerCase() : null
    const recipientEmail = localEmail || (project?.client_email ? String(project.client_email).trim().toLowerCase() : null)
    if (!isEmail(recipientEmail)) return failure(400, 'EMAIL_RECIPIENT_INVALID', 'Ajoutez une adresse e-mail pour préparer la confirmation.')

    const artisanId = String(appointment.artisan_id || project?.artisan_id || tenant.legacyArtisanId || '')
    const portalUrl = projectId ? await import('@/src/lib/client-portal').then(({ getClientPortalUrl }) => getClientPortalUrl(projectId as string, artisanId)) : null

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return failure(503, 'RESEND_NOT_CONFIGURED', 'L’envoi d’email n’est pas disponible pour le moment.')
    const sender = getSender()
    if (!isEmail(sender.email)) return failure(503, 'SENDER_EMAIL_INVALID', 'L’envoi d’email n’est pas disponible pour le moment.')

    stage = 'load_artisan'
    const config = await getArtisanConfig(artisanId)
    const companyName = config?.companyName || 'Kadria'
    const meta = emailMeta(requestedStatus, companyName)
    const emailPayload = {
      preheader: meta.subject,
      title: meta.subject,
      intro: message,
      ...(portalUrl ? { ctaLabel: meta.cta, ctaUrl: portalUrl, secondaryText: `Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :\n${portalUrl}` } : {}),
      artisanName: companyName,
    }
    const text = renderBaseEmailText(emailPayload)
    const html = renderBaseEmail(emailPayload)

    stage = 'save_status'
    const { error: confirmationError } = await supabaseAdmin.rpc('confirm_project_appointment', {
      p_appointment_id: appointmentId,
      p_tenant_id: tenant.tenantId,
      p_status: requestedStatus,
      p_source: 'artisan',
      p_note: null,
      p_expected_version: Number.isInteger(body.expectedVersion) ? body.expectedVersion : Number(appointment.confirmation_version || 0),
      p_request_id: typeof body.requestId === 'string' ? body.requestId.slice(0, 120) : null,
      p_actor_user_id: tenant.userId,
    })
    if (confirmationError) {
      const message = confirmationError.message || ''
      if (/CONFIRMATION_VERSION_CONFLICT/.test(message)) {
        return failure(409, 'VERSION_CONFLICT', 'Cette confirmation a été modifiée. Rechargez le rendez-vous avant de continuer.')
      }
      if (/APPOINTMENT_NOT_FOUND/.test(message)) {
        return failure(404, 'APPOINTMENT_NOT_FOUND', 'Ce rendez-vous n’est plus disponible.')
      }
      throw confirmationError
    }
    statusSaved = true

    stage = 'send_email'
    const result = await new Resend(apiKey).emails.send({
      from: sender.from,
      to: recipientEmail as string,
      subject: meta.subject,
      text,
      html,
    })
    if (result.error || !result.data?.id) {
      const resendError = result.error || new Error('Resend did not return an email identifier')
      logFailure({ stage, appointmentId, projectId, tenantId, status: confirmationStatus, error: resendError })
      return failure(502, 'EMAIL_SEND_FAILED', 'Le statut a été enregistré, mais l’email n’a pas pu être envoyé.', { statusSaved: true })
    }

    console.info('[APPOINTMENT][CONFIRMATION_EMAIL_SENT]', {
      appointmentId,
      projectId,
      tenantId,
      confirmationStatus,
      resendEmailId: result.data.id,
    })
    return NextResponse.json({ success: true, statusSaved: true, emailSent: true })
  } catch (error) {
    logFailure({ stage, appointmentId, projectId, tenantId, status: confirmationStatus, error })
    const emailFailedAfterStatusSave = statusSaved && stage === 'send_email'
    return failure(
      emailFailedAfterStatusSave ? 502 : 500,
      emailFailedAfterStatusSave ? 'EMAIL_SEND_FAILED' : 'APPOINTMENT_CONFIRMATION_FAILED',
      emailFailedAfterStatusSave
        ? 'Le statut a été enregistré, mais l’email n’a pas pu être envoyé.'
        : 'Kadria n’a pas pu terminer cette action.',
      { statusSaved, emailSent: false },
    )
  }
}
