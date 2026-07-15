import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { TABLES } from '@/src/lib/airtable'
import { haversineDistanceKm } from '@/src/config/travel'
import { canManageTeamPlanning, canReadPlanning } from '@/src/lib/appointments/access'
import { listProjectResponsiblesByTenant } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { listTeamMembers } from '@/src/lib/team/service'
import { getCurrentTenantContext, tableHasColumn } from '@/src/lib/tenant-context'

function tableMissing(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message || ''
  return /relation .* does not exist/i.test(message) || (error as { code?: string } | null)?.code === '42P01'
}

type AppointmentRow = {
  id: string
  project_id: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  status: string | null
  client_name: string | null
  google_event_id: string | null
  title: string | null
  tenant_id: string | null
  assigned_user_id: string | null
  event_type: string | null
  all_day: boolean | null
  description: string | null
  is_unassigned: boolean | null
  qualification_status: string | null
  qualification_outcome: string | null
  qualification_note: string | null
  qualification_next_action: string | null
  qualified_at: string | null
  qualified_by: string | null
  qualification_version: number | null
}

type ProjectLookup = {
  id: string
  clientName: string
  projectType: string
  city: string
  artisanId: string
  clientPhone: string | null
  siteAddress: string | null
  latitude: number | null
  longitude: number | null
  responsibleUserId: string | null
}

type TeamLoadItem = {
  userId: string
  name: string
  role: 'owner' | 'admin' | 'manager' | 'member'
  todayCount: number
  loadPercent: number
  availability: 'available' | 'soon' | 'busy'
  nextAppointmentAt: string | null
}

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function endOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value
}

