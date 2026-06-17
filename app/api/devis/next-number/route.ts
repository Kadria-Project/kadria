import { NextResponse } from 'next/server'
import { getArtisanConfig, getDevisByArtisan } from '@/src/lib/airtable'
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
    const prefixe = config?.devisPrefixe || 'DEV'
    const currentYear = new Date().getFullYear()

    const devisList = await getDevisByArtisan(session.artisanId)

    let maxNumber = 0
    const pattern = new RegExp(`^${prefixe}-${currentYear}-(\\d+)$`)
    for (const devis of devisList) {
      const match = devis.devisNumber.match(pattern)
      if (match) {
        const n = parseInt(match[1], 10)
        if (n > maxNumber) maxNumber = n
      }
    }

    const nextNumber = `${prefixe}-${currentYear}-${String(maxNumber + 1).padStart(3, '0')}`

    return NextResponse.json({ success: true, nextNumber })
  } catch (error) {
    console.error('[DEVIS NEXT-NUMBER]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
