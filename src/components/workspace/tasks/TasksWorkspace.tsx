import { useMemo } from 'react';
import { Activity, BadgeCheck, Bot, Calendar, CircleAlert, CircleCheck, Clock3, FileText, Phone, Send, Sparkles, Zap } from 'lucide-react';
import type { OperationsCenterResult, OperationsWorkbenchItem } from '@/src/lib/recommendations';
import { useWorkspaceNavigation } from '../WorkspaceNavigationContext';

type Props = {
  firstName: string | null;
  operationsCenter: OperationsCenterResult | null;
  todayEvents: unknown[];
  onOpenProject: (projectId: string) => void;
};
type Autonomy = 'Manuel' | 'Préparé' | 'Validation' | 'Automatique';

const autonomyStyles: Record<Autonomy, string> = {
  Manuel: 'bg-slate-100 text-slate-600',
  Préparé: 'bg-blue-50 text-blue-700',
  Validation: 'bg-orange-50 text-orange-700',
  Automatique: 'bg-emerald-50 text-emerald-700',
};

function unique(items: OperationsWorkbenchItem[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function formatMinutes(value: number) {
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours} h ${minutes}` : `${hours} h`;
}

function contextLabel(item: OperationsWorkbenchItem) {
  const context = [item.clientName, item.projectTitle || item.entityLabel].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index);
  return context.join(' · ') || 'Dossier à préciser';
}

function isConcreteAction(item: OperationsWorkbenchItem) {
  return !/disponible aujourd/i.test(item.title) || Boolean(item.projectId || item.primaryActionType || item.primaryActionRoute);
}

function autonomy(item: OperationsWorkbenchItem): Autonomy {
  if (item.category === 'approval') return 'Validation';
  if (item.source === 'automation_run') return item.category === 'completed' ? 'Automatique' : 'Préparé';
  return 'Manuel';
}

function actionIcon(item: OperationsWorkbenchItem) {
  if (item.appointmentId) return <Calendar className="size-5" aria-hidden="true" />;
  if (item.quoteId) return <FileText className="size-5" aria-hidden="true" />;
  if (/relance|email|message/i.test(item.title)) return <Send className="size-5" aria-hidden="true" />;
  if (/appel/i.test(item.title)) return <Phone className="size-5" aria-hidden="true" />;
  return <Sparkles className="size-5" aria-hidden="true" />;
}

function estimate(item: OperationsWorkbenchItem) {
  return item.category === 'approval' ? '2 min' : item.priority === 'critical' ? '8 min' : item.priority === 'high' ? '5 min' : '3 min';
}

function QueueCard({ item, onOpen, onRemember }: { item: OperationsWorkbenchItem; onOpen: (id: string) => void; onRemember: (item: OperationsWorkbenchItem) => void }) {
  const mode = autonomy(item);

  return (
    <article id={`workspace-action-${item.id}`} className="group rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-[0_2px_8px_rgba(15,34,50,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,34,50,0.08)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{actionIcon(item)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[#0b2232]">{item.title}</h3>
              <p className="mt-0.5 truncate text-sm text-slate-600">{contextLabel(item)}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${autonomyStyles[mode]}`}>● {mode}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden="true" />{estimate(item)}</span>
            <span className={item.priority === 'critical' || item.priority === 'high' ? 'font-semibold text-orange-700' : 'font-semibold text-slate-600'}>{item.priority === 'critical' || item.priority === 'high' ? 'Impact fort' : 'Impact à décider'}</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500"><span className="font-semibold text-slate-700">Pourquoi :</span> {item.reason}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        {item.projectId ? <button type="button" onClick={() => { onRemember(item); onOpen(item.projectId!); }} className="rounded-lg px-2 py-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Voir</button> : <span className="px-2 py-1.5 text-sm font-semibold text-slate-400">À décider</span>}
      </div>
    </article>
  );
}

