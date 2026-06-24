import { NextRequest, NextResponse } from 'next/server'
import { TABLES, getArtisanConfig, getDevisByToken, updateDevis } from '@/src/lib/airtable'
import { notifyArtisanQuoteDeclined } from '@/src/lib/artisan-notifications'
import { mapSupabaseProject } from '@/src/lib/supabase/mapping'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { createDeclinedDevisSnapshot } from '@/src/lib/devis-snapshots'

const MAX_REQUESTS_PER_IP = 5
const requestCounts = new Map<string, number>()

async function logDevisDeclinedActivity(projectId: string, declineReason: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action: 'Devis refusé',
    description: `Devis refusé — motif : ${declineReason}`,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[DEVIS PUBLIC DECLINE] Activity insert error:', JSON.stringify(error, null, 2))
  }
}

async function logProjectLostActivity(projectId: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action: 'Dossier perdu',
    description: 'Dossier passé en Perdu automatiquement suite au refus du devis.',
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[DEVIS PUBLIC DECLINE] Activity insert error:', JSON.stringify(error, null, 2))
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

    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const reasonCategory = typeof body.reasonCategory === 'string' ? body.reasonCategory.trim() : ''

    if (!reason) {
      return NextResponse.json({ error: 'Le motif du refus est requis' }, { status: 400 })
    }

    const devis = await getDevisByToken(token)
    if (!devis) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    if (devis.accepted) {
      return NextResponse.json({ error: 'Ce devis a déjà été accepté' }, { status: 400 })
    }

    if (devis.statut === 'Refusé' || devis.declinedAt) {
      return NextResponse.json({ error: 'Devis déjà refusé' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const declineReason = `${reasonCategory || 'Autre'} — ${reason}`
    const noteEntry = `[${now}] Refus prospect (${reasonCategory || 'Autre'}) : ${reason}`
    const existingNote = devis.noteInterne || ''

    const config = await getArtisanConfig(devis.artisanId)
    const declinedSnapshot = await createDeclinedDevisSnapshot({
      devis,
      config,
      decline: {
        declinedAt: now,
        reason: declineReason,
        ip,
        userAgent,
      },
    })

    await updateDevis(devis.id, {
      statut: 'Refusé',
      declinedAt: now,
      declineReason,
      noteInterne: existingNote ? `${existingNote}\n${noteEntry}` : noteEntry,
      ...(declinedSnapshot ? { declinedSnapshotId: declinedSnapshot.id } : {}),
    })

    const { data: projectRow, error: projectFetchError } = await supabaseAdmin
      .from(TABLES.projects)
      .select('*')
      .eq('id', devis.projectId)
      .limit(1)
      .maybeSingle()

    if (projectFetchError) {
      console.error('[DEVIS PUBLIC DECLINE] Project fetch error:', JSON.stringify(projectFetchError, null, 2))
    }

    let projectWasAlreadyLost = false
    if (projectRow) {
      projectWasAlreadyLost = projectRow.status === 'Perdu'
      const { error: projectUpdateError } = await supabaseAdmin
        .from(TABLES.projects)
        .update({ status: 'Perdu' })
        .eq('id', devis.projectId)

      if (projectUpdateError) {
        console.error('[DEVIS PUBLIC DECLINE] Project status update error:', JSON.stringify(projectUpdateError, null, 2))
      }
    }

    await logDevisDeclinedActivity(devis.projectId, declineReason)
    if (projectRow && !projectWasAlreadyLost) {
      await logProjectLostActivity(devis.projectId)
    }

    if (projectRow) {
      const project = mapSupabaseProject(projectRow)
      await notifyArtisanQuoteDeclined({
        artisanId: project.artisanId,
        devisNumber: devis.devisNumber,
        clientName: devis.clientName || project.clientName,
        projectType: project.projectType || project.trade,
        city: project.city,
        totalTTC: devis.totalTTC,
        declineReason,
        projectId: devis.projectId,
      })
    }

    return NextResponse.json({ success: true, declined_at: now, decline_reason: declineReason, status: 'Perdu' })
  } catch (error) {
    console.error('[DEVIS PUBLIC DECLINE]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
