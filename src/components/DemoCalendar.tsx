'use client';

import { useMemo, useState } from 'react';
import type { DemoEvent } from '@/src/lib/demo-data';

interface DemoCalendarProps {
  events: DemoEvent[];
  onCreateEvent: (event: Omit<DemoEvent, 'id'>) => void;
  onUpdateEvent: (id: string, fields: Partial<DemoEvent>) => void;
  onDeleteEvent: (id: string) => void;
}

const EVENT_STYLES: Record<DemoEvent['type'], string> = {
  RDV: 'border-green-500/30 bg-green-500/10 text-green-300',
  Relance: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Rappel: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  Intervention: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
};

export default function DemoCalendar({ events, onCreateEvent, onUpdateEvent, onDeleteEvent }: DemoCalendarProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '09:00',
    type: 'RDV' as DemoEvent['type'],
    notes: '',
    projectId: '',
  });

  const orderedEvents = useMemo(
    () => [...events].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()),
    [events],
  );

  const selectedEvent = orderedEvents.find((event) => event.id === selectedEventId) ?? null;

  const resetForm = () => {
    setSelectedEventId(null);
    setForm({ title: '', date: '', time: '09:00', type: 'RDV', notes: '', projectId: '' });
  };

  const editEvent = (event: DemoEvent) => {
    const [datePart, timePart] = event.date.split('T');
    setSelectedEventId(event.id);
    setForm({
      title: event.title,
      date: datePart ?? '',
      time: timePart?.slice(0, 5) ?? '09:00',
      type: event.type,
      notes: event.notes,
      projectId: event.projectId,
    });
  };

  const submit = () => {
    if (!form.title.trim() || !form.date) return;

    const payload = {
      title: form.title.trim(),
      date: `${form.date}T${form.time}:00.000Z`,
      type: form.type,
      notes: form.notes.trim(),
      projectId: form.projectId.trim(),
      status: 'Prevu',
    } satisfies Omit<DemoEvent, 'id'>;

    if (selectedEvent) {
      onUpdateEvent(selectedEvent.id, payload);
    } else {
      onCreateEvent(payload);
    }

    resetForm();
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-white">Calendrier Kadria</p>
            <p className="text-sm text-zinc-400">Ajoutez, modifiez ou supprimez des evenements de demonstration.</p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-green-500/30 hover:text-white"
          >
            Nouvel evenement
          </button>
        </div>

        <div className="space-y-3">
          {orderedEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => editEvent(event)}
              className="flex w-full items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-left transition-colors hover:border-green-500/20 hover:bg-zinc-900"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${EVENT_STYLES[event.type]}`}>
                    {event.type}
                  </span>
                  <span className="truncate text-sm font-semibold text-white">{event.title}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">{new Date(event.date).toLocaleString('fr-FR')}</p>
                {event.notes ? <p className="mt-2 text-xs text-zinc-500">{event.notes}</p> : null}
              </div>
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300">{event.status}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="mb-4 font-semibold text-white">{selectedEvent ? 'Modifier un evenement' : 'Creer un evenement'}</p>
        <div className="space-y-3">
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Titre"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500"
            />
            <input
              type="time"
              value={form.time}
              onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500"
            />
          </div>
          <select
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as DemoEvent['type'] }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500"
          >
            <option value="RDV">RDV</option>
            <option value="Relance">Relance</option>
            <option value="Rappel">Rappel</option>
            <option value="Intervention">Intervention</option>
          </select>
          <input
            value={form.projectId}
            onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}
            placeholder="ID dossier lie"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500"
          />
          <textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Notes"
            rows={4}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={submit}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-green-400"
            >
              {selectedEvent ? 'Mettre a jour' : 'Creer'}
            </button>
            {selectedEvent ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteEvent(selectedEvent.id);
                  resetForm();
                }}
                className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10"
              >
                Supprimer
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
