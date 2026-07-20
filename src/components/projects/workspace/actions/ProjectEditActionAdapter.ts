import { actionFailure, readActionResponse, type WorkspaceActionResult } from './workspace-action'
export type ProjectEditFormData = { projectType: string; trade: string; city: string; clientFirstName: string; clientName: string; clientPhone: string; clientEmail: string; siteAddress: string }
export class ProjectEditActionAdapter {
  constructor(private readonly projectId: string) {}
  async load(): Promise<{ success: true; data: ProjectEditFormData } | { success: false; error: string; status?: number }> { const r = await fetch(`/api/projects/${encodeURIComponent(this.projectId)}/workspace/edit`); const p = await readActionResponse(r); if (r.ok && p.success === true && p.edit) return { success: true, data: p.edit as ProjectEditFormData }; const failure = actionFailure(p, r.status, 'Édition indisponible.'); return failure.success ? { success: false, error: 'Édition indisponible.' } : failure }
  async save(data: ProjectEditFormData): Promise<WorkspaceActionResult> { const r = await fetch(`/api/projects/${encodeURIComponent(this.projectId)}/workspace/edit`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); const p = await readActionResponse(r); return r.ok && p.success === true ? { success: true } : actionFailure(p, r.status, 'Enregistrement indisponible.') }
}
