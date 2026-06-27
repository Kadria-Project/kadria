'use client';

import { useEffect, useState } from 'react';
import AdminCard from '@/src/components/admin/AdminCard';
import AdminTable from '@/src/components/admin/AdminTable';
import AdminEmptyState from '@/src/components/admin/AdminEmptyState';
import LoadingTable from '@/src/components/ui/loading/LoadingTable';

interface UnknownTradeRow {
  id: string;
  trade_name: string;
  occurrence_count: number;
  first_reported_at: string;
  last_reported_at: string;
}

function formatDate(value: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function MetiersInconnusPage() {
  const [trades, setTrades] = useState<UnknownTradeRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/unknown-trades')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTrades(data.trades);
        else setError(data.error || 'Erreur de chargement');
      })
      .catch(() => setError('Erreur de chargement'));
  }, []);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 4px' }}>
          Métiers signalés non supportés
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
          Métiers saisis via « Autre métier... » par les artisans, en attente d&apos;intégration dans la bibliothèque métier.
        </p>
      </div>

      <AdminCard>
        {trades === null ? (
          <LoadingTable />
        ) : error ? (
          <AdminEmptyState title="Erreur" description={error} />
        ) : trades.length === 0 ? (
          <AdminEmptyState title="Aucun métier en attente" description="Tous les métiers saisis sont déjà couverts par la bibliothèque." />
        ) : (
          <AdminTable>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-3)' }}>Métier proposé</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-3)' }}>Occurrences</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-3)' }}>Premier signalement</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-3)' }}>Dernier signalement</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 20px', color: 'var(--text-1)', fontWeight: 600 }}>{t.trade_name}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--text-1)' }}>{t.occurrence_count}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--text-2)' }}>{formatDate(t.first_reported_at)}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--text-2)' }}>{formatDate(t.last_reported_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}
