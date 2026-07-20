import { actionFailure, readActionResponse, type WorkspaceActionResult } from './workspace-action'

export class ReviewActionAdapter {
  constructor(private readonly projectId: string) {}

  async execute(): Promise<WorkspaceActionResult> {
    const response = await fetch(`/api/projects/${encodeURIComponent(this.projectId)}/request-review`, { method: 'POST' })
    const payload = await readActionResponse(response)
    if (!response.ok || payload.success !== true) return actionFailure(payload, response.status, "Demande d'avis indisponible.")
    return { success: true, message: typeof payload.message === 'string' ? payload.message : "Demande d'avis envoyée." }
  }
}
