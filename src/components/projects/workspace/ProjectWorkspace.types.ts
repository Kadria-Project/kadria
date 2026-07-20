import type { ProjectWorkspaceBrief as WorkspaceBriefDto } from '@/src/lib/projects/project-workspace-contract';

export type ProjectWorkspaceTab = 'activity' | 'commercial' | 'qualification' | 'planning' | 'documents';
export type ProjectWorkspaceBrief = WorkspaceBriefDto;

export type ProjectWorkspaceSection<T = never> =
  | { status: 'not_loaded' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'empty'; message?: string }
  | { status: 'error'; message?: string }
  | { status: 'unavailable'; message?: string };

export type ProjectWorkspaceSections = {
  client: ProjectWorkspaceSection;
  documents: ProjectWorkspaceSection;
  commercial: ProjectWorkspaceSection;
  history: ProjectWorkspaceSection;
  engagement: ProjectWorkspaceSection;
};

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
