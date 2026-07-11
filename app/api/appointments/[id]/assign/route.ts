import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { listTeamMembers } from '@/src/lib/team/service'

// Réaffectation rapide d'un rendez-vous depuis le menu rapide d'une carte
// d'événement du planning d'équipe.
//
// SÉCURITÉ MULTI-TENANT (critique) :
// - Le tenant courant est résolu côté serveur (getCurrentTenantContext),
//   jamais fourni par le client.
// - Le rendez-vous ciblé DOIT appartenir au tenant courant (vérifié en
//   relisant la ligne par id + tenant_id avant toute écriture) : impossible
//   de modifier un événement d'un autre workspace.
// - Le nouvel assignedUserId (s'il n'est pas null, pour "non affecté") DOIT
//   être un membre actif du tenant courant, sinon rejet 403.
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const tenantContext = await getCurrentTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'Contexte workspace introuvable.' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ success: false, error: 'Corps de requête invalide' }, { status: 400 })
    }

    const { assignedUserId } = body as { assignedUserId?: string | null }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('project_appointments')
      .select('id, tenant_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('[APPOINTMENTS ASSIGN] Erreur lecture rendez-vous:', fetchError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Rendez-vous introuvable' }, { status: 404 })
    }
    if (existing.tenant_id !== tenantContext.tenantId) {
      // Ne jamais révéler l'existence d'un rendez-vous d'un autre tenant.
      return NextResponse.json({ success: false, error: 'Rendez-vous introuvable' }, { status: 404 })
    }

    let nextAssignedUserId: string | null = null
    if (assignedUserId) {
      const activeMembers = await listTeamMembers(tenantContext.tenantId)
      const isActiveMember = activeMembers.some((m) => m.status === 'active' && m.userId === assignedUserId)
      if (!isActiveMember) {
        return NextResponse.json(
          { success: false, error: 'Le collaborateur sélectionné n’appartient pas à votre équipe.' },
          { status: 403 },
        )
      }
      nextAssignedUserId = assignedUserId
    }

    const { error: updateError } = await supabaseAdmin
      .from('project_appointments')
      .update({ assigned_user_id: nextAssignedUserId, is_unassigned: !nextAssignedUserId })
      .eq('id', id)
      .eq('tenant_id', tenantContext.tenantId)

    if (updateError) {
      console.error('[APPOINTMENTS ASSIGN] Erreur mise à jour:', updateError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    return NextResponse.json({ success: true, assignedUserId: nextAssignedUserId })
  } catch (error) {
    console.error('[APPOINTMENTS ASSIGN]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
