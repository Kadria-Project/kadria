import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { TABLES } from '@/src/lib/airtable'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { isEventType } from '@/src/lib/calendar/event-types'
import { listTeamMembers } from '@/src/lib/team/service'

// Création rapide d'un rendez-vous depuis le planning d'équipe desktop
// (bouton "+" / clic sur un créneau vide). Distincte de
// /api/appointments/book (qui crée un événement Google Calendar synchronisé
// pour un projet donné) : cette route crée directement une ligne
// `project_appointments` "Kadria" (source = 'team-planning'), avec ou sans
// projet lié, avec un type d'événement et une affectation collaborateur.
//
// SÉCURITÉ MULTI-TENANT (critique) :
// - Le tenant est TOUJOURS résolu côté serveur via getCurrentTenantContext()
//   — jamais un tenant_id envoyé par le client.
// - Si un projectId est fourni, on vérifie qu'il appartient bien au tenant
//   courant avant de l'utiliser (sinon rejet 403).
// - Si un assignedUserId est fourni par le client, on vérifie qu'il
//   correspond bien à un membre ACTIF du tenant courant avant de l'accepter
//   (sinon rejet explicite 400/403). En tenant mono-utilisateur, l'affectation
//   est automatique au seul membre actif sans consulter le client.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const tenantContext = await getCurrentTenantContext()
    if (!tenantContext) {
      return NextResponse.json(
        { success: false, error: 'Contexte workspace introuvable pour ce compte.' },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ success: false, error: 'Corps de requête invalide' }, { status: 400 })
    }

    const {
      title,
      eventType,
      start,
      end,
      allDay,
      location,
      description,
      projectId,
      assignedUserId: requestedAssignedUserId,
    } = body as {
      title?: string
      eventType?: string
      start?: string
      end?: string
      allDay?: boolean
      location?: string
      description?: string
      projectId?: string | null
      assignedUserId?: string | null
    }

    if (!title || !start) {
      return NextResponse.json({ success: false, error: 'Titre et date de début requis' }, { status: 400 })
    }

    if (!isEventType(eventType)) {
      return NextResponse.json({ success: false, error: 'Type d’événement invalide' }, { status: 400 })
    }

    // Projet optionnel : s'il est fourni, il DOIT appartenir au tenant
    // courant. On ne fait jamais confiance à des champs client/adresse
    // envoyés directement — on relit toujours depuis le projet en base.
    let clientName: string | null = null
    let clientPhone: string | null = null
    let resolvedLocation: string | null = location || null

    if (projectId) {
      const { data: project, error: projectError } = await supabaseAdmin
        .from(TABLES.projects)
        .select('id, tenant_id, artisan_id, client_name, client_first_name, client_phone, site_address, city')
        .eq('id', projectId)
        .maybeSingle()

      if (projectError) {
        console.error('[APPOINTMENTS CREATE] Erreur lecture projet:', projectError.message)
        return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
      }
      if (!project) {
        return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
      }
      const projectTenantId = (project as Record<string, unknown>).tenant_id
        ? String((project as Record<string, unknown>).tenant_id)
        : null
      const projectBelongsToTenant = projectTenantId
        ? projectTenantId === tenantContext.tenantId
        : project.artisan_id === tenantContext.legacyArtisanId
      if (!projectBelongsToTenant) {
        return NextResponse.json({ success: false, error: 'Accès non autorisé à ce projet' }, { status: 403 })
      }

      clientName = [project.client_first_name, project.client_name].filter(Boolean).join(' ').trim() || null
      clientPhone = project.client_phone || null
      resolvedLocation = resolvedLocation || [project.site_address, project.city].filter(Boolean).join(', ') || null
    }

    // Affectation collaborateur : on ne fait JAMAIS confiance à un
    // assignedUserId client sans vérifier qu'il appartient au tenant en
    // cours, en tant que membre actif.
    const activeMembers = await listTeamMembers(tenantContext.tenantId)
    const activeMemberIds = new Set(activeMembers.filter((m) => m.status === 'active').map((m) => m.userId))

    let assignedUserId: string | null = null
    if (activeMemberIds.size <= 1) {
      // Tenant mono-utilisateur : affectation automatique, aucune valeur
      // cliente prise en compte.
      assignedUserId = tenantContext.userId
    } else if (requestedAssignedUserId) {
      if (!activeMemberIds.has(requestedAssignedUserId)) {
        return NextResponse.json(
          { success: false, error: 'Le collaborateur sélectionné n’appartient pas à votre équipe.' },
          { status: 403 },
        )
      }
      assignedUserId = requestedAssignedUserId
    }
    // Si aucun assignedUserId n'est fourni et que le tenant a plusieurs
    // membres, l'événement reste volontairement non affecté (is_unassigned).

    const insertRow = {
      artisan_id: tenantContext.legacyArtisanId,
      project_id: projectId || null,
      provider: 'kadria',
      title,
      start_time: start,
      end_time: end || start,
      location: resolvedLocation,
      client_name: clientName,
      client_phone: clientPhone,
      status: 'confirmed',
      tenant_id: tenantContext.tenantId,
      assigned_user_id: assignedUserId,
      created_by_user_id: tenantContext.userId,
      event_type: eventType,
      all_day: Boolean(allDay),
      description: description || null,
      source: 'team-planning',
      is_unassigned: !assignedUserId,
    }

    const { data: appointment, error: insertError } = await supabaseAdmin
      .from('project_appointments')
      .insert(insertRow)
      .select('id, start_time, end_time, location, status, assigned_user_id, is_unassigned, event_type')
      .single()

    if (insertError) {
      console.error('[APPOINTMENTS CREATE] Erreur insertion project_appointments:', insertError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        start: appointment.start_time,
        end: appointment.end_time,
        location: appointment.location,
        status: appointment.status,
        assignedUserId: appointment.assigned_user_id,
        isUnassigned: appointment.is_unassigned,
        eventType: appointment.event_type,
      },
    })
  } catch (error) {
    console.error('[APPOINTMENTS CREATE]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
