import { NextRequest, NextResponse } from 'next/server'
import { getSession, requireFeatureAccess } from '@/src/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }

  const featureAccess = await requireFeatureAccess('pdfExports')
  if (!featureAccess.ok) {
    return NextResponse.json(featureAccess.body, { status: featureAccess.status })
  }

  const { id } = await params

  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/Projects/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  if (res.status === 404) {
    return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
  }
  if (!res.ok) {
    return NextResponse.json({ success: false, error: 'Erreur Airtable' }, { status: 500 })
  }
  const record = await res.json()
  const f = record.fields || {}
  if (f['Artisan ID'] !== session.artisanId) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
  }

  const score = Number(f['Completeness Score'] || 0)
  let verdictLabel = 'À qualifier'
  let verdictColor = '#71717a'
  if (score >= 80) {
    verdictLabel = 'Projet qualifié'
    verdictColor = '#22c55e'
  } else if (score >= 60) {
    verdictLabel = 'Projet à compléter'
    verdictColor = '#fbbf24'
  } else {
    verdictLabel = 'Informations insuffisantes'
    verdictColor = '#f87171'
  }

  const createdDate = f['Created'] ? new Date(f['Created']) : new Date()
  const formattedDate = createdDate.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const clientName = `${f['Client First Name'] || ''} ${f['Client Name'] || ''}`.trim() || 'Client'

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Dossier projet - ${clientName}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    color: #18181b;
    margin: 0;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #22c55e;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .logo {
    font-size: 24px;
    font-weight: 800;
  }
  .logo .k { color: #22c55e; }
  .badge {
    display: inline-block;
    background: #f4f4f5;
    color: #52525b;
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
  }
  .meta { text-align: right; font-size: 12px; color: #71717a; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #71717a;
    margin: 24px 0 12px;
    border-bottom: 1px solid #e4e4e7;
    padding-bottom: 6px;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .field { font-size: 14px; }
  .field-label { color: #71717a; font-size: 12px; margin-bottom: 2px; }
  .field-value { font-weight: 600; }
  .score-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }
  .score-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 800;
    color: white;
    background: ${verdictColor};
  }
  .verdict-badge {
    display: inline-block;
    border-radius: 999px;
    padding: 4px 14px;
    font-size: 13px;
    font-weight: 700;
    color: white;
    background: ${verdictColor};
  }
  .quote {
    background: #f4f4f5;
    border-left: 3px solid #22c55e;
    padding: 12px 16px;
    font-style: italic;
    font-size: 14px;
    color: #3f3f46;
    margin: 12px 0;
  }
  .indicators {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 12px;
  }
  .indicator {
    text-align: center;
    padding: 10px;
    border-radius: 8px;
    background: #f4f4f5;
    font-size: 12px;
  }
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #e4e4e7;
    font-size: 11px;
    color: #a1a1aa;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo"><span class="k">K</span>adria</div>
      <span class="badge">Dossier projet</span>
    </div>
    <div class="meta">Généré le ${formattedDate}</div>
  </div>

  <h1>${clientName}</h1>
  <div style="color:#71717a;font-size:14px;">${f['Primary Trade'] || f['Trade'] || 'Métier non précisé'} ${f['City'] ? '· ' + f['City'] : ''}</div>

  <h2>Informations de contact</h2>
  <div class="grid">
    <div class="field">
      <div class="field-label">Téléphone</div>
      <div class="field-value">${f['Client Phone'] || '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Email</div>
      <div class="field-value">${f['Client Email'] || '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Adresse du chantier</div>
      <div class="field-value">${f['Site Address'] || '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Ville</div>
      <div class="field-value">${f['City'] || '—'}</div>
    </div>
  </div>

  <h2>Détails du projet</h2>
  <div class="grid">
    <div class="field">
      <div class="field-label">Type de projet</div>
      <div class="field-value">${f['Project Type'] || '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Budget</div>
      <div class="field-value">${f['Budget'] || '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Délai souhaité</div>
      <div class="field-value">${f['Desired Timeline'] || '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Maturité</div>
      <div class="field-value">${f['Maturity'] || '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Montant du devis</div>
      <div class="field-value">${f['Devis_amount'] ? f['Devis_amount'] + ' €' : '—'}</div>
    </div>
  </div>

  <h2>Analyse Kadria</h2>
  <div class="score-row">
    <div class="score-circle">${score}</div>
    <div>
      <span class="verdict-badge">${verdictLabel}</span>
    </div>
  </div>
  ${f['AI Summary'] ? `<div class="quote">${f['AI Summary']}</div>` : ''}
  <div class="indicators">
    <div class="indicator">
      <div>Budget</div>
      <div style="font-weight:700;margin-top:4px;">${f['Budget'] ? '✓' : '—'}</div>
    </div>
    <div class="indicator">
      <div>Délai</div>
      <div style="font-weight:700;margin-top:4px;">${f['Desired Timeline'] ? '✓' : '—'}</div>
    </div>
    <div class="indicator">
      <div>Contact</div>
      <div style="font-weight:700;margin-top:4px;">${(f['Client Phone'] || f['Client Email']) ? '✓' : '—'}</div>
    </div>
    <div class="indicator">
      <div>Adresse</div>
      <div style="font-weight:700;margin-top:4px;">${f['Site Address'] ? '✓' : '—'}</div>
    </div>
  </div>

  <div class="footer">
    <span>Source : ${f['Source'] || '—'}</span>
    <span>Statut : ${f['Status'] || '—'}</span>
  </div>
</body>
</html>
  `

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
