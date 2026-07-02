type SummaryItem = {
  label: string
  value: string
}

type RenderBaseEmailOptions = {
  preheader?: string
  brand?: string
  title: string
  intro?: string
  body?: string
  ctaLabel?: string
  ctaUrl?: string
  secondaryText?: string
  summaryItems?: SummaryItem[]
  artisanName?: string
  footerNote?: string
  accentColor?: string
}

const DEFAULT_ACCENT = '#16a34a'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeParagraphs(value?: string): string[] {
  if (!value) return []
  return value
    .split('\n\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

export function renderButton(label: string, url: string, accentColor = DEFAULT_ACCENT): string {
  return `
    <div style="margin:24px 0 0;">
      <a
        href="${url}"
        style="display:inline-block;background:${accentColor};color:#ffffff;text-decoration:none;font-weight:700;border-radius:10px;padding:14px 22px;font-size:15px;"
      >
        ${escapeHtml(label)}
      </a>
    </div>
  `
}

export function renderInfoBox(items: SummaryItem[] = []): string {
  if (items.length === 0) return ''

  const rows = items
    .map((item) => `
      <tr>
        <td style="padding:0 0 10px;vertical-align:top;font-size:13px;font-weight:600;color:#6b7280;width:38%;">
          ${escapeHtml(item.label)}
        </td>
        <td style="padding:0 0 10px;vertical-align:top;font-size:13px;color:#111827;">
          ${escapeHtml(item.value)}
        </td>
      </tr>
    `)
    .join('')

  return `
    <div style="margin:24px 0 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${rows}
      </table>
    </div>
  `
}

export function renderFooter(artisanName?: string, footerNote?: string): string {
  const senderLine = artisanName
    ? `Envoyé avec Kadria pour ${escapeHtml(artisanName)}.`
    : 'Envoyé avec Kadria.'

  return `
    <div style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;background:#fcfcfb;">
      <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#6b7280;">
        ${senderLine}
      </p>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
        ${escapeHtml(footerNote || 'Kadria aide les artisans à qualifier, suivre et sécuriser leurs demandes clients.')}
      </p>
    </div>
  `
}

function renderTextSummary(items: SummaryItem[] = []): string {
  if (items.length === 0) return ''
  return items.map((item) => `- ${item.label} : ${item.value}`).join('\n')
}

export function renderBaseEmail(options: RenderBaseEmailOptions): string {
  const accentColor = options.accentColor || DEFAULT_ACCENT
  const preheader = options.preheader || options.title
  const introParagraphs = normalizeParagraphs(options.intro)
  const bodyParagraphs = normalizeParagraphs(options.body)
  const summaryHtml = renderInfoBox(options.summaryItems)
  const ctaHtml = options.ctaLabel && options.ctaUrl
    ? renderButton(options.ctaLabel, options.ctaUrl, accentColor)
    : ''
  const secondaryTextHtml = options.secondaryText
    ? `<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">${escapeHtml(options.secondaryText)}</p>`
    : ''

  const paragraphs = [...introParagraphs, ...bodyParagraphs]
    .map((paragraph) => `
      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
        ${escapeHtml(paragraph).replace(/\n/g, '<br>')}
      </p>
    `)
    .join('')

  return `
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(options.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7f3;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f7f3;">
      <tr>
        <td style="padding:24px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 16px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${accentColor};margin-bottom:14px;">
                  ${escapeHtml(options.brand || 'Kadria')}
                </div>
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#111827;">
                  ${escapeHtml(options.title)}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                ${paragraphs}
                ${summaryHtml}
                ${ctaHtml}
                ${secondaryTextHtml}
              </td>
            </tr>
            <tr>
              <td>
                ${renderFooter(options.artisanName, options.footerNote)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `
}

export function renderBaseEmailText(options: RenderBaseEmailOptions): string {
  const preheader = options.preheader || options.title
  const introParagraphs = normalizeParagraphs(options.intro)
  const bodyParagraphs = normalizeParagraphs(options.body)
  const sections = [
    preheader,
    '',
    ...introParagraphs,
    ...bodyParagraphs,
  ]

  if (options.summaryItems?.length) {
    sections.push('', renderTextSummary(options.summaryItems))
  }

  if (options.ctaLabel && options.ctaUrl) {
    sections.push('', `${options.ctaLabel} : ${options.ctaUrl}`)
  }

  if (options.secondaryText) {
    sections.push('', options.secondaryText)
  }

  sections.push(
    '',
    options.artisanName
      ? `Envoye avec Kadria pour ${options.artisanName}.`
      : 'Envoye avec Kadria.',
    options.footerNote || 'Kadria aide les artisans a qualifier, suivre et securiser leurs demandes clients.',
  )

  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
