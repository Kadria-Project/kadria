import type { ReactNode } from 'react'

export type SettingsPanelStatus = 'complete' | 'incomplete' | 'optional' | 'unavailable' | 'read-only'

const statusLabels: Record<SettingsPanelStatus, string> = {
  complete: 'Complet',
  incomplete: 'À compléter',
  optional: 'Facultatif',
  unavailable: 'Indisponible',
  'read-only': 'Lecture seule',
}

export function SettingsPanel({ title, description, status, children, footer }: { title: string; description: string; status?: SettingsPanelStatus; children: ReactNode; footer?: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-base font-semibold text-slate-900">{title}</h2><p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p></div>
      {status && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{statusLabels[status]}</span>}
    </div>
    <div className="mt-4">{children}</div>
    {footer && <div className="mt-4 border-t border-slate-100 pt-4">{footer}</div>}
  </section>
}
