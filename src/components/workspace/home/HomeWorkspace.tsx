import type { Project } from '@/src/components/ArtisanDashboard';
import type { OperationsCenterResult, OperationsWorkbenchItem } from '@/src/lib/recommendations';

type Props = {
  firstName: string | null;
  todayLabel: string;
  projects: Project[];
  todayEvents: unknown[];
  operationsCenter: OperationsCenterResult | null;
  onOpenProject: (projectId: string) => void;
  onOpenAgenda: () => void;
};

function isToday(value: unknown) {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function clientLabel(project: Project) {
  return [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || project.projectType || 'Dossier';
}

function todayEvents(events: unknown[]) {
  return events.flatMap((event) => {
    if (!event || typeof event !== 'object') return [];
    const value = event as Record<string, unknown>;
    const title = typeof value.title === 'string' ? value.title : typeof value.titre === 'string' ? value.titre : null;
    const date = typeof value.date === 'string' ? value.date : typeof value.start === 'string' ? value.start : null;
    if (!title || !date || !isToday(date)) return [];
    const parsed = new Date(date);
    return [{ title, time: Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), location: typeof value.location === 'string' ? value.location : typeof value.lieu === 'string' ? value.lieu : null }];
  }).slice(0, 4);
}

function priorities(data: OperationsCenterResult | null) {
  if (!data) return [] as OperationsWorkbenchItem[];
  const source = [...data.workbench.waitingForApproval, ...data.workbench.todayActions, ...data.workbench.needsAttention];
  return Array.from(new Map(source.map((item) => [item.id, item])).values()).slice(0, 3);
}

export default function HomeWorkspace({ firstName, todayLabel, projects, todayEvents: rawEvents, operationsCenter, onOpenProject, onOpenAgenda }: Props) {
  const focus = priorities(operationsCenter);
  const events = todayEvents(rawEvents);
  const activity = projects.filter((project) => isToday(project.createdAt) || isToday(project.acceptedAt) || isToday(project.updatedAt)).slice(0, 5);
  const watchlist = operationsCenter?.workbench.needsAttention.slice(0, 3) || [];
  const acceptedThisWeek = projects.filter((project) => isToday(project.acceptedAt)).length;
  const goodNews = acceptedThisWeek > 0
    ? `${acceptedThisWeek} devis accepté${acceptedThisWeek > 1 ? 's' : ''} aujourd’hui.`
    : focus.length === 0 && watchlist.length === 0
      ? 'Aucune action urgente aujourd’hui.'
      : null;
  const summary = focus.length > 0
    ? `Votre activité demande votre attention. ${focus.length} décision${focus.length > 1 ? 's importantes méritent' : ' importante mérite'} votre attention. Je garde le reste à l’œil.`
    : events.length > 0
      ? `La journée est calme. ${events.length} rendez-vous ${events.length > 1 ? 'sont prévus' : 'est prévu'}. Le reste est sous contrôle.`
      : 'Tout est sous contrôle aujourd’hui. Vous pouvez vous concentrer sur vos interventions.';
  const week = events.length >= 4 || focus.length >= 3 ? 'Semaine dense' : events.length >= 2 ? 'Semaine équilibrée' : 'Semaine légère';

  return <div className="space-y-10 pb-10">
    <section className="border-b border-slate-200 pb-8"><p className="text-sm font-medium capitalize text-slate-500">{todayLabel}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0b2232]">Bonjour{firstName ? ` ${firstName}` : ''}.</h2><p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">{summary}</p></section>
    <section><h3 className="text-lg font-semibold text-[#0b2232]">Décisions à prendre</h3>{focus.length ? <div className="mt-4 space-y-5">{focus.map((item, index) => <article key={item.id} className="border-b border-slate-200 pb-5 last:border-0"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">{index === 0 ? 'À traiter en premier' : 'À garder en vue'}</p><p className="mt-2 text-lg font-semibold text-[#0b2232]">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.description}</p><div className="mt-3 grid gap-1 text-sm"><p className="text-slate-500"><span className="font-medium text-slate-700">Pourquoi :</span> {item.reason}</p><p className="text-slate-500"><span className="font-medium text-slate-700">Prochaine décision :</span> {item.primaryActionLabel || 'Ouvrir le dossier'}</p></div></div>{item.projectId && <button type="button" onClick={() => onOpenProject(item.projectId!)} className="shrink-0 text-sm font-semibold text-emerald-700 hover:text-emerald-600">Ouvrir →</button>}</div></article>)}</div> : <div className="mt-4 rounded-2xl bg-emerald-50 p-5"><p className="font-semibold text-emerald-950">Tout est sous contrôle.</p><p className="mt-1 text-sm text-emerald-900/75">Aucune action urgente aujourd’hui. Vous pouvez vous concentrer sur vos interventions.</p></div>}</section>
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]"><section><h3 className="text-lg font-semibold text-[#0b2232]">Depuis minuit</h3>{activity.length ? <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">{activity.map((project) => <button key={project.id} type="button" onClick={() => onOpenProject(project.id)} className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-slate-50"><span className="text-sm text-slate-700">{project.acceptedAt ? `Devis accepté : ${clientLabel(project)}` : project.createdAt ? `Nouveau dossier : ${clientLabel(project)}` : `Dossier mis à jour : ${clientLabel(project)}`}</span><span className="text-sm text-emerald-700">Ouvrir</span></button>)}</div> : <p className="mt-2 text-slate-600">Aucun événement important depuis minuit.</p>}</section><div className="space-y-6"><section className="rounded-2xl bg-[#0b2232] p-5 text-white"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Aujourd’hui</h3><button type="button" onClick={onOpenAgenda} className="text-sm font-medium text-emerald-300 hover:text-emerald-200">Voir l’agenda</button></div>{events.length ? <div className="mt-4 space-y-3">{events.map((event, index) => <div key={`${event.title}-${index}`} className="flex gap-4 border-t border-white/10 pt-3"><span className="w-12 text-sm text-emerald-300">{event.time || '—'}</span><div><p className="font-medium">{event.title}</p>{event.location && <p className="mt-0.5 text-sm text-slate-300">{event.location}</p>}</div></div>)}</div> : <p className="mt-4 text-sm text-slate-300">Aucun rendez-vous prévu aujourd’hui.</p>}</section><section className="rounded-2xl bg-slate-100 p-5"><p className="text-sm font-medium text-slate-500">Projection de la semaine</p><p className="mt-2 text-xl font-semibold text-[#0b2232]">{week}</p><p className="mt-2 text-sm leading-6 text-slate-600">Cette lecture repose sur les rendez-vous et actions déjà chargés dans Kadria.</p></section></div></div>
    {goodNews && <section className="border-l-2 border-emerald-400 pl-4"><p className="text-sm font-semibold text-emerald-800">Bonne nouvelle.</p><p className="mt-1 text-slate-700">{goodNews}</p></section>}
    {watchlist.length > 0 && <section><h3 className="text-lg font-semibold text-[#0b2232]">Points à surveiller</h3><div className="mt-3 space-y-4">{watchlist.map((item) => <div key={item.id} className="border-l-2 border-amber-400 pl-4"><p className="font-medium text-slate-800">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.reason}</p><p className="mt-2 text-sm font-medium text-amber-800">À faire : {item.primaryActionLabel || 'Ouvrir le dossier'}</p></div>)}</div></section>}
  </div>;
}
