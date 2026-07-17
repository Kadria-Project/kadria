'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { RefreshCw } from 'lucide-react'

export default function ChartCard({
  title,
  subtitle,
  loading,
  error,
  empty,
  emptyMessage,
  onRetry,
  className = '',
  children,
  footer,
}: {
  title: string
  subtitle?: string
  loading: boolean
  error?: string | null
  empty?: boolean
  emptyMessage?: string
  onRetry?: () => void
  className?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-950">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="mt-4 flex-1">
        {error ? (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4" role="alert">
            <p className="text-sm text-slate-700">Ce graphique est momentanément indisponible.</p>
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
        ) : loading ? (
          <div aria-hidden="true" className="animate-pulse space-y-2">
            <div className="h-40 w-full rounded-xl bg-slate-100" />
          </div>
        ) : empty ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>

      {!error && !loading && !empty && footer}
    </motion.div>
  )
}
