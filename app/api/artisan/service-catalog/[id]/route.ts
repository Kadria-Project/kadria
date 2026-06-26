import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { updateServiceCatalogItem } from '@/src/lib/business-profile'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const fields: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ success: false, error: 'Le nom de la prestation est requis' }, { status: 400 })
      }
      fields.name = body.name.trim()
    }
    if (body.category !== undefined) fields.category = body.category
    if (body.priceHt !== undefined) fields.price_ht = body.priceHt
    if (body.unit !== undefined) fields.unit = body.unit
    if (body.estimatedDurationMinutes !== undefined) fields.estimated_duration_minutes = body.estimatedDurationMinutes
    if (body.vatRate !== undefined) fields.vat_rate = body.vatRate
    if (body.isActive !== undefined) fields.is_active = !!body.isActive

    const { row, error, tableMissing } = await updateServiceCatalogItem(session.artisanId, id, fields)

    if (tableMissing) {
      return NextResponse.json({ success: false, error: 'La table artisan_service_catalog n\'existe pas encore en base. Exécutez la migration Supabase.' }, { status: 503 })
    }
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ success: false, error: 'Prestation introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, item: row })
  } catch (error) {
    console.error('[SERVICE CATALOG PATCH]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
