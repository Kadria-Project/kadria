'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { SETTINGS_GROUPS, getSettingsSectionsByGroup, isSettingsSectionActive } from '@/src/lib/settings-navigation'

export default function SettingsWorkspaceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col lg:min-h-[calc(100vh-4rem)] lg:flex-row">
      <nav aria-label="Sections des paramètres" className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:w-60 lg:border-b-0 lg:border-r lg:px-5">
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:block lg:space-y-6">
          {SETTINGS_GROUPS.map((group) => <section key={group.id} aria-labelledby={`settings-group-${group.id}`}><h2 id={`settings-group-${group.id}`} className="mb-2 text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">{group.label}</h2><div className="space-y-1">{getSettingsSectionsByGroup(group.id).map((section) => {
            const active = isSettingsSectionActive(section, pathname)
            const Icon = section.icon
            return <Link key={section.id} href={section.href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm' : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950'}`}><Icon className="size-4 shrink-0" aria-hidden="true" /><span>{section.label}</span></Link>
          })}</div></section>)}
        </div>
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
