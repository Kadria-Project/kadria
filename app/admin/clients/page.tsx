'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Download } from 'lucide-react';
import AdminBadge, { type AdminBadgeTone } from '@/src/components/admin/AdminBadge';
import AdminEmptyState from '@/src/components/admin/AdminEmptyState';
import AdminTable from '@/src/components/admin/AdminTable';

interface ClientUsage {
  projectsThisMonth: number;
  projectLimit: number | null;
  projectUsageLabel: string;
  voiceCallsThisMonth: number;
  voiceCallLimit: number | null;
  voiceCallUsageLabel: string;
  voiceMinutesThisMonth: number;
  voiceMinuteLimit: number | null;
  voiceMinuteUsageLabel: string;
  devisThisMonth?: number;
  devisLimit?: number | null;
  devisUsageLabel?: string;
}

type ClientHealthStatus = 'healthy' | 'watch' | 'quota_warning' | 'upgrade_opportunity' | 'inactive';

interface ClientHealth {
  status: ClientHealthStatus;
  label: string;
  reasons: string[];
  recommendation: string;
}

interface ClientFeatures {
  pdfExports: boolean;
  advancedPipeline: boolean;
  autoFollowups: boolean;
  voiceAssistant: boolean;
  quoteAssistant: boolean;
  multiUsers: boolean;
}

type AlertLevel = 'ok' | 'warning' | 'danger';

interface ClientAlerts {
  level: AlertLevel;
  messages: string[];
}

type SetupProgressBandKey = 'a_demarrer' | 'a_completer' | 'presque_pret' | 'complet';

interface SetupProgressSummary {
  percent: number;
  completedSteps: number;
  totalSteps: number;
  stepsRemaining: number;
  band: { key: SetupProgressBandKey; label: string };
  dataAvailable: boolean;
}

interface ClientRecord {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  role: string;
  plan: string;
  statut: string;
  trial_end_date: string;
  subscription_start: string;
  next_billing: string;
  last_login: string;
  created_at: string;
  artisan_id: string;
  artisanId?: string;
  detailId?: string;
  planLabel?: string;
  status?: string;
  usage?: ClientUsage;
  features?: ClientFeatures;
  alerts?: ClientAlerts;
  health?: ClientHealth;
  setupProgress?: SetupProgressSummary | null;
}

const SETUP_BAND_TONE: Record<SetupProgressBandKey, AdminBadgeTone> = {
  a_demarrer: 'danger',
  a_completer: 'warning',
  presque_pret: 'info',
  complet: 'success',
};

function SetupProgressCell({ setupProgress }: { setupProgress?: SetupProgressSummary | null }) {
  if (!setupProgress) {
    return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>Données configuration indisponibles</span>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontWeight: 700, fontSize: '13px' }}>{setupProgress.percent}%</span>
      <div style={{ width: 'fit-content' }}>
        <AdminBadge label={setupProgress.band.label} tone={SETUP_BAND_TONE[setupProgress.band.key]} variant="setup" size="sm" />
      </div>
      {setupProgress.stepsRemaining > 0 && (
        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
          {setupProgress.stepsRemaining} étape{setupProgress.stepsRemaining > 1 ? 's' : ''} restante{setupProgress.stepsRemaining > 1 ? 's' : ''}
        </span>
      )}
      {!setupProgress.dataAvailable && (
        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Données partielles</span>
      )}
    </div>
  );
}

const PLAN_TONE: Record<string, AdminBadgeTone> = {
  'Essentiel': 'neutral',
  'Performance': 'success',
  'Agence': 'warning',
};

const STATUT_TONE: Record<string, AdminBadgeTone> = {
  'Trial': 'info',
  'Actif': 'success',
  'Suspendu': 'warning',
  'Résilié': 'danger',
};

const ALERT_TONE: Record<AlertLevel, AdminBadgeTone> = {
  ok: 'success',
  warning: 'warning',
  danger: 'danger',
};

const ALERT_LABEL: Record<AlertLevel, string> = {
  ok: 'OK',
  warning: 'Attention',
  danger: 'Danger',
};

const HEALTH_TONE: Record<ClientHealthStatus, AdminBadgeTone> = {
  healthy: 'success',
  watch: 'neutral',
  quota_warning: 'warning',
  upgrade_opportunity: 'success',
  inactive: 'danger',
};

const FEATURE_LABELS: Record<keyof ClientFeatures, string> = {
  pdfExports: 'Export PDF',
  advancedPipeline: 'Pipeline avancé',
  autoFollowups: 'Relances auto',
  voiceAssistant: 'Assistant vocal',
  quoteAssistant: 'Devis IA',
  multiUsers: 'Multi-utilisateurs',
};

function AlertBadge({ alerts }: { alerts?: ClientAlerts }) {
  const level = alerts?.level ?? 'ok';
  return <AdminBadge label={ALERT_LABEL[level]} tone={ALERT_TONE[level]} variant="alert" />;
}

