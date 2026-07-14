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

function getTodayEvents(events: unknown[]) {
  return events.flatMap((event) => {
    if (!event || typeof event !== 'object') return [];
    const value = event as Record<string, unknown>;
    const title = typeof value.title === 'string' ? value.title : typeof value.titre === 'string' ? value.titre : null;
    const date = typeof value.date === 'string' ? value.date : typeof value.start === 'string' ? value.start : null;
    if (!title || !date || !isToday(date)) return [];
    const parsed = new Date(date);
    return [{ title, time: Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), detail: typeof value.location === 'string' ? value.location : typeof value.lieu === 'string' ? value.lieu : null }];
  }).slice(0, 4);
}

function getPriorities(data: OperationsCenterResult | null) {
  if (!data) return [] as OperationsWorkbenchItem[];
  const items = [...data.workbench.waitingForApproval, ...data.workbench.todayActions, ...data.workbench.needsAttention];
  return Array.from(new Map(items.map((item) => [item.id, item])).values()).slice(0, 3);
}

function Decision({ item, primary, onOpen }: { item: OperationsWorkbenchItem; primary?: boolean; onOpen: (id: string) => void }) {
  return (
    <article className={`rounded-2xl border ${primary ? 'border-orange-200 bg-[#fffaf0] p-5' : 'border-slate-200 bg-white p-4'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-[0.13em] ${primary ? 'text-orange-700' : 'text-slate-500'}`}>{primary ? 'À traiter en premier' : 'À garder en vue'}</p>
          <h3 className={`mt-2 font-semibold text-[#0b2232] ${primary ? 'text-xl' : 'text-base'}`}>{item.title}</h3>
          <p className="mt-1 text-sm leading-5 text-slate-600">{item.description}</p>
          <p className="mt-3 text-xs leading-5 text-slate-500"><span className="font-semibold text-slate-700">Pourquoi :</span> {item.reason}</p>
          {primary && <p className="mt-1 text-xs text-slate-500"><span className="font-semibold text-slate-700">Prochaine décision :</span> {item.primaryActionLabel || 'Ouvrir le dossier'}</p>}
        </div>
        {item.projectId && <button type="button" onClick={() => onOpen(item.projectId!)} className="shrink-0 text-sm font-semibold text-emerald-700 hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">Ouvrir →</button>}
      </div>
    </article>
  );
}

export default function HomeWorkspace({ firstName, todayLabel, projects, todayEvents: rawEvents, operationsCenter, onOpenProject, onOpenAgenda }: Props) {
  const priorities = getPriorities(operationsCenter);
  const events = getTodayEvents(rawEvents);
  const activity = projects.filter((project) => isToday(project.createdAt) || isToday(project.acceptedAt) || isToday(project.updatedAt)).slice(0, 5);
  const watchlist = operationsCenter?.workbench.needsAttention.slice(0, 3) || [];
  const acceptedToday = projects.filter((project) => isToday(project.acceptedAt)).length;
  const week = events.length >= 4 || priorities.length >= 3 ? 'Semaine dense' : events.length >= 2 ? 'Semaine équilibrée' : 'Semaine légère';
  const summary = priorities.length ? `${priorities.length} décision${priorities.length > 1 ? 's importantes méritent' : ' importante mérite'} votre attention. Je garde le reste à l’œil.` : events.length ? `La journée est calme. ${events.length} rendez-vous ${events.length > 1 ? 'sont prévus' : 'est prévu'}. Le reste est sous contrôle.` : 'Tout est sous contrôle aujourd’hui. Vous pouvez vous concentrer sur vos interventions.';

  return <div className="mx-auto max-w-[1380px] space-y-7 pb-8">
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
      <div className="flex items-end justify-between gap-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">{todayLabel}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#0b2232]">Bonjour{firstName ? ` ${firstName}` : ''}.</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{summary}</p></div><div className="hidden shrink-0 gap-5 text-center xl:flex"><div><p className="text-sm font-semibold text-[#0b2232]">{activity.length}</p><p className="text-[10px] text-slate-500">activité{activity.length > 1 ? 's' : ''}</p></div><div><p className="text-sm font-semibold text-[#0b2232]">{events.length}</p><p className="text-[10px] text-slate-500">rendez-vous</p></div><div><p className="text-sm font-semibold text-[#0b2232]">{week}</p><p className="text-[10px] text-slate-500">cette semaine</p></div></div></div>
    </section>

    <section><p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-600">Décisions à prendre</p>{priorities.length ? <div className="mt-3 grid gap-3 lg:grid-cols-2"><div className="lg:col-span-2"> <Decision item={priorities[0]} primary onOpen={onOpenProject} /></div>{priorities.slice(1).map((item) => <Decision key={item.id} item={item} onOpen={onOpenProject} />)}</div> : <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4"><p className="font-semibold text-emerald-950">Tout est sous contrôle.</p><p className="mt-1 text-sm text-emerald-900/75">Aucune action urgente aujourd’hui.</p></div>}</section>

    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.9fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-600">Depuis minuit</p>{activity.length ? <div className="mt-3 divide-y divide-slate-100">{activity.map((project) => <button key={project.id} type="button" onClick={() => onOpenProject(project.id)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50"><span className="w-10 text-xs font-semibold text-slate-500">{project.acceptedAt ? '✓' : '•'}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-800">{project.acceptedAt ? 'Devis accepté' : project.createdAt ? 'Nouveau dossier' : 'Dossier mis à jour'}</span><span className="block truncate text-xs text-slate-500">{clientLabel(project)}</span></span><span className="text-emerald-700">→</span></button>)}</div> : <p className="mt-3 text-sm text-slate-500">Aucun événement important depuis minuit.</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-600">Points à surveiller</p>{watchlist.length ? <div className="mt-3 space-y-3">{watchlist.map((item) => <div key={item.id} className="border-l-2 border-amber-400 pl-3"><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</p><p className="mt-1 text-xs font-semibold text-amber-800">{item.primaryActionLabel || 'Ouvrir le dossier'} →</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Aucun point à vérifier.</p>}</section>
      <div className="space-y-4"><section className="rounded-2xl bg-[#0b2232] p-4 text-white"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-300">Aujourd’hui</p><button type="button" onClick={onOpenAgenda} className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">Voir l’agenda</button></div>{events.length ? <div className="mt-3 space-y-2">{events.map((event, index) => <div key={`${event.title}-${index}`} className="flex gap-3 border-t border-white/10 pt-2"><span className="w-10 text-xs text-emerald-300">{event.time || '—'}</span><span><span className="block text-sm font-medium">{event.title}</span>{event.detail && <span className="block text-xs text-slate-300">{event.detail}</span>}</span></div>)}</div> : <p className="mt-3 text-sm text-slate-300">Aucun rendez-vous prévu.</p>}</section><section className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">Projection de la semaine</p><p className="mt-1 text-lg font-semibold text-[#0b2232]">{week}</p><p className="mt-1 text-xs leading-5 text-slate-600">{events.length} rendez-vous et {priorities.length} décision{priorities.length > 1 ? 's' : ''} à suivre.</p></section>{acceptedToday > 0 && <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.13em] text-emerald-800">Bonne nouvelle</p><p className="mt-1 text-sm font-semibold text-emerald-950">{acceptedToday} devis accepté{acceptedToday > 1 ? 's' : ''} aujourd’hui.</p></section>}</div>
    </div>
  </div>;
}
