import { redirect } from 'next/navigation';
import DashboardClientsRoute from '@/src/components/workspace/DashboardClientsRoute';
import { getSession } from '@/src/lib/auth-utils';

export default async function ClientsPage() {
  if (!(await getSession())) redirect('/login');
  return <DashboardClientsRoute />;
}
