import type {
  ProjectCommandResult,
  ProjectContactCommandInput,
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
