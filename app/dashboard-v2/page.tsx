import { redirect } from 'next/navigation';
import ArtisanDashboard from '@/src/components/ArtisanDashboard';
import { getSession } from '@/src/lib/auth-utils';
import { normalizePlan } from '@/src/lib/plans';
import KadriaAppShell from '@/src/components/workspace/KadriaAppShell';

export default async function DashboardV2Page() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <KadriaAppShell>
      <ArtisanDashboard plan={normalizePlan(session.plan)} />
    </KadriaAppShell>
  );
}
