import { NextRequest, NextResponse } from 'next/server'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function tableMissing(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message || ''
  return /relation .* does not exist/i.test(message) || (error as { code?: string } | null)?.code === '42P01'
}

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId requis' }, { status: 400 })
    }

    const access = await authorizeProjectAccess({
      projectId,
      select: 'id, tenant_id, artisan_id',
      allowAppointmentAccess: true,
    })

    if (!access) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    let query = supabaseAdmin
      .from('project_appointments')
      .select('id, start_time, end_time, location, status, created_at, assigned_user_id, event_type, google_event_id, is_unassigned')
      .eq('project_id', access.projectId)
      .order('start_time', { ascending: true })
      .limit(10)

    if (access.tenantContext?.tenantId) {
      query = query.eq('tenant_id', access.tenantContext.tenantId)
    } else {
      query = query.eq('artisan_id', access.session.artisanId)
    }

    const { data, error } = await query
    if (error) {
      if (tableMissing(error)) {
        return NextResponse.json({ success: true, appointment: null, appointments: [] })
      }
      console.error('[APPOINTMENTS BY PROJECT] Erreur lecture appointment:', error.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    const rows = data || []
    if (!rows.length) {
      return NextResponse.json({ success: true, appointment: null, appointments: [] })
    }

    const assignedUserIds = Array.from(
      new Set(rows.map((row) => (row as Record<string, unknown>).assigned_user_id).filter(Boolean)),
    ) as string[]
    const userNameById = new Map<string, string>()
    if (assignedUserIds.length) {
      const { data: users } = await supabaseAdmin.from('Users').select('id, first_name, last_name, email').in('id', assignedUserIds)
      for (const user of users || []) {
        const record = user as Record<string, unknown>
        const id = String(record.id || '')
        if (!id) continue
        const name = [record.first_name, record.last_name].filter(Boolean).join(' ').trim() || String(record.email || 'Collaborateur')
        userNameById.set(id, name)
      }
    }

    const appointments = rows.map((appointment) => {
      const record = appointment as Record<string, unknown>
      const assignedUserId = record.assigned_user_id ? String(record.assigned_user_id) : null

      return {
        id: appointment.id,
        start: appointment.start_time,
        end: appointment.end_time,
        location: appointment.location,
        status: appointment.status,
        eventType: record.event_type ? String(record.event_type) : 'appointment',
        assignedUserId,
        assignedUserName: assignedUserId ? userNameById.get(assignedUserId) || null : null,
        googleEventId: record.google_event_id ? String(record.google_event_id) : null,
        isUnassigned: Boolean(record.is_unassigned),
      }
    })

    return NextResponse.json({
      success: true,
      appointment: appointments[0] || null,
      appointments,
    })
  } catch (error) {
    console.error('[APPOINTMENTS BY PROJECT]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
