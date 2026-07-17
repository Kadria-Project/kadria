'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatDeltaPercent, formatKPIValue } from '@/src/lib/performance/performance-format'
import type { KPIResult } from '@/src/lib/performance/performance-types'

const COUNT_UP_MS = 700

function useCountUp(target: number, disabled: boolean) {
  const [value, setValue] = useState(disabled ? target : 0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (disabled) return
    const startedAt = performance.now()
    const from = 0
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / COUNT_UP_MS, 1)
      const eased = 1 - (1 - progress) * (1 - progress)
      setValue(from + (target - from) * eased)
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, disabled])

  return disabled ? target : value
}

function Sparkline({ points, trend }: { points: number[]; trend: KPIResult['comparison']['trend'] }) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const width = 100
  const height = 28
  const step = width / (points.length - 1)
  const coords = points.map((point, index) => {
    const x = index * step
    const y = height - ((point - min) / span) * height
    return `${x},${y}`
  })
  const stroke = trend === 'up' ? '#059669' : trend === 'down' ? '#e11d48' : '#94a3b8'
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-full" aria-hidden="true" preserveAspectRatio="none">
      <polyline points={coords.join(' ')} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export type KPICardContent = {
  id: string
  title: string
  icon: LucideIcon
  ariaLabel: string
}

export default function KPICard({
  content,
  result,
  loading,
  error,
  onRetry,
}: {
  content: KPICardContent
  result?: KPIResult
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const reduceMotion = useReducedMotion()
  const animatedValue = useCountUp(result?.value ?? 0, Boolean(reduceMotion) || !result)
  const Icon = content.icon

  if (error) {
    return (
      <div className="flex flex-col justify-between rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm" role="alert">
        <div>
          <p className="text-sm font-bold text-slate-950">{content.title}</p>
          <p className="mt-1 text-xs text-slate-600">Indicateur indisponible.</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex w-fit items-center rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
          >
            Réessayer
          </button>
        )}
      </div>
    )
  }

  if (loading || !result) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-hidden="true">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-7 w-28 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-7 w-full animate-pulse rounded bg-slate-100" />
      </div>
    )
  }

  const { comparison } = result
  const TrendIcon = comparison.trend === 'down' ? TrendingDown : TrendingUp
  const trendTone =
    comparison.trend === 'up' ? 'text-emerald-700 bg-emerald-50' : comparison.trend === 'down' ? 'text-rose-700 bg-rose-50' : 'text-slate-600 bg-slate-100'

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
      aria-label={content.ariaLabel}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{content.title}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>

      <p className="mt-2 text-2xl font-bold text-slate-950">{formatKPIValue(animatedValue, result.format)}</p>

      <div className="mt-2 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${trendTone}`}>
          <TrendIcon className="size-3" aria-hidden="true" />
          {formatDeltaPercent(comparison.deltaPercent)}
        </span>
        <span className="text-[11px] text-slate-400">vs période précédente</span>
      </div>

      <p className="mt-1.5 text-[11px] text-slate-400">{comparison.deltaAbsolute === 0 ? 'Stable sur la période' : `${comparison.deltaAbsolute > 0 ? '+' : '−'}${formatKPIValue(Math.abs(comparison.deltaAbsolute), result.format)} sur la période`}</p>

      <div className="mt-2">
        <Sparkline points={result.sparkline} trend={comparison.trend} />
      </div>
    </motion.div>
  )
}
