import { NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'
import { mapSupabaseProject } from '@/src/lib/supabase/mapping'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function estimateBudgetValue(budget?: unknown): number {
  const value = String(budget || '').toLowerCase()

  if (!value) return 0

  if (value.includes('moins de 1')) return 500
  if (value.includes('1 000') && value.includes('3 000')) return 2000
  if (value.includes('3 000') && value.includes('5 000')) return 4000
  if (value.includes('5 000') && value.includes('10 000')) return 7500
  if (value.includes('10 000') && value.includes('20 000')) return 15000
  if (value.includes('plus de 20')) return 25000

  return 0
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from(TABLES.projects)
      .select('*')
      .eq('artisan_id', session.artisanId)
      .limit(1000)

    if (error) {
      throw error
    }

    const projects = (data || []).map(mapSupabaseProject)
    const total = projects.length

    const nouveau = projects.filter((p) => p.status === 'Nouveau').length
    const aRappeler = projects.filter((p) => p.status === 'À rappeler').length
    const qualifie = projects.filter((p) => p.status === 'Qualifié').length
    const devisEnvoye = projects.filter((p) => p.status === 'Devis envoyé').length
    const gagne = projects.filter((p) => p.status === 'Gagné').length

    const montantRecuCeMois = projects.reduce(
      (sum, project) => sum + estimateBudgetValue(project.budget),
      0,
    )

    const montantDevisEnvoyes = projects
      .filter((project) => project.status === 'Devis envoyé')
      .reduce((sum, project) => sum + estimateBudgetValue(project.budget), 0)

    const montantGagnes = projects
      .filter((project) => project.status === 'Gagné')
      .reduce((sum, project) => sum + estimateBudgetValue(project.budget), 0)

    const panierMoyen = total > 0 ? Math.round(montantRecuCeMois / total) : 0

    const scores = projects
      .map((project) => Number(project.completenessScore ?? 0))
      .filter((value) => !Number.isNaN(value))

    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
        : 0

    const tauxTransformation = total > 0 ? Math.round((gagne / total) * 100) : 0

    return NextResponse.json({
      montantRecuCeMois,
      montantDevisEnvoyes,
      montantGagnes,
      panierMoyen,
      tauxTransformation,
      dossiersARelancer: aRappeler,
      total,
      nouveau,
      aRappeler,
      qualifie,
      devisEnvoye,
      gagne,
      avgScore,
      byTrade: Object.values(
        projects.reduce(
          (acc: Record<string, { trade: string; count: number }>, project) => {
            const trade = String(project.trade || 'Autre')
            acc[trade] = acc[trade] || { trade, count: 0 }
            acc[trade].count += 1
            return acc
          },
          {},
        ),
      ),
    })
  } catch (error) {
    console.error('GET_STATS_ERROR', error instanceof Error ? error.message : String(error))

    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur',
      },
      { status: 500 },
    )
  }
}
