import { NextRequest, NextResponse } from 'next/server'
import { TABLES, getDevisById, resolveProjectId, updateDevis } from '@/src/lib/airtable'
import { requireFeatureAccess } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'

async function createActivityLogSupabase(projectId: string, action: string, description: string) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action,
    description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[DEVIS FOLLOW-UP TOGGLE ACTIVITY] Insert error:', JSON.stringify(error, null, 2))
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireFeatureAccess('quoteGeneration')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const { id } = await params
    const devis = await getDevisById(id)
    if (!devis) {
      return NextResponse.json({ success: false, error: 'Devis introuvable' }, { status: 404 })
    }

    if (devis.artisanId !== access.session.artisanId) {
      return NextResponse.json({ success: false, error: 'Acces non autorise' }, { status: 403 })
    }

    if (devis.accepted || devis.acceptedAt) {
      return NextResponse.json({ success: false, error: 'Devis accepte — aucune relance a desactiver' }, { status: 400 })
    }
    if (devis.declinedAt || devis.declineReason) {
      return NextResponse.json({ success: false, error: 'Devis refuse — aucune relance a desactiver' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const disabled = Boolean(body.disabled)
    const now = new Date().toISOString()

    const updated = await updateDevis(id, {
      followUpDisabled: disabled,
      followUpDisabledAt: disabled ? now : null,
    })

    const project = await resolveProjectId(devis.projectId)
    if (project) {
      await createActivityLogSupabase(
        project.id,
        disabled ? 'DEVIS_FOLLOW_UP_DISABLED' : 'DEVIS_FOLLOW_UP_ENABLED',
        disabled
          ? `Relances desactivees pour le devis ${devis.devisNumber}.`
          : `Relances reactivees pour le devis ${devis.devisNumber}.`
      )
    }

    return NextResponse.json({ success: true, devis: updated })
  } catch (error) {
    console.error('[DEVIS FOLLOW-UP TOGGLE]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
