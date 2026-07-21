import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'

export async function GET(request: NextRequest) {
  const context = await getCurrentTenantContext()
  if (!context) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  const query = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 100)
  if (query.length < 2) return NextResponse.json({ success: true, clients: [] })
  const pattern = `%${query.replace(/[%_]/g, '')}%`
  const { data, error } = await getSupabaseAdmin()
    .from('clients')
    .select('id, first_name, last_name, email, phone, address_line1, postal_code, city')
    .eq('tenant_id', context.tenantId)
    .is('archived_at', null)
    .is('merged_into_client_id', null)
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
    .limit(8)
  if (error) {
    console.error('[CLIENT_SEARCH][FAILED]', { tenantId: context.tenantId, code: error.code || null })
    return NextResponse.json({ success: false, error: 'Recherche client indisponible.' }, { status: 500 })
  }
  return NextResponse.json({ success: true, clients: data || [] })
}
