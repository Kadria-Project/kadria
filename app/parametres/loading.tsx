export default function SettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8" aria-busy="true" aria-label="Chargement des paramètres">
      <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
  )
}
