'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatKPIValue } from '@/src/lib/performance/performance-format'
import type { PerformanceOpportunity } from '@/src/lib/performance/performance-types'
import { PERFORMANCE_RULES } from '@/src/lib/performance/performance-actions'

const FULL_ROW_GRID = 'grid grid-cols-[minmax(110px,1fr)_minmax(160px,1.65fr)_minmax(100px,.9fr)_minmax(145px,.9fr)_76px_minmax(120px,1.1fr)_minmax(110px,.9fr)_118px] gap-x-2'
const COMPACT_ROW_GRID = 'grid grid-cols-[minmax(96px,1fr)_minmax(120px,1.35fr)_minmax(84px,.8fr)_minmax(82px,.8fr)_minmax(110px,1fr)_118px] gap-x-2'
const COMPACT_AT_WIDTH = 1040

function scoreTone(score: number | null): string {
  if (score === null) return 'bg-slate-100 text-slate-500'
  if (score >= 75) return 'bg-emerald-50 text-emerald-700'
  if (score >= 45) return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

function statusTone(status: string): string {
  const normalized = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  if (normalized.includes('nouveau')) return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  if (normalized.includes('rappeler')) return 'border-amber-200 bg-amber-50 text-amber-700'
  if (normalized.includes('qualifie')) return 'border-violet-200 bg-violet-50 text-violet-700'
  if (normalized.includes('devis')) return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  if (normalized.includes('gagne') || normalized.includes('accepte')) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (normalized.includes('perdu') || normalized.includes('refuse')) return 'border-rose-200 bg-rose-50 text-rose-700'
  if (normalized.includes('archive')) return 'border-slate-200 bg-slate-100 text-slate-600'
  if (normalized.includes('en cours')) return 'border-blue-200 bg-blue-50 text-blue-700'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function ValueCell({ value, showLabel }: { value: PerformanceOpportunity['value']; showLabel: boolean }) {
  if (value.amount === null) return <span className="text-sm text-slate-400">Valeur indisponible</span>

  return <span title={value.label} className="whitespace-nowrap text-sm font-semibold text-slate-950">
    {formatKPIValue(value.amount, 'currency')}
    {showLabel && <span className="ml-1 text-[11px] font-normal text-slate-400">({value.label})</span>}
  </span>
}

function OpportunityRow({ opportunity, compact }: { opportunity: PerformanceOpportunity; compact: boolean }) {
  const grid = compact ? COMPACT_ROW_GRID : FULL_ROW_GRID

  return <div role="row" className={`${grid} items-start border-b border-slate-100 px-4 py-3.5 last:border-0 hover:bg-emerald-50/40`}>
    <div role="cell" className="min-w-0"><Link href={`/dashboard-v2/projet/${opportunity.projectId}`} className="block truncate font-semibold text-slate-950 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">{opportunity.clientName}</Link></div>
    <div role="cell" className="min-w-0 text-sm text-slate-600" title={opportunity.projectTitle}><span className="block truncate">{opportunity.projectTitle}</span></div>
    <div role="cell" className="min-w-0"><span className={`inline-flex max-w-full truncate whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusTone(opportunity.statusLabel)}`}>{opportunity.statusLabel}</span></div>
    <div role="cell" className="min-w-0"><ValueCell value={opportunity.value} showLabel={!compact} /></div>
    {!compact && <div role="cell"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${scoreTone(opportunity.score)}`} aria-label={opportunity.score !== null ? `Score commercial ${opportunity.score} sur 100` : 'Score commercial indisponible'}>{opportunity.score !== null ? `${opportunity.score}/100` : '—'}</span></div>}
    <div role="cell" className="min-w-0 text-sm text-slate-700"><p className="line-clamp-2">{opportunity.nextAction.label}</p></div>
    {!compact && <div role="cell" className="min-w-0 text-sm">{opportunity.dueLabel ? <span className="line-clamp-2 font-medium text-amber-700">{opportunity.dueLabel}</span> : <span className="text-slate-400">—</span>}</div>}
    <div role="cell" className="text-right"><Link href={opportunity.nextAction.destination} className="inline-flex whitespace-nowrap items-center rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">Ouvrir le dossier</Link></div>
  </div>
}

function OpportunityCard({ opportunity }: { opportunity: PerformanceOpportunity }) {
  return <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h4 className="truncate font-semibold text-slate-950">{opportunity.clientName}</h4><p className="truncate text-xs text-slate-500">{opportunity.projectTitle}</p></div><span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${scoreTone(opportunity.score)}`}>{opportunity.score !== null ? `${opportunity.score}/100` : '—'}</span></div>
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-full border px-2 py-0.5 font-medium ${statusTone(opportunity.statusLabel)}`}>{opportunity.statusLabel}</span>{opportunity.dueLabel && <span className="font-medium text-amber-700">{opportunity.dueLabel}</span>}</div>
    <div className="mt-2"><ValueCell value={opportunity.value} showLabel={false} /></div>
    <p className="mt-2 text-sm text-slate-700">{opportunity.nextAction.label}</p>
    <Link href={`/dashboard-v2/projet/${opportunity.projectId}`} className="mt-3 inline-flex items-center rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">Ouvrir le dossier</Link>
  </li>
}

function TopOpportunitiesContent({ opportunities }: { opportunities: PerformanceOpportunity[] }) {
  const preview = opportunities.slice(0, 5)
  const mobilePreview = preview.slice(0, PERFORMANCE_RULES.mobileOpportunityLimit)
  const desktopContainerRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(true)

  useEffect(() => {
    const element = desktopContainerRef.current
    if (!element) return
    const update = () => setCompact(element.clientWidth < COMPACT_AT_WIDTH)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const grid = compact ? COMPACT_ROW_GRID : FULL_ROW_GRID

  return <>
    <div ref={desktopContainerRef} className="hidden md:block">
      <div role="table" aria-label="Opportunités commerciales à fort potentiel sur la période" className="overflow-hidden rounded-xl border border-slate-100">
        <div role="rowgroup" className="border-b border-slate-200 bg-slate-50/60"><div role="row" className={`${grid} items-center px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500`}>
          <div role="columnheader">Client</div><div role="columnheader">Projet</div><div role="columnheader">Statut</div><div role="columnheader">Valeur</div>{!compact && <div role="columnheader">Score</div>}<div role="columnheader">Prochaine action</div>{!compact && <div role="columnheader">Échéance</div>}<div role="columnheader" className="text-right">Action</div>
        </div></div>
        <div role="rowgroup">{preview.map((opportunity) => <OpportunityRow key={opportunity.projectId} opportunity={opportunity} compact={compact} />)}</div>
      </div>
    </div>
    <ul className="flex flex-col gap-3 md:hidden">{mobilePreview.map((opportunity) => <OpportunityCard key={opportunity.projectId} opportunity={opportunity} />)}</ul>
    {opportunities.length > mobilePreview.length && <p className="mt-2 text-xs text-slate-400 md:hidden">{opportunities.length - mobilePreview.length} autre{opportunities.length - mobilePreview.length > 1 ? 's' : ''} opportunité{opportunities.length - mobilePreview.length > 1 ? 's' : ''} — retrouvez tous les dossiers dans le Suivi.</p>}
    {opportunities.length > preview.length && <Link href="/dashboard-v2/suivi" className="mt-3 inline-flex text-xs font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">Voir toutes les opportunités →</Link>}
  </>
}

export default function TopOpportunitiesTable({ opportunities, loading, error, onRetry }: { opportunities: PerformanceOpportunity[] | null; loading: boolean; error?: string | null; onRetry?: () => void }) {
  const reduceMotion = useReducedMotion()

  return <motion.div initial={reduceMotion ? undefined : { opacity: 0, y: 8 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(15,34,50,.035)]">
    <div><h3 className="text-sm font-bold text-slate-950">Opportunités à fort potentiel</h3><p className="mt-0.5 text-xs text-slate-500">Classement déterministe combinant score commercial, valeur, urgence et retard de relance.</p></div>
    <div className="mt-3">
      {error ? <div className="flex flex-col items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4" role="alert"><p className="text-sm text-slate-700">Ce bloc est momentanément indisponible.</p>{onRetry && <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"><RefreshCw className="size-3.5" aria-hidden="true" />Réessayer</button>}</div> : loading || !opportunities ? <div aria-hidden="true" className="animate-pulse space-y-2"><div className="h-48 w-full rounded-xl bg-slate-100" /></div> : opportunities.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucune opportunité prioritaire sur cette période.</p> : <TopOpportunitiesContent opportunities={opportunities} />}
    </div>
  </motion.div>
}
