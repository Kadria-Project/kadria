export type ClientsListError = { stage: string; message: string; code: string | null; details: string | null; hint: string | null; status: number | null }

export function serializeClientsListError(error: unknown, stage = 'unknown'): ClientsListError {
  if (error instanceof Error) return { stage, message: error.message, code: null, details: null, hint: null, status: null }
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>
    return { stage: typeof value.stage === 'string' ? value.stage : stage, message: typeof value.message === 'string' ? value.message : 'Unknown object error', code: typeof value.code === 'string' ? value.code : null, details: typeof value.details === 'string' ? value.details : null, hint: typeof value.hint === 'string' ? value.hint : null, status: typeof value.status === 'number' ? value.status : null }
  }
  return { stage, message: String(error), code: null, details: null, hint: null, status: null }
}

export function throwClientsListStage(stage: string, error: unknown): never { throw { stage, ...(error && typeof error === 'object' ? error as Record<string, unknown> : { message: String(error) }) } }
