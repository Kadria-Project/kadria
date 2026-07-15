import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { canEditAppointment } from '@/src/lib/appointments/access'
import { isConfirmationSource, isConfirmationStatus } from '@/src/lib/appointment-confirmation'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'

function textOrNull(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!await getSession()) return NextResponse.json({ success: false, error: 'Votre session a expiré. Reconnectez-vous.' }, { status: 401 })
    const tenantContext = await getCurrentTenantContext()
    if (!tenantContext) return NextResponse.json({ success: false, error: "Vous n'avez pas accès à cette action." }, { status: 403 })
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!body || !isConfirmationStatus(body.status) || !isConfirmationSource(body.source)) return NextResponse.json({ success: false, error: 'Vérifiez le statut de confirmation.' }, { status: 400 })
    const { data: appointment, error: readError } = await supabaseAdmin.from('project_appointments').select('id, tenant_id, assigned_user_id').eq('id', id).maybeSingle()
    if (readError) throw readError
    if (!appointment || appointment.tenant_id !== tenantContext.tenantId) return NextResponse.json({ success: false, error: 'Ce rendez-vous n’est plus disponible.' }, { status: 404 })
    if (!canEditAppointment(tenantContext, appointment.assigned_user_id ? String(appointment.assigned_user_id) : null)) return NextResponse.json({ success: false, error: "Vous n'avez pas accès à cette action." }, { status: 403 })
    const { data, error } = await supabaseAdmin.rpc('confirm_project_appointment', {
      p_appointment_id: id, p_tenant_id: tenantContext.tenantId, p_status: body.status, p_source: body.source,
      p_note: textOrNull(body.note, 1000), p_expected_version: Number.isInteger(body.expectedVersion) ? body.expectedVersion : null, p_request_id: textOrNull(body.requestId, 120), p_actor_user_id: tenantContext.userId,
    })
    if (error) {
      if (/CONFIRMATION_VERSION_CONFLICT/.test(error.message)) return NextResponse.json({ success: false, error: 'Cette confirmation a été modifiée. Rechargez le rendez-vous avant de continuer.', code: 'VERSION_CONFLICT' }, { status: 409 })
      if (/APPOINTMENT_NOT_FOUND/.test(error.message)) return NextResponse.json({ success: false, error: 'Ce rendez-vous n’est plus disponible.' }, { status: 404 })
      if (/confirm_project_appointment/i.test(error.message) && /(does not exist|could not find)/i.test(error.message)) return NextResponse.json({ success: false, error: 'La migration de confirmation doit être appliquée avant cette action.' }, { status: 409 })
      throw error
    }
    return NextResponse.json({ success: true, result: data })
  } catch (error) {
    console.error('[APPOINTMENTS CONFIRMATION]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Kadria n’a pas pu enregistrer cette confirmation. Réessayez dans un instant.' }, { status: 500 })
  }
}
