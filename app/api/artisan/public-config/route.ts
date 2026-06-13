import { NextRequest, NextResponse } from 'next/server'
import { getArtisanConfig } from '@/src/lib/airtable'

export async function GET(request: NextRequest) {
  const artisanId = request.nextUrl.searchParams.get('artisan_id')
  if (!artisanId) {
    return NextResponse.json({ success: false, error: 'artisan_id requis' }, { status: 400 })
  }

  try {
    const config = await getArtisanConfig(artisanId)
    if (!config) {
      return NextResponse.json({ success: false, error: 'Artisan non trouvé' }, { status: 404 })
    }

    // Retourne uniquement les champs publics nécessaires au widget
    return NextResponse.json({
      success: true,
      config: {
        companyName:    config.companyName,
        welcomeName:    config.welcomeName,
        welcomeMessage: config.welcomeMessage,
        primaryColor:   config.primaryColor,
        secondaryColor: config.secondaryColor,
        logoUrl:        config.logoUrl,
        primaryTrade:   config.primaryTrade,
        active:         config.active,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
