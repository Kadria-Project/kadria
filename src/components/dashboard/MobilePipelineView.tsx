'use client';

import { useMemo, useState } from 'react';
import type { useRouter } from 'next/navigation';
import { Search, SearchX, FolderOpen } from 'lucide-react';
import { formatCurrency, type Project } from '@/src/components/ArtisanDashboard';

type Router = ReturnType<typeof useRouter>;

const cardBase: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '14px',
};

type PipelineStage = 'new' | 'qualified' | 'quote' | 'won' | 'lost';

type QuickChip = 'all' | PipelineStage;

const CHIPS: { key: QuickChip; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'new', label: 'Nouveaux' },
  { key: 'qualified', label: 'Qualifiés' },
  { key: 'quote', label: 'Devis' },
  { key: 'won', label: 'Gagnés' },
  { key: 'lost', label: 'Perdus' },
];

const STAGE_LABEL: Record<PipelineStage, string> = {
  new: 'Nouveaux',
  qualified: 'Qualifiés',
  quote: 'Devis',
  won: 'Gagnés',
  lost: 'Perdus',
};

// Mapping des statuts réels du pipeline (cf. STATUS_OPTIONS / pipelineRemap
// dans ArtisanDashboard.tsx et MobileDashboardView.tsx) vers les 5 étapes
// commerciales attendues — pas d'invention de nouveaux statuts.
function getPipelineStage(p: Project): PipelineStage {
  const status = (p as any).status as string | undefined;

  if (status === 'Nouveau' || status === 'À rappeler') return 'new';
  if (status === 'Qualifié') return 'qualified';
  if (status === 'Devis envoyé' || status === 'A relancer' || status === 'En risque') return 'quote';
  if (status === 'Gagné') return 'won';
  if (status === 'Perdu') return 'lost';

  // Statut inconnu/non renseigné : on le traite comme "nouveau" par défaut,
  // cohérent avec le reste du pipeline.
  return 'new';
}

const STAGE_BADGE: Record<PipelineStage, { bg: string; color: string }> = {
  new: { bg: 'var(--badge-new-bg)', color: 'var(--badge-new-text)' },
  qualified: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
  quote: { bg: 'var(--badge-quote-bg)', color: 'var(--badge-quote-text)' },
  won: { bg: 'var(--badge-won-bg)', color: 'var(--badge-won-text)' },
  lost: { bg: 'var(--badge-lost-bg)', color: 'var(--badge-lost-text)' },
};

function stageOrdinal(stage: PipelineStage): number {
  switch (stage) {
    case 'new': return 0;
    case 'qualified': return 1;
    case 'quote': return 2;
    case 'won': return 3;
    case 'lost': return 4;
    default: return 5;
  }
}

function clientLabel(p: Project): string {
  return [(p as any).clientFirstName, (p as any).clientName].filter(Boolean).join(' ').trim();
}

function dossierTitle(p: Project): string {
  return (p as any).projectType || (p as any).trade || (p as any).description || 'Dossier';
}

function dossierLocation(p: Project): string | null {
  return (p as any).city || (p as any).siteAddress || (p as any).address || null;
}

function dossierAmount(p: Project): number {
  return Number((p as any).devisAmount) || Number((p as any).budget) || 0;
}

function matchesChip(p: Project, chip: QuickChip): boolean {
  if (chip === 'all') return true;
  return getPipelineStage(p) === chip;
}

export interface MobilePipelineViewProps {
  projects: Project[];
  router: Router;
  getProjectHref: (projectId: string) => string;
}

export default function MobilePipelineView({ projects, router, getProjectHref }: MobilePipelineViewProps) {
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<QuickChip>('all');

  const openProject = (id?: string) => {
    if (id) router.push(getProjectHref(id));
  };

  const recap = useMemo(() => {
    const counts: Record<PipelineStage, number> = { new: 0, qualified: 0, quote: 0, won: 0, lost: 0 };
    projects.forEach((p) => {
      counts[getPipelineStage(p)] += 1;
    });
    return counts;
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return projects.filter((p) => {
      if (!matchesChip(p, chip)) return false;
      if (!q) return true;

      const haystack = [dossierTitle(p), clientLabel(p), dossierLocation(p)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [projects, chip, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => stageOrdinal(getPipelineStage(a)) - stageOrdinal(getPipelineStage(b))),
    [filtered],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '76px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Pipeline complet</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '4px 0 0' }}>
          Suivez vos opportunités par étape commerciale.
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <Search
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 16,
            height: 16,
            color: 'var(--text-3)',
          }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une opportunité, un client..."
          style={{
            width: '100%',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            color: 'var(--text-1)',
            borderRadius: '10px',
            padding: '10px 12px 10px 36px',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {(Object.keys(STAGE_LABEL) as PipelineStage[]).map((stage) => (
          <div key={stage} style={{ ...cardBase, padding: '10px 12px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)' }}>{recap[stage]}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>{STAGE_LABEL[stage]}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setChip(c.key)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              border: chip === c.key ? '1px solid var(--accent-border)' : '1px solid var(--border)',
              background: chip === c.key ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              color: chip === c.key ? 'var(--accent)' : 'var(--text-2)',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
        {sorted.length} dossier{sorted.length > 1 ? 's' : ''}
      </div>

      {sorted.length === 0 ? (
        <div style={{ ...cardBase, textAlign: 'center', padding: '32px 16px' }}>
          <SearchX style={{ width: 32, height: 32, color: 'var(--text-3)', margin: '0 auto 10px' }} />
          <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Aucune opportunité trouvée</p>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
            Essayez d&apos;élargir votre recherche ou vos filtres.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.map((project) => {
            const stage = getPipelineStage(project);
            const badge = STAGE_BADGE[stage];
            const amount = dossierAmount(project);
            const location = dossierLocation(project);
            const client = clientLabel(project);
            const status = (project as any).status as string | undefined;

            return (
              <div key={project.id} style={cardBase}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>{dossierTitle(project)}</div>
                    {client && (
                      <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '3px' }}>👤 {client}</div>
                    )}
                    {location && (
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>📍 {location}</div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: badge.bg,
                      color: badge.color,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {status || STAGE_LABEL[stage]}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>
                    {amount > 0 ? `💰 ${formatCurrency(amount)}` : '💰 Potentiel non renseigné'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => openProject(project.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
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
                    <FolderOpen style={{ width: 14, height: 14 }} />
                    Ouvrir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
