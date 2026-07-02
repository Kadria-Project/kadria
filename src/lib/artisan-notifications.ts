// Source unique pour les notifications email envoyees a l'artisan (jamais au
// prospect/client final). Tout evenement metier qui doit prevenir l'artisan
// passe par une des fonctions ci-dessous plutot que d'appeler Resend
// directement depuis une route.

import { Resend } from 'resend'
import { TABLES, getArtisanConfig, getUserByArtisanIdentifier } from '@/src/lib/airtable'
import { getBaseUrl } from '@/src/lib/base-url'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function formatAmount(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0)
}

export function getArtisanProjectUrl(projectId: string): string {
  return `${getBaseUrl()}/dashboard-v2/projet/${projectId}`
}

async function logArtisanNotificationActivity(projectId: string | undefined, description: string) {
  if (!projectId) return
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action: 'ARTISAN_NOTIFICATION',
    description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[ARTISAN NOTIFICATIONS] Activity insert error:', JSON.stringify(error, null, 2))
  }
}

type SummaryItem = { label: string; value: string }

type SendArtisanEmailParams = {
  artisanId: string
  projectId?: string
  subject: string
  title: string
  intro?: string
  body?: string
  ctaLabel?: string
  ctaUrl?: string
  summaryItems?: SummaryItem[]
  eventLabel: string
}

async function sendArtisanEmail(params: SendArtisanEmailParams): Promise<boolean> {
  const { artisanId, projectId, subject, title, intro, body, ctaLabel, ctaUrl, summaryItems, eventLabel } = params

  try {
    const [artisan, config] = await Promise.all([
      getUserByArtisanIdentifier(artisanId),
      getArtisanConfig(artisanId),
    ])
    const recipientEmail = config?.notificationEmail || artisan?.email
    if (!recipientEmail) {
      console.error(`[ARTISAN NOTIFICATIONS] Email artisan manquant pour artisan_id=${artisanId} (${eventLabel})`)
      await logArtisanNotificationActivity(projectId, `Notification artisan non envoyee - email artisan manquant (${eventLabel}).`)
      return false
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error(`[ARTISAN NOTIFICATIONS] RESEND_API_KEY manquante, notification non envoyee (${eventLabel})`)
      return false
    }

    const artisanName = config?.raisonSociale || config?.companyName || artisan?.companyName || 'Votre artisan'
    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'devis@kadria.fr',
      to: recipientEmail,
      subject,
      text: renderBaseEmailText({
        preheader: subject,
        title,
        intro,
        body,
        ctaLabel,
        ctaUrl,
        summaryItems,
        artisanName,
      }),
      html: renderBaseEmail({
        preheader: subject,
        title,
        intro,
        body,
        ctaLabel,
        ctaUrl,
        summaryItems,
        artisanName,
      }),
    })

    if (result.error) {
      console.error(`[ARTISAN NOTIFICATIONS] Resend error (${eventLabel}):`, result.error)
      return false
    }

    await logArtisanNotificationActivity(projectId, `Notification artisan envoyee - ${eventLabel}.`)
    return true
  } catch (error) {
    console.error(`[ARTISAN NOTIFICATIONS] Echec envoi notification (${eventLabel}):`, error instanceof Error ? error.message : String(error))
    return false
  }
}

export async function notifyArtisanNewProject(params: {
  artisanId: string
  projectId: string
  clientName: string
  projectType: string
  city: string
  priority?: string
}): Promise<boolean> {
  const projectUrl = getArtisanProjectUrl(params.projectId)

  return sendArtisanEmail({
    artisanId: params.artisanId,
    projectId: params.projectId,
    eventLabel: 'nouveau dossier',
    subject: `Nouveau dossier qualifie - ${params.clientName || 'Prospect'}`,
    title: 'Nouveau dossier qualifie',
    intro: "Un nouveau dossier vient d'etre qualifie.",
    ctaLabel: 'Voir le dossier',
    ctaUrl: projectUrl,
    summaryItems: [
      { label: 'Client', value: params.clientName || 'Non renseigne' },
      { label: 'Type de projet', value: params.projectType || 'Non renseigne' },
      { label: 'Commune', value: params.city || 'Non renseignee' },
      ...(params.priority ? [{ label: 'Priorite', value: params.priority }] : []),
    ],
  })
}

