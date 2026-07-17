import { redirect } from 'next/navigation';
import DashboardAgendaRoute from '@/src/components/workspace/DashboardAgendaRoute';
import { getSession } from '@/src/lib/auth-utils';

export default async function AgendaPage() {
  if (!(await getSession())) redirect('/login');
  return <DashboardAgendaRoute />;
}
