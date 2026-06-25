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
  MoreHorizontal,
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
  setDashboardMode: (mode: DashboardMode) => void;
  setFilters: (filters: FilterState | ((prev: FilterState) => FilterState)) => void;
  applyQuickFilter: (value: QuickFilter) => void;
  goToCommercialFilter: (value: 'calls' | 'quotes' | 'followups') => void;
  resetFilters: () => void;
  showToast: (message: string, error?: boolean) => void;
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

function buildActionRows(
  priorityProjects: Project[],
  todayTasks: Task[],
  riskProjects: Project[],
  hotLeads: Project[],
): ActionRow[] {
  const rows: ActionRow[] = [];
  const seen = new Set<string>();

  const push = (row: ActionRow) => {
    const dedupeKey = `${row.projectId}-${row.icon}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    rows.push(row);
  };

  for (const project of riskProjects) {
    const risk = getProjectRiskStatus(project as any);
    if (risk.status === 'atRisk') {
      push({
        key: `risk-${project.id}`,
        icon: '🔴',
        text: `Devis en risque — ${clientLabel(project)}`,
        urgency: 100,
        projectId: project.id!,
      });
    } else if (risk.status === 'followUp') {
      push({
        key: `followup-${project.id}`,
        icon: '🟠',
        text: `Relancer ${clientLabel(project)}`,
        urgency: 80,
        projectId: project.id!,
      });
    }
  }

  for (const task of todayTasks) {
    const project = priorityProjects.find((p) => p.id === task.projectId);
    if (!project) continue;
    if (task.type === 'call') {
      push({
        key: `call-${project.id}`,
        icon: '📞',
        text: `Rappeler — ${clientLabel(project)}`,
        urgency: task.priority === 'high' ? 95 : 60,
        projectId: project.id!,
      });
    } else if (task.type === 'quote') {
      push({
        key: `quote-${project.id}`,
        icon: '🔴',
        text: `Envoyer le devis — ${clientLabel(project)}`,
        urgency: task.priority === 'high' ? 90 : 65,
        projectId: project.id!,
      });
    } else if (task.type === 'followUp' || task.type === 'email') {
      push({
        key: `task-followup-${project.id}`,
        icon: '🟠',
        text: `Relancer ${clientLabel(project)}`,
        urgency: 55,
        projectId: project.id!,
      });
    }
  }

  for (const project of hotLeads) {
    push({
      key: `hot-${project.id}`,
      icon: '🟢',
      text: `Nouveau prospect chaud — ${clientLabel(project)}`,
      urgency: 50,
      projectId: project.id!,
    });
  }

  return rows.sort((a, b) => b.urgency - a.urgency).slice(0, 6);
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
  setDashboardMode,
  setFilters,
  applyQuickFilter,
  goToCommercialFilter,
  resetFilters,
  showToast,
}: MobileDashboardViewProps) {
  const [fabOpen, setFabOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ clientName: '', clientPhone: '', clientEmail: '', siteAddress: '' });

  const openProject = (projectId: string) => router.push(`/dashboard-v2/projet/${projectId}`);

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
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data?.success) {
        showToast('Dossier créé');
        setCreateOpen(false);
        setFabOpen(false);
        setForm({ clientName: '', clientPhone: '', clientEmail: '', siteAddress: '' });
        router.push(data.project?.id ? `/dashboard-v2/projet/${data.project.id}` : '/dashboard-v2');
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

      {/* REPORTING — uniquement des indicateurs non déjà visibles dans le carrousel KPI */}
      {(conversionCard || wonCard) && (
        <div>
          <div style={sectionTitle}>Reporting</div>
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

      {/* FAB */}
      <button
        type="button"
        aria-label="Créer"
        onClick={() => setFabOpen(true)}
        style={{
          position: 'fixed',
          bottom: '76px',
          right: '16px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'var(--accent)',
          color: '#052e16',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--impact-glow)',
          zIndex: 40,
          cursor: 'pointer',
        }}
      >
        <Plus style={{ width: 24, height: 24 }} />
      </button>

      {fabOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setFabOpen(false)}
        >
          <div
            style={{ ...cardBase, width: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>Créer</span>
              <button type="button" onClick={() => setFabOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { setFabOpen(false); setCreateOpen(true); }}
                style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent)', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 600, textAlign: 'left', cursor: 'pointer' }}
              >
                Créer un dossier
              </button>
              <button
                type="button"
                onClick={() => { setFabOpen(false); setDashboardMode('clients'); showToast('Sélectionnez un dossier pour créer un devis'); }}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '10px', padding: '12px', fontSize: '14px', textAlign: 'left', cursor: 'pointer' }}
              >
                Créer un devis
              </button>
              <button
                type="button"
                onClick={() => { setFabOpen(false); setDashboardMode('clients'); showToast('Sélectionnez un dossier pour créer une relance'); }}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '10px', padding: '12px', fontSize: '14px', textAlign: 'left', cursor: 'pointer' }}
              >
                Créer une relance
              </button>
              <button
                type="button"
                onClick={() => { setFabOpen(false); setDashboardMode('clients'); showToast('Sélectionnez un dossier pour ajouter une note'); }}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '10px', padding: '12px', fontSize: '14px', textAlign: 'left', cursor: 'pointer' }}
              >
                Ajouter une note
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
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 45,
        }}
      >
        <button type="button" onClick={() => setDashboardMode('value')} style={navItemStyle()}>
          <Target style={{ width: 18, height: 18 }} />
          <span>Accueil</span>
        </button>
        <button type="button" onClick={() => setDashboardMode('clients')} style={navItemStyle()}>
          <FolderOpen style={{ width: 18, height: 18 }} />
          <span>Dossiers</span>
        </button>
        <button
          type="button"
          onClick={() => goToCommercialFilter('quotes')}
          style={navItemStyle()}
        >
          <Send style={{ width: 18, height: 18 }} />
          <span>Devis</span>
        </button>
        <button type="button" onClick={() => setDashboardMode('calendar')} style={navItemStyle()}>
          <CalendarDays style={{ width: 18, height: 18 }} />
          <span>Agenda</span>
        </button>
        <button type="button" onClick={() => setMoreOpen(true)} style={navItemStyle()}>
          <MoreHorizontal style={{ width: 18, height: 18 }} />
          <span>Plus</span>
        </button>
      </div>

      {moreOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 55, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setMoreOpen(false)}
        >
          <div
            style={{ ...cardBase, width: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '16px', marginBottom: '60px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { setMoreOpen(false); setDashboardMode('commercial'); resetFilters(); }}
                style={menuRowStyle()}
              >
                Pipeline complet
              </button>
              <button
                type="button"
                onClick={() => { setMoreOpen(false); setDashboardMode('value'); }}
                style={menuRowStyle()}
              >
                Reporting
              </button>
              <button
                type="button"
                onClick={() => { setMoreOpen(false); router.push('/parametres'); }}
                style={menuRowStyle()}
              >
                Paramètres
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function navItemStyle(): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    background: 'none',
    border: 'none',
    color: 'var(--text-2)',
    fontSize: '11px',
    cursor: 'pointer',
    padding: '4px 8px',
  };
}

function menuRowStyle(): React.CSSProperties {
  return {
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    color: 'var(--text-1)',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
  };
}
