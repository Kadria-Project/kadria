'use client';

import { useMemo, useState } from 'react';
import type { useRouter } from 'next/navigation';
import { Search, SearchX, Send, Bell, FolderOpen, FileX } from 'lucide-react';
import { isQuoteExpired } from '@/src/lib/quote-followup';
import { formatCurrency, type Project } from '@/src/components/ArtisanDashboard';

type Router = ReturnType<typeof useRouter>;

const cardBase: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '14px',
};

type DevisStatus = 'to_send' | 'sent' | 'follow_up' | 'expired' | 'accepted' | 'refused';

type QuickChip = 'all' | 'to_send' | 'sent' | 'follow_up' | 'accepted' | 'refused' | 'expired';

const CHIPS: { key: QuickChip; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'to_send', label: 'À envoyer' },
  { key: 'sent', label: 'Envoyés' },
  { key: 'follow_up', label: 'À relancer' },
  { key: 'accepted', label: 'Acceptés' },
  { key: 'refused', label: 'Refusés' },
  { key: 'expired', label: 'Expirés' },
];

const DEVIS_STATUS_BADGE: Record<DevisStatus, { label: string; bg: string; color: string }> = {
  to_send: { label: 'À envoyer', bg: 'var(--badge-new-bg)', color: 'var(--badge-new-text)' },
  sent: { label: 'Envoyé', bg: 'var(--badge-quote-bg)', color: 'var(--badge-quote-text)' },
  follow_up: { label: 'À relancer', bg: 'var(--badge-callback-bg)', color: 'var(--badge-callback-text)' },
  expired: { label: 'Expiré', bg: 'var(--badge-risk-bg)', color: 'var(--badge-risk-text)' },
  accepted: { label: 'Accepté', bg: 'var(--badge-won-bg)', color: 'var(--badge-won-text)' },
  refused: { label: 'Refusé', bg: 'var(--badge-lost-bg)', color: 'var(--badge-lost-text)' },
};

function clientLabel(p: Project): string {
  return [(p as any).clientFirstName, (p as any).clientName].filter(Boolean).join(' ').trim();
}

function devisTitle(p: Project): string {
  return (p as any).projectType || (p as any).trade || (p as any).description || 'Devis';
}

function devisLocation(p: Project): string | null {
  return (p as any).city || (p as any).siteAddress || (p as any).address || null;
}

function devisAmount(p: Project): number {
  return Number((p as any).devisAmount) || 0;
}

// Un projet est "devis-relevant" dès qu'il a dépassé le stade purement
// prospect (Nouveau/À rappeler/Qualifié sans montant) — cf. statuts réels du
// pipeline (STATUS_OPTIONS dans ArtisanDashboard.tsx).
function isDevisRelevant(p: Project): boolean {
  const status = (p as any).status as string | undefined;
  if (status === 'Nouveau' || status === 'À rappeler') return false;
  if (status === 'Qualifié' && devisAmount(p) === 0 && !(p as any).quoteSentAt) return false;
  return true;
}

// Statut devis dérivé des champs réels disponibles sur Project :
// status, quoteSentAt, acceptedAt — pas de champ "viewed"/"motif" dans le
// modèle, donc pas de sous-état "Consulté" et pas de vrai motif de refus.
function getDevisStatus(p: Project): DevisStatus {
  const status = (p as any).status as string | undefined;
  const quoteSentAt = (p as any).quoteSentAt as string | null | undefined;
  const acceptedAt = (p as any).acceptedAt as string | null | undefined;

  if (status === 'Gagné' || acceptedAt) return 'accepted';
  if (status === 'Perdu') return 'refused';

  const expired = quoteSentAt ? isQuoteExpired({ quoteSentAt }) : false;
  if (expired) return 'expired';

  if (status === 'A relancer' || status === 'En risque') return 'follow_up';
  if (status === 'Devis envoyé' || quoteSentAt) return 'sent';

  // Qualifié avec montant mais pas encore envoyé.
  return 'to_send';
}

