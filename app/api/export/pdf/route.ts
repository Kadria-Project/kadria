import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'

type ExportProject = {
  id: string
  projectNumber?: string
  status?: string
  clientName?: string
  clientFirstName?: string
  city?: string
  trade?: string
  projectType?: string
  budget?: string
  completenessScore?: number
  devisAmount?: number
  createdAt?: string
  source?: string
}

const BADGE_COLORS: Record<string, string> = {
  'Nouveau': '#71717a',
  'À rappeler': '#d97706',
  'Qualifié': '#16a34a',
  'Devis envoyé': '#2563eb',
  'En cours': '#a855f7',
  'Gagné': '#15803d',
  'Perdu': '#dc2626',
}

const STATUS_LIST = ['Nouveau', 'À rappeler', 'Qualifié', 'Devis envoyé', 'En cours', 'Gagné', 'Perdu']

function parseBudget(budgetStr?: string): number {
  if (!budgetStr) return 0
  const numbers = budgetStr.match(/\d+[\s\d]*/g)
  if (!numbers) return 0
  const values = numbers.map((n) => parseInt(n.replace(/\s/g, ''), 10)).filter((n) => !isNaN(n) && n > 0)
  return values.length > 0 ? Math.max(...values) : 0
}

function potentialAmount(p: ExportProject): number {
  return p.devisAmount || parseBudget(p.budget)
}

function scoreColor(score: number): string {
  if (score > 80) return '#16a34a'
  if (score >= 60) return '#d97706'
  return '#dc2626'
}

