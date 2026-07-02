import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { TABLES } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { mapSupabaseProject } from '@/src/lib/supabase/mapping'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { sendOvhSms } from '@/src/lib/sms/ovh-sms'
import { getBaseUrl } from '@/src/lib/base-url'

function isTruthyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function getProjectById(id: string, artisanId: string) {
  return supabaseAdmin
    .from(TABLES.projects)
    .select('*')
    .eq('id', id)
    .eq('artisan_id', artisanId)
    .limit(1)
    .maybeSingle()
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
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const { data: project, error: projectError } = await getProjectById(id, session.artisanId)

    if (projectError) {
      throw projectError
    }

    if (!project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

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
      .eq('id', project.id)
      .eq('artisan_id', session.artisanId)

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
      .eq('id', project.id)
      .eq('artisan_id', session.artisanId)
      .select('*')
      .single()

    if (updateError) {
      throw updateError
    }

    await createActivityLog(
      project.id,
      smsResult.success ? 'SMS_COMPLETION_SENT' : 'SMS_COMPLETION_FAILED',
      smsResult.success
        ? 'Lien de complément SMS envoyé au client.'
        : `Échec de l'envoi du lien de complément SMS.${smsResult.error ? ` Motif : ${smsResult.error}` : ''}`,
    )

    return NextResponse.json({
      success: smsResult.success,
      error: smsResult.success ? null : (smsResult.error || 'Erreur inconnue'),
      message: smsResult.success ? 'SMS de complément envoyé.' : "Échec de l'envoi du SMS de complément.",
      project: mapSupabaseProject(updatedProject),
    }, { status: smsResult.success ? 200 : 502 })
  } catch (error) {
    console.error('[PROJECT SMS COMPLETION] Unexpected error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
