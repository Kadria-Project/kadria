import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { airtableBase, TABLES, createActivityLog, getArtisanConfig, getDevisById } from '@/src/lib/airtable'
import { requireFeatureAccess } from '@/src/lib/auth-utils'
import { getPublicDevisUrl } from '@/src/lib/base-url'
import { generateQuoteFollowUpEmail } from '@/src/lib/commercial-actions'

function toHtml(text: string) {
  return text
    .split('\n\n')
    .map((paragraph) => `<p style="margin:0 0 14px;line-height:1.6;color:#374151;">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireFeatureAccess('quoteGeneration')
  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status })
  }

  const { id } = await params
  const devis = await getDevisById(id)
  if (!devis) {
    return NextResponse.json({ success: false, error: 'Devis introuvable' }, { status: 404 })
  }

  if (devis.artisanId !== access.session.artisanId) {
    return NextResponse.json({ success: false, error: 'Acces non autorise' }, { status: 403 })
  }

  if (!devis.sent && !devis.statut?.startsWith('Envoy')) {
    return NextResponse.json({ success: false, error: 'Le devis doit etre envoye avant relance' }, { status: 400 })
  }

  if (!devis.clientEmail) {
    return NextResponse.json({ success: false, error: 'Email client manquant' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ success: false, error: 'Configuration e-mail manquante' }, { status: 500 })
  }

  const project = await airtableBase(TABLES.projects).find(devis.projetId)
  if (project.fields['Artisan ID'] !== access.session.artisanId) {
    return NextResponse.json({ success: false, error: 'Acces non autorise' }, { status: 403 })
  }

  const config = await getArtisanConfig(access.session.artisanId)
  const artisanName = config?.raisonSociale || config?.companyName || access.session.companyName || 'Votre artisan'
  const firstName =
    (project.fields['Client First Name'] as string) ||
    devis.clientName.split(' ')[0] ||
    ''
  const projectType =
    (project.fields['Project Type'] as string) ||
    (project.fields['Trade'] as string) ||
    devis.objet ||
    'votre projet'

  const email = generateQuoteFollowUpEmail({
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
  await createActivityLog(
    devis.projetId,
    'DEVIS_FOLLOW_UP_SENT',
    `Relance du devis ${devis.devisNumber} envoyee a ${devis.clientEmail}`
  )

  return NextResponse.json({
    success: true,
    sent_at: now,
    resend_id: result.data?.id || null,
  })
}
