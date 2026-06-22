import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'
import { TABLES, getArtisanConfig, getDevisById, resolveProjectId, updateDevis } from '@/src/lib/airtable'
import { requireFeatureAccess } from '@/src/lib/auth-utils'
import { getPublicDevisUrl } from '@/src/lib/base-url'
import { generateQuoteFollowupEmailForStage, getQuoteFollowupState } from '@/src/lib/quote-followup'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function toHtml(text: string) {
  return text
    .split('\n\n')
    .map((paragraph) => `<p style="margin:0 0 14px;line-height:1.6;color:#374151;">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function isValidDevisToken(token: string | undefined): token is string {
  return !!token && !token.includes('undefined') && /^[0-9a-f-]{36}$/i.test(token)
}

async function createActivityLogSupabase(projectId: string, action: string, description: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action,
    description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[DEVIS FOLLOW-UP ACTIVITY] Insert error:', JSON.stringify(error, null, 2))
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireFeatureAccess('quoteGeneration')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const { id } = await params
    let devis = await getDevisById(id)
    if (!devis) {
      return NextResponse.json({ success: false, error: 'Devis introuvable' }, { status: 404 })
    }

    if (devis.artisanId !== access.session.artisanId) {
      return NextResponse.json({ success: false, error: 'Acces non autorise' }, { status: 403 })
    }

    const followupState = getQuoteFollowupState(devis)
    if (!followupState.canFollowUp) {
      return NextResponse.json({ success: false, error: followupState.reason }, { status: 400 })
    }

    if (!devis.clientEmail) {
      return NextResponse.json({ success: false, error: 'Email client manquant' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: false, error: 'Configuration e-mail manquante' }, { status: 500 })
    }

    const project = await resolveProjectId(devis.projectId)
    if (!project || project.artisanId !== access.session.artisanId) {
      return NextResponse.json({ success: false, error: 'Acces non autorise' }, { status: 403 })
    }

    if (!isValidDevisToken(devis.token)) {
      try {
        devis = await updateDevis(devis.id, { token: randomUUID() })
      } catch (error) {
        console.error('[DEVIS FOLLOW-UP] Token update failed:', error instanceof Error ? error.message : String(error))
        return NextResponse.json({ success: false, error: 'Invalid devis token' }, { status: 400 })
      }
    }

    if (!isValidDevisToken(devis.token)) {
      return NextResponse.json({ success: false, error: 'Invalid devis token' }, { status: 400 })
    }

    const { data: projectRow, error: projectError } = await supabaseAdmin
      .from(TABLES.projects)
      .select('client_first_name, project_type, trade')
      .eq('id', project.id)
      .limit(1)
      .maybeSingle()

    if (projectError) {
      throw projectError
    }

    const config = await getArtisanConfig(access.session.artisanId)
    const artisanName = config?.raisonSociale || config?.companyName || access.session.companyName || 'Votre artisan'
    const firstName =
      (projectRow?.client_first_name as string) ||
      devis.clientName.split(' ')[0] ||
      ''
    const projectType =
      (projectRow?.project_type as string) ||
      (projectRow?.trade as string) ||
      devis.objet ||
      'votre projet'

    const email = generateQuoteFollowupEmailForStage(followupState.stage, {
      firstName,
      quoteSentAt: devis.quoteSentAt || devis.dateEmission,
      projectType,
      artisanName,
    })
    const devisUrl = getPublicDevisUrl(devis.token)
    const resend = new Resend(process.env.RESEND_API_KEY)

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'devis@kadria.fr',
      to: devis.clientEmail,
      subject: email.subject,
      text: `${email.text}\n\nLien du devis : ${devisUrl}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:32px;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:32px;">
            ${toHtml(email.text)}
            <p style="margin:22px 0 0;">
              <a href="${devisUrl}" style="display:inline-block;background:#22c55e;color:#09090b;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 18px;">
                Voir le devis
              </a>
            </p>
          </div>
        </div>
      `,
      attachments: devis.pdfUrl
        ? [{ filename: `${devis.devisNumber}.pdf`, path: devis.pdfUrl }]
        : undefined,
      headers: {
        'X-Entity-Ref-ID': `follow-up-${id}`,
      },
    })

    if (result.error) {
      console.error('[DEVIS FOLLOW-UP] Resend error:', result.error)
      return NextResponse.json({ success: false, error: 'Erreur envoi e-mail' }, { status: 500 })
    }

    const now = new Date().toISOString()

    await updateDevis(id, {
      lastFollowUpAt: now,
      followUpCount: (devis.followUpCount || 0) + 1,
    })

    const stageDescription =
      followupState.stage === 'j2_unopened'
        ? `Relance J+2 envoyee — devis ${devis.devisNumber} non ouvert`
        : followupState.stage === 'j5_opened_no_decision'
          ? `Relance J+5 envoyee — devis ${devis.devisNumber} ouvert sans reponse`
          : followupState.stage === 'j10_final'
            ? `Relance finale J+10 envoyee — devis ${devis.devisNumber}`
            : `Relance devis envoyee — ${devis.devisNumber}`

    await createActivityLogSupabase(project.id, 'DEVIS_FOLLOW_UP_SENT', stageDescription)

    return NextResponse.json({
      success: true,
      message: 'Relance envoyee',
      sent_at: now,
      resend_id: result.data?.id || null,
    })
  } catch (error) {
    console.error('[DEVIS FOLLOW-UP]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
