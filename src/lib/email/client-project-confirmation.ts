// Email de confirmation envoyee au CLIENT juste apres la creation d'un
// dossier projet (web ou Vapi), quand une adresse email client valide est
// disponible. Best-effort : ne doit jamais faire echouer la creation du
// projet (meme philosophie que sendCompletionSmsBestEffort dans
// app/api/vapi/create-project/route.ts). Reutilise le meme gabarit HTML/texte
// que les notifications artisan (base-email.ts) et le meme helper de token de
// portail client (client-portal.ts) - aucune logique dupliquee.

import { Resend } from 'resend'
import { getArtisanConfig, getUserByArtisanIdentifier } from '@/src/lib/airtable'
import { getClientPortalUrl } from '@/src/lib/client-portal'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'

// Meme regex que celle deja utilisee dans app/api/client-portal/[token]/route.ts
// et app/api/completer/[token]/route.ts - simple verification de format,
// pas de validation exhaustive RFC.
export function isValidClientEmail(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

export function normalizeClientEmail(value: string): string {
  return value.trim().toLowerCase()
}

type SummaryItem = { label: string; value: string }

export interface ClientProjectConfirmationInput {
  artisanId: string
  clientEmail: string
  clientFirstName?: string
  projectType?: string
  aiSummary?: string
  city?: string
  siteAddress?: string
  budget?: string
  desiredTimeline?: string
  clientPhone?: string
  photosCount?: number
}

function buildSummaryItems(input: ClientProjectConfirmationInput): SummaryItem[] {
  const items: SummaryItem[] = []

  if (input.projectType?.trim()) {
    items.push({ label: 'Projet', value: input.projectType.trim() })
  }

  if (input.aiSummary?.trim()) {
    items.push({ label: 'Description', value: input.aiSummary.trim() })
  }

  const addressParts = [input.siteAddress?.trim(), input.city?.trim()].filter(Boolean)
  if (addressParts.length > 0) {
    items.push({ label: 'Ville / adresse', value: addressParts.join(', ') })
  }

  if (input.budget?.trim()) {
    items.push({ label: 'Budget', value: input.budget.trim() })
  }

  if (input.desiredTimeline?.trim()) {
    items.push({ label: 'Délai souhaité', value: input.desiredTimeline.trim() })
  }

  if (input.clientPhone?.trim()) {
    items.push({ label: 'Téléphone', value: input.clientPhone.trim() })
  }

  items.push({ label: 'Email', value: normalizeClientEmail(input.clientEmail) })

  if (typeof input.photosCount === 'number' && input.photosCount > 0) {
    items.push({ label: 'Photos transmises', value: String(input.photosCount) })
  }

  return items
}

// Envoie l'email de confirmation client. Retourne true/false uniquement pour
// journalisation interne - l'appelant ne doit jamais propager d'erreur pour ce
// best-effort. Ne jamais throw hors de cette fonction.
export async function sendClientProjectConfirmationEmail(
  input: ClientProjectConfirmationInput,
  portalUrl: string,
): Promise<boolean> {
  const { artisanId, clientEmail } = input

  if (!isValidClientEmail(clientEmail)) {
    console.warn('[CLIENT CONFIRMATION EMAIL] Email client invalide, envoi ignore - artisan_id:', artisanId)
    return false
  }

  if (!portalUrl) {
    console.warn('[CLIENT CONFIRMATION EMAIL] URL de suivi manquante, envoi ignore - artisan_id:', artisanId)
    return false
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[CLIENT CONFIRMATION EMAIL] RESEND_API_KEY manquante, email non envoye')
    return false
  }

  try {
    const [artisan, config] = await Promise.all([
      getUserByArtisanIdentifier(artisanId),
      getArtisanConfig(artisanId),
    ])

    const artisanName =
      config?.raisonSociale || config?.companyName || artisan?.companyName || undefined
    const accentColor = config?.primaryColor || artisan?.primaryColor || undefined

    const firstName = input.clientFirstName?.trim()
    const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
    const introDest = artisanName ? `à ${artisanName}` : 'à votre artisan'

    const subject = artisanName
      ? `Votre demande a bien été transmise à ${artisanName}`
      : 'Votre demande a bien été transmise'

    const intro = `${greeting}\n\nVotre demande a bien été transmise ${introDest}.\n\nVoici le récapitulatif des informations reçues :`

    const body =
      "Vous pouvez compléter votre demande, ajouter des précisions ou suivre son avancement depuis votre espace sécurisé, sans création de compte."

    const summaryItems = buildSummaryItems(input)

    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'devis@kadria.fr',
      to: normalizeClientEmail(clientEmail),
      subject,
      text: renderBaseEmailText({
        preheader: subject,
        title: subject,
        intro,
        body,
        ctaLabel: 'Compléter ou suivre ma demande',
        ctaUrl: portalUrl,
        summaryItems,
        artisanName,
      }),
      html: renderBaseEmail({
        preheader: subject,
        title: subject,
        intro,
        body,
        ctaLabel: 'Compléter ou suivre ma demande',
        ctaUrl: portalUrl,
        summaryItems,
        artisanName,
        accentColor,
      }),
    })

    if (result.error) {
      console.error('[CLIENT CONFIRMATION EMAIL] Resend error:', result.error)
      return false
    }

    console.log('[CLIENT CONFIRMATION EMAIL] Email envoye - artisan_id:', artisanId)
    return true
  } catch (error) {
    console.error(
      '[CLIENT CONFIRMATION EMAIL] Echec envoi email client:',
      error instanceof Error ? error.message : String(error),
    )
    return false
  }
}

export interface ClientProjectConfirmationBestEffortInput extends ClientProjectConfirmationInput {
  projectId: string
}

// Point d'entree unique a appeler juste apres l'insertion reussie d'un projet
// (web ou Vapi). Genere/recupere le token de portail client via
// ensureClientPortalToken (aucune logique de token dupliquee), puis envoie
// l'email. Best-effort total : ne leve jamais, ne bloque jamais la creation
// du projet, se degrade silencieusement (log discret) si email absent/invalide,
// projectId/artisanId absents, ou token non generable.
export async function sendClientProjectConfirmationEmailBestEffort(
  input: ClientProjectConfirmationBestEffortInput,
): Promise<void> {
  const { projectId, artisanId, clientEmail } = input

  try {
    if (!projectId || !artisanId) {
      console.warn('[CLIENT CONFIRMATION EMAIL] projectId ou artisanId manquant, envoi ignore')
      return
    }

    if (!isValidClientEmail(clientEmail)) {
      // Pas d'email client (ou format invalide) : aucun envoi, aucune erreur,
      // ne bloque jamais la creation du projet.
      console.log('[CLIENT CONFIRMATION EMAIL] Pas d\'email client valide - projectId:', projectId)
      return
    }

    const portalUrl = await getClientPortalUrl(projectId, artisanId)
    if (!portalUrl) {
      // Token non generable : on ne veut jamais envoyer un lien casse, on
      // saute simplement l'email client dans ce cas limite.
      console.error('[CLIENT CONFIRMATION EMAIL] Token portail indisponible, email non envoye - projectId:', projectId)
      return
    }

    await sendClientProjectConfirmationEmail(input, portalUrl)
  } catch (error) {
    console.error(
      '[CLIENT CONFIRMATION EMAIL] Erreur inattendue (best-effort) - projectId:',
      projectId,
      '-',
      error instanceof Error ? error.message : String(error),
    )
  }
}