export async function notifyArtisanQuoteAccepted(params: {
  artisanId: string
  projectId: string
  devisNumber: string
  clientName: string
  projectType: string
  city: string
  totalTTC: number
}): Promise<boolean> {
  const projectUrl = getArtisanProjectUrl(params.projectId)

  return sendArtisanEmail({
    artisanId: params.artisanId,
    projectId: params.projectId,
    eventLabel: 'devis accepte',
    subject: 'Devis accepte - nouveau chantier gagne',
    title: 'Devis accepte',
    intro: 'Le devis a ete accepte. Le dossier est passe automatiquement en Gagne.',
    ctaLabel: 'Voir la fiche projet',
    ctaUrl: projectUrl,
    summaryItems: [
      { label: 'Client', value: params.clientName || 'Non renseigne' },
      { label: 'Type de projet', value: params.projectType || 'Non renseigne' },
      { label: 'Commune', value: params.city || 'Non renseignee' },
      { label: 'Montant du devis', value: formatAmount(params.totalTTC) },
    ],
  })
}

export async function notifyArtisanQuoteDeclined(params: {
  artisanId: string
  projectId: string
  devisNumber: string
  clientName: string
  projectType: string
  city: string
  totalTTC: number
  declineReason: string
}): Promise<boolean> {
  const projectUrl = getArtisanProjectUrl(params.projectId)

  return sendArtisanEmail({
    artisanId: params.artisanId,
    projectId: params.projectId,
    eventLabel: 'devis refuse',
    subject: 'Devis refuse - retour prospect disponible',
    title: 'Devis refuse',
    intro: `Le prospect a refuse le devis ${params.devisNumber}. Le dossier a ete mis a jour automatiquement.`,
    ctaLabel: 'Voir la fiche projet',
    ctaUrl: projectUrl,
    summaryItems: [
      { label: 'Client', value: params.clientName || 'Non renseigne' },
      { label: 'Type de projet', value: params.projectType || 'Non renseigne' },
      { label: 'Commune', value: params.city || 'Non renseignee' },
      { label: 'Montant du devis', value: formatAmount(params.totalTTC) },
      { label: 'Motif du refus', value: params.declineReason || 'Non renseigne' },
    ],
  })
}

export async function notifyArtisanQuoteFollowedUp(params: {
  artisanId: string
  projectId: string
  devisNumber: string
  clientName: string
  stage: 'j2_unopened' | 'j5_opened_no_decision' | 'j10_final' | 'none'
}): Promise<boolean> {
  const projectUrl = getArtisanProjectUrl(params.projectId)
  const stageLabel =
    params.stage === 'j2_unopened'
      ? 'J+2 (devis non ouvert)'
      : params.stage === 'j5_opened_no_decision'
        ? 'J+5 (devis ouvert sans decision)'
        : params.stage === 'j10_final'
          ? 'J+10 (relance finale)'
          : 'manuelle'

  return sendArtisanEmail({
    artisanId: params.artisanId,
    projectId: params.projectId,
    eventLabel: 'relance devis envoyee',
    subject: `Relance devis envoyee - ${params.clientName || 'Prospect'}`,
    title: 'Relance devis envoyee',
    intro: `Une relance a ete envoyee au prospect pour le devis ${params.devisNumber}.`,
    ctaLabel: 'Voir la fiche projet',
    ctaUrl: projectUrl,
    summaryItems: [
      { label: 'Client', value: params.clientName || 'Non renseigne' },
      { label: 'Reference devis', value: params.devisNumber },
      { label: 'Stade de relance', value: stageLabel },
    ],
  })
}

export type ArtisanQuotaType = 'dossiers' | 'devis' | 'appels vocaux'

export async function notifyArtisanQuotaWarning(params: {
  artisanId: string
  quotaType: ArtisanQuotaType
  used: number
  limit: number
}): Promise<boolean> {
  return sendArtisanEmail({
    artisanId: params.artisanId,
    eventLabel: `quota ${params.quotaType} bientot atteint`,
    subject: 'Votre quota Kadria est bientot atteint',
    title: 'Votre quota Kadria est bientot atteint',
    intro: `Votre quota de ${params.quotaType} approche de la limite de votre offre.`,
    ctaLabel: 'Voir les offres et quotas',
    ctaUrl: `${getBaseUrl()}/pricing`,
    summaryItems: [
      { label: 'Usage actuel', value: String(params.used) },
      { label: 'Limite', value: String(params.limit) },
    ],
  })
}

export async function notifyArtisanQuotaReached(params: {
  artisanId: string
  quotaType: ArtisanQuotaType
  used: number
  limit: number
}): Promise<boolean> {
  return sendArtisanEmail({
    artisanId: params.artisanId,
    eventLabel: `quota ${params.quotaType} atteint`,
    subject: 'Quota Kadria atteint',
    title: 'Quota Kadria atteint',
    intro: `Votre quota de ${params.quotaType} est atteint, l'action correspondante est bloquee.`,
    ctaLabel: 'Voir les offres et quotas',
    ctaUrl: `${getBaseUrl()}/pricing`,
    summaryItems: [
      { label: 'Usage actuel', value: String(params.used) },
      { label: 'Limite', value: String(params.limit) },
    ],
  })
}
