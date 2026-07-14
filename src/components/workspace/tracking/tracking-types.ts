import type { Project } from '@/src/components/ArtisanDashboard';

export type PipelineStageId = 'new' | 'qualify' | 'qualified' | 'quote_preparation' | 'quote_sent' | 'decision';

export type CommercialTemperature = {
  label: 'Froide' | 'À surveiller' | 'Chaude' | 'À évaluer';
  tone: 'slate' | 'amber' | 'orange' | 'emerald';
  reason: string;
};

export type CommercialMomentum = {
  label: 'Progression' | 'Stable' | 'Ralentissement' | 'À évaluer';
  tone: 'emerald' | 'slate' | 'amber';
  reason: string;
};

export type TrackingProject = {
  project: Project;
  stage: PipelineStageId;
  stageLabel: string;
  clientLabel: string;
  projectLabel: string;
  amount: number | null;
  amountLabel: 'Montant du devis' | 'Budget déclaré' | null;
  lastActivityLabel: string;
  ageLabel: string | null;
  temperature: CommercialTemperature;
  momentum: CommercialMomentum;
  nextDecision: string;
  reason: string;
  isRisk: boolean;
};

export type TrackingStage = {
  id: PipelineStageId;
  label: string;
};
