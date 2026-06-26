import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { listServiceCatalog, createServiceCatalogItem } from '@/src/lib/business-profile'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { rows, tableMissing } = await listServiceCatalog(session.artisanId)

    if (tableMissing) {
      return NextResponse.json({ success: true, items: [] })
    }

    return NextResponse.json({ success: true, items: rows })
  } catch (error) {
    console.error('[SERVICE CATALOG GET]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()

    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Le nom de la prestation est requis' }, { status: 400 })
    }

    const fields: Record<string, unknown> = {
      name: body.name.trim(),
      category: typeof body.category === 'string' ? body.category : null,
      price_ht: typeof body.priceHt === 'number' ? body.priceHt : null,
      unit: typeof body.unit === 'string' ? body.unit : null,
      estimated_duration_minutes: typeof body.estimatedDurationMinutes === 'number' ? body.estimatedDurationMinutes : null,
      vat_rate: typeof body.vatRate === 'number' ? body.vatRate : null,
      is_active: body.isActive !== undefined ? !!body.isActive : true,
    }

    const { row, error, tableMissing } = await createServiceCatalogItem(session.artisanId, fields)

    if (tableMissing) {
      return NextResponse.json({ success: false, error: 'La table artisan_service_catalog n\'existe pas encore en base. Exécutez la migration Supabase.' }, { status: 503 })
    }
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 500 })
    }

    return NextResponse.json({ success: true, item: row })
  } catch (error) {
    console.error('[SERVICE CATALOG POST]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