function FeatureBadges({ features }: { features?: ClientFeatures }) {
  if (!features) {
    return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>Non renseigné</span>;
  }
  const active = (Object.keys(FEATURE_LABELS) as (keyof ClientFeatures)[]).filter((key) => features[key]);
  if (active.length === 0) {
    return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>Aucune</span>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {active.map((key) => (
        <AdminBadge key={key} label={FEATURE_LABELS[key]} tone="success" variant="feature" size="sm" />
      ))}
    </div>
  );
}

function HealthBadge({ health }: { health?: ClientHealth }) {
  if (!health) {
    return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>;
  }
  return <AdminBadge label={health.label} tone={HEALTH_TONE[health.status]} variant="health" title={health.reasons.join(' · ')} />;
}

function AlertMessages({ alerts }: { alerts?: ClientAlerts }) {
  if (!alerts || alerts.messages.length === 0) {
    return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>Aucune alerte</span>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {alerts.messages.map((message, i) => (
        <span key={i} style={{ fontSize: '12px', color: 'var(--text-2)' }}>{message}</span>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatLastLogin(value: string) {
  if (!value) return 'Jamais';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Jamais';
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Il y a 1 jour';
  return `Il y a ${days} jours`;
}

function initials(firstName: string, lastName: string, email: string) {
  const a = (firstName || '').trim()[0];
  const b = (lastName || '').trim()[0];
  if (a && b) return (a + b).toUpperCase();
  if (a) return a.toUpperCase();
  return (email || '?')[0].toUpperCase();
}

function exportCsv(clients: ClientRecord[]) {
  const headers = ['Email', 'Prénom', 'Nom', 'Entreprise', 'Plan', 'Statut', 'Inscrit le', 'Dernière connexion'];
  const rows = clients.map((c) => [
    c.email,
    c.first_name,
    c.last_name,
    c.company,
    c.plan,
    c.statut,
    formatDate(c.created_at),
    formatLastLogin(c.last_login),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'clients-kadria.csv';
  link.click();
  URL.revokeObjectURL(url);
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: 'var(--text-1)',
  fontSize: '13px',
  padding: '10px 12px',
};

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('Tous');
  const [statutFilter, setStatutFilter] = useState('Tous');

  useEffect(() => {
    fetch('/api/admin/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        console.log('[ADMIN CLIENTS] API payload', data[0]);
        (data as ClientRecord[]).forEach((c) => {
          if (!c.detailId) {
            console.warn('[ADMIN CLIENTS] Client sans identifiant de navigation (id et artisanId vides) :', c);
          }
        });
        setClients(data);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!clients) return [];
    const term = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (planFilter !== 'Tous' && c.plan !== planFilter) return false;
      if (statutFilter !== 'Tous' && c.statut !== statutFilter) return false;
      if (term) {
        const haystack = `${c.first_name} ${c.last_name} ${c.email} ${c.company}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [clients, search, planFilter, statutFilter]);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Artisans</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: '4px 0 0' }}>Gestion des comptes artisans</p>
      </div>

      {loading && <p style={{ color: 'var(--text-2)' }}>Chargement...</p>}
      {error && <p style={{ color: 'var(--status-lost)' }}>{error}</p>}

      {clients && (
        <>
          <div className="admin-toolbar" style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input
                type="text"
                placeholder="Nom, email, entreprise..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, width: '100%', paddingLeft: '34px' }}
              />
            </div>
            <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={inputStyle}>
              <option value="Tous">Tous les plans</option>
              <option value="Essentiel">Essentiel</option>
              <option value="Performance">Performance</option>
              <option value="Agence">Agence</option>
            </select>
            <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} style={inputStyle}>
              <option value="Tous">Tous les statuts</option>
              <option value="Trial">Trial</option>
              <option value="Actif">Actif</option>
              <option value="Suspendu">Suspendu</option>
              <option value="Résilié">Résilié</option>
            </select>
            <button
              onClick={() => exportCsv(filtered)}
              style={{
                ...inputStyle,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '12px' }}>
            {filtered.length} artisan{filtered.length === 1 ? '' : 's'} trouvé{filtered.length === 1 ? '' : 's'}
          </p>

          {/* Desktop : tableau cockpit */}
          <AdminTable className="admin-clients-table-wrap">
            <thead>
                  <tr style={{ background: 'var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Artisan</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Artisan ID</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Plan</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Statut</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Santé</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Configuration</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Dossiers</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Devis</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Appels vocaux</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Minutes vocales</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Fonctionnalités</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Alertes</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={13}>
                        <AdminEmptyState compact title="Aucun artisan trouvé" description="Aucun artisan ne correspond aux filtres actuels." />
                      </td>
                    </tr>
                  )}
                  {filtered.map((c, i) => (
                    <tr
                      key={c.id || c.detailId || i}
                      onClick={() => c.detailId && router.push(`/admin/clients/${c.detailId}`)}
                      style={{
                        borderTop: '1px solid var(--border)',
                        background: i % 2 === 0 ? 'var(--bg-elevated)' : 'var(--bg)',
                        cursor: c.detailId ? 'pointer' : 'default',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? 'var(--bg-elevated)' : 'var(--bg)')}
                    >
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'var(--border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'var(--accent)',
                              flexShrink: 0,
                            }}
                          >
                            {initials(c.first_name, c.last_name, c.email)}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600 }}>{`${c.first_name} ${c.last_name}`.trim() || '—'}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-2)' }}>{c.email}</p>
                            {c.company && <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)' }}>{c.company}</p>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-2)', fontFamily: 'monospace', fontSize: '12px' }}>
                        {c.artisanId || c.artisan_id || 'Non renseigné'}
                      </td>
                      <td style={{ padding: '12px 20px' }}><AdminBadge label={c.planLabel || c.plan} tone={PLAN_TONE[c.planLabel || c.plan] || 'neutral'} variant="plan" /></td>
                      <td style={{ padding: '12px 20px' }}><AdminBadge label={c.status || c.statut} tone={STATUT_TONE[c.status || c.statut] || 'neutral'} variant="status" /></td>
                      <td style={{ padding: '12px 20px' }}><HealthBadge health={c.health} /></td>
                      <td style={{ padding: '12px 20px', minWidth: '150px' }}><SetupProgressCell setupProgress={c.setupProgress} /></td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-1)' }}>{c.usage?.projectUsageLabel || 'Non disponible'}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-1)' }}>{c.usage?.devisUsageLabel || 'Non disponible'}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-1)' }}>{c.usage?.voiceCallUsageLabel || 'Non disponible'}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-1)' }}>{c.usage?.voiceMinuteUsageLabel || 'Non disponible'}</td>
                      <td style={{ padding: '12px 20px', minWidth: '180px' }}><FeatureBadges features={c.features} /></td>
                      <td style={{ padding: '12px 20px', minWidth: '160px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <AlertBadge alerts={c.alerts} />
                          <AlertMessages alerts={c.alerts} />
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        {c.detailId ? (
                          <Link
                            href={`/admin/clients/${c.detailId}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                          >
                            Voir le détail →
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-3)', fontSize: '13px', fontWeight: 600 }}>ID manquant</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
          </AdminTable>

          {/* Mobile : cards empilées */}
          <div className="admin-clients-cards">
            {filtered.length === 0 && (
              <AdminEmptyState title="Aucun artisan trouvé" description="Aucun artisan ne correspond aux filtres actuels." />
            )}
            {filtered.map((c) => (
              <div
                key={c.id || c.detailId}
                onClick={() => c.detailId && router.push(`/admin/clients/${c.detailId}`)}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '12px',
                  cursor: c.detailId ? 'pointer' : 'default',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      flexShrink: 0,
                    }}
                  >
                    {initials(c.first_name, c.last_name, c.email)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{`${c.first_name} ${c.last_name}`.trim() || '—'}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</p>
                    {c.company && <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)' }}>{c.company}</p>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <AdminBadge label={c.planLabel || c.plan} tone={PLAN_TONE[c.planLabel || c.plan] || 'neutral'} variant="plan" />
                  <AdminBadge label={c.status || c.statut} tone={STATUT_TONE[c.status || c.statut] || 'neutral'} variant="status" />
                  <HealthBadge health={c.health} />
                  <AlertBadge alerts={c.alerts} />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>Configuration</p>
                  <SetupProgressCell setupProgress={c.setupProgress} />
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '8px', fontFamily: 'monospace' }}>
                  ID artisan : {c.artisanId || c.artisan_id || 'Non renseigné'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '13px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>Dossiers</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{c.usage?.projectUsageLabel || 'Non disponible'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>Devis</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{c.usage?.devisUsageLabel || 'Non disponible'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>Appels vocaux</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{c.usage?.voiceCallUsageLabel || 'Non disponible'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>Minutes vocales</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{c.usage?.voiceMinuteUsageLabel || 'Non disponible'}</p>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>Fonctionnalités</p>
                  <FeatureBadges features={c.features} />
                </div>

                <div style={{ marginBottom: '4px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>Alertes</p>
                  <AlertMessages alerts={c.alerts} />
                </div>

                <div style={{ marginTop: '12px', textAlign: 'right' }}>
                  {c.detailId ? (
                    <Link
                      href={`/admin/clients/${c.detailId}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Voir le détail →
                    </Link>
                  ) : (
                    <span style={{ color: 'var(--text-3)', fontSize: '13px', fontWeight: 600 }}>ID manquant</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        .admin-clients-cards { display: none; }
        @media (max-width: 1023px) {
          .admin-clients-table-wrap { display: none; }
          .admin-clients-cards { display: block; }
        }
      `}</style>
    </div>
  );
}
