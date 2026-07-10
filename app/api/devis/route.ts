import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  TABLES,
  createDevis,
  getArtisanConfig,
  getDevisByProjet,
  resolveProjectId,
  updateArtisanConfig,
} from '@/src/lib/airtable'
import { getSession, requireFeatureAccess } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext, resolveTenantIdentity } from '@/src/lib/tenant-context'
import { canCreateDevis } from '@/src/lib/usage/quotas'
import { getPlanLabel } from '@/src/lib/plans'

async function createActivityLogSupabase(projectId: string, action: string, description: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action,
    description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[DEVIS ACTIVITY] Insert error:', JSON.stringify(error, null, 2))
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projetId =
      searchParams.get('projectId') ||
      searchParams.get('projetId') ||
      searchParams.get('projet_id')

    if (!projetId) {
      return NextResponse.json(
        { success: false, error: 'projet_id requis' },
        { status: 400 }
      )
    }

    const project = await resolveProjectId(projetId)
    if (!project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }
    if (project.artisanId !== session.artisanId) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    const devis = await getDevisByProjet(project.id)
    if (devis.length === 0) {
      console.warn('[DEVIS GET] Aucun devis trouvé pour projet', { requestedProjetId: projetId, resolvedProjectId: project.id })
    }
    const list = devis
      .filter((d) => d.artisanId === session.artisanId)
      .map((d) => ({
        id: d.id,
        numero: d.devisNumber,
        token: d.token,
        amount: d.totalTTC,
        sent: d.sent,
        statut: d.statut,
        pdf_url: d.pdfUrl,
        date_emission: d.dateEmission,
        date_validite: d.dateValidite,
        client_email: d.clientEmail,
        opens_count: d.opensCount,
        last_opened_date: d.lastOpenedDate,
        accepted: d.accepted,
        accepted_at: d.acceptedAt,
        quote_sent_at: d.quoteSentAt,
        last_follow_up_at: d.lastFollowUpAt,
        follow_up_count: d.followUpCount,
        declined: d.statut === 'Refusé' || Boolean(d.declinedAt) || Boolean(d.declineReason),
        declined_at: d.declinedAt,
        decline_reason: d.declineReason,
        first_opened_at: d.firstOpenedAt,
        follow_up_disabled: d.followUpDisabled,
        follow_up_disabled_at: d.followUpDisabledAt,
      }))
      .sort((a, b) => (b.date_emission || '').localeCompare(a.date_emission || ''))

    return NextResponse.json({ success: true, devis: list })
  } catch (error) {
    console.error('[DEVIS GET]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireFeatureAccess('quoteGeneration')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }
    const session = access.session

    const devisQuota = await canCreateDevis(session.artisanId)
    if (devisQuota.success && !devisQuota.allowed && devisQuota.exceededReason === 'devis_limit') {
      return NextResponse.json(
        {
          success: false,
          error: `Vous avez atteint les ${devisQuota.limit} devis inclus dans l'offre ${getPlanLabel(devisQuota.plan)}.`,
          quotaExceeded: true,
          feature: 'quoteGeneration',
          currentPlan: devisQuota.plan,
          requiredPlan: 'performance',
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    if (!body.projetId) {
      return NextResponse.json(
        { success: false, error: 'projetId requis' },
        { status: 400 }
      )
    }

    if (!body.objet || !String(body.objet).trim()) {
      return NextResponse.json(
        { success: false, error: 'L\'objet du devis est requis' },
        { status: 400 }
      )
    }

    const itemLines = Array.isArray(body.lines)
      ? body.lines.filter((l: { type?: string; description?: string }) => l.type === 'item' && l.description?.trim())
      : []

    if (itemLines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Le devis doit contenir au moins une ligne avec une description' },
        { status: 400 }
      )
    }

    const config = await getArtisanConfig(session.artisanId)
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Configuration non trouvée pour cet Artisan ID' },
        { status: 404 }
      )
    }

    const project = await resolveProjectId(body.projetId)
    if (!project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }
    if (project.artisanId !== session.artisanId) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    const prefixe = config.devisPrefixe || 'DEV'
    const numero = (config.devisCompteur || 0) + 1
    const devisNumber = `${prefixe}-${new Date().getFullYear()}-${String(numero).padStart(3, '0')}`

    const token = randomUUID()

    let devis
    try {
      const tenantContext = await getCurrentTenantContext()
      const tenantIdentity =
        tenantContext && tenantContext.legacyArtisanId === session.artisanId
          ? { tenantId: tenantContext.tenantId, legacyArtisanId: tenantContext.legacyArtisanId }
          : await resolveTenantIdentity({ artisanId: session.artisanId, projectId: project.id })

      devis = await createDevis({
        devisNumber,
        token,
        projectId: project.id,
        artisanId: session.artisanId,
        tenantId: tenantIdentity?.tenantId || null,
        dateEmission: body.dateEmission || '',
        dateValidite: body.dateValidite || '',
        objet: body.objet,
        lignesJson: JSON.stringify(body.lines || []),
        totalHT: Number(body.totalHT) || 0,
        totalTVA: Number(body.totalTVA) || 0,
        tvaBreakdownJson: JSON.stringify(body.tvaBreakdown || {}),
        totalTTC: Number(body.totalTTC) || 0,
        conditionsPaiement: body.conditionsPaiement || '',
        delaiExecution: body.delaiExecution || '',
        mentionsLegales: body.mentionsLegales || '',
        noteInterne: body.noteInterne || '',
        statut: 'Brouillon',
        clientName: body.clientName || '',
        clientAddress: body.clientAddress || '',
        clientEmail: body.clientEmail || '',
        clientPhone: body.clientPhone || '',
        createdAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('[DEVIS POST] Création du devis échouée', error instanceof Error ? error.message : String(error))
      return NextResponse.json(
        { success: false, error: 'Erreur création devis' },
        { status: 500 }
      )
    }

    await updateArtisanConfig(session.artisanId, { devis_compteur: numero })

    try {
      // Le devis est créé en Brouillon (pas encore envoyé au client) : ne pas faire
      // basculer le statut projet sur "Devis envoyé" ici. Ce basculement a lieu
      // uniquement dans finalize/route.ts au moment de l'envoi réel (mode: 'send').
      const { error: projectUpdateError } = await supabaseAdmin
        .from(TABLES.projects)
        .update({ devis_amount: Number(body.totalTTC) || 0 })
        .eq('id', project.id)

      if (projectUpdateError) {
        throw projectUpdateError
      }

      await createActivityLogSupabase(
        project.id,
        'DEVIS_CREATED',
        `Devis ${devisNumber} généré — ${(Number(body.totalTTC) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC`
      )
    } catch (error) {
      console.error('[DEVIS POST] Mise à jour du projet échouée', error instanceof Error ? error.message : String(error))
    }

    return NextResponse.json({ success: true, devis, devis_id: devis.id, numero: devisNumber, token })
  } catch (error) {
    console.error('[DEVIS POST]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
