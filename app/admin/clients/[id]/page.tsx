'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import AdminBadge, { type AdminBadgeTone } from '@/src/components/admin/AdminBadge';
import AdminCard from '@/src/components/admin/AdminCard';
import AdminButton from '@/src/components/admin/AdminButton';
import AdminModal from '@/src/components/admin/AdminModal';
import AdminEmptyState from '@/src/components/admin/AdminEmptyState';
import LoadingStats from '@/src/components/ui/loading/LoadingStats';
import LoadingForm from '@/src/components/ui/loading/LoadingForm';
import LoadingCard from '@/src/components/ui/loading/LoadingCard';

interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  plan: string;
  statut: string;
  artisanId: string;
  phone: string;
  siret: string;
  address: string;
  trialEndDate: string;
  subscriptionStart: string;
  nextBilling: string;
  lastLogin: string;
  createdAt: string;
  notesAdmin: string;
  suspendedAt: string;
  cancelledAt: string;
  cancellationReason: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  billingStatus: string;
  billingInterval: string;
  currentPeriodEnd: string;
  trialEnd: string;
  cancelAtPeriodEnd: boolean;
  billingUpdatedAt: string;
}

interface Metrics {
  total: number;
  ceMois: number;
  devisGeneres: number;
  statutFrequent: string;
  value?: {
    dossiersCaptes: number;
    devisEnvoyes: number;
    devisAcceptes: number;
    caPotentiel: number;
    caGagne: number;
    tempsEstimeEconomiseMinutes: number;
  };
  events?: { type: string; label: string; date: string }[];
}

type ClientHealthStatus = 'healthy' | 'watch' | 'quota_warning' | 'upgrade_opportunity' | 'inactive';

interface ClientHealth {
  status: ClientHealthStatus;
  label: string;
  reasons: string[];
  recommendation: string;
}

type SetupStepStatus = 'done' | 'todo';

interface SetupProgressStep {
  key: string;
  label: string;
  description: string;
  status: SetupStepStatus;
  ctaLabel: string;
  href: string;
  priority: number;
}

type SetupProgressBandKey = 'a_demarrer' | 'a_completer' | 'presque_pret' | 'complet';

interface SetupProgressDetail {
  percent: number;
  completedSteps: number;
  totalSteps: number;
  steps: SetupProgressStep[];
  band: { key: SetupProgressBandKey; label: string };
  dataAvailable: boolean;
}

const SETUP_BAND_TONE: Record<SetupProgressBandKey, AdminBadgeTone> = {
  a_demarrer: 'danger',
  a_completer: 'warning',
  presque_pret: 'info',
  complet: 'success',
};

type UsageStatus = 'ok' | 'warning' | 'limit_reached' | 'exceeded';

interface UsageSummary {
  projects: { used: number; limit: number | null; unlimited: boolean; percent: number | null; status: UsageStatus };
  vapi: { callsUsed: number; callsLimit: number | null; callsUnlimited: boolean; callsPercent: number | null; minutesUsed: number; minutesLimit: number | null; minutesPercent: number | null; status: UsageStatus };
  devis: { used: number; limit: number | null; unlimited: boolean; percent: number | null; status: UsageStatus };
}

const HEALTH_TONE: Record<ClientHealthStatus, AdminBadgeTone> = {
  healthy: 'success',
  watch: 'neutral',
  quota_warning: 'warning',
  upgrade_opportunity: 'success',
  inactive: 'danger',
};

const USAGE_STATUS_TONE: Record<UsageStatus, AdminBadgeTone> = {
  ok: 'success',
  warning: 'warning',
  limit_reached: 'warning',
  exceeded: 'danger',
};

const USAGE_STATUS_LABEL: Record<UsageStatus, string> = {
  ok: 'OK',
  warning: '80% atteint',
  limit_reached: 'Limite atteinte',
  exceeded: 'Dépassement',
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0);
}

function usageLabel(used: number, limit: number | null) {
  return `${used} / ${limit === null ? 'Illimité' : limit}`;
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

const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
  'Bienvenue': {
    subject: 'Bienvenue chez Kadria',
    body: "Bienvenue dans l'aventure Kadria ! Nous sommes ravis de vous accompagner dans la gestion de vos chantiers.",
  },
  'Relance trial': {
    subject: 'Votre essai Kadria arrive à échéance',
    body: 'Votre période d\'essai se termine bientôt. Pensez à choisir votre plan pour continuer à profiter de Kadria.',
  },
  'Paiement': {
    subject: 'Information sur votre facturation Kadria',
    body: 'Nous souhaitions vous contacter au sujet de votre facturation Kadria.',
  },
  'Autre': { subject: '', body: '' },
};

