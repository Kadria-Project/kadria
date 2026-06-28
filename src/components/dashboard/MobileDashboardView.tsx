'use client';

import { useState } from 'react';
import type { useRouter } from 'next/navigation';
import {
  PhoneCall,
  Send,
  Mail,
  AlertTriangle,
  CheckCircle,
  Plus,
  X,
  FolderOpen,
  Target,
  CalendarDays,
  Menu as MenuIcon,
  FileText,
  Bell,
  StickyNote,
  Target as TargetIcon,
  BarChart3,
  CreditCard,
  Settings,
  LifeBuoy,
} from 'lucide-react';
import {
  getProjectRiskStatus,
  isHotLead,
  getOpportunityBadge,
  type Task,
} from '@/src/lib/commercial-actions';
import {
  opportunityScore,
  formatCurrency,
  calcDelta,
  type Project,
  type FilterState,
  type DashboardMode,
} from '@/src/components/ArtisanDashboard';

type Router = ReturnType<typeof useRouter>;

type QuickFilter =
  | 'today' | 'overdue' | 'hot' | 'risk' | 'priority' | 'relance'
  | 'opportunities' | 'calls' | 'quotes' | 'followups' | null;

type KpiCard = {
  label: string;
  value: number;
  delta: number | null;
  icon: any;
  borderColor: string;
  format: (v: number) => string;
  alert?: boolean;
};

type PipelineStep = { label: string; value: number };

export interface MobileDashboardViewProps {
  firstName: string;
  artisanTrades: string[];
  priorityProjects: Project[];
  topOpportunities: Project[];
  hotLeads: Project[];
  riskProjects: Project[];
  todayTasks: Task[];
  pipelineSteps: PipelineStep[];
  kpiCards: KpiCard[];
  router: Router;
  dashboardMode?: DashboardMode;
  setDashboardMode: (mode: DashboardMode) => void;
  setFilters: (filters: FilterState | ((prev: FilterState) => FilterState)) => void;
  applyQuickFilter: (value: QuickFilter) => void;
  goToCommercialFilter: (value: 'calls' | 'quotes' | 'followups') => void;
  resetFilters: () => void;
  showToast: (message: string, error?: boolean) => void;
  getProjectHref: (projectId: string) => string;
  settingsHref: string;
  onSubscriptionClick: () => void;
  onSupportClick: () => void;
  createProject: (project: {
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    siteAddress: string;
  }) => Promise<{ success: boolean; projectId?: string; error?: string; project?: { id?: string } }> | { success: boolean; projectId?: string; error?: string; project?: { id?: string } };
}

function clientLabel(p: Project): string {
  return [(p as any).clientFirstName, (p as any).clientName].filter(Boolean).join(' ').trim() || (p as any).projectType || 'Dossier';
}

type ActionRow = {
  key: string;
  icon: string;
  text: string;
  urgency: number;
  projectId: string;
};

// Ordre de priorité produit du Centre d'actions : un même dossier ne doit
// afficher qu'une seule action, la plus importante selon cet ordre.
const ACTION_PRIORITY = {
  send_quote: 100,
  quote_followup: 90,
  call_back: 80,
  hot_prospect: 70,
  complete_project: 60,
} as const;

