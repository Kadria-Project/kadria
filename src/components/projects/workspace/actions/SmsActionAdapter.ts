import { actionFailure, readActionResponse, type WorkspaceActionResult } from './workspace-action'

export class SmsActionAdapter {
  constructor(private readonly projectId: string) {}

  async execute(): Promise<WorkspaceActionResult> {
    const response = await fetch(`/api/projects/${encodeURIComponent(this.projectId)}/send-completion-sms`, { method: 'POST' })
    const payload = await readActionResponse(response)
    if (!response.ok || payload.success !== true) return actionFailure(payload, response.status, 'SMS indisponible.')
    return { success: true, message: typeof payload.message === 'string' ? payload.message : 'SMS envoyé.' }
  }
}