function devisDateLine(p: Project, devisStatus: DevisStatus): string | null {
  const quoteSentAt = (p as any).quoteSentAt as string | null | undefined;
  const callbackDate = (p as any).callbackDate as string | null | undefined;

  if (devisStatus === 'to_send') return "À envoyer aujourd'hui";

  if ((devisStatus === 'sent' || devisStatus === 'expired' || devisStatus === 'accepted' || devisStatus === 'refused') && quoteSentAt) {
    const d = new Date(quoteSentAt);
    if (!Number.isNaN(d.getTime())) {
      return `Envoyé le ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }
  }

  if (devisStatus === 'follow_up' && callbackDate) {
    const d = new Date(callbackDate);
    if (!Number.isNaN(d.getTime())) {
      return `Relance prévue ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }
  }

  if (devisStatus === 'follow_up' && quoteSentAt) {
    const d = new Date(quoteSentAt);
    if (!Number.isNaN(d.getTime())) {
      return `Envoyé le ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }
  }

  return null;
}

function devisOrdinal(p: Project): number {
  const devisStatus = getDevisStatus(p);
  switch (devisStatus) {
    case 'to_send':
      return 0;
    case 'follow_up':
      return 1;
    case 'expired':
      return 2;
    case 'sent':
      return 3;
    case 'accepted':
      return 4;
    case 'refused':
      return 5;
    default:
      return 6;
  }
}

function matchesChip(p: Project, chip: QuickChip): boolean {
  if (chip === 'all') return true;
  const devisStatus = getDevisStatus(p);
  if (chip === 'to_send') return devisStatus === 'to_send';
  if (chip === 'sent') return devisStatus === 'sent';
  if (chip === 'follow_up') return devisStatus === 'follow_up';
  if (chip === 'accepted') return devisStatus === 'accepted';
  if (chip === 'refused') return devisStatus === 'refused';
  if (chip === 'expired') return devisStatus === 'expired';
  return true;
}

export interface MobileDevisViewProps {
  projects: Project[];
  router: Router;
}

export default function MobileDevisView({ projects, router }: MobileDevisViewProps) {
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<QuickChip>('all');

  const openProject = (id?: string) => {
    if (id) router.push(`/dashboard-v2/projet/${id}`);
  };

  const devisProjects = useMemo(() => projects.filter(isDevisRelevant), [projects]);

  const recap = useMemo(() => {
    let toSend = 0;
    let followUp = 0;
    let accepted = 0;
    let refused = 0;
    devisProjects.forEach((p) => {
      const s = getDevisStatus(p);
      if (s === 'to_send') toSend += 1;
      else if (s === 'follow_up') followUp += 1;
      else if (s === 'accepted') accepted += 1;
      else if (s === 'refused') refused += 1;
    });
    return { toSend, followUp, accepted, refused };
  }, [devisProjects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return devisProjects.filter((p) => {
      if (!matchesChip(p, chip)) return false;
      if (!q) return true;

      const haystack = [devisTitle(p), clientLabel(p), devisLocation(p)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [devisProjects, chip, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => devisOrdinal(a) - devisOrdinal(b)),
    [filtered],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '76px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Mes devis</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '4px 0 0' }}>
          Suivez tous vos devis et les actions à effectuer.
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
          placeholder="Rechercher un devis, un client..."
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
        <div style={{ ...cardBase, padding: '10px 12px' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)' }}>{recap.toSend}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>À envoyer</div>
        </div>
        <div style={{ ...cardBase, padding: '10px 12px' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)' }}>{recap.followUp}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>À relancer</div>
        </div>
        <div style={{ ...cardBase, padding: '10px 12px' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)' }}>{recap.accepted}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>Acceptés</div>
        </div>
        <div style={{ ...cardBase, padding: '10px 12px' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)' }}>{recap.refused}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>Refusés</div>
        </div>
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
        {sorted.length} devis
      </div>

      {sorted.length === 0 ? (
        <div style={{ ...cardBase, textAlign: 'center', padding: '32px 16px' }}>
          <SearchX style={{ width: 32, height: 32, color: 'var(--text-3)', margin: '0 auto 10px' }} />
          <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Aucun devis trouvé</p>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
            Essayez d&apos;élargir votre recherche ou vos filtres.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.map((project) => {
            const devisStatus = getDevisStatus(project);
            const badge = DEVIS_STATUS_BADGE[devisStatus];
            const amount = devisAmount(project);
            const location = devisLocation(project);
            const client = clientLabel(project);
            const dateLine = devisDateLine(project, devisStatus);

            let primaryLabel = 'Ouvrir';
            let PrimaryIcon = FolderOpen;
            if (devisStatus === 'to_send') {
              primaryLabel = 'Envoyer';
              PrimaryIcon = Send;
            } else if (devisStatus === 'sent' || devisStatus === 'follow_up' || devisStatus === 'expired') {
              primaryLabel = 'Relancer';
              PrimaryIcon = Bell;
            } else if (devisStatus === 'accepted') {
              primaryLabel = 'Voir le chantier';
              PrimaryIcon = FolderOpen;
            } else if (devisStatus === 'refused') {
              // Pas de champ "motif" sur Project : fallback honnête vers le dossier.
              primaryLabel = 'Voir le dossier';
              PrimaryIcon = FileX;
            }

            const showSecondaryOuvrir = primaryLabel !== 'Ouvrir';

            return (
              <div key={project.id} style={cardBase}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>{devisTitle(project)}</div>
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
                    {badge.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>
                    {amount > 0 ? `💰 ${formatCurrency(amount)}` : '💰 Montant non renseigné'}
                  </span>
                  {dateLine && (
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{dateLine}</span>
                  )}
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
                    <PrimaryIcon style={{ width: 14, height: 14 }} />
                    {primaryLabel}
                  </button>
                  {showSecondaryOuvrir && (
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
                      <FolderOpen style={{ width: 14, height: 14 }} />
                      Ouvrir
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
