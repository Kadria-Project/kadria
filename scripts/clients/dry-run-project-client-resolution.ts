import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { anonymizeLegacyIdentifier, classifyCollision, estimateLegacyClusters, mapLegacyProjectClientIdentity, type LegacyProjectClientRow, type LegacyProjectResolutionInput } from '@/src/lib/clients/legacy-project-client'
import { resolveOrCreateClient } from '@/src/lib/clients/client-resolution'
import type { ClientResolutionReason } from '@/src/lib/clients/client-resolution-types'
import { TABLES } from '@/src/lib/airtable'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'

const BATCH_SIZE = 200
const CONCURRENCY = 4
const OUTPUT = resolve(process.cwd(), 'reports', 'clients')
type Cursor = { createdAt: string; id: string }
type Summary = Record<string, unknown> & { totalProjectsScanned: number; projectsAlreadyLinked: number; projectsAnalyzed: number; exactMatches: number; ambiguousMatches: number; noMatches: number; insufficientIdentity: number; errors: number; reasonCounts: Partial<Record<ClientResolutionReason, number>>; confidenceDistribution: Record<string, number>; sourceDistribution: Record<string, number>; projectsByTenant: Record<string, Record<string, number>>; collisions: Record<string, number>; clientStats: Record<string, number> }
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
const increment = (map: Record<string, number>, key: string) => { map[key] = (map[key] || 0) + 1 }
const isUuid = (value: string | null) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))

function project(row: Record<string, unknown>): LegacyProjectClientRow {
  return { id: String(row.id || ''), tenantId: text(row.tenant_id), clientId: text(row.client_id), clientFirstName: text(row.client_first_name), clientName: text(row.client_name), clientEmail: text(row.client_email), clientPhone: text(row.client_phone), city: text(row.city), postalCode: text(row.postal_code), source: text(row.source), createdAt: text(row.created_at), status: text(row.status) }
}

async function clientStats() {
  const stats = { total: 0, active: 0, archived: 0, merged: 0 }; let from = 0; const supabase = getSupabaseAdmin()
  while (true) {
    const { data, error } = await supabase.from('clients').select('status,archived_at,merged_into_client_id').range(from, from + BATCH_SIZE - 1)
    if (error) throw new Error(`Unable to scan clients: ${error.message}`)
    const rows = (data || []) as Record<string, unknown>[]
    for (const row of rows) { stats.total += 1; if (row.archived_at || row.status === 'archived') stats.archived += 1; else if (row.merged_into_client_id) stats.merged += 1; else stats.active += 1 }
    if (rows.length < BATCH_SIZE) return stats; from += BATCH_SIZE
  }
}

async function page(cursor: Cursor | null): Promise<LegacyProjectClientRow[]> {
  let query = getSupabaseAdmin().from(TABLES.projects).select('id,tenant_id,client_id,client_first_name,client_name,client_email,client_phone,city,postal_code,source,created_at,status').order('created_at', { ascending: true }).order('id', { ascending: true }).limit(BATCH_SIZE)
  if (cursor) query = query.or(`created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`)
  const { data, error } = await query
  if (error) throw new Error(`Unable to scan projects: ${error.message}`)
  return ((data || []) as Record<string, unknown>[]).map(project)
}

