'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject, updateProject, getProjectActivity } from '@/src/lib/api';
import AuthGuard from '@/src/components/AuthGuard';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { StatusBadge, ScorePill } from '@/src/components/ArtisanDashboard';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  FileText,
  ClipboardList,
  Euro,
  Clock,
  Target,
  CheckCircle2,
  CircleDot,
} from 'lucide-react';

const PIPELINE_STATUSES = ['À rappeler', 'Qualifié', 'Devis envoyé', 'Gagné', 'Perdu'];

export default function ProjectDetailPage() {
  return (
    <AuthGuard>
      <ProjectDetail />
    </AuthGuard>
  );
}

function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState('');

  async function loadActivities() {
    const activityData = await getProjectActivity(id);

    if (activityData.success) {
      setActivities(activityData.activities);
    }
  }

  useEffect(() => {
    async function loadProject() {
      try {
        const data = await getProject(id);

        setProject(data.project);
        setNotes(data.project?.internalNotes || '');
        setCallbackDate(data.project?.callbackDate || '');

        await loadActivities();
      } catch (error) {
        console.error('PROJECT_DETAIL_ERROR', error);
      } finally {
        setLoading(false);
      }
    }

    if (id) loadProject();
  }, [id]);

  async function updateStatus(status: string) {
    try {
      setUpdating(true);

      const data = await updateProject(id, { status, contacted: true });

      if (data.success) {
        setProject(data.project);
        await loadActivities();
      }
    } catch (error) {
      console.error('UPDATE_STATUS_ERROR', error);
    } finally {
      setUpdating(false);
    }
  }

  async function saveNotes() {
    try {
      setUpdating(true);

      const data = await updateProject(id, { internalNotes: notes });

      if (data.success) {
        setProject(data.project);
        await loadActivities();
      }
    } catch (error) {
      console.error('SAVE_NOTES_ERROR', error);
    } finally {
      setUpdating(false);
    }
  }

  async function saveCallbackDate() {
    try {
      setUpdating(true);

      const data = await updateProject(id, { callbackDate: callbackDate || null });

      if (data.success) {
        setProject(data.project);
        await loadActivities();
      }
    } catch (error) {
      console.error('SAVE_CALLBACK_DATE_ERROR', error);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">Chargement du dossier...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">Dossier introuvable.</p>
      </div>
    );
  }

  const tradeAnswers = parseTradeAnswers(project.tradeAnswers);
  const score = Number(project.completenessScore ?? 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <Button variant="ghost" onClick={() => router.push('/dashboard-v2')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {project.clientFirstName} {project.clientName}
                </h1>

                <p className="text-zinc-400">
                  {project.trade || project.projectType || 'Projet'} · {project.city || 'Ville non renseignée'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ScorePill score={score} />
                <Badge variant="secondary" className="text-[10px]">
                  {project.budget || 'Budget non renseigné'}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {project.desiredTimeline || 'Délai non renseigné'}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {project.maturity || 'Maturité non renseignée'}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 min-w-44 text-center">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Statut dossier</p>
              <p className="mt-1">
                <StatusBadge status={project.status} />
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Actions commerciales</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <a
              href={`tel:${project.clientPhone}`}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Phone className="w-4 h-4 mr-2" />
              Appeler
            </a>

            <a
              href={`mailto:${project.clientEmail}`}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </a>

            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Rendez-vous
            </Button>

            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Note interne
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Pipeline commercial</h2>

          <div className="flex flex-wrap gap-2">
            {PIPELINE_STATUSES.map((status) => (
              <Button
                key={status}
                disabled={updating}
                onClick={() => updateStatus(status)}
                variant="outline"
                className={
                  project.status === status
                    ? 'bg-green-500 text-black border-green-500 hover:bg-green-500 hover:text-black'
                    : ''
                }
              >
                {status}
              </Button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Analyse Kadria</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <AnalysisItem label="Projet identifié" checked={Boolean(project.projectType)} />
            <AnalysisItem label="Budget collecté" checked={Boolean(project.budget)} />
            <AnalysisItem label="Délai connu" checked={Boolean(project.desiredTimeline)} />
            <AnalysisItem
              label="Contact exploitable"
              checked={Boolean(project.clientPhone || project.clientEmail)}
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">
              Synthèse
            </p>

            <p className="text-sm leading-6 whitespace-pre-wrap text-zinc-200">
              {project.aiSummary || 'Aucun résumé disponible.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <InfoIcon icon={ClipboardList} label="Type" value={project.projectType} />
            <InfoIcon icon={Euro} label="Budget" value={project.budget} />
            <InfoIcon icon={Clock} label="Délai" value={project.desiredTimeline} />
            <InfoIcon icon={Target} label="Maturité" value={project.maturity} />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Questions métier</h2>

          {tradeAnswers.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Aucune question/réponse disponible.
            </p>
          ) : (
            <div className="space-y-3">
              {tradeAnswers.map((item, index) => (
                <div
                  key={`${item.question}-${index}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <p className="text-xs text-zinc-400 uppercase tracking-wide">
                    Question
                  </p>

                  <p className="font-medium mt-1 text-white">{item.question}</p>

                  <p className="text-xs text-zinc-400 uppercase tracking-wide mt-4">
                    Réponse prospect
                  </p>

                  <p className="mt-1 text-zinc-200">{item.answer}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Relance programmée</h2>

          <p className="text-sm text-zinc-400">
            Planifier une date de rappel pour ne pas laisser refroidir le prospect.
          </p>

          <input
            type="datetime-local"
            value={callbackDate ? callbackDate.slice(0, 16) : ''}
            onChange={(e) => setCallbackDate(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
          />

          <Button disabled={updating} onClick={saveCallbackDate}>
            Enregistrer le rappel
          </Button>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Notes internes</h2>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[180px] rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Ajouter une note interne pour le suivi commercial..."
          />

          <Button disabled={updating} onClick={saveNotes}>
            Enregistrer la note
          </Button>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Historique du dossier</h2>

          {activities.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Aucun historique disponible.
            </p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <CircleDot className="w-4 h-4 mt-1 text-green-500" />

                  <div>
                    <p className="font-medium text-white">{activity.description}</p>

                    <p className="text-xs text-zinc-400">
                      {activity.createdAt
                        ? new Date(activity.createdAt).toLocaleString('fr-FR')
                        : 'Date inconnue'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Info label="Téléphone" value={project.clientPhone} />
          <Info label="Email" value={project.clientEmail} />
          <Info label="Adresse" value={project.siteAddress} />
          <Info label="Ville" value={project.city} />
          <Info label="Code postal" value={String(project.postalCode || '')} />
          <Info label="Source" value={project.source} />
          <Info label="Assigné à" value={project.assignedTo} />
          <Info label="ID dossier" value={project.id} />
        </section>
      </main>
    </div>
  );
}

function AnalysisItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex items-center gap-3">
      <CheckCircle2
        className={`w-5 h-5 ${checked ? 'text-green-500' : 'text-zinc-500'}`}
      />
      <p className="text-sm font-medium text-white">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="font-medium text-white">{value || '—'}</p>
    </div>
  );
}

function InfoIcon({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <Icon className="w-4 h-4 text-zinc-400 mb-2" />
      <p className="text-xs text-zinc-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="font-semibold mt-1 text-white">{value || '—'}</p>
    </div>
  );
}

function parseTradeAnswers(value?: string) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        typeof item?.question === 'string' &&
        typeof item?.answer === 'string',
    );
  } catch {
    return [];
  }
}
