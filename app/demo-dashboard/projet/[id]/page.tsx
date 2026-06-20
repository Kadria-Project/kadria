'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, FileText, Save } from 'lucide-react';
import { useDemoMode } from '@/src/contexts/DemoModeContext';

const STATUS_OPTIONS = ['Nouveau', 'A rappeler', 'Qualifie', 'Devis envoye', 'Gagne', 'Perdu'];
const EVENT_TYPES = ['Relance', 'Rappel', 'RDV', 'Intervention'] as const;

export default function DemoProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { projects, events, updateProjectStatus, updateProjectNote, updateProjectCallback, createEvent } = useDemoMode();
  const project = projects.find((item) => item.id === params.id);
  const [eventType, setEventType] = useState<(typeof EVENT_TYPES)[number]>('Relance');
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState(project?.notes ?? '');

  const projectEvents = useMemo(
    () =>
      events
        .filter((event) => event.projectId === project?.id)
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()),
    [events, project?.id],
  );

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
        <button onClick={() => router.push('/demo-dashboard')} className="mb-6 text-sm text-zinc-400">
          Retour au dashboard
        </button>
        <p>Dossier de demonstration introuvable.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push('/demo-dashboard')}
            className="inline-flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au dashboard
          </button>

          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200">
              <FileText className="mr-2 inline h-4 w-4" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => router.push('/demo-dashboard/onboarding')}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200"
            >
              Mon profil
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-green-500">{project.projectNumber}</p>
              <h1 className="text-2xl font-bold text-white">{project.clientFirstName} {project.clientName}</h1>
              <p className="mt-1 text-sm text-zinc-400">{project.projectType} · {project.city}</p>
            </div>
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-300">
              Score {project.completenessScore}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Telephone" value={project.clientPhone} />
            <InfoCard label="Email" value={project.clientEmail} />
            <InfoCard label="Budget estime" value={project.budget} />
            <InfoCard label="Delai souhaite" value={project.desiredTimeline} />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="mb-4 font-semibold text-white">Suivi commercial</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-500">Etape du dossier</p>
                <select
                  value={project.status}
                  onChange={(event) => updateProjectStatus(project.id, event.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-500">Moment ideal de relance</p>
                <input
                  type="datetime-local"
                  value={project.callbackDate ? project.callbackDate.slice(0, 16) : ''}
                  onChange={(event) => updateProjectCallback(project.id, event.target.value ? `${event.target.value}:00.000Z` : null)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.14em] text-zinc-500">Analyse Kadria</p>
              <p className="text-sm leading-7 text-zinc-200">{project.aiSummary}</p>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Notes internes</p>
                <button
                  type="button"
                  onClick={() => updateProjectNote(project.id, notes)}
                  className="rounded-lg bg-green-500 px-3 py-2 text-xs font-semibold text-zinc-950"
                >
                  <Save className="mr-2 inline h-3.5 w-3.5" />
                  Enregistrer
                </button>
              </div>
              <textarea
                rows={6}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-white outline-none focus:border-green-500"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="mb-4 font-semibold text-white">Calendrier et actions</p>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-500">Ajouter un evenement</p>
              <div className="space-y-3">
                <select
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value as (typeof EVENT_TYPES)[number])}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!eventDate) return;
                    createEvent({
                      title: `${eventType} - ${project.clientFirstName} ${project.clientName}`,
                      date: `${eventDate}:00.000Z`,
                      type: eventType,
                      projectId: project.id,
                      status: 'Prevu',
                      notes: '',
                    });
                    setEventDate('');
                  }}
                  className="w-full rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm font-semibold text-green-300"
                >
                  <CalendarDays className="mr-2 inline h-4 w-4" />
                  Ajouter au calendrier demo
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.14em] text-zinc-500">Historique des evenements</p>
              <div className="space-y-3">
                {projectEvents.length > 0 ? (
                  projectEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3">
                      <p className="text-sm font-semibold text-white">{event.title}</p>
                      <p className="mt-1 text-xs text-zinc-400">{new Date(event.date).toLocaleString('fr-FR')}</p>
                      <p className="mt-2 text-xs text-zinc-500">{event.status}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">Aucun evenement sur ce dossier pour le moment.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="mb-1 text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
