const PROJECT_ROUTE = /^\/dashboard-v2\/projet\/[^/]+/
const PORTAL_PROJECT_ROUTE = /^\/client\/projet\/[^/]+/
const UUID_SEGMENT = /\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?=\/|$)/gi

/** Returns a route shape suitable for development performance logs, without URL values. */
export function sanitizePerformanceRoute(input: string | URL): string {
  let pathname: string
  try {
    pathname = new URL(String(input), 'http://kadria.local').pathname
  } catch {
    return '/unknown'
  }

  if (PROJECT_ROUTE.test(pathname)) return pathname.replace(PROJECT_ROUTE, '/dashboard-v2/projet/[id]')
  if (PORTAL_PROJECT_ROUTE.test(pathname)) return pathname.replace(PORTAL_PROJECT_ROUTE, '/client/projet/[token]')
  return pathname.replace(UUID_SEGMENT, '/[id]') || '/'
}
