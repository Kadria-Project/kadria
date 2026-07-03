import { NextRequest, NextResponse } from 'next/server'
import { TABLES, getArtisanConfig, getDevisByProjet, getUserByArtisanIdentifier } from '@/src/lib/airtable'
import { createClientEvent, getPublicTimelineEvents } from '@/src/lib/client-events'
import { resolveDevisBranding } from '@/src/lib/devis-branding'
import { normalizePlan } from '@/src/lib/plans'
import { getBaseUrl } from '@/src/lib/base-url'
import { getClientPublicStatus } from '@/src/lib/project-lifecycle'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { normalizePublicDepositStatus } from '@/src/lib/deposit'

// Portail client V1 : page publique de suivi + complÃ©ment d'une demande,
// sÃ©curisÃ©e par token opaque (mÃªme convention que sms_completion_token /
// devis token). Jamais d'accÃ¨s par projectId brut, jamais de donnÃ©e interne
// (score commercial, notes internes, relances...) exposÃ©e ici.

function isValidToken(token: string | undefined): token is string {
  return !!token && /^[0-9a-f]{48}$/i.test(token)
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function tokenRef(token: string): string {
  return `${token.slice(0, 6)}â€¦`
}

function resolveClientStatus(status: string, completenessScore: number): string {
  return getClientPublicStatus(status, completenessScore)
}

function normalizeCompare(value: unknown): string {
  return String(value ?? '').trim()
}

// Champs strictement publics du projet : jamais de score commercial, notes
// internes, maturitÃ©, relances, coÃ»ts/marges, etc. deposit_* proviennent du
// pipeline acompte existant (src/lib/deposit.ts) â€” jamais de nouveau champ
// paiement crÃ©Ã© ici, simple lecture si dÃ©jÃ  renseignÃ© par l'artisan.
const PUBLIC_PROJECT_COLUMNS =
  'id, artisan_id, status, completeness_score, client_first_name, client_name, client_email, ' +
  'client_phone, site_address, city, postal_code, project_type, trade, budget, desired_timeline, ' +
  'ai_summary, photos, created_at, client_portal_token, client_messages, client_last_update_at, ' +
  'client_update_count, deposit_payment_url, deposit_amount, deposit_status, deposit_paid_at'

// Seul un lien http(s) valide est exposÃ© au client â€” jamais une valeur vide,
// malformÃ©e, ou un schÃ©ma non http(s).
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
// valeur inconnue retombe sur un libellÃ© neutre. "ExpirÃ©" seulement si une
// date de validitÃ© est dÃ©passÃ©e et que le devis n'a pas dÃ©jÃ  Ã©tÃ©
// acceptÃ©/refusÃ© (sinon son Ã©tat dÃ©finitif prime).
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
  in_preparation: 'Votre devis est en prÃ©paration.',
  available: 'Devis disponible',
  accepted: 'Devis acceptÃ©',
  declined: 'Devis refusÃ©',
  expired: 'Devis expirÃ©',
}

