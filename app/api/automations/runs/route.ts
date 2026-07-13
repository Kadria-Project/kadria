import { NextRequest, NextResponse } from 'next/server'
import { listAutomationRunsForCurrentTenant, type BusinessAutomationMode, type BusinessAutomationType } from '@/src/lib/automations'

function splitParam(value: string | null) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const result = await listAutomationRunsForCurrentTenant({
      page: Number(searchParams.get('page') || 1),
      limit: Number(searchParams.get('limit') || 25),
      status: splitParam(searchParams.get('status')),
      type: splitParam(searchParams.get('type')) as BusinessAutomationType[],
      mode: splitParam(searchParams.get('mode')) as BusinessAutomationMode[],
      entityType: splitParam(searchParams.get('entityType')) as Array<'project' | 'appointment' | 'configuration'>,
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status =
      message === 'TENANT_CONTEXT_REQUIRED' ? 401 :
      message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
