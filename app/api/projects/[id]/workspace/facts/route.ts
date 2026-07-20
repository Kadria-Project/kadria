import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { PermissionError } from '@/src/lib/team/access'

const useful = new Set(['DEVIS_CREATED', 'DEVIS_FOLLOW_UP_SENT', 'STATUS_UPDATED', 'APPOINTMENT_CREATED', 'APPOINTMENT_BOOKED', 'APPOINTMENT_UPDATED', 'APPOINTMENT_RESCHEDULED'])
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const access = await authorizeProjectAccess({ projectId: id, select: 'id', allowAppointmentAccess: true })
    if (!access) return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    const offset = Math.max(0, Number(request.nextUrl.searchParams.get('offset')) || 0)
    const { data, error } = await supabaseAdmin.from(TABLES.activity).select('id, action, created_at').eq('project_id', access.projectId).order('created_at', { ascending: false }).range(offset, offset + 19)
    if (error) throw error
    const facts = (data || []).filter((row) => useful.has(String(row.action || ''))).map((row) => ({ id: String(row.id), label: String(row.action).startsWith('DEVIS') ? 'Un fait lié au devis a été enregistré.' : String(row.action).startsWith('APPOINTMENT') ? 'Un rendez-vous a été enregistré ou modifié.' : 'Le statut du dossier a été mis à jour.', occurredAt: String(row.created_at || ''), category: String(row.action).startsWith('DEVIS') ? 'devis' : 'dossier' }))
    return NextResponse.json({ success: true, facts, nextOffset: data?.length === 20 ? offset + 20 : null })
  } catch (error) { if (error instanceof PermissionError) return NextResponse.json({ success: false, error: error.message }, { status: error.status }); return NextResponse.json({ success: false, error: 'Historique indisponible' }, { status: 500 }) }
}
