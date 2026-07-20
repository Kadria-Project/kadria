/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ProjectSituations } from '@/src/lib/projects/project-situations';
import type { ReactNode } from 'react';

export type ProjectWorkspaceTab = 'activity' | 'commercial' | 'qualification' | 'planning' | 'documents';

export type ProjectWorkspaceProps = {
  decisionSlot?: ReactNode;
  project: any;
  projectTitle: string;
  clientLabel: string;
  lifecycle: any;
  currentStyle: { bg: string; text: string; border: string };
  recommendedAction: { title: string; meta?: string; ctaLabel: string; onClick?: () => void };
  nextAction: any;
  latestDevis: any;
  decision: any;
  appointment: any;
  responsibleName?: string | null;
  cleanedAiSummary?: string;
  situations: ProjectSituations;
  activityItems: any[];
  activityUnavailable: boolean;
  updating: boolean;
  onBack: () => void;
  onCall: () => void;
  onWrite: () => void;
  onViewDevis: () => void;
  onCommercial: () => void;
  onCreateQuote: () => void;
  onFollowUpQuote: () => void;
  onPlanAppointment: () => void;
  onEditProject: () => void;
  onExportPdf: () => void;
  onArchive: () => void;
  onOpenClientPortal?: () => void;
  formatDate: (value?: string | null, fallback?: string) => string;
  formatDateTime: (value?: string | null, fallback?: string) => string;
  formatAmount: (value?: number | null) => string;
  activeTab: ProjectWorkspaceTab;
  onTabChange: (tab: ProjectWorkspaceTab) => void;
  onMarkWon?: () => void;
  onMarkLost?: () => void;
};
