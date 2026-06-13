import { NextRequest, NextResponse } from 'next/server'
import { getArtisanConfig, updateArtisanConfig } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }
    const config = await getArtisanConfig(session.artisanId)
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('[CONFIG GET]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const config = await getArtisanConfig(session.artisanId)

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Configuration non trouvée pour cet Artisan ID' },
        { status: 404 }
      )
    }

    // Mapping vers les noms de champs EXACTS d'Airtable Artisan_config
    const fields: Record<string, unknown> = {}
    if (body.companyName  !== undefined) fields['Company Name']     = body.companyName
    if (body.primaryTrade !== undefined) fields['Primary Trade']    = body.primaryTrade
    if (body.phone        !== undefined) fields['Phone']            = body.phone
    if (body.address      !== undefined) fields['Address']          = body.address
    if (body.hours        !== undefined) fields['Hours']            = body.hours
    if (body.logoUrl      !== undefined) fields['Logo URL']         = body.logoUrl
    if (body.welcomeName  !== undefined) fields['Welcome Name']     = body.welcomeName
    if (body.welcomeMessage !== undefined) fields['Welcome Message'] = body.welcomeMessage
    if (body.primaryColor !== undefined) fields['Primary Color']    = body.primaryColor
    if (body.secondaryColor !== undefined) fields['Secondary Color'] = body.secondaryColor
    if (body.websiteUrl   !== undefined) fields['Website URL']      = body.websiteUrl
    if (body.trades       !== undefined) fields['Trades']           = body.trades

    await updateArtisanConfig(config.id, fields)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CONFIG PATCH]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
