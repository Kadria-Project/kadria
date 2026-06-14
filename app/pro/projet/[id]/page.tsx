'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Pencil,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Plus,
  ArrowRight,
  Clock,
} from 'lucide-react';

const PIPELINE_STEPS = ['À rappeler', 'Qualifié', 'Devis envoyé', 'Gagné'];
const PLANNING_TYPES = ['Relance', 'Rappel', 'RDV', 'Intervention'];

const K_LABEL = 'text-xs font-semibold uppercase tracking-widest text-muted-foreground';

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
  const [devisAmount, setDevisAmount] = useState('');
  const [calendarType, setCalendarType] = useState('Relance');
  const [showAllHistory, setShowAllHistory] = useState(false);

  const notesRef = useRef<HTMLDivElement>(null);

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
        setDevisAmount(data.project?.devisAmount ? String(data.project.devisAmount) : '');

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

  async function saveDevisAmount() {
    try {
      setUpdating(true);

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { Devis_amount: Number(devisAmount) || 0 },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setProject(data.project);
        await loadActivities();
      }
    } catch (error) {
      console.error('SAVE_DEVIS_AMOUNT_ERROR', error);
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

  const score = Number(project.completenessScore ?? 0);
  const currentStepIndex = PIPELINE_STEPS.indexOf(project.status);
  const temperature = getTemperature(score);
  const recommendation = getRecommendation(project, score);

  return (
    <main className="container mx-auto max-w-4xl px-6 py-8 flex flex-col gap-6">
      {/* SECTION 1 — HEADER DOSSIER */}
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between border-b border-border pb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
            Tableau de bord
          </button>

          <h1
            className="font-extrabold mt-2"
            style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)' }}
          >
            {project.clientFirstName} {project.clientName}
          </h1>

          <p className="text-base text-muted-foreground mt-1">
            {project.trade} · {project.city}
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm text-muted-foreground">
            {project.clientPhone && (
              <a
                href={`tel:${project.clientPhone}`}
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors duration-150"
              >
                <Phone className="w-3.5 h-3.5" />
                {project.clientPhone}
              </a>
            )}

            {project.clientEmail && (
              <a
                href={`mailto:${project.clientEmail}`}
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors duration-150"
              >
                <Mail className="w-3.5 h-3.5" />
                {project.clientEmail}
              </a>
            )}

            {project.siteAddress && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {project.siteAddress}
              </span>
            )}

            {project.createdAt && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(project.createdAt).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <span
            className={`px-5 py-2 rounded-full text-sm font-semibold border ${statusBadgeClasses(project.status)}`}
          >
            {project.status || 'Inconnu'}
          </span>

          <div className="flex gap-2">
            <a
              href={`/api/projects/${id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm border border-border rounded-md px-3 py-2 hover:bg-muted transition-colors duration-150 whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              Exporter PDF
            </a>

            <button
              onClick={() => notesRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 text-sm border border-border rounded-md px-3 py-2 hover:bg-muted transition-colors duration-150 whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5" />
              Modifier
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2 — ANALYSE KADRIA */}
      <section className="rounded-[20px] border border-primary/25 bg-primary/[0.02] p-7">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-primary font-bold text-lg">✦ Analyse Kadria</h2>

          <span
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold border ${temperature.classes}`}
          >
            {temperature.label}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <AnalysisItem
            label="Projet identifié"
            checked={Boolean(project.projectType)}
            value={project.projectType}
          />
          <AnalysisItem
            label="Budget collecté"
            checked={Boolean(project.budget)}
            value={project.budget}
          />
          <AnalysisItem
            label="Délai connu"
            checked={Boolean(project.desiredTimeline)}
            value={project.desiredTimeline}
          />
          <AnalysisItem
            label="Contact exploitable"
            checked={Boolean(project.clientPhone || project.clientEmail)}
            value={project.clientPhone || project.clientEmail}
          />
        </div>

        <div className="rounded-xl bg-card p-5 mt-4">
          <SummaryRow emoji="🔧" label="Type de projet" value={project.projectType} />
          <SummaryRow emoji="💰" label="Budget" value={project.budget} />
          <SummaryRow emoji="⏱️" label="Délai souhaité" value={project.desiredTimeline} />
          <SummaryRow emoji="📊" label="Maturité" value={project.maturity} last />
        </div>

        <div className="rounded-xl bg-muted p-5 mt-4">
          <p className={`${K_LABEL} mb-2`}>SYNTHÈSE IA</p>
          <p className="text-sm text-foreground leading-[1.7] italic whitespace-pre-wrap">
            {project.aiSummary || 'Aucun résumé disponible.'}
          </p>
        </div>

        <div className="rounded-xl bg-primary/[0.06] border border-primary/25 p-5 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <p className={`${K_LABEL} text-primary`}>RECOMMANDATION KADRIA</p>
          </div>
          <p className="text-base text-foreground leading-[1.7] font-medium">
            {recommendation}
          </p>
        </div>
      </section>

      {/* SECTION 3 — SUIVI COMMERCIAL */}
      <section className="rounded-[20px] bg-card border border-border p-7">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <h2 className="font-bold text-lg">Suivi commercial</h2>
          <span className="text-xs text-muted-foreground bg-muted rounded-md px-2 py-[3px]">
            #{project.projectNumber} · via {project.source || 'formulaire'}
          </span>
        </div>

        <div className="mb-6">
          <p className={`${K_LABEL} mb-3`}>ÉTAPE ACTUELLE</p>

          <div className="flex items-center gap-2 flex-wrap">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <button
                  disabled={updating}
                  onClick={() => updateStatus(step)}
                  className={`rounded-lg px-4 py-2 text-sm transition-colors duration-150 ${
                    i === currentStepIndex
                      ? 'bg-primary text-background font-bold'
                      : i < currentStepIndex
                        ? 'bg-primary/[0.08] text-primary border border-primary/25 font-medium'
                        : 'bg-muted text-muted-foreground border border-border font-medium'
                  }`}
                >
                  {step}
                </button>

                {i < PIPELINE_STEPS.length - 1 && <div className="w-6 h-px bg-border" />}
              </div>
            ))}

            <div className="ml-4">
              <button
                disabled={updating}
                onClick={() => updateStatus('Perdu')}
                className={`rounded-lg px-4 py-2 text-sm transition-colors duration-150 ${
                  project.status === 'Perdu'
                    ? 'bg-[#dc2626] text-white font-bold'
                    : 'bg-[rgba(220,38,38,0.08)] text-[#dc2626] border border-[rgba(220,38,38,0.2)] font-medium'
                }`}
              >
                Perdu
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className={`${K_LABEL} mb-3`}>MONTANT DU DEVIS</p>

          <div className="flex items-center gap-3">
            <input
              type="number"
              value={devisAmount}
              onChange={(e) => setDevisAmount(e.target.value)}
              placeholder="Montant en €"
              className="flex-1 rounded-[10px] border border-border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />

            <button
              disabled={updating}
              onClick={saveDevisAmount}
              className="rounded-[10px] bg-primary text-background px-5 py-3 font-semibold disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>

          {project.devisAmount > 0 && (
            <p className="text-sm text-primary mt-2">
              ✓ Montant réel : {project.devisAmount}€ — utilisé pour les KPIs
            </p>
          )}
        </div>

        <div className="mb-6">
          <p className={`${K_LABEL} mb-3`}>CLÔTURE DU DOSSIER</p>

          <div className="flex flex-wrap gap-3">
            <button
              disabled={updating}
              onClick={() => updateStatus('Gagné')}
              className="rounded-[10px] px-6 py-3 font-semibold bg-[rgba(21,128,61,0.15)] border border-[rgba(21,128,61,0.3)] text-[#15803d] hover:bg-[rgba(21,128,61,0.25)] transition-colors duration-150 disabled:opacity-50"
            >
              🏆 Chantier gagné
            </button>

            <button
              disabled={updating}
              onClick={() => updateStatus('Perdu')}
              className="rounded-[10px] px-6 py-3 font-semibold bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)] text-[#dc2626] hover:bg-[rgba(220,38,38,0.15)] transition-colors duration-150 disabled:opacity-50"
            >
              Archiver (perdu)
            </button>
          </div>
        </div>

        <div>
          <p className={`${K_LABEL} mb-3`}>PLANIFIER</p>

          <div className="flex gap-2 mb-3 flex-wrap">
            {PLANNING_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setCalendarType(type)}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors duration-150 ${
                  calendarType === type
                    ? 'bg-primary text-background'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="datetime-local"
              value={callbackDate ? callbackDate.slice(0, 16) : ''}
              onChange={(e) => setCallbackDate(e.target.value)}
              className="flex-1 rounded-[10px] border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <button
              disabled={updating}
              onClick={saveCallbackDate}
              className="rounded-[10px] bg-primary text-background px-5 py-3 font-semibold disabled:opacity-50 whitespace-nowrap"
            >
              + Calendrier
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 4 — NOTES INTERNES */}
      <section ref={notesRef} className="rounded-[20px] bg-card border border-border p-7">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-lg">📝 Notes internes</h2>

          {notes.trim() && (
            <span className="bg-primary text-background rounded-full w-5 h-5 flex items-center justify-center text-xs">
              {notes.split('\n').filter((line) => line.trim()).length}
            </span>
          )}
        </div>

        <div className="rounded-[10px] bg-muted p-3.5">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[140px] bg-transparent text-sm text-foreground leading-[1.6] outline-none resize-y"
            placeholder="Ajouter une note interne pour le suivi commercial..."
          />
        </div>

        <button
          disabled={updating}
          onClick={saveNotes}
          className="mt-3 rounded-[10px] bg-primary text-background px-5 py-2.5 font-semibold disabled:opacity-50"
        >
          Enregistrer la note
        </button>
      </section>

      {/* SECTION 5 — HISTORIQUE */}
      <section className="rounded-[20px] bg-card border border-border p-7">
        <h2 className="font-bold text-lg mb-5">Historique du dossier</h2>

        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun historique disponible.</p>
        ) : (
          <>
            <div className="relative">
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

              {(showAllHistory ? activities : activities.slice(0, 3)).map((activity) => (
                <div key={activity.id} className="relative pl-12 pb-5 last:pb-0">
                  <TimelineIcon action={activity.action} />

                  <p className="text-sm font-medium text-foreground">{activity.description}</p>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activity.createdAt
                      ? new Date(activity.createdAt).toLocaleString('fr-FR')
                      : 'Date inconnue'}
                  </p>
                </div>
              ))}
            </div>

            {activities.length > 3 && (
              <button
                onClick={() => setShowAllHistory((v) => !v)}
                className="text-sm text-primary hover:underline mt-1"
              >
                {showAllHistory ? 'Réduire' : "Voir tout l'historique"}
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function statusBadgeClasses(status?: string) {
  switch (status) {
    case 'À rappeler':
      return 'bg-[rgba(217,119,6,0.15)] text-[#d97706] border-[rgba(217,119,6,0.3)]';
    case 'Qualifié':
      return 'bg-[rgba(22,163,74,0.15)] text-[#16a34a] border-[rgba(22,163,74,0.3)]';
    case 'Devis envoyé':
      return 'bg-[rgba(37,99,235,0.15)] text-[#2563eb] border-[rgba(37,99,235,0.3)]';
    case 'Gagné':
      return 'bg-[rgba(21,128,61,0.15)] text-[#15803d] border-[rgba(21,128,61,0.3)]';
    case 'Perdu':
      return 'bg-[rgba(220,38,38,0.15)] text-[#dc2626] border-[rgba(220,38,38,0.3)]';
    default:
      return 'bg-[rgba(63,63,70,0.4)] text-[#a1a1aa] border-[#3f3f46]';
  }
}

function getTemperature(score: number) {
  if (score >= 70) {
    return { label: 'Prospect chaud', classes: 'bg-primary/15 text-primary border-primary/25' };
  }

  if (score >= 40) {
    return {
      label: 'Prospect tiède',
      classes: 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border-[rgba(245,158,11,0.3)]',
    };
  }

  return {
    label: 'Prospect froid',
    classes: 'bg-[rgba(220,38,38,0.10)] text-[#f87171] border-[rgba(220,38,38,0.2)]',
  };
}

function getRecommendation(project: { status?: string }, score: number) {
  if (project.status === 'Gagné') {
    return 'Ce chantier est gagné. Pensez à programmer le suivi de satisfaction client.';
  }

  if (project.status === 'Perdu') {
    return 'Ce dossier est archivé en perdu. Analysez les raisons pour ajuster votre approche commerciale.';
  }

  if (score >= 70) {
    return 'Ce prospect est très qualifié : privilégiez un contact rapide pour transformer cette opportunité en devis.';
  }

  if (score >= 40) {
    return 'Le dossier est partiellement qualifié : complétez les informations manquantes avant l\'envoi du devis.';
  }

  return 'Peu d\'informations sont disponibles : recontactez le prospect pour mieux qualifier son besoin.';
}

function AnalysisItem({
  label,
  checked,
  value,
}: {
  label: string;
  checked: boolean;
  value?: string;
}) {
  return (
    <div className="rounded-xl bg-card p-4">
      {checked ? (
        <CheckCircle2 className="w-4 h-4 text-primary" />
      ) : (
        <XCircle className="w-4 h-4 text-[#dc2626]" />
      )}

      <p className={`${K_LABEL} mt-2`}>{label}</p>

      <p className="text-sm text-foreground font-medium mt-1">
        {value || (checked ? 'Renseigné' : 'Manquant')}
      </p>
    </div>
  );
}

function SummaryRow({
  emoji,
  label,
  value,
  last,
}: {
  emoji: string;
  label: string;
  value?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 py-2.5 ${last ? '' : 'border-b border-border'}`}>
      <span>{emoji}</span>
      <span className={K_LABEL}>{label}</span>
      <span className="text-sm font-medium text-foreground ml-auto">{value || '—'}</span>
    </div>
  );
}

function TimelineIcon({ action }: { action?: string }) {
  if (action?.includes('STATUS')) {
    return (
      <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-muted border-2 border-border flex items-center justify-center">
        <ArrowRight className="w-3 h-3 text-foreground" />
      </span>
    );
  }

  if (action?.includes('CALLBACK')) {
    return (
      <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-[rgba(245,158,11,0.2)] flex items-center justify-center">
        <Clock className="w-3 h-3 text-[#f59e0b]" />
      </span>
    );
  }

  if (action?.includes('NOTE')) {
    return (
      <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-[rgba(37,99,235,0.2)] flex items-center justify-center">
        <FileText className="w-3 h-3 text-[#60a5fa]" />
      </span>
    );
  }

  return (
    <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
      <Plus className="w-3 h-3 text-background" />
    </span>
  );
}
