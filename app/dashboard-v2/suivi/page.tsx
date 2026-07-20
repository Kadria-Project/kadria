import { redirect } from 'next/navigation';
import { getSession } from '@/src/lib/auth-utils';
import TrackingWorkspaceRoute from './TrackingWorkspaceRoute';

export const dynamic = 'force-dynamic';

export default async function TrackingPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return <TrackingWorkspaceRoute />;
}
