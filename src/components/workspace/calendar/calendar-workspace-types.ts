import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';

export type CalendarView = 'jour' | 'semaine';

export type PlanningInsights = {
  summary: {
    today: number;
    tomorrow: number;
    thisWeek: number;
    unassigned: number;
    conflicts: number;
  };
  conflicts: Array<{
    appointmentId: string;
    conflictingAppointmentId: string;
    title: string;
    conflictingTitle: string;
    collaboratorName: string;
    start: string | null;
    conflictingStart: string | null;
  }>;
  travelWarnings: Array<{
    collaboratorName: string;
    fromAppointmentId: string;
    toAppointmentId: string;
    fromTitle: string;
    toTitle: string;
    gapMinutes: number;
    distanceKm: number;
  }>;
};

export type CalendarWorkspaceData = {
  events: NormalizedCalendarEvent[];
  insights: PlanningInsights | null;
  loading: boolean;
  error: string | null;
};
