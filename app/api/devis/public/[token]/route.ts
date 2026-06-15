import { NextRequest, NextResponse } from 'next/server'
import { airtableBase, TABLES, getArtisanConfig, getDevisByToken } from '@/src/lib/airtable'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length !== 36) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    const devis = await getDevisByToken(token)
    if (!devis) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const newCount = devis.opensCount + 1

    try {
      await airtableBase(TABLES.devis).update(devis.id, {
        'Opens_count': newCount,
        'Last_opened_date': now,
        'First_opened_at': devis.opensCount === 0 ? now : (devis.firstOpenedAt || now),
      })
    } catch (error) {
      console.error('[DEVIS PUBLIC] Erreur mise à jour Opens_count', error)
    }

    const config = await getArtisanConfig(devis.artisanId)

    let lignes: unknown[] = []
    try {
      const parsed = JSON.parse(devis.lignesJson || '[]')
      if (Array.isArray(parsed)) lignes = parsed
    } catch {
      lignes = []
    }

    return NextResponse.json({
      id: devis.id,
      numero: devis.devisNumber,
      amount: devis.totalTTC,
      total_ht: devis.totalHT,
      total_tva: devis.totalTVA,
      lignes,
      artisan: {
        raison_sociale: config?.raisonSociale || config?.companyName || '',
        adresse: [config?.adressePro, config?.cpPro, config?.villePro].filter(Boolean).join(' '),
        siret: config?.siret || '',
        tva: config?.tvaNumber || '',
      },
      client: {
        nom: devis.clientName,
        email: devis.clientEmail,
        adresse: devis.clientAddress,
        telephone: devis.clientPhone,
      },
      date_emission: devis.dateEmission,
      date_validite: devis.dateValidite,
      objet: devis.objet,
      conditions_paiement: devis.conditionsPaiement,
      delai_execution: devis.delaiExecution,
      mention_legale: devis.mentionsLegales,
      pdf_url: devis.pdfUrl,
      accepted: devis.accepted,
      accepted_at: devis.acceptedAt,
      opens_count: newCount,
    })
  } catch (error) {
    console.error('[DEVIS PUBLIC GET]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