function buildActionRows(
  priorityProjects: Project[],
  todayTasks: Task[],
  riskProjects: Project[],
  hotLeads: Project[],
): ActionRow[] {
  const candidates: ActionRow[] = [];

  const addCandidate = (projectId: string | undefined, priority: number, icon: string, text: string, key: string) => {
    if (!projectId) return;
    candidates.push({ key, icon, text, urgency: priority, projectId });
  };

  for (const task of todayTasks) {
    const project = priorityProjects.find((p) => p.id === task.projectId);
    if (!project || task.type !== 'quote') continue;
    addCandidate(project.id, ACTION_PRIORITY.send_quote, '🔴', `Envoyer le devis — ${clientLabel(project)}`, `quote-${project.id}`);
  }

  for (const project of riskProjects) {
    const risk = getProjectRiskStatus(project as any);
    if (risk.status === 'atRisk') {
      addCandidate(project.id, ACTION_PRIORITY.quote_followup, '🔴', `Devis en risque — ${clientLabel(project)}`, `risk-${project.id}`);
    } else if (risk.status === 'followUp') {
      addCandidate(project.id, ACTION_PRIORITY.quote_followup, '🟠', `Relancer ${clientLabel(project)}`, `followup-${project.id}`);
    }
  }

  for (const task of todayTasks) {
    const project = priorityProjects.find((p) => p.id === task.projectId);
    if (!project) continue;
    if (task.type === 'call') {
      addCandidate(project.id, ACTION_PRIORITY.call_back, '📞', `Rappeler — ${clientLabel(project)}`, `call-${project.id}`);
    } else if (task.type === 'followUp' || task.type === 'email') {
      addCandidate(project.id, ACTION_PRIORITY.quote_followup, '🟠', `Relancer ${clientLabel(project)}`, `task-followup-${project.id}`);
    }
  }

  for (const project of hotLeads) {
    addCandidate(project.id, ACTION_PRIORITY.hot_prospect, '🟢', `Nouveau prospect chaud — ${clientLabel(project)}`, `hot-${project.id}`);
  }

  // 1 dossier = 1 action : on ne garde que la candidate la plus prioritaire
  // par projet (project.id, l'identifiant le plus fiable disponible ici).
  const bestByProject = new Map<string, ActionRow>();
  for (const candidate of candidates) {
    const existing = bestByProject.get(candidate.projectId);
    if (!existing || candidate.urgency > existing.urgency) {
      bestByProject.set(candidate.projectId, candidate);
    }
  }

  return Array.from(bestByProject.values()).sort((a, b) => b.urgency - a.urgency).slice(0, 6);
}

const cardBase: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '14px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text-2)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '10px',
};

