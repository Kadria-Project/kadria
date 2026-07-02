import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function isValidToken(token: string | undefined): token is string {
  return !!token && /^[0-9a-f]{48}$/i.test(token)
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
    .select('id, completion_status, client_first_name, client_name')
    .eq('sms_completion_token', token)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
  }

  if (data.completion_status === 'completed') {
    return NextResponse.json({ error: 'Ce lien a déjà été utilisé' }, { status: 410 })
  }

  return NextResponse.json({
    valid: true,
    clientFirstName: data.client_first_name || data.client_name || '',
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

  const details = typeof (body as Record<string, unknown>)?.details === 'string'
    ? String((body as Record<string, unknown>).details).trim().slice(0, 4000)
    : ''

  if (!details) {
    return NextResponse.json({ error: 'Merci de renseigner quelques précisions.' }, { status: 400 })
  }

  const { data: project, error: fetchError } = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, ai_summary, completion_status')
    .eq('sms_completion_token', token)
    .maybeSingle()

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
  }

  if (project.completion_status === 'completed') {
    return NextResponse.json({ error: 'Ce lien a déjà été utilisé' }, { status: 410 })
  }

  const existingSummary = String(project.ai_summary || '').trim()
  const updatedSummary = [
    existingSummary,
    `Précisions complémentaires (via lien SMS) : ${details}`,
  ].filter(Boolean).join('\n\n')

  const { error: updateError } = await supabaseAdmin
    .from(TABLES.projects)
    .update({
      ai_summary: updatedSummary,
      completion_status: 'completed',
      completion_completed_at: new Date().toISOString(),
      completion_source: 'sms_link',
    })
    .eq('id', project.id)

  if (updateError) {
    console.error('[COMPLETER] Échec mise à jour projet:', updateError.message)
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
