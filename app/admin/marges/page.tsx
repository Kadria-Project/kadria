'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminBadge, { type AdminBadgeTone } from '@/src/components/admin/AdminBadge';
import AdminCard from '@/src/components/admin/AdminCard';
import AdminEmptyState from '@/src/components/admin/AdminEmptyState';
import AdminTable from '@/src/components/admin/AdminTable';
import LoadingStats from '@/src/components/ui/loading/LoadingStats';
import LoadingTable from '@/src/components/ui/loading/LoadingTable';

interface AdminMarginsResponse {
  periodMonth: string;
  tracked: Record<string, 'tracked' | 'estimated' | 'not_tracked'>;
  assumptions: {
    revenueByPlan: Record<string, number>;
    costPerVapiMinuteEur: number;
    costPerSmsEur: number;
    costPerEmailEur: number;
    costPerProjectAiEur: number;
    costPerAssistantMessageAiEur: number;
    fixedCostPerArtisanEur: number;
  };
  kpis: {
    revenueMonthlyEstimated: number;
    costsUsageEstimated: number;
    grossMarginEstimated: number;
    grossMarginRate: number | null;
    activeArtisans: number;
    averageCostPerArtisan: number;
    averageMarginPerArtisan: number;
  };
  breakdown: {
    voice: number;
    sms: number;
    email: number;
    openaiProjects: number;
    openaiAssistant: number;
    openaiTotal: number;
    other: number;
    total: number;
  };
  artisans: Array<{
    artisanId: string;
    userId: string;
    artisanName: string;
    companyName: string;
    planLabel: string;
    status: string;
    revenueMonthlyEstimated: number;
    revenueNote: string | null;
    projectsCreatedThisMonth: number;
    voiceCallsThisMonth: number;
    voiceMinutesThisMonth: number;
    smsSentThisMonth: number;
    smsTracked: boolean;
    emailsSentThisMonth: number;
    emailsTracked: boolean;
    assistantMessagesThisMonth: number;
    assistantMessagesTracked: boolean;
    costVoiceEstimated: number;
    costSmsEstimated: number;
    costEmailEstimated: number;
    costOpenAiProjectsEstimated: number;
    costOpenAiAssistantEstimated: number;
    costOpenAiTotalEstimated: number;
    costOtherEstimated: number;
    costFixedEstimated: number;
    totalCostEstimated: number;
    grossMarginEstimated: number;
    grossMarginRate: number | null;
    costToRevenueRatio: number | null;
    alertLevel: 'ok' | 'warning' | 'danger' | 'non_rentable' | 'no_revenue' | 'price_missing' | 'unknown_plan';
    alertLabel: string;
    alertReason: string;
  }>;
}

const ALERT_TONES: Record<AdminMarginsResponse['artisans'][number]['alertLevel'], AdminBadgeTone> = {
  ok: 'success',
  warning: 'warning',
  danger: 'danger',
  non_rentable: 'danger',
  no_revenue: 'neutral',
  price_missing: 'premium',
  unknown_plan: 'neutral',
};

const TRACKING_TONES: Record<'tracked' | 'estimated' | 'not_tracked', AdminBadgeTone> = {
  tracked: 'success',
  estimated: 'warning',
  not_tracked: 'neutral',
};

function formatEuro(value: number) {
  if (value > 0 && value < 0.01) return '< 0,01 €';
  return `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`;
}

function formatEuroExact(value: number, fractionDigits = 3) {
  return `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })} €`;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}

function formatTrackedCount(value: number, tracked: boolean) {
  return tracked ? String(value) : 'Non suivi';
}

