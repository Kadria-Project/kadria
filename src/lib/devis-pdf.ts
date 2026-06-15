import PDFDocument from 'pdfkit'
import type { DevisRecord, getArtisanConfig } from '@/src/lib/airtable'

type ArtisanConfig = Awaited<ReturnType<typeof getArtisanConfig>>

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

export async function generateDevisPdf(devis: DevisRecord, config: ArtisanConfig | null): Promise<Buffer> {
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

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const chunks: Buffer[] = []

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
  const accent = '#22c55e'
  const textMuted = '#71717a'
  const textDark = '#18181b'
  const border = '#e4e4e7'

  // ── Header ──────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(20).fillColor(accent).text('K', { continued: true })
  doc.fillColor(textDark).text('adria')

  doc.moveDown(0.3)
  const emetteurNom = config?.raisonSociale || config?.companyName || ''
  const emetteurAdresse = [config?.adressePro, [config?.cpPro, config?.villePro].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')

  doc.font('Helvetica-Bold').fontSize(10).fillColor(textDark).text(emetteurNom)
  doc.font('Helvetica').fontSize(9).fillColor(textMuted)
  if (emetteurAdresse) doc.text(emetteurAdresse)
  if (config?.siret) doc.text(`SIRET : ${config.siret}`)
  if (config?.tvaAssujetti && config?.tvaNumber) doc.text(`TVA : ${config.tvaNumber}`)
  if (config?.phone) doc.text(`Tél : ${config.phone}`)

  // Devis meta — top right
  doc.font('Helvetica-Bold').fontSize(16).fillColor(textDark)
    .text(`Devis ${devis.devisNumber}`, doc.page.margins.left, doc.page.margins.top, {
      width: pageWidth,
      align: 'right',
    })
  doc.font('Helvetica').fontSize(9).fillColor(textMuted)
    .text(`Date d'émission : ${formatDate(devis.dateEmission)}`, { width: pageWidth, align: 'right' })
    .text(`Valide jusqu'au : ${formatDate(devis.dateValidite)}`, { width: pageWidth, align: 'right' })

  doc.moveDown(1)
  doc.strokeColor(accent).lineWidth(2)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke()
  doc.moveDown(1)

  // ── Client ──────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(11).fillColor(textMuted).text('CLIENT')
  doc.moveDown(0.3)
  doc.font('Helvetica-Bold').fontSize(10).fillColor(textDark).text(devis.clientName || '—')
  doc.font('Helvetica').fontSize(9).fillColor(textMuted)
  if (devis.clientAddress) doc.text(devis.clientAddress)
  if (devis.clientEmail) doc.text(`Email : ${devis.clientEmail}`)
  if (devis.clientPhone) doc.text(`Téléphone : ${devis.clientPhone}`)

  if (devis.objet) {
    doc.moveDown(0.8)
    const objetY = doc.y
    doc.font('Helvetica').fontSize(10).fillColor(textDark)
    const objetHeight = doc.heightOfString(devis.objet, { width: pageWidth - 24 }) + 16
    doc.rect(doc.page.margins.left, objetY, pageWidth, objetHeight).fill('#f4f4f5')
    doc.fillColor(textDark).text(devis.objet, doc.page.margins.left + 12, objetY + 8, { width: pageWidth - 24 })
    doc.y = objetY + objetHeight
  }

  // ── Table ───────────────────────────────────────────────────────────
  doc.moveDown(1)
  doc.font('Helvetica-Bold').fontSize(11).fillColor(textMuted).text('DÉTAIL DES PRESTATIONS')
  doc.moveDown(0.5)

  const colWidths = {
    description: pageWidth * 0.40,
    qty: pageWidth * 0.15,
    pu: pageWidth * 0.15,
    tva: pageWidth * 0.10,
    total: pageWidth * 0.20,
  }
  const colX = {
    description: doc.page.margins.left,
    qty: doc.page.margins.left + colWidths.description,
    pu: doc.page.margins.left + colWidths.description + colWidths.qty,
    tva: doc.page.margins.left + colWidths.description + colWidths.qty + colWidths.pu,
    total: doc.page.margins.left + colWidths.description + colWidths.qty + colWidths.pu + colWidths.tva,
  }

  const drawTableHeader = () => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(textMuted)
    const y = doc.y
    doc.text('DESCRIPTION', colX.description, y, { width: colWidths.description })
    doc.text('QTÉ', colX.qty, y, { width: colWidths.qty, align: 'right' })
    doc.text('PU HT', colX.pu, y, { width: colWidths.pu, align: 'right' })
    doc.text('TVA', colX.tva, y, { width: colWidths.tva, align: 'right' })
    doc.text('TOTAL HT', colX.total, y, { width: colWidths.total, align: 'right' })
    doc.moveDown(0.4)
    doc.strokeColor(border).lineWidth(1)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke()
    doc.moveDown(0.4)
  }

  drawTableHeader()

  for (const line of lines) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 100) {
      doc.addPage()
      drawTableHeader()
    }

    if (line.type === 'section') {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(textDark)
        .text((line.description || '').toUpperCase(), colX.description, doc.y, { width: pageWidth })
      doc.moveDown(0.4)
      continue
    }

    const total = (line.quantity || 0) * (line.unitPrice || 0)
    const y = doc.y
    doc.font('Helvetica').fontSize(9).fillColor(textDark)
    doc.text(line.description || '', colX.description, y, { width: colWidths.description - 8 })
    const rowHeight = Math.max(doc.heightOfString(line.description || '', { width: colWidths.description - 8 }), 12)
    doc.text(`${line.quantity || 0} ${line.unit || ''}`, colX.qty, y, { width: colWidths.qty, align: 'right' })
    doc.text(formatEuro(line.unitPrice || 0), colX.pu, y, { width: colWidths.pu, align: 'right' })
    doc.text(`${line.tvaRate || 0}%`, colX.tva, y, { width: colWidths.tva, align: 'right' })
    doc.text(formatEuro(total), colX.total, y, { width: colWidths.total, align: 'right' })
    doc.y = y + rowHeight + 6
    doc.strokeColor(border).lineWidth(0.5)
      .moveTo(doc.page.margins.left, doc.y - 3)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y - 3)
      .stroke()
  }

  // ── Totaux ──────────────────────────────────────────────────────────
  doc.moveDown(1)
  if (doc.y > doc.page.height - doc.page.margins.bottom - 120) {
    doc.addPage()
  }

  const totalsWidth = 220
  const totalsX = doc.page.width - doc.page.margins.right - totalsWidth

  doc.font('Helvetica').fontSize(10).fillColor(textMuted)
  doc.text('Total HT', totalsX, doc.y, { width: totalsWidth - 80, continued: false })
  doc.text(formatEuro(devis.totalHT), totalsX + totalsWidth - 80, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' })

  for (const [rate, amount] of Object.entries(tvaBreakdown)) {
    if (!amount || amount <= 0) continue
    doc.text(`TVA (${rate}%)`, totalsX, doc.y, { width: totalsWidth - 80 })
    doc.text(formatEuro(amount), totalsX + totalsWidth - 80, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' })
  }

  doc.moveDown(0.3)
  doc.strokeColor(border).lineWidth(1)
    .moveTo(totalsX, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke()
  doc.moveDown(0.3)

  doc.font('Helvetica-Bold').fontSize(13).fillColor(textDark)
  doc.text('Total TTC', totalsX, doc.y, { width: totalsWidth - 90 })
  doc.fillColor(accent).text(formatEuro(devis.totalTTC), totalsX + totalsWidth - 90, doc.y - doc.currentLineHeight(), { width: 90, align: 'right' })

  // ── Conditions ──────────────────────────────────────────────────────
  doc.moveDown(1.5)
  if (doc.y > doc.page.height - doc.page.margins.bottom - 150) {
    doc.addPage()
  }

  doc.font('Helvetica-Bold').fontSize(11).fillColor(textMuted).text('CONDITIONS')
  doc.moveDown(0.5)
  doc.font('Helvetica').fontSize(9).fillColor(textDark)

  if (devis.conditionsPaiement) {
    doc.font('Helvetica-Bold').fontSize(9).text('Conditions de paiement : ', { continued: true })
    doc.font('Helvetica').text(devis.conditionsPaiement)
    doc.moveDown(0.3)
  }
  if (devis.delaiExecution) {
    doc.font('Helvetica-Bold').fontSize(9).text('Délai d\'exécution : ', { continued: true })
    doc.font('Helvetica').text(devis.delaiExecution)
    doc.moveDown(0.3)
  }
  if (!config?.assuranceNonRequise && config?.assureur) {
    doc.font('Helvetica-Bold').fontSize(9).text('Assurance : ', { continued: true })
    doc.font('Helvetica').text(`${config.assureur}${config.numAssurance ? ` — N° ${config.numAssurance}` : ''}`)
    doc.moveDown(0.3)
  }

  // ── Signature ───────────────────────────────────────────────────────
  doc.moveDown(1.5)
  if (doc.y > doc.page.height - doc.page.margins.bottom - 140) {
    doc.addPage()
  }

  const ville = config?.villePro || ''
  doc.font('Helvetica').fontSize(9).fillColor(textDark)
    .text(`Fait à ${ville || '—'}, le ${formatDate(new Date().toISOString())}`)
  doc.moveDown(1)

  const sigWidth = (pageWidth - 40) / 2
  const sigY = doc.y
  doc.font('Helvetica-Bold').fontSize(9).fillColor(textDark)
    .text('Bon pour accord — Signature de l\'artisan', doc.page.margins.left, sigY, { width: sigWidth })
  doc.text('Bon pour accord — Signature du client', doc.page.margins.left + sigWidth + 40, sigY, { width: sigWidth })

  const lineY = sigY + 60
  doc.strokeColor(border).lineWidth(1)
    .moveTo(doc.page.margins.left, lineY)
    .lineTo(doc.page.margins.left + sigWidth, lineY)
    .stroke()
  doc.moveTo(doc.page.margins.left + sigWidth + 40, lineY)
    .lineTo(doc.page.margins.left + sigWidth + 40 + sigWidth, lineY)
    .stroke()

  // ── Mentions légales ────────────────────────────────────────────────
  if (devis.mentionsLegales) {
    doc.moveDown(2)
    if (doc.y > doc.page.height - doc.page.margins.bottom - 60) {
      doc.addPage()
    }
    doc.strokeColor(border).lineWidth(1)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke()
    doc.moveDown(0.5)
    doc.font('Helvetica').fontSize(8).fillColor(textMuted).text(devis.mentionsLegales, { width: pageWidth })
  }

  doc.end()
  return done
}
