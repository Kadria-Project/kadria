export default function TasksLoading() {
  return (
    <div className="mx-auto max-w-[920px] space-y-6 pb-6" aria-busy="true" aria-label="Chargement des actions à traiter">
      <section className="h-44 animate-pulse rounded-[22px] border border-slate-200/80 bg-emerald-50/60" />
      <section className="space-y-3">
        <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
        <div className="h-48 animate-pulse rounded-[20px] border border-slate-200 bg-white" />
      </section>
    </div>
  )
}