function MiniStat({ icon: Icon, label, value, tone = 'emerald' }: { icon: typeof Zap; label: string; value: number | string; tone?: 'blue' | 'emerald' | 'orange' | 'slate' }) {
  const tones = { emerald: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700', orange: 'bg-orange-50 text-orange-700', slate: 'bg-slate-100 text-slate-600' };
  return <div className="flex items-center gap-3 rounded-2xl border border-[#EAEAEA] bg-white px-4 py-3"><span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="size-4" aria-hidden="true" /></span><div><p className="text-lg font-semibold text-[#0b2232]">{value}</p><p className="text-[11px] text-slate-500">{label}</p></div></div>;
}

export default function TasksWorkspace({ firstName, operationsCenter, todayEvents, onOpenProject }: Props) {
  const { rememberNavigation } = useWorkspaceNavigation();
  const workbench = operationsCenter?.workbench;
  const queue = useMemo(() => unique([...(workbench?.waitingForApproval || []), ...(workbench?.todayActions || []), ...(workbench?.needsAttention || [])]).filter(isConcreteAction).slice(0, 7), [workbench]);
  const later = useMemo(() => (workbench?.todayActions || []).filter((item) => !queue.some((entry) => entry.id === item.id)).slice(0, 4), [queue, workbench]);
  const activity = useMemo(() => [...(workbench?.recentlyCompleted || []), ...(workbench?.needsAttention || [])].slice(0, 5), [workbench]);
  const automatedItems = (workbench?.recentlyCompleted || []).filter((item) => item.source === 'automation_run');
  const urgent = queue.filter((item) => item.priority === 'critical' || item.priority === 'high').length;
  const awaiting = workbench?.waitingForApproval.slice(0, 4) || [];
  const eventsCount = Array.isArray(todayEvents) ? todayEvents.length : 0;
  const estimatedMinutes = queue.reduce((total, item) => total + (item.priority === 'critical' ? 8 : item.priority === 'high' ? 5 : 3), 0);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-6">
      <section className="rounded-2xl border border-[#EAEAEA] bg-white px-6 py-5">
        <div className="flex items-end justify-between gap-6">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">À faire</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#0b2232]">Bonjour{firstName ? ` ${firstName}` : ''}.</h2><p className="mt-1 text-base font-medium text-slate-700">Votre journée est prête.</p><p className="mt-1 text-sm text-slate-500">Kadria peut vous faire gagner environ {formatMinutes(Math.max(estimatedMinutes, 15))} aujourd’hui.</p></div>
          <div className="hidden grid-cols-4 gap-3 xl:grid"><MiniStat icon={CircleCheck} label="Actions" value={queue.length} /><MiniStat icon={CircleAlert} label="Urgentes" value={urgent} tone="orange" /><MiniStat icon={Bot} label="Automatisées" value={automatedItems.length} tone="blue" /><MiniStat icon={Clock3} label="Temps estimé" value={formatMinutes(estimatedMinutes)} tone="slate" /></div>
        </div>
      </section>

      <section id="workspace-section-queue">
        <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">À faire maintenant</p><p className="mt-1 text-sm text-slate-500">Le meilleur ordre pour faire avancer votre journée.</p></div><span className="text-xs font-semibold text-slate-500">{queue.length} action{queue.length > 1 ? 's' : ''}</span></div>
        {queue.length ? <div className="grid gap-3 lg:grid-cols-2">{queue.map((item) => <QueueCard key={item.id} item={item} onOpen={onOpenProject} onRemember={(action) => rememberNavigation({ mode: 'tasks', actionId: action.id, section: 'queue' })} />)}</div> : <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-950">Aucune action urgente.</div>}
      </section>

      <section><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Mes actions en attente</p><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><MiniStat icon={Phone} label="Appels" value={queue.filter((item) => /appel/i.test(item.title)).length} tone="slate" /><MiniStat icon={Send} label="Emails" value={queue.filter((item) => /email|relance|message/i.test(item.title)).length} tone="blue" /><MiniStat icon={FileText} label="Devis" value={queue.filter((item) => Boolean(item.quoteId)).length} tone="orange" /><MiniStat icon={Calendar} label="Rendez-vous" value={eventsCount} tone="emerald" /></div></section>

      <section id="workspace-section-automations"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Dernières actions automatisées</p><div className="mt-3 grid gap-3 lg:grid-cols-4">{automatedItems.slice(0, 4).map((item) => <article key={item.id} className="rounded-2xl border border-[#EAEAEA] bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold text-[#0b2232]"><CircleCheck className="size-4 text-emerald-600" aria-hidden="true" />{item.title}</p><p className="mt-2 text-xs text-slate-500">{item.dateLabel || item.statusLabel || 'Action réalisée'}</p></article>)}</div></section>

      {awaiting.length > 0 && <section id="workspace-section-validations"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Validations</p><div className="mt-3 divide-y rounded-2xl border border-[#EAEAEA] bg-white px-4">{awaiting.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-semibold text-[#0b2232]">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.reason}</p></div>{item.projectId && <button type="button" onClick={() => onOpenProject(item.projectId!)} className="shrink-0 rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Voir</button>}</div>)}</div></section>}

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]"><details id="workspace-section-later" className="rounded-2xl border border-[#EAEAEA] bg-white p-4"><summary className="cursor-pointer list-none text-sm font-semibold text-[#0b2232]">Plus tard <span className="ml-2 text-xs font-normal text-slate-500">{later.length} action{later.length > 1 ? 's' : ''}</span></summary><div className="mt-3 space-y-2">{later.length ? later.map((item) => <p key={item.id} className="text-sm text-slate-600">{item.title}</p>) : <p className="text-sm text-slate-500">Rien d’autre à planifier.</p>}</div></details><section className="rounded-2xl border border-[#EAEAEA] bg-white p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-600"><Activity className="size-4 text-emerald-600" aria-hidden="true" />Activité du jour</p><div className="mt-3 space-y-3">{activity.length ? activity.map((item, index) => <div key={item.id} className="flex gap-3"><span className="w-10 text-xs font-semibold text-slate-500">{item.dateLabel || `0${8 + index}:00`}</span><div className="border-l border-emerald-200 pl-3"><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-0.5 text-xs text-slate-500">{item.description}</p></div></div>) : <p className="text-sm text-slate-500">Aucune activité importante pour le moment.</p>}</div></section></section>

      <section className="grid gap-3 md:grid-cols-4"><MiniStat icon={Clock3} label="Temps gagné" value={formatMinutes(automatedItems.length * 3)} /><MiniStat icon={CircleCheck} label="Terminées" value={(workbench?.recentlyCompleted || []).length} tone="emerald" /><MiniStat icon={Zap} label="Automatisations" value={automatedItems.length} tone="blue" /><MiniStat icon={BadgeCheck} label="Décisions prises" value={awaiting.length} tone="orange" /></section>
    </div>
  );
}
