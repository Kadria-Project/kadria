import { NextResponse } from 'next/server'
import { retryAutomationRunForCurrentTenant } from '@/src/lib/automations'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const result = await retryAutomationRunForCurrentTenant(id)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status =
      message === 'TENANT_CONTEXT_REQUIRED' ? 401 :
      message === 'FORBIDDEN' ? 403 :
      message === 'RUN_NOT_FOUND' ? 404 :
      message === 'RUN_NOT_RETRYABLE' ? 409 :
      message === 'RUN_NOT_ELIGIBLE' ? 409 :
      message === 'AUTOMATION_DISABLED' ? 409 :
      message === 'RETRY_DUPLICATE' ? 409 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
