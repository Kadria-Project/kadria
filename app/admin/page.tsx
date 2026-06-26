'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DernierClient {
  id: string;
  nom: string;
  email: string;
  plan: string;
  statut: string;
  created_at: string;
}

interface AdminStats {
  total_clients: number;
  actifs: number;
  trial: number;
  suspendus: number;
  resilies: number;
  nouveaux_ce_mois: number;
  churns_ce_mois: number;
  mrr: number;
  par_plan: { essentiel: number; performance: number; agence: number };
  derniers_clients: DernierClient[];
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

function formatEuro(value: number) {
  return value.toLocaleString('fr-FR') + ' €';
}

function formatDate(value: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

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
      }}
    >
      {label}
    </span>
  );
}

const kpiCard: React.CSSProperties = {
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '12px',
  padding: '20px',
};

export default function AdminHomePage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setStats(data);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Vue d&apos;ensemble</h1>
        <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '4px 0 0' }}>Mise à jour en temps réel</p>
      </div>

      {loading && <p style={{ color: '#a1a1aa' }}>Chargement...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }} className="admin-kpi-grid">
            <div style={{ ...kpiCard, borderTop: '3px solid #22c55e' }}>
              <p style={{ fontSize: '32px', fontWeight: 900, color: '#22c55e', margin: 0 }}>{formatEuro(stats.mrr)}/mois</p>
              <p style={{ fontSize: '13px', fontWeight: 600, margin: '8px 0 2px' }}>Revenu mensuel récurrent</p>
              <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>{stats.actifs} artisans actifs payants</p>
            </div>
            <div style={{ ...kpiCard, borderTop: '3px solid #22c55e' }}>
              <p style={{ fontSize: '32px', fontWeight: 900, margin: 0 }}>{stats.actifs}</p>
              <p style={{ fontSize: '13px', fontWeight: 600, margin: '8px 0 2px' }}>Artisans actifs</p>
              <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>+{stats.nouveaux_ce_mois} ce mois</p>
            </div>
            <div style={{ ...kpiCard, borderTop: '3px solid #f59e0b' }}>
              <p style={{ fontSize: '32px', fontWeight: 900, color: '#f59e0b', margin: 0 }}>{stats.trial}</p>
              <p style={{ fontSize: '13px', fontWeight: 600, margin: '8px 0 2px' }}>Essais en cours</p>
              <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>Conversion à surveiller</p>
            </div>
            <div style={{ ...kpiCard, borderTop: '3px solid #dc2626' }}>
              <p style={{ fontSize: '32px', fontWeight: 900, color: '#dc2626', margin: 0 }}>{stats.churns_ce_mois}</p>
              <p style={{ fontSize: '13px', fontWeight: 600, margin: '8px 0 2px' }}>Résiliations ce mois</p>
              <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>Sur {stats.resilies} au total</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }} className="admin-plan-grid">
            <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontWeight: 700 }}>Essentiel</p>
              <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{stats.par_plan.essentiel} artisans</p>
              <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0' }}>{formatEuro(stats.par_plan.essentiel * 149)}/mois</p>
            </div>
            <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontWeight: 700 }}>Performance</p>
              <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{stats.par_plan.performance} artisans</p>
              <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0' }}>{formatEuro(stats.par_plan.performance * 249)}/mois</p>
            </div>
            <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontWeight: 700 }}>Agence</p>
              <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{stats.par_plan.agence} artisans</p>
              <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0' }}>Sur devis</p>
            </div>
          </div>

          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #27272a' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', margin: 0 }}>Dernières inscriptions</p>
              <Link href="/admin/clients" style={{ fontSize: '13px', color: '#22c55e', textDecoration: 'none' }}>
                Voir tous les artisans →
              </Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#27272a' }}>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Nom</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Plan</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Statut</th>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Inscrit le</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.derniers_clients.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#71717a' }}>Aucun artisan pour le moment</td>
                    </tr>
                  )}
                  {stats.derniers_clients.map((c) => (
                    <tr key={c.id} style={{ borderTop: '1px solid #27272a' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>{c.nom || '—'}</td>
                      <td style={{ padding: '12px 20px', color: '#a1a1aa' }}>{c.email}</td>
                      <td style={{ padding: '12px 20px' }}><Badge label={c.plan} palette={PLAN_BADGE[c.plan]} /></td>
                      <td style={{ padding: '12px 20px' }}><Badge label={c.statut} palette={STATUT_BADGE[c.statut]} /></td>
                      <td style={{ padding: '12px 20px', color: '#a1a1aa' }}>{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 1023px) {
          .admin-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .admin-plan-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 639px) {
          .admin-kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
