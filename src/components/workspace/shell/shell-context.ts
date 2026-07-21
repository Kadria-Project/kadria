export type ShellPageType =
  | 'dashboard'
  | 'tasks'
  | 'tracking'
  | 'calendar'
  | 'clients'
  | 'project'
  | 'performance'
  | 'settings'
  | 'resources'
  | 'unknown'

export type ShellEntityContext =
  | { type: 'project'; id: string; label?: string }
  | { type: 'client'; id: string; label?: string }

export type ShellCapabilities = {
  search: boolean
  collaborator: boolean
  createAppointment: boolean
  createQuote: boolean
  createProject: boolean
  createClient: boolean
}

export type ShellContextValue = {
  pageType: ShellPageType
  route: string
  section?: string
  entity?: ShellEntityContext
  capabilities: ShellCapabilities
}

export type ShellContextEnrichment = Pick<ShellContextValue, 'section' | 'entity'>

// New shell overlays use these layers in order. Existing dialogs are not
// migrated in S1; future components must not introduce arbitrary z-indexes.
export const SHELL_OVERLAY_LAYERS = {
  navigation: 40,
  topbar: 50,
  popover: 60,
  dialog: 70,
  collaborator: 80,
} as const

const NO_CREATION: ShellCapabilities = {
  search: true,
  collaborator: true,
  createAppointment: false,
  createQuote: false,
  createProject: false,
  createClient: false,
}

const SETTINGS_SECTIONS = new Set([
  'entreprise',
  'profil-metier',
  'assistants',
  'automatisations',
  'connexions',
  'notifications',
  'acces',
  'abonnement',
  'equipe',
])

function cleanPathname(pathname?: string | null) {
  const raw = typeof pathname === 'string' ? pathname : ''
  const path = raw.split(/[?#]/, 1)[0].trim()
  if (!path) return '/'
  return `/${path.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/')}`
}

export function getShellCapabilities(pageType: ShellPageType): ShellCapabilities {
  if (pageType === 'dashboard' || pageType === 'calendar') {
    return { ...NO_CREATION, createAppointment: true, createProject: true }
  }
  if (pageType === 'project') {
    return { ...NO_CREATION, createAppointment: true, createQuote: true, createProject: true }
  }
  if (pageType === 'resources' || pageType === 'unknown') {
    return { ...NO_CREATION, search: false, collaborator: false }
  }
  return { ...NO_CREATION }
}

export function getShellContextFromPathname(pathname?: string | null): ShellContextValue {
  const path = cleanPathname(pathname)
  const segments = path.split('/').filter(Boolean)
  let pageType: ShellPageType = 'unknown'
  let route = '/unknown'
  let section: string | undefined
  let entity: ShellEntityContext | undefined

  if (path === '/dashboard-v2') {
    pageType = 'dashboard'
    route = '/dashboard-v2'
  } else if (path === '/dashboard-v2/a-faire') {
    pageType = 'tasks'
    route = '/dashboard-v2/a-faire'
  } else if (path === '/dashboard-v2/suivi') {
    pageType = 'tracking'
    route = '/dashboard-v2/suivi'
  } else if (path === '/dashboard-v2/agenda') {
    pageType = 'calendar'
    route = '/dashboard-v2/agenda'
  } else if (path === '/dashboard-v2/clients') {
    pageType = 'clients'
    route = '/dashboard-v2/clients'
  } else if (segments[0] === 'dashboard-v2' && segments[1] === 'clients' && segments[2]) {
    pageType = 'clients'
    route = '/dashboard-v2/clients/[id]'
    entity = { type: 'client', id: segments[2] }
  } else if (path === '/dashboard-v2/performance') {
    pageType = 'performance'
    route = '/dashboard-v2/performance'
  } else if (segments[0] === 'dashboard-v2' && segments[1] === 'projet' && segments[2]) {
    pageType = 'project'
    route = '/dashboard-v2/projet/[id]'
    entity = { type: 'project', id: segments[2] }
  } else if (segments[0] === 'parametres') {
    pageType = 'settings'
    route = '/parametres'
    section = segments[1] && SETTINGS_SECTIONS.has(segments[1]) ? segments[1] : undefined
  } else if (segments[0] === 'ressources') {
    pageType = 'resources'
    route = '/ressources'
  }

  return { pageType, route, ...(section ? { section } : {}), ...(entity ? { entity } : {}), capabilities: getShellCapabilities(pageType) }
}

export function enrichShellContext(base: ShellContextValue, enrichment?: ShellContextEnrichment | null): ShellContextValue {
  if (!enrichment) return base
  const entity = enrichment.entity && !base.entity
    ? enrichment.entity
    : enrichment.entity && base.entity && enrichment.entity.type === base.entity.type
      ? { ...base.entity, ...(enrichment.entity.label ? { label: enrichment.entity.label } : {}) }
      : base.entity
  return {
    ...base,
    ...(enrichment.section ? { section: enrichment.section } : {}),
    ...(entity ? { entity } : {}),
  }
}
