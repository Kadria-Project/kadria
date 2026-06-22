import { NextResponse } from 'next/server'
import { getAllUsers } from '@/src/lib/airtable'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { getPlanLabel } from '@/src/lib/plans'

const PLAN_PRICES: Record<string, number> = {
  'Essentiel': 149,
  'Performance': 249,
}

function isSameMonth(dateStr: string, ref: Date) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export async function GET() {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const users = await getAllUsers()
    const artisans = users
      .filter((u) => u.role !== 'Admin')
      .map((u) => ({ ...u, plan: getPlanLabel(u.plan), statut: u.statut || 'Actif' }))

    const now = new Date()

    const actifs = artisans.filter((u) => u.statut === 'Actif')
    const trial = artisans.filter((u) => u.statut === 'Trial')
    const suspendus = artisans.filter((u) => u.statut === 'Suspendu')
    const resilies = artisans.filter((u) => u.statut === 'Résilié')

    const nouveauxCeMois = artisans.filter((u) => isSameMonth(u.createdAt, now)).length
    const churnsCeMois = artisans.filter((u) => isSameMonth(u.cancelledAt, now)).length

    const mrr = actifs.reduce((sum, u) => sum + (PLAN_PRICES[u.plan] || 0), 0)

    const parPlan = {
      essentiel: artisans.filter((u) => u.plan === 'Essentiel').length,
      performance: artisans.filter((u) => u.plan === 'Performance').length,
      agence: artisans.filter((u) => u.plan === 'Agence').length,
    }

    const derniersClients = [...artisans]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 5)
      .map((u) => ({
        id: u.id,
        nom: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        plan: u.plan,
        statut: u.statut,
        created_at: u.createdAt,
      }))

    return NextResponse.json({
      total_clients: artisans.length,
      actifs: actifs.length,
      trial: trial.length,
      suspendus: suspendus.length,
      resilies: resilies.length,
      nouveaux_ce_mois: nouveauxCeMois,
      churns_ce_mois: churnsCeMois,
      mrr,
      par_plan: parPlan,
      derniers_clients: derniersClients,
    })
  } catch (error) {
    console.error('[ADMIN STATS]', error)
    return NextResponse.json({ error: 'Erreur serveur', detail: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
