'use client';

import { ProjectWorkspace } from './ProjectWorkspace';
import type { ProjectWorkspaceProps, ProjectWorkspaceTab } from './ProjectWorkspace.types';
import type { ReactNode } from 'react';

type LegacyProjectWorkspaceAdapterProps = {
  project: { id: string; projectType?: string | null; trade?: string | null; city?: string | null };
  projectTitle: string;
  clientLabel: string;
  latestDevis?: { amount?: number | null } | null;
  onBack: () => void;
  onCall?: () => void;
  onWrite?: () => void;
  onViewDevis?: () => void;
  onCommercial?: () => void;
  activeTab: ProjectWorkspaceTab;
  onTabChange: (tab: ProjectWorkspaceTab) => void;
  decisionSlot?: ReactNode;
  lifecycle?: unknown;
  currentStyle?: unknown;
  recommendedAction?: unknown;
  nextAction?: unknown;
  decision?: unknown;
  appointment?: unknown;
  responsibleName?: string | null;
  cleanedAiSummary?: string;
  situations?: unknown;
  activityItems?: unknown;
  activityUnavailable?: boolean;
  updating?: boolean;
  onCreateQuote?: () => void;
  onFollowUpQuote?: () => void;
  onEditProject?: () => void;
  onArchive?: () => void;
  formatDate?: unknown;
  formatDateTime?: unknown;
  formatAmount?: unknown;
  onMarkWon?: () => void;
  onMarkLost?: () => void;
};

/**
 * Compatibility boundary kept for old callers only. The compact route no longer mounts it.
 * Remaining migration work: legacy desktop-only editing dialogs, appointment creation and
 * commercial pipeline mutations; none of these are read or executed by the compact workspace.
 */
export function ProjectWorkspaceLegacyAdapter({ project, projectTitle, clientLabel, latestDevis, onBack, onCall, onWrite, onViewDevis, onCommercial, activeTab, onTabChange, decisionSlot }: LegacyProjectWorkspaceAdapterProps) {
  if (decisionSlot) return <>{decisionSlot}</>;
  const props: ProjectWorkspaceProps = {
    brief: {
      generatedAt: new Date().toISOString(), dataQuality: { level: 'partial', reservations: ['Le contrôleur desktop historique reste temporairement en place.'] },
      project: { id: project.id, title: projectTitle, stage: 'En cours', clientLabel: clientLabel || null, trade: project.trade || project.projectType || null, city: project.city || null },
      decision: { observedFacts: [], understanding: 'Le dossier est disponible dans son format compact.', evidenceLevel: 'weak' },
      qualification: { confirmed: [], missing: [], consequence: 'Les informations de qualification détaillées ne sont pas encore chargées.', evidenceLevel: 'weak' },
      commercialSummary: { state: latestDevis ? 'Devis disponible' : 'Aucun devis pertinent', observedFacts: [], understanding: 'Les détails commerciaux restent accessibles depuis leur espace dédié.', evidenceLevel: 'weak' },
      nextEngagement: { kind: 'none', label: 'Aucun engagement compact chargé', preparation: [], evidenceLevel: 'weak' },
      recentFacts: [], evidence: { photosCount: 0, documentsCount: 0, quoteAvailable: Boolean(latestDevis), recentEvidence: [], reservations: [] },
      capabilities: { canEditProject: false, canManageQuote: Boolean(onViewDevis), canPlanAppointment: false },
    },
    sections: { client: { status: 'not_loaded' }, documents: { status: 'not_loaded' }, commercial: { status: 'not_loaded' }, history: { status: 'not_loaded' }, engagement: { status: 'not_loaded' } },
    capabilities: {
      openClientContact: onCall || onWrite ? { available: true, state: 'ready', action: onCall || onWrite } : undefined,
      openDocuments: { available: false, state: 'unavailable' },
      openCommercial: onCommercial || onViewDevis ? { available: true, state: 'ready', action: onCommercial || onViewDevis } : undefined,
      openHistory: { available: false, state: 'unavailable' },
      openEngagement: { available: false, state: 'unavailable' },
      portal: { state: 'unavailable', execute: async () => ({ success: false, error: 'Utilisez le workspace compact.' }) },
      payment: { state: 'unavailable', execute: async () => ({ success: false, error: 'Utilisez le workspace compact.' }) },
      review: { state: 'unavailable', execute: async () => ({ success: false, error: 'Utilisez le workspace compact.' }) },
      sms: { state: 'unavailable', execute: async () => ({ success: false, error: 'Utilisez le workspace compact.' }) },
      pdf: { state: 'unavailable', execute: async () => ({ success: false, error: 'Utilisez le workspace compact.' }) },
      editProject: { state: 'unavailable', execute: async () => ({ success: false, error: 'Utilisez le workspace compact.' }) },
      createAppointment: { state: 'unavailable', execute: async () => ({ success: false, error: 'Utilisez le workspace compact.' }) },
      editAppointment: { state: 'unavailable', execute: async () => ({ success: false, error: 'Utilisez le workspace compact.' }) },
      cancelAppointment: { state: 'unavailable', execute: async () => ({ success: false, error: 'Utilisez le workspace compact.' }) },
      assignAppointment: { state: 'unavailable', execute: async () => ({ success: false, error: 'Utilisez le workspace compact.' }) },
      managePipeline: { state: 'unavailable', execute: async () => ({ success: false, error: 'Utilisez le workspace compact.' }) },
      openAgenda: { state: 'unavailable', execute: async () => ({ success: false, error: 'Utilisez le workspace compact.' }) },
    },
    navigation: { onBack, activeTab, onTabChange },
  };
  return <ProjectWorkspace {...props} />;
}
