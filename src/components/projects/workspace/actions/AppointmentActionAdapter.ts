import { actionFailure, readActionResponse, type WorkspaceActionResult } from './workspace-action'

export type AppointmentFormData = { title: string; start: string; end: string; location: string; description: string; assignedUserId: string | null }
export type AppointmentAssigneeOption = { id: string; label: string }
export type AppointmentDetail = { id: string; title: string; start: string; end: string; status: string; assignedUserId: string | null; location: string; description: string }

export class AppointmentActionAdapter {
  constructor(private readonly projectId: string) {}
  async create(data: AppointmentFormData): Promise<WorkspaceActionResult> { return this.request('/api/appointments/create', 'POST', { ...data, projectId: this.projectId, eventType: 'appointment' }) }
  async detail(appointmentId: string): Promise<{ success: true; appointment: AppointmentDetail } | { success: false; error: string; status?: number }> { const response = await fetch(`/api/appointments/${encodeURIComponent(appointmentId)}?projectId=${encodeURIComponent(this.projectId)}`); const payload = await readActionResponse(response); if (response.ok && payload.success === true && payload.appointment && typeof payload.appointment === 'object') return { success: true, appointment: payload.appointment as AppointmentDetail }; return actionFailure(payload, response.status, 'Rendez-vous indisponible.') as { success: false; error: string; status?: number } }
  async update(appointmentId: string, data: Partial<AppointmentFormData>): Promise<WorkspaceActionResult> { return this.request(`/api/appointments/${encodeURIComponent(appointmentId)}`, 'PATCH', { ...data, projectId: this.projectId }) }
  async cancel(appointmentId: string): Promise<WorkspaceActionResult> { return this.request(`/api/appointments/${encodeURIComponent(appointmentId)}?projectId=${encodeURIComponent(this.projectId)}`, 'DELETE') }
  async assign(appointmentId: string, assignedUserId: string | null): Promise<WorkspaceActionResult> { return this.request(`/api/appointments/${encodeURIComponent(appointmentId)}/assign`, 'PATCH', { assignedUserId, projectId: this.projectId }) }
  async assignees(): Promise<{ success: true; options: AppointmentAssigneeOption[] } | { success: false; error: string; status?: number }> {
    const response = await fetch(`/api/projects/${encodeURIComponent(this.projectId)}/workspace/engagement/assignees`); const payload = await readActionResponse(response)
    if (response.ok && payload.success === true && Array.isArray(payload.options)) return { success: true, options: payload.options as AppointmentAssigneeOption[] }
    return actionFailure(payload, response.status, 'Responsables indisponibles.') as { success: false; error: string; status?: number }
  }
  private async request(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<WorkspaceActionResult> { const response = await fetch(url, { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) }); const payload = await readActionResponse(response); return response.ok && payload.success === true ? { success: true } : actionFailure(payload, response.status, 'Action indisponible.') }
}
