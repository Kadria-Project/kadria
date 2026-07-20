import { redirect } from 'next/navigation';
import { getSession } from '@/src/lib/auth-utils';
import TasksWorkspaceRoute from './TasksWorkspaceRoute';

export default async function TasksPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return <TasksWorkspaceRoute firstName={session.firstName || null} />;
}
