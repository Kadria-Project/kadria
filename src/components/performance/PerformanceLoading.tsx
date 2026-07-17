export default function PerformanceLoading() {
  return (
    <div aria-hidden="true" aria-label="Chargement des indicateurs de performance">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-7 w-40 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 h-7 w-28 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-7 w-full animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
