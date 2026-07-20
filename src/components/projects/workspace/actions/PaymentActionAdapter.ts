import { actionFailure, readActionResponse, type WorkspaceActionResult } from './workspace-action'

export class PaymentActionAdapter {
  constructor(private readonly projectId: string) {}

  async execute(): Promise<WorkspaceActionResult> {
    const response = await fetch(`/api/projects/${encodeURIComponent(this.projectId)}/deposit-checkout`, { method: 'POST' })
    const payload = await readActionResponse(response)
    if (!response.ok || payload.success !== true) return actionFailure(payload, response.status, "Paiement indisponible.")
    return { success: true, message: "Lien d'acompte créé." }
  }
}
