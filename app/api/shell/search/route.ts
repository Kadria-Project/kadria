import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'
import { formatSmartDateFr } from '@/src/lib/date-format'
import { formatAppointmentStatus, formatProjectStatus, formatQuoteStatus } from '@/src/lib/status-presentation'
import {
  cleanGlobalSearchQuery,
  escapePostgrestLike,
  globalSearchRoute,
  GLOBAL_SEARCH_LIMIT,
  GLOBAL_SEARCH_MIN_LENGTH,
  type GlobalSearchGroup,
} from '@/src/lib/shell/global-search'

export const dynamic = 'force-dynamic'

const value = (row: Record<string, unknown>, key: string) => String(row[key] || '').trim()
const nullableValue = (row: Record<string, unknown>, key: string) => value(row, key) || null

export async function GET(request: NextRequest) {
  const context = await getCurrentTenantContext()
  if (!context) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

  const query = cleanGlobalSearchQuery(request.nextUrl.searchParams.get('q'))
  if (query.length < GLOBAL_SEARCH_MIN_LENGTH) {
    return NextResponse.json({ success: true, query, groups: [] satisfies GlobalSearchGroup[] })
  }

  const pattern = `%${escapePostgrestLike(query)}%`
  const supabase = getSupabaseAdmin()
  try {
    const [projects, clients, quotes, appointments] = await Promise.all([
      supabase.from(TABLES.projects)
        .select('id, project_title, project_type, client_first_name, client_name, city, status')
        .eq('tenant_id', context.tenantId)
        .or(`project_title.ilike.${pattern},project_type.ilike.${pattern},client_first_name.ilike.${pattern},client_name.ilike.${pattern}`)
        .order('updated_at', { ascending: false })
        .limit(GLOBAL_SEARCH_LIMIT),
      supabase.from('clients')
        .select('id, first_name, last_name, company_name, city, status')
        .eq('tenant_id', context.tenantId)
        .is('archived_at', null)
        .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},company_name.ilike.${pattern}`)
        .order('updated_at', { ascending: false })
        .limit(GLOBAL_SEARCH_LIMIT),
      supabase.from(TABLES.devis)
        .select('id, project_id, devis_number, objet, statut')
        .eq('tenant_id', context.tenantId)
        .or(`devis_number.ilike.${pattern},objet.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(GLOBAL_SEARCH_LIMIT),
      supabase.from('project_appointments')
        .select('id, title, start_time, status')
        .eq('tenant_id', context.tenantId)
        .ilike('title', pattern)
        .order('start_time', { ascending: false })
        .limit(GLOBAL_SEARCH_LIMIT),
    ])
    for (const result of [projects, clients, quotes, appointments]) if (result.error) throw result.error

    const groups = ([
      {
        category: 'project', label: 'Projets', results: (projects.data || []).map((item) => {
          const row = item as Record<string, unknown>
          const id = value(row, 'id')
          return { id, title: value(row, 'project_title') || value(row, 'project_type') || 'Projet', subtitle: nullableValue(row, 'client_first_name') || nullableValue(row, 'client_name') || nullableValue(row, 'city'), status: formatProjectStatus(nullableValue(row, 'status')), route: globalSearchRoute('project', { id }) }
        }),
      },
      {
        category: 'client', label: 'Clients', results: (clients.data || []).map((item) => {
          const row = item as Record<string, unknown>
          const id = value(row, 'id')
          return { id, title: [value(row, 'first_name'), value(row, 'last_name')].filter(Boolean).join(' ') || value(row, 'company_name') || 'Client', subtitle: nullableValue(row, 'city'), status: nullableValue(row, 'status'), route: globalSearchRoute('client', { id }) }
        }),
      },
      {
        category: 'quote', label: 'Devis', results: (quotes.data || []).flatMap((item) => {
          const row = item as Record<string, unknown>
          const id = value(row, 'id'), projectId = nullableValue(row, 'project_id')
          if (!id || !projectId) return []
          return [{ id, title: value(row, 'devis_number') || 'Devis', subtitle: nullableValue(row, 'objet'), status: formatQuoteStatus(nullableValue(row, 'statut')), route: globalSearchRoute('quote', { id, projectId }) }]
        }),
      },
      {
        category: 'appointment', label: 'Rendez-vous', results: (appointments.data || []).map((item) => {
          const row = item as Record<string, unknown>
          const id = value(row, 'id')
          return { id, title: value(row, 'title') || 'Rendez-vous', subtitle: formatSmartDateFr(nullableValue(row, 'start_time'), { timeZone: context.tenant.timezone }), status: formatAppointmentStatus(nullableValue(row, 'status')), route: globalSearchRoute('appointment', { id }) }
        }),
      },
    ] satisfies GlobalSearchGroup[]).filter((group) => group.results.length > 0)

    return NextResponse.json({ success: true, query, groups })
  } catch (error) {
    console.error('[SHELL_SEARCH] Failed to search tenant-scoped records', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Recherche indisponible' }, { status: 500 })
  }
}
