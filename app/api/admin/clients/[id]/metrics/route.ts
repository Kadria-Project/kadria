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

    const devisSent = devis.filter((d) => d.sent)
    const devisAccepted = devis.filter((d) => d.accepted)
    const caPotentiel = devisSent.reduce((sum, d) => sum + (d.totalTTC || 0), 0)
    const caGagne = devisAccepted.reduce((sum, d) => sum + (d.totalTTC || 0), 0)
    const estimatedMinutesSavedPerDevis = 20
    const tempsEstimeEconomiseMinutes = devis.length * estimatedMinutesSavedPerDevis

    type EventEntry = { type: string; label: string; date: string }
    const events: EventEntry[] = []
    for (const d of devis) {
      if (d.quoteSentAt) events.push({ type: 'devis_sent', label: `Devis ${d.devisNumber || ''} envoyé`, date: d.quoteSentAt })
      if (d.acceptedAt) events.push({ type: 'devis_accepted', label: `Devis ${d.devisNumber || ''} accepté`, date: d.acceptedAt })
      if (d.declinedAt) events.push({ type: 'devis_declined', label: `Devis ${d.devisNumber || ''} refusé`, date: d.declinedAt })
      if (d.lastFollowUpAt) events.push({ type: 'follow_up', label: `Relance envoyée pour le devis ${d.devisNumber || ''}`, date: d.lastFollowUpAt })
    }
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      total: projects.length,
      ceMois: projects.filter((p) => isSameMonth(p.createdAt, now)).length,
      devisGeneres: devis.length,
      statutFrequent,
      value: {
        dossiersCaptes: projects.length,
        devisEnvoyes: devisSent.length,
        devisAcceptes: devisAccepted.length,
        caPotentiel,
        caGagne,
        tempsEstimeEconomiseMinutes,
      },
      events: events.slice(0, 8),
    })
  } catch (error) {
    console.error('[ADMIN CLIENT METRICS]', error)
    return NextResponse.json({ total: 0, ceMois: 0, devisGeneres: 0, statutFrequent: '' })
  }
}
