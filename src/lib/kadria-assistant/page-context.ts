import { getShellContextFromPathname, type ShellContextValue } from '@/src/components/workspace/shell/shell-context'

export type AssistantPageType =
  | 'dashboard_home'
  | 'commercial_tracking'
  | 'tasks'
  | 'calendar'
  | 'clients'
  | 'performance'
  | 'project_detail'
  | 'settings'
  | 'unknown'

export interface AssistantPageContext {
  pageType: AssistantPageType
  route?: string
  section?: string
  projectId?: string
  projectTitle?: string
  clientName?: string
  status?: string
  lifecycleStage?: string
  recommendedAction?: string
}

export function toKadriaAssistantPageContext(shellContext: ShellContextValue): AssistantPageContext {
  const pageTypeByShellPage: Record<ShellContextValue['pageType'], AssistantPageType> = {
    dashboard: 'dashboard_home',
    tasks: 'tasks',
    tracking: 'commercial_tracking',
    calendar: 'calendar',
    clients: 'clients',
    project: 'project_detail',
    performance: 'performance',
    settings: 'settings',
    resources: 'unknown',
    unknown: 'unknown',
  }
  const project = shellContext.entity?.type === 'project' ? shellContext.entity : undefined
  return {
    pageType: pageTypeByShellPage[shellContext.pageType],
    route: shellContext.route,
    ...(shellContext.section ? { section: shellContext.section } : {}),
    ...(project ? { projectId: project.id, ...(project.label ? { projectTitle: project.label } : {}) } : {}),
  }
}

function sanitizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

export function inferAssistantPageType(pathname?: string | null): AssistantPageType {
  return toKadriaAssistantPageContext(getShellContextFromPathname(pathname)).pageType
}

export function sanitizeAssistantPageContext(raw: unknown): AssistantPageContext | null {
  if (!raw || typeof raw !== 'object') return null

  const source = raw as Record<string, unknown>
  const pageTypeRaw = sanitizeText(source.pageType, 40)
  const allowedPageTypes: AssistantPageType[] = [
    'dashboard_home',
    'commercial_tracking',
    'tasks',
    'calendar',
    'clients',
    'performance',
    'project_detail',
    'settings',
    'unknown',
  ]

  const pageType = allowedPageTypes.includes(pageTypeRaw as AssistantPageType)
    ? (pageTypeRaw as AssistantPageType)
    : 'unknown'
  const routeRaw = sanitizeText(source.route, 300)
  const normalizedRoute = routeRaw ? getShellContextFromPathname(routeRaw).route : undefined
  const sectionRaw = sanitizeText(source.section, 120)
  const normalizedSection = sectionRaw ? getShellContextFromPathname(`/parametres/${sectionRaw}`).section : undefined

  return {
    pageType,
    ...(normalizedRoute ? { route: normalizedRoute } : {}),
    ...(normalizedSection ? { section: normalizedSection } : {}),
    projectId: sanitizeText(source.projectId, 120),
    projectTitle: sanitizeText(source.projectTitle, 160),
    clientName: sanitizeText(source.clientName, 160),
    status: sanitizeText(source.status, 80),
    lifecycleStage: sanitizeText(source.lifecycleStage, 80),
    recommendedAction: sanitizeText(source.recommendedAction, 160),
  }
}
