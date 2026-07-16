'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { normalizeGoogleEvent, normalizeKadriaAppointment, type NormalizedCalendarEvent, type RawGoogleEvent, type RawKadriaAppointment } from '@/src/lib/calendar/normalized-event';
import { isEventType } from '@/src/lib/calendar/event-types';
import type { AppointmentQualificationOutcome, AppointmentQualificationStatus } from '@/src/lib/appointment-qualification';
import type { AppointmentConfirmationSource, AppointmentConfirmationStatus } from '@/src/lib/appointment-confirmation';
import { createAppointmentMutationRequestId, type AppointmentMutationResponse } from '@/src/lib/appointments/mutation-contract';
import AppointmentCreateModal, { type AppointmentCreateForm, type AppointmentProjectOption } from './AppointmentCreateModal';
import AppointmentQualificationModal from './AppointmentQualificationModal';
import AppointmentConfirmationModal from './AppointmentConfirmationModal';
import AppointmentDetailsModal from './AppointmentDetailsModal';
import CalendarBriefing from './CalendarBriefing';
import CalendarSummary from './CalendarSummary';
import AgendaAttentionPanel from './AgendaAttentionPanel';
import NextAppointmentPanel from './NextAppointmentPanel';
import ScheduleTimeline from './ScheduleTimeline';
import TeamScheduleTimeline from './TeamScheduleTimeline';
import type { CalendarView, PlanningInsights, TeamPlanningMember, TeamPlanningPermissions } from './calendar-workspace-types';
import { addDays, durationMinutes, eventDate, isSameDay, startOfDay, startOfWeekMonday } from './calendar-workspace-utils';

type CalendarMode = 'kadria' | 'google';
type PlanningMode = 'personal' | 'team';
const DAY_MINUTES = 8 * 60;
const MINIMUM_APPOINTMENT_DURATION_MS = 15 * 60_000;

