import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { TABLES } from '@/src/lib/airtable'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { sendOvhSms } from '@/src/lib/sms/ovh-sms'
import { getBaseUrl } from '@/src/lib/base-url'
import { PermissionError } from '@/src/lib/team/access'

function isTruthyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

async function createActivityLog(projectId: string, action: string, description: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action,
    description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[PROJECT SMS COMPLETION] Activity insert error:', error.message)
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authResult = await authorizeProjectAccess({
      projectId: id,
      requiredPermission: 'projects.update',
      allowAppointmentAccess: true,
      select: 'id, client_phone',
    })

    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    const project = authResult.project
    const clientPhone = isTruthyText(project.client_phone) ? project.client_phone.trim() : ''
    if (!clientPhone) {
      return NextResponse.json({ success: false, error: 'Numéro client manquant' }, { status: 400 })
    }

    const token = randomBytes(24).toString('hex')
    const completionUrl = `${getBaseUrl()}/completer/${token}`

    const { error: prepareError } = await supabaseAdmin
      .from(TABLES.projects)
      .update({
        sms_completion_token: token,
        sms_completion_url: completionUrl,
        sms_status: 'pending',
        sms_last_error: null,
        completion_source: 'sms_after_vapi',
      })
      .eq('id', authResult.projectId)

    if (prepareError) {
      throw prepareError
    }

    const message = `Kadria - Merci pour votre appel. Complétez votre demande ici : ${completionUrl}`
    const smsResult = await sendOvhSms({ to: clientPhone, message })

    const updatePayload = smsResult.success
      ? {
          sms_completion_token: token,
          sms_completion_url: completionUrl,
          sms_sent_at: new Date().toISOString(),
          sms_status: 'sent',
          sms_last_error: null,
          completion_source: 'sms_after_vapi',
        }
      : {
          sms_completion_token: token,
          sms_completion_url: completionUrl,
          sms_status: 'failed',
          sms_last_error: smsResult.error || 'Erreur inconnue',
          completion_source: 'sms_after_vapi',
        }

    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from(TABLES.projects)
      .update(updatePayload)
      .eq('id', authResult.projectId)
      .select('id, sms_status, sms_sent_at')
      .single()

    if (updateError) {
      throw updateError
    }

    await createActivityLog(
      authResult.projectId,
      smsResult.success ? 'SMS_COMPLETION_SENT' : 'SMS_COMPLETION_FAILED',
      smsResult.success
        ? 'Lien de complément SMS envoyé au client.'
        : `Échec de l'envoi du lien de complément SMS.${smsResult.error ? ` Motif : ${smsResult.error}` : ''}`,
    )

    return NextResponse.json({
      success: smsResult.success,
      error: smsResult.success ? null : (smsResult.error || 'Erreur inconnue'),
      message: smsResult.success ? 'SMS de complément envoyé.' : "Échec de l'envoi du SMS de complément.",
      smsStatus: updatedProject.sms_status,
      sentAt: updatedProject.sms_sent_at,
    }, { status: smsResult.success ? 200 : 502 })
  } catch (error) {
    const permissionError = error as PermissionError
    if (permissionError?.status) {
      return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status })
    }

    console.error('[PROJECT SMS COMPLETION] Unexpected error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
