'use client'

import KadriaAppShell from '@/src/components/workspace/KadriaAppShell'
import { ActivitySettingsView } from '@/src/components/settings/activity/ActivitySettingsView'

export default function ActivitySettingsPage() {
  return <KadriaAppShell><main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8"><nav aria-label="Fil d’Ariane" className="mb-4 text-sm text-slate-500">Workspace <span aria-hidden="true">/</span> Paramètres <span aria-hidden="true">/</span> <span className="text-slate-700">Activité</span></nav><header className="mb-6"><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Activité</h1><p className="mt-2 text-sm text-slate-600">Définissez les métiers, prestations, déplacements et règles de qualification utilisés par Kadria.</p></header><ActivitySettingsView /></main></KadriaAppShell>
}
