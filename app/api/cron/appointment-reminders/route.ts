import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { sendAppointmentPush, type PushAppointment } from '@/src/lib/push'

function isAuthorized(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return Boolean(expected && (request.headers.get('x-cron-secret') === expected || bearer === expected))
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ success: false, error: 'Non autorisé.' }, { status: 401 })

  const now = new Date()
  const windowStart = new Date(now.getTime() + 55 * 60_000).toISOString()
  const windowEnd = new Date(now.getTime() + 65 * 60_000).toISOString()
  const { data: appointments, error } = await supabaseAdmin
    .from('project_appointments')
    .select('id, tenant_id, artisan_id, project_id, assigned_user_id, title, client_name, start_time, end_time, updated_at, status')
    .not('tenant_id', 'is', null)
    .not('assigned_user_id', 'is', null)
    .gte('start_time', windowStart)
    .lte('start_time', windowEnd)
    .neq('status', 'cancelled')

  if (error) {
    console.error('[PUSH][REMINDER_QUERY]', { message: error.message })
    return NextResponse.json({ success: false, error: 'Impossible de préparer les rappels.' }, { status: 500 })
  }

  await Promise.all((appointments || []).map(async (row) => {
    const appointment: PushAppointment = {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      artisanId: String(row.artisan_id || ''),
      assignedUserId: row.assigned_user_id ? String(row.assigned_user_id) : null,
      projectId: row.project_id ? String(row.project_id) : null,
      title: row.title ? String(row.title) : null,
      clientName: row.client_name ? String(row.client_name) : null,
      start: row.start_time ? String(row.start_time) : null,
      end: row.end_time ? String(row.end_time) : null,
      eventVersion: row.updated_at ? String(row.updated_at) : null,
    }
    await sendAppointmentPush(appointment, 'appointment_reminder', appointment.assignedUserId)
  }))

  console.info('[PUSH][REMINDERS_COMPLETED]', { appointments: appointments?.length || 0, windowStart, windowEnd })
  return NextResponse.json({ success: true, processed: appointments?.length || 0 })
}
