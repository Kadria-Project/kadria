import { redirect } from 'next/navigation'
import { getSession } from '@/src/lib/auth-utils'
import PerformancePage from '@/src/components/performance/PerformancePage'

// Routing choice: Clients V2 established the convention that new dashboard
// workspaces live under `/dashboard-v2` (e.g. `/dashboard-v2/clients/[id]`)
// and are client-fetched from a dedicated API route. Performance follows the
// same pattern rather than a top-level `/performance` route, so it inherits
// the same shell, auth guard, and navigation memory as the rest of the
// dashboard.
export default async function DashboardPerformancePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return <PerformancePage firstName={session.firstName || null} />
}
