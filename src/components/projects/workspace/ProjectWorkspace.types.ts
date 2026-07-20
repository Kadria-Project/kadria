import type { ProjectWorkspaceBrief as WorkspaceBriefDto } from '@/src/lib/projects/project-workspace-contract';
import type { ProjectWorkspaceSectionData, ProjectWorkspaceSectionKey } from '@/src/lib/projects/project-workspace-section-contract';

export type ProjectWorkspaceTab = 'activity' | 'commercial' | 'qualification' | 'planning' | 'documents';
export type ProjectWorkspaceBrief = WorkspaceBriefDto;

export type ProjectWorkspaceSection<T = unknown> =
  | { status: 'not_loaded' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'empty'; message?: string }
  | { status: 'error'; message?: string }
  | { status: 'unavailable'; message?: string };

export type ProjectWorkspaceSections = { [K in ProjectWorkspaceSectionKey]: ProjectWorkspaceSection<ProjectWorkspaceSectionData[K]> };

export type ProjectWorkspaceCapability = {
  available: boolean;
  state: 'ready' | 'loading' | 'unavailable' | 'error';
  action?: () => void;
};

export type ProjectWorkspaceCapabilities = {
  openClientContact?: ProjectWorkspaceCapability;
  openDocuments?: ProjectWorkspaceCapability;
  openCommercial?: ProjectWorkspaceCapability;
  openHistory?: ProjectWorkspaceCapability;
  openEngagement?: ProjectWorkspaceCapability;
  openClientPortal?: ProjectWorkspaceCapability;
  managePayment?: ProjectWorkspaceCapability;
  manageReview?: ProjectWorkspaceCapability;
  sendSms?: ProjectWorkspaceCapability;
  managePdf?: ProjectWorkspaceCapability;
};

export type ProjectWorkspaceNavigation = {
  onBack?: () => void;
  activeTab: ProjectWorkspaceTab;
  onTabChange: (tab: ProjectWorkspaceTab) => void;
};

export type ProjectWorkspaceProps = {
  brief: ProjectWorkspaceBrief;
  sections: ProjectWorkspaceSections;
  capabilities: ProjectWorkspaceCapabilities;
  navigation: ProjectWorkspaceNavigation;
};
