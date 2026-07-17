'use client';

import dynamic from 'next/dynamic';

const CalendarWorkspace = dynamic(() => import('./calendar/CalendarWorkspace'), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" aria-label="Chargement de l'agenda" />,
});

export default function DashboardAgendaRoute() {
  return <CalendarWorkspace />;
}
