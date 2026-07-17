import { redirect } from 'next/navigation';
import ArtisanDashboard from '@/src/components/ArtisanDashboard';
import { getSession } from '@/src/lib/auth-utils';
import { normalizePlan } from '@/src/lib/plans';

const legacyViewPaths: Record<string, string> = {
  agenda: '/dashboard-v2/agenda',
  calendar: '/dashboard-v2/agenda',
  clients: '/dashboard-v2/clients',
  suivi: '/dashboard-v2/suivi',
  commercial: '/dashboard-v2/suivi',
  tasks: '/dashboard-v2/a-faire',
  'a-faire': '/dashboard-v2/a-faire',
  performance: '/dashboard-v2/performance',
};

export default async function DashboardV2Page({ searchParams }: { searchParams: Promise<{ view?: string; tab?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const query = await searchParams;
  const legacyView = query.view || query.tab;
  const target = legacyView ? legacyViewPaths[legacyView] : null;
  if (target) redirect(target);

  return <ArtisanDashboard plan={normalizePlan(session.plan)} />;
}
