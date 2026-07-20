import 'server-only'

import { TABLES } from '@/src/lib/airtable'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { PermissionError } from '@/src/lib/team/access'
import type { ProjectWorkspaceSectionData, ProjectWorkspaceSectionKey } from './project-workspace-section-contract'

type Row = Record<string, unknown>
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0

function photoItems(raw: unknown): ProjectWorkspaceSectionData['documents']['items'] {
  const input = Array.isArray(raw) ? raw : typeof raw === 'string' ? (() => { try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [parsed] } catch { return raw.split(',') } })() : []
  return input.flatMap((item, index) => {
    if (typeof item === 'string' && item.trim()) return [{ id: `photo-${index}`, type: 'photo' as const, name: `Photo ${index + 1}`, url: item.trim() }]
    if (!item || typeof item !== 'object') return []
    const record = item as Row
    const url = text(record.secure_url) || text(record.url)
    if (!url) return []
    return [{ id: text(record.public_id) || text(record.id) || `photo-${index}`, type: 'photo' as const, name: text(record.filename) || `Photo ${index + 1}`, url }]
  })
}

export async function readProjectWorkspaceSection<K extends ProjectWorkspaceSectionKey>(key: K, projectId: string, offset = 0): Promise<ProjectWorkspaceSectionData[K] | null> {
  const projectSelect = key === 'client' ? 'id, client_name, client_first_name, client_phone, client_email, site_address, city' : key === 'documents' ? 'id, photos' : 'id'
  const access = await authorizeProjectAccess({ projectId, select: projectSelect, allowAppointmentAccess: key === 'engagement' })
  if (!access) return null

  if (key === 'client') {
    const project = access.project as Row
    return { label: [text(project.client_first_name), text(project.client_name)].filter(Boolean).join(' ') || null, phone: text(project.client_phone), email: text(project.client_email), address: [text(project.site_address), text(project.city)].filter(Boolean).join(', ') || null } as ProjectWorkspaceSectionData[K]
  }
  if (key === 'documents') return { items: photoItems((access.project as Row).photos) } as ProjectWorkspaceSectionData[K]
  if (key === 'commercial') {
    let query = supabaseAdmin.from(TABLES.devis).select('id, devis_number, statut, total_ttc, date_emission, quote_sent_at, accepted_at, declined_at').eq('project_id', access.projectId)
    query = access.tenantContext?.tenantId ? query.eq('tenant_id', access.tenantContext.tenantId) : query.eq('artisan_id', access.session.artisanId)
    const { data, error } = await query.order('created_at', { ascending: false }).limit(20)
    if (error) throw error
    return { quotes: ((data || []) as Row[]).map((row) => ({ id: String(row.id), number: text(row.devis_number), status: text(row.statut) || 'Brouillon', amount: number(row.total_ttc), issuedAt: text(row.date_emission), sentAt: text(row.quote_sent_at), acceptedAt: text(row.accepted_at), declinedAt: text(row.declined_at) })) } as ProjectWorkspaceSectionData[K]
  }
  if (key === 'history') {
    const safeOffset = Math.max(0, Math.floor(offset))
    const { data, error } = await supabaseAdmin.from(TABLES.activity).select('id, action, description, created_at').eq('project_id', access.projectId).order('created_at', { ascending: false }).range(safeOffset, safeOffset + 19)
    if (error) throw error
    const events = ((data || []) as Row[]).map((row) => ({ id: String(row.id), type: text(row.action) || 'activity', label: text(row.action) || 'Activité du dossier', occurredAt: text(row.created_at) || '', summary: text(row.description)?.slice(0, 180) || null, source: 'Activité' }))
    return { events, nextOffset: events.length === 20 ? safeOffset + 20 : null } as ProjectWorkspaceSectionData[K]
  }
  let query = supabaseAdmin.from('project_appointments').select('id, event_type, status, start_time, end_time, title, assigned_user_id, location').eq('project_id', access.projectId)
  query = access.tenantContext?.tenantId ? query.eq('tenant_id', access.tenantContext.tenantId) : query.eq('artisan_id', access.session.artisanId)
  const { data, error } = await query.order('start_time', { ascending: true }).limit(20)
  if (error) throw error
  return { appointments: ((data || []) as Row[]).map((row) => ({ id: String(row.id), type: text(row.event_type) || 'appointment', status: text(row.status) || 'confirmed', startsAt: text(row.start_time) || '', endsAt: text(row.end_time), label: text(row.title), assigneeId: text(row.assigned_user_id), location: text(row.location) })) } as ProjectWorkspaceSectionData[K]
}

export { PermissionError }
