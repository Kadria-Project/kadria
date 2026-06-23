import { NextRequest, NextResponse } from 'next/server'
import { getArtisanConfig, getDevisById } from '@/src/lib/airtable'
import { requireFeatureAccess } from '@/src/lib/auth-utils'
import { formatFullAddress, getPricingMention, getVatExemptionMention, getInsuranceLines, getDelayMention, getLaborMention, getTravelFeeMention } from '@/src/lib/devis-legal'
import type { QuoteCommercialSettings } from '@/src/lib/quote-suggestions'

interface DevisLine {
  type: 'item' | 'section'
  description: string
  quantity: number
  unit: string
  unitPrice: number
  tvaRate: number
}

function formatEuro(value: number) {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function formatDate(value: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireFeatureAccess('quoteGeneration')
  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status })
  }
  const session = access.session

  const { id } = await params
  const devis = await getDevisById(id)

  if (!devis) {
    return NextResponse.json({ success: false, error: 'Devis introuvable' }, { status: 404 })
  }

  if (devis.artisanId !== session.artisanId) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
  }

  const config = await getArtisanConfig(devis.artisanId)

  let lines: DevisLine[] = []
  try {
    const parsed = JSON.parse(devis.lignesJson)
    if (Array.isArray(parsed)) lines = parsed
  } catch {
    lines = []
  }

  let tvaBreakdown: Record<string, number> = {}
  try {
    const parsed = JSON.parse(devis.tvaBreakdownJson)
    if (parsed && typeof parsed === 'object') tvaBreakdown = parsed
  } catch {
    tvaBreakdown = {}
  }

  const emetteurNom = config?.raisonSociale || config?.companyName || ''
  const emetteurAdresse = formatFullAddress({ address: config?.adressePro, postalCode: config?.cpPro, city: config?.villePro })

  const quoteSettings = (config?.businessConfig as { quoteSettings?: QuoteCommercialSettings } | undefined)?.quoteSettings
  const pricingMention = getPricingMention(quoteSettings)
  const vatExemptionMention = getVatExemptionMention(quoteSettings?.vatMode)
  const insuranceLines = getInsuranceLines({
    ...quoteSettings,
    insuranceCompany: quoteSettings?.insuranceCompany || config?.assureur,
    insurancePolicyNumber: quoteSettings?.insurancePolicyNumber || config?.numAssurance,
  })
  const fallbackInsuranceMention = !insuranceLines && config?.assuranceNonRequise === false && config?.assureur
    ? `Assurance : ${config.assureur}${config?.numAssurance ? ` — N° ${config.numAssurance}` : ''}`
    : null
  const delayMention = getDelayMention(devis.delaiExecution, quoteSettings?.defaultEstimatedDelay)
  const laborMention = getLaborMention(quoteSettings?.laborMentionMode, lines)
  const travelFeeMention = getTravelFeeMention(quoteSettings?.travelFeeMentionMode, lines)
  const sameAsClient = !!devis.clientAddress

  const linesHtml = lines
    .map((line) => {
      if (line.type === 'section') {
        return `
          <tr class="section-row">
            <td colspan="5">${line.description || ''}</td>
          </tr>
        `
      }
      const total = (line.quantity || 0) * (line.unitPrice || 0)
      return `
        <tr>
          <td>${line.description || ''}</td>
          <td class="num">${line.quantity || 0} ${line.unit || ''}</td>
          <td class="num">${formatEuro(line.unitPrice || 0)}</td>
          <td class="num">${line.tvaRate || 0}%</td>
          <td class="num">${formatEuro(total)}</td>
        </tr>
      `
    })
    .join('')

  const tvaBreakdownHtml = Object.entries(tvaBreakdown)
    .filter(([, amount]) => amount > 0)
    .map(([rate, amount]) => `
      <div class="total-row">
        <span>TVA (${rate}%)</span>
        <span>${formatEuro(amount)}</span>
      </div>
    `)
    .join('')

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Devis ${devis.devisNumber}</title>
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
    align-items: flex-start;
    border-bottom: 2px solid #22c55e;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .logo { font-size: 24px; font-weight: 800; }
  .logo .k { color: #22c55e; }
  .company { margin-top: 8px; font-size: 12px; color: #71717a; line-height: 1.5; }
  .devis-meta { text-align: right; }
  .devis-meta h1 { font-size: 22px; margin: 0 0 8px; }
  .devis-meta .field-label { color: #71717a; font-size: 12px; }
  .devis-meta .field-value { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
  h2 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #71717a;
    margin: 24px 0 12px;
    border-bottom: 1px solid #e4e4e7;
    padding-bottom: 6px;
  }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field { font-size: 14px; }
  .field-label { color: #71717a; font-size: 12px; margin-bottom: 2px; }
  .field-value { font-weight: 600; }
  .objet {
    background: #f4f4f5;
    border-left: 3px solid #22c55e;
    padding: 12px 16px;
    font-size: 14px;
    margin: 12px 0;
  }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; padding: 8px; border-bottom: 1px solid #e4e4e7; }
  td { padding: 8px; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  th.num { text-align: right; }
  .section-row td { font-weight: 700; text-transform: uppercase; font-size: 12px; background: #f4f4f5; border-bottom: none; }
  .totals { display: flex; justify-content: flex-end; margin-top: 16px; }
  .totals-box { width: 280px; }
  .total-row { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; color: #52525b; }
  .total-row.ttc { font-weight: 800; font-size: 16px; color: #18181b; border-top: 1px solid #e4e4e7; margin-top: 6px; padding-top: 8px; }
  .conditions { font-size: 13px; color: #3f3f46; white-space: pre-wrap; line-height: 1.6; }
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #e4e4e7;
    font-size: 11px;
    color: #a1a1aa;
    white-space: pre-wrap;
    line-height: 1.6;
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo"><span class="k">K</span>adria</div>
      <div class="company">
        <strong>${emetteurNom}</strong><br/>
        ${config?.formeJuridique ? `${config.formeJuridique}<br/>` : ''}
        ${emetteurAdresse}<br/>
        ${config?.siret ? `SIRET : ${config.siret}<br/>` : ''}
        ${vatExemptionMention ? `${vatExemptionMention}<br/>` : (config?.tvaAssujetti && config?.tvaNumber ? `TVA : ${config.tvaNumber}<br/>` : '')}
        ${config?.phone ? `Tél : ${config.phone}<br/>` : ''}
        ${config?.email ? `Email : ${config.email}` : ''}
      </div>
    </div>
    <div class="devis-meta">
      <h1>Devis ${devis.devisNumber}</h1>
      <div class="field-label">Date d'émission</div>
      <div class="field-value">${formatDate(devis.dateEmission)}</div>
      <div class="field-label">Valide jusqu'au</div>
      <div class="field-value">${formatDate(devis.dateValidite)}</div>
      ${pricingMention ? `<div class="field-label">${pricingMention}</div>` : ''}
    </div>
  </div>

  <h2>Client</h2>
  <div class="grid">
    <div class="field">
      <div class="field-label">Nom</div>
      <div class="field-value">${devis.clientName || '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Email</div>
      <div class="field-value">${devis.clientEmail || '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Téléphone</div>
      <div class="field-value">${devis.clientPhone || '—'}</div>
    </div>
  </div>

  <h2>Lieu d'exécution</h2>
  <div class="grid">
    <div class="field">
      <div class="field-label">Adresse du chantier</div>
      <div class="field-value">${sameAsClient ? devis.clientAddress : '—'}</div>
    </div>
  </div>

  ${devis.objet ? `<div class="objet">${devis.objet}</div>` : ''}

  <h2>Détail des prestations</h2>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qté</th>
        <th class="num">Prix unitaire HT</th>
        <th class="num">TVA</th>
        <th class="num">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${linesHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row">
        <span>Total HT</span>
        <span>${formatEuro(devis.totalHT)}</span>
      </div>
      ${vatExemptionMention ? `<div class="total-row"><span>${vatExemptionMention}</span></div>` : tvaBreakdownHtml}
      <div class="total-row ttc">
        <span>Total TTC</span>
        <span>${formatEuro(devis.totalTTC)}</span>
      </div>
    </div>
  </div>

  <h2>Conditions</h2>
  <div class="conditions">
    ${devis.conditionsPaiement ? `<p><strong>Conditions de paiement :</strong> ${devis.conditionsPaiement}</p>` : ''}
    <p><strong>Délai d'intervention :</strong> ${delayMention}</p>
    ${laborMention ? `<p>${laborMention}</p>` : ''}
    ${travelFeeMention ? `<p>${travelFeeMention}</p>` : ''}
    ${insuranceLines ? `<p>${insuranceLines.map((l, i) => i === 0 ? `<strong>${l}</strong>` : l).join('<br/>')}</p>` : ''}
    ${fallbackInsuranceMention ? `<p><strong>${fallbackInsuranceMention}</strong></p>` : ''}
  </div>

  ${devis.mentionsLegales ? `<div class="footer">${devis.mentionsLegales}</div>` : ''}
</body>
</html>
  `

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