function toInputDate(value: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function formatDateFr(value: string) {
  if (!value) return 'Non disponible';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Non disponible';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function billingStatusBadge(client: UserRecord): { label: string; tone: AdminBadgeTone } {
  if (client.cancelAtPeriodEnd) {
    return { label: 'Annulation prévue', tone: 'warning' };
  }
  if (client.billingStatus === 'past_due' || client.billingStatus === 'unpaid') {
    return { label: 'Paiement en échec', tone: 'danger' };
  }
  if (client.billingStatus === 'trialing' || client.statut === 'Trial') {
    return { label: 'Trial actif', tone: 'info' };
  }
  if (client.billingStatus === 'active') {
    return { label: 'Paiement OK', tone: 'success' };
  }
  if (client.billingStatus === 'canceled') {
    return { label: 'Résilié', tone: 'danger' };
  }
  return { label: 'Non disponible', tone: 'neutral' };
}

function initials(firstName: string, lastName: string, email: string) {
  const a = (firstName || '').trim()[0];
  const b = (lastName || '').trim()[0];
  if (a && b) return (a + b).toUpperCase();
  if (a) return a.toUpperCase();
  return (email || '?')[0].toUpperCase();
}

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
};

const label: React.CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-3)',
  fontWeight: 700,
  marginBottom: '6px',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-1)',
  fontSize: '13px',
  padding: '8px 10px',
  width: '100%',
  boxSizing: 'border-box',
};

