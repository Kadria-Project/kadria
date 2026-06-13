import { redirect } from 'next/navigation';
import ArtisanDashboard from '@/src/components/ArtisanDashboard';
import { getSession } from '@/src/lib/auth-utils';

export default async function DashboardV2Page() {
  const session = await getSession();
  if (!session) redirect('/login');

  return <ArtisanDashboard />;
}