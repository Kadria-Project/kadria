'use client';

import { useMemo, useState } from 'react';
import type { useRouter } from 'next/navigation';
import { Search, SearchX, PhoneCall, FolderOpen, Send, Bell } from 'lucide-react';
import { getProjectRiskStatus } from '@/src/lib/commercial-actions';
import { formatCurrency, BADGE_STYLES, type Project } from '@/src/components/ArtisanDashboard';

type Router = ReturnType<typeof useRouter>;

const cardBase: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '14px',
};

type QuickChip = 'all' | 'todo' | 'callback' | 'quote' | 'won' | 'lost' | 'urgent';

const CHIPS: { key: QuickChip; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'todo', label: 'À traiter' },
  { key: 'callback', label: 'À rappeler' },
  { key: 'quote', label: 'Devis' },
  { key: 'won', label: 'Gagnés' },
  { key: 'lost', label: 'Perdus' },
  { key: 'urgent', label: 'Urgents' },
];

function clientLabel(p: Project): string {
  return [(p as any).clientFirstName, (p as any).clientName].filter(Boolean).join(' ').trim();
}

function dossierTitle(p: Project): string {
  return (
    (p as any).projectType ||
    (p as any).trade ||
    (p as any).description ||
    'Dossier'
  );
}

function dossierLocation(p: Project): string | null {
  return (p as any).city || (p as any).siteAddress || (p as any).address || null;
}

function dossierAmount(p: Project): number {
  return Number((p as any).devisAmount) || 0;
}

function dossierPhone(p: Project): string | null {
  const phone = (p as any).clientPhone;
  return phone && String(phone).trim() ? String(phone).trim() : null;
}

// Statuts réels utilisés dans le pipeline (cf. pipelineSteps / STATUS_OPTIONS dans ArtisanDashboard.tsx)
const STATUS_BADGE_LABEL: Record<string, string> = {
  'Nouveau': 'Nouveau',
  'À rappeler': 'À rappeler',
  'Qualifié': 'Qualifié',
  'En cours': 'En cours',
  'Devis envoyé': 'Devis envoyé',
  'En risque': 'En risque',
  'A relancer': 'À relancer',
  'Gagné': 'Gagné',
  'Perdu': 'Perdu',
};

function statusOrdinal(p: Project): number {
  const status = (p as any).status as string | undefined;
  const risk = getProjectRiskStatus(p as any);

  if (risk.status === 'atRisk') return 0;
  if (status === 'A relancer' || risk.status === 'followUp') return 1;
  if (status === 'En risque') return 2;
  if (status === 'Qualifié' && dossierAmount(p) === 0) return 3; // devis à envoyer
  if (status === 'Nouveau' || status === 'À rappeler') return 4;
  if (status === 'Qualifié') return 5;
  if (status === 'Devis envoyé') return 6;
  if (status === 'Gagné') return 7;
  if (status === 'Perdu') return 8;
  return 9;
}

function urgencyLabel(p: Project): string | null {
  const risk = getProjectRiskStatus(p as any);
  const status = (p as any).status as string | undefined;

  if (status === 'Gagné' || status === 'Perdu') return null;
  if (risk.status === 'atRisk') return 'En retard';
  if (risk.status === 'followUp') return 'À relancer';

  const callbackDate = (p as any).callbackDate;
  if (callbackDate) {
    const d = new Date(callbackDate);
    if (!Number.isNaN(d.getTime())) {
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      if (sameDay) return "Aujourd'hui";
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      if (diffDays > 0 && diffDays <= 7) return 'Cette semaine';
    }
  }

  if (status === 'À rappeler') return 'En attente';

  return null;
}

function matchesChip(p: Project, chip: QuickChip): boolean {
  if (chip === 'all') return true;

  const status = (p as any).status as string | undefined;
  const risk = getProjectRiskStatus(p as any);

  if (chip === 'urgent') return risk.status === 'atRisk';
  if (chip === 'todo') return status === 'Nouveau' || status === 'Qualifié';
  if (chip === 'callback') return status === 'À rappeler' || status === 'A relancer' || risk.status === 'followUp';
  if (chip === 'quote') return status === 'Devis envoyé' || status === 'En risque';
  if (chip === 'won') return status === 'Gagné';
  if (chip === 'lost') return status === 'Perdu';

  return true;
}

export interface MobileDossiersViewProps {
  projects: Project[];
  router: Router;
}

export default function MobileDossiersView({ projects, router }: MobileDossiersViewProps) {
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<QuickChip>('all');

  const openProject = (id?: string) => {
    if (id) router.push(`/dashboard-v2/projet/${id}`);
  };

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
    () => [...filtered].sort((a, b) => statusOrdinal(a) - statusOrdinal(b)),
    [filtered],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '76px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Mes dossiers</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '4px 0 0' }}>
          Tous vos chantiers, demandes et actions à traiter.
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
          placeholder="Rechercher un dossier, client, ville..."
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
          <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Aucun dossier trouvé</p>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
            Essayez d&apos;élargir votre recherche ou vos filtres.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.map((project) => {
            const status = (project as any).status as string | undefined;
            const badgeStyle = BADGE_STYLES[status || ''] || { bg: 'var(--badge-new-bg)', color: 'var(--badge-new-text)' };
            const badgeLabel = STATUS_BADGE_LABEL[status || ''] || status || 'Inconnu';
            const risk = getProjectRiskStatus(project as any);
            const amount = dossierAmount(project);
            const phone = dossierPhone(project);
            const location = dossierLocation(project);
            const client = clientLabel(project);
            const urgency = urgencyLabel(project);
            const canRelance = risk.status === 'followUp';

            return (
              <div
                key={project.id}
                style={{ ...cardBase, boxShadow: risk.status === 'atRisk' ? 'var(--impact-glow)' : undefined }}
              >
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
                      background: badgeStyle.bg,
                      color: badgeStyle.color,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {badgeLabel}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>
                    {amount > 0 ? `💰 ${formatCurrency(amount)}` : '💰 Potentiel non renseigné'}
                  </span>
                  {urgency && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: risk.status === 'atRisk' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                        color: risk.status === 'atRisk' ? '#f87171' : '#fbbf24',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {urgency}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-1)',
                        fontWeight: 600,
                        borderRadius: '10px',
                        padding: '9px 0',
                        fontSize: '13px',
                        textDecoration: 'none',
                      }}
                    >
                      <PhoneCall style={{ width: 14, height: 14 }} />
                      Appeler
                    </a>
                  )}
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
                  <button
                    type="button"
                    onClick={() => openProject(project.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-1)',
                      fontWeight: 600,
                      borderRadius: '10px',
                      padding: '9px 0',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <Send style={{ width: 14, height: 14 }} />
                    Devis
                  </button>
                  {canRelance && (
                    <button
                      type="button"
                      onClick={() => openProject(project.id)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-1)',
                        fontWeight: 600,
                        borderRadius: '10px',
                        padding: '9px 0',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      <Bell style={{ width: 14, height: 14 }} />
                      Relancer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
