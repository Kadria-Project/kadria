'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { AlertCircle, Clock, Info, Sparkles, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react'
import type { InsightIcon, PerformanceInsight } from '@/src/lib/performance/performance-types'

const ICONS: Record<InsightIcon, typeof TrendingUp> = {
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  alert: AlertCircle,
  clock: Clock,
  target: Sparkles,
  info: Info,
}

const LEVEL_STYLES: Record<PerformanceInsight['level'], { bg: string; icon: string }> = {
  positive: { bg: 'bg-emerald-50/60', icon: 'bg-emerald-100 text-emerald-700' },
  attention: { bg: 'bg-amber-50/60', icon: 'bg-amber-100 text-amber-700' },
  critical: { bg: 'bg-rose-50/50', icon: 'bg-rose-100 text-rose-700' },
  opportunity: { bg: 'bg-sky-50/60', icon: 'bg-sky-100 text-sky-700' },
  information: { bg: 'bg-slate-50', icon: 'bg-slate-100 text-slate-600' },
}

function InsightCard({ insight }: { insight: PerformanceInsight }) {
  const Icon = ICONS[insight.icon]
  const style = LEVEL_STYLES[insight.level]

  return (
    <li className={`rounded-xl p-4 ${style.bg}`}>
      <div className="flex items-start gap-3">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${style.icon}`} aria-hidden="true">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-950">{insight.title}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-600">{insight.explanation}</p>
          <p className="mt-1.5 text-[11px] font-semibold text-slate-500">{insight.evidence}</p>
          {insight.ctaLabel && insight.destination && (
            <Link
              href={insight.destination}
              className="mt-2 inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              {insight.ctaLabel} →
            </Link>
          )}
        </div>
      </div>
    </li>
  )
}

export default function InsightsPanel({
  insights,
  loading,
  error,
  onRetry,
}: {
  insights: PerformanceInsight[] | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-sm font-bold text-slate-950">Insights et recommandations</h3>
        <p className="mt-0.5 text-xs text-slate-500">Signaux calculés à partir de vos données réelles, sans intelligence artificielle.</p>
      </div>

      <div className="mt-4">
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
        ) : loading || !insights ? (
          <div aria-hidden="true" className="animate-pulse space-y-2">
            <div className="h-20 w-full rounded-xl bg-slate-100" />
            <div className="h-20 w-full rounded-xl bg-slate-100" />
          </div>
        ) : insights.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucun signal commercial important détecté sur cette période.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}
