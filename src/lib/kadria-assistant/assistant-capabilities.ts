import type { AssistantIntent } from './assistant-intents'
import type { AssistantPageType } from './page-context'

export type AssistantPermission = 'assistant.use' | 'projects.read' | 'projects.write' | 'calendar.read' | 'performance.read' | 'settings.read'
export type AssistantResponseMode = 'deterministic' | 'data_with_openai' | 'conversation'
export type AssistantCapabilityStatus = 'available' | 'planned'

export interface AssistantCapability {
  id: string
  intents: readonly AssistantIntent[]
  allowedPageTypes: readonly AssistantPageType[]
  permission: AssistantPermission
  responseMode: AssistantResponseMode
  status: AssistantCapabilityStatus
  executor: string
}

// O1 registers the capabilities already backed by a real server-side action or
// tenant-scoped project read. O2-O4 add their deterministic data executors here.
export const ASSISTANT_CAPABILITIES: readonly AssistantCapability[] = [
  {
    id: 'project-read-summary',
    intents: ['project.summary', 'project.missing_information', 'project.next_action'],
    allowedPageTypes: ['project_detail'],
    permission: 'projects.read',
    responseMode: 'deterministic',
    status: 'available',
    executor: 'getProjectSummaryForAssistant',
  },
  {
    id: 'global-search',
    intents: ['search.open'],
    allowedPageTypes: ['dashboard_home', 'commercial_tracking', 'tasks', 'calendar', 'clients', 'performance', 'project_detail', 'settings'],
    permission: 'assistant.use',
    responseMode: 'deterministic',
    status: 'available',
    executor: 'openGlobalSearch',
  },
  {
    id: 'quick-create',
    intents: ['create.project', 'create.appointment', 'create.quote'],
    allowedPageTypes: ['dashboard_home', 'calendar', 'project_detail'],
    permission: 'projects.write',
    responseMode: 'deterministic',
    status: 'available',
    executor: 'openQuickCreate',
  },
  {
    id: 'tracking-insights',
    intents: ['tracking.blocked_projects', 'tracking.followups', 'tracking.next_actions'],
    allowedPageTypes: ['commercial_tracking', 'dashboard_home'],
    permission: 'projects.read',
    responseMode: 'deterministic',
    status: 'available',
    executor: 'getTrackingBriefForAssistant',
  },
  {
    id: 'performance-insights',
    intents: ['performance.summary', 'performance.explain_change', 'performance.contributing_projects'],
    allowedPageTypes: ['performance'],
    permission: 'performance.read',
    responseMode: 'data_with_openai',
    status: 'planned',
    executor: 'getPerformanceInsights',
  },
]

export function getAssistantCapability(intent: AssistantIntent): AssistantCapability | null {
  return ASSISTANT_CAPABILITIES.find((capability) => capability.intents.includes(intent)) || null
}

export function isAssistantIntentAvailable(intent: AssistantIntent, pageType: AssistantPageType): boolean {
  const capability = getAssistantCapability(intent)
  return Boolean(capability?.status === 'available' && capability.allowedPageTypes.includes(pageType))
}
