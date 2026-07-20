type AuditRequest = {
  url: string
  method: string
  durationMs: number
  ok: boolean
  status?: number
}

type NavigationAudit = {
  target: string
  startedAt: number
  requests: AuditRequest[]
}

declare global {
  interface Window {
    __kadriaNavigationAudit?: {
      completeRoute: (pathname: string) => void
    }
  }
}

const STORAGE_KEY = 'kadria-nav-perf-audit'
let currentNavigation: NavigationAudit | null = null

function enabled() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function log(stage: string, details: Record<string, unknown>) {
  if (enabled()) console.info('[Kadria navigation audit]', { stage, ...details })
}

function startNavigation(target: string) {
  if (!enabled()) return

  const route = sanitizePerformanceRoute(target)
  currentNavigation = { target: route, startedAt: performance.now(), requests: [] }
  performance.mark('kadria-navigation-start')
  log('transition-start', { route })
}

function completeRoute(pathname: string) {
  if (!enabled() || !currentNavigation) return

  const navigation = currentNavigation
  currentNavigation = null
  const shellMs = performance.now() - navigation.startedAt
  performance.mark('kadria-navigation-shell-ready')
  performance.measure('kadria-navigation-to-shell', 'kadria-navigation-start', 'kadria-navigation-shell-ready')
  log('shell-ready', {
    route: navigation.target,
    pathname: sanitizePerformanceRoute(pathname),
    shellMs: Math.round(shellMs),
    requestCount: navigation.requests.length,
    requests: navigation.requests,
  })
}

if (typeof window !== 'undefined' && enabled()) {
  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const startedAt = performance.now()
    try {
      const response = await originalFetch(input, init)
      currentNavigation?.requests.push({
        url: sanitizePerformanceRoute(typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()),
        method: init?.method || (input instanceof Request ? input.method : 'GET'),
        durationMs: Math.round(performance.now() - startedAt),
        ok: response.ok,
        status: response.status,
      })
      return response
    } catch (error) {
      currentNavigation?.requests.push({
        url: sanitizePerformanceRoute(typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()),
        method: init?.method || (input instanceof Request ? input.method : 'GET'),
        durationMs: Math.round(performance.now() - startedAt),
        ok: false,
      })
      throw error
    }
  }
}

window.__kadriaNavigationAudit = { completeRoute }

export function onRouterTransitionStart(url: string) {
  startNavigation(url)
}
import { sanitizePerformanceRoute } from './src/lib/performance/sanitize-performance-route'