const primaryButton: React.CSSProperties = {
  background: 'var(--accent)',
  color: 'var(--bg)',
  border: 'none',
  borderRadius: '10px',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  background: 'var(--border)',
  color: 'var(--text-1)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

export default function AdminClientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<UserRecord | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [health, setHealth] = useState<ClientHealth | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [setupProgress, setSetupProgress] = useState<SetupProgressDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    siret: '',
    address: '',
  });
  const [notes, setNotes] = useState('');

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().slice(0, 10));
  const [cancelNotify, setCancelNotify] = useState(true);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('Autre');
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/clients/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setClient(data);
        setHealth(data.health || null);
        setUsage(data.usage || null);
        setSetupProgress(data.setupProgress || null);
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          company: data.company || '',
          siret: data.siret || '',
          address: data.address || '',
        });
        setNotes(data.notesAdmin || '');

        if (data.artisanId) {
          fetch(`/api/admin/clients/${id}/metrics?artisan_id=${encodeURIComponent(data.artisanId)}`)
            .then((res) => res.json())
            .then((m) => {
              if (!m.error) setMetrics(m);
            })
            .catch(() => {});
        }
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [id]);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function patch(fields: Record<string, unknown>) {
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(data.detail || data.error);
    }
    setClient(data);
    return data;
  }

  async function handleSaveInfo() {
    setSaving(true);
    try {
      await patch({
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        company: form.company,
        siret: form.siret,
        address: form.address,
      });
      showToast('success', 'Informations du client enregistrées et mises à jour sur sa fiche.');
    } catch (err) {
      showToast('error', `Erreur lors de l'enregistrement${err instanceof Error ? ' : ' + err.message : ''}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      await patch({ notes_admin: notes });
      showToast('success', 'Note enregistrée dans l\'historique de ce client.');
    } catch (err) {
      showToast('error', `Erreur lors de l'enregistrement${err instanceof Error ? ' : ' + err.message : ''}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${id}/portal`, { method: 'POST' });
      const data = await res.json();
      if (data.error || !data.url) {
        throw new Error(data.error || 'Lien indisponible');
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast('error', `Customer Portal indisponible${err instanceof Error ? ' : ' + err.message : ''}`);
    } finally {
      setPortalLoading(false);
    }
  }

  async function handlePlanChange(newPlan: string) {
    if (!client) return;
    if (!confirm(`Changer le plan de ce client vers "${newPlan}" ?`)) return;
    setSaving(true);
    try {
      await patch({
        plan: newPlan,
        history_entry: `Plan changé : ${client.plan || 'Aucun'} → ${newPlan}`,
      });
      showToast('success', `Plan changé vers "${newPlan}". La facturation du client sera mise à jour en conséquence.`);
    } catch (err) {
      showToast('error', `Erreur lors de l'enregistrement${err instanceof Error ? ' : ' + err.message : ''}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatutChange(newStatut: string) {
    if (!client) return;
    if (!confirm(`Changer le statut de ce compte vers "${newStatut}" ?`)) return;
    setSaving(true);
    try {
      await patch({
        statut: newStatut,
        history_entry: `Statut changé : ${client.statut || 'Aucun'} → ${newStatut}`,
      });
      showToast('success', `Statut changé vers "${newStatut}". Le client verra ce changement reflété sur son compte.`);
    } catch (err) {
      showToast('error', `Erreur lors de l'enregistrement${err instanceof Error ? ' : ' + err.message : ''}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDateChange(field: 'trial_end_date' | 'subscription_start' | 'next_billing', value: string) {
    try {
      await patch({ [field]: value });
    } catch (err) {
      showToast('error', `Impossible de mettre à jour la date. Réessayez dans quelques instants.${err instanceof Error ? ' (' + err.message + ')' : ''}`);
    }
  }

  async function handleSuspendToggle() {
    if (!client) return;
    const willSuspend = client.statut !== 'Suspendu';
    const message = willSuspend
      ? 'Êtes-vous sûr ? Cette action suspend immédiatement l\'accès du client à son espace Kadria.'
      : 'Êtes-vous sûr ? Cette action réactive le compte du client.';
    if (!confirm(message)) return;

    try {
      const fields: Record<string, unknown> = {
        statut: willSuspend ? 'Suspendu' : 'Actif',
        history_entry: willSuspend ? 'Compte suspendu' : 'Compte réactivé',
      };
      if (willSuspend) {
        fields.suspended_at = new Date().toISOString();
      }
      await patch(fields);
    } catch (err) {
      showToast('error', `Impossible de mettre à jour le statut.${err instanceof Error ? ' (' + err.message + ')' : ''}`);
    }
  }

  async function handleCancelConfirm() {
    if (!confirm("Êtes-vous sûr ? Cette action résilie l'abonnement du client.")) return;
    try {
      await patch({
        statut: 'Résilié',
        cancelled_at: cancelDate,
        cancellation_reason: cancelReason,
        history_entry: `Abonnement résilié — motif : ${cancelReason || 'non précisé'}`,
      });

      if (cancelNotify && client) {
        await fetch('/api/admin/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: client.email,
            subject: 'Votre abonnement Kadria a été résilié',
            body: 'Nous vous confirmons la résiliation de votre abonnement Kadria. Si vous pensez qu\'il s\'agit d\'une erreur, contactez-nous.',
            client_name: `${client.firstName} ${client.lastName}`.trim(),
          }),
        });
      }

      setCancelOpen(false);
      showToast('success', cancelNotify
        ? 'Abonnement résilié. Un email de confirmation a été envoyé au client.'
        : 'Abonnement résilié. Le client n\'a pas été notifié par email.');
    } catch (err) {
      showToast('error', `Impossible de résilier l'abonnement.${err instanceof Error ? ' (' + err.message + ')' : ''}`);
    }
  }

  function applyTemplate(name: string) {
    setEmailTemplate(name);
    const tpl = EMAIL_TEMPLATES[name];
    if (tpl) {
      setEmailSubject(tpl.subject);
      setEmailBody(tpl.body);
    }
  }

  async function handleSendEmail() {
    if (!client) return;
    setEmailSending(true);
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client.email,
          subject: emailSubject,
          body: emailBody,
          client_name: `${client.firstName} ${client.lastName}`.trim(),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      await patch({ history_entry: `Email envoyé — sujet : "${emailSubject}"` });

      setEmailOpen(false);
      setEmailSubject('');
      setEmailBody('');
      setEmailTemplate('Autre');
      showToast('success', 'Email envoyé. Une copie est disponible dans l\'historique des échanges de ce client.');
    } catch {
      showToast('error', "Impossible d'envoyer l'email. Réessayez dans quelques instants.");
    } finally {
      setEmailSending(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <LoadingStats count={3} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <LoadingForm fields={5} />
          <LoadingCard lines={4} />
        </div>
      </div>
    );
  }
  if (error) return <p style={{ color: 'var(--status-lost)' }}>{error}</p>;
  if (!client) return null;

  const historyEntries = (client.notesAdmin || '')
    .split('\n')
    .filter((line) => /^\[.+?\]\s*\(.+?\)/.test(line))
    .reverse();

  return (
    <div>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 1000,
            padding: '14px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-1)',
            background: toast.type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(220,38,38,0.95)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            maxWidth: '360px',
          }}
        >
          {toast.message}
        </div>
      )}

      <Link href="/admin/clients" style={{ fontSize: '13px', color: 'var(--text-2)', textDecoration: 'none' }}>
        ← Retour aux artisans
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '16px 0 24px', flexWrap: 'wrap' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--accent)',
            flexShrink: 0,
          }}
        >
          {initials(client.firstName, client.lastName, client.email)}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>
            {`${client.firstName} ${client.lastName}`.trim() || '—'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '4px 0 0' }}>
            {client.email}{client.company ? ` · ${client.company}` : ''}
          </p>
        </div>
        <AdminBadge label={client.statut} tone={STATUT_TONE[client.statut] || 'neutral'} variant="status" />
        <AdminBadge label={client.plan} tone={PLAN_TONE[client.plan] || 'neutral'} variant="plan" />
      </div>

      <AdminCard style={{ marginBottom: '16px' }}>
        <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Santé artisan</p>
        {!health && <AdminEmptyState compact title="Donnée à venir" description="Les indicateurs de santé apparaîtront ici dès qu'ils seront disponibles." />}
        {health && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <AdminBadge label={health.label} tone={HEALTH_TONE[health.status]} variant="health" />
            </div>
            {health.reasons.length > 0 && (
              <ul style={{ margin: '0 0 12px', paddingLeft: '18px', fontSize: '13px', color: 'var(--text-2)' }}>
                {health.reasons.map((reason, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{reason}</li>
                ))}
              </ul>
            )}
            <p style={{ fontSize: '13px', color: 'var(--text-1)', margin: 0, fontStyle: 'italic' }}>
              {health.recommendation}
            </p>
          </>
        )}
      </AdminCard>

      <AdminCard style={{ marginBottom: '16px' }}>
        <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Configuration métier</p>
        {!setupProgress && (
          <AdminEmptyState compact title="Données de configuration indisponibles" description="La progression de configuration apparaîtra ici dès qu'elle sera accessible." />
        )}
        {setupProgress && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '22px', fontWeight: 800 }}>{setupProgress.percent}%</span>
              <AdminBadge label={setupProgress.band.label} tone={SETUP_BAND_TONE[setupProgress.band.key]} variant="setup" />
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                {setupProgress.completedSteps} / {setupProgress.totalSteps} étapes complétées
              </span>
            </div>
            <div style={{ height: '6px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ height: '100%', width: `${setupProgress.percent}%`, background: 'var(--accent)', transition: 'width 0.2s' }} />
            </div>
            {!setupProgress.dataAvailable && (
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 12px' }}>
                Certaines données de configuration sont indisponibles — score calculé sur les données accessibles uniquement.
              </p>
            )}

            {setupProgress.steps.filter((s) => s.status === 'done').length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ ...label, marginBottom: '8px' }}>Étapes terminées</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {setupProgress.steps
                    .filter((s) => s.status === 'done')
                    .map((s) => (
                      <span
                        key={s.key}
                        style={{
                          background: 'rgba(34,197,94,0.08)',
                          color: 'var(--accent)',
                          borderRadius: '999px',
                          padding: '3px 9px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        ✓ {s.label}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {setupProgress.steps.filter((s) => s.status === 'todo').length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--accent)', margin: 0, fontWeight: 600 }}>
                Configuration complète — rien à faire avec ce client.
              </p>
            ) : (
              <div>
                <p style={{ ...label, marginBottom: '8px' }}>À faire avec l'artisan</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {setupProgress.steps
                    .filter((s) => s.status === 'todo')
                    .sort((a, b) => a.priority - b.priority)
                    .map((s) => (
                      <div
                        key={s.key}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{s.label}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)' }}>{s.description}</p>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--status-callback)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {s.ctaLabel}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </AdminCard>

      <div className="admin-client-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', alignItems: 'start' }}>
        <div>
          <AdminCard style={{ marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Informations</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <span style={label}>Prénom</span>
                <input style={inputStyle} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <span style={label}>Nom</span>
                <input style={inputStyle} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={label}>Email</span>
              <input style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={label}>Téléphone</span>
              <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={label}>Entreprise</span>
              <input style={inputStyle} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={label}>SIRET</span>
              <input style={inputStyle} value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <span style={label}>Adresse</span>
              <AddressAutocomplete
                value={form.address}
                onChange={(value) => setForm({ ...form, address: value })}
                onSelect={(selection) => setForm({ ...form, address: selection.address })}
                placeholder="12 rue de la Paix, 75001 Paris"
                style={inputStyle}
              />
            </div>
            <AdminButton onClick={handleSaveInfo} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </AdminButton>
          </AdminCard>

          <AdminCard style={{ marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px' }}>Notes admin</p>
            <textarea
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-2)', margin: '8px 0 12px' }}>
              Ces notes sont visibles uniquement par l&apos;admin
            </p>
            <AdminButton variant="secondary" onClick={handleSaveNotes} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Sauvegarder la note'}
            </AdminButton>
          </AdminCard>

          <AdminCard style={{ marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px' }}>Historique admin</p>
            {historyEntries.length === 0 && (
              <AdminEmptyState compact title="Aucune action enregistrée" description="L'historique des actions admin apparaîtra ici." />
            )}
            {historyEntries.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historyEntries.map((entry, i) => (
                  <div key={i} style={{ fontSize: '13px', color: 'var(--text-2)', borderLeft: '2px solid var(--border)', paddingLeft: '10px' }}>
                    {entry}
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>

        <div>
          <AdminCard style={{ marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Abonnement &amp; facturation</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              <AdminBadge label={billingStatusBadge(client).label} tone={billingStatusBadge(client).tone} variant="billing" />
              {client.plan && <AdminBadge label={client.plan} tone={PLAN_TONE[client.plan] || 'neutral'} variant="plan" />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-2)' }}>Plan actuel</span>
                <span style={{ fontWeight: 700 }}>{client.plan || 'Non disponible'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-2)' }}>Trial actif</span>
                <span style={{ fontWeight: 700 }}>{client.statut === 'Trial' ? 'Oui' : 'Non'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-2)' }}>Date de fin trial</span>
                <span style={{ fontWeight: 700 }}>{formatDateFr(client.trialEnd || client.trialEndDate)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-2)' }}>Statut paiement</span>
                <span style={{ fontWeight: 700 }}>{client.billingStatus || 'Non disponible'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-2)' }}>Prochaine échéance</span>
                <span style={{ fontWeight: 700 }}>{formatDateFr(client.currentPeriodEnd || client.nextBilling)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-2)' }}>Dernière facture</span>
                <span style={{ fontWeight: 700 }}>Non disponible</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', wordBreak: 'break-all' }}>
                <span style={{ color: 'var(--text-2)' }}>Stripe customer ID</span>
                <span style={{ fontWeight: 700, fontSize: '12px' }}>{client.stripeCustomerId || 'Non disponible'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', wordBreak: 'break-all' }}>
                <span style={{ color: 'var(--text-2)' }}>Stripe subscription ID</span>
                <span style={{ fontWeight: 700, fontSize: '12px' }}>{client.stripeSubscriptionId || 'Non disponible'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-2)' }}>Historique billing</span>
                <span style={{ fontWeight: 700 }}>Non disponible</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={handleOpenPortal}
                disabled={!client.stripeCustomerId || portalLoading}
                style={{
                  ...secondaryButton,
                  width: '100%',
                  opacity: client.stripeCustomerId ? 1 : 0.5,
                  cursor: client.stripeCustomerId ? 'pointer' : 'not-allowed',
                }}
              >
                {!client.stripeCustomerId
                  ? 'Customer Portal — à connecter'
                  : portalLoading
                    ? 'Ouverture...'
                    : 'Ouvrir le Customer Portal'}
              </button>
              <button
                disabled
                title="Nécessite une route d'annulation Stripe non encore implémentée"
                style={{
                  ...secondaryButton,
                  width: '100%',
                  opacity: 0.5,
                  cursor: 'not-allowed',
                }}
              >
                Annulation — à connecter
              </button>
            </div>
          </AdminCard>

          <AdminCard style={{ marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Abonnement</p>

            <span style={label}>Plan actuel</span>
            <select
              style={{ ...inputStyle, marginBottom: '16px' }}
              value={client.plan || ''}
              onChange={(e) => handlePlanChange(e.target.value)}
              disabled={saving}
            >
              <option value="">Aucun</option>
              <option value="Essentiel">Essentiel (149€)</option>
              <option value="Performance">Performance (249€)</option>
              <option value="Agence">Agence (sur devis)</option>
            </select>

            <span style={label}>Statut du compte</span>
            <select
              style={{ ...inputStyle, marginBottom: '16px' }}
              value={client.statut || ''}
              onChange={(e) => handleStatutChange(e.target.value)}
              disabled={saving}
            >
              <option value="Trial">Trial</option>
              <option value="Actif">Actif</option>
              <option value="Suspendu">Suspendu</option>
              <option value="Résilié">Résilié</option>
            </select>

            {(client.statut === 'Actif' || client.statut === 'Suspendu') && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <span style={label}>Abonnement depuis</span>
                  <input
                    type="date"
                    style={inputStyle}
                    defaultValue={toInputDate(client.subscriptionStart)}
                    onChange={(e) => handleDateChange('subscription_start', e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={label}>Prochaine facturation</span>
                  <input
                    type="date"
                    style={inputStyle}
                    defaultValue={toInputDate(client.nextBilling)}
                    onChange={(e) => handleDateChange('next_billing', e.target.value)}
                  />
                </div>
              </>
            )}

            {client.statut === 'Trial' && (
              <div>
                <span style={label}>Fin de trial</span>
                <input
                  type="date"
                  style={inputStyle}
                  defaultValue={toInputDate(client.trialEndDate)}
                  onChange={(e) => handleDateChange('trial_end_date', e.target.value)}
                />
              </div>
            )}
          </AdminCard>

          <AdminCard style={{ marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Actions rapides</p>

            <button
              onClick={handleSuspendToggle}
              style={{
                width: '100%',
                marginBottom: '8px',
                borderRadius: '10px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                ...(client.statut === 'Suspendu'
                  ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--accent)' }
                  : { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--status-callback)' }),
              }}
            >
              {client.statut === 'Suspendu' ? '▶ Réactiver' : '⏸ Suspendre le compte'}
            </button>

            <button
              onClick={() => setCancelOpen(true)}
              style={{
                width: '100%',
                marginBottom: '8px',
                borderRadius: '10px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.2)',
                color: 'var(--status-lost)',
              }}
            >
              ✕ Résilier l&apos;abonnement
            </button>

            <button
              onClick={() => setEmailOpen(true)}
              style={{
                width: '100%',
                borderRadius: '10px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'var(--border)',
                border: '1px solid var(--border)',
                color: 'var(--text-1)',
              }}
            >
              📧 Envoyer un email
            </button>
          </AdminCard>

          <AdminCard style={{ marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Métriques artisan</p>
            {!metrics && <AdminEmptyState compact title="Aucune donnée disponible" description="Les métriques apparaîtront ici dès qu'elles seront disponibles." />}
            {metrics && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>Total dossiers créés</span>
                  <span style={{ fontWeight: 700 }}>{metrics.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>Dossiers ce mois</span>
                  <span style={{ fontWeight: 700 }}>{metrics.ceMois}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>Devis générés</span>
                  <span style={{ fontWeight: 700 }}>{metrics.devisGeneres}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>Statut le plus fréquent</span>
                  <span style={{ fontWeight: 700 }}>{metrics.statutFrequent || '—'}</span>
                </div>
              </div>
            )}
          </AdminCard>

          <AdminCard style={{ marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Valeur générée</p>
            {!metrics?.value && <AdminEmptyState compact title="Donnée à venir" description="La valeur générée apparaîtra ici dès qu'elle sera disponible." />}
            {metrics?.value && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>Dossiers captés</span>
                  <span style={{ fontWeight: 700 }}>{metrics.value.dossiersCaptes}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>Devis envoyés</span>
                  <span style={{ fontWeight: 700 }}>{metrics.value.devisEnvoyes}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>Devis acceptés</span>
                  <span style={{ fontWeight: 700 }}>{metrics.value.devisAcceptes}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>CA potentiel (devis envoyés)</span>
                  <span style={{ fontWeight: 700 }}>{formatMoney(metrics.value.caPotentiel)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>CA gagné (devis acceptés)</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatMoney(metrics.value.caGagne)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>Temps estimé économisé</span>
                  <span style={{ fontWeight: 700 }}>{Math.round(metrics.value.tempsEstimeEconomiseMinutes / 60)} h</span>
                </div>
              </div>
            )}
          </AdminCard>

          <AdminCard style={{ marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Usage vocal</p>
            {!usage && <AdminEmptyState compact title="Donnée à venir" description="Les données d'usage vocal apparaîtront ici dès qu'elles seront disponibles." />}
            {usage && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-2)' }}>Appels utilisés</span>
                  <span style={{ fontWeight: 700 }}>{usageLabel(usage.vapi.callsUsed, usage.vapi.callsUnlimited ? null : usage.vapi.callsLimit)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>Minutes utilisées</span>
                  <span style={{ fontWeight: 700 }}>{usageLabel(usage.vapi.minutesUsed, usage.vapi.minutesLimit)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)' }}>% consommé (appels)</span>
                  <span style={{ fontWeight: 700 }}>{usage.vapi.callsPercent !== null ? `${usage.vapi.callsPercent}%` : '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-2)' }}>Statut quota vocal</span>
                  <AdminBadge label={USAGE_STATUS_LABEL[usage.vapi.status]} tone={USAGE_STATUS_TONE[usage.vapi.status]} variant="usage" />
                </div>
              </div>
            )}
          </AdminCard>

          <AdminCard style={{ marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Derniers événements</p>
            {(!metrics?.events || metrics.events.length === 0) && (
              <AdminEmptyState compact title="Logs à venir" description="Les derniers événements apparaîtront ici." />
            )}
            {metrics?.events && metrics.events.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {metrics.events.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-1)' }}>{ev.label}</span>
                    <span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {new Date(ev.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      </div>

      <AdminModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Résilier l'abonnement"
        description="Êtes-vous sûr ? Cette action résilie l'abonnement du client."
        size="sm"
        danger
      >
        <span style={label}>Motif de résiliation</span>
        <textarea
          rows={3}
          style={{ ...inputStyle, marginBottom: '12px', resize: 'vertical', fontFamily: 'inherit' }}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Motif..."
        />
        <span style={label}>Date effective</span>
        <input
          type="date"
          style={{ ...inputStyle, marginBottom: '12px' }}
          value={cancelDate}
          onChange={(e) => setCancelDate(e.target.value)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-2)', marginBottom: '20px' }}>
          <input type="checkbox" checked={cancelNotify} onChange={(e) => setCancelNotify(e.target.checked)} />
          Notifier le client par email
        </label>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <AdminButton variant="secondary" onClick={() => setCancelOpen(false)}>Annuler</AdminButton>
          <AdminButton variant="danger" onClick={handleCancelConfirm}>
            Confirmer la résiliation
          </AdminButton>
        </div>
      </AdminModal>

      <AdminModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title={`Envoyer un email à ${client.email}`}
        size="lg"
      >
        <span style={label}>Modèle rapide</span>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {Object.keys(EMAIL_TEMPLATES).map((name) => (
            <button
              key={name}
              onClick={() => applyTemplate(name)}
              style={{
                ...secondaryButton,
                padding: '6px 12px',
                fontSize: '12px',
                ...(emailTemplate === name ? { background: 'rgba(34,197,94,0.1)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.3)' } : {}),
              }}
            >
              {name}
            </button>
          ))}
        </div>

        <span style={label}>Objet</span>
        <input
          style={{ ...inputStyle, marginBottom: '12px' }}
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
        />

        <span style={label}>Corps du message</span>
        <textarea
          rows={6}
          style={{ ...inputStyle, marginBottom: '20px', resize: 'vertical', fontFamily: 'inherit' }}
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
        />

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <AdminButton variant="secondary" onClick={() => setEmailOpen(false)}>Annuler</AdminButton>
          <AdminButton onClick={handleSendEmail} disabled={emailSending}>
            Envoyer via Resend
          </AdminButton>
        </div>
      </AdminModal>

      <style>{`
        @media (max-width: 1023px) {
          .admin-client-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
