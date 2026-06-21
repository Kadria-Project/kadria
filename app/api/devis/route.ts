import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  airtableBase,
  TABLES,
  createActivityLog,
  createDevis,
  getArtisanConfig,
  getDevisByProjet,
  updateArtisanConfig,
} from '@/src/lib/airtable'
import { getSession, requireFeatureAccess } from '@/src/lib/auth-utils'

async function getAuthorizedProject(id: string, artisanId: string) {
  let record

  try {
    record = await airtableBase(TABLES.projects).find(id)
  } catch {
    return { status: 404 as const }
  }

  if (record.fields['Artisan ID'] !== artisanId) {
    return { status: 403 as const }
  }

  return { status: 200 as const, record }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projetId = searchParams.get('projet_id') || searchParams.get('projetId')

    if (!projetId) {
      return NextResponse.json(
        { success: false, error: 'projet_id requis' },
        { status: 400 }
      )
    }

    const project = await getAuthorizedProject(projetId, session.artisanId)
    if (project.status === 404) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }
    if (project.status === 403) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    const devis = await getDevisByProjet(projetId)
    const list = devis
      .filter((d) => d.artisanId === session.artisanId)
      .map((d) => ({
        id: d.id,
        numero: d.devisNumber,
        token: d.token,
        amount: d.totalTTC,
        sent: d.sent,
        statut: d.statut,
        pdf_url: d.pdfUrl,
        date_emission: d.dateEmission,
        date_validite: d.dateValidite,
        client_email: d.clientEmail,
        opens_count: d.opensCount,
        last_opened_date: d.lastOpenedDate,
        accepted: d.accepted,
        accepted_at: d.acceptedAt,
        quote_sent_at: d.quoteSentAt,
        last_follow_up_at: d.lastFollowUpAt,
        follow_up_count: d.followUpCount,
      }))
      .sort((a, b) => (b.date_emission || '').localeCompare(a.date_emission || ''))

    return NextResponse.json({ success: true, devis: list })
  } catch (error) {
    console.error('[DEVIS GET]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireFeatureAccess('quoteGeneration')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }
    const session = access.session

    const body = await request.json()

    if (!body.projetId) {
      return NextResponse.json(
        { success: false, error: 'projetId requis' },
        { status: 400 }
      )
    }

    if (!body.objet || !String(body.objet).trim()) {
      return NextResponse.json(
        { success: false, error: 'L\'objet du devis est requis' },
        { status: 400 }
      )
    }

    const itemLines = Array.isArray(body.lines)
      ? body.lines.filter((l: { type?: string; description?: string }) => l.type === 'item' && l.description?.trim())
      : []

    if (itemLines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Le devis doit contenir au moins une ligne avec une description' },
        { status: 400 }
      )
    }

    const config = await getArtisanConfig(session.artisanId)
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Configuration non trouvée pour cet Artisan ID' },
        { status: 404 }
      )
    }

    const project = await getAuthorizedProject(body.projetId, session.artisanId)
    if (project.status === 404) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }
    if (project.status === 403) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    const prefixe = config.devisPrefixe || 'DEV'
    const numero = (config.devisCompteur || 0) + 1
    const devisNumber = `${prefixe}-${new Date().getFullYear()}-${String(numero).padStart(3, '0')}`

    const token = randomUUID()

    let devis
    try {
      devis = await createDevis({
        'Devis Number': devisNumber,
        'Token': token,
        'Projet ID': body.projetId,
        'Artisan ID': session.artisanId,
        'Date Emission': body.dateEmission || '',
        'Date Validite': body.dateValidite || '',
        'Objet': body.objet,
        'Lignes JSON': JSON.stringify(body.lines || []),
        'Total HT': Number(body.totalHT) || 0,
        'Total TVA': Number(body.totalTVA) || 0,
        'TVA Breakdown JSON': JSON.stringify(body.tvaBreakdown || {}),
        'Total TTC': Number(body.totalTTC) || 0,
        'Conditions Paiement': body.conditionsPaiement || '',
        'Delai Execution': body.delaiExecution || '',
        'Mentions Legales': body.mentionsLegales || '',
        'Note Interne': body.noteInterne || '',
        'Statut': 'Brouillon',
        'Client Name': body.clientName || '',
        'Client Address': body.clientAddress || '',
        'Client Email': body.clientEmail || '',
        'Client Phone': body.clientPhone || '',
        'Created At': new Date().toISOString(),
      })
    } catch (error) {
      console.error('[DEVIS POST] Création du devis échouée', error instanceof Error ? error.message : String(error))
      return NextResponse.json(
        { success: false, error: 'Erreur création devis' },
        { status: 500 }
      )
    }

    await updateArtisanConfig(session.artisanId, { 'Devis Compteur': numero })

    try {
      await airtableBase(TABLES.projects).update(body.projetId, {
        Devis_amount: Number(body.totalTTC) || 0,
        Status: 'Devis envoyé',
      })

      await createActivityLog(
        body.projetId,
        'DEVIS_CREATED',
        `Devis ${devisNumber} généré — ${(Number(body.totalTTC) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC`
      )
    } catch (error) {
      console.error('[DEVIS POST] Mise à jour du projet échouée', error instanceof Error ? error.message : String(error))
    }

    return NextResponse.json({ success: true, devis, devis_id: devis.id, numero: devisNumber, token })
  } catch (error) {
    console.error('[DEVIS POST]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
