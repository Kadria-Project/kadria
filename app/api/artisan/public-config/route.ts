import { NextRequest, NextResponse } from 'next/server'
import { getArtisanConfig, getArtisanByArtisanId } from '@/src/lib/airtable'

export async function GET(request: NextRequest) {
  const artisanId = request.nextUrl.searchParams.get('artisan_id')
  if (!artisanId) {
    return NextResponse.json({ success: false }, { status: 400 })
  }

  try {
    const artisan = await getArtisanByArtisanId(artisanId)
    if (!artisan) {
      return NextResponse.json({ success: false }, { status: 404 })
    }

    const config = await getArtisanConfig(artisanId)

    // Retourne uniquement les champs publics (pas l'email, etc.)
    return NextResponse.json({
      success: true,
      config: {
        companyName: config?.companyName || '',
        welcomeName: config?.welcomeName || '',
        welcomeMessage: config?.welcomeMessage || '',
        primaryColor: config?.primaryColor || '#22c55e',
        secondaryColor: config?.secondaryColor || '#18181b',
        logoUrl: config?.logoUrl || '',
      }
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
