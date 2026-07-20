import { actionFailure, readActionResponse, type WorkspaceActionResult } from './workspace-action'

export class PortalActionAdapter {
  constructor(private readonly projectId: string) {}

  async execute(): Promise<WorkspaceActionResult> {
    const response = await fetch(`/api/projects/${encodeURIComponent(this.projectId)}/client-portal-link`)
    const payload = await readActionResponse(response)
    if (!response.ok || payload.success !== true || typeof payload.url !== 'string') return actionFailure(payload, response.status, 'Portail client indisponible.')
    try { await navigator.clipboard.writeText(payload.url) } catch { return { success: false, error: 'Lien du portail disponible, mais la copie a échoué.' } }
    return { success: true, message: 'Lien du portail client copié.' }
  }
}
