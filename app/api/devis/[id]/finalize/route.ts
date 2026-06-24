import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { Resend } from 'resend'
import { TABLES, getArtisanConfig, getDevisById, updateDevis } from '@/src/lib/airtable'
import { generateDevisPdf } from '@/src/lib/devis-pdf'
import { requireFeatureAccess } from '@/src/lib/auth-utils'
import { getPublicDevisUrl } from '@/src/lib/base-url'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { createSentDevisSnapshot } from '@/src/lib/devis-snapshots'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

function buildDevisEmailHtml(params: {
  artisanNom: string
  devisNumero: string
  totalTTC: number
  dateValidite: string
  devisUrl: string
}) {
  const { artisanNom, devisNumero, totalTTC, dateValidite, devisUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont,
        'Segoe UI', sans-serif;
      background: #f9fafb;
      margin: 0; padding: 0;
    }
    .container {
      max-width: 600px; margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .header {
      background: #09090b;
      padding: 32px 40px;
      text-align: center;
    }
    .logo {
      font-size: 24px; font-weight: 900;
      color: #ffffff; letter-spacing: -1px;
    }
    .logo span { color: #22c55e; }
    .body { padding: 40px; }
    .greeting {
      font-size: 18px; font-weight: 600;
      color: #111827; margin-bottom: 16px;
    }
    .text {
      font-size: 15px; color: #6b7280;
      line-height: 1.7; margin-bottom: 12px;
    }
    .devis-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 24px; margin: 28px 0;
    }
    .devis-numero {
      font-size: 13px; font-weight: 700;
      color: #22c55e; letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .devis-montant {
      font-size: 32px; font-weight: 900;
      color: #111827; margin-bottom: 4px;
    }
    .devis-validite {
      font-size: 13px; color: #9ca3af;
    }
    .footer {
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      padding: 24px 40px;
      text-align: center;
    }
    .footer-text {
      font-size: 12px; color: #9ca3af;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">KA<span>DRIA</span></div>
    </div>
    <div class="body">
      <div class="greeting">
        Bonjour,
      </div>
      <p class="text">
        Veuillez trouver ci-joint votre devis
        établi par <strong>${artisanNom}</strong>.
      </p>
      <div class="devis-card">
        <div class="devis-numero">${devisNumero}</div>
        <div class="devis-montant">
          ${new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
          }).format(totalTTC)}
        </div>
        <div class="devis-validite">
          Valable jusqu'au ${dateValidite || "90 jours après émission"}
        </div>
      </div>
      <div style="text-align:center; margin: 32px 0;">
        <a href="${devisUrl}"
           style="display:inline-block;
                  background:#22c55e;
                  color:#000000;
                  font-weight:700;
                  font-size:16px;
                  padding:16px 40px;
                  border-radius:10px;
                  text-decoration:none;">
          Voir et accepter mon devis →
        </a>
      </div>
      <p style="text-align:center; font-size:12px;
                color:#9ca3af; margin-top:8px;">
        Vous pouvez également télécharger le PDF
        depuis cette page.
      </p>
      <p class="text">
        Pour toute question, contactez directement
        <strong>${artisanNom}</strong>.
      </p>
    </div>
    <div class="footer">
      <p class="footer-text">
        Ce devis vous a été envoyé via Kadria.<br>
        Devis gratuit et sans engagement.<br>
        © ${new Date().getFullYear()} Kadria
      </p>
    </div>
  </div>
</body>
</html>
  `
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireFeatureAccess('quoteGeneration')
  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status })
  }
  const session = access.session

  const { id } = await params
  const body = await request.json()
  const mode: 'draft' | 'send' = body.mode === 'send' ? 'send' : 'draft'

  const devis = await getDevisById(id)
  if (!devis) {
    return NextResponse.json({ success: false, error: 'Devis introuvable' }, { status: 404 })
  }

  if (devis.artisanId !== session.artisanId) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
  }

  const config = await getArtisanConfig(devis.artisanId)

  let pdfBuffer: Buffer
  let pdfUrl: string

  if (devis.pdfUrl && mode === 'send') {
    // Le PDF a déjà été généré et uploadé précédemment, on le réutilise.
    pdfUrl = devis.pdfUrl
    try {
      const pdfResponse = await fetch(pdfUrl)
      pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())
    } catch (error) {
      console.error('[DEVIS FINALIZE] Erreur récupération PDF existant', error)
      return NextResponse.json({ success: false, error: 'Erreur récupération PDF existant' }, { status: 500 })
    }
  } else {
    try {
      pdfBuffer = await generateDevisPdf(devis, config)
    } catch (error) {
      console.error('[DEVIS FINALIZE] Erreur génération PDF', error)
      return NextResponse.json({ success: false, error: 'Erreur génération PDF' }, { status: 500 })
    }

    try {
      const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            folder: 'kadria/devis',
            public_id: `devis-${devis.devisNumber}-${Date.now()}`,
            format: 'pdf',
          },
          (error, result) => {
            if (error || !result) reject(error)
            else resolve(result as { secure_url: string })
          }
        ).end(pdfBuffer)
      })
      pdfUrl = uploadResult.secure_url
    } catch (error) {
      console.error('[DEVIS FINALIZE] Erreur upload Cloudinary', error)
      return NextResponse.json({ success: false, error: 'Erreur upload PDF' }, { status: 500 })
    }
  }

  let emailSent = false
  let emailId: string | null = null

  if (mode === 'send') {
    const clientEmail = devis.clientEmail
    if (!clientEmail) {
      console.error('[DEVIS SEND] Client email manquant, envoi ignoré')
    } else if (!process.env.RESEND_API_KEY) {
      console.warn('[DEVIS SEND] RESEND_API_KEY absent, envoi ignoré')
    } else {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const artisanNom = config?.raisonSociale || config?.companyName || ''
        const devisUrl = getPublicDevisUrl(devis.token)

        const emailResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'devis@kadria.fr',
          to: clientEmail,
          subject: `Votre devis ${devis.devisNumber} — ${artisanNom}`,
          html: buildDevisEmailHtml({
            artisanNom,
            devisNumero: devis.devisNumber,
            totalTTC: devis.totalTTC,
            dateValidite: devis.dateValidite,
            devisUrl,
          }),
          headers: {
            'X-Entity-Ref-ID': id,
          },
        })

        if (emailResult.error) {
          console.error('[DEVIS SEND] Resend error:', emailResult.error)
        } else {
          emailSent = true
          emailId = emailResult.data?.id || null
          console.log('[DEVIS SEND] Email envoyé:', emailId)
        }
      } catch (error) {
        console.error('[DEVIS SEND] Erreur envoi email', error)
      }
    }
  }

  const newStatut = mode === 'send' ? 'Envoyé' : 'Brouillon'
  const now = new Date().toISOString()

  let sentSnapshot: { id: string } | null = null
  if (mode === 'send' && emailSent) {
    sentSnapshot = await createSentDevisSnapshot({ devis, config })
  }

  try {
    await updateDevis(id, {
      pdfUrl,
      sent: mode === 'send',
      statut: newStatut,
      ...(mode === 'send' && !devis.quoteSentAt ? { quoteSentAt: now } : {}),
      ...(mode === 'send' && emailSent ? { sentAt: now } : {}),
      ...(sentSnapshot ? { sentSnapshotId: sentSnapshot.id } : {}),
    })

    const { error: projectUpdateError } = await supabaseAdmin
      .from(TABLES.projects)
      .update({ status: 'Devis envoyé', devis_amount: devis.totalTTC })
      .eq('id', devis.projectId)

    if (projectUpdateError) {
      throw projectUpdateError
    }
  } catch (error) {
    console.error('[DEVIS FINALIZE] Erreur mise à jour Supabase', error)
    return NextResponse.json({
      success: false,
      error: 'PDF généré mais la mise à jour de la base a échoué',
      pdf_url: pdfUrl,
    }, { status: 207 })
  }

  return NextResponse.json({
    success: true,
    mode,
    pdf_url: pdfUrl,
    email_sent: emailSent,
    email_id: emailId,
    devis_numero: devis.devisNumber,
    devis_id: id,
    date_emission: devis.dateEmission,
    date_validite: devis.dateValidite,
  })
}
