'use client';

import { Users } from 'lucide-react';
import type { TenantRole } from '@/src/lib/team/types';
import { hasPermission } from '@/src/lib/team/permission-matrix';
import { PermissionGate } from '@/src/components/settings/PermissionGate';
import { ReadOnlyNotice } from '@/src/components/settings/ReadOnlyNotice';
import { SettingsSectionShell } from '@/src/components/settings/SettingsSectionShell';

type UsageStatus = 'ok' | 'warning' | 'limit_reached' | 'exceeded';

export type MonthlyUsageSummary = {
  periodMonth: string;
  plan: string;
  projects: { used: number; limit: number | null; unlimited: boolean; status: UsageStatus };
  vapi: { callsUsed: number; callsLimit: number | null; callsUnlimited: boolean; minutesUsed: number; minutesLimit: number | null; status: UsageStatus };
  assistant?: { used: number; limit: number; percent: number | null; status: UsageStatus };
};

export type AccountStatusSummary = {
  plan: string;
  status: string | null;
  billingStatus: string | null;
  trialEndDate: string | null;
  nextBilling: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
};

const USAGE_STATUS_LABELS: Record<UsageStatus, string> = {
  ok: 'OK',
  warning: 'Proche de la limite',
  limit_reached: 'Limite atteinte',
  exceeded: 'Depasse',
};

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  essai: 'Essai',
  trial: 'Essai',
  trialing: 'Essai en cours',
  actif: 'Actif',
  active: 'Actif',
  en_cours: 'Actif',
  suspendu: 'Suspendu',
  suspended: 'Suspendu',
  annule: 'Annule',
  cancelled: 'Annule',
  canceled: 'Annule',
};

const sectionCard: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '16px',
  minWidth: 0,
};

type BillingSettingsSectionProps = {
  role: TenantRole | null;
  isMobile: boolean;
  teamTabVisible: boolean;
  onGoToTeam: () => void;
  usageLoading: boolean;
  usageError: boolean;
  monthlyUsage: MonthlyUsageSummary | null;
  accountStatus: AccountStatusSummary | null;
  portalLoading: boolean;
  portalError: string | null;
  onOpenBillingPortal: () => void;
};

