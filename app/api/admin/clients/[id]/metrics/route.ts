import { NextRequest, NextResponse } from 'next/server'
import { getProjectsByArtisan, getDevisByArtisan } from '@/src/lib/airtable'
import { requireAdminSession } from '@/src/lib/auth-utils'

function isSameMonth(dateStr: string, ref: Date) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export async function GET(request: NextRequest) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const artisanId = request.nextUrl.searchParams.get('artisan_id')
  if (!artisanId) {
    return NextResponse.json({ error: 'artisan_id requis' }, { status: 400 })
  }

  try {
    const now = new Date()
    const [projects, devis] = await Promise.all([
      getProjectsByArtisan(artisanId),
      getDevisByArtisan(artisanId),
    ])

    const statutCounts: Record<string, number> = {}
    for (const p of projects) {
      if (!p.status) continue
      statutCounts[p.status] = (statutCounts[p.status] || 0) + 1
    }
    let statutFrequent = ''
    let max = 0
    for (const [statut, count] of Object.entries(statutCounts)) {
      if (count > max) {
        max = count
        statutFrequent = statut
      }
    }

    return NextResponse.json({
      total: projects.length,
      ceMois: projects.filter((p) => isSameMonth(p.createdAt, now)).length,
      devisGeneres: devis.length,
      statutFrequent,
    })
  } catch (error) {
    console.error('[ADMIN CLIENT METRICS]', error)
    return NextResponse.json({ total: 0, ceMois: 0, devisGeneres: 0, statutFrequent: '' })
  }
}
