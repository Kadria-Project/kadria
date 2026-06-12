'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  ClipboardList,
  Euro,
  Clock,
  Target,
  FileText,
  CheckCircle2,
  Sparkles,
  CircleDot,
} from 'lucide-react';

export default function ProjectDetailPage() {
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
    const activityRes = await fetch(`/api/projects/${id}/activity`);
    const activityData = await activityRes.json();

    if (activityData.success) {
      setActivities(activityData.activities);
    }
  }

  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        const data = await res.json();

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

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          contacted: true,
        }),
      });

      const data = await res.json();

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

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internalNotes: notes,
        }),
      });

      const data = await res.json();

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

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callbackDate: callbackDate || null,
        }),
      });

      const data = await res.json();

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
    return <div className="p-8">Chargement du dossier...</div>;
  }

  if (!project) {
    return <div className="p-8">Dossier introuvable.</div>;
  }

  const tradeAnswers = parseTradeAnswers(project.tradeAnswers);
  const score = Number(project.completenessScore ?? 0);

  return (
    <main className="container mx-auto max-w-5xl px-6 py-8 space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour
      </Button>

      <section className="rounded-2xl border border-border p-6 bg-card">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-bold">
                {project.clientFirstName} {project.clientName}
              </h1>

              <p className="text-muted-foreground">
                {project.trade} · {project.city}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Score {score}%</Badge>
              <Badge variant="secondary">
                {project.budget || 'Budget non renseigné'}
              </Badge>
              <Badge variant="secondary">
                {project.desiredTimeline || 'Délai non renseigné'}
              </Badge>
              <Badge variant="secondary">
                {project.maturity || 'Maturité non renseignée'}
              </Badge>
            </div>
          </div>

          <StatusBadgeLarge status={project.status} />
        </div>
      </section>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Actions commerciales</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <a
            href={`tel:${project.clientPhone}`}
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Phone className="w-4 h-4 mr-2" />
            Appeler
          </a>

          <a
            href={`mailto:${project.clientEmail}`}
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
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
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Pipeline commercial</h2>

        <div className="flex flex-wrap gap-2">
          {['À rappeler', 'Qualifié', 'Devis envoyé', 'Gagné'].map((status) => (
            <Button
              key={status}
              disabled={updating}
              onClick={() => updateStatus(status)}
              variant={project.status === status ? 'default' : 'outline'}
            >
              {status}
            </Button>
          ))}

          <Button
            disabled={updating}
            variant="destructive"
            onClick={() => updateStatus('Perdu')}
          >
            Perdu
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Analyse Kadria</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <AnalysisItem label="Projet identifié" checked={Boolean(project.projectType)} />
          <AnalysisItem label="Budget collecté" checked={Boolean(project.budget)} />
          <AnalysisItem label="Délai connu" checked={Boolean(project.desiredTimeline)} />
          <AnalysisItem
            label="Contact exploitable"
            checked={Boolean(project.clientPhone || project.clientEmail)}
          />
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Synthèse
          </p>

          <p className="text-sm leading-6 whitespace-pre-wrap">
            {project.aiSummary || 'Aucun résumé disponible.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <InfoIcon icon={ClipboardList} label="Type" value={project.projectType} />
          <InfoIcon icon={Euro} label="Budget" value={project.budget} />
          <InfoIcon icon={Clock} label="Délai" value={project.desiredTimeline} />
          <InfoIcon icon={Target} label="Maturité" value={project.maturity} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Questions métier</h2>

        {tradeAnswers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune question/réponse disponible.
          </p>
        ) : (
          <div className="space-y-3">
            {tradeAnswers.map((item, index) => (
              <div
                key={`${item.question}-${index}`}
                className="rounded-lg border border-border p-4"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Question
                </p>

                <p className="font-medium mt-1">{item.question}</p>

                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-4">
                  Réponse prospect
                </p>

                <p className="mt-1">{item.answer}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Relance programmée</h2>

        <p className="text-sm text-muted-foreground">
          Planifier une date de rappel pour ne pas laisser refroidir le prospect.
        </p>

        <input
          type="datetime-local"
          value={callbackDate ? callbackDate.slice(0, 16) : ''}
          onChange={(e) => setCallbackDate(e.target.value)}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <Button disabled={updating} onClick={saveCallbackDate}>
          Enregistrer le rappel
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Notes internes</h2>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full min-h-[180px] rounded-lg border border-border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Ajouter une note interne pour le suivi commercial..."
        />

        <Button disabled={updating} onClick={saveNotes}>
          Enregistrer la note
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Historique du dossier</h2>

        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun historique disponible.
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <CircleDot className="w-4 h-4 mt-1 text-primary" />

                <div>
                  <p className="font-medium">{activity.description}</p>

                  <p className="text-xs text-muted-foreground">
                    {activity.createdAt
                      ? new Date(activity.createdAt).toLocaleString('fr-FR')
                      : 'Date inconnue'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Info label="Téléphone" value={project.clientPhone} />
        <Info label="Email" value={project.clientEmail} />
        <Info label="Adresse" value={project.siteAddress} />
        <Info label="Ville" value={project.city} />
        <Info label="Code postal" value={String(project.postalCode || '')} />
        <Info label="Source" value={project.source} />
        <Info label="Assigné à" value={project.assignedTo} />
        <Info label="ID dossier" value={project.id} />
      </Card>
    </main>
  );
}

function StatusBadgeLarge({ status }: { status?: string }) {
  const config =
    status === 'À rappeler'
      ? 'border-orange-500/50 text-orange-500 bg-orange-500/10'
      : status === 'Qualifié'
        ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10'
        : status === 'Devis envoyé'
          ? 'border-blue-500/50 text-blue-500 bg-blue-500/10'
          : status === 'Gagné'
            ? 'border-primary/50 text-primary bg-primary/10'
            : status === 'Perdu'
              ? 'border-destructive/50 text-destructive bg-destructive/10'
              : 'border-border text-foreground bg-muted/40';

  return (
    <div className={`rounded-xl border px-5 py-4 min-w-44 text-center ${config}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">Statut dossier</p>
      <p className="text-xl font-bold mt-1">{status || 'Inconnu'}</p>
    </div>
  );
}

function AnalysisItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="rounded-lg border border-border p-4 flex items-center gap-3">
      <CheckCircle2
        className={`w-5 h-5 ${checked ? 'text-primary' : 'text-muted-foreground'}`}
      />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-medium">{value || '—'}</p>
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
    <div className="rounded-lg border border-border p-4">
      <Icon className="w-4 h-4 text-muted-foreground mb-2" />
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="font-semibold mt-1">{value || '—'}</p>
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