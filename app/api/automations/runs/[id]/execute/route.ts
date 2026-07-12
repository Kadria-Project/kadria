import { NextResponse } from 'next/server'
import { executeAutomationRunForCurrentTenant } from '@/src/lib/automations'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const result = await executeAutomationRunForCurrentTenant(id)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status =
      message === 'TENANT_CONTEXT_REQUIRED' ? 401 :
      message === 'FORBIDDEN' ? 403 :
      message === 'RUN_NOT_FOUND' ? 404 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
