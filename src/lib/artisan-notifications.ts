// Source unique pour les notifications email envoyées a l'artisan (jamais au
// prospect/client final). Tout evenement metier qui doit prevenir l'artisan
// passe par une des fonctions ci-dessous plutot que d'appeler Resend
// directement depuis une route — voir le module d'eligibilite des relances
// devis (src/lib/quote-followup.ts) pour le meme principe applique au statut
// des devis.

import { Resend } from 'resend'
import { TABLES, getArtisanConfig, getUserByArtisanIdentifier } from '@/src/lib/airtable'
import { getBaseUrl } from '@/src/lib/base-url'
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

type SendArtisanEmailParams = {
  artisanId: string
  projectId?: string
  subject: string
  html: string
  eventLabel: string
}

// Coeur commun a toutes les notifications : resolution de l'email artisan,
// envoi Resend, et traçabilite (succes ou raison d'echec) dans l'historique
// du dossier quand un projectId est disponible. Ne jamais laisser une erreur
// d'envoi remonter vers l'appelant — l'action metier ne doit jamais echouer
// a cause d'un email qui ne part pas.
async function sendArtisanEmail(params: SendArtisanEmailParams): Promise<boolean> {
  const { artisanId, projectId, subject, html, eventLabel } = params

  try {
    const [artisan, config] = await Promise.all([
      getUserByArtisanIdentifier(artisanId),
      getArtisanConfig(artisanId),
    ])
    const recipientEmail = config?.notificationEmail || artisan?.email
    if (!recipientEmail) {
      console.error(`[ARTISAN NOTIFICATIONS] Email artisan manquant pour artisan_id=${artisanId} (${eventLabel})`)
      await logArtisanNotificationActivity(projectId, `Notification artisan non envoyée — email artisan manquant (${eventLabel}).`)
      return false
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error(`[ARTISAN NOTIFICATIONS] RESEND_API_KEY manquante, notification non envoyée (${eventLabel})`)
      return false
    }

    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'devis@kadria.fr',
      to: recipientEmail,
      subject,
      html,
    })

    if (result.error) {
      console.error(`[ARTISAN NOTIFICATIONS] Resend error (${eventLabel}):`, result.error)
      return false
    }

    await logArtisanNotificationActivity(projectId, `Notification artisan envoyée — ${eventLabel}.`)
    return true
  } catch (error) {
    console.error(`[ARTISAN NOTIFICATIONS] Échec envoi notification (${eventLabel}):`, error instanceof Error ? error.message : String(error))
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
    subject: `Nouveau dossier qualifié — ${params.clientName || 'Prospect'}`,
    html: `
      <p>Un nouveau dossier vient d'être qualifié.</p>
      <ul>
        <li><strong>Client :</strong> ${params.clientName || 'Non renseigné'}</li>
        <li><strong>Type de projet :</strong> ${params.projectType || 'Non renseigné'}</li>
        <li><strong>Commune :</strong> ${params.city || 'Non renseignée'}</li>
        ${params.priority ? `<li><strong>Priorité :</strong> ${params.priority}</li>` : ''}
      </ul>
      <p><a href="${projectUrl}">Voir le dossier</a></p>
    `,
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
    eventLabel: 'devis accepté',
    subject: 'Devis accepté — nouveau chantier gagné',
    html: `
      <p>Le devis a été accepté. Le dossier est passé automatiquement en <strong>Gagné</strong>.</p>
      <ul>
        <li><strong>Client :</strong> ${params.clientName || 'Non renseigné'}</li>
        <li><strong>Type de projet :</strong> ${params.projectType || 'Non renseigné'}</li>
        <li><strong>Commune :</strong> ${params.city || 'Non renseignée'}</li>
        <li><strong>Montant du devis :</strong> ${formatAmount(params.totalTTC)}</li>
      </ul>
      <p><a href="${projectUrl}">Voir la fiche projet</a></p>
    `,
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
    eventLabel: 'devis refusé',
    subject: 'Devis refusé — retour prospect disponible',
    html: `
      <p>Le prospect a refusé le devis ${params.devisNumber}. Le dossier a été mis à jour automatiquement.</p>
      <ul>
        <li><strong>Client :</strong> ${params.clientName || 'Non renseigné'}</li>
        <li><strong>Type de projet :</strong> ${params.projectType || 'Non renseigné'}</li>
        <li><strong>Commune :</strong> ${params.city || 'Non renseignée'}</li>
        <li><strong>Montant du devis :</strong> ${formatAmount(params.totalTTC)}</li>
        <li><strong>Motif du refus :</strong> ${params.declineReason}</li>
      </ul>
      <p><a href="${projectUrl}">Voir la fiche projet</a></p>
    `,
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
        ? 'J+5 (devis ouvert sans décision)'
        : params.stage === 'j10_final'
          ? 'J+10 (relance finale)'
          : 'manuelle'

  return sendArtisanEmail({
    artisanId: params.artisanId,
    projectId: params.projectId,
    eventLabel: 'relance devis envoyée',
    subject: `Relance devis envoyée — ${params.clientName || 'Prospect'}`,
    html: `
      <p>Une relance a été envoyée au prospect pour le devis ${params.devisNumber}.</p>
      <ul>
        <li><strong>Client :</strong> ${params.clientName || 'Non renseigné'}</li>
        <li><strong>Référence devis :</strong> ${params.devisNumber}</li>
        <li><strong>Stade de relance :</strong> ${stageLabel}</li>
      </ul>
      <p><a href="${projectUrl}">Voir la fiche projet</a></p>
    `,
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
    eventLabel: `quota ${params.quotaType} bientôt atteint`,
    subject: 'Votre quota Kadria est bientôt atteint',
    html: `
      <p>Votre quota de <strong>${params.quotaType}</strong> approche de la limite de votre offre.</p>
      <ul>
        <li><strong>Usage actuel :</strong> ${params.used}</li>
        <li><strong>Limite :</strong> ${params.limit}</li>
      </ul>
      <p><a href="${getBaseUrl()}/pricing">Voir les offres et quotas</a></p>
    `,
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
    html: `
      <p>Votre quota de <strong>${params.quotaType}</strong> est atteint, l'action correspondante est bloquée.</p>
      <ul>
        <li><strong>Usage actuel :</strong> ${params.used}</li>
        <li><strong>Limite :</strong> ${params.limit}</li>
      </ul>
      <p><a href="${getBaseUrl()}/pricing">Voir les offres et quotas</a></p>
    `,
  })
}
