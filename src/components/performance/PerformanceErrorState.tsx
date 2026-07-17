import { RefreshCw } from 'lucide-react'

export default function PerformanceErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center" role="alert">
      <p className="font-bold text-slate-950">Impossible de charger la performance</p>
      <p className="mt-1 text-sm text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        Réessayer
      </button>
    </div>
  )
}
