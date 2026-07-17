'use client'

import { AlertTriangle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { formatKPIValue } from '@/src/lib/performance/performance-format'
import type { AtRiskOpportunitySummary } from '@/src/lib/performance/performance-types'

export default function AtRiskOpportunitiesCard({
  summary,
  loading,
  error,
}: {
  summary: AtRiskOpportunitySummary | null
  loading: boolean
  error?: string | null
}) {
  const reduceMotion = useReducedMotion()

  if (loading) {
    return (
      <div aria-hidden="true" className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-40 rounded bg-slate-100" />
        <div className="mt-3 h-8 w-32 rounded bg-slate-100" />
        <div className="mt-3 h-4 w-full rounded bg-slate-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" role="alert">
        <p className="text-sm font-bold text-slate-950">Valeur actuellement à risque</p>
        <p className="mt-1 text-xs text-slate-500">Indicateur momentanément indisponible.</p>
      </div>
    )
  }

  const hasRisk = summary && summary.count > 0

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border p-5 shadow-sm ${hasRisk ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white'}`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${hasRisk ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-400'}`}>
          <AlertTriangle className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-950">Valeur actuellement à risque</p>
          {hasRisk ? (
            <>
              <p className="mt-1 text-2xl font-bold text-slate-950">{formatKPIValue(summary.amount, 'currency')}</p>
              <p className="mt-1 text-xs text-slate-600">
                {summary.count} devis concerné{summary.count > 1 ? 's' : ''}
                {summary.mainLeak ? ` — ${summary.mainLeak}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Aucune opportunité à risque détectée sur cette période.</p>
          )}
          <p className="mt-2 text-[11px] text-slate-400">{summary?.ruleDescription}</p>
        </div>
      </div>
    </motion.div>
  )
}