export default function MobileDashboardView({
  firstName,
  priorityProjects,
  topOpportunities,
  hotLeads,
  riskProjects,
  todayTasks,
  pipelineSteps,
  kpiCards,
  router,
  dashboardMode = 'value',
  setDashboardMode,
  setFilters,
  applyQuickFilter,
  goToCommercialFilter,
  resetFilters,
  showToast,
  getProjectHref,
  settingsHref,
  onSubscriptionClick,
  onSupportClick,
  createProject,
}: MobileDashboardViewProps) {
  const [fabOpen, setFabOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ clientName: '', clientPhone: '', clientEmail: '', siteAddress: '' });

  const openProject = (projectId: string) => router.push(getProjectHref(projectId));

  const actionRows = buildActionRows(priorityProjects, todayTasks, riskProjects, hotLeads);

  const pipelineByLabel = Object.fromEntries(pipelineSteps.map((s) => [s.label, s.value]));
  const pipelineRemap = [
    { label: 'Nouveaux', value: (pipelineByLabel['Nouveau'] || 0) + (pipelineByLabel['À rappeler'] || 0), filter: 'value' as DashboardMode, quick: null as QuickFilter },
    { label: 'Qualifiés', value: pipelineByLabel['Qualifié'] || 0, filter: 'commercial' as DashboardMode, quick: null as QuickFilter },
    { label: 'Devis', value: (pipelineByLabel['Devis envoyé'] || 0) + (pipelineByLabel['A relancer'] || 0), filter: 'commercial' as DashboardMode, quick: 'quotes' as QuickFilter },
    { label: 'Gagnés', value: pipelineByLabel['Gagné'] || 0, filter: 'clients' as DashboardMode, quick: null as QuickFilter },
  ];

  const conversionCard = kpiCards.find((k) => k.label === 'Taux de conversion');
  const wonCard = kpiCards.find((k) => k.label === 'Chantiers gagnés');

  const submitCreate = async () => {
    if (!form.clientName.trim() || !form.clientPhone.trim() || !form.clientEmail.trim() || !form.siteAddress.trim()) {
      showToast('Merci de remplir tous les champs', true);
      return;
    }
    setCreating(true);
    try {
      const data = await createProject(form);
      if (data?.success) {
        showToast('Dossier créé');
        setCreateOpen(false);
        setFabOpen(false);
        setForm({ clientName: '', clientPhone: '', clientEmail: '', siteAddress: '' });
        const createdProjectId = data.projectId || data.project?.id;
        if (createdProjectId) router.push(getProjectHref(createdProjectId));
      } else {
        showToast(data?.error || 'Erreur lors de la création', true);
      }
    } catch {
      showToast('Erreur réseau', true);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '76px' }}>
      {/* HERO */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>
          {firstName ? `Bonjour ${firstName} 👋` : 'Bonjour 👋'}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '4px 0 0' }}>
          Voici vos priorités aujourd&apos;hui.
        </p>
        {priorityProjects.length > 0 && (
          <div
            style={{
              marginTop: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            🔥 {priorityProjects.length} action{priorityProjects.length > 1 ? 's' : ''} prioritaire{priorityProjects.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* CENTRE D'ACTIONS */}
      {actionRows.length > 0 && (
        <div>
          <div style={sectionTitle}>Centre d&apos;actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {actionRows.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => openProject(row.projectId)}
                style={{
                  ...cardBase,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: row.urgency >= 90 ? 'var(--impact-glow)' : undefined,
                  transition: 'opacity 150ms ease',
                }}
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>{row.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>{row.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI CAROUSEL */}
      <div>
        <div style={sectionTitle}>Indicateurs clés</div>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            paddingBottom: '4px',
            margin: '0 -2px',
          }}
        >
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                style={{
                  ...cardBase,
                  minWidth: '85%',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  borderLeft: `3px solid ${kpi.borderColor}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-2)', fontSize: '13px', fontWeight: 600 }}>
                  <Icon style={{ width: 16, height: 16 }} />
                  {kpi.label}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', marginTop: '6px' }}>
                  {kpi.format(kpi.value)}
                </div>
                {kpi.delta !== null && (
                  <div style={{ fontSize: '12px', color: kpi.delta >= 0 ? 'var(--accent)' : '#f87171', marginTop: '4px' }}>
                    {kpi.delta >= 0 ? '+' : ''}{kpi.delta.toFixed(0)}% vs période précédente
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* DOSSIERS IMPORTANTS */}
      {topOpportunities.length > 0 && (
        <div>
          <div style={sectionTitle}>Dossiers importants</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topOpportunities.map((project) => {
              const score = opportunityScore(project, []);
              const badge = getOpportunityBadge(score);
              const risk = getProjectRiskStatus(project as any);
              const hot = isHotLead(project as any);
              const amount = (project as any).devisAmount;
              return (
                <div key={project.id} style={{ ...cardBase, boxShadow: risk.status === 'atRisk' ? 'var(--impact-glow)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>{clientLabel(project)}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>{(project as any).status}</div>
                    </div>
                    {(risk.status !== 'none' || hot) && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: risk.status === 'atRisk' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                        color: risk.status === 'atRisk' ? '#f87171' : '#4ade80',
                        whiteSpace: 'nowrap',
                      }}>
                        {risk.status === 'atRisk' ? '⚠️ Urgent' : risk.status === 'followUp' ? '⏰ À relancer' : '🔥 Chaud'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}>
                      {badge.label} ({score}/100)
                    </span>
                    {amount ? (
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>{formatCurrency(amount)}</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => openProject(project.id!)}
                    style={{
                      marginTop: '10px',
                      width: '100%',
                      background: 'var(--accent)',
                      border: 'none',
                      color: '#052e16',
                      fontWeight: 700,
                      borderRadius: '10px',
                      padding: '9px 0',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Ouvrir
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PIPELINE */}
      <div>
        <div style={sectionTitle}>Pipeline</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {pipelineRemap.map((step) => (
            <button
              key={step.label}
              type="button"
              onClick={() => {
                setDashboardMode(step.filter);
                if (step.quick) applyQuickFilter(step.quick);
              }}
              style={{
                ...cardBase,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)' }}>{step.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>{step.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* VALEUR GÉNÉRÉE — uniquement des indicateurs non déjà visibles dans le carrousel KPI */}
      {(conversionCard || wonCard) && (
        <div>
          <div style={sectionTitle}>Valeur générée</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {conversionCard && (
              <div style={{ ...cardBase, padding: '8px 12px', flex: '1 1 auto' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Taux de conversion</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>{conversionCard.format(conversionCard.value)}</div>
              </div>
            )}
            {wonCard && (
              <div style={{ ...cardBase, padding: '8px 12px', flex: '1 1 auto' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Chantiers gagnés</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>{wonCard.format(wonCard.value)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {fabOpen && (
        <div
          className="kr-sheet-backdrop"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 70, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setFabOpen(false)}
        >
          <div
            className="kr-sheet-panel"
            style={{
              ...cardBase,
              width: '100%',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderTopLeftRadius: '18px',
              borderTopRightRadius: '18px',
              padding: '16px',
              paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Créer rapidement</span>
              <button type="button" onClick={() => setFabOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { setFabOpen(false); setCreateOpen(true); }}
                style={quickCreateRowStyle(true)}
              >
                <FolderOpen style={{ width: 20, height: 20, color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>Nouveau dossier</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Créer un nouveau dossier client</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setFabOpen(false); setDashboardMode('clients'); showToast('Sélectionnez un dossier pour créer un devis'); }}
                style={quickCreateRowStyle(false)}
              >
                <FileText style={{ width: 20, height: 20, color: 'var(--text-2)', flexShrink: 0 }} />
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>Nouveau devis</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Choisissez un dossier existant</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setFabOpen(false); setDashboardMode('clients'); showToast('Sélectionnez un dossier pour créer une relance'); }}
                style={quickCreateRowStyle(false)}
              >
                <Bell style={{ width: 20, height: 20, color: 'var(--text-2)', flexShrink: 0 }} />
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>Nouvelle relance</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Choisissez un dossier existant</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setFabOpen(false); setDashboardMode('clients'); showToast('Sélectionnez un dossier pour ajouter une note'); }}
                style={quickCreateRowStyle(false)}
              >
                <StickyNote style={{ width: 20, height: 20, color: 'var(--text-2)', flexShrink: 0 }} />
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>Ajouter une note</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Choisissez un dossier existant</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ ...cardBase, width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Nouveau dossier</span>
              <button type="button" onClick={() => setCreateOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {([
                { key: 'clientName', placeholder: 'Nom du client' },
                { key: 'clientPhone', placeholder: 'Téléphone' },
                { key: 'clientEmail', placeholder: 'Email' },
                { key: 'siteAddress', placeholder: 'Adresse du chantier' },
              ] as const).map((field) => (
                <input
                  key={field.key}
                  value={form[field.key]}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-1)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '14px',
                  }}
                />
              ))}
              <button
                type="button"
                disabled={creating}
                onClick={submitCreate}
                style={{
                  marginTop: '4px',
                  background: 'var(--accent)',
                  border: 'none',
                  color: '#052e16',
                  fontWeight: 700,
                  borderRadius: '10px',
                  padding: '10px 0',
                  fontSize: '14px',
                  cursor: 'pointer',
                  opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? 'Création...' : 'Créer le dossier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <MobileBottomNav
        dashboardMode={dashboardMode}
        setDashboardMode={setDashboardMode}
        goToCommercialFilter={goToCommercialFilter}
        onFabClick={() => setFabOpen(true)}
        onMenuClick={() => setMoreOpen(true)}
      />

      {moreOpen && (
        <div
          className="kr-sheet-backdrop"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="kr-sheet-panel"
            style={{
              width: '100%',
              maxHeight: '88dvh',
              minHeight: '75dvh',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              padding: '12px 16px',
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-1)' }}>Menu Kadria</div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '2px' }}>
                  Accédez aux espaces secondaires de pilotage.
                </div>
              </div>
              <button type="button" onClick={() => setMoreOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: '4px' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <MenuRow
                icon={TargetIcon}
                title="Pipeline complet"
                description="Toutes vos opportunités commerciales"
                onClick={() => { setMoreOpen(false); setDashboardMode('pipeline'); resetFilters(); }}
              />
              <MenuRow
                icon={BarChart3}
                title="Valeur générée"
                description="ROI, conversions et temps gagné"
                onClick={() => { setMoreOpen(false); setDashboardMode('value-report'); }}
              />
              <MenuRow
                icon={CalendarDays}
                title="Agenda"
                description="Rendez-vous, disponibilités et tournées"
                onClick={() => { setMoreOpen(false); setDashboardMode('calendar'); }}
              />
              <MenuRow
                icon={CreditCard}
                title="Mon abonnement"
                description="Facturation et gestion Stripe"
                onClick={() => {
                  setMoreOpen(false);
                  onSubscriptionClick();
                }}
              />
              <MenuRow
                icon={Settings}
                title="Paramètres"
                description="Préférences de votre compte"
                onClick={() => { setMoreOpen(false); router.push(settingsHref); }}
              />
              <MenuRow
                icon={LifeBuoy}
                title="Support"
                description="contact@kadria.fr"
                onClick={() => { setMoreOpen(false); onSupportClick(); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function navItemStyle(active = false): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    background: 'none',
    border: 'none',
    color: active ? 'var(--accent)' : 'var(--text-2)',
    fontSize: '11px',
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    padding: '4px 8px',
  };
}

export interface MobileBottomNavProps {
  dashboardMode: DashboardMode;
  setDashboardMode: (mode: DashboardMode) => void;
  goToCommercialFilter: (value: 'calls' | 'quotes' | 'followups') => void;
  onFabClick: () => void;
  onMenuClick: () => void;
}

export function MobileBottomNav({
  dashboardMode,
  setDashboardMode,
  goToCommercialFilter,
  onFabClick,
  onMenuClick,
}: MobileBottomNavProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(60px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 45,
      }}
    >
      <button type="button" onClick={() => setDashboardMode('value')} style={navItemStyle(dashboardMode === 'value')}>
        <Target style={{ width: 18, height: 18 }} />
        <span>Accueil</span>
      </button>
      <button type="button" onClick={() => setDashboardMode('clients')} style={navItemStyle(dashboardMode === 'clients')}>
        <FolderOpen style={{ width: 18, height: 18 }} />
        <span>Dossiers</span>
      </button>
      <div style={{ width: '64px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          aria-label="Créer"
          onClick={onFabClick}
          style={{
            position: 'relative',
            top: '-22px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#052e16',
            border: '4px solid var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--impact-glow), 0 6px 16px -4px rgba(34,197,94,0.45)',
            zIndex: 46,
            cursor: 'pointer',
            transition: 'transform 150ms ease',
          }}
          className="active:scale-95"
        >
          <Plus style={{ width: 26, height: 26 }} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => goToCommercialFilter('quotes')}
        style={navItemStyle(dashboardMode === 'commercial')}
      >
        <Send style={{ width: 18, height: 18 }} />
        <span>Devis</span>
      </button>
      <button type="button" onClick={onMenuClick} style={navItemStyle(dashboardMode === 'calendar')}>
        <MenuIcon style={{ width: 18, height: 18 }} />
        <span>Menu</span>
      </button>
    </div>
  );
}

function quickCreateRowStyle(primary: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: primary ? 'var(--accent-dim)' : 'var(--bg-hover)',
    border: primary ? '1px solid var(--accent-border)' : '1px solid var(--border)',
    borderRadius: '12px',
    padding: '12px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'transform 150ms ease',
  };
}

function MenuRow({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: any;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--bg-hover)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '12px',
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Icon style={{ width: 20, height: 20, color: disabled ? 'var(--text-3)' : 'var(--accent)', flexShrink: 0 }} />
      <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>{title}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{description}</span>
      </span>
      {disabled && (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '999px',
            background: 'rgba(148,163,184,0.15)',
            color: 'var(--text-3)',
            whiteSpace: 'nowrap',
          }}
        >
          Bientôt
        </span>
      )}
    </button>
  );
}
