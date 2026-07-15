'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { normalizeGoogleEvent, normalizeKadriaAppointment, type NormalizedCalendarEvent, type RawGoogleEvent, type RawKadriaAppointment } from '@/src/lib/calendar/normalized-event';
import AppointmentCreateModal, { type AppointmentCreateForm, type AppointmentProjectOption } from './AppointmentCreateModal';
import CalendarBriefing from './CalendarBriefing';
import CalendarSummary from './CalendarSummary';
import DayActivityTimeline from './DayActivityTimeline';
import NextAppointmentPanel from './NextAppointmentPanel';
import ScheduleAvailabilityPanel from './ScheduleAvailabilityPanel';
import ScheduleConflictPanel from './ScheduleConflictPanel';
import ScheduleRecommendations from './ScheduleRecommendations';
import ScheduleTimeline from './ScheduleTimeline';
import ScheduleTravelPanel from './ScheduleTravelPanel';
import type { CalendarView, PlanningInsights } from './calendar-workspace-types';
import { addDays, durationMinutes, eventDate, isSameDay, startOfWeekMonday } from './calendar-workspace-utils';

type CalendarMode = 'kadria' | 'google';
const DAY_MINUTES = 8 * 60;

function formatInputDate(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function CalendarWorkspace() {
  const router = useRouter();
  const [mode, setMode] = useState<CalendarMode>('kadria');
  const [view, setView] = useState<CalendarView>('semaine');
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [appointments, setAppointments] = useState<RawKadriaAppointment[]>([]);
  const [googleEvents, setGoogleEvents] = useState<RawGoogleEvent[]>([]);
  const [insights, setInsights] = useState<PlanningInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<NormalizedCalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<AppointmentProjectOption | null>(null);
  const [locationTouched, setLocationTouched] = useState(false);
  const [form, setForm] = useState<AppointmentCreateForm>({ title: '', start: '', end: '', location: '', projectId: null });
  const [currentTime] = useState(() => Date.now());

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = addDays(weekStart, -1).toISOString();
      const to = addDays(weekStart, 8).toISOString();
      const response = await fetch('/api/appointments/list?' + new URLSearchParams({ from, to }).toString());
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || 'Impossible de charger le planning.');
      setAppointments(Array.isArray(json.appointments) ? json.appointments : []);
      setInsights(json.insights || null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Impossible de charger le planning.');
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void fetchAppointments(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchAppointments]);

  useEffect(() => {
    const loadCalendarMode = async () => {
      try {
        const response = await fetch('/api/artisan/config');
        const json = await response.json();
        setMode(json?.config?.businessConfig?.calendarMode === 'google' ? 'google' : 'kadria');
      } catch {
        setMode('kadria');
      }
    };
    void loadCalendarMode();
  }, []);

  useEffect(() => {
    if (mode !== 'google') return;
    const loadGoogleEvents = async () => {
      try {
        const response = await fetch('/api/integrations/google-calendar/events');
        const json = await response.json();
        if (response.ok && json?.success) setGoogleEvents(Array.isArray(json.events) ? json.events : []);
      } catch {
        setGoogleEvents([]);
      }
    };
    void loadGoogleEvents();
  }, [mode]);

  const events = useMemo(() => mode === 'google' ? googleEvents.map(normalizeGoogleEvent) : appointments.map(normalizeKadriaAppointment), [appointments, googleEvents, mode]);
  const todayEvents = useMemo(() => events.filter((event) => {
    const date = eventDate(event);
    return date ? isSameDay(date, new Date()) : false;
  }), [events]);
  const plannedMinutes = useMemo(() => todayEvents.reduce((total, event) => total + durationMinutes(event), 0), [todayEvents]);
  const availableMinutes = Math.max(0, DAY_MINUTES - plannedMinutes);
  const nextAppointment = useMemo(() => events.filter((event) => {
    const date = eventDate(event);
    return date && date.getTime() >= currentTime;
  }).sort((left, right) => (eventDate(left)?.getTime() || 0) - (eventDate(right)?.getTime() || 0))[0] || null, [currentTime, events]);
  const selectedConflict = insights?.conflicts[0] || null;
  const endIsValid = Boolean(form.start && form.end && new Date(form.end).getTime() > new Date(form.start).getTime());

  const updatePeriod = (offset: number) => setWeekStart((current) => addDays(current, offset * 7));
  const openProject = (event: NormalizedCalendarEvent) => {
    if (event.projectId) router.push('/dashboard-v2/projet/' + event.projectId);
  };
  const openCreate = () => {
    const now = new Date();
    setForm({ title: '', start: formatInputDate(now), end: formatInputDate(new Date(now.getTime() + 60 * 60_000)), location: '', projectId: null });
    setSelectedProject(null);
    setLocationTouched(false);
    setCreateError(null);
    setSuccessMessage(null);
    setCreateOpen(true);
  };
  const updateFormField = (field: Exclude<keyof AppointmentCreateForm, 'projectId'>, value: string) => {
    if (field === 'location') setLocationTouched(true);
    setCreateError(null);
    setForm((current) => ({ ...current, [field]: value }));
  };
  const updateProject = (project: AppointmentProjectOption | null) => {
    setSelectedProject(project);
    setCreateError(null);
    setForm((current) => ({
      ...current,
      projectId: project?.id || null,
      location: !locationTouched && project ? [project.siteAddress, project.city].filter(Boolean).join(', ') : current.location,
    }));
  };
  const handleCreate = async () => {
    if (!form.title.trim() || !form.start || !form.end || !endIsValid) {
      setCreateError('V\u00e9rifiez le motif, le d\u00e9but et la fin du rendez-vous.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title.trim(), start: new Date(form.start).toISOString(), end: new Date(form.end).toISOString(), location: form.location || undefined, projectId: form.projectId, eventType: 'appointment' }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Impossible d'ajouter le rendez-vous.");
      setCreateOpen(false);
      await fetchAppointments();
      setSuccessMessage(selectedProject ? 'Rendez-vous ajout\u00e9 au planning et rattach\u00e9 au dossier ' + (selectedProject.clientName || selectedProject.projectTitle || 's\u00e9lectionn\u00e9') + '.' : 'Rendez-vous ajout\u00e9 au planning.');
    } catch (createError) {
      setCreateError(createError instanceof Error ? createError.message : "Impossible d'ajouter le rendez-vous.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 pb-6">
      <CalendarBriefing appointmentCount={todayEvents.length} conflictCount={insights?.summary.conflicts || 0} availableMinutes={availableMinutes} view={view} onToggleView={() => setView((current) => current === 'jour' ? 'semaine' : 'jour')} onCreate={openCreate} />
      <CalendarSummary appointmentCount={todayEvents.length} plannedMinutes={plannedMinutes} conflictCount={insights?.summary.conflicts || 0} travelWarningCount={insights?.travelWarnings.length || 0} />
      {error && <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {successMessage && <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_248px]">
        <div className="min-w-0 space-y-4">
          <ScheduleTimeline view={view} selectedDate={weekStart} events={events} onPrevious={() => updatePeriod(-1)} onNext={() => updatePeriod(1)} onToday={() => setWeekStart(startOfWeekMonday(new Date()))} onViewChange={setView} onOpenEvent={setSelectedEvent} onCreate={openCreate} />
          <DayActivityTimeline events={todayEvents} />
        </div>
        <aside className="space-y-3">
          <NextAppointmentPanel event={nextAppointment} onOpenProject={openProject} />
          <ScheduleAvailabilityPanel minutes={availableMinutes} />
          <ScheduleConflictPanel conflict={selectedConflict} onOpenConflict={() => selectedConflict && setSelectedEvent(events.find((event) => event.rawAppointmentId === selectedConflict.appointmentId) || null)} />
          <ScheduleRecommendations insights={insights} onOpenConflict={() => selectedConflict && setSelectedEvent(events.find((event) => event.rawAppointmentId === selectedConflict.appointmentId) || null)} />
          <ScheduleTravelPanel events={todayEvents} />
        </aside>
      </div>
      {loading && <p className="text-sm text-slate-500">Chargement du planning...</p>}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-950">{selectedEvent.title}</p><p className="mt-1 text-sm text-slate-500">{selectedEvent.clientName || selectedEvent.projectTitle || 'Rendez-vous'}</p></div><button type="button" onClick={() => setSelectedEvent(null)} aria-label="Fermer le rendez-vous" className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="size-4" /></button></div>
            {(selectedEvent.address || selectedEvent.location) && <p className="mt-4 text-sm text-slate-600">{selectedEvent.address || selectedEvent.location}</p>}
            {selectedEvent.actionUrl && <button type="button" onClick={() => openProject(selectedEvent)} className="mt-5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400">Voir le dossier</button>}
          </div>
        </div>
      )}
      {createOpen && <AppointmentCreateModal form={form} selectedProject={selectedProject} creating={creating} error={createError} endIsValid={endIsValid} onClose={() => !creating && setCreateOpen(false)} onSubmit={() => void handleCreate()} onFieldChange={updateFormField} onProjectChange={updateProject} />}
    </div>
  );
}
