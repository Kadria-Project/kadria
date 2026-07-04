export type AssistantPageType =
  | 'dashboard_home'
  | 'commercial_tracking'
  | 'tasks'
  | 'calendar'
  | 'project_detail'
  | 'settings'
  | 'unknown'

export interface AssistantPageContext {
  pageType: AssistantPageType
  projectId?: string
  projectTitle?: string
  clientName?: string
  status?: string
  lifecycleStage?: string
  recommendedAction?: string
}

function sanitizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

export function inferAssistantPageType(pathname?: string | null): AssistantPageType {
  if (!pathname) return 'unknown'
  if (pathname.startsWith('/dashboard-v2/projet/')) return 'project_detail'
  if (pathname.startsWith('/parametres')) return 'settings'
  if (pathname === '/dashboard-v2') return 'dashboard_home'
  if (pathname.startsWith('/dashboard-v2')) return 'dashboard_home'
  return 'unknown'
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
    'project_detail',
    'settings',
    'unknown',
  ]

  const pageType = allowedPageTypes.includes(pageTypeRaw as AssistantPageType)
    ? (pageTypeRaw as AssistantPageType)
    : 'unknown'

  return {
    pageType,
    projectId: sanitizeText(source.projectId, 120),
    projectTitle: sanitizeText(source.projectTitle, 160),
    clientName: sanitizeText(source.clientName, 160),
    status: sanitizeText(source.status, 80),
    lifecycleStage: sanitizeText(source.lifecycleStage, 80),
    recommendedAction: sanitizeText(source.recommendedAction, 160),
  }
}
