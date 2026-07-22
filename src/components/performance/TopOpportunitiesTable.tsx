'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { RefreshCw } from 'lucide-react'
import { formatKPIValue } from '@/src/lib/performance/performance-format'
import type { PerformanceOpportunity } from '@/src/lib/performance/performance-types'
import { PERFORMANCE_RULES } from '@/src/lib/performance/performance-actions'

function scoreTone(score: number | null): string {
  if (score === null) return 'bg-slate-100 text-slate-500'
  if (score >= 75) return 'bg-emerald-50 text-emerald-700'
  if (score >= 45) return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

function ValueCell({ value }: { value: PerformanceOpportunity['value'] }) {
  if (value.amount === null) {
    return <span className="text-sm text-slate-400">Valeur indisponible</span>
  }
  return (
    <span title={value.label} className="text-sm font-semibold text-slate-950">
      {formatKPIValue(value.amount, 'currency')}
      <span className="ml-1 text-[11px] font-normal text-slate-400">({value.label})</span>
    </span>
  )
}

function OpportunityRow({ opportunity, index }: { opportunity: PerformanceOpportunity; index: number }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-emerald-50/40">
      <td className="py-3.5 pl-5 pr-2 align-top">
        <Link
          href={`/dashboard-v2/projet/${opportunity.projectId}`}
          className="font-semibold text-slate-950 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
        >
          {opportunity.clientName}
        </Link>
      </td>
      <td className="max-w-[320px] px-2 py-3.5 align-top text-sm text-slate-600" title={opportunity.projectTitle}><span className="block truncate">{opportunity.projectTitle}</span></td>
      <td className="px-2 py-3.5 align-top"><span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">{opportunity.statusLabel}</span></td>
      <td className="px-2 py-3.5 align-top">
        <ValueCell value={opportunity.value} />
      </td>
      <td className="px-2 py-3.5 align-top">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${scoreTone(opportunity.score)}`}
          aria-label={opportunity.score !== null ? `Score commercial ${opportunity.score} sur 100` : 'Score commercial indisponible'}
        >
          {opportunity.score !== null ? `${opportunity.score}/100` : '—'}
        </span>
      </td>
      <td className="px-2 py-3.5 align-top text-sm text-slate-700">{opportunity.nextAction.label}</td>
      <td className="px-2 py-3.5 align-top text-sm">
        {opportunity.dueLabel ? (
          <span className="font-medium text-amber-700">{opportunity.dueLabel}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="py-3.5 pr-5 align-top text-right">
        <Link
          href={opportunity.nextAction.destination}
          className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
        >
          Ouvrir le dossier
        </Link>
      </td>
      {/* index kept for potential future rank display without changing markup shape */}
      <td className="hidden">{index}</td>
    </tr>
  )
}

function OpportunityCard({ opportunity }: { opportunity: PerformanceOpportunity }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate font-semibold text-slate-950">{opportunity.clientName}</h4>
          <p className="truncate text-xs text-slate-500">{opportunity.projectTitle}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${scoreTone(opportunity.score)}`}>
          {opportunity.score !== null ? `${opportunity.score}/100` : '—'}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">{opportunity.statusLabel}</span>
        {opportunity.dueLabel && <span className="font-medium text-amber-700">{opportunity.dueLabel}</span>}
      </div>
      <div className="mt-2">
        <ValueCell value={opportunity.value} />
      </div>
      <p className="mt-2 text-sm text-slate-700">{opportunity.nextAction.label}</p>
      <Link
        href={`/dashboard-v2/projet/${opportunity.projectId}`}
        className="mt-3 inline-flex items-center rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
      >
        Ouvrir le dossier
      </Link>
    </li>
  )
}

function TopOpportunitiesContent({ opportunities }: { opportunities: PerformanceOpportunity[] }) {
  const preview = opportunities.slice(0, 5)
  const mobilePreview = preview.slice(0, PERFORMANCE_RULES.mobileOpportunityLimit)

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
          <caption className="sr-only">Opportunités commerciales à fort potentiel sur la période</caption>
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-2 pl-4 pr-2">Client</th>
              <th scope="col" className="py-2 px-2">Projet</th>
              <th scope="col" className="py-2 px-2">Statut</th>
              <th scope="col" className="py-2 px-2">Valeur</th>
              <th scope="col" className="py-2 px-2">Score</th>
              <th scope="col" className="py-2 px-2">Prochaine action</th>
              <th scope="col" className="py-2 px-2">Échéance</th>
              <th scope="col" className="py-2 pr-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((opportunity, index) => (
              <OpportunityRow key={opportunity.projectId} opportunity={opportunity} index={index} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {mobilePreview.map((opportunity) => (
          <OpportunityCard key={opportunity.projectId} opportunity={opportunity} />
        ))}
      </ul>
      {opportunities.length > mobilePreview.length && (
        <p className="mt-2 text-xs text-slate-400 md:hidden">
          {opportunities.length - mobilePreview.length} autre{opportunities.length - mobilePreview.length > 1 ? 's' : ''} opportunité{opportunities.length - mobilePreview.length > 1 ? 's' : ''} — retrouvez tous les dossiers dans le Suivi.
        </p>
      )}
      {opportunities.length > preview.length && <Link href="/dashboard-v2/suivi" className="mt-3 inline-flex text-xs font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">Voir toutes les opportunités →</Link>}
    </>
  )
}

export default function TopOpportunitiesTable({
  opportunities,
  loading,
  error,
  onRetry,
}: {
  opportunities: PerformanceOpportunity[] | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(15,34,50,.035)]"
    >
      <div>
        <h3 className="text-sm font-bold text-slate-950">Opportunités à fort potentiel</h3>
        <p className="mt-0.5 text-xs text-slate-500">Classement déterministe combinant score commercial, valeur, urgence et retard de relance.</p>
      </div>

      <div className="mt-3">
        {error ? (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4" role="alert">
            <p className="text-sm text-slate-700">Ce bloc est momentanément indisponible.</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Réessayer
              </button>
            )}
          </div>
        ) : loading || !opportunities ? (
          <div aria-hidden="true" className="animate-pulse space-y-2">
            <div className="h-48 w-full rounded-xl bg-slate-100" />
          </div>
        ) : opportunities.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucune opportunité prioritaire sur cette période.</p>
        ) : (
          <TopOpportunitiesContent opportunities={opportunities} />
        )}
      </div>
    </motion.div>
  )
}
