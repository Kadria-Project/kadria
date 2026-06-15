import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, RGB } from 'pdf-lib'
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

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const ACCENT = rgb(0x22 / 255, 0xc5 / 255, 0x5e / 255)
const TEXT_MUTED = rgb(0x71 / 255, 0x71 / 255, 0x7a / 255)
const TEXT_DARK = rgb(0x18 / 255, 0x18 / 255, 0x1b / 255)
const BORDER = rgb(0xe4 / 255, 0xe4 / 255, 0xe7 / 255)
const BG = rgb(0xf4 / 255, 0xf4 / 255, 0xf5 / 255)

function formatEuro(value: number) {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function formatDate(value: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (current && font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

class PdfWriter {
  doc: PDFDocument
  page!: PDFPage
  y = MARGIN

  constructor(doc: PDFDocument) {
    this.doc = doc
    this.addPage()
  }

  addPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    this.y = MARGIN
  }

  ensureSpace(height: number, onNewPage?: () => void) {
    if (this.y + height > PAGE_HEIGHT - MARGIN) {
      this.addPage()
      onNewPage?.()
    }
  }

  // Height a block of (possibly multi-line) text would take.
  heightOf(text: string, font: PDFFont, size: number, width: number, lineHeight = size * 1.3) {
    let lines = 0
    for (const para of text.split('\n')) {
      lines += wrapText(para, font, size, width).length
    }
    return lines * lineHeight
  }

  // Draws text wrapped at the given top-relative y, without moving the cursor.
  // Returns the height consumed.
  drawAt(
    text: string,
    x: number,
    topY: number,
    width: number,
    size: number,
    font: PDFFont,
    color: RGB,
    align: 'left' | 'right' = 'left',
    lineHeight = size * 1.3
  ) {
    let cy = topY
    for (const para of text.split('\n')) {
      const lines = wrapText(para, font, size, width)
      for (const line of lines) {
        const lineWidth = font.widthOfTextAtSize(line, size)
        const xPos = align === 'right' ? x + width - lineWidth : x
        this.page.drawText(line, { x: xPos, y: PAGE_HEIGHT - cy - size, size, font, color })
        cy += lineHeight
      }
    }
    return cy - topY
  }

  // Draws wrapped text at the current cursor and advances it.
  text(
    text: string,
    font: PDFFont,
    size: number,
    color: RGB,
    options: { x?: number; width?: number; align?: 'left' | 'right' } = {}
  ) {
    const x = options.x ?? MARGIN
    const width = options.width ?? CONTENT_WIDTH
    const height = this.drawAt(text, x, this.y, width, size, font, color, options.align)
    this.y += height
    return height
  }

  hLine(color: RGB = BORDER, thickness = 1, width = CONTENT_WIDTH, x = MARGIN) {
    this.page.drawLine({
      start: { x, y: PAGE_HEIGHT - this.y },
      end: { x: x + width, y: PAGE_HEIGHT - this.y },
      thickness,
      color,
    })
  }

  lineAt(x1: number, y1: number, x2: number, y2: number, color: RGB = BORDER, thickness = 1) {
    this.page.drawLine({
      start: { x: x1, y: PAGE_HEIGHT - y1 },
      end: { x: x2, y: PAGE_HEIGHT - y2 },
      thickness,
      color,
    })
  }

  rect(x: number, topY: number, width: number, height: number, color: RGB) {
    this.page.drawRectangle({ x, y: PAGE_HEIGHT - topY - height, width, height, color })
  }
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

  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const w = new PdfWriter(pdfDoc)

  // ── Header ──────────────────────────────────────────────────────────
  const headerTop = w.y
  w.page.drawText('K', { x: MARGIN, y: PAGE_HEIGHT - headerTop - 20, size: 20, font: fontBold, color: ACCENT })
  const kWidth = fontBold.widthOfTextAtSize('K', 20)
  w.page.drawText('adria', { x: MARGIN + kWidth, y: PAGE_HEIGHT - headerTop - 20, size: 20, font: fontBold, color: TEXT_DARK })
  w.y = headerTop + 20 * 1.3 + 6

  const emetteurNom = config?.raisonSociale || config?.companyName || ''
  const emetteurAdresse = [config?.adressePro, [config?.cpPro, config?.villePro].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')

  const leftStartY = w.y
  w.text(emetteurNom, fontBold, 10, TEXT_DARK)
  if (emetteurAdresse) w.text(emetteurAdresse, fontRegular, 9, TEXT_MUTED)
  if (config?.siret) w.text(`SIRET : ${config.siret}`, fontRegular, 9, TEXT_MUTED)
  if (config?.tvaAssujetti && config?.tvaNumber) w.text(`TVA : ${config.tvaNumber}`, fontRegular, 9, TEXT_MUTED)
  if (config?.phone) w.text(`Tél : ${config.phone}`, fontRegular, 9, TEXT_MUTED)
  const leftHeight = w.y - leftStartY

  // Devis meta — top right
  let rightHeight = 0
  rightHeight += w.drawAt(`Devis ${devis.devisNumber}`, MARGIN, headerTop, CONTENT_WIDTH, 16, fontBold, TEXT_DARK, 'right')
  rightHeight += w.drawAt(`Date d'émission : ${formatDate(devis.dateEmission)}`, MARGIN, headerTop + rightHeight, CONTENT_WIDTH, 9, fontRegular, TEXT_MUTED, 'right')
  rightHeight += w.drawAt(`Valide jusqu'au : ${formatDate(devis.dateValidite)}`, MARGIN, headerTop + rightHeight, CONTENT_WIDTH, 9, fontRegular, TEXT_MUTED, 'right')

  w.y = headerTop + Math.max(leftHeight, rightHeight) + 12

  w.hLine(ACCENT, 2)
  w.y += 12

  // ── Client ──────────────────────────────────────────────────────────
  w.text('CLIENT', fontBold, 11, TEXT_MUTED)
  w.y += 4
  w.text(devis.clientName || '—', fontBold, 10, TEXT_DARK)
  if (devis.clientAddress) w.text(devis.clientAddress, fontRegular, 9, TEXT_MUTED)
  if (devis.clientEmail) w.text(`Email : ${devis.clientEmail}`, fontRegular, 9, TEXT_MUTED)
  if (devis.clientPhone) w.text(`Téléphone : ${devis.clientPhone}`, fontRegular, 9, TEXT_MUTED)

  if (devis.objet) {
    w.y += 10
    const objetHeight = w.heightOf(devis.objet, fontRegular, 10, CONTENT_WIDTH - 24) + 16
    w.rect(MARGIN, w.y, CONTENT_WIDTH, objetHeight, BG)
    w.drawAt(devis.objet, MARGIN + 12, w.y + 8, CONTENT_WIDTH - 24, 10, fontRegular, TEXT_DARK)
    w.y += objetHeight
  }

  // ── Table ───────────────────────────────────────────────────────────
  w.y += 12
  w.text('DÉTAIL DES PRESTATIONS', fontBold, 11, TEXT_MUTED)
  w.y += 6

  const colWidths = {
    description: CONTENT_WIDTH * 0.40,
    qty: CONTENT_WIDTH * 0.15,
    pu: CONTENT_WIDTH * 0.15,
    tva: CONTENT_WIDTH * 0.10,
    total: CONTENT_WIDTH * 0.20,
  }
  const colX = {
    description: MARGIN,
    qty: MARGIN + colWidths.description,
    pu: MARGIN + colWidths.description + colWidths.qty,
    tva: MARGIN + colWidths.description + colWidths.qty + colWidths.pu,
    total: MARGIN + colWidths.description + colWidths.qty + colWidths.pu + colWidths.tva,
  }

  const drawTableHeader = () => {
    const headerHeight = 8 * 1.3
    w.drawAt('DESCRIPTION', colX.description, w.y, colWidths.description, 8, fontBold, TEXT_MUTED)
    w.drawAt('QTÉ', colX.qty, w.y, colWidths.qty, 8, fontBold, TEXT_MUTED, 'right')
    w.drawAt('PU HT', colX.pu, w.y, colWidths.pu, 8, fontBold, TEXT_MUTED, 'right')
    w.drawAt('TVA', colX.tva, w.y, colWidths.tva, 8, fontBold, TEXT_MUTED, 'right')
    w.drawAt('TOTAL HT', colX.total, w.y, colWidths.total, 8, fontBold, TEXT_MUTED, 'right')
    w.y += headerHeight + 4
    w.hLine()
    w.y += 4
  }

  drawTableHeader()

  for (const line of lines) {
    if (line.type === 'section') {
      w.ensureSpace(9 * 1.3 + 4, drawTableHeader)
      w.drawAt((line.description || '').toUpperCase(), colX.description, w.y, CONTENT_WIDTH, 9, fontBold, TEXT_DARK)
      w.y += 9 * 1.3 + 4
      continue
    }

    const descLines = wrapText(line.description || '', fontRegular, 9, colWidths.description - 8)
    const rowHeight = Math.max(descLines.length * 9 * 1.3, 12) + 6

    w.ensureSpace(rowHeight, drawTableHeader)

    const total = (line.quantity || 0) * (line.unitPrice || 0)
    w.drawAt(line.description || '', colX.description, w.y, colWidths.description - 8, 9, fontRegular, TEXT_DARK)
    w.drawAt(`${line.quantity || 0} ${line.unit || ''}`, colX.qty, w.y, colWidths.qty, 9, fontRegular, TEXT_DARK, 'right')
    w.drawAt(formatEuro(line.unitPrice || 0), colX.pu, w.y, colWidths.pu, 9, fontRegular, TEXT_DARK, 'right')
    w.drawAt(`${line.tvaRate || 0}%`, colX.tva, w.y, colWidths.tva, 9, fontRegular, TEXT_DARK, 'right')
    w.drawAt(formatEuro(total), colX.total, w.y, colWidths.total, 9, fontRegular, TEXT_DARK, 'right')

    w.y += rowHeight
    w.hLine(BORDER, 0.5)
  }

  // ── Totaux ──────────────────────────────────────────────────────────
  w.y += 12
  w.ensureSpace(120)

  const totalsWidth = 220
  const totalsX = PAGE_WIDTH - MARGIN - totalsWidth

  w.drawAt('Total HT', totalsX, w.y, totalsWidth - 80, 10, fontRegular, TEXT_MUTED)
  w.drawAt(formatEuro(devis.totalHT), totalsX + totalsWidth - 80, w.y, 80, 10, fontRegular, TEXT_MUTED, 'right')
  w.y += 10 * 1.3

  for (const [rate, amount] of Object.entries(tvaBreakdown)) {
    if (!amount || amount <= 0) continue
    w.drawAt(`TVA (${rate}%)`, totalsX, w.y, totalsWidth - 80, 10, fontRegular, TEXT_MUTED)
    w.drawAt(formatEuro(amount), totalsX + totalsWidth - 80, w.y, 80, 10, fontRegular, TEXT_MUTED, 'right')
    w.y += 10 * 1.3
  }

  w.y += 4
  w.lineAt(totalsX, w.y, PAGE_WIDTH - MARGIN, w.y)
  w.y += 4

  w.drawAt('Total TTC', totalsX, w.y, totalsWidth - 90, 13, fontBold, TEXT_DARK)
  w.drawAt(formatEuro(devis.totalTTC), totalsX + totalsWidth - 90, w.y, 90, 13, fontBold, ACCENT, 'right')
  w.y += 13 * 1.3

  // ── Conditions ──────────────────────────────────────────────────────
  w.y += 20
  w.ensureSpace(150)

  w.text('CONDITIONS', fontBold, 11, TEXT_MUTED)
  w.y += 6

  if (devis.conditionsPaiement) {
    const label = 'Conditions de paiement : '
    const labelWidth = fontBold.widthOfTextAtSize(label, 9)
    w.drawAt(label, MARGIN, w.y, labelWidth, 9, fontBold, TEXT_DARK)
    const h = w.drawAt(devis.conditionsPaiement, MARGIN + labelWidth, w.y, CONTENT_WIDTH - labelWidth, 9, fontRegular, TEXT_DARK)
    w.y += Math.max(h, 9 * 1.3) + 4
  }
  if (devis.delaiExecution) {
    const label = "Délai d'exécution : "
    const labelWidth = fontBold.widthOfTextAtSize(label, 9)
    w.drawAt(label, MARGIN, w.y, labelWidth, 9, fontBold, TEXT_DARK)
    const h = w.drawAt(devis.delaiExecution, MARGIN + labelWidth, w.y, CONTENT_WIDTH - labelWidth, 9, fontRegular, TEXT_DARK)
    w.y += Math.max(h, 9 * 1.3) + 4
  }
  if (!config?.assuranceNonRequise && config?.assureur) {
    const label = 'Assurance : '
    const labelWidth = fontBold.widthOfTextAtSize(label, 9)
    const value = `${config.assureur}${config.numAssurance ? ` — N° ${config.numAssurance}` : ''}`
    w.drawAt(label, MARGIN, w.y, labelWidth, 9, fontBold, TEXT_DARK)
    const h = w.drawAt(value, MARGIN + labelWidth, w.y, CONTENT_WIDTH - labelWidth, 9, fontRegular, TEXT_DARK)
    w.y += Math.max(h, 9 * 1.3) + 4
  }

  // ── Signature ───────────────────────────────────────────────────────
  w.y += 20
  w.ensureSpace(140)

  const ville = config?.villePro || ''
  w.text(`Fait à ${ville || '—'}, le ${formatDate(new Date().toISOString())}`, fontRegular, 9, TEXT_DARK)
  w.y += 14

  const sigWidth = (CONTENT_WIDTH - 40) / 2
  const sigY = w.y
  w.drawAt("Bon pour accord — Signature de l'artisan", MARGIN, sigY, sigWidth, 9, fontBold, TEXT_DARK)
  w.drawAt('Bon pour accord — Signature du client', MARGIN + sigWidth + 40, sigY, sigWidth, 9, fontBold, TEXT_DARK)

  const lineY = sigY + 60
  w.lineAt(MARGIN, lineY, MARGIN + sigWidth, lineY)
  w.lineAt(MARGIN + sigWidth + 40, lineY, MARGIN + sigWidth + 40 + sigWidth, lineY)
  w.y = lineY

  // ── Mentions légales ────────────────────────────────────────────────
  if (devis.mentionsLegales) {
    w.y += 30
    w.ensureSpace(60)
    w.hLine()
    w.y += 8
    w.text(devis.mentionsLegales, fontRegular, 8, TEXT_MUTED)
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