function fmtAmount(n: number): string {
  return Math.round(n).toLocaleString('fr-FR') + ' €'
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function escapeHtml(value: unknown): string {
  return String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const baseStyles = `
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    color: #18181b;
    margin: 0;
    padding: 32px 40px;
  }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 28px 0 10px; border-bottom: 2px solid #18181b; padding-bottom: 4px; }
  .brand { font-weight: 800; font-size: 18px; letter-spacing: 1px; color: #16a34a; margin-bottom: 16px; }
  .meta { color: #71717a; font-size: 12px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e4e4e7; }
  th { background: #f4f4f5; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .badge {
    display: inline-block; padding: 2px 8px; border-radius: 999px;
    font-size: 11px; font-weight: 600; color: #fff;
  }
  .kpis { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
  .kpi { flex: 1; min-width: 140px; border: 1px solid #e4e4e7; border-radius: 8px; padding: 10px 14px; }
  .kpi-label { font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi-value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  .footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #e4e4e7; font-size: 11px; color: #71717a; display: flex; justify-content: space-between; }
  @media print {
    @page { margin: 18mm; }
  }
`

function statusBadge(status?: string): string {
  const color = BADGE_COLORS[status || ''] || '#71717a'
  return `<span class="badge" style="background:${color}">${escapeHtml(status || '—')}</span>`
}

function buildListHtml(projects: ExportProject[], artisanName: string, filtersLabel: string): string {
  const now = new Date()

  const rows = projects
    .map((p) => {
      const score = p.completenessScore || 0
      const clientName = `${p.clientFirstName || ''} ${p.clientName || ''}`.trim() || '—'

      return `
        <tr>
          <td>${escapeHtml(p.projectNumber)}</td>
          <td>${escapeHtml(clientName)}</td>
          <td>${escapeHtml(p.projectType || p.trade)}</td>
          <td>${escapeHtml(p.city)}</td>
          <td>${escapeHtml(p.budget)}</td>
          <td style="color:${scoreColor(score)};font-weight:700;">${score}%</td>
          <td>${statusBadge(p.status)}</td>
          <td>${fmtDate(p.createdAt)}</td>
        </tr>
      `
    })
    .join('')

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Export des dossiers - Kadria</title>
<style>${baseStyles}</style>
</head>
<body onload="window.print()">
  <div class="brand">KADRIA</div>
  <h1>Export des dossiers</h1>
  <p class="meta">Date d'export : ${fmtDate(now.toISOString())}</p>
  <p class="meta">Artisan : ${escapeHtml(artisanName)}</p>
  ${filtersLabel ? `<p class="meta">Filtres appliqués : ${escapeHtml(filtersLabel)}</p>` : ''}
  <p class="meta">Total : ${projects.length} dossier(s) exporté(s)</p>

  <table>
    <thead>
      <tr>
        <th>Réf</th>
        <th>Client</th>
        <th>Projet</th>
        <th>Ville</th>
        <th>Budget</th>
        <th>Score</th>
        <th>Statut</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    <span>Généré par Kadria le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
    <span>Page 1 / 1</span>
  </div>
</body>
</html>
  `
}

function buildMonthlyHtml(projects: ExportProject[], artisanName: string): string {
  const now = new Date()
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const monthProjects = projects.filter((p) => {
    if (!p.createdAt) return false
    const d = new Date(p.createdAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  const total = monthProjects.length
  const won = monthProjects.filter((p) => p.status === 'Gagné')
  const active = monthProjects.filter((p) => p.status !== 'Gagné' && p.status !== 'Perdu')

  const caPotentiel = monthProjects.filter((p) => p.status !== 'Perdu').reduce((sum, p) => sum + potentialAmount(p), 0)
  const caGagne = won.reduce((sum, p) => sum + potentialAmount(p), 0)
  const tauxConversion = total ? Math.round((won.length / total) * 100) : 0
  const panierMoyen = active.length ? Math.round(caPotentiel / active.length) : 0
  const scoreMoyen = total ? Math.round(monthProjects.reduce((sum, p) => sum + (p.completenessScore || 0), 0) / total) : 0

  const statusRows = STATUS_LIST.map((status) => {
    const list = monthProjects.filter((p) => p.status === status)
    const pct = total ? Math.round((list.length / total) * 100) : 0
    const ca = list.reduce((sum, p) => sum + potentialAmount(p), 0)

    return `
      <tr>
        <td>${statusBadge(status)}</td>
        <td>${list.length}</td>
        <td>${pct}%</td>
        <td>${fmtAmount(ca)}</td>
      </tr>
    `
  }).join('')

  const top5 = [...monthProjects]
    .sort((a, b) => (b.completenessScore || 0) - (a.completenessScore || 0))
    .slice(0, 5)
    .map((p) => {
      const score = p.completenessScore || 0
      const clientName = `${p.clientFirstName || ''} ${p.clientName || ''}`.trim() || '—'

      return `
        <tr>
          <td>${escapeHtml(clientName)}</td>
          <td>${escapeHtml(p.projectType || p.trade)}</td>
          <td>${escapeHtml(p.budget)}</td>
          <td style="color:${scoreColor(score)};font-weight:700;">${score}%</td>
          <td>${statusBadge(p.status)}</td>
        </tr>
      `
    })
    .join('')

  const trades = Array.from(new Set(monthProjects.map((p) => p.trade).filter(Boolean))) as string[]

  const tradeRows = trades.map((trade) => {
    const list = monthProjects.filter((p) => p.trade === trade)
    const ca = list.reduce((sum, p) => sum + potentialAmount(p), 0)

    return `
      <tr>
        <td>${escapeHtml(trade)}</td>
        <td>${list.length}</td>
        <td>${fmtAmount(ca)}</td>
      </tr>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Rapport mensuel - Kadria</title>
<style>${baseStyles}</style>
</head>
<body onload="window.print()">
  <div class="brand">KADRIA</div>
  <h1>Rapport mensuel</h1>
  <p class="meta">Période : ${escapeHtml(monthLabel)}</p>
  <p class="meta">Artisan : ${escapeHtml(artisanName)}</p>

  <h2>KPIs du mois</h2>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Dossiers reçus</div><div class="kpi-value">${total}</div></div>
    <div class="kpi"><div class="kpi-label">Taux de conversion</div><div class="kpi-value">${tauxConversion}%</div></div>
    <div class="kpi"><div class="kpi-label">CA potentiel</div><div class="kpi-value">${fmtAmount(caPotentiel)}</div></div>
    <div class="kpi"><div class="kpi-label">CA gagné</div><div class="kpi-value">${fmtAmount(caGagne)}</div></div>
    <div class="kpi"><div class="kpi-label">Panier moyen</div><div class="kpi-value">${fmtAmount(panierMoyen)}</div></div>
    <div class="kpi"><div class="kpi-label">Score IA moyen</div><div class="kpi-value">${scoreMoyen}%</div></div>
  </div>

  <h2>Répartition par statut</h2>
  <table>
    <thead>
      <tr><th>Statut</th><th>Nombre</th><th>% du total</th><th>CA potentiel</th></tr>
    </thead>
    <tbody>${statusRows}</tbody>
  </table>

  <h2>Top 5 dossiers</h2>
  <table>
    <thead>
      <tr><th>Client</th><th>Projet</th><th>Budget</th><th>Score</th><th>Statut</th></tr>
    </thead>
    <tbody>${top5 || '<tr><td colspan="5">Aucun dossier ce mois-ci</td></tr>'}</tbody>
  </table>

  <h2>Répartition par métier</h2>
  <table>
    <thead>
      <tr><th>Métier</th><th>Dossiers</th><th>CA potentiel</th></tr>
    </thead>
    <tbody>${tradeRows || '<tr><td colspan="3">Aucun dossier ce mois-ci</td></tr>'}</tbody>
  </table>

  <div class="footer">
    <span>Rapport Kadria — ${escapeHtml(monthLabel)}</span>
    <span>Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
  </div>
</body>
</html>
  `
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }

  const body = await request.json()
  const projects: ExportProject[] = Array.isArray(body.projects) ? body.projects : []
  const type: 'list' | 'monthly' = body.type === 'monthly' ? 'monthly' : 'list'
  const filtersLabel: string = typeof body.filtersLabel === 'string' ? body.filtersLabel : ''

  const artisanName = session.companyName || 'Artisan'

  const html = type === 'monthly'
    ? buildMonthlyHtml(projects, artisanName)
    : buildListHtml(projects, artisanName, filtersLabel)

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
