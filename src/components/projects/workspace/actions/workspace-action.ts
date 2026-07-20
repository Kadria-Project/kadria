export type WorkspaceActionState = 'available' | 'unavailable' | 'forbidden' | 'loading' | 'error'

export type WorkspaceActionResult = { success: true; message?: string } | { success: false; error: string; status?: number }

export type WorkspaceActionCapability = {
  state: WorkspaceActionState
  execute: () => Promise<WorkspaceActionResult>
}

export async function readActionResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  if (!text) return {}
  try { return JSON.parse(text) as Record<string, unknown> } catch { return { error: text } }
}

export function actionFailure(payload: Record<string, unknown>, status: number, fallback: string): WorkspaceActionResult {
  return { success: false, status, error: typeof payload.error === 'string' ? payload.error : fallback }
}
