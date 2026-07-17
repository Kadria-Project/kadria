import { BarChart3 } from 'lucide-react'

export default function PerformanceEmptyState() {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-slate-50 text-slate-400">
        <BarChart3 className="size-6" aria-hidden="true" />
      </div>
      <p className="mt-4 font-bold text-slate-950">Pas encore de données à analyser</p>
      <p className="mt-1 text-sm text-slate-600">
        Vos indicateurs de performance apparaîtront ici dès que vous aurez des devis et des dossiers sur cette période.
      </p>
    </div>
  )
}
