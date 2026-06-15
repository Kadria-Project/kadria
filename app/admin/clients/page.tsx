'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Download } from 'lucide-react';

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
}

const PLAN_BADGE: Record<string, { bg: string; color: string }> = {
  'Essentiel': { bg: 'rgba(255,255,255,0.06)', color: '#a1a1aa' },
  'Performance': { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  'Agence': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
};

const STATUT_BADGE: Record<string, { bg: string; color: string }> = {
  'Trial': { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa' },
  'Actif': { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  'Suspendu': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  'Résilié': { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
};

function Badge({ label, palette }: { label: string; palette?: { bg: string; color: string } }) {
  if (!label || !palette) {
    return <span style={{ color: '#52525b', fontSize: '13px' }}>—</span>;
  }
  return (
    <span
      style={{
        background: palette.bg,
        color: palette.color,
        borderRadius: '999px',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
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
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '10px',
  color: '#ffffff',
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
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Clients</h1>
        <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '4px 0 0' }}>Gestion des comptes artisans</p>
      </div>

      {loading && <p style={{ color: '#a1a1aa' }}>Chargement...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {clients && (
        <>
          <div className="admin-toolbar" style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
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

          <p style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '12px' }}>
            {filtered.length} client{filtered.length === 1 ? '' : 's'} trouvé{filtered.length === 1 ? '' : 's'}
          </p>

          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#27272a' }}>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Client</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Plan</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Statut</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Inscrit le</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Dernière connexion</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#71717a' }}>Aucun client trouvé</td>
                    </tr>
                  )}
                  {filtered.map((c, i) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/admin/clients/${c.id}`)}
                      style={{
                        borderTop: '1px solid #27272a',
                        background: i % 2 === 0 ? '#18181b' : '#09090b',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#27272a')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? '#18181b' : '#09090b')}
                    >
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#27272a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#22c55e',
                              flexShrink: 0,
                            }}
                          >
                            {initials(c.first_name, c.last_name, c.email)}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600 }}>{`${c.first_name} ${c.last_name}`.trim() || '—'}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa' }}>{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}><Badge label={c.plan} palette={PLAN_BADGE[c.plan]} /></td>
                      <td style={{ padding: '12px 20px' }}><Badge label={c.statut} palette={STATUT_BADGE[c.statut]} /></td>
                      <td style={{ padding: '12px 20px', color: '#a1a1aa' }}>{formatDate(c.created_at)}</td>
                      <td style={{ padding: '12px 20px', color: '#a1a1aa' }}>{formatLastLogin(c.last_login)}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>Voir →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
