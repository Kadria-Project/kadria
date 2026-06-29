// Helper de branding pour les e-mails devis (envoi initial + relances).
// Reutilise resolveDevisBranding (source de verite unique, deja appliquee au
// PDF et aux pages devis web) — aucune logique de plan/marque blanche n'est
// dupliquee ici, on ne fait que deriver le rendu HTML email a partir du
// resultat resolu.
import { resolveDevisBranding, type ResolvedDevisBranding } from '@/src/lib/devis-branding'

export interface DevisEmailBrandingInput {
  plan: string | null | undefined
  whiteLabelEnabled: boolean | null | undefined
  widgetBrandName?: string | null
  widgetBrandLogoUrl?: string | null
  logoUrl?: string | null
  companyName?: string | null
  raisonSociale?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
}

// Echappement HTML minimal — reutilise le meme principe que celui deja
// present dans app/api/devis/[id]/pdf/route.ts pour eviter d'injecter du
// HTML non echappe depuis des champs artisan/client dans les emails.
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
}

export interface DevisEmailBranding extends ResolvedDevisBranding {
  // HTML pret a inserer dans le header de l'email : logo artisan (avec
  // fallback texte natif via onerror) en marque blanche active, sinon header
  // Kadria existant.
  headerHtml: string
  // CTA color a utiliser pour les boutons de l'email (toujours echappee/safe,
  // c'est un code hex controle par resolveDevisBranding).
  ctaColor: string
  brandNameEscaped: string
}

export function resolveDevisEmailBranding(input: DevisEmailBrandingInput): DevisEmailBranding {
  const branding = resolveDevisBranding(input)
  const brandNameEscaped = escapeHtml(branding.brandName)

  const headerHtml = branding.isWhiteLabelActive
    ? (branding.brandLogoUrl
        ? `<img src="${escapeHtml(branding.brandLogoUrl)}" alt="${brandNameEscaped}" style="max-height:32px;max-width:220px;" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div style=&quot;font-size:20px;font-weight:800;color:#111827;&quot;>${brandNameEscaped}</div>')" />`
        : `<div style="font-size:20px;font-weight:800;color:#111827;">${brandNameEscaped}</div>`)
    : `<div style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-1px;">KA<span style="color:#22c55e;">DRIA</span></div>`

  return {
    ...branding,
    headerHtml,
    ctaColor: branding.isWhiteLabelActive ? branding.primaryColor : '#22c55e',
    brandNameEscaped,
  }
}
