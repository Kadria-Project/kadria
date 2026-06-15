import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import Airtable from 'airtable'
import { airtableBase, TABLES, getArtisanConfig, getDevisById } from '@/src/lib/airtable'
import { generateDevisPdf } from '@/src/lib/devis-pdf'
import { getSession } from '@/src/lib/auth-utils'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }

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
  try {
    pdfBuffer = await generateDevisPdf(devis, config)
  } catch (error) {
    console.error('[DEVIS FINALIZE] Erreur génération PDF', error)
    return NextResponse.json({ success: false, error: 'Erreur génération PDF' }, { status: 500 })
  }

  let pdfUrl: string
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

  const newStatut = mode === 'send' ? 'Envoyé' : 'Brouillon'

  try {
    await airtableBase(TABLES.devis).update(id, {
      'PDF File': [{ url: pdfUrl }],
      'Sent': mode === 'send',
      'Statut': newStatut,
    } as unknown as Partial<Airtable.FieldSet>)

    await airtableBase(TABLES.projects).update(devis.projetId, {
      Status: 'Devis envoyé',
      Devis_amount: devis.totalTTC,
    })
  } catch (error) {
    console.error('[DEVIS FINALIZE] Erreur mise à jour Airtable', error)
    return NextResponse.json({
      success: false,
      error: 'PDF généré mais la mise à jour Airtable a échoué',
      pdf_url: pdfUrl,
    }, { status: 207 })
  }

  return NextResponse.json({
    success: true,
    mode,
    pdf_url: pdfUrl,
    devis_numero: devis.devisNumber,
    devis_id: id,
    date_emission: devis.dateEmission,
    date_validite: devis.dateValidite,
  })
}
