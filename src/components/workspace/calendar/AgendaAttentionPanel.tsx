import { AlertTriangle, CircleCheck, UserRound } from 'lucide-react'
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event'

type Props = { events: NormalizedCalendarEvent[]; conflicts: number; onOpen: (event: NormalizedCalendarEvent) => void }

export default function AgendaAttentionPanel({ events, conflicts, onOpen }: Props) {
  const pending = events.filter((event) => event.confirmation?.status === 'pending')
  const unassigned = events.filter((event) => event.source === 'kadria-appointment' && !event.assignedUserId)
  const first = pending[0] || unassigned[0] || null
  return <section className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">À traiter</p><div className="mt-3 space-y-3 text-sm">{conflicts > 0 && <p className="flex items-center gap-2 font-semibold text-amber-800"><AlertTriangle className="size-4" />{conflicts} conflit{conflicts > 1 ? 's' : ''} horaire{conflicts > 1 ? 's' : ''}</p>}{pending.length > 0 && <button type="button" onClick={() => onOpen(pending[0])} className="flex w-full items-center justify-between text-left text-slate-700 hover:text-emerald-700"><span>{pending.length} confirmation{pending.length > 1 ? 's' : ''} en attente</span><span className="font-semibold">Préparer</span></button>}{unassigned.length > 0 && <button type="button" onClick={() => onOpen(unassigned[0])} className="flex w-full items-center justify-between text-left text-slate-700 hover:text-emerald-700"><span className="inline-flex items-center gap-2"><UserRound className="size-4" />{unassigned.length} non affecté{unassigned.length > 1 ? 's' : ''}</span><span className="font-semibold">Réaffecter</span></button>}{!conflicts && !pending.length && !unassigned.length && <p className="flex items-center gap-2 text-emerald-700"><CircleCheck className="size-4" />Tout est à jour.</p>}</div>{first ? <button type="button" onClick={() => onOpen(first)} className="mt-3 text-xs font-semibold text-emerald-700">Ouvrir le rendez-vous</button> : null}</section>
}
