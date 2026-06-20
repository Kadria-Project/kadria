'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronRight,
  Clock,
  Euro,
  Mail,
  PhoneCall,
  Send,
  Target,
  Trophy,
} from 'lucide-react';
import DemoCalendar from '@/src/components/DemoCalendar';
import { useDemoMode } from '@/src/contexts/DemoModeContext';
import { computeDemoKPIs } from '@/src/lib/demo-data';
import { calculateOpportunityScore, getProjectRiskStatus, isHotLead } from '@/src/lib/commercial-actions';

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString('fr-FR')} EUR`;
}

function timeAgo(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'Gagne'
      ? 'border-green-500/30 bg-green-500/10 text-green-300'
      : status === 'Perdu'
        ? 'border-red-500/30 bg-red-500/10 text-red-300'
        : status === 'Devis envoye'
          ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
          : status === 'Qualifie'
            ? 'border-green-500/30 bg-green-500/10 text-green-300'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-300';

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{status}</span>;
}

function isAtRiskStatus(status: string) {
  return status === 'A rappeler' || status === 'En risque' || status === 'A relancer' || status === 'Devis envoye';
}

export default function DemoArtisanDashboard() {
  const router = useRouter();
  const { projects, events, artisan, theme, setTheme, createEvent, updateEvent, deleteEvent } = useDemoMode();
  const [activeView, setActiveView] = useState<'commercial' | 'calendar'>('commercial');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const kpis = useMemo(() => computeDemoKPIs(projects), [projects]);
  const hotLead = useMemo(() => projects.find((project) => isHotLead(project as never)) ?? null, [projects]);
  const riskProjects = useMemo(
    () =>
      projects.filter((project) => {
        const risk = getProjectRiskStatus(project as never);
        return risk.label === 'En risque' || risk.label === 'A relancer' || isAtRiskStatus(project.status);
      }),
    [projects],
  );
  const prioritized = useMemo(
    () =>
      [...projects]
        .map((project) => ({
          ...project,
          opportunityScore: calculateOpportunityScore(project as never),
        }))
        .sort((left, right) => right.opportunityScore - left.opportunityScore)
        .slice(0, 5),
    [projects],
  );

  const kanbanColumns = [
    { label: 'Nouveau', statuses: ['Nouveau'] },
    { label: 'Action requise', statuses: ['A rappeler', 'En risque', 'A relancer'] },
    { label: 'Pret a chiffrer', statuses: ['Qualifie'] },
    { label: 'Devis en attente', statuses: ['Devis envoye'] },
    { label: 'Cloture', statuses: ['Gagne', 'Perdu'] },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-green-500">Kadria Pro</p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Tableau de bord</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {artisan.companyName} · {artisan.primaryTrade} · theme {theme === 'dark' ? 'sombre' : 'clair'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('commercial')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeView === 'commercial' ? 'bg-green-500 text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-white'}`}
            >
              Suivi commercial
            </button>
            <button
              type="button"
              onClick={() => setActiveView('calendar')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeView === 'calendar' ? 'bg-green-500 text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-white'}`}
            >
              Calendrier
            </button>
            <button
              type="button"
              onClick={() => router.push('/demo-dashboard/onboarding')}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Mon profil
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {theme === 'dark' ? 'Theme clair' : 'Theme sombre'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-300"
            >
              Deconnexion
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'CA potentiel', value: formatCurrency(kpis.caTotal), icon: Euro },
            { label: 'Devis envoyes', value: formatCurrency(kpis.devisTotal), icon: Send },
            { label: 'Chantiers gagnes', value: formatCurrency(kpis.gagneTotal), icon: Trophy },
            { label: 'Taux de conversion', value: `${kpis.tauxTransfo}%`, icon: Target },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-zinc-400">{item.label}</span>
                <div className="rounded-lg bg-zinc-800 p-2 text-green-400">
                  <item.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white">Centre d'actions</p>
              <p className="mt-1 text-sm text-zinc-400">La vue la plus rapide pour savoir quoi traiter aujourd'hui.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('commercial')}
              className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400"
            >
              Voir mes priorites
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricBox icon={Bell} label="Prospects chauds" value={kpis.prospectsChauds} />
            <MetricBox icon={AlertTriangle} label="Dossiers en risque" value={kpis.dossiersEnRisque} />
            <MetricBox icon={CalendarDays} label="Relances aujourd'hui" value={events.filter((event) => event.type === 'Relance').length} />
            <MetricBox icon={Clock} label="Relances en retard" value={events.filter((event) => event.status === 'En retard').length} />
          </div>
        </div>

        {hotLead ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-green-500/25 bg-green-500/[0.06] px-5 py-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-green-400" />
              <p className="text-sm text-white">
                <span className="font-semibold text-green-400">Prospect chaud :</span> {hotLead.clientFirstName} {hotLead.clientName} - dossier pret a chiffrer
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/demo-dashboard/projet/${hotLead.id}`)}
              className="rounded-lg border border-green-500/30 px-4 py-2 text-sm font-semibold text-green-400"
            >
              Voir
            </button>
          </div>
        ) : null}

        {activeView === 'calendar' ? (
          <DemoCalendar events={events} onCreateEvent={createEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} />
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">Mes actions du jour</p>
                    <p className="text-sm text-zinc-400">Appels, devis et relances prioritaires.</p>
                  </div>
                  <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">5 actions</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricBox icon={PhoneCall} label="Appels a effectuer" value={3} />
                  <MetricBox icon={Send} label="Devis a envoyer" value={2} />
                  <MetricBox icon={Mail} label="Relances a faire" value={1} />
                </div>
                <div className="mt-4 space-y-3">
                  {prioritized.slice(0, 3).map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => router.push(`/demo-dashboard/projet/${project.id}`)}
                      className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-left transition-colors hover:border-green-500/20 hover:bg-zinc-900"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{project.clientFirstName} {project.clientName}</p>
                        <p className="text-xs text-zinc-400">{project.projectType}</p>
                      </div>
                      <span className="text-xs text-zinc-300">Voir le dossier</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="font-semibold text-white">Dossiers en risque</p>
                    <p className="text-sm text-zinc-400">3 dossiers visibles maximum.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {riskProjects.slice(0, 3).map((project) => (
                    <div key={project.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-sm font-semibold text-white">{project.clientFirstName} {project.clientName}</p>
                      <p className="mt-1 text-xs text-zinc-400">{project.projectType} · {project.city}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/demo-dashboard/projet/${project.id}`)}
                          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200"
                        >
                          Relancer
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/demo-dashboard/projet/${project.id}`)}
                          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200"
                        >
                          Voir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Opportunites prioritaires</p>
                  <p className="text-sm text-zinc-400">Les 5 dossiers a chiffrer ou relancer en premier.</p>
                </div>
                <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">Score IA</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {prioritized.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => router.push(`/demo-dashboard/projet/${project.id}`)}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-left transition-colors hover:border-green-500/20 hover:bg-zinc-900"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <StatusPill status={project.status} />
                      <span className="text-sm font-bold text-green-400">{project.opportunityScore}/100</span>
                    </div>
                    <p className="font-semibold text-white">{project.clientFirstName} {project.clientName}</p>
                    <p className="mt-1 text-sm text-zinc-400">{project.projectType}</p>
                    <p className="mt-1 text-xs text-zinc-500">{project.city}</p>
                    <p className="mt-3 text-xs text-zinc-300">{project.budget}</p>
                    <p className="mt-2 text-xs text-zinc-500">{project.status === 'Devis envoye' ? 'Action recommandee: Relancer le devis' : 'Action recommandee: Voir le dossier'}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-white">Tous les dossiers</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${viewMode === 'list' ? 'bg-green-500 text-zinc-950' : 'border border-zinc-800 bg-zinc-950 text-zinc-300'}`}
                  >
                    Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('kanban')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${viewMode === 'kanban' ? 'bg-green-500 text-zinc-950' : 'border border-zinc-800 bg-zinc-950 text-zinc-300'}`}
                  >
                    Kanban
                  </button>
                </div>
              </div>

              {viewMode === 'list' ? (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => router.push(`/demo-dashboard/projet/${project.id}`)}
                      className="grid w-full gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-left transition-colors hover:border-green-500/20 hover:bg-zinc-900 md:grid-cols-[1.4fr_1.2fr_0.9fr_0.8fr_0.8fr]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{project.clientFirstName} {project.clientName}</p>
                        <p className="text-xs text-zinc-400">{project.projectNumber} · {timeAgo(project.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-white">{project.projectType}</p>
                        <p className="text-xs text-zinc-400">{project.trade}</p>
                      </div>
                      <p className="text-sm text-zinc-300">{project.city}</p>
                      <p className="text-sm text-zinc-300">{project.budget}</p>
                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <span className="text-sm font-semibold text-green-400">{project.completenessScore}%</span>
                        <StatusPill status={project.status} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="grid min-w-[980px] grid-cols-5 gap-4">
                    {kanbanColumns.map((column) => (
                      <div key={column.label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">{column.label}</p>
                          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
                            {projects.filter((project) => column.statuses.includes(project.status)).length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {projects
                            .filter((project) => column.statuses.includes(project.status))
                            .map((project) => (
                              <button
                                key={project.id}
                                type="button"
                                onClick={() => router.push(`/demo-dashboard/projet/${project.id}`)}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left transition-colors hover:border-green-500/20"
                              >
                                <p className="text-sm font-semibold text-white">{project.clientFirstName} {project.clientName}</p>
                                <p className="mt-1 text-xs text-zinc-400">{project.projectType}</p>
                                <p className="mt-2 text-xs text-zinc-500">{project.budget}</p>
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bell;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-zinc-400">{label}</span>
        <Icon className="h-4 w-4 text-green-400" />
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
