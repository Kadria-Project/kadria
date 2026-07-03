import { NextRequest, NextResponse } from 'next/server'
import { TABLES, getArtisanConfig, getUserByArtisanIdentifier } from '@/src/lib/airtable'
import { createClientEvent, getPublicTimelineEvents } from '@/src/lib/client-events'
import { resolveDevisBranding } from '@/src/lib/devis-branding'
import { normalizePlan } from '@/src/lib/plans'
import { supabaseAdmin } from '@/src/lib/supabase/server'

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

async function createActivityLog(projectId: string, action: string, description: string) {
  try {
    const { error } = await supabaseAdmin.from(TABLES.activity).insert({
      project_id: projectId,
      action,
      description,
      created_at: new Date().toISOString(),
    })
    if (error) {
      console.error('[CLIENT-PORTAL] Activity insert error:', error.message)
    }
  } catch (e) {
    console.error('[CLIENT-PORTAL] Activity insert threw:', e instanceof Error ? e.message : String(e))
  }
}

// Champs strictement publics du projet : jamais de score commercial, notes
// internes, maturité, relances, coûts/marges, etc.
const PUBLIC_PROJECT_COLUMNS =
  'id, artisan_id, status, completeness_score, client_first_name, client_name, client_email, ' +
  'client_phone, site_address, city, postal_code, project_type, trade, budget, desired_timeline, ' +
  'ai_summary, photos, created_at, client_portal_token, client_messages, client_last_update_at, ' +
  'client_update_count'

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

    // Précisions / disponibilités / urgence : ajoutées de façon additive au
    // résumé, jamais en écrasant l'existant (même approche que /completer).
    const extraNotes: string[] = []
    if (details) extraNotes.push(`Précisions complémentaires (client) : ${details}`)
    if (availability) extraNotes.push(`Disponibilités (client) : ${availability}`)
    if (urgency) extraNotes.push(`Urgence signalée par le client : ${urgency}`)
    if (extraNotes.length > 0) {
      const existingSummary = String(project.ai_summary || '').trim()
      update.ai_summary = [existingSummary, ...extraNotes].filter(Boolean).join('\n\n')
    }

    if (photoUrls.length > 0) {
      const existingPhotos = Array.isArray(project.photos) ? project.photos : []
      update.photos = [...existingPhotos, ...photoUrls.map((url) => ({ url }))]
    }

    if (message) {
      const existingMessages = String(project.client_messages || '').trim()
      const stamp = new Date().toLocaleString('fr-FR')
      update.client_messages = [existingMessages, `[${stamp}] ${message}`].filter(Boolean).join('\n\n')
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

    await createActivityLog(
      project.id,
      'CLIENT_PORTAL_UPDATE',
      [
        'Informations complétées via le portail client.',
        address ? 'Adresse renseignée.' : '',
        message ? 'Message client ajouté.' : '',
        photoUrls.length > 0 ? `${photoUrls.length} photo(s) ajoutée(s).` : '',
      ].filter(Boolean).join(' '),
    )

    // Timeline client V1 : on ne crée un événement 'client_info_updated' que
    // si au moins un champ a réellement été renseigné avec une valeur non
    // vide (pas de bruit dans la timeline pour une requête sans changement
    // réel). Le message client a son propre événement dédié.
    const infoUpdated = Boolean(
      firstName || lastName || email || phone || address || budget || timeline ||
      availability || urgency || details || photoUrls.length > 0,
    )

    if (message) {
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

    if (infoUpdated) {
      await createClientEvent({
        projectId: String(project.id),
        artisanId: String(project.artisan_id),
        eventType: 'client_info_updated',
        visibility: 'client',
        source: 'client',
        title: 'Informations complétées',
        message: 'Le client a complété des informations sur sa demande.',
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