async function main() {
  if (!process.argv.includes('--dry-run')) throw new Error('Refusing to start without --dry-run.')
  const started = Date.now(); const stats = await clientStats()
  const summary: Summary = { generatedAt: new Date().toISOString(), mode: 'dry-run', totalProjectsScanned: 0, projectsAlreadyLinked: 0, projectsAnalyzed: 0, exactMatches: 0, ambiguousMatches: 0, noMatches: 0, insufficientIdentity: 0, errors: 0, invalidTenantProjects: 0, excludedDeleted: 0, excludedDemo: 0, reasonCounts: {}, confidenceDistribution: {}, sourceDistribution: {}, projectsByTenant: {}, collisions: {}, clientStats: stats }
  const ambiguous: string[] = []; const clusters: LegacyProjectResolutionInput[] = []; let cursor: Cursor | null = null
  while (true) {
    const rows = await page(cursor); if (!rows.length) break; summary.totalProjectsScanned += rows.length
    let index = 0
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => { while (index < rows.length) {
      const row = rows[index++]; const source = (row.source || '').toLowerCase()
      if (row.status?.toLowerCase() === 'deleted') { summary.excludedDeleted = Number(summary.excludedDeleted) + 1; continue }
      if (/(^|[\s_-])demo([\s_-]|$)/.test(source)) { summary.excludedDemo = Number(summary.excludedDemo) + 1; continue }
      if (!isUuid(row.tenantId)) { summary.invalidTenantProjects = Number(summary.invalidTenantProjects) + 1; continue }
      const mapped = mapLegacyProjectClientIdentity(row); if (!mapped) { summary.invalidTenantProjects = Number(summary.invalidTenantProjects) + 1; continue }
      if (mapped.alreadyLinked) { summary.projectsAlreadyLinked += 1; continue }
      summary.projectsAnalyzed += 1; increment(summary.sourceDistribution, row.source || 'unknown')
      try {
        const result = await resolveOrCreateClient(mapped.input); const tenant = anonymizeLegacyIdentifier(row.tenantId || ''); const perTenant = summary.projectsByTenant[tenant] || { total: 0, exact: 0, ambiguous: 0, noMatch: 0, insufficient: 0 }; perTenant.total += 1
        increment(summary.confidenceDistribution, result.confidence); for (const reason of result.reasons) summary.reasonCounts[reason] = (summary.reasonCounts[reason] || 0) + 1; for (const collision of classifyCollision(result)) increment(summary.collisions, collision)
        if (result.outcome === 'exact_match') { summary.exactMatches += 1; perTenant.exact += 1 }; if (result.outcome === 'ambiguous_match') { summary.ambiguousMatches += 1; perTenant.ambiguous += 1; ambiguous.push(JSON.stringify({ project: anonymizeLegacyIdentifier(row.id), tenant, reasons: result.reasons, candidates: result.candidates.length })) }; if (result.outcome === 'no_match') { summary.noMatches += 1; perTenant.noMatch += 1 }; if (result.outcome === 'insufficient_identity') { summary.insufficientIdentity += 1; perTenant.insufficient += 1 }; summary.projectsByTenant[tenant] = perTenant
        if (stats.active === 0) clusters.push(mapped)
      } catch { summary.errors += 1 }
    }}))
    const last = rows[rows.length - 1]; if (!last.createdAt) throw new Error('Project pagination requires created_at.'); cursor = { createdAt: last.createdAt, id: last.id }; console.info('[CLIENTS_DRY_RUN] progress', { scanned: summary.totalProjectsScanned, analyzed: summary.projectsAnalyzed, errors: summary.errors }); if (rows.length < BATCH_SIZE) break
  }
  const legacyClustering = stats.active === 0 ? estimateLegacyClusters(clusters) : null
  Object.assign(summary, { tenantCount: Object.keys(summary.projectsByTenant).length, durationMs: Date.now() - started, legacyClustering, estimatedLegacyClusters: legacyClustering })
  await mkdir(OUTPUT, { recursive: true }); await writeFile(resolve(OUTPUT, 'dry-run-summary.json'), `${JSON.stringify(summary, null, 2)}\n`); await writeFile(resolve(OUTPUT, 'dry-run-ambiguous.jsonl'), ambiguous.join('\n')); await writeFile(resolve(OUTPUT, 'dry-run-summary.md'), `# Clients V2 legacy dry-run\n\n${JSON.stringify(summary, null, 2)}\n`); console.info('[CLIENTS_DRY_RUN] completed', { scanned: summary.totalProjectsScanned, analyzed: summary.projectsAnalyzed, errors: summary.errors })
}
main().catch((error) => { console.error('[CLIENTS_DRY_RUN] failed', error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
