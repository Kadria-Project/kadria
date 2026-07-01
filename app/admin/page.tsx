'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminBadge, { type AdminBadgeTone } from '@/src/components/admin/AdminBadge';
import AdminCard from '@/src/components/admin/AdminCard';
import AdminEmptyState from '@/src/components/admin/AdminEmptyState';
import AdminTable from '@/src/components/admin/AdminTable';
import LoadingStats from '@/src/components/ui/loading/LoadingStats';
import LoadingTable from '@/src/components/ui/loading/LoadingTable';

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

const PLAN_TONE: Record<string, AdminBadgeTone> = {
  Essentiel: 'neutral',
  Performance: 'success',
  Agence: 'premium',
};

const STATUT_TONE: Record<string, AdminBadgeTone> = {
  Trial: 'info',
  Actif: 'success',
  Suspendu: 'warning',
  Résilié: 'danger',
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

const kpiCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(24,24,27,0.96), rgba(9,9,11,0.98))',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '18px',
  padding: '22px',
  boxShadow: '0 18px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03)',
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
    <div style={{ display: 'grid', gap: '24px' }}>
      <div style={{ marginBottom: '4px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Vue d&apos;ensemble</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: '6px 0 0', maxWidth: '720px', lineHeight: 1.6 }}>
          Pilotage synthétique de l&apos;activité Kadria : revenus, plans, inscriptions récentes et signaux à surveiller.
        </p>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <LoadingStats count={4} />
          <LoadingTable columns={5} columnWidths={['28%', '28%', '14%', '14%', '16%']} rows={5} />
        </div>
      )}
      {error && <p style={{ color: 'var(--status-lost)' }}>{error}</p>}

      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="admin-kpi-grid">
            <div style={{ ...kpiCard, borderTop: '3px solid var(--accent)' }}>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', margin: '0 0 14px', fontWeight: 700 }}>Finance</p>
              <p style={{ fontSize: '34px', fontWeight: 900, color: 'var(--accent)', margin: 0, letterSpacing: '-0.03em' }}>{formatEuro(stats.mrr)}/mois</p>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: '10px 0 4px' }}>Revenu mensuel récurrent</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>{stats.actifs} artisans actifs payants</p>
            </div>
            <div style={{ ...kpiCard, borderTop: '3px solid var(--accent)' }}>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', margin: '0 0 14px', fontWeight: 700 }}>Base clients</p>
              <p style={{ fontSize: '34px', fontWeight: 900, margin: 0, letterSpacing: '-0.03em' }}>{stats.actifs}</p>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: '10px 0 4px' }}>Artisans actifs</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>+{stats.nouveaux_ce_mois} ce mois</p>
            </div>
            <div style={{ ...kpiCard, borderTop: '3px solid var(--status-callback)' }}>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', margin: '0 0 14px', fontWeight: 700 }}>Activation</p>
              <p style={{ fontSize: '34px', fontWeight: 900, color: 'var(--status-callback)', margin: 0, letterSpacing: '-0.03em' }}>{stats.trial}</p>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: '10px 0 4px' }}>Essais en cours</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>Conversion à surveiller</p>
            </div>
            <div style={{ ...kpiCard, borderTop: '3px solid var(--status-lost)' }}>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', margin: '0 0 14px', fontWeight: 700 }}>Risque</p>
              <p style={{ fontSize: '34px', fontWeight: 900, color: 'var(--status-lost)', margin: 0, letterSpacing: '-0.03em' }}>{stats.churns_ce_mois}</p>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: '10px 0 4px' }}>Résiliations ce mois</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>Sur {stats.resilies} au total</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="admin-plan-grid">
            <AdminCard title="Essentiel" subtitle="Base installée sur l’offre d’entrée">
              <p style={{ fontSize: '12px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontWeight: 700 }}>Essentiel</p>
              <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{stats.par_plan.essentiel} artisans</p>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '4px 0 0' }}>{formatEuro(stats.par_plan.essentiel * 149)}/mois</p>
            </AdminCard>
            <AdminCard title="Performance" subtitle="Offre cœur à suivre de près">
              <p style={{ fontSize: '12px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontWeight: 700 }}>Performance</p>
              <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{stats.par_plan.performance} artisans</p>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '4px 0 0' }}>{formatEuro(stats.par_plan.performance * 249)}/mois</p>
            </AdminCard>
            <AdminCard title="Agence" subtitle="Comptes à forte valeur et accompagnement renforcé">
              <p style={{ fontSize: '12px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontWeight: 700 }}>Agence</p>
              <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{stats.par_plan.agence} artisans</p>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '4px 0 0' }}>Sur devis</p>
            </AdminCard>
          </div>

          <div style={{ background: 'linear-gradient(180deg, rgba(24,24,27,0.96), rgba(9,9,11,0.98))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 18px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '15px', margin: 0 }}>Dernières inscriptions</p>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '4px 0 0' }}>Suivi des derniers comptes créés dans Kadria.</p>
              </div>
              <Link href="/admin/clients" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>
                Voir tous les artisans →
              </Link>
            </div>
            <AdminTable columns={['Nom', 'Email', 'Plan', 'Statut', 'Inscrit le']} style={{ background: 'transparent', border: 'none', borderRadius: 0, boxShadow: 'none' }}>
              <tbody>
                {stats.derniers_clients.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <AdminEmptyState compact title="Aucun artisan pour le moment" description="Les nouvelles inscriptions apparaîtront ici." />
                    </td>
                  </tr>
                )}
                {stats.derniers_clients.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 600 }}>{c.nom || '—'}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--text-2)' }}>{c.email}</td>
                    <td style={{ padding: '12px 20px' }}><AdminBadge label={c.plan} tone={PLAN_TONE[c.plan] || 'neutral'} variant="plan" /></td>
                    <td style={{ padding: '12px 20px' }}><AdminBadge label={c.statut} tone={STATUT_TONE[c.statut] || 'neutral'} variant="status" /></td>
                    <td style={{ padding: '12px 20px', color: 'var(--text-2)' }}>{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
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
