'use client';

import { useRouter } from 'next/navigation';
import ClientsV2List from '@/src/components/dashboard/ClientsV2List';

export default function DashboardClientsRoute() {
  const router = useRouter();
  return <ClientsV2List onOpenProject={(projectId) => router.push(`/dashboard-v2/projet/${projectId}`)} onOpenClient={(clientId) => router.push(`/dashboard-v2/clients/${clientId}`)} />;
}
