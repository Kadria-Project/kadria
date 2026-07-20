'use client'

const STORAGE_KEY = 'kadria-nav-perf-audit'

function enabled() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export async function fetchJsonWithTiming<T>(label: string, input: RequestInfo | URL, init?: RequestInit) {
  const beforeFetch = performance.now()
  const response = await fetch(input, init)
  const afterFetch = performance.now()
  const payload = await response.json() as T
  const afterParse = performance.now()

  if (enabled()) {
    window.requestAnimationFrame(() => {
      console.info(`[PERF] view=${label} beforeFetch=0 ms fetch=${Math.round(afterFetch - beforeFetch)} ms parse=${Math.round(afterParse - afterFetch)} ms render=${Math.round(performance.now() - afterParse)} ms`)
    })
  }

  return { response, payload }
}
