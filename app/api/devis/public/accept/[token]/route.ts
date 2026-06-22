import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { TABLES, getDevisByToken, getUserByArtisanIdentifier, updateDevis } from '@/src/lib/airtable'
import { mapSupabaseProject } from '@/src/lib/supabase/mapping'
import { supabaseAdmin } from '@/src/lib/supabase/server'

const MAX_REQUESTS_PER_IP = 5
const requestCounts = new Map<string, number>()

async function logDevisAcceptedActivity(projectId: string, devisNumber: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action: 'Devis accepté',
    description: `Devis ${devisNumber} accepté — dossier passé en Gagné automatiquement.`,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[DEVIS PUBLIC ACCEPT] Activity insert error:', JSON.stringify(error, null, 2))
  }
}

async function notifyArtisanDevisAccepted(params: {
  artisanId: string
  devisNumber: string
  clientName: string
  projectType: string
  city: string
  totalTTC: number
  projectId: string
}) {
  try {
    const artisan = await getUserByArtisanIdentifier(params.artisanId)
    if (!artisan?.email) {
      console.error('[DEVIS PUBLIC ACCEPT] Pas d\'email artisan disponible pour artisan_id:', params.artisanId)
      return
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('[DEVIS PUBLIC ACCEPT] RESEND_API_KEY manquante, notification non envoyée')
      return
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.kadria.fr'
    const projectUrl = `${baseUrl}/dashboard-v2/projet/${params.projectId}`
    const amount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(params.totalTTC || 0)

    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'devis@kadria.fr',
      to: artisan.email,
      subject: 'Devis accepté — nouveau chantier gagné',
      html: `
        <p>Le devis a été accepté. Le dossier est passé automatiquement en <strong>Gagné</strong>.</p>
        <ul>
          <li><strong>Client :</strong> ${params.clientName || 'Non renseigné'}</li>
          <li><strong>Type de projet :</strong> ${params.projectType || 'Non renseigné'}</li>
          <li><strong>Commune :</strong> ${params.city || 'Non renseignée'}</li>
          <li><strong>Montant du devis :</strong> ${amount}</li>
        </ul>
        <p><a href="${projectUrl}">Voir la fiche projet</a></p>
      `,
    })
  } catch (error) {
    console.error('[DEVIS PUBLIC ACCEPT] Échec envoi notification artisan:', error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length !== 36) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    const count = (requestCounts.get(ip) || 0) + 1
    requestCounts.set(ip, count)
    if (count > MAX_REQUESTS_PER_IP) {
      return NextResponse.json({ error: 'Trop de requêtes, veuillez réessayer plus tard' }, { status: 429 })
    }

    const devis = await getDevisByToken(token)
    if (!devis) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    if (devis.accepted) {
      return NextResponse.json({ error: 'Devis déjà accepté' }, { status: 400 })
    }

    const now = new Date().toISOString()

    await updateDevis(devis.id, {
      accepted: true,
      acceptedAt: now,
      acceptedIp: ip,
      statut: 'Accepté',
    })

    const { data: projectRow, error: projectFetchError } = await supabaseAdmin
      .from(TABLES.projects)
      .select('*')
      .eq('id', devis.projectId)
      .limit(1)
      .maybeSingle()

    if (projectFetchError) {
      console.error('[DEVIS PUBLIC ACCEPT] Project fetch error:', JSON.stringify(projectFetchError, null, 2))
    }

    if (projectRow) {
      const { error: projectUpdateError } = await supabaseAdmin
        .from(TABLES.projects)
        .update({ status: 'Gagné' })
        .eq('id', devis.projectId)

      if (projectUpdateError) {
        console.error('[DEVIS PUBLIC ACCEPT] Project status update error:', JSON.stringify(projectUpdateError, null, 2))
      }
    }

    await logDevisAcceptedActivity(devis.projectId, devis.devisNumber)

    if (projectRow) {
      const project = mapSupabaseProject(projectRow)
      await notifyArtisanDevisAccepted({
        artisanId: project.artisanId,
        devisNumber: devis.devisNumber,
        clientName: devis.clientName || project.clientName,
        projectType: project.projectType || project.trade,
        city: project.city,
        totalTTC: devis.totalTTC,
        projectId: devis.projectId,
      })
    }

    return NextResponse.json({ success: true, accepted_at: now, status: 'Gagné' })
  } catch (error) {
    console.error('[DEVIS PUBLIC ACCEPT]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