export function BillingSettingsSection({
  role,
  isMobile,
  teamTabVisible,
  onGoToTeam,
  usageLoading,
  usageError,
  monthlyUsage,
  accountStatus,
  portalLoading,
  portalError,
  onOpenBillingPortal,
}: BillingSettingsSectionProps) {
  const canManage = hasPermission(role ?? 'viewer', 'billing.manage');

  return (
    <PermissionGate
      role={role}
      permission="billing.read"
      fallback={
        <div>
          <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>Mon offre</h2>
          <ReadOnlyNotice reason="owner_only" message="Cette partie est reservee au proprietaire du compte et a l'administrateur." />
        </div>
      }
    >
      <SettingsSectionShell title="Mon offre">
        {teamTabVisible && (
          <button
            type="button"
            onClick={onGoToTeam}
            style={{
              ...sectionCard,
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(34,197,94,0.12)',
                color: 'var(--accent)',
                flexShrink: 0,
              }}
            >
              <Users size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Mon equipe</p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
                Invitez vos collaborateurs et gerez leurs acces a Kadria.
              </p>
            </div>
          </button>
        )}

        {usageLoading ? (
          <div style={sectionCard}>
              <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>Kadria prepare votre offre...</p>
          </div>
        ) : usageError || !monthlyUsage ? (
          <div style={sectionCard}>
            <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
              Impossible de charger ces informations pour le moment.
            </p>
          </div>
        ) : (
          <>
            <div style={sectionCard}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>Votre offre actuelle</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Offre choisie</p>
                  <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700, textTransform: 'capitalize' }}>
                    {accountStatus?.plan || monthlyUsage.plan}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Statut</p>
                  <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                    {accountStatus?.status
                      ? (ACCOUNT_STATUS_LABELS[accountStatus.status.toLowerCase()] || accountStatus.status)
                      : 'Information indisponible'}
                  </p>
                </div>
                {accountStatus?.trialEndDate && (
                  <div>
                    <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Fin de l'essai</p>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600 }}>{accountStatus.trialEndDate}</p>
                  </div>
                )}
                {accountStatus?.billingStatus && (
                  <div>
                    <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Facturation</p>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600 }}>{accountStatus.billingStatus}</p>
                  </div>
                )}
                {accountStatus?.nextBilling && (
                  <div>
                    <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>
                      {accountStatus.cancelAtPeriodEnd ? "Fin d'acces le" : 'Renouvellement le'}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600 }}>{accountStatus.nextBilling}</p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                {!canManage && (
                  <ReadOnlyNotice reason="owner_only" message="La gestion de l'abonnement est reservee au proprietaire du compte." />
                )}
                {accountStatus?.hasStripeCustomer && canManage ? (
                  <>
                    <button
                      onClick={onOpenBillingPortal}
                      disabled={portalLoading}
                      style={{
                        background: 'var(--accent)',
                        border: 'none',
                        color: 'black',
                        fontWeight: 700,
                        borderRadius: '10px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        cursor: portalLoading ? 'default' : 'pointer',
                        opacity: portalLoading ? 0.7 : 1,
                      }}
                    >
                      {portalLoading ? 'Ouverture en cours...' : 'Gerer mon abonnement'}
                    </button>
                    {portalError && (
                      <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#ef4444' }}>{portalError}</p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '13px' }}>
                    Aucun abonnement actif pour le moment.
                  </p>
                )}
              </div>
            </div>

            <div style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)' }}>Utilisation du mois</h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '20px',
                    padding: '2px 10px',
                    background: 'rgba(34,197,94,0.1)',
                    color: 'var(--accent)',
                  }}
                >
                  {USAGE_STATUS_LABELS[
                    (([monthlyUsage.projects.status, monthlyUsage.vapi.status, monthlyUsage.assistant?.status].includes('exceeded') && 'exceeded')
                      || ([monthlyUsage.projects.status, monthlyUsage.vapi.status, monthlyUsage.assistant?.status].includes('limit_reached') && 'limit_reached')
                      || ([monthlyUsage.projects.status, monthlyUsage.vapi.status, monthlyUsage.assistant?.status].includes('warning') && 'warning')
                      || 'ok')
                  ]}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Dossiers</p>
                  <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                    {monthlyUsage.projects.unlimited
                      ? `${monthlyUsage.projects.used} / Illimite`
                      : `${monthlyUsage.projects.used} / ${monthlyUsage.projects.limit ?? 0}`}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Appels vocaux</p>
                  <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                    {monthlyUsage.vapi.callsUnlimited
                      ? `${monthlyUsage.vapi.callsUsed} / Illimite`
                      : monthlyUsage.vapi.callsLimit === 0
                        ? 'Non inclus'
                        : `${monthlyUsage.vapi.callsUsed} / ${monthlyUsage.vapi.callsLimit}`}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Minutes vocales</p>
                  <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                    {monthlyUsage.vapi.minutesLimit === null
                      ? `${monthlyUsage.vapi.minutesUsed} min / Sans limite`
                      : `${monthlyUsage.vapi.minutesUsed} / ${monthlyUsage.vapi.minutesLimit} min`}
                  </p>
                </div>
                {monthlyUsage.assistant && (
                  <div>
                    <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Assistant Kadria</p>
                    <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                      {monthlyUsage.assistant.used} / {monthlyUsage.assistant.limit} questions ce mois-ci
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div style={sectionCard}>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6 }}>
                Ces compteurs se reinitialisent automatiquement chaque mois. Vous n'avez rien a faire.
              </p>
            </div>
          </>
        )}
      </SettingsSectionShell>
    </PermissionGate>
  );
}