// Construit le bloc "quote" strictement public renvoyÃ© au portail client.
// Reprend le devis le plus rÃ©cent du projet (getDevisByProjet trie dÃ©jÃ  du
// plus rÃ©cent au plus ancien). Ne renvoie jamais l'id technique du devis, ni
// le token public du devis Ã  nu au-delÃ  de l'URL dÃ©jÃ  construite vers la
// page publique existante (/devis/[token]) : cette page gÃ¨re elle-mÃªme
// l'acceptation/le refus avec sa propre protection (rate-limit IP,
// idempotence dÃ©jÃ  en place cÃ´tÃ© /api/devis/public/accept|decline/[token]),
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
  // Statut rÃ©el Ã©crit par le webhook (app/api/stripe/connect/deposit-webhook/
  // route.ts) : littÃ©ralement 'paid' au succÃ¨s. normalizePublicDepositStatus
  // reste dÃ©fensif sur d'autres valeurs possibles mais 'paid' est la seule
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
    declined: quoteRow.statut === 'RefusÃ©' || Boolean(quoteRow.declinedAt),
    dateValidite: quoteRow.dateValidite || null,
  })

  const publicQuoteUrl = quoteRow.token ? `${getBaseUrl()}/devis/${quoteRow.token}` : null

  // Lien/montant d'acompte affichÃ© seulement si le devis est acceptÃ© ou
  // disponible (pas de sens tant qu'un devis n'existe pas / est refusÃ©) â€”
  // n'affecte jamais si le champ existe rÃ©ellement, seulement la pertinence
  // d'affichage cÃ´tÃ© portail.
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
    // Acceptation/refus restent gÃ©rÃ©s par la page publique existante
    // (/devis/[token]) dans ce lot â€” pas d'intÃ©gration directe dans le
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
      return NextResponse.json({ error: 'Lien invalide ou expirÃ©' }, { status: 404 })
    }

    const { data: project, error } = await findProjectByToken(token)

    if (error || !project) {
      // Ne jamais prÃ©ciser si le token n'existe pas vs projet supprimÃ© :
      // mÃªme message neutre dans tous les cas.
      return NextResponse.json({ error: 'Lien invalide ou expirÃ©' }, { status: 404 })
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
      return NextResponse.json({ error: 'Lien invalide ou expirÃ©' }, { status: 404 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'RequÃªte invalide' }, { status: 400 })
    }

    const b = (body || {}) as Record<string, unknown>

    // Liste blanche explicite des champs autorisÃ©s â€” tout autre champ
    // (artisan_id, project_id, status, notes internes...) est ignorÃ©,
    // jamais acceptÃ© en passthrough.
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
      return NextResponse.json({ error: 'Aucune information Ã  enregistrer.' }, { status: 400 })
    }

    const { data: project, error: fetchError } = await findProjectByToken(token)

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Lien invalide ou expirÃ©' }, { status: 404 })
    }

    // Anti-spam serveur : on ne considÃ¨re qu'il y a un changement rÃ©el que
    // si une valeur envoyÃ©e diffÃ¨re (aprÃ¨s trim) de la valeur actuellement
    // en base, ou s'il s'agit d'un contenu additif (prÃ©cisions/message/
    // photos) qui n'a pas dÃ©jÃ  Ã©tÃ© enregistrÃ© tel quel. Objectif : un clic
    // sur "Envoyer mes informations" sans aucune modification ne doit
    // jamais crÃ©er d'Ã©vÃ©nement, ni incrÃ©menter les compteurs, ni polluer
    // l'activitÃ© du dossier â€” mÃªme si le front (gating bouton) est
    // contournÃ© ou en retard sur une resoumission.
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
    if (firstName && firstName !== existingValues.firstName) changedFieldLabels.push('prÃ©nom')
    if (lastName && lastName !== existingValues.lastName) changedFieldLabels.push('nom')
    if (email && email !== existingValues.email) changedFieldLabels.push('email')
    if (phone && phone !== existingValues.phone) changedFieldLabels.push('tÃ©lÃ©phone')
    if (address && address !== existingValues.address) changedFieldLabels.push('adresse')
    if (budget && budget !== existingValues.budget) changedFieldLabels.push('budget')
    if (timeline && timeline !== existingValues.timeline) changedFieldLabels.push('dÃ©lai souhaitÃ©')

    // PrÃ©cisions / disponibilitÃ©s / urgence : ajoutÃ©es de faÃ§on additive au
    // rÃ©sumÃ©, jamais en Ã©crasant l'existant (mÃªme approche que /completer).
    // On ne les considÃ¨re "changÃ©es" que si ce bloc exact n'est pas dÃ©jÃ  la
    // derniÃ¨re chose ajoutÃ©e au rÃ©sumÃ© (Ã©vite d'empiler la mÃªme prÃ©cision Ã 
    // chaque clic).
    const extraNotes: string[] = []
    if (details) extraNotes.push(`PrÃ©cisions complÃ©mentaires (client) : ${details}`)
    if (availability) extraNotes.push(`DisponibilitÃ©s (client) : ${availability}`)
    if (urgency) extraNotes.push(`Urgence signalÃ©e par le client : ${urgency}`)
    const existingSummary = String(project.ai_summary || '').trim()
    const notesBlock = extraNotes.join('\n\n')
    const notesChanged = extraNotes.length > 0 && !(existingSummary && existingSummary.endsWith(notesBlock))
    if (notesChanged) changedFieldLabels.push('prÃ©cisions')

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

    // Rien de rÃ©ellement nouveau : rÃ©ponse neutre, aucune Ã©criture (pas
    // d'Ã©vÃ©nement, pas de compteur, pas d'activitÃ©). EmpÃªche le spam par
    // double-clic ou resoumission identique, mÃªme si le front est contournÃ©.
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
    // seul) tel qu'affichÃ©/Ã©ditÃ© dans la fiche projet artisan â€” ce n'est
    // PAS un nom complet. On ne le compose donc jamais avec le prÃ©nom, sous
    // peine d'Ã©craser le "Nom" avec "PrÃ©nom Nom" et de dÃ©synchroniser
    // l'affichage cÃ´tÃ© artisan. On n'Ã©crit un champ que s'il a Ã©tÃ© renseignÃ©
    // (jamais d'Ã©crasement par une valeur vide non intentionnelle).
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
      console.error(`[CLIENT-PORTAL] Ã‰chec mise Ã  jour (token ${tokenRef(token)}):`, updateError?.message)
      return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
    }

    // Source unique pour l'activitÃ© du dossier ("ActivitÃ© du dossier") :
    // ProjectClientEvents. On n'Ã©crit plus jamais de ligne dans la table
    // Activity pour cette action, afin d'Ã©viter le doublon
    // "Informations complÃ©tÃ©es par le client" / "Informations complÃ©tÃ©es
    // via le portail client." observÃ© prÃ©cÃ©demment (les deux lignes
    // provenaient de deux sources diffÃ©rentes pour la mÃªme action). Le
    // message client a son propre Ã©vÃ©nement dÃ©diÃ©, distinct de
    // 'client_info_updated', et n'est jamais affichÃ© dans l'activitÃ© du
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
        title: 'Informations complÃ©tÃ©es par le client',
        message: `Le client a complÃ©tÃ© des informations depuis le portail client. Champs modifiÃ©s : ${changedFieldLabels.join(', ')}.`,
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

