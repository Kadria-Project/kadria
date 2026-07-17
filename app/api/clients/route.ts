import { NextRequest, NextResponse } from 'next/server'
import { aggregateClientList, filterClientList, sortAndPaginateClientList } from '@/src/lib/clients/client-list-aggregation'
import type { ClientListResponse } from '@/src/lib/clients/client-list-types'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { serializeClientsListError, throwClientsListStage } from '@/src/lib/clients/client-list-route-utils'
import { CLIENT_ACTION_REASONS } from '@/src/lib/clients/clients-action-types'
import { deriveClientActions, summarizeClientActions, topClientActions } from '@/src/lib/clients/clients-action-derive'

function asRows(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value as Record<string, unknown>[] : [] }
function toMap(rows: Record<string, unknown>[]) { const result = new Map<string, Record<string, unknown>[]>(); for (const row of rows) { const id=typeof row.project_id==='string'?row.project_id:''; if(id) result.set(id,[...(result.get(id)||[]),row]) } return result }

export async function GET(request: NextRequest) {
  try {
    const context = await getCurrentTenantContext()
    if (!context) return NextResponse.json({ success:false, error:'Non authentifié' },{status:401})
    const supabase=getSupabaseAdmin()
    const [clientsResult,projectsResult]=await Promise.all([
      supabase.from('clients').select('id, first_name, last_name, company_name, email, phone, city, status, archived_at, merged_into_client_id').eq('tenant_id',context.tenantId),
      supabase.from('Projects').select('id, client_id, client_name, client_first_name, client_email, client_phone, city, project_title, status, created_at, updated_at').eq('tenant_id',context.tenantId),
    ])
    if(clientsResult.error) throwClientsListStage('clients_read', clientsResult.error)
    if(projectsResult.error) throwClientsListStage('projects_read', projectsResult.error)
    const projects=asRows(projectsResult.data), ids=projects.map(p=>String(p.id)).filter(Boolean)
    const [quotesResult,appointmentsResult,activitiesResult,eventsResult]=ids.length?await Promise.all([
      supabase.from('Devis').select('project_id, total_ttc, total_ht, statut, accepted, accepted_at, quote_sent_at, created_at').in('project_id',ids),
      supabase.from('project_appointments').select('id, project_id, title, start_time, status, confirmation_status, assigned_user_id').eq('tenant_id',context.tenantId).in('project_id',ids),
      supabase.from('Activity').select('project_id, created_at, action, description').in('project_id',ids),
      // ProjectClientEvents has artisan_id, not tenant_id. The project IDs were
      // already loaded with the tenant filter, so this batch remains tenant-scoped.
      supabase.from('ProjectClientEvents').select('project_id, created_at, event_type').in('project_id',ids),
    ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null},{data:[],error:null}]
    const stagedResults = [[quotesResult, 'quotes_read'], [appointmentsResult, 'appointments_read'], [activitiesResult, 'activities_read'], [eventsResult, 'client_events_read']] as const
    for(const [result, stage] of stagedResults) if(result.error) throwClientsListStage(stage, result.error)
    const quotes=asRows(quotesResult.data), appointments=asRows(appointmentsResult.data), activities=asRows(activitiesResult.data), events=asRows(eventsResult.data)
    // Build the four project maps once; aggregation remains server-side and batch-only.
    const quotesByProjectId=toMap(quotes), appointmentsByProjectId=toMap(appointments), activitiesByProjectId=toMap(activities), clientEventsByProjectId=toMap(events)
    let items
    try {
      items=aggregateClientList({clients:asRows(clientsResult.data),projects,quotes,appointments,activities,events,includeArchived:request.nextUrl.searchParams.get('includeArchived')==='true'})
    } catch (error) {
      throwClientsListStage('aggregation', error)
    }
    const params=request.nextUrl.searchParams, page=Math.max(1,Number(params.get('page'))||1), pageSize=Math.min(100,Math.max(1,Number(params.get('pageSize'))||25))
    const booleanParam=(name:string)=>params.get(name)==='true'?true:params.get(name)==='false'?false:undefined
    const source=params.get('source')
    const sort=params.get('sort')
    const order=params.get('order')
    const attentionReasonParam=params.get('attentionReason')
    if(attentionReasonParam && !CLIENT_ACTION_REASONS.includes(attentionReasonParam as typeof CLIENT_ACTION_REASONS[number])) {
      return NextResponse.json({success:false,error:'Motif d’attention invalide'},{status:400})
    }
    let filtered
    try {
      filtered=filterClientList(items,{q:params.get('q')||undefined,source:source==='canonical'||source==='legacy'?source:undefined,status:params.get('status')||undefined,active:booleanParam('active'),attention:booleanParam('attention'),recurring:booleanParam('recurring'),hasAppointment:booleanParam('hasAppointment'),attentionReason:attentionReasonParam||undefined})
    } catch (error) {
      throwClientsListStage('filtering', error)
    }
    let paginated
    try {
      paginated=sortAndPaginateClientList(filtered,page,pageSize,['attention','lastInteraction','name','acceptedValue','projectCount','nextAppointment'].includes(sort||'') ? sort as import('@/src/lib/clients/client-list-aggregation').ClientListSort : 'attention',order==='asc'?'asc':'desc')
    } catch (error) {
      throwClientsListStage('pagination', error)
    }
    // Action center: always derived from the full tenant-scoped `items` list
    // (pre-filter, pre-pagination) so it never reflects only the current page
    // or the currently active list filters.
    const allActions=deriveClientActions(items)
    const response:ClientListResponse={...paginated,summary:{totalClients:filtered.filter(i=>i.source==='canonical').length,activeClients:filtered.filter(i=>i.activeProjectCount>0).length,prospectsToFollowUp:filtered.filter(i=>i.needsAttention).length,recurringClients:filtered.filter(i=>i.projectCount>=2).length,totalAcceptedValue:filtered.reduce((n,i)=>n+i.acceptedAmount,0),legacyEntries:filtered.filter(i=>i.source==='legacy').length,attentionCount:filtered.filter(i=>i.needsAttention).length},actions:{items:topClientActions(allActions),summary:summarizeClientActions(allActions)}}
    console.info('[CLIENTS_V2][LIST_LOADED]',{tenantId:context.tenantId,canonicalCount:response.summary.totalClients,legacyCount:response.summary.legacyEntries,total:response.total,batchMaps:[quotesByProjectId.size,appointmentsByProjectId.size,activitiesByProjectId.size,clientEventsByProjectId.size]})
    return NextResponse.json({success:true,...response})
  } catch(error) { console.error('[CLIENTS_V2][LIST_FAILED]', serializeClientsListError(error)); return NextResponse.json({success:false,error:'Impossible de charger les clients'},{status:500}) }
}
