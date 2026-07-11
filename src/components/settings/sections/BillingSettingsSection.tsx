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
  warning: 'Proche limite',
  limit_reached: 'Limite atteinte',
  exceeded: 'Dépassé',
};

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  essai: 'Essai',
  trial: 'Essai',
  trialing: 'Essai gratuit en cours',
  actif: 'Actif',
  active: 'Actif',
  en_cours: 'Actif',
  suspendu: 'Suspendu',
  suspended: 'Suspendu',
  annule: 'Annulé',
  annulé: 'Annulé',
  cancelled: 'Annulé',
  canceled: 'Annulé',
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
  /** Reutilise l'appel existant `POST /api/stripe/portal` deja implemente dans la page (non recree ici). */
  onOpenBillingPortal: () => void;
};

/**
 * Section "Offre & quotas" extraite du monolithe `app/parametres/page.tsx`.
 *
 * Ne gere aucun champ du state global `config` : cette section est purement
 * en lecture (plan, statut, compteurs d'usage) plus une action Stripe
 * (portail de facturation, `POST /api/stripe/portal`, deja protegee cote
 * serveur par `requirePermission(context, 'billing.manage')`). Elle ne
 * possede donc pas de bouton "Enregistrer" local : il n'y a jamais rien eu a
 * sauvegarder ici (le monolithe original n'ecrivait pas non plus ces
 * donnees via le bouton global).
 *
 * Permissions : `billing.read` pour voir la section (owner + admin),
 * masquee entierement pour manager/member (pas de `billing.read` dans la
 * matrice). `billing.manage` pour l'action "Gérer mon abonnement" (owner
 * uniquement) — admin voit les informations sans l'action.
 *
 * Hors perimetre de ce lot : le bloc "Stripe Connect" (onboarding/sync
 * d'acompte) vit dans l'onglet "Catalogue & devis" du monolithe, explicitement
 * hors perimetre de ce lot — il n'est donc pas deplace ici pour eviter de
 * toucher a la section catalogue.
 */
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
          <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>💳 Offre & quotas</h2>
          <ReadOnlyNotice reason="owner_only" message="Section réservée au propriétaire et aux administrateurs de l'entreprise." />
        </div>
      }
    >
      <SettingsSectionShell title="💳 Offre & quotas">
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
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(34,197,94,0.12)', color: 'var(--accent)', flexShrink: 0,
            }}>
              <Users size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Équipe</p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
                Invitez vos collaborateurs et gérez leurs accès à Kadria.
              </p>
            </div>
          </button>
        )}

        {usageLoading ? (
          <div style={sectionCard}>
            <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>Chargement…</p>
          </div>
        ) : usageError || !monthlyUsage ? (
          <div style={sectionCard}>
            <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
              Informations d&apos;utilisation indisponibles pour le moment.
            </p>
          </div>
        ) : (
          <>
            <div style={sectionCard}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>Votre offre</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Plan actuel</p>
                  <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700, textTransform: 'capitalize' }}>
                    {accountStatus?.plan || monthlyUsage.plan}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Statut</p>
                  <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                    {accountStatus?.status
                      ? (ACCOUNT_STATUS_LABELS[accountStatus.status.toLowerCase()] || accountStatus.status)
                      : 'Statut non disponible'}
                  </p>
                </div>
                {accountStatus?.trialEndDate && (
                  <div>
                    <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Fin d&apos;essai</p>
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
                      {accountStatus.cancelAtPeriodEnd ? 'Fin d’accès le' : 'Renouvellement le'}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600 }}>{accountStatus.nextBilling}</p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                {!canManage && (
                  <ReadOnlyNotice reason="owner_only" message="Gestion de l'abonnement réservée au propriétaire de l'entreprise." />
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
                      {portalLoading ? 'Redirection...' : 'Gérer mon abonnement'}
                    </button>
                    {portalError && (
                      <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#ef4444' }}>{portalError}</p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '13px' }}>
                    Aucun abonnement Stripe actif
                  </p>
                )}
              </div>
            </div>

            <div style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)' }}>Utilisation du mois</h3>
                <span style={{
                  fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '2px 10px',
                  background: 'rgba(34,197,94,0.1)', color: 'var(--accent)',
                }}>
                  {USAGE_STATUS_LABELS[
                    ([monthlyUsage.projects.status, monthlyUsage.vapi.status, monthlyUsage.assistant?.status].includes('exceeded') && 'exceeded')
                    || ([monthlyUsage.projects.status, monthlyUsage.vapi.status, monthlyUsage.assistant?.status].includes('limit_reached') && 'limit_reached')
                    || ([monthlyUsage.projects.status, monthlyUsage.vapi.status, monthlyUsage.assistant?.status].includes('warning') && 'warning')
                    || 'ok'
                  ]}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Dossiers</p>
                  <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                    {monthlyUsage.projects.unlimited
                      ? `${monthlyUsage.projects.used} / Illimité`
                      : `${monthlyUsage.projects.used} / ${monthlyUsage.projects.limit ?? 0}`}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Appels vocaux</p>
                  <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                    {monthlyUsage.vapi.callsUnlimited
                      ? `${monthlyUsage.vapi.callsUsed} / Illimité`
                      : monthlyUsage.vapi.callsLimit === 0
                        ? 'Non inclus'
                        : `${monthlyUsage.vapi.callsUsed} / ${monthlyUsage.vapi.callsLimit}`}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Minutes vocales</p>
                  <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                    {monthlyUsage.vapi.minutesLimit === null
                      ? `${monthlyUsage.vapi.minutesUsed} min / Non limité`
                      : `${monthlyUsage.vapi.minutesUsed} / ${monthlyUsage.vapi.minutesLimit} min`}
                  </p>
                </div>
                {monthlyUsage.assistant && (
                  <div>
                    <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Assistant Kadria</p>
                    <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                      {monthlyUsage.assistant.used} / {monthlyUsage.assistant.limit} questions utilisées ce mois-ci
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div style={sectionCard}>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6 }}>
                Ces compteurs se réinitialisent automatiquement chaque mois. Aucune action n&apos;est requise de votre part.
              </p>
            </div>
          </>
        )}
      </SettingsSectionShell>
    </PermissionGate>
  );
}
