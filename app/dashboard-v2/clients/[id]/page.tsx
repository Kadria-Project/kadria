import { redirect } from 'next/navigation'
import { getSession } from '@/src/lib/auth-utils'
import ClientDetailWorkspace from '@/src/components/dashboard/clients/ClientDetailWorkspace'

// Routing choice: Clients V2 (Lots 8/9/9.5) all live under `/dashboard-v2`
// (e.g. `/dashboard-v2/projet/[id]`) and are client-fetched — there is no
// `/clients` top-level route in this repo. To stay consistent with the
// existing dashboard architecture, the client fiche lives at
// `/dashboard-v2/clients/[id]` rather than the brief's literal `/clients/[id]`.
export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id } = await params

  return <ClientDetailWorkspace clientId={id} />
}
