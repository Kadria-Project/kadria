import 'server-only'

import type { AuthPayload } from '@/src/lib/auth-utils'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { checkPermission } from '@/src/lib/team/access'
import type { PerformancePeriodKey } from '@/src/lib/performance/performance-types'
import type { PerformanceAssistantData } from './performance-insights'

export type PerformanceAssistantRead = { kind: 'ok'; data: PerformanceAssistantData } | { kind: 'forbidden' }

export async function getPerformanceDataForAssistant(session: AuthPayload, period: PerformancePeriodKey = '30d'): Promise<PerformanceAssistantRead> {
  const tenant = await getCurrentTenantContext({ session })
  if (!tenant || !checkPermission(tenant, 'projects.read_all')) return { kind: 'forbidden' }
  const supabase = getSupabaseAdmin()
  const projectsResult = await supabase
    .from('Projects')
    .select('id,status,created_at,project_title,project_type')
    .eq('tenant_id', tenant.tenantId)
    .limit(500)
  if (projectsResult.error) throw projectsResult.error
  const projects = (projectsResult.data || []) as Record<string, unknown>[]
  const ids = projects.map((project) => String(project.id || '')).filter(Boolean)
  if (ids.length === 0) return { kind: 'ok', data: { projects, quotes: [], period } }
  const quotesResult = await supabase
    .from('Devis')
    .select('project_id,total_ttc,total_ht,statut,accepted,accepted_at,quote_sent_at,created_at')
    .in('project_id', ids)
    .limit(800)
  if (quotesResult.error) throw quotesResult.error
  return { kind: 'ok', data: { projects, quotes: (quotesResult.data || []) as Record<string, unknown>[], period } }
}
