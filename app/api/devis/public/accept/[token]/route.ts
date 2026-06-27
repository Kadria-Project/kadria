import { NextRequest, NextResponse } from 'next/server'
import { TABLES, getArtisanConfig, getDevisByToken, updateDevis } from '@/src/lib/airtable'
import { notifyArtisanQuoteAccepted } from '@/src/lib/artisan-notifications'
import { mapSupabaseProject } from '@/src/lib/supabase/mapping'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import {
  createAcceptedDevisSnapshot,
  createSentDevisSnapshot,
  getExistingSnapshot,
} from '@/src/lib/devis-snapshots'

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
    const userAgent = request.headers.get('user-agent') || 'unknown'

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
    const config = await getArtisanConfig(devis.artisanId)

    // Route publique sans session artisan : on charge le projet lié en amont pour
    // pouvoir resoudre artisan_id via project.artisan_id si devis.artisan_id manquait.
    const { data: projectRowForSnapshot, error: projectFetchForSnapshotError } = await supabaseAdmin
      .from(TABLES.projects)
      .select('*')
      .eq('id', devis.projectId)
      .limit(1)
      .maybeSingle()

    if (projectFetchForSnapshotError) {
      console.error('[DEVIS PUBLIC ACCEPT] Project fetch error (snapshot):', JSON.stringify(projectFetchForSnapshotError, null, 2))
    }

    const projectForSnapshot = projectRowForSnapshot ? mapSupabaseProject(projectRowForSnapshot) : null

    // Le frontend public n'envoie pas de nom/email distinct a l'acceptation —
    // on retombe sur les coordonnees client deja connues du devis.
    const acceptedByName = devis.clientName || null
    const acceptedByEmail = devis.clientEmail || null

    // Garantit qu'un snapshot "sent" existe toujours avant l'acceptation,
    // meme si l'envoi initial n'a pas pu en creer un (mode fallback).
    const existingSentSnapshot = await getExistingSnapshot(devis.id, 'sent')
    if (!existingSentSnapshot) {
      await createSentDevisSnapshot({
        devis,
        config,
        project: projectForSnapshot,
        options: { isFallback: true },
      })
    }

    const acceptedSnapshot = await createAcceptedDevisSnapshot({
      devis,
      config,
      project: projectForSnapshot,
      acceptance: {
        acceptedAt: now,
        acceptedByName,
        acceptedByEmail,
        ip,
        userAgent,
      },
    })

    await updateDevis(devis.id, {
      accepted: true,
      acceptedAt: now,
      acceptedIp: ip,
      statut: 'Accepté',
      acceptedUserAgent: userAgent,
      acceptedByName,
      acceptedByEmail,
      ...(acceptedSnapshot ? { acceptedSnapshotId: acceptedSnapshot.id } : {}),
    })

    const projectRow = projectRowForSnapshot

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
      await notifyArtisanQuoteAccepted({
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
