import { type WorkspaceActionResult } from './workspace-action'

export class PdfActionAdapter {
  constructor(private readonly projectId: string) {}

  async execute(): Promise<WorkspaceActionResult> {
    const response = await fetch(`/api/projects/${encodeURIComponent(this.projectId)}/pdf`)
    if (!response.ok) return { success: false, status: response.status, error: 'PDF indisponible.' }
    const html = await response.text()
    const printWindow = window.open('', '_blank')
    if (!printWindow) return { success: false, error: 'Impossible d’ouvrir la fenêtre PDF.' }
    printWindow.document.write(html)
    printWindow.document.close()
    window.setTimeout(() => printWindow.print(), 500)
    return { success: true, message: 'PDF prêt à imprimer.' }
  }
}
