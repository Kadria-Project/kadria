import { redirect } from 'next/navigation';
import ArtisanDashboard from '@/src/components/ArtisanDashboard';
import { getSession } from '@/src/lib/auth-utils';
import { normalizePlan } from '@/src/lib/plans';

export default async function TasksPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return <ArtisanDashboard plan={normalizePlan(session.plan)} />;
}
