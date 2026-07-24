'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { normalizeGoogleEvent, normalizeKadriaAppointment, type NormalizedCalendarEvent, type RawGoogleEvent, type RawKadriaAppointment } from '@/src/lib/calendar/normalized-event';
import { isEventType } from '@/src/lib/calendar/event-types';
import type { AppointmentQualificationOutcome, AppointmentQualificationStatus } from '@/src/lib/appointment-qualification';
import type { AppointmentConfirmationSource, AppointmentConfirmationStatus } from '@/src/lib/appointment-confirmation';
import { createAppointmentMutationRequestId, type AppointmentMutationResponse } from '@/src/lib/appointments/mutation-contract';
import AppointmentCreateModal, { projectContactFields, type AppointmentCreateForm, type AppointmentProjectOption } from './AppointmentCreateModal';
import AppointmentQualificationModal from './AppointmentQualificationModal';
import AppointmentConfirmationModal from './AppointmentConfirmationModal';
import AppointmentBriefDrawer from './AppointmentBriefDrawer';
import AppointmentContextMenu from './AppointmentContextMenu';
import AppointmentMoveConfirmationModal from './AppointmentMoveConfirmationModal';
import CalendarBriefing from './CalendarBriefing';
import AgendaSituationsPanel from './AgendaSituationsPanel';
import AgendaDayInsights from './AgendaDayInsights';
import AgendaFiltersPopover from './AgendaFiltersPopover';
import { deriveAgendaDaySummary, getSelectedDayEvents } from './agenda-day-summary';
import ScheduleTimeline from './ScheduleTimeline';
import TeamScheduleTimeline from './TeamScheduleTimeline';
import type { CalendarView, PlanningInsights, TeamPlanningMember, TeamPlanningPermissions } from './calendar-workspace-types';
import { addDays, startOfDay, startOfWeekMonday } from './calendar-workspace-utils';
import { deriveDayReadiness, deriveScheduleSituations, type ScheduleSituation } from '@/src/lib/calendar/schedule-situations';
import { consumeAppointmentQuickCreateRoute, isAppointmentQuickCreate } from './quick-create-command';

type CalendarMode = 'kadria' | 'google';
type PlanningMode = 'personal' | 'team';
type PendingMove = { event: NormalizedCalendarEvent; previousStart: Date; previousEnd: Date; nextStart: Date; nextEnd: Date; nextAssignedUserId: string | null; previousAssigneeName: string | null; nextAssigneeName: string | null; conflictTitle: string | null; resized: boolean };
const MINIMUM_APPOINTMENT_DURATION_MS = 15 * 60_000;

