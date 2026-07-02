import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function isValidToken(token: string | undefined): token is string {
  return !!token && /^[0-9a-f]{48}$/i.test(token)
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// Référence tronquée du token pour les logs (jamais le token complet).
function tokenRef(token: string): string {
  return `${token.slice(0, 6)}…`
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
      console.error('[COMPLETER] Activity insert error:', error.message)
    }
  } catch (e) {
    console.error('[COMPLETER] Activity insert threw:', e instanceof Error ? e.message : String(e))
  }
}

// Page publique de complément d'infos après appel Vapi : ne renvoie que le
// strict nécessaire pour afficher un formulaire poli, jamais les données
// internes du projet (artisan, autres clients, etc.).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  if (!isValidToken(token)) {
    return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, completion_status, client_first_name, client_name, project_title, ai_summary')
    .eq('sms_completion_token', token)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
  }

  if (data.completion_status === 'completed') {
    return NextResponse.json({
      alreadyCompleted: true,
      clientFirstName: data.client_first_name || data.client_name || '',
    })
  }

  const summary = String(data.ai_summary || '').trim()
  const needSummary = summary ? summary.slice(0, 220) : ''

  return NextResponse.json({
    valid: true,
    clientFirstName: data.client_first_name || data.client_name || '',
    projectTitle: data.project_title || '',
    needSummary,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
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

  const firstName = typeof b.firstName === 'string' ? b.firstName.trim().slice(0, 120) : ''
  const lastName = typeof b.lastName === 'string' ? b.lastName.trim().slice(0, 120) : ''
  const email = typeof b.email === 'string' ? b.email.trim().slice(0, 200) : ''
  const details = typeof b.details === 'string' ? b.details.trim().slice(0, 4000) : ''

  const addressRaw = (b.address || {}) as Record<string, unknown>
  const addressLabel = typeof addressRaw.label === 'string' ? addressRaw.label.trim().slice(0, 300) : ''
  const addressCity = typeof addressRaw.city === 'string' ? addressRaw.city.trim().slice(0, 120) : ''
  const addressPostcode = typeof addressRaw.postcode === 'string' ? addressRaw.postcode.trim().slice(0, 10) : ''
  const addressLatitude = typeof addressRaw.latitude === 'number' && Number.isFinite(addressRaw.latitude) ? addressRaw.latitude : null
  const addressLongitude = typeof addressRaw.longitude === 'number' && Number.isFinite(addressRaw.longitude) ? addressRaw.longitude : null

  const photosRaw = Array.isArray(b.photos) ? b.photos : []
  const photoUrls = photosRaw
    .map((p) => (p && typeof p === 'object' ? String((p as Record<string, unknown>).url || '') : ''))
    .filter(Boolean)
    .slice(0, 10)

  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
  }

  if (!addressLabel && !details) {
    return NextResponse.json({ error: 'Merci de renseigner votre adresse ou quelques précisions.' }, { status: 400 })
  }

  const { data: project, error: fetchError } = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, ai_summary, completion_status, photos')
    .eq('sms_completion_token', token)
    .maybeSingle()

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
  }

  if (project.completion_status === 'completed') {
    return NextResponse.json({ error: 'Ce dossier a déjà été complété.' }, { status: 410 })
  }

  const update: Record<string, unknown> = {
    completion_status: 'completed',
    completion_completed_at: new Date().toISOString(),
    completion_source: 'sms_link',
  }

  if (firstName) update.client_first_name = firstName
  if (firstName || lastName) {
    update.client_name = [firstName, lastName].filter(Boolean).join(' ').trim()
  }
  if (email) update.client_email = email
  if (addressLabel) update.site_address = addressLabel
  if (addressCity) update.city = addressCity
  if (addressPostcode) update.postal_code = addressPostcode
  if (addressLatitude !== null) update.latitude = addressLatitude
  if (addressLongitude !== null) update.longitude = addressLongitude

  if (details) {
    const existingSummary = String(project.ai_summary || '').trim()
    update.ai_summary = [
      existingSummary,
      `Précisions complémentaires (via lien SMS) : ${details}`,
    ].filter(Boolean).join('\n\n')
  }

  if (photoUrls.length > 0) {
    const existingPhotos = Array.isArray(project.photos) ? project.photos : []
    update.photos = [...existingPhotos, ...photoUrls.map((url) => ({ url }))]
  }

  const { error: updateError } = await supabaseAdmin
    .from(TABLES.projects)
    .update(update)
    .eq('id', project.id)

  if (updateError) {
    console.error(`[COMPLETER] Échec mise à jour projet (token ${tokenRef(token)}):`, updateError.message)
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
  }

  await createActivityLog(
    project.id,
    'PROJECT_COMPLETION_SUBMITTED',
    [
      'Informations complétées via le lien SMS.',
      addressLabel ? 'Adresse renseignée.' : 'Adresse non renseignée.',
      email ? 'Email renseigné.' : 'Email non renseigné.',
      photoUrls.length > 0 ? `${photoUrls.length} photo(s) ajoutée(s).` : 'Aucune photo ajoutée.',
    ].join(' '),
  )

  return NextResponse.json({ success: true })
}
