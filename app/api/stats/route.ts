import { NextResponse } from 'next/server';
import { airtableBase, TABLES } from '@/src/lib/airtable';
import { getSession } from '@/src/lib/auth-utils';

function estimateBudgetValue(budget?: unknown): number {
  const value = String(budget || '').toLowerCase();

  if (!value) return 0;

  if (value.includes('moins de 1')) return 500;
  if (value.includes('1 000') && value.includes('3 000')) return 2000;
  if (value.includes('3 000') && value.includes('5 000')) return 4000;
  if (value.includes('5 000') && value.includes('10 000')) return 7500;
  if (value.includes('10 000') && value.includes('20 000')) return 15000;
  if (value.includes('plus de 20')) return 25000;

  return 0;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }
    const artisanId = session.artisanId;

    const records = await airtableBase(TABLES.projects)
      .select({
        maxRecords: 100,
        filterByFormula: `{Artisan ID}="${artisanId}"`,
      })
      .firstPage();

    const projects = records.map((record) => record.fields);

    const total = projects.length;

    const nouveau = projects.filter((p) => p.Status === 'Nouveau').length;
    const aRappeler = projects.filter((p) => p.Status === 'À rappeler').length;
    const qualifie = projects.filter((p) => p.Status === 'Qualifié').length;
    const devisEnvoye = projects.filter((p) => p.Status === 'Devis envoyé').length;
    const gagne = projects.filter((p) => p.Status === 'Gagné').length;

    const montantRecuCeMois = projects.reduce(
      (sum, p) => sum + estimateBudgetValue(p.Budget),
      0,
    );

    const montantDevisEnvoyes = projects
      .filter((p) => p.Status === 'Devis envoyé')
      .reduce((sum, p) => sum + estimateBudgetValue(p.Budget), 0);

    const montantGagnes = projects
      .filter((p) => p.Status === 'Gagné')
      .reduce((sum, p) => sum + estimateBudgetValue(p.Budget), 0);

    const panierMoyen =
      total > 0 ? Math.round(montantRecuCeMois / total) : 0;

    const scores = projects
      .map((p) => Number(p['Completeness Score'] ?? 0))
      .filter((n) => !Number.isNaN(n));

    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length)
        : 0;

    const tauxTransformation =
      total > 0 ? Math.round((gagne / total) * 100) : 0;

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
          (acc: Record<string, { trade: string; count: number }>, p) => {
            const trade = String(p.Trade || 'Autre');
            acc[trade] = acc[trade] || { trade, count: 0 };
            acc[trade].count += 1;
            return acc;
          },
          {},
        ),
      ),
    });
  } catch (error) {
    console.error('GET_STATS_ERROR', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur',
      },
      { status: 500 },
    );
  }
}