function formatInputDate(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function appointmentMutationFeedback(response: AppointmentMutationResponse, fallback: string) {
  if (!response.reconfirmationRequired || response.idempotent) return fallback;
  if (response.reconfirmationReason === 'rescheduling') {
    return response.emailSent
      ? 'Nouveau créneau enregistré. Une demande de confirmation a été envoyée au client.'
      : 'Nouveau créneau enregistré. L’email n’a pas pu être envoyé.';
  }
  if (response.emailSent) return 'Rendez-vous modifié. Une nouvelle demande de confirmation a été envoyée au client.';
  return response.warning || 'Rendez-vous modifié. Une nouvelle confirmation est requise, mais l’email n’a pas pu être envoyé.';
}

export default function CalendarWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedAppointmentId = searchParams.get('appointmentId');
  const [mode, setMode] = useState<CalendarMode>('kadria');
  const [planningMode, setPlanningMode] = useState<PlanningMode>('personal');
  const [view, setView] = useState<CalendarView>('jour');
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [appointments, setAppointments] = useState<RawKadriaAppointment[]>([]);
  const [googleEvents, setGoogleEvents] = useState<RawGoogleEvent[]>([]);
  const [insights, setInsights] = useState<PlanningInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<NormalizedCalendarEvent | null>(null);
  const [contextEvent, setContextEvent] = useState<NormalizedCalendarEvent | null>(null);
  const [briefEvent, setBriefEvent] = useState<NormalizedCalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const createSubmissionRef = useRef(false);
  const createTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [qualificationAvailable, setQualificationAvailable] = useState(false);
  const [confirmingEvent, setConfirmingEvent] = useState<NormalizedCalendarEvent | null>(null);
  const [confirmationSaving, setConfirmationSaving] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [qualifyingEvent, setQualifyingEvent] = useState<NormalizedCalendarEvent | null>(null);
  const [qualificationSaving, setQualificationSaving] = useState(false);
  const [qualificationError, setQualificationError] = useState<string | null>(null);
  const [workHours, setWorkHours] = useState({ start: null as string | null, end: null as string | null });
  const [savingAppointmentIds, setSavingAppointmentIds] = useState<Set<string>>(() => new Set());
  const [teamMembers, setTeamMembers] = useState<TeamPlanningMember[]>([]);
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([]);
  const [teamPermissions, setTeamPermissions] = useState<TeamPlanningPermissions | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<AppointmentProjectOption | null>(null);
  const [pendingContactProject, setPendingContactProject] = useState<AppointmentProjectOption | null>(null);
  const [form, setForm] = useState<AppointmentCreateForm>({ title: '', start: '', end: '', location: '', description: '', clientName: '', clientEmail: '', clientPhone: '', projectId: null, assignedUserId: '', eventType: 'appointment' });
  const [confirmationFilter, setConfirmationFilter] = useState('all');
  const [collaboratorFilter, setCollaboratorFilter] = useState('all');
  const [filterDraft, setFilterDraft] = useState({ confirmation: 'all', collaborator: 'all' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const savingAppointmentIdsRef = useRef(savingAppointmentIds);
  const contactFieldsTouchedRef = useRef(false);
  const filtersTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    savingAppointmentIdsRef.current = savingAppointmentIds;
  }, [savingAppointmentIds]);

  const fetchAppointments = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    if (background && savingAppointmentIdsRef.current.size > 0) return;
    if (!background) {
      setLoading(true);
      setError(null);
    }
    try {
      const weekStart = startOfWeekMonday(selectedDate);
      const from = addDays(weekStart, -1).toISOString();
      const to = addDays(weekStart, 8).toISOString();
      const response = await fetch('/api/appointments/list?' + new URLSearchParams({ from, to }).toString(), { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || 'Impossible de charger le planning.');
      const nextAppointments = Array.isArray(json.appointments) ? json.appointments as RawKadriaAppointment[] : [];
      setAppointments(nextAppointments);
      setSelectedEvent((current) => {
        if (!current?.rawAppointmentId) return current;
        const updated = nextAppointments.find((appointment) => appointment.id === current.rawAppointmentId);
        return updated ? normalizeKadriaAppointment(updated) : current;
      });
      setInsights(json.insights || null);
      setQualificationAvailable(Boolean(json.qualificationAvailable));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Impossible de charger le planning.');
    } finally {
      if (!background) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void fetchAppointments(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchAppointments]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void fetchAppointments({ background: true });
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const interval = window.setInterval(refreshWhenVisible, 45_000);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(interval);
    };
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
    const loadTeamMembers = async () => {
      try {
        const response = await fetch('/api/team/members-lite');
        const json = await response.json();
        if (!response.ok || !json?.success) return;
        const members = Array.isArray(json.members) ? json.members as TeamPlanningMember[] : [];
        setTeamMembers(members);
        setSelectedTeamMemberIds(members.map((member) => member.userId));
        setTeamPermissions(json.permissions || null);
        setCurrentUserId(typeof json.currentUserId === 'string' ? json.currentUserId : null);
      } catch {
        // The personal planning remains available when the team directory is unavailable.
      }
    };
    void loadTeamMembers();
  }, []);

  useEffect(() => {
    const loadWorkHours = async () => {
      try {
        const response = await fetch('/api/artisan/business-profile');
        const json = await response.json();
        if (!response.ok || !json?.success || !json.profile) return;
        setWorkHours({
          start: typeof json.profile.work_start_time === 'string' ? json.profile.work_start_time : null,
          end: typeof json.profile.work_end_time === 'string' ? json.profile.work_end_time : null,
        });
      } catch {
        // The calendar uses its centralized fallback when the profile is unavailable.
      }
    };
    void loadWorkHours();
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

  const allEvents = useMemo(() => mode === 'google' ? googleEvents.map(normalizeGoogleEvent) : appointments.map(normalizeKadriaAppointment), [appointments, googleEvents, mode]);

  useEffect(() => {
    if (!requestedAppointmentId) return;
    const requestedEvent = allEvents.find((event) => event.rawAppointmentId === requestedAppointmentId);
    if (!requestedEvent) return;
    const frame = window.requestAnimationFrame(() => setSelectedEvent(requestedEvent));
    return () => window.cancelAnimationFrame(frame);
  }, [allEvents, requestedAppointmentId]);
  const events = useMemo(() => allEvents.filter((event) => {
    if (confirmationFilter !== 'all' && event.confirmation?.status !== confirmationFilter) return false;
    if (collaboratorFilter === 'unassigned') return event.source !== 'kadria-appointment' || !event.assignedUserId;
    if (collaboratorFilter === 'me') return event.isAssignedToCurrentUser;
    return collaboratorFilter === 'all' || event.assignedUserId === collaboratorFilter;
  }), [allEvents, collaboratorFilter, confirmationFilter]);
  const selectedDayEvents = useMemo(() => getSelectedDayEvents(events, selectedDate), [events, selectedDate]);
  const situations = useMemo(() => deriveScheduleSituations(events, insights), [events, insights]);
  const eventTypesByAppointmentId = useMemo(() => Object.fromEntries(appointments.map((appointment) => [appointment.id, appointment.eventType])), [appointments]);
  const agendaDaySummary = useMemo(() => deriveAgendaDaySummary({ events: selectedDayEvents, selectedDate, eventTypesByAppointmentId, workStartTime: workHours.start, workEndTime: workHours.end }), [eventTypesByAppointmentId, selectedDate, selectedDayEvents, workHours.end, workHours.start]);
  const dayReadiness = useMemo(() => deriveDayReadiness({ loading, error, events: selectedDayEvents, situations, insightsVerified: insights !== null }), [error, insights, loading, selectedDayEvents, situations]);
  const selectedDayConfirmedCount = useMemo(() => selectedDayEvents.filter((event) => event.confirmation?.status === 'confirmed').length, [selectedDayEvents]);
  const endIsValid = Boolean(form.start && form.end && new Date(form.end).getTime() > new Date(form.start).getTime());
  const teamPlanningAvailable = mode === 'kadria' && Boolean(teamPermissions?.canManageTeamPlanning) && teamMembers.length > 1;

  const updatePeriod = (offset: number) => setSelectedDate((current) => addDays(current, offset * (view === 'jour' ? 1 : 7)));
  const activeFilterCount = Number(confirmationFilter !== 'all') + Number(collaboratorFilter !== 'all');
  const openFilters = () => {
    setFilterDraft({ confirmation: confirmationFilter, collaborator: collaboratorFilter });
    setFiltersOpen(true);
  };
  const applyFilters = () => {
    setConfirmationFilter(filterDraft.confirmation);
    setCollaboratorFilter(filterDraft.collaborator);
    setFiltersOpen(false);
  };
  const resetFilters = () => {
    setConfirmationFilter('all');
    setCollaboratorFilter('all');
    setFilterDraft({ confirmation: 'all', collaborator: 'all' });
  };
  const openProject = (event: NormalizedCalendarEvent) => {
    if (event.projectId) router.push('/dashboard-v2/projet/' + event.projectId);
  };
  const actOnSituation = (situation: ScheduleSituation) => {
    const event = events.find((candidate) => candidate.rawAppointmentId === situation.appointmentId);
    if (!event) return;
    if (situation.kind === 'confirm') {
      setConfirmationError(null);
      setConfirmingEvent(event);
      return;
    }
    if (situation.kind === 'replan' || situation.kind === 'resolve_conflict' || situation.kind === 'assign') {
      openEvent(event, true);
      return;
    }
    setContextEvent(event);
  };
  const openCreate = useCallback((assignedUserId?: string, project?: AppointmentProjectOption | null, date?: Date, trigger?: HTMLButtonElement, suggestedStart?: Date) => {
    const now = suggestedStart ? new Date(suggestedStart) : date ? new Date(date) : new Date();
    if (date && !suggestedStart) now.setHours(7, 0, 0, 0);
    createTriggerRef.current = trigger || null;
    setForm({ title: '', start: formatInputDate(now), end: formatInputDate(new Date(now.getTime() + 60 * 60_000)), location: project ? [project.siteAddress, project.city].filter(Boolean).join(', ') : '', description: '', clientName: project ? [project.clientFirstName, project.clientName].filter(Boolean).join(' ') : '', clientEmail: project?.clientEmail || '', clientPhone: project?.clientPhone || '', projectId: project?.id || null, assignedUserId: assignedUserId || currentUserId || '', eventType: 'appointment' });
    setSelectedProject(project || null);
    setPendingContactProject(null);
    contactFieldsTouchedRef.current = false;
    setCreateError(null);
    setSuccessMessage(null);
    setCreateOpen(true);
  }, [currentUserId]);

  const quickCreateRequested = isAppointmentQuickCreate(searchParams.get('quickCreate'));
  const closeCreate = () => {
    if (creating) return;
    setCreateOpen(false);
    window.setTimeout(() => createTriggerRef.current?.focus(), 0);
    // The URL is a one-shot command from the shell. Consume it before the
    // dialog closes so a subsequent render cannot reopen the form.
    if (quickCreateRequested) router.replace(consumeAppointmentQuickCreateRoute());
  };
  const openEvent = (event: NormalizedCalendarEvent, edit = false) => {
    if (!event.rawAppointmentId) {
      setSelectedEvent(event);
      return;
    }
    if (!edit) {
      setContextEvent(event);
      return;
    }
    const appointment = appointments.find((item) => item.id === event.rawAppointmentId);
    if (!appointment) return;
    setForm({
      title: appointment.title || '',
      start: appointment.start ? formatInputDate(new Date(appointment.start)) : '',
      end: appointment.end ? formatInputDate(new Date(appointment.end)) : '',
      location: appointment.location || '',
      description: appointment.description || '',
      clientName: appointment.clientName || '',
      clientEmail: appointment.clientEmail || '',
      clientPhone: appointment.clientPhone || '',
      projectId: appointment.projectId,
      assignedUserId: appointment.assignedUserId || '',
      eventType: isEventType(appointment.eventType) ? appointment.eventType : 'appointment',
    });
    setSelectedProject(appointment.projectId ? {
      id: appointment.projectId,
      clientName: appointment.clientName || '',
      clientFirstName: '',
      projectTitle: appointment.projectType || '',
      projectType: appointment.projectType || '',
      status: appointment.status || '',
      city: appointment.city || '',
      siteAddress: appointment.address || '',
    } : null);
    setPendingContactProject(null);
    contactFieldsTouchedRef.current = false;
    setCreateError(null);
    setEditingAppointmentId(appointment.id);
  };
  const handleQualification = async (input: { status: AppointmentQualificationStatus; outcome: AppointmentQualificationOutcome | null; note: string; nextAction: string; expectedVersion: number }) => {
    if (!qualifyingEvent?.rawAppointmentId) return;
    setQualificationSaving(true);
    setQualificationError(null);
    try {
      const response = await fetch('/api/appointments/' + qualifyingEvent.rawAppointmentId + '/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, requestId: crypto.randomUUID() }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Impossible d'enregistrer cette qualification.");
      setQualifyingEvent(null);
      await fetchAppointments();
      setSuccessMessage('Qualification enregistrée.');
    } catch (qualificationError) {
      setQualificationError(qualificationError instanceof Error ? qualificationError.message : "Impossible d'enregistrer cette qualification.");
    } finally {
      setQualificationSaving(false);
    }
  };
  const handleConfirmation = async (input: { status: AppointmentConfirmationStatus; source: AppointmentConfirmationSource; note: string; expectedVersion: number }) => {
    if (!confirmingEvent?.rawAppointmentId) return;
    setConfirmationSaving(true);
    setConfirmationError(null);
    try {
      const response = await fetch('/api/appointments/' + confirmingEvent.rawAppointmentId + '/confirmation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, requestId: crypto.randomUUID() }) });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || 'Impossible d’enregistrer cette confirmation.');
      setConfirmingEvent(null);
      await fetchAppointments();
      setSuccessMessage('Confirmation enregistrée.');
    } catch (confirmationError) {
      setConfirmationError(confirmationError instanceof Error ? confirmationError.message : 'Impossible d’enregistrer cette confirmation.');
    } finally { setConfirmationSaving(false); }
  };
  const handleConfirmationSend = async (input: { status: AppointmentConfirmationStatus; message: string; expectedVersion: number }) => {
    if (!confirmingEvent?.rawAppointmentId) return;
    setConfirmationSaving(true);
    setConfirmationError(null);
    try {
      const response = await fetch('/api/appointments/' + confirmingEvent.rawAppointmentId + '/confirmation/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, requestId: crypto.randomUUID() }) });
      const json = await response.json();
      if (json?.statusSaved && !json?.emailSent) {
        setConfirmingEvent(null);
        await fetchAppointments();
        setError(json.error || 'Le statut a été enregistré, mais l’email n’a pas pu être envoyé.');
        return;
      }
      if (!response.ok || !json?.success) throw new Error(json?.error || 'Impossible d’envoyer la confirmation.');
      setConfirmingEvent(null);
      await fetchAppointments();
      setSuccessMessage('Statut enregistré et email envoyé au client.');
    } catch (sendError) {
      setConfirmationError(sendError instanceof Error ? sendError.message : 'Impossible d’envoyer la confirmation.');
    } finally { setConfirmationSaving(false); }
  };
  const updateFormField = (field: Exclude<keyof AppointmentCreateForm, 'projectId'>, value: string) => {
    if (field === 'clientName' || field === 'clientEmail' || field === 'clientPhone' || field === 'location') contactFieldsTouchedRef.current = true;
    setCreateError(null);
    setForm((current) => ({ ...current, [field]: value }));
  };
  const applyProjectChange = (project: AppointmentProjectOption | null, replaceContactFields: boolean) => {
    setSelectedProject(project);
    setForm((current) => ({
      ...current,
      projectId: project?.id || null,
      ...(project && replaceContactFields ? projectContactFields(project) : {}),
    }));
    if (replaceContactFields) contactFieldsTouchedRef.current = false;
  };
  const updateProject = (project: AppointmentProjectOption | null) => {
    setCreateError(null);
    if (!project) {
      applyProjectChange(null, false);
      return;
    }
    if (contactFieldsTouchedRef.current && project.id !== selectedProject?.id) {
      setPendingContactProject(project);
      return;
    }
    applyProjectChange(project, true);
  };
  const handleCreate = async () => {
    if (creating || createSubmissionRef.current) return;
    if (!form.title.trim() || !form.start || !form.end || !endIsValid) {
      setCreateError('V\u00e9rifiez le motif, le d\u00e9but et la fin du rendez-vous.');
      return;
    }
    createSubmissionRef.current = true;
    setCreating(true);
    setCreateError(null);
    try {
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title.trim(), start: new Date(form.start).toISOString(), end: new Date(form.end).toISOString(), location: form.location || undefined, description: form.description || undefined, client_name: form.clientName, client_email: form.clientEmail, client_phone: form.clientPhone, projectId: form.projectId, assignedUserId: form.assignedUserId || undefined, eventType: form.eventType }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Impossible d'ajouter le rendez-vous.");
      const successMessage = selectedProject ? 'Rendez-vous créé avec succès et rattaché au dossier.' : 'Rendez-vous créé avec succès.';
      setForm({ title: '', start: '', end: '', location: '', description: '', clientName: '', clientEmail: '', clientPhone: '', projectId: null, assignedUserId: '', eventType: 'appointment' });
      setSelectedProject(null);
      closeCreate();
      setSuccessMessage(successMessage);
      await fetchAppointments();
    } catch (createError) {
      setCreateError(createError instanceof Error ? createError.message : "Impossible d'ajouter le rendez-vous.");
    } finally {
      createSubmissionRef.current = false;
      setCreating(false);
    }
  };
  const handleUpdate = async () => {
    if (creating || createSubmissionRef.current || !editingAppointmentId || !form.title.trim() || !form.start || !form.end || !endIsValid) {
      setCreateError('V\u00e9rifiez le motif, le d\u00e9but et la fin du rendez-vous.');
      return;
    }
    createSubmissionRef.current = true;
    setCreating(true);
    setCreateError(null);
    const requestId = createAppointmentMutationRequestId();
    try {
      const response = await fetch('/api/appointments/' + editingAppointmentId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title.trim(), start: new Date(form.start).toISOString(), end: new Date(form.end).toISOString(), location: form.location || null, description: form.description || null, client_name: form.clientName, client_email: form.clientEmail, client_phone: form.clientPhone, projectId: form.projectId, assignedUserId: form.assignedUserId || undefined, eventType: form.eventType, requestId }),
      });
      const json = await response.json() as AppointmentMutationResponse & { field?: string; error?: string };
      if (!response.ok || !json?.success) {
        const fallback = json?.field === 'location' ? "L’adresse du rendez-vous n’a pas pu être enregistrée." : "La modification n'a pas pu être enregistrée.";
        throw new Error(json?.error || fallback);
      }
      setEditingAppointmentId(null);
      await fetchAppointments();
      setSuccessMessage(appointmentMutationFeedback(json, 'Rendez-vous modifié.'));
    } catch (updateError) {
      setCreateError(updateError instanceof Error ? updateError.message : "La modification n'a pas pu etre enregistree.");
    } finally {
      createSubmissionRef.current = false;
      setCreating(false);
    }
  };
  const handleDelete = async () => {
    if (!editingAppointmentId || !window.confirm('Supprimer ce rendez-vous ?\n\nCette action retirera le rendez-vous du planning.')) return;
    setDeleting(true);
    setCreateError(null);
    try {
      const response = await fetch('/api/appointments/' + editingAppointmentId, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "La suppression n'a pas pu etre effectuee.");
      setEditingAppointmentId(null);
      await fetchAppointments();
      setSuccessMessage('Rendez-vous supprim\u00e9.');
    } catch (deleteError) {
      setCreateError(deleteError instanceof Error ? deleteError.message : "La suppression n'a pas pu etre effectuee.");
    } finally {
      setDeleting(false);
    }
  };
  const persistMoveEvent = async (event: NormalizedCalendarEvent, nextStart: Date, forceConflict = false, resizedEnd?: Date, requestId = createAppointmentMutationRequestId()) => {
    if (!event.rawAppointmentId || !event.start || !event.end || event.status === 'cancelled') return;
    if (savingAppointmentIds.has(event.rawAppointmentId) && !forceConflict) return;
    const previousStart = event.start;
    const previousEnd = event.end;
    const duration = new Date(previousEnd).getTime() - new Date(previousStart).getTime();
    if (!Number.isFinite(duration) || duration < MINIMUM_APPOINTMENT_DURATION_MS) return;
    const nextEnd = resizedEnd ? resizedEnd.toISOString() : new Date(nextStart.getTime() + duration).toISOString();
    if (new Date(nextEnd).getTime() - nextStart.getTime() < MINIMUM_APPOINTMENT_DURATION_MS) return;
    const nextStartIso = nextStart.toISOString();
    setSavingAppointmentIds((current) => new Set(current).add(event.rawAppointmentId!));
    setAppointments((current) => current.map((item) => item.id === event.rawAppointmentId ? { ...item, start: nextStartIso, end: nextEnd } : item));
    try {
      const response = await fetch('/api/appointments/' + event.rawAppointmentId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start: nextStartIso, end: nextEnd, move: !resizedEnd, resize: Boolean(resizedEnd), forceConflict: Boolean(forceConflict), requestId }) });
      const json = await response.json() as AppointmentMutationResponse & { code?: string; error?: string };
      if (response.status === 409 && json?.code === 'APPOINTMENT_CONFLICT' && !forceConflict) {
        setAppointments((current) => current.map((item) => item.id === event.rawAppointmentId ? { ...item, start: previousStart, end: previousEnd } : item));
        setMoveError(json.error || 'Un conflit empêche cet enregistrement. Ajustez l’horaire puis réessayez.');
        return;
      }
      if (!response.ok || !json?.success) throw new Error(json?.error || 'Le rendez-vous n’a pas pu être déplacé.');
      setSuccessMessage(appointmentMutationFeedback(json, resizedEnd
        ? `Durée du rendez-vous modifiée jusqu’à ${resizedEnd.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`
        : `Rendez-vous déplacé à ${nextStart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`));
      setPendingMove(null);
    } catch {
      setAppointments((current) => current.map((item) => item.id === event.rawAppointmentId ? { ...item, start: previousStart, end: previousEnd } : item));
      setMoveError(resizedEnd
        ? 'La durée du rendez-vous n’a pas pu être modifiée. La durée précédente a été restaurée.'
        : 'Le rendez-vous n’a pas pu être déplacé. Son horaire précédent a été restauré.');
    } finally {
      setSavingAppointmentIds((current) => {
        const next = new Set(current);
        next.delete(event.rawAppointmentId!);
        return next;
      });
    }
  };
  const persistTeamMoveEvent = async (event: NormalizedCalendarEvent, nextStart: Date, nextAssignedUserId: string, forceConflict = false, requestId = createAppointmentMutationRequestId()) => {
    if (!event.rawAppointmentId || !event.start || !event.end || event.status === 'cancelled') return;
    if (savingAppointmentIds.has(event.rawAppointmentId) && !forceConflict) return;
    const previousStart = event.start;
    const previousEnd = event.end;
    const previousAssignedUserId = event.assignedUserId;
    const duration = new Date(previousEnd).getTime() - new Date(previousStart).getTime();
    if (!Number.isFinite(duration) || duration < MINIMUM_APPOINTMENT_DURATION_MS) return;
    const nextStartIso = nextStart.toISOString();
    const nextEnd = new Date(nextStart.getTime() + duration).toISOString();
    const assigneeName = teamMembers.find((member) => member.userId === nextAssignedUserId)?.name || event.assignedUserName;
    setSavingAppointmentIds((current) => new Set(current).add(event.rawAppointmentId!));
    setAppointments((current) => current.map((item) => item.id === event.rawAppointmentId ? { ...item, start: nextStartIso, end: nextEnd, assignedUserId: nextAssignedUserId, assignedUserName: assigneeName, isUnassigned: false } : item));
    try {
      const response = await fetch('/api/appointments/' + event.rawAppointmentId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: nextStartIso, end: nextEnd, move: true, forceConflict: Boolean(forceConflict), requestId, ...(nextAssignedUserId !== previousAssignedUserId ? { assignedUserId: nextAssignedUserId } : {}) }),
      });
      const json = await response.json() as AppointmentMutationResponse & { code?: string; error?: string };
      if (response.status === 409 && json?.code === 'APPOINTMENT_CONFLICT' && !forceConflict) {
        setAppointments((current) => current.map((item) => item.id === event.rawAppointmentId ? { ...item, start: previousStart, end: previousEnd, assignedUserId: previousAssignedUserId, assignedUserName: event.assignedUserName, isUnassigned: event.isUnassigned } : item));
        setMoveError(json.error || 'Un conflit empêche cet enregistrement. Ajustez l’horaire puis réessayez.');
        return;
      }
      if (!response.ok || !json?.success) throw new Error(json?.error || 'Le rendez-vous n’a pas pu être déplacé.');
      const time = nextStart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setSuccessMessage(appointmentMutationFeedback(json, nextAssignedUserId !== previousAssignedUserId ? `Rendez-vous réaffecté à ${assigneeName || 'ce collaborateur'} et déplacé à ${time}.` : `Rendez-vous déplacé à ${time}.`));
      setPendingMove(null);
    } catch {
      setAppointments((current) => current.map((item) => item.id === event.rawAppointmentId ? { ...item, start: previousStart, end: previousEnd, assignedUserId: previousAssignedUserId, assignedUserName: event.assignedUserName, isUnassigned: event.isUnassigned } : item));
      setMoveError('Le rendez-vous n’a pas pu être déplacé. Son horaire précédent a été restauré.');
    } finally {
      setSavingAppointmentIds((current) => {
        const next = new Set(current);
        next.delete(event.rawAppointmentId!);
        return next;
      });
    }
  };

  const requestMoveConfirmation = (event: NormalizedCalendarEvent, nextStart: Date, resizedEnd?: Date) => {
    if (!event.start || !event.end || !event.rawAppointmentId) return;
    const previousStart = new Date(event.start);
    const previousEnd = new Date(event.end);
    const duration = previousEnd.getTime() - previousStart.getTime();
    const nextEnd = resizedEnd || new Date(nextStart.getTime() + duration);
    if (!Number.isFinite(duration) || nextEnd <= nextStart) return;
    const conflict = events.find((candidate) => candidate.rawAppointmentId !== event.rawAppointmentId && candidate.assignedUserId === event.assignedUserId && candidate.status !== 'cancelled' && candidate.start && candidate.end && nextStart.toISOString() < candidate.end && nextEnd.toISOString() > candidate.start);
    setMoveError(null);
    setPendingMove({ event, previousStart, previousEnd, nextStart, nextEnd, nextAssignedUserId: event.assignedUserId, previousAssigneeName: event.assignedUserName, nextAssigneeName: event.assignedUserName, conflictTitle: conflict?.title || null, resized: Boolean(resizedEnd) });
  };
  const requestTeamMoveConfirmation = (event: NormalizedCalendarEvent, nextStart: Date, nextAssignedUserId: string) => {
    if (!event.start || !event.end || !event.rawAppointmentId) return;
    const previousStart = new Date(event.start);
    const previousEnd = new Date(event.end);
    const duration = previousEnd.getTime() - previousStart.getTime();
    const nextEnd = new Date(nextStart.getTime() + duration);
    if (!Number.isFinite(duration) || nextEnd <= nextStart) return;
    const conflict = events.find((candidate) => candidate.rawAppointmentId !== event.rawAppointmentId && candidate.assignedUserId === nextAssignedUserId && candidate.status !== 'cancelled' && candidate.start && candidate.end && nextStart.toISOString() < candidate.end && nextEnd.toISOString() > candidate.start);
    const nextAssigneeName = teamMembers.find((member) => member.userId === nextAssignedUserId)?.name || null;
    setMoveError(null);
    setPendingMove({ event, previousStart, previousEnd, nextStart, nextEnd, nextAssignedUserId, previousAssigneeName: event.assignedUserName, nextAssigneeName, conflictTitle: conflict?.title || null, resized: false });
  };
  const handleMoveEvent = (event: NormalizedCalendarEvent, nextStart: Date) => requestMoveConfirmation(event, nextStart);
  const handleResizeEvent = (event: NormalizedCalendarEvent, nextEnd: Date) => {
    if (!event.start) return;
    requestMoveConfirmation(event, new Date(event.start), nextEnd);
  };
  const handleTeamMoveEvent = (event: NormalizedCalendarEvent, nextStart: Date, nextAssignedUserId: string) => requestTeamMoveConfirmation(event, nextStart, nextAssignedUserId);

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 pb-6">
      <CalendarBriefing readiness={dayReadiness} appointmentCount={agendaDaySummary.appointmentCount} confirmedCount={selectedDayConfirmedCount} travelMinutes={agendaDaySummary.travelMinutes} estimatedEnd={agendaDaySummary.estimatedEnd} selectedDate={selectedDate} />
      <AgendaSituationsPanel situations={situations} onAction={actOnSituation} />
      {error && <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {successMessage && <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>}
       <section id="workspace-section-calendar" className="min-h-[70vh]">
       <div className="mb-3 flex flex-wrap items-center gap-2">
         <button ref={filtersTriggerRef} type="button" onClick={openFilters} aria-label="Ouvrir les filtres Agenda" aria-haspopup="dialog" aria-expanded={filtersOpen} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"><SlidersHorizontal className="size-4 text-slate-600" />Filtres{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}</button>
         {activeFilterCount > 0 && <button type="button" onClick={resetFilters} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2">Réinitialiser</button>}
          {teamPlanningAvailable ? <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1"><button type="button" onClick={() => setPlanningMode('personal')} className={['rounded-lg px-3 py-2 text-xs font-semibold transition-colors', planningMode === 'personal' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'].join(' ')}>Mon planning</button><button type="button" onClick={() => setPlanningMode('team')} className={['rounded-lg px-3 py-2 text-xs font-semibold transition-colors', planningMode === 'team' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'].join(' ')}>Planning d’équipe</button></div> : null}
        </div>
        {planningMode === 'team' && teamPlanningAvailable ? <TeamScheduleTimeline view={view} selectedDate={selectedDate} events={events.filter((event) => event.source === 'kadria-appointment')} members={teamMembers} selectedMemberIds={selectedTeamMemberIds} onToggleMember={(memberId) => setSelectedTeamMemberIds((current) => current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId])} onPrevious={() => updatePeriod(-1)} onNext={() => updatePeriod(1)} onToday={() => setSelectedDate(startOfDay(new Date()))} onDaySelect={setSelectedDate} onViewChange={setView} onOpenEvent={openEvent} onCreate={openCreate} onMoveEvent={(event, start, assignedUserId) => void handleTeamMoveEvent(event, start, assignedUserId)} workStartTime={workHours.start} workEndTime={workHours.end} savingEventIds={savingAppointmentIds} /> : <ScheduleTimeline view={view} selectedDate={selectedDate} events={events} onPrevious={() => updatePeriod(-1)} onNext={() => updatePeriod(1)} onToday={() => setSelectedDate(startOfDay(new Date()))} onViewChange={setView} onOpenEvent={openEvent} onCreate={(day, trigger, suggestedStart) => openCreate(undefined, undefined, day, trigger, suggestedStart)} qualificationAvailable={qualificationAvailable} workStartTime={workHours.start} workEndTime={workHours.end} savingEventIds={savingAppointmentIds} onMoveEvent={(event, start) => void handleMoveEvent(event, start)} onResizeEvent={handleResizeEvent} />}
        </section>
        <AgendaDayInsights summary={agendaDaySummary} />
       <AgendaFiltersPopover open={filtersOpen} triggerRef={filtersTriggerRef} confirmation={filterDraft.confirmation} collaborator={filterDraft.collaborator} members={teamMembers} onConfirmationChange={(confirmation) => setFilterDraft((current) => ({ ...current, confirmation }))} onCollaboratorChange={(collaborator) => setFilterDraft((current) => ({ ...current, collaborator }))} onApply={applyFilters} onReset={resetFilters} onClose={() => setFiltersOpen(false)} />
       {pendingMove ? <AppointmentMoveConfirmationModal event={pendingMove.event} previousStart={pendingMove.previousStart} previousEnd={pendingMove.previousEnd} nextStart={pendingMove.nextStart} nextEnd={pendingMove.nextEnd} previousAssigneeName={pendingMove.previousAssigneeName} nextAssigneeName={pendingMove.nextAssigneeName} conflictTitle={pendingMove.conflictTitle} saving={savingAppointmentIds.has(pendingMove.event.rawAppointmentId || '')} error={moveError} onCancel={() => { if (!savingAppointmentIds.has(pendingMove.event.rawAppointmentId || '')) { setPendingMove(null); setMoveError(null); } }} onConfirm={(start, end) => { if (pendingMove.nextAssignedUserId && pendingMove.nextAssignedUserId !== pendingMove.event.assignedUserId) { void persistTeamMoveEvent(pendingMove.event, start, pendingMove.nextAssignedUserId); return; } void persistMoveEvent(pendingMove.event, start, false, end); }} /> : null}
       {loading && <p className="text-sm text-slate-500">Chargement du planning...</p>}
      {contextEvent ? <AppointmentContextMenu event={contextEvent} onClose={() => setContextEvent(null)} onBrief={() => { setBriefEvent(contextEvent); setContextEvent(null); }} onEdit={() => { const event = contextEvent; setContextEvent(null); openEvent(event, true); }} onOpenProject={() => { openProject(contextEvent); setContextEvent(null); }} /> : null}
      {briefEvent ? <AppointmentBriefDrawer event={briefEvent} onClose={() => setBriefEvent(null)} onEdit={() => { const event = briefEvent; setBriefEvent(null); openEvent(event, true); }} onOpenProject={() => { openProject(briefEvent); setBriefEvent(null); }} /> : null}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-950">{selectedEvent.title}</p><p className="mt-1 text-sm text-slate-500">{selectedEvent.clientName || selectedEvent.projectTitle || 'Rendez-vous'}</p></div><button type="button" onClick={() => setSelectedEvent(null)} aria-label="Fermer le rendez-vous" className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="size-4" /></button></div>
            {(selectedEvent.address || selectedEvent.location) && <p className="mt-4 text-sm text-slate-600">{selectedEvent.address || selectedEvent.location}</p>}
            {selectedEvent.actionUrl && <button type="button" onClick={() => openProject(selectedEvent)} className="mt-5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400">Voir le dossier</button>}
          </div>
        </div>
      )}
      {(createOpen || quickCreateRequested) && <AppointmentCreateModal form={form} selectedProject={selectedProject} creating={creating} error={createError} endIsValid={endIsValid} initialProjectId={quickCreateRequested ? searchParams.get('projectId') : null} onClose={closeCreate} onSubmit={() => void handleCreate()} onFieldChange={updateFormField} onProjectChange={updateProject} />}
      {editingAppointmentId && <AppointmentCreateModal form={form} selectedProject={selectedProject} creating={creating} deleting={deleting} error={createError} endIsValid={endIsValid} mode="edit" onClose={() => { if (!creating && !deleting) { setEditingAppointmentId(null); setPendingContactProject(null); contactFieldsTouchedRef.current = false; } }} onSubmit={() => void handleUpdate()} onDelete={() => void handleDelete()} onFieldChange={updateFormField} onProjectChange={updateProject} />}
      {pendingContactProject && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="project-contact-replacement-title" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"><h2 id="project-contact-replacement-title" className="text-base font-bold text-slate-950">Remplacer les coordonnées ?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Le projet sélectionné propose de nouvelles coordonnées. Voulez-vous remplacer vos modifications actuelles ?</p><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => { applyProjectChange(pendingContactProject, false); setPendingContactProject(null); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Conserver mes modifications</button><button type="button" onClick={() => { applyProjectChange(pendingContactProject, true); setPendingContactProject(null); }} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Remplacer</button></div></div></div>}
      {qualifyingEvent && <AppointmentQualificationModal event={qualifyingEvent} saving={qualificationSaving} error={qualificationError} onClose={() => !qualificationSaving && setQualifyingEvent(null)} onSave={(input) => void handleQualification(input)} />}
      {confirmingEvent && <AppointmentConfirmationModal event={confirmingEvent} saving={confirmationSaving} error={confirmationError} onClose={() => !confirmationSaving && setConfirmingEvent(null)} onSave={(input) => void handleConfirmation(input)} onSend={(input) => void handleConfirmationSend(input)} />}
    </div>
  );
}
