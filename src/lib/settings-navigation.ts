import type { LucideIcon } from 'lucide-react'
import { Bell, Bot, Building2, CreditCard, KeyRound, Link2, SlidersHorizontal, UsersRound } from 'lucide-react'

export type SettingsGroupId = 'company' | 'clients' | 'organization' | 'account'
export type SettingsSectionId = 'company' | 'activity' | 'assistants' | 'automations' | 'connections' | 'notifications' | 'team' | 'access' | 'billing'

export type SettingsGroup = { id: SettingsGroupId; label: string; order: number }
export type SettingsSection = {
  id: SettingsSectionId
  label: string
  description: string
  href: string
  group: SettingsGroupId
  order: number
  icon: LucideIcon
  aliases: string[]
}

export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  { id: 'company', label: 'Mon entreprise', order: 1 },
  { id: 'clients', label: 'Kadria et mes clients', order: 2 },
  { id: 'organization', label: 'Mon organisation', order: 3 },
  { id: 'account', label: 'Mon compte', order: 4 },
]

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: 'company', label: 'Entreprise', description: 'Les informations utilisées par Kadria pour identifier et représenter votre entreprise.', href: '/parametres/entreprise', group: 'company', order: 1, icon: Building2, aliases: ['entreprise'] },
  { id: 'activity', label: 'Activité', description: 'Expliquez à Kadria les travaux que vous réalisez et les zones dans lesquelles vous intervenez.', href: '/parametres/activite', group: 'company', order: 2, icon: SlidersHorizontal, aliases: ['activite', 'profil-metier', 'catalogue'] },
  { id: 'assistants', label: 'Assistants', description: 'Configurez la manière dont Kadria accueille et accompagne vos clients.', href: '/parametres/assistants', group: 'clients', order: 1, icon: Bot, aliases: ['assistant', 'assistants', 'widget'] },
  { id: 'automations', label: 'Automatisations', description: 'Choisissez les actions que Kadria peut préparer, soumettre à validation ou exécuter.', href: '/parametres/automatisations', group: 'clients', order: 2, icon: SlidersHorizontal, aliases: ['automatisations'] },
  { id: 'connections', label: 'Connexions', description: 'Reliez Kadria aux services que vous utilisez au quotidien.', href: '/parametres/connexions', group: 'clients', order: 3, icon: Link2, aliases: ['connexions'] },
  { id: 'notifications', label: 'Notifications', description: 'Choisissez les événements pour lesquels Kadria doit vous prévenir.', href: '/parametres/notifications', group: 'clients', order: 4, icon: Bell, aliases: ['notifications'] },
  { id: 'team', label: 'Équipe', description: 'Gérez les personnes qui accèdent à l’entreprise et leurs responsabilités.', href: '/parametres/equipe', group: 'organization', order: 1, icon: UsersRound, aliases: ['equipe'] },
  { id: 'access', label: 'Accès et sécurité', description: 'Gérez votre connexion et la protection de votre compte.', href: '/parametres/acces', group: 'account', order: 1, icon: KeyRound, aliases: ['acces', 'securite'] },
  { id: 'billing', label: 'Abonnement', description: 'Consultez votre offre, votre utilisation et vos informations de facturation.', href: '/parametres/abonnement', group: 'account', order: 2, icon: CreditCard, aliases: ['abonnement'] },
]

export function getSettingsSection(id: SettingsSectionId) { return SETTINGS_SECTIONS.find((section) => section.id === id) }
export function getSettingsSectionsByGroup(group: SettingsGroupId) { return SETTINGS_SECTIONS.filter((section) => section.group === group).sort((left, right) => left.order - right.order) }
export function isSettingsSectionActive(section: SettingsSection, pathname: string) { return pathname === section.href || pathname.startsWith(`${section.href}/`) }

const LEGACY_QUERY_KEYS = ['stripe_connect'] as const

export function resolveLegacySettingsDestination(pathname: string, searchParams: URLSearchParams | Record<string, string | string[] | undefined> = new URLSearchParams()) {
  if (pathname === '/parametres/profil-metier') return getSettingsSection('activity')!.href
  if (pathname !== '/parametres') return null

  const rawSection = searchParams instanceof URLSearchParams ? searchParams.get('section') : searchParams.section
  const section = (Array.isArray(rawSection) ? rawSection[0] : rawSection || '').trim().toLocaleLowerCase('fr-FR')
  const destination = SETTINGS_SECTIONS.find((item) => item.aliases.includes(section)) || getSettingsSection('company')!
  const query = new URLSearchParams()
  for (const key of LEGACY_QUERY_KEYS) {
    const value = searchParams instanceof URLSearchParams ? searchParams.get(key) : searchParams[key]
    const normalized = Array.isArray(value) ? value[0] : value
    if (normalized) query.set(key, normalized)
  }
  const suffix = query.size ? `?${query.toString()}` : ''
  return `${destination.href}${suffix}`
}
