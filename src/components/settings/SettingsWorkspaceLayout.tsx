'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const sections = [
  { href: '/parametres/entreprise', label: 'Entreprise' },
  { href: '/parametres/activite', label: 'Activité' },
  { href: '/parametres/assistants', label: 'Assistants' },
  { href: '/parametres/connexions', label: 'Connexions' },
  { href: '/parametres/automatisations', label: 'Automatisations' },
  { href: '/parametres/equipe', label: 'Équipe' },
  { href: '/parametres/notifications', label: 'Notifications' },
  { href: '/parametres/acces', label: 'Accès' },
  { href: '/parametres/abonnement', label: 'Abonnement' },
]

export default function SettingsWorkspaceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-full">
      <nav aria-label="Sections des paramètres" className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {sections.map((section) => {
            const active = pathname === section.href || (section.href === '/parametres/automatisations' && pathname.startsWith('/parametres/automatisations/'))
            return (
              <Link
                key={section.href}
                href={section.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${active ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                {section.label}
              </Link>
            )
          })}
        </div>
      </nav>
      {children}
    </div>
  )
}
