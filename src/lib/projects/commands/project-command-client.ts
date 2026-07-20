import type {
  AssignProjectOwnerCommandInput,
  ProjectCommandResult,
  ProjectContactCommandInput,
  ScheduleProjectAppointmentCommandInput,
  ProjectStatusCommandInput,
} from './project-command-contract'

async function sendProjectCommand<T>(url: string, body: unknown): Promise<ProjectCommandResult<T>> {
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await response.json().catch(() => null) as ProjectCommandResult<T> | null
    if (result && typeof result.ok === 'boolean') return result
    return { ok: false, error: { code: 'UNAVAILABLE', message: 'Commande indisponible.' } }
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Connexion indisponible. RÃ©essayez.' } }
  }
}

export function updateProjectStatusCommand(projectId: string, input: ProjectStatusCommandInput) {
  return sendProjectCommand<{ status: string }>(
    `/api/projects/${encodeURIComponent(projectId)}/commands/status`,
    input,
  )
}

export function updateProjectContactCommand(projectId: string, input: ProjectContactCommandInput) {
  return sendProjectCommand(
    `/api/projects/${encodeURIComponent(projectId)}/commands/contact`,
    input,
  )
}

export async function assignProjectOwnerCommand(projectId: string, input: AssignProjectOwnerCommandInput): Promise<ProjectCommandResult<{ assignedUserId: string | null; assignedUserLabel?: string }>> {
  const result = await sendProjectCommand<{ responsibleUserId?: string | null; responsibleUser?: { displayName?: string | null } }>(`/api/projects/${encodeURIComponent(projectId)}/responsible`, { responsibleUserId: input.memberId })
  if (!result.ok) return { ok: false, ...(result.error ? { error: result.error } : {}) }
  return { ok: true, data: { assignedUserId: result.data?.responsibleUserId ?? null, ...(result.data?.responsibleUser?.displayName ? { assignedUserLabel: result.data.responsibleUser.displayName } : {}) }, refresh: ['brief'] }
}

export async function scheduleProjectAppointmentCommand(projectId: string, input: ScheduleProjectAppointmentCommandInput): Promise<ProjectCommandResult<{ id: string; start: string; end: string; location: string | null; status: string; assignedUserId: string | null }>> {
  try {
    const response = await fetch('/api/appointments/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, start: input.start, end: input.end, ...(input.assignedUserId ? { assignedUserId: input.assignedUserId } : {}) }) })
    const result = await response.json().catch(() => null) as { success?: boolean; appointment?: { id: string; start: string; end: string; location: string | null; status: string; assignedUserId: string | null }; error?: string } | null
    if (!result?.success || !result.appointment) return { ok: false, error: { code: 'APPOINTMENT_UNAVAILABLE', message: result?.error === 'slot_unavailable' ? 'Creneau indisponible entre-temps.' : 'Impossible de planifier le rendez-vous.' } }
    return { ok: true, data: result.appointment, refresh: ['brief', 'engagement', 'facts'] }
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Connexion indisponible. Reessayez.' } }
  }
}
