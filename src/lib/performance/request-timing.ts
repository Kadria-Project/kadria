import 'server-only'

type RequestTimingCounts = Record<string, number | undefined>

const enabled = () => process.env.KADRIA_PERF_DEBUG === '1'

export function createRequestTimer(route: string) {
  const startedAt = performance.now()
  const timings: Record<string, number> = {}

  async function measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const phaseStartedAt = performance.now()
    try {
      return await operation()
    } finally {
      timings[name] = Math.round(performance.now() - phaseStartedAt)
    }
  }

  function log(payload: unknown, counts: RequestTimingCounts = {}) {
    if (!enabled()) return

    const serializeStartedAt = performance.now()
    let payloadBytes = 0
    try {
      payloadBytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength
    } catch {
      // Le log de diagnostic ne doit jamais modifier la réponse applicative.
    }
    timings.serialize = Math.round(performance.now() - serializeStartedAt)
    const total = Math.round(performance.now() - startedAt)
    const details = Object.entries({ ...timings, total, payloadKb: Math.round((payloadBytes / 1024) * 10) / 10, ...counts })
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}${key.endsWith('Kb') ? ' KB' : key === 'total' || key === 'serialize' || timings[key] !== undefined ? ' ms' : ''}`)
      .join(' ')
    console.info(`[PERF] route=${route} ${details}`)
  }

  return { measure, log }
}
