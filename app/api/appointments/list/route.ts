import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { TABLES } from '@/src/lib/airtable'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'

// Route additionnelle (lecture seule) permettant de lister les rendez-vous
// Kadria (table project_appointments) de l'artisan connecté sur une plage de
// dates, pour l'affichage en grille semaine de l'agenda desktop. N'existait
// pas avant ce lot : /api/appointments/by-project ne renvoie qu'un seul
// rendez-vous pour un projet donné, insuffisant pour peupler une semaine
// entière. Ne modifie aucune route existante.
//
// Lot "planning d'équipe" : la route est maintenant scopée par tenant (et
// plus seulement par artisan_id) et supporte un filtre collaborateur, afin
// de peupler le sélecteur "Tous / Moi / <collaborateur> / Non affectés" du
// planning d'équipe desktop. Le tenant_id est TOUJOURS résolu côté serveur
// via getCurrentTenantContext() — jamais fait confiance à une valeur envoyée
// par le client. Si aucun contexte tenant n'est résolu (compte non migré /
// démo), on retombe sur l'ancien filtrage par artisan_id pour ne rien
// casser côté mono-utilisateur.

function tableMissing(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message || ''
  return /relation .* does not exist/i.test(message) || (error as { code?: string } | null)?.code === '42P01'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const artisanId = session.artisanId
    const tenantContext = await getCurrentTenantContext()
    const { searchParams } = request.nextUrl
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    // 'me' | 'unassigned' | <userId> | null (= tous)
    const collaborator = searchParams.get('collaborator')

    let query = supabaseAdmin
      .from('project_appointments')
      .select(
        'id, project_id, start_time, end_time, location, status, client_name, google_event_id, title, tenant_id, assigned_user_id, event_type, all_day, description, is_unassigned',
      )
      .order('start_time', { ascending: true })
      .limit(500)

    // Scoping serveur strict : jamais de tenant_id fourni par le client.
    if (tenantContext) {
      query = query.eq('tenant_id', tenantContext.tenantId)
    } else {
      query = query.eq('artisan_id', artisanId)
    }

    if (from) query = query.gte('start_time', from)
    if (to) query = query.lte('start_time', to)

    if (collaborator === 'unassigned') {
      query = query.eq('is_unassigned', true)
    } else if (collaborator === 'me' && tenantContext) {
      query = query.eq('assigned_user_id', tenantContext.userId)
    } else if (collaborator && collaborator !== 'all' && tenantContext) {
      // Un identifiant de collaborateur explicite : on ne fait confiance à
      // cette valeur que pour filtrer (lecture), la vérification
      // d'appartenance au tenant est de toute façon garantie par le filtre
      // tenant_id ci-dessus (un membre d'un autre tenant ne peut de toute
      // façon pas apparaître dans les résultats).
      query = query.eq('assigned_user_id', collaborator)
    }

    const { data, error } = await query

    if (error) {
      if (tableMissing(error)) {
        return NextResponse.json({ success: true, appointments: [] })
      }
      console.error('[APPOINTMENTS LIST] Erreur lecture appointments:', error.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    const rows = data || []
    const projectIds = Array.from(new Set(rows.map((row) => row.project_id).filter(Boolean)))

    const projectById = new Map<string, { id: string; clientName: string; projectType: string; city: string; artisanId: string }>()

    if (projectIds.length) {
      const { data: projects, error: projectsError } = await supabaseAdmin
        .from(TABLES.projects)
        .select('id, client_name, client_first_name, project_type, city, artisan_id')
        .in('id', projectIds)

      if (!projectsError && projects) {
        for (const p of projects) {
          const record = p as Record<string, unknown>
          const id = String(record.id || '')
          if (!id) continue
          projectById.set(id, {
            id,
            clientName: [record.client_first_name, record.client_name].filter(Boolean).join(' ').trim(),
            projectType: String(record.project_type || ''),
            city: String(record.city || ''),
            artisanId: String(record.artisan_id || ''),
          })
        }
      }
    }

    // Résolution des noms de collaborateurs affectés (pour affichage carte).
    const assignedUserIds = Array.from(
      new Set(rows.map((row) => (row as Record<string, unknown>).assigned_user_id).filter(Boolean)),
    ) as string[]
    const userNameById = new Map<string, string>()
    if (assignedUserIds.length) {
      const { data: users } = await supabaseAdmin.from('Users').select('id, first_name, last_name, email').in('id', assignedUserIds)
      for (const u of users || []) {
        const record = u as Record<string, unknown>
        const id = String(record.id || '')
        if (!id) continue
        const name = [record.first_name, record.last_name].filter(Boolean).join(' ').trim() || String(record.email || 'Collaborateur')
        userNameById.set(id, name)
      }
    }

    const appointments = rows
      .filter((row) => {
        // Ne jamais exposer un rendez-vous lié à un projet d'un autre artisan
        // (double vérification en plus du filtre tenant_id/artisan_id sur la
        // table project_appointments elle-même).
        if (!row.project_id) return true
        const project = projectById.get(row.project_id)
        return !project || tenantContext || project.artisanId === artisanId
      })
      .map((row) => {
        const record = row as Record<string, unknown>
        const project = row.project_id ? projectById.get(row.project_id) : undefined
        const assignedUserId = record.assigned_user_id ? String(record.assigned_user_id) : null
        return {
          id: row.id,
          projectId: row.project_id || null,
          projectNumber: project ? project.id.slice(-6) : row.project_id ? String(row.project_id).slice(-6) : null,
          clientName: project?.clientName || row.client_name || null,
          projectType: project?.projectType || null,
          city: project?.city || null,
          title: row.title || null,
          start: row.start_time,
          end: row.end_time,
          location: row.location,
          status: row.status,
          googleEventId: row.google_event_id || null,
          eventType: String(record.event_type || 'appointment'),
          allDay: Boolean(record.all_day),
          description: record.description ? String(record.description) : null,
          assignedUserId,
          assignedUserName: assignedUserId ? userNameById.get(assignedUserId) || null : null,
          isUnassigned: Boolean(record.is_unassigned),
        }
      })

    return NextResponse.json({ success: true, appointments })
  } catch (error) {
    console.error('[APPOINTMENTS LIST]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