function formatInputDate(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function appointmentMutationFeedback(response: AppointmentMutationResponse, fallback: string) {
  if (!response.reconfirmationRequired || response.idempotent) return fallback;
  if (response.emailSent) return 'Rendez-vous modifié. Une nouvelle demande de confirmation a été envoyée au client.';
  return response.warning || 'Rendez-vous modifié. Une nouvelle confirmation est requise, mais l’email n’a pas pu être envoyé.';
}

export default function CalendarWorkspace() {
  const router = useRouter();
  const [mode, setMode] = useState<CalendarMode>('kadria');
  const [planningMode, setPlanningMode] = useState<PlanningMode>('personal');
  const [view, setView] = useState<CalendarView>('semaine');
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [appointments, setAppointments] = useState<RawKadriaAppointment[]>([]);
  const [googleEvents, setGoogleEvents] = useState<RawGoogleEvent[]>([]);
  const [insights, setInsights] = useState<PlanningInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<NormalizedCalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
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
  const [locationTouched, setLocationTouched] = useState(false);
  const [form, setForm] = useState<AppointmentCreateForm>({ title: '', start: '', end: '', location: '', description: '', projectId: null, assignedUserId: '', eventType: 'appointment' });
  const [currentTime] = useState(() => Date.now());
  const [confirmationFilter, setConfirmationFilter] = useState('all');
  const [collaboratorFilter, setCollaboratorFilter] = useState('all');
  const [filterDraft, setFilterDraft] = useState({ confirmation: 'all', collaborator: 'all' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const savingAppointmentIdsRef = useRef(savingAppointmentIds);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    savingAppointmentIdsRef.current = savingAppointmentIds;
  }, [savingAppointmentIds]);

  useEffect(() => {
    if (!filtersOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) setFiltersOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [filtersOpen]);

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
  const events = useMemo(() => allEvents.filter((event) => {
    if (confirmationFilter !== 'all' && event.confirmation?.status !== confirmationFilter) return false;
    if (collaboratorFilter === 'unassigned') return event.source !== 'kadria-appointment' || !event.assignedUserId;
    if (collaboratorFilter === 'me') return event.isAssignedToCurrentUser;
    return collaboratorFilter === 'all' || event.assignedUserId === collaboratorFilter;
  }), [allEvents, collaboratorFilter, confirmationFilter]);
  const todayEvents = useMemo(() => events.filter((event) => {
    const date = eventDate(event);
    return date ? isSameDay(date, new Date()) : false;
  }), [events]);
  const plannedMinutes = useMemo(() => todayEvents.reduce((total, event) => total + durationMinutes(event), 0), [todayEvents]);
  const unassignedCount = useMemo(() => events.filter((event) => event.source === 'kadria-appointment' && !event.assignedUserId).length, [events]);
  const availableMinutes = Math.max(0, DAY_MINUTES - plannedMinutes);
  const nextAppointment = useMemo(() => events.filter((event) => {
    const date = eventDate(event);
    return date && date.getTime() >= currentTime;
  }).sort((left, right) => (eventDate(left)?.getTime() || 0) - (eventDate(right)?.getTime() || 0))[0] || null, [currentTime, events]);
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
  const showUnassigned = () => {
    setCollaboratorFilter('unassigned');
    setFilterDraft((current) => ({ ...current, collaborator: 'unassigned' }));
  };
  const openProject = (event: NormalizedCalendarEvent) => {
    if (event.projectId) router.push('/dashboard-v2/projet/' + event.projectId);
  };
  const openCreate = (assignedUserId?: string) => {
    const now = new Date();
    setForm({ title: '', start: formatInputDate(now), end: formatInputDate(new Date(now.getTime() + 60 * 60_000)), location: '', description: '', projectId: null, assignedUserId: assignedUserId || currentUserId || '', eventType: 'appointment' });
    setSelectedProject(null);
    setLocationTouched(false);
    setCreateError(null);
    setSuccessMessage(null);
    setCreateOpen(true);
  };
  const openEvent = (event: NormalizedCalendarEvent, edit = false) => {
    if (!event.rawAppointmentId) {
      setSelectedEvent(event);
      return;
    }
    const appointment = appointments.find((item) => item.id === event.rawAppointmentId);
    if (!appointment) return;
    if (qualificationAvailable && event.end && new Date(event.end).getTime() <= Date.now()) {
      setQualificationError(null);
      setQualifyingEvent(event);
      return;
    }
    if (!edit && event.end && new Date(event.end).getTime() > Date.now()) { setSelectedEvent(event); return; }
    setForm({
      title: appointment.title || '',
      start: appointment.start ? formatInputDate(new Date(appointment.start)) : '',
      end: appointment.end ? formatInputDate(new Date(appointment.end)) : '',
      location: appointment.location || '',
      description: appointment.description || '',
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
    setLocationTouched(false);
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
        body: JSON.stringify({ title: form.title.trim(), start: new Date(form.start).toISOString(), end: new Date(form.end).toISOString(), location: form.location || undefined, description: form.description || undefined, projectId: form.projectId, assignedUserId: form.assignedUserId || undefined, eventType: form.eventType }),
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
  const handleUpdate = async () => {
    if (!editingAppointmentId || !form.title.trim() || !form.start || !form.end || !endIsValid) {
      setCreateError('V\u00e9rifiez le motif, le d\u00e9but et la fin du rendez-vous.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    const requestId = createAppointmentMutationRequestId();
    try {
      const response = await fetch('/api/appointments/' + editingAppointmentId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title.trim(), start: new Date(form.start).toISOString(), end: new Date(form.end).toISOString(), location: form.location || null, description: form.description || null, projectId: form.projectId, assignedUserId: form.assignedUserId || undefined, eventType: form.eventType, requestId }),
      });
      const json = await response.json() as AppointmentMutationResponse;
      if (!response.ok || !json?.success) throw new Error(json?.error || "La modification n'a pas pu etre enregistree.");
      setEditingAppointmentId(null);
      await fetchAppointments();
      setSuccessMessage(appointmentMutationFeedback(json, 'Rendez-vous modifié.'));
    } catch (updateError) {
      setCreateError(updateError instanceof Error ? updateError.message : "La modification n'a pas pu etre enregistree.");
    } finally {
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
  const handleMoveEvent = async (event: NormalizedCalendarEvent, nextStart: Date, forceConflict = false, resizedEnd?: Date, requestId = createAppointmentMutationRequestId()) => {
    if (!event.rawAppointmentId || !event.start || !event.end || event.status === 'cancelled') return;
    if (savingAppointmentIds.has(event.rawAppointmentId) && !forceConflict) return;
    const previousStart = event.start;
    const previousEnd = event.end;
    const duration = new Date(previousEnd).getTime() - new Date(previousStart).getTime();
    if (!Number.isFinite(duration) || duration < MINIMUM_APPOINTMENT_DURATION_MS) return;
    const nextEnd = resizedEnd ? resizedEnd.toISOString() : new Date(nextStart.getTime() + duration).toISOString();
    if (new Date(nextEnd).getTime() - nextStart.getTime() < MINIMUM_APPOINTMENT_DURATION_MS) return;
    const nextStartIso = nextStart.toISOString();
    const localConflict = events.find((candidate) => candidate.rawAppointmentId !== event.rawAppointmentId && candidate.assignedUserId === event.assignedUserId && candidate.status !== 'cancelled' && candidate.start && candidate.end && nextStartIso < candidate.end && nextEnd > candidate.start);
    if (localConflict && !forceConflict && !window.confirm(`Ce collaborateur possède déjà un rendez-vous sur cette plage horaire${localConflict.title ? ` : ${localConflict.title}` : ''}.\n\nConserver quand même ?`)) return;
    setSavingAppointmentIds((current) => new Set(current).add(event.rawAppointmentId!));
    setAppointments((current) => current.map((item) => item.id === event.rawAppointmentId ? { ...item, start: nextStartIso, end: nextEnd } : item));
    try {
      const response = await fetch('/api/appointments/' + event.rawAppointmentId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start: nextStartIso, end: nextEnd, move: !resizedEnd, resize: Boolean(resizedEnd), forceConflict: Boolean(localConflict || forceConflict), requestId }) });
      const json = await response.json() as AppointmentMutationResponse & { code?: string; error?: string };
      if (response.status === 409 && json?.code === 'APPOINTMENT_CONFLICT' && !forceConflict) {
        setAppointments((current) => current.map((item) => item.id === event.rawAppointmentId ? { ...item, start: previousStart, end: previousEnd } : item));
        if (window.confirm(`${json.error}\n\nConserver quand même ?`)) await handleMoveEvent({ ...event, start: previousStart, end: previousEnd }, nextStart, true, resizedEnd, requestId);
        return;
      }
      if (!response.ok || !json?.success) throw new Error(json?.error || 'Le rendez-vous n’a pas pu être déplacé.');
      setSuccessMessage(appointmentMutationFeedback(json, resizedEnd
        ? `Durée du rendez-vous modifiée jusqu’à ${resizedEnd.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`
        : `Rendez-vous déplacé à ${nextStart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`));
    } catch {
      setAppointments((current) => current.map((item) => item.id === event.rawAppointmentId ? { ...item, start: previousStart, end: previousEnd } : item));
      setError(resizedEnd
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
  const handleResizeEvent = (event: NormalizedCalendarEvent, nextEnd: Date) => {
    if (!event.start) return;
    void handleMoveEvent(event, new Date(event.start), false, nextEnd);
  };
  const handleTeamMoveEvent = async (event: NormalizedCalendarEvent, nextStart: Date, nextAssignedUserId: string, forceConflict = false, requestId = createAppointmentMutationRequestId()) => {
    if (!event.rawAppointmentId || !event.start || !event.end || event.status === 'cancelled') return;
    if (savingAppointmentIds.has(event.rawAppointmentId) && !forceConflict) return;
    const previousStart = event.start;
    const previousEnd = event.end;
    const previousAssignedUserId = event.assignedUserId;
    const duration = new Date(previousEnd).getTime() - new Date(previousStart).getTime();
    if (!Number.isFinite(duration) || duration < MINIMUM_APPOINTMENT_DURATION_MS) return;
    const nextStartIso = nextStart.toISOString();
    const nextEnd = new Date(nextStart.getTime() + duration).toISOString();
    const localConflict = events.find((candidate) => candidate.rawAppointmentId !== event.rawAppointmentId && candidate.assignedUserId === nextAssignedUserId && candidate.status !== 'cancelled' && candidate.start && candidate.end && nextStartIso < candidate.end && nextEnd > candidate.start);
    if (localConflict && !forceConflict && !window.confirm(`Ce collaborateur possède déjà un rendez-vous sur cette plage horaire${localConflict.title ? ` : ${localConflict.title}` : ''}.\n\nConserver quand même ?`)) return;
    const assigneeName = teamMembers.find((member) => member.userId === nextAssignedUserId)?.name || event.assignedUserName;
    setSavingAppointmentIds((current) => new Set(current).add(event.rawAppointmentId!));
    setAppointments((current) => current.map((item) => item.id === event.rawAppointmentId ? { ...item, start: nextStartIso, end: nextEnd, assignedUserId: nextAssignedUserId, assignedUserName: assigneeName, isUnassigned: false } : item));
    try {
      const response = await fetch('/api/appointments/' + event.rawAppointmentId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: nextStartIso, end: nextEnd, move: true, forceConflict: Boolean(localConflict || forceConflict), requestId, ...(nextAssignedUserId !== previousAssignedUserId ? { assignedUserId: nextAssignedUserId } : {}) }),
      });
      const json = await response.json() as AppointmentMutationResponse & { code?: string; error?: string };
      if (response.status === 409 && json?.code === 'APPOINTMENT_CONFLICT' && !forceConflict) {
        setAppointments((current) => current.map((item) => item.id === event.rawAppointmentId ? { ...item, start: previousStart, end: previousEnd, assignedUserId: previousAssignedUserId, assignedUserName: event.assignedUserName, isUnassigned: event.isUnassigned } : item));
        if (window.confirm(`${json.error}\n\nConserver quand même ?`)) await handleTeamMoveEvent({ ...event, start: previousStart, end: previousEnd }, nextStart, nextAssignedUserId, true, requestId);
        return;
      }
      if (!response.ok || !json?.success) throw new Error(json?.error || 'Le rendez-vous n’a pas pu être déplacé.');
      const time = nextStart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setSuccessMessage(appointmentMutationFeedback(json, nextAssignedUserId !== previousAssignedUserId ? `Rendez-vous réaffecté à ${assigneeName || 'ce collaborateur'} et déplacé à ${time}.` : `Rendez-vous déplacé à ${time}.`));
    } catch {
      setAppointments((current) => current.map((item) => item.id === event.rawAppointmentId ? { ...item, start: previousStart, end: previousEnd, assignedUserId: previousAssignedUserId, assignedUserName: event.assignedUserName, isUnassigned: event.isUnassigned } : item));
      setError('Le rendez-vous n’a pas pu être déplacé. Son horaire précédent a été restauré.');
    } finally {
      setSavingAppointmentIds((current) => {
        const next = new Set(current);
        next.delete(event.rawAppointmentId!);
        return next;
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 pb-6">
      <CalendarBriefing appointmentCount={todayEvents.length} conflictCount={insights?.summary.conflicts || 0} availableMinutes={availableMinutes} view={view} onToggleView={() => setView((current) => current === 'jour' ? 'semaine' : 'jour')} onCreate={openCreate} />
       <CalendarSummary appointmentCount={todayEvents.length} plannedMinutes={plannedMinutes} conflictCount={insights?.summary.conflicts || 0} unassignedCount={unassignedCount} onShowUnassigned={showUnassigned} />
      {error && <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {successMessage && <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>}
       <div ref={filtersRef} className="relative z-20 mb-3 flex items-center gap-2">
         <button type="button" onClick={openFilters} aria-label="Ouvrir les filtres Agenda" aria-expanded={filtersOpen} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"><SlidersHorizontal className="size-4 text-slate-600" />Filtres{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}</button>
         {activeFilterCount > 0 && <button type="button" onClick={resetFilters} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2">Réinitialiser</button>}
         {filtersOpen && <div role="dialog" aria-label="Filtres Agenda" className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.18)]"><p className="text-sm font-bold text-slate-950">Filtres</p><label className="mt-4 block text-xs font-semibold text-slate-700">Statut<select value={filterDraft.confirmation} onChange={(event) => setFilterDraft((current) => ({ ...current, confirmation: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-colors hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="all">Tous les statuts</option><option value="pending">À confirmer</option><option value="confirmed">Confirmé</option><option value="change_requested">Changement demandé</option><option value="cancelled">Annulé / refusé</option></select></label><label className="mt-4 block text-xs font-semibold text-slate-700">Collaborateur<select value={filterDraft.collaborator} onChange={(event) => setFilterDraft((current) => ({ ...current, collaborator: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-colors hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="all">Tous les collaborateurs</option><option value="me">Moi</option><option value="unassigned">Non affectés</option>{teamMembers.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select></label><div className="mt-5 flex items-center justify-between gap-3"><button type="button" onClick={resetFilters} className="text-sm font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2">Réinitialiser</button><button type="button" onClick={applyFilters} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2">Appliquer</button></div></div>}
       </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          {teamPlanningAvailable ? <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><button type="button" onClick={() => setPlanningMode('personal')} className={['rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', planningMode === 'personal' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'].join(' ')}>Mon planning</button><button type="button" onClick={() => setPlanningMode('team')} className={['rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', planningMode === 'team' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'].join(' ')}>Planning d’équipe</button></div> : null}
           {planningMode === 'team' && teamPlanningAvailable ? <TeamScheduleTimeline view={view} selectedDate={selectedDate} events={events.filter((event) => event.source === 'kadria-appointment')} members={teamMembers} selectedMemberIds={selectedTeamMemberIds} onToggleMember={(memberId) => setSelectedTeamMemberIds((current) => current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId])} onPrevious={() => updatePeriod(-1)} onNext={() => updatePeriod(1)} onToday={() => setSelectedDate(startOfDay(new Date()))} onDaySelect={setSelectedDate} onViewChange={setView} onOpenEvent={openEvent} onCreate={openCreate} onMoveEvent={(event, start, assignedUserId) => void handleTeamMoveEvent(event, start, assignedUserId)} workStartTime={workHours.start} workEndTime={workHours.end} savingEventIds={savingAppointmentIds} /> : <ScheduleTimeline view={view} selectedDate={selectedDate} events={events} onPrevious={() => updatePeriod(-1)} onNext={() => updatePeriod(1)} onToday={() => setSelectedDate(startOfDay(new Date()))} onViewChange={setView} onOpenEvent={openEvent} onCreate={openCreate} qualificationAvailable={qualificationAvailable} workStartTime={workHours.start} workEndTime={workHours.end} savingEventIds={savingAppointmentIds} onMoveEvent={(event, start) => void handleMoveEvent(event, start)} onResizeEvent={handleResizeEvent} />}
        </div>
        <aside className="space-y-3">
           <AgendaAttentionPanel events={events} conflicts={insights?.summary.conflicts || 0} onOpen={(event) => { setSelectedEvent(event); }} />
           <NextAppointmentPanel event={nextAppointment} onOpenProject={openProject} />
        </aside>
      </div>
      {loading && <p className="text-sm text-slate-500">Chargement du planning...</p>}
      {selectedEvent?.rawAppointmentId ? <AppointmentDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onPrepare={() => { setSelectedEvent(null); setConfirmationError(null); setConfirmingEvent(selectedEvent); }} onManual={() => { setSelectedEvent(null); setConfirmationError(null); setConfirmingEvent(selectedEvent); }} onReplan={() => { const event = selectedEvent; setSelectedEvent(null); openEvent(event, true); }} onEdit={() => { const event = selectedEvent; setSelectedEvent(null); openEvent(event, true); }} onOpenProject={() => openProject(selectedEvent)} /> : selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-950">{selectedEvent.title}</p><p className="mt-1 text-sm text-slate-500">{selectedEvent.clientName || selectedEvent.projectTitle || 'Rendez-vous'}</p></div><button type="button" onClick={() => setSelectedEvent(null)} aria-label="Fermer le rendez-vous" className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="size-4" /></button></div>
            {(selectedEvent.address || selectedEvent.location) && <p className="mt-4 text-sm text-slate-600">{selectedEvent.address || selectedEvent.location}</p>}
            {selectedEvent.actionUrl && <button type="button" onClick={() => openProject(selectedEvent)} className="mt-5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400">Voir le dossier</button>}
          </div>
        </div>
      )}
      {createOpen && <AppointmentCreateModal form={form} selectedProject={selectedProject} creating={creating} error={createError} endIsValid={endIsValid} onClose={() => !creating && setCreateOpen(false)} onSubmit={() => void handleCreate()} onFieldChange={updateFormField} onProjectChange={updateProject} />}
      {editingAppointmentId && <AppointmentCreateModal form={form} selectedProject={selectedProject} creating={creating} deleting={deleting} error={createError} endIsValid={endIsValid} mode="edit" onClose={() => !creating && !deleting && setEditingAppointmentId(null)} onSubmit={() => void handleUpdate()} onDelete={() => void handleDelete()} onFieldChange={updateFormField} onProjectChange={updateProject} />}
      {qualifyingEvent && <AppointmentQualificationModal event={qualifyingEvent} saving={qualificationSaving} error={qualificationError} onClose={() => !qualificationSaving && setQualifyingEvent(null)} onSave={(input) => void handleQualification(input)} />}
      {confirmingEvent && <AppointmentConfirmationModal event={confirmingEvent} saving={confirmationSaving} error={confirmationError} onClose={() => !confirmationSaving && setConfirmingEvent(null)} onSave={(input) => void handleConfirmation(input)} onSend={(input) => void handleConfirmationSend(input)} />}
    </div>
  );
}
