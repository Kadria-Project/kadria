import type { ReactNode } from 'react'
import { SETTINGS_SECTIONS, getSettingsSection, type SettingsSectionId } from '@/src/lib/settings-navigation'

type Props = {
  section?: SettingsSectionId
  /** Transitional props retained while canonical pages move to section ids. */
  title?: string
  description?: string
  children: ReactNode
}

export default function SettingsSection({ section: sectionId, title, children }: Props) {
  const section = sectionId ? getSettingsSection(sectionId) : SETTINGS_SECTIONS.find((item) => item.label === title || (title === 'Mon entreprise' && item.id === 'company'))
  if (!section) return null
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
      <nav aria-label="Fil d’Ariane" className="mb-4 text-sm text-slate-500">Workspace <span aria-hidden="true">/</span> Paramètres <span aria-hidden="true">/</span> <span className="text-slate-700">{section.label}</span></nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{section.label}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{section.description}</p>
      </header>
      {children}
    </main>
  )
}
