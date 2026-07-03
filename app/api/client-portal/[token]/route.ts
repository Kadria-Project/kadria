import { NextRequest, NextResponse } from 'next/server'
import { TABLES, getArtisanConfig, getDevisByProjet, getUserByArtisanIdentifier } from '@/src/lib/airtable'
import { createClientEvent, getPublicTimelineEvents } from '@/src/lib/client-events'
import { resolveDevisBranding } from '@/src/lib/devis-branding'
import { normalizePlan } from '@/src/lib/plans'
import { getBaseUrl } from '@/src/lib/base-url'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { normalizePublicDepositStatus } from '@/src/lib/deposit'

// Portail client V1 : page publique de suivi + complément d'une demande,
// sécurisée par token opaque (même convention que sms_completion_token /
// devis token). Jamais d'accès par projectId brut, jamais de donnée interne
// (score commercial, notes internes, relances...) exposée ici.

function isValidToken(token: string | undefined): token is string {
  return !!token && /^[0-9a-f]{48}$/i.test(token)
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function tokenRef(token: string): string {
  return `${token.slice(0, 6)}…`
}

// Statuts internes -> libellé client, jamais l'inverse. Toute valeur
// inconnue retombe sur un libellé neutre plutôt que d'exposer le brut.
const CLIENT_STATUS_MAP: Record<string, string> = {
  Nouveau: 'Demande reçue',
  Qualifié: "Demande en cours d'analyse",
  'À rappeler': "Demande en cours d'analyse",
  'En cours': 'Étude en cours',
  'Devis envoyé': 'Devis envoyé',
  Gagné: 'Devis accepté',
  Perdu: 'Demande clôturée',
}

function resolveClientStatus(status: string, completenessScore: number): string {
  if (completenessScore > 0 && completenessScore < 40) {
    return 'Informations à compléter'
  }
  return CLIENT_STATUS_MAP[status] || 'Demande reçue'
}

function normalizeCompare(value: unknown): string {
  return String(value ?? '').trim()
}

// Champs strictement publics du projet : jamais de score commercial, notes
// internes, maturité, relances, coûts/marges, etc. deposit_* proviennent du
// pipeline acompte existant (src/lib/deposit.ts) — jamais de nouveau champ
// paiement créé ici, simple lecture si déjà renseigné par l'artisan.
const PUBLIC_PROJECT_COLUMNS =
  'id, artisan_id, status, completeness_score, client_first_name, client_name, client_email, ' +
  'client_phone, site_address, city, postal_code, project_type, trade, budget, desired_timeline, ' +
  'ai_summary, photos, created_at, client_portal_token, client_messages, client_last_update_at, ' +
  'client_update_count, deposit_payment_url, deposit_amount, deposit_status, deposit_paid_at'

// Seul un lien http(s) valide est exposé au client — jamais une valeur vide,
// malformée, ou un schéma non http(s).
function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Statut devis interne -> statut public client, jamais l'inverse. Toute
// valeur inconnue retombe sur un libellé neutre. "Expiré" seulement si une
// date de validité est dépassée et que le devis n'a pas déjà été
// accepté/refusé (sinon son état définitif prime).
function resolveQuotePublicStatus(params: {
  hasQuote: boolean
  sent: boolean
  accepted: boolean
  declined: boolean
  dateValidite: string | null
}): 'no_quote' | 'in_preparation' | 'available' | 'accepted' | 'declined' | 'expired' {
  const { hasQuote, sent, accepted, declined, dateValidite } = params
  if (!hasQuote) return 'no_quote'
  if (accepted) return 'accepted'
  if (declined) return 'declined'
  if (!sent) return 'in_preparation'
  if (dateValidite) {
    const validUntil = new Date(dateValidite)
    if (!Number.isNaN(validUntil.getTime()) && validUntil.getTime() < Date.now()) {
      return 'expired'
    }
  }
  return 'available'
}

const QUOTE_PUBLIC_STATUS_LABEL: Record<string, string> = {
  no_quote: "Votre devis n'est pas encore disponible.",
  in_preparation: 'Votre devis est en préparation.',
  available: 'Devis disponible',
  accepted: 'Devis accepté',
  declined: 'Devis refusé',
  expired: 'Devis expiré',
}

// Construit le bloc "quote" strictement public renvoyé au portail client.
// Reprend le devis le plus récent du projet (getDevisByProjet trie déjà du
// plus récent au plus ancien). Ne renvoie jamais l'id technique du devis, ni
// le token public du devis à nu au-delà de l'URL déjà construite vers la
// page publique existante (/devis/[token]) : cette page gère elle-même
// l'acceptation/le refus avec sa propre protection (rate-limit IP,
// idempotence déjà en place côté /api/devis/public/accept|decline/[token]),
// on ne duplique jamais cette logique ici pour ce lot.
async function buildPublicQuoteBlock(project: Record<string, any>) {
  let quoteRow: Awaited<ReturnType<typeof getDevisByProjet>>[number] | null = null
  try {
    const devisList = await getDevisByProjet(String(project.id))
    quoteRow = devisList.length > 0 ? devisList[0] : null
  } catch (e) {
    console.error('[CLIENT-PORTAL] getDevisByProjet failed:', e instanceof Error ? e.message : String(e))
    quoteRow = null
  }

  const depositPaymentUrl = isValidHttpUrl(project.deposit_payment_url) ? String(project.deposit_payment_url).trim() : null
  const depositAmountRaw = Number(project.deposit_amount)
  const depositAmount = Number.isFinite(depositAmountRaw) && depositAmountRaw > 0 ? depositAmountRaw : null
  // Statut réel écrit par le webhook (app/api/stripe/connect/deposit-webhook/
  // route.ts) : littéralement 'paid' au succès. normalizePublicDepositStatus
  // reste défensif sur d'autres valeurs possibles mais 'paid' est la seule
  // effectivement produite aujourd'hui par ce pipeline.
  const depositPublicStatus = normalizePublicDepositStatus(project.deposit_status)
  const depositIsPaid = depositPublicStatus === 'paid'
  const depositIsPending = depositPublicStatus === 'pending'
  const depositPaidAt = depositIsPaid && typeof project.deposit_paid_at === 'string' ? project.deposit_paid_at : null

  function buildDepositBlock(showDeposit: boolean) {
    const url = showDeposit ? depositPaymentUrl : null
    const amount = showDeposit ? depositAmount : null
    const status = showDeposit ? depositPublicStatus : 'unavailable'
    const isPaid = showDeposit && depositIsPaid
    const canPay = showDeposit && Boolean(url) && !depositIsPaid && !depositIsPending
    return {
      status,
      publicStatus: status,
      amount,
      paymentUrl: url,
      paidAt: showDeposit ? depositPaidAt : null,
      canPay,
      isPaid,
    }
  }

  if (!quoteRow) {
    return {
      publicStatus: 'no_quote' as const,
      statusLabel: QUOTE_PUBLIC_STATUS_LABEL.no_quote,
      amount: null,
      reference: null,
      sentAt: null,
      acceptedAt: null,
      declinedAt: null,
      declineReason: null,
      pdfUrl: null,
      publicQuoteUrl: null,
      depositPaymentUrl,
      depositAmount,
      deposit: buildDepositBlock(false),
      canAccept: false,
      canDecline: false,
    }
  }

  const publicStatus = resolveQuotePublicStatus({
    hasQuote: true,
    sent: Boolean(quoteRow.sent),
    accepted: Boolean(quoteRow.accepted),
    declined: quoteRow.statut === 'Refusé' || Boolean(quoteRow.declinedAt),
    dateValidite: quoteRow.dateValidite || null,
  })

  const publicQuoteUrl = quoteRow.token ? `${getBaseUrl()}/devis/${quoteRow.token}` : null

  // Lien/montant d'acompte affiché seulement si le devis est accepté ou
  // disponible (pas de sens tant qu'un devis n'existe pas / est refusé) —
  // n'affecte jamais si le champ existe réellement, seulement la pertinence
  // d'affichage côté portail.
  const showDeposit = publicStatus === 'accepted' || publicStatus === 'available'

  return {
    publicStatus,
    statusLabel: QUOTE_PUBLIC_STATUS_LABEL[publicStatus] || QUOTE_PUBLIC_STATUS_LABEL.no_quote,
    amount: Number.isFinite(quoteRow.totalTTC) && quoteRow.totalTTC > 0 ? quoteRow.totalTTC : null,
    reference: quoteRow.devisNumber || null,
    sentAt: quoteRow.sentAt || quoteRow.quoteSentAt || null,
    acceptedAt: quoteRow.acceptedAt || null,
    declinedAt: quoteRow.declinedAt || null,
    declineReason: quoteRow.declineReason || null,
    pdfUrl: quoteRow.pdfUrl || null,
    publicQuoteUrl,
    depositPaymentUrl: showDeposit ? depositPaymentUrl : null,
    depositAmount: showDeposit ? depositAmount : null,
    deposit: buildDepositBlock(showDeposit),
    // Acceptation/refus restent gérés par la page publique existante
    // (/devis/[token]) dans ce lot — pas d'intégration directe dans le
        // portail, voir limites du rapport final.
    canAccept: false,
    canDecline: false,
  }
}

async function findProjectByToken(token: string) {
  const result = await supabaseAdmin
    .from(TABLES.projects)
    .select(PUBLIC_PROJECT_COLUMNS)
    .eq('client_portal_token', token)
    .maybeSingle()

  return {
    data: result.data as Record<string, any> | null,
    error: result.error,
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params

    if (!isValidToken(token)) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    }

    const { data: project, error } = await findProjectByToken(token)

    if (error || !project) {
      // Ne jamais préciser si le token n'existe pas vs projet supprimé :
      // même message neutre dans tous les cas.
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    }

    const [config, user] = await Promise.all([
      getArtisanConfig(project.artisan_id),
      getUserByArtisanIdentifier(project.artisan_id),
    ])

    const plan = normalizePlan(user?.plan)
    const branding = resolveDevisBranding({
      plan,
      whiteLabelEnabled: config?.whiteLabelEnabled,
      widgetBrandName: config?.widgetBrandName,
      widgetBrandLogoUrl: config?.widgetBrandLogoUrl,
      logoUrl: config?.logoUrl,
      companyName: config?.companyName,
      raisonSociale: config?.raisonSociale,
      primaryColor: config?.primaryColor,
      secondaryColor: config?.secondaryColor,
    })

    const photos = Array.isArray(project.photos) ? project.photos : []
    const timelineEvents = await getPublicTimelineEvents(String(project.id))
    const quote = await buildPublicQuoteBlock(project)

    return NextResponse.json({
      valid: true,
      artisan: {
        brandName: branding.brandName,
        brandLogoUrl: branding.brandLogoUrl,
        primaryColor: branding.primaryColor,
        trade: config?.primaryTrade || '',
      },
      project: {
        clientStatus: resolveClientStatus(project.status || 'Nouveau', Number(project.completeness_score) || 0),
        createdAt: project.created_at || null,
        clientFirstName: project.client_first_name || '',
        clientName: project.client_name || '',
        clientLastName: project.client_name || '',
        clientEmail: project.client_email || '',
        clientPhone: project.client_phone || '',
        projectType: project.project_type || '',
        trade: project.trade || '',
        city: project.city || '',
        siteAddress: project.site_address || '',
        postalCode: project.postal_code || '',
        budget: project.budget || '',
        desiredTimeline: project.desired_timeline || '',
        summary: project.ai_summary ? String(project.ai_summary).slice(0, 600) : '',
        photos: photos.map((p: unknown) => (p && typeof p === 'object' ? { url: String((p as Record<string, unknown>).url || '') } : null)).filter(Boolean),
        clientMessages: project.client_messages || '',
      },
      timelineEvents,
      quote,
    })
  } catch (e) {
    console.error('[CLIENT-PORTAL GET] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params

    if (!isValidToken(token)) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    const b = (body || {}) as Record<string, unknown>

    // Liste blanche explicite des champs autorisés — tout autre champ
    // (artisan_id, project_id, status, notes internes...) est ignoré,
    // jamais accepté en passthrough.
    const firstName = typeof b.firstName === 'string' ? b.firstName.trim().slice(0, 120) : ''
    const lastName = typeof b.lastName === 'string' ? b.lastName.trim().slice(0, 120) : ''
    const email = typeof b.email === 'string' ? b.email.trim().slice(0, 200) : ''
    const phone = typeof b.phone === 'string' ? b.phone.trim().slice(0, 40) : ''
    const address = typeof b.address === 'string' ? b.address.trim().slice(0, 300) : ''
    const details = typeof b.details === 'string' ? b.details.trim().slice(0, 4000) : ''
    const budget = typeof b.budget === 'string' ? b.budget.trim().slice(0, 120) : (typeof b.budget === 'number' && Number.isFinite(b.budget) ? String(b.budget) : '')
    const timeline = typeof b.timeline === 'string' ? b.timeline.trim().slice(0, 200) : ''
    const availability = typeof b.availability === 'string' ? b.availability.trim().slice(0, 300) : ''
    const urgencyRaw = typeof b.urgency === 'string' ? b.urgency.trim() : ''
    const ALLOWED_URGENCY = new Set(['low', 'normal', 'high', ''])
    const urgency = ALLOWED_URGENCY.has(urgencyRaw) ? urgencyRaw : ''
    const message = typeof b.message === 'string' ? b.message.trim().slice(0, 2000) : ''

    const photosRaw = Array.isArray(b.photos) ? b.photos : []
    const photoUrls = photosRaw
      .map((p) => (p && typeof p === 'object' ? String((p as Record<string, unknown>).url || '') : ''))
      .filter(Boolean)
      .slice(0, 10)

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
    }

    const hasAnyUpdate =
      firstName || lastName || email || phone || address || details || budget || timeline ||
      availability || urgency || message || photoUrls.length > 0

    if (!hasAnyUpdate) {
      return NextResponse.json({ error: 'Aucune information à enregistrer.' }, { status: 400 })
    }

    const { data: project, error: fetchError } = await findProjectByToken(token)

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    }

    // Anti-spam serveur : on ne considère qu'il y a un changement réel que
    // si une valeur envoyée diffère (après trim) de la valeur actuellement
    // en base, ou s'il s'agit d'un contenu additif (précisions/message/
    // photos) qui n'a pas déjà été enregistré tel quel. Objectif : un clic
    // sur "Envoyer mes informations" sans aucune modification ne doit
    // jamais créer d'événement, ni incrémenter les compteurs, ni polluer
    // l'activité du dossier — même si le front (gating bouton) est
    // contourné ou en retard sur une resoumission.
    const existingValues = {
      firstName: normalizeCompare(project.client_first_name),
      lastName: normalizeCompare(project.client_name),
      email: normalizeCompare(project.client_email),
      phone: normalizeCompare(project.client_phone),
      address: normalizeCompare(project.site_address),
      budget: normalizeCompare(project.budget),
      timeline: normalizeCompare(project.desired_timeline),
    }

    const changedFieldLabels: string[] = []
    if (firstName && firstName !== existingValues.firstName) changedFieldLabels.push('prénom')
    if (lastName && lastName !== existingValues.lastName) changedFieldLabels.push('nom')
    if (email && email !== existingValues.email) changedFieldLabels.push('email')
    if (phone && phone !== existingValues.phone) changedFieldLabels.push('téléphone')
    if (address && address !== existingValues.address) changedFieldLabels.push('adresse')
    if (budget && budget !== existingValues.budget) changedFieldLabels.push('budget')
    if (timeline && timeline !== existingValues.timeline) changedFieldLabels.push('délai souhaité')

    // Précisions / disponibilités / urgence : ajoutées de façon additive au
    // résumé, jamais en écrasant l'existant (même approche que /completer).
    // On ne les considère "changées" que si ce bloc exact n'est pas déjà la
    // dernière chose ajoutée au résumé (évite d'empiler la même précision à
    // chaque clic).
    const extraNotes: string[] = []
    if (details) extraNotes.push(`Précisions complémentaires (client) : ${details}`)
    if (availability) extraNotes.push(`Disponibilités (client) : ${availability}`)
    if (urgency) extraNotes.push(`Urgence signalée par le client : ${urgency}`)
    const existingSummary = String(project.ai_summary || '').trim()
    const notesBlock = extraNotes.join('\n\n')
    const notesChanged = extraNotes.length > 0 && !(existingSummary && existingSummary.endsWith(notesBlock))
    if (notesChanged) changedFieldLabels.push('précisions')

    const existingPhotoUrls = new Set(
      (Array.isArray(project.photos) ? project.photos : [])
        .map((p: unknown) => (p && typeof p === 'object' ? String((p as Record<string, unknown>).url || '') : ''))
        .filter(Boolean),
    )
    const newPhotoUrls = photoUrls.filter((url) => !existingPhotoUrls.has(url))
    if (newPhotoUrls.length > 0) changedFieldLabels.push('photos')

    const existingMessagesTrim = String(project.client_messages || '').trim()
    const lastMessageBlock = existingMessagesTrim.split(/\n\s*\n/).filter(Boolean).pop() || ''
    const messageIsNew = Boolean(message) && !lastMessageBlock.endsWith(message)

    const infoChanged = changedFieldLabels.length > 0

    // Rien de réellement nouveau : réponse neutre, aucune écriture (pas
    // d'événement, pas de compteur, pas d'activité). Empêche le spam par
    // double-clic ou resoumission identique, même si le front est contourné.
    if (!infoChanged && !messageIsNew) {
      return NextResponse.json({
        success: true,
        unchanged: true,
        project: {
          clientStatus: resolveClientStatus(project.status || 'Nouveau', Number(project.completeness_score) || 0),
          createdAt: project.created_at || null,
          clientFirstName: project.client_first_name || '',
          clientName: project.client_name || '',
          clientLastName: project.client_name || '',
          clientEmail: project.client_email || '',
          clientPhone: project.client_phone || '',
          projectType: project.project_type || '',
          trade: project.trade || '',
          city: project.city || '',
          siteAddress: project.site_address || '',
          postalCode: project.postal_code || '',
          budget: project.budget || '',
          desiredTimeline: project.desired_timeline || '',
          summary: project.ai_summary ? String(project.ai_summary).slice(0, 600) : '',
          photos: (Array.isArray(project.photos) ? project.photos : [])
            .map((p: unknown) => (p && typeof p === 'object' ? { url: String((p as Record<string, unknown>).url || '') } : null))
            .filter(Boolean),
          clientMessages: project.client_messages || '',
        },
      })
    }

    const update: Record<string, unknown> = {
      client_last_update_at: new Date().toISOString(),
      client_update_count: (Number(project.client_update_count) || 0) + 1,
    }

    // Important : `client_name` correspond au champ "Nom" (nom de famille
    // seul) tel qu'affiché/édité dans la fiche projet artisan — ce n'est
    // PAS un nom complet. On ne le compose donc jamais avec le prénom, sous
    // peine d'écraser le "Nom" avec "Prénom Nom" et de désynchroniser
    // l'affichage côté artisan. On n'écrit un champ que s'il a été renseigné
    // (jamais d'écrasement par une valeur vide non intentionnelle).
    if (firstName) update.client_first_name = firstName
    if (lastName) update.client_name = lastName
    if (email) update.client_email = email
    if (phone) update.client_phone = phone
    if (address) update.site_address = address
    if (budget) update.budget = budget
    if (timeline) update.desired_timeline = timeline

    if (notesChanged) {
      update.ai_summary = [existingSummary, ...extraNotes].filter(Boolean).join('\n\n')
    }

    if (newPhotoUrls.length > 0) {
      const existingPhotos = Array.isArray(project.photos) ? project.photos : []
      update.photos = [...existingPhotos, ...newPhotoUrls.map((url) => ({ url }))]
    }

    if (messageIsNew) {
      const stamp = new Date().toLocaleString('fr-FR')
      update.client_messages = [existingMessagesTrim, `[${stamp}] ${message}`].filter(Boolean).join('\n\n')
    }

    const updateResult = await supabaseAdmin
      .from(TABLES.projects)
      .update(update)
      .eq('id', project.id)
      .eq('client_portal_token', token)
      .select(PUBLIC_PROJECT_COLUMNS)
      .maybeSingle()
    const updated = updateResult.data as Record<string, any> | null
    const updateError = updateResult.error

    if (updateError || !updated) {
      console.error(`[CLIENT-PORTAL] Échec mise à jour (token ${tokenRef(token)}):`, updateError?.message)
      return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
    }

    // Source unique pour l'activité du dossier ("Activité du dossier") :
    // ProjectClientEvents. On n'écrit plus jamais de ligne dans la table
    // Activity pour cette action, afin d'éviter le doublon
    // "Informations complétées par le client" / "Informations complétées
    // via le portail client." observé précédemment (les deux lignes
    // provenaient de deux sources différentes pour la même action). Le
    // message client a son propre événement dédié, distinct de
    // 'client_info_updated', et n'est jamais affiché dans l'activité du
    // dossier (il vit uniquement dans la section "Discussion client").
    if (messageIsNew) {
      await createClientEvent({
        projectId: String(project.id),
        artisanId: String(project.artisan_id),
        eventType: 'client_message',
        visibility: 'client',
        source: 'client',
        title: 'Message du client',
        message,
      })
    }

    if (infoChanged) {
      await createClientEvent({
        projectId: String(project.id),
        artisanId: String(project.artisan_id),
        eventType: 'client_info_updated',
        visibility: 'client',
        source: 'client',
        title: 'Informations complétées par le client',
        message: `Le client a complété des informations depuis le portail client. Champs modifiés : ${changedFieldLabels.join(', ')}.`,
        metadata: { changedFields: changedFieldLabels, source: 'Portail client' },
      })
    }

    const photosOut = Array.isArray(updated.photos) ? updated.photos : []

    return NextResponse.json({
      success: true,
      project: {
        clientStatus: resolveClientStatus(updated.status || 'Nouveau', Number(updated.completeness_score) || 0),
        createdAt: updated.created_at || null,
        clientFirstName: updated.client_first_name || '',
        clientName: updated.client_name || '',
        clientLastName: updated.client_name || '',
        clientEmail: updated.client_email || '',
        clientPhone: updated.client_phone || '',
        projectType: updated.project_type || '',
        trade: updated.trade || '',
        city: updated.city || '',
        siteAddress: updated.site_address || '',
        postalCode: updated.postal_code || '',
        budget: updated.budget || '',
        desiredTimeline: updated.desired_timeline || '',
        summary: updated.ai_summary ? String(updated.ai_summary).slice(0, 600) : '',
        photos: photosOut.map((p: unknown) => (p && typeof p === 'object' ? { url: String((p as Record<string, unknown>).url || '') } : null)).filter(Boolean),
        clientMessages: updated.client_messages || '',
      },
    })
  } catch (e) {
    console.error('[CLIENT-PORTAL PATCH] Unexpected error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
