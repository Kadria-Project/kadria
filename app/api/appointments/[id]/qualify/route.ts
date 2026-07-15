import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { canEditAppointment } from '@/src/lib/appointments/access'
import {
  isQualificationOutcome,
  isQualificationStatus,
  qualificationNextAction,
} from '@/src/lib/appointment-qualification'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'

function textOrNull(value: unknown, maxLength: number) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Votre session a expiré. Reconnectez-vous.' }, { status: 401 })

    const tenantContext = await getCurrentTenantContext()
    if (!tenantContext) return NextResponse.json({ success: false, error: "Vous n'avez pas accès à cette action." }, { status: 403 })

    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!body || !isQualificationStatus(body.status) || (body.outcome !== null && body.outcome !== undefined && !isQualificationOutcome(body.outcome))) {
      return NextResponse.json({ success: false, error: 'Vérifiez les informations de qualification.' }, { status: 400 })
    }

    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('project_appointments')
      .select('id, tenant_id, assigned_user_id')
      .eq('id', id)
      .maybeSingle()

    if (appointmentError) throw appointmentError
    if (!appointment || appointment.tenant_id !== tenantContext.tenantId) {
      return NextResponse.json({ success: false, error: "Ce rendez-vous n'est plus disponible." }, { status: 404 })
    }
    if (!canEditAppointment(tenantContext, appointment.assigned_user_id ? String(appointment.assigned_user_id) : null)) {
      return NextResponse.json({ success: false, error: "Vous n'avez pas accès à cette action." }, { status: 403 })
    }

    const outcome = body.outcome === undefined || body.outcome === null ? null : body.outcome
    const nextAction = textOrNull(body.nextAction, 240) || qualificationNextAction(body.status, outcome)
    const expectedVersion = Number.isInteger(body.expectedVersion) && body.expectedVersion >= 0 ? body.expectedVersion : null
    const requestId = textOrNull(body.requestId, 120)

    const { data, error } = await supabaseAdmin.rpc('qualify_project_appointment', {
      p_appointment_id: id,
      p_tenant_id: tenantContext.tenantId,
      p_actor_user_id: tenantContext.userId,
      p_status: body.status,
      p_outcome: outcome,
      p_note: textOrNull(body.note, 2000),
      p_next_action: nextAction,
      p_expected_version: expectedVersion,
      p_request_id: requestId,
    })

    if (error) {
      if (/QUALIFICATION_VERSION_CONFLICT/.test(error.message)) {
        return NextResponse.json({ success: false, error: 'Cette qualification a été modifiée depuis son ouverture. Rechargez les informations avant de continuer.', code: 'VERSION_CONFLICT' }, { status: 409 })
      }
      if (/APPOINTMENT_NOT_FOUND/.test(error.message)) {
        return NextResponse.json({ success: false, error: "Ce rendez-vous n'est plus disponible." }, { status: 404 })
      }
      if (/qualify_project_appointment/i.test(error.message) && /(does not exist|could not find)/i.test(error.message)) {
        return NextResponse.json({ success: false, error: "La migration de qualification doit être appliquée avant d'utiliser cette action." }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      result: data,
      qualification: { status: body.status, outcome, note: textOrNull(body.note, 2000), nextAction },
    })
  } catch (error) {
    console.error('[APPOINTMENTS QUALIFY]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: "Kadria n'a pas pu enregistrer cette qualification. Réessayez dans un instant." }, { status: 500 })
  }
}
