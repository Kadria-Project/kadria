import { NextRequest, NextResponse } from 'next/server'
import { deleteDevis, getDevisById, updateDevis } from '@/src/lib/airtable'
import { getSession, requireFeatureAccess } from '@/src/lib/auth-utils'

const ALLOWED_STATUTS = ['Brouillon', 'Envoyé', 'Accepté', 'Refusé']

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params
    const devis = await getDevisById(id)

    if (!devis) {
      return NextResponse.json(
        { success: false, error: 'Devis introuvable' },
        { status: 404 }
      )
    }

    if (devis.artisanId !== session.artisanId) {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, devis })
  } catch (error) {
    console.error('[DEVIS GET BY ID]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireFeatureAccess('quoteGeneration')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }
    const session = access.session

    const { id } = await params
    const existing = await getDevisById(id)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Devis introuvable' },
        { status: 404 }
      )
    }

    if (existing.artisanId !== session.artisanId) {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const body = await request.json()

    if (body.statut !== undefined && !ALLOWED_STATUTS.includes(body.statut)) {
      return NextResponse.json(
        { success: false, error: 'Statut invalide' },
        { status: 400 }
      )
    }

    const fields: Record<string, unknown> = {}
    if (body.objet !== undefined) fields['Objet'] = body.objet
    if (body.dateEmission !== undefined) fields['Date Emission'] = body.dateEmission
    if (body.dateValidite !== undefined) fields['Date Validite'] = body.dateValidite
    if (body.lines !== undefined) fields['Lignes JSON'] = JSON.stringify(body.lines)
    if (body.totalHT !== undefined) fields['Total HT'] = Number(body.totalHT) || 0
    if (body.totalTVA !== undefined) fields['Total TVA'] = Number(body.totalTVA) || 0
    if (body.tvaBreakdown !== undefined) fields['TVA Breakdown JSON'] = JSON.stringify(body.tvaBreakdown)
    if (body.totalTTC !== undefined) fields['Total TTC'] = Number(body.totalTTC) || 0
    if (body.conditionsPaiement !== undefined) fields['Conditions Paiement'] = body.conditionsPaiement
    if (body.delaiExecution !== undefined) fields['Delai Execution'] = body.delaiExecution
    if (body.mentionsLegales !== undefined) fields['Mentions Legales'] = body.mentionsLegales
    if (body.noteInterne !== undefined) fields['Note Interne'] = body.noteInterne
    if (body.statut !== undefined) fields['Statut'] = body.statut
    if (body.clientName !== undefined) fields['Client Name'] = body.clientName
    if (body.clientAddress !== undefined) fields['Client Address'] = body.clientAddress
    if (body.clientEmail !== undefined) fields['Client Email'] = body.clientEmail
    if (body.clientPhone !== undefined) fields['Client Phone'] = body.clientPhone

    const devis = await updateDevis(id, fields)
    return NextResponse.json({ success: true, devis })
  } catch (error) {
    console.error('[DEVIS PATCH]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireFeatureAccess('quoteGeneration')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }
    const session = access.session

    const { id } = await params
    const existing = await getDevisById(id)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Devis introuvable' },
        { status: 404 }
      )
    }

    if (existing.artisanId !== session.artisanId) {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    await deleteDevis(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DEVIS DELETE]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