export default function AdminMarginsPage() {
  const [data, setData] = useState<AdminMarginsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/margins')
      .then((res) => res.json())
      .then((payload) => {
        if (payload.error) {
          setError(payload.error);
          return;
        }
        setData(payload);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  const highRiskCount = useMemo(
    () => data?.artisans.filter((artisan) => ['danger', 'non_rentable'].includes(artisan.alertLevel)).length ?? 0,
    [data],
  );

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div style={{ marginBottom: '4px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Couts & marge</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: '6px 0 0', maxWidth: '760px', lineHeight: 1.6 }}>
          Cockpit SaaS du mois courant pour comparer le revenu mensuel estime, les couts d&apos;usage suivis ou estimes,
          et la marge brute par artisan.
        </p>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <LoadingStats count={7} />
          <LoadingTable columns={9} rows={6} />
        </div>
      )}

      {error && <p style={{ color: 'var(--status-lost)' }}>{error}</p>}

      {data && (
        <>
          <div className="admin-margins-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <AdminCard title="Revenu mensuel estime" subtitle={`Mois ${data.periodMonth}`}>
              <p style={{ fontSize: '30px', fontWeight: 900, color: 'var(--accent)', margin: 0, letterSpacing: '-0.03em' }}>
                {formatEuro(data.kpis.revenueMonthlyEstimated)}
              </p>
            </AdminCard>
            <AdminCard title="Couts d'usage estimes" subtitle="Vocal, SMS, email, OpenAI, autres">
              <p style={{ fontSize: '30px', fontWeight: 900, margin: 0, letterSpacing: '-0.03em' }}>
                {formatEuro(data.kpis.costsUsageEstimated)}
              </p>
            </AdminCard>
            <AdminCard title="Marge brute estimee" subtitle="Revenu estime - couts estimes">
              <p style={{ fontSize: '30px', fontWeight: 900, color: data.kpis.grossMarginEstimated >= 0 ? '#86efac' : '#fca5a5', margin: 0, letterSpacing: '-0.03em' }}>
                {formatEuro(data.kpis.grossMarginEstimated)}
              </p>
            </AdminCard>
            <AdminCard title="Taux de marge brute" subtitle={`${highRiskCount} artisan${highRiskCount > 1 ? 's' : ''} a risque eleve`}>
              <p style={{ fontSize: '30px', fontWeight: 900, margin: 0, letterSpacing: '-0.03em' }}>
                {formatPercent(data.kpis.grossMarginRate)}
              </p>
            </AdminCard>
            <AdminCard title="Artisans actifs" subtitle="Actifs + essais en cours">
              <p style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>{data.kpis.activeArtisans}</p>
            </AdminCard>
            <AdminCard title="Cout moyen par artisan" subtitle="Reparti sur les comptes actifs">
              <p style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>{formatEuro(data.kpis.averageCostPerArtisan)}</p>
            </AdminCard>
            <AdminCard title="Marge moyenne par artisan" subtitle="Repartie sur les comptes actifs">
              <p style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>{formatEuro(data.kpis.averageMarginPerArtisan)}</p>
            </AdminCard>
            <AdminCard title="Couverture des donnees" subtitle="Niveau de suivi par poste">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(data.tracked).map(([key, value]) => (
                  <AdminBadge
                    key={key}
                    label={`${key} · ${value === 'tracked' ? 'suivi' : value === 'estimated' ? 'estime' : 'non suivi'}`}
                    tone={TRACKING_TONES[value]}
                  />
                ))}
              </div>
            </AdminCard>
          </div>

          <div className="admin-margins-panels" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px' }}>
            <AdminCard title="Ventilation globale des couts" subtitle="Montants estimes pour le mois courant">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                {[
                  ['Vocal', data.breakdown.voice],
                  ['SMS', data.breakdown.sms],
                  ['Email', data.breakdown.email],
                  ['OpenAI projets', data.breakdown.openaiProjects],
                  ['OpenAI assistant', data.breakdown.openaiAssistant],
                  ['Total OpenAI', data.breakdown.openaiTotal],
                  ['Autres / estimation', data.breakdown.other],
                  ['Total', data.breakdown.total],
                ].map(([label, amount]) => (
                  <div key={String(label)} style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{formatEuro(Number(amount))}</p>
                  </div>
                ))}
              </div>
            </AdminCard>

            <AdminCard title="Hypotheses codees" subtitle="Point unique a ajuster quand les couts reels evoluent">
              <div style={{ display: 'grid', gap: '10px', fontSize: '13px', color: 'var(--text-2)' }}>
                <div>Essentiel : <strong>{formatEuro(data.assumptions.revenueByPlan.Essentiel)}</strong> / mois</div>
                <div>Performance : <strong>{formatEuro(data.assumptions.revenueByPlan.Performance)}</strong> / mois</div>
                <div>Agence : <strong>sur devis / prix non renseigne</strong></div>
                <div>Cout Vapi : <strong>{formatEuro(data.assumptions.costPerVapiMinuteEur)}</strong> / minute</div>
                <div>Cout SMS : <strong>{formatEuro(data.assumptions.costPerSmsEur)}</strong> / SMS</div>
                <div>Cout email : <strong>{formatEuro(data.assumptions.costPerEmailEur)}</strong> / email</div>
                <div>Cout OpenAI projet : <strong>{formatEuroExact(data.assumptions.costPerProjectAiEur)}</strong> / projet</div>
                <div>Cout OpenAI assistant : <strong>{formatEuroExact(data.assumptions.costPerAssistantMessageAiEur)}</strong> / message</div>
                <div>Cout fixe artisan : <strong>{formatEuro(data.assumptions.fixedCostPerArtisanEur)}</strong> / mois</div>
              </div>
            </AdminCard>
          </div>

          <AdminTable className="admin-margins-table-wrap" minWidth="2600px">
            <thead>
              <tr style={{ background: 'var(--border)' }}>
                {[
                  'Artisan / entreprise',
                  'Artisan ID',
                  'Plan',
                  'Statut',
                  'Revenu mensuel estime',
                  'Dossiers',
                  'Appels vocaux',
                  'Minutes vocales',
                  'SMS',
                  'Emails',
                  'Messages assistant',
                  'Cout vocal',
                  'Cout SMS',
                  'Cout email',
                  'Cout OpenAI projets',
                  'Cout OpenAI assistant',
                  'Cout OpenAI total',
                  'Cout total',
                  'Marge brute',
                  'Taux de marge',
                  'Alerte',
                ].map((column) => (
                  <th key={column} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.artisans.length === 0 && (
                <tr>
                  <td colSpan={21}>
                    <AdminEmptyState compact title="Aucun artisan a afficher" description="La vue couts & marge se remplira des qu'il y aura des comptes artisans." />
                  </td>
                </tr>
              )}
              {data.artisans.map((artisan, index) => (
                <tr key={`${artisan.userId}-${artisan.artisanId || index}`} style={{ borderTop: '1px solid var(--border)', background: index % 2 === 0 ? 'var(--bg-elevated)' : 'var(--bg)' }}>
                  <td style={{ padding: '12px 20px', minWidth: '230px' }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{artisan.artisanName}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-2)' }}>{artisan.companyName}</p>
                  </td>
                  <td style={{ padding: '12px 20px', minWidth: '150px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-2)' }}>
                    {artisan.artisanId || 'Non renseigne'}
                  </td>
                  <td style={{ padding: '12px 20px' }}>{artisan.planLabel}</td>
                  <td style={{ padding: '12px 20px' }}>{artisan.status}</td>
                  <td style={{ padding: '12px 20px' }} title={artisan.revenueNote || undefined}>
                    {formatEuro(artisan.revenueMonthlyEstimated)}
                  </td>
                  <td style={{ padding: '12px 20px' }}>{artisan.projectsCreatedThisMonth}</td>
                  <td style={{ padding: '12px 20px' }}>{artisan.voiceCallsThisMonth}</td>
                  <td style={{ padding: '12px 20px' }}>{artisan.voiceMinutesThisMonth}</td>
                  <td style={{ padding: '12px 20px' }}>{formatTrackedCount(artisan.smsSentThisMonth, artisan.smsTracked)}</td>
                  <td style={{ padding: '12px 20px' }}>{formatTrackedCount(artisan.emailsSentThisMonth, artisan.emailsTracked)}</td>
                  <td style={{ padding: '12px 20px' }}>{formatTrackedCount(artisan.assistantMessagesThisMonth, artisan.assistantMessagesTracked)}</td>
                  <td style={{ padding: '12px 20px' }}>{formatEuro(artisan.costVoiceEstimated)}</td>
                  <td style={{ padding: '12px 20px' }}>{formatEuro(artisan.costSmsEstimated)}</td>
                  <td style={{ padding: '12px 20px' }}>{formatEuro(artisan.costEmailEstimated)}</td>
                  <td style={{ padding: '12px 20px' }}>{formatEuro(artisan.costOpenAiProjectsEstimated)}</td>
                  <td style={{ padding: '12px 20px' }}>{formatEuro(artisan.costOpenAiAssistantEstimated)}</td>
                  <td style={{ padding: '12px 20px' }}>{formatEuro(artisan.costOpenAiTotalEstimated)}</td>
                  <td style={{ padding: '12px 20px', fontWeight: 700 }}>{formatEuro(artisan.totalCostEstimated)}</td>
                  <td style={{ padding: '12px 20px', color: artisan.grossMarginEstimated >= 0 ? '#dcfce7' : '#fecaca', fontWeight: 700 }}>
                    {formatEuro(artisan.grossMarginEstimated)}
                  </td>
                  <td style={{ padding: '12px 20px' }}>{formatPercent(artisan.grossMarginRate)}</td>
                  <td style={{ padding: '12px 20px', minWidth: '180px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <AdminBadge label={artisan.alertLabel} tone={ALERT_TONES[artisan.alertLevel]} />
                      <span style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.45 }}>{artisan.alertReason}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          <div className="admin-margins-cards" style={{ display: 'none' }}>
            {data.artisans.map((artisan) => (
              <AdminCard key={`${artisan.userId}-${artisan.artisanId}`} title={artisan.artisanName} subtitle={artisan.companyName}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <AdminBadge label={artisan.planLabel} tone="neutral" />
                  <AdminBadge label={artisan.status} tone="info" />
                  <AdminBadge label={artisan.alertLabel} tone={ALERT_TONES[artisan.alertLevel]} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                  <div><strong>Revenu</strong><br />{formatEuro(artisan.revenueMonthlyEstimated)}</div>
                  <div><strong>Cout total</strong><br />{formatEuro(artisan.totalCostEstimated)}</div>
                  <div><strong>Marge</strong><br />{formatEuro(artisan.grossMarginEstimated)}</div>
                  <div><strong>Taux</strong><br />{formatPercent(artisan.grossMarginRate)}</div>
                  <div><strong>Dossiers</strong><br />{artisan.projectsCreatedThisMonth}</div>
                  <div><strong>Messages assistant</strong><br />{formatTrackedCount(artisan.assistantMessagesThisMonth, artisan.assistantMessagesTracked)}</div>
                </div>
                <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {artisan.alertReason}
                </p>
              </AdminCard>
            ))}
          </div>

          <style>{`
            @media (max-width: 1199px) {
              .admin-margins-kpis { grid-template-columns: repeat(2, 1fr) !important; }
              .admin-margins-panels { grid-template-columns: 1fr !important; }
            }
            @media (max-width: 767px) {
              .admin-margins-kpis { grid-template-columns: 1fr !important; }
              .admin-margins-table-wrap { display: none; }
              .admin-margins-cards { display: grid !important; gap: 12px; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
