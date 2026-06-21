import { NextRequest, NextResponse } from 'next/server'
import { getArtisanConfig, updateArtisanConfig } from '@/src/lib/airtable'
import { requireFeatureAccess } from '@/src/lib/auth-utils'

interface Prestation {
  id: string
  description: string
  unit: string
  unitPrice: number
  tvaRate: number
}

function parsePrestations(json: string): Prestation[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function makeId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export async function GET() {
  try {
    const access = await requireFeatureAccess('pricingCatalog')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }
    const session = access.session

    const config = await getArtisanConfig(session.artisanId)
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Configuration non trouvée pour cet Artisan ID' },
        { status: 404 }
      )
    }

    const prestations = parsePrestations(config.prestationsJson)
    return NextResponse.json({ success: true, prestations })
  } catch (error) {
    console.error('[PRESTATIONS GET]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireFeatureAccess('pricingCatalog')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }
    const session = access.session

    const body = await request.json()

    if (!body.description || !String(body.description).trim()) {
      return NextResponse.json(
        { success: false, error: 'La description est requise' },
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

    const prestations = parsePrestations(config.prestationsJson)

    const newPrestation: Prestation = {
      id: makeId(),
      description: String(body.description),
      unit: body.unit ? String(body.unit) : 'u',
      unitPrice: Number(body.unitPrice) || 0,
      tvaRate: Number(body.tvaRate) || 10,
    }

    prestations.push(newPrestation)
    await updateArtisanConfig(config.id, { prestations_json: JSON.stringify(prestations) })

    return NextResponse.json({ success: true, prestation: newPrestation, prestations })
  } catch (error) {
    console.error('[PRESTATIONS POST]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requireFeatureAccess('pricingCatalog')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }
    const session = access.session

    const body = await request.json()
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'ID de la prestation requis' },
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

    const prestations = parsePrestations(config.prestationsJson)
    const index = prestations.findIndex((p) => p.id === body.id)
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Prestation introuvable' },
        { status: 404 }
      )
    }

    if (body.description !== undefined) prestations[index].description = String(body.description)
    if (body.unit !== undefined) prestations[index].unit = String(body.unit)
    if (body.unitPrice !== undefined) prestations[index].unitPrice = Number(body.unitPrice) || 0
    if (body.tvaRate !== undefined) prestations[index].tvaRate = Number(body.tvaRate) || 0

    await updateArtisanConfig(config.id, { prestations_json: JSON.stringify(prestations) })

    return NextResponse.json({ success: true, prestations })
  } catch (error) {
    console.error('[PRESTATIONS PATCH]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireFeatureAccess('pricingCatalog')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }
    const session = access.session

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de la prestation requis' },
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

    const prestations = parsePrestations(config.prestationsJson).filter((p) => p.id !== id)
    await updateArtisanConfig(config.id, { prestations_json: JSON.stringify(prestations) })

    return NextResponse.json({ success: true, prestations })
  } catch (error) {
    console.error('[PRESTATIONS DELETE]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