function addDays(date: Date, days: number) {
  const value = new Date(date)
  value.setDate(value.getDate() + days)
  return value
}

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const artisanId = session.artisanId
    const tenantContext = await getCurrentTenantContext()
    if (tenantContext && !canReadPlanning(tenantContext)) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    const canManageTeam = canManageTeamPlanning(tenantContext)
    const qualificationAvailable = await tableHasColumn('project_appointments', 'qualification_status')
    const { searchParams } = request.nextUrl
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const collaborator = searchParams.get('collaborator')

    const appointmentColumns = [
      'id, project_id, start_time, end_time, location, status, client_name, google_event_id, title, tenant_id, assigned_user_id, event_type, all_day, description, is_unassigned',
      qualificationAvailable ? 'qualification_status, qualification_outcome, qualification_note, qualification_next_action, qualified_at, qualified_by, qualification_version' : '',
    ].filter(Boolean).join(', ')

    let query = supabaseAdmin
      .from('project_appointments')
      .select(appointmentColumns)
      .order('start_time', { ascending: true })
      .limit(500)

    if (tenantContext) {
      query = query.eq('tenant_id', tenantContext.tenantId)
    } else {
      query = query.eq('artisan_id', artisanId)
    }

    if (from) query = query.gte('start_time', from)
    if (to) query = query.lte('start_time', to)

    if (tenantContext) {
      if (!canManageTeam) {
        query = query.eq('assigned_user_id', tenantContext.userId)
      } else if (collaborator === 'unassigned') {
        query = query.eq('is_unassigned', true)
      } else if (collaborator === 'me') {
        query = query.eq('assigned_user_id', tenantContext.userId)
      } else if (collaborator && collaborator !== 'all') {
        query = query.eq('assigned_user_id', collaborator)
      }
    } else if (collaborator === 'unassigned') {
      query = query.eq('is_unassigned', true)
    }

    const { data, error } = await query
    if (error) {
      if (tableMissing(error)) {
        return NextResponse.json({ success: true, appointments: [] })
      }
      console.error('[APPOINTMENTS LIST] Erreur lecture appointments:', error.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    const rows = (data || []) as unknown as AppointmentRow[]
    const projectIds = Array.from(new Set(rows.map((row) => row.project_id).filter(Boolean)))
    const projectById = new Map<string, ProjectLookup>()

    if (projectIds.length) {
      const { data: projects, error: projectsError } = await supabaseAdmin
        .from(TABLES.projects)
        .select('id, client_name, client_first_name, client_phone, project_type, city, artisan_id, site_address, latitude, longitude, responsible_user_id')
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
            clientPhone: record.client_phone ? String(record.client_phone) : null,
            siteAddress: record.site_address ? String(record.site_address) : null,
            latitude: typeof record.latitude === 'number' ? record.latitude : null,
            longitude: typeof record.longitude === 'number' ? record.longitude : null,
            responsibleUserId: record.responsible_user_id ? String(record.responsible_user_id) : null,
          })
        }
      }
    }

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

    const responsibleUserMap =
      tenantContext?.tenantId
        ? await listProjectResponsiblesByTenant(tenantContext.tenantId)
        : new Map()

    const appointments = rows
      .filter((row) => {
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
          clientPhone: project?.clientPhone || null,
          address: project?.siteAddress || row.location || null,
          latitude: project?.latitude || null,
          longitude: project?.longitude || null,
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
          isAssignedToCurrentUser: assignedUserId === tenantContext?.userId,
          isUnassigned: Boolean(record.is_unassigned),
          qualification: qualificationAvailable && record.qualification_status
            ? {
                status: String(record.qualification_status),
                outcome: record.qualification_outcome ? String(record.qualification_outcome) : null,
                note: record.qualification_note ? String(record.qualification_note) : null,
                nextAction: record.qualification_next_action ? String(record.qualification_next_action) : null,
                qualifiedAt: record.qualified_at ? String(record.qualified_at) : null,
                qualifiedBy: record.qualified_by ? String(record.qualified_by) : null,
                version: Number(record.qualification_version || 0),
              }
            : null,
          responsibleUserId: project?.responsibleUserId || null,
          responsibleUserName:
            project?.responsibleUserId
              ? responsibleUserMap.get(project.responsibleUserId)?.displayName || null
              : null,
        }
      })

    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const tomorrowStart = startOfDay(addDays(now, 1))
    const tomorrowEnd = endOfDay(addDays(now, 1))
    const weekStart = startOfDay(addDays(now, -(now.getDay() === 0 ? 6 : now.getDay() - 1)))
    const weekEnd = endOfDay(addDays(weekStart, 6))

    const timedAppointments = appointments
      .map((appointment) => ({
        ...appointment,
        startDate: parseDate(appointment.start),
        endDate: parseDate(appointment.end),
      }))
      .filter((appointment) => appointment.startDate)

    const appointmentsToday = timedAppointments.filter(
      (appointment) => appointment.startDate && appointment.startDate >= todayStart && appointment.startDate <= todayEnd,
    )
    const appointmentsTomorrow = timedAppointments.filter(
      (appointment) => appointment.startDate && appointment.startDate >= tomorrowStart && appointment.startDate <= tomorrowEnd,
    )
    const appointmentsThisWeek = timedAppointments.filter(
      (appointment) => appointment.startDate && appointment.startDate >= weekStart && appointment.startDate <= weekEnd,
    )

    const conflictWarnings: Array<{
      appointmentId: string
      conflictingAppointmentId: string
      title: string
      conflictingTitle: string
      collaboratorName: string
      start: string | null
      conflictingStart: string | null
    }> = []

    const appointmentsByCollaborator = new Map<string, typeof timedAppointments>()
    for (const appointment of timedAppointments) {
      const key = appointment.assignedUserId || '__unassigned__'
      if (!appointmentsByCollaborator.has(key)) appointmentsByCollaborator.set(key, [])
      appointmentsByCollaborator.get(key)!.push(appointment)
    }

    for (const [key, items] of appointmentsByCollaborator) {
      if (key === '__unassigned__') continue
      const sorted = [...items].sort((a, b) => (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0))
      for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1]
        const current = sorted[index]
        if (!previous.endDate || !current.startDate || !previous.startDate) continue
        if (previous.endDate > current.startDate) {
          conflictWarnings.push({
            appointmentId: current.id,
            conflictingAppointmentId: previous.id,
            title: current.title || 'Rendez-vous',
            conflictingTitle: previous.title || 'Rendez-vous',
            collaboratorName: current.assignedUserName || 'Collaborateur',
            start: current.start,
            conflictingStart: previous.start,
          })
        }
      }
    }

    const activeTeamMembers = tenantContext?.tenantId ? await listTeamMembers(tenantContext.tenantId) : []

    const teamLoad: TeamLoadItem[] = activeTeamMembers.length
      ? activeTeamMembers
          .map((member) => {
            const userId = member.userId
            const role = member.role
            if (!userId || role === 'viewer' || member.status !== 'active') return null
            const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.email || 'Collaborateur'
            const todaysItems = appointmentsToday.filter((appointment) => appointment.assignedUserId === userId)
            const currentItem = todaysItems.find(
              (appointment) =>
                appointment.startDate && appointment.endDate && appointment.startDate <= now && appointment.endDate >= now,
            )
            const nextItem = todaysItems.find(
              (appointment) => appointment.startDate && appointment.startDate > now && appointment.startDate <= addDays(now, 1),
            )
            let availability: 'available' | 'soon' | 'busy' = 'available'
            if (currentItem) availability = 'busy'
            else if (nextItem && nextItem.startDate && minutesBetween(now, nextItem.startDate) <= 60) availability = 'soon'

            return {
              userId,
              name,
              role,
              todayCount: todaysItems.length,
              loadPercent: Math.min(100, todaysItems.length * 12.5),
              availability,
              nextAppointmentAt: nextItem?.start || null,
            }
          })
          .filter((member): member is TeamLoadItem => member !== null)
      : []

    const travelWarnings: Array<{
      collaboratorName: string
      fromAppointmentId: string
      toAppointmentId: string
      fromTitle: string
      toTitle: string
      gapMinutes: number
      distanceKm: number
    }> = []

    for (const [key, items] of appointmentsByCollaborator) {
      if (key === '__unassigned__') continue
      const sorted = [...items].sort((a, b) => (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0))
      for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1]
        const current = sorted[index]
        if (!previous.endDate || !current.startDate) continue
        const gapMinutes = minutesBetween(previous.endDate, current.startDate)
        if (gapMinutes >= 30) continue
        if (
          typeof previous.latitude !== 'number' || typeof previous.longitude !== 'number'
          || typeof current.latitude !== 'number' || typeof current.longitude !== 'number'
        ) {
          continue
        }
        const distanceKm = haversineDistanceKm(previous.latitude, previous.longitude, current.latitude, current.longitude)
        if (distanceKm <= 15) continue
        travelWarnings.push({
          collaboratorName: current.assignedUserName || 'Collaborateur',
          fromAppointmentId: previous.id,
          toAppointmentId: current.id,
          fromTitle: previous.title || 'Rendez-vous',
          toTitle: current.title || 'Rendez-vous',
          gapMinutes,
          distanceKm: Number(distanceKm.toFixed(1)),
        })
      }
    }

    const sortedByLoad = [...teamLoad].sort((a, b) => b.todayCount - a.todayCount)
    const busiest = sortedByLoad.length > 0 ? sortedByLoad[0] : null
    const quietest = sortedByLoad.length > 0 ? sortedByLoad[sortedByLoad.length - 1] : null

    return NextResponse.json({
      success: true,
      appointments,
      qualificationAvailable,
      insights: {
        generatedAt: now.toISOString(),
        summary: {
          today: appointmentsToday.length,
          tomorrow: appointmentsTomorrow.length,
          thisWeek: appointmentsThisWeek.length,
          unassigned: appointments.filter((appointment) => appointment.isUnassigned).length,
          conflicts: conflictWarnings.length,
        },
        teamLoad,
        conflicts: conflictWarnings,
        travelWarnings,
        heatmap: {
          busiest: busiest ? { name: busiest.name, count: busiest.todayCount } : null,
          quietest: quietest ? { name: quietest.name, count: quietest.todayCount } : null,
        },
      },
    })
  } catch (error) {
    console.error('[APPOINTMENTS LIST]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
