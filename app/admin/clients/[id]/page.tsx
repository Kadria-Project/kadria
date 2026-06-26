'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AddressAutocomplete from '@/components/AddressAutocomplete';

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

const SETUP_BAND_BADGE: Record<SetupProgressBandKey, { bg: string; color: string }> = {
  a_demarrer: { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
  a_completer: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  presque_pret: { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa' },
  complet: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
};

type UsageStatus = 'ok' | 'warning' | 'limit_reached' | 'exceeded';

interface UsageSummary {
  projects: { used: number; limit: number | null; unlimited: boolean; percent: number | null; status: UsageStatus };
  vapi: { callsUsed: number; callsLimit: number | null; callsUnlimited: boolean; callsPercent: number | null; minutesUsed: number; minutesLimit: number | null; minutesPercent: number | null; status: UsageStatus };
  devis: { used: number; limit: number | null; unlimited: boolean; percent: number | null; status: UsageStatus };
}

const HEALTH_BADGE: Record<ClientHealthStatus, { bg: string; color: string }> = {
  healthy: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  watch: { bg: 'rgba(161,161,170,0.12)', color: '#a1a1aa' },
  quota_warning: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  upgrade_opportunity: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
  inactive: { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
};

const USAGE_STATUS_BADGE: Record<UsageStatus, { bg: string; color: string; label: string }> = {
  ok: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', label: 'OK' },
  warning: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: '80% atteint' },
  limit_reached: { bg: 'rgba(245,158,11,0.18)', color: '#f59e0b', label: 'Limite atteinte' },
  exceeded: { bg: 'rgba(220,38,38,0.12)', color: '#dc2626', label: 'Dépassement' },
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0);
}

function usageLabel(used: number, limit: number | null) {
  return `${used} / ${limit === null ? 'Illimité' : limit}`;
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

function billingStatusBadge(client: UserRecord): { label: string; bg: string; color: string } {
  if (client.cancelAtPeriodEnd) {
    return { label: 'Annulation prévue', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' };
  }
  if (client.billingStatus === 'past_due' || client.billingStatus === 'unpaid') {
    return { label: 'Paiement en échec', bg: 'rgba(220,38,38,0.12)', color: '#dc2626' };
  }
  if (client.billingStatus === 'trialing' || client.statut === 'Trial') {
    return { label: 'Trial actif', bg: 'rgba(59,130,246,0.1)', color: '#60a5fa' };
  }
  if (client.billingStatus === 'active') {
    return { label: 'Paiement OK', bg: 'rgba(34,197,94,0.1)', color: '#22c55e' };
  }
  if (client.billingStatus === 'canceled') {
    return { label: 'Résilié', bg: 'rgba(220,38,38,0.1)', color: '#dc2626' };
  }
  return { label: 'Non disponible', bg: 'rgba(161,161,170,0.12)', color: '#a1a1aa' };
}

function initials(firstName: string, lastName: string, email: string) {
  const a = (firstName || '').trim()[0];
  const b = (lastName || '').trim()[0];
  if (a && b) return (a + b).toUpperCase();
  if (a) return a.toUpperCase();
  return (email || '?')[0].toUpperCase();
}

const card: React.CSSProperties = {
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
};

const label: React.CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#71717a',
  fontWeight: 700,
  marginBottom: '6px',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  background: '#09090b',
  border: '1px solid #27272a',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '13px',
  padding: '8px 10px',
  width: '100%',
  boxSizing: 'border-box',
};

const primaryButton: React.CSSProperties = {
  background: '#22c55e',
  color: '#09090b',
  border: 'none',
  borderRadius: '10px',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  background: '#27272a',
  color: '#ffffff',
  border: '1px solid #27272a',
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
      showToast('success', 'Modifications enregistrées');
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
      showToast('success', 'Modifications enregistrées');
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
      showToast('success', 'Modifications enregistrées');
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
      showToast('success', 'Modifications enregistrées');
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
      alert(`Erreur lors de la mise à jour de la date : ${err instanceof Error ? err.message : String(err)}`);
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
      alert(`Erreur lors de la mise à jour du statut : ${err instanceof Error ? err.message : String(err)}`);
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
    } catch (err) {
      alert(`Erreur lors de la résiliation : ${err instanceof Error ? err.message : String(err)}`);
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
    } catch {
      alert("Erreur lors de l'envoi de l'email");
    } finally {
      setEmailSending(false);
    }
  }

  if (loading) return <p style={{ color: '#a1a1aa' }}>Chargement...</p>;
  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>;
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
            color: '#fff',
            background: toast.type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(220,38,38,0.95)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            maxWidth: '360px',
          }}
        >
          {toast.message}
        </div>
      )}

      <Link href="/admin/clients" style={{ fontSize: '13px', color: '#a1a1aa', textDecoration: 'none' }}>
        ← Retour aux artisans
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '16px 0 24px', flexWrap: 'wrap' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 700,
            color: '#22c55e',
            flexShrink: 0,
          }}
        >
          {initials(client.firstName, client.lastName, client.email)}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>
            {`${client.firstName} ${client.lastName}`.trim() || '—'}
          </h1>
          <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0' }}>
            {client.email}{client.company ? ` · ${client.company}` : ''}
          </p>
        </div>
        <Badge label={client.statut} palette={STATUT_BADGE[client.statut]} />
        <Badge label={client.plan} palette={PLAN_BADGE[client.plan]} />
      </div>

      <div style={card}>
        <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Santé artisan</p>
        {!health && <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>Donnée à venir</p>}
        {health && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <span
                style={{
                  background: HEALTH_BADGE[health.status].bg,
                  color: HEALTH_BADGE[health.status].color,
                  borderRadius: '999px',
                  padding: '5px 12px',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                {health.label}
              </span>
            </div>
            {health.reasons.length > 0 && (
              <ul style={{ margin: '0 0 12px', paddingLeft: '18px', fontSize: '13px', color: '#a1a1aa' }}>
                {health.reasons.map((reason, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{reason}</li>
                ))}
              </ul>
            )}
            <p style={{ fontSize: '13px', color: '#e4e4e7', margin: 0, fontStyle: 'italic' }}>
              {health.recommendation}
            </p>
          </>
        )}
      </div>

      <div style={card}>
        <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Configuration métier</p>
        {!setupProgress && (
          <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>Données configuration indisponibles</p>
        )}
        {setupProgress && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '22px', fontWeight: 800 }}>{setupProgress.percent}%</span>
              <span
                style={{
                  background: SETUP_BAND_BADGE[setupProgress.band.key].bg,
                  color: SETUP_BAND_BADGE[setupProgress.band.key].color,
                  borderRadius: '999px',
                  padding: '5px 12px',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                {setupProgress.band.label}
              </span>
              <span style={{ fontSize: '13px', color: '#a1a1aa' }}>
                {setupProgress.completedSteps} / {setupProgress.totalSteps} étapes complétées
              </span>
            </div>
            <div style={{ height: '6px', borderRadius: '4px', background: '#27272a', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ height: '100%', width: `${setupProgress.percent}%`, background: '#22c55e', transition: 'width 0.2s' }} />
            </div>
            {!setupProgress.dataAvailable && (
              <p style={{ fontSize: '12px', color: '#71717a', margin: '0 0 12px' }}>
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
                          color: '#22c55e',
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
              <p style={{ fontSize: '13px', color: '#22c55e', margin: 0, fontWeight: 600 }}>
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
                          border: '1px solid #27272a',
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
                          <p style={{ margin: 0, fontSize: '12px', color: '#71717a' }}>{s.description}</p>
                        </div>
                        <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {s.ctaLabel}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="admin-client-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', alignItems: 'start' }}>
        <div>
          <div style={card}>
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
            <button style={primaryButton} onClick={handleSaveInfo} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>

          <div style={card}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px' }}>Notes admin</p>
            <textarea
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '8px 0 12px' }}>
              Ces notes sont visibles uniquement par l&apos;admin
            </p>
            <button style={secondaryButton} onClick={handleSaveNotes} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Sauvegarder la note'}
            </button>
          </div>

          <div style={card}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px' }}>Historique admin</p>
            {historyEntries.length === 0 && (
              <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>Aucune action enregistrée</p>
            )}
            {historyEntries.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historyEntries.map((entry, i) => (
                  <div key={i} style={{ fontSize: '13px', color: '#a1a1aa', borderLeft: '2px solid #27272a', paddingLeft: '10px' }}>
                    {entry}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div style={card}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Abonnement &amp; facturation</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              <Badge label={billingStatusBadge(client).label} palette={billingStatusBadge(client)} />
              {client.plan && <Badge label={client.plan} palette={PLAN_BADGE[client.plan]} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#a1a1aa' }}>Plan actuel</span>
                <span style={{ fontWeight: 700 }}>{client.plan || 'Non disponible'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#a1a1aa' }}>Trial actif</span>
                <span style={{ fontWeight: 700 }}>{client.statut === 'Trial' ? 'Oui' : 'Non'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#a1a1aa' }}>Date de fin trial</span>
                <span style={{ fontWeight: 700 }}>{formatDateFr(client.trialEnd || client.trialEndDate)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#a1a1aa' }}>Statut paiement</span>
                <span style={{ fontWeight: 700 }}>{client.billingStatus || 'Non disponible'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#a1a1aa' }}>Prochaine échéance</span>
                <span style={{ fontWeight: 700 }}>{formatDateFr(client.currentPeriodEnd || client.nextBilling)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#a1a1aa' }}>Dernière facture</span>
                <span style={{ fontWeight: 700 }}>Non disponible</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', wordBreak: 'break-all' }}>
                <span style={{ color: '#a1a1aa' }}>Stripe customer ID</span>
                <span style={{ fontWeight: 700, fontSize: '12px' }}>{client.stripeCustomerId || 'Non disponible'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', wordBreak: 'break-all' }}>
                <span style={{ color: '#a1a1aa' }}>Stripe subscription ID</span>
                <span style={{ fontWeight: 700, fontSize: '12px' }}>{client.stripeSubscriptionId || 'Non disponible'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#a1a1aa' }}>Historique billing</span>
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
          </div>

          <div style={card}>
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
          </div>

          <div style={card}>
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
                  ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }
                  : { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }),
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
                color: '#dc2626',
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
                background: '#27272a',
                border: '1px solid #27272a',
                color: '#ffffff',
              }}
            >
              📧 Envoyer un email
            </button>
          </div>

          <div style={card}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Métriques artisan</p>
            {!metrics && <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>Aucune donnée disponible</p>}
            {metrics && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Total dossiers créés</span>
                  <span style={{ fontWeight: 700 }}>{metrics.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Dossiers ce mois</span>
                  <span style={{ fontWeight: 700 }}>{metrics.ceMois}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Devis générés</span>
                  <span style={{ fontWeight: 700 }}>{metrics.devisGeneres}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Statut le plus fréquent</span>
                  <span style={{ fontWeight: 700 }}>{metrics.statutFrequent || '—'}</span>
                </div>
              </div>
            )}
          </div>

          <div style={card}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Valeur générée</p>
            {!metrics?.value && <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>Donnée à venir</p>}
            {metrics?.value && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Dossiers captés</span>
                  <span style={{ fontWeight: 700 }}>{metrics.value.dossiersCaptes}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Devis envoyés</span>
                  <span style={{ fontWeight: 700 }}>{metrics.value.devisEnvoyes}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Devis acceptés</span>
                  <span style={{ fontWeight: 700 }}>{metrics.value.devisAcceptes}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>CA potentiel (devis envoyés)</span>
                  <span style={{ fontWeight: 700 }}>{formatMoney(metrics.value.caPotentiel)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>CA gagné (devis acceptés)</span>
                  <span style={{ fontWeight: 700, color: '#22c55e' }}>{formatMoney(metrics.value.caGagne)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Temps estimé économisé</span>
                  <span style={{ fontWeight: 700 }}>{Math.round(metrics.value.tempsEstimeEconomiseMinutes / 60)} h</span>
                </div>
              </div>
            )}
          </div>

          <div style={card}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Usage vocal</p>
            {!usage && <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>Donnée à venir</p>}
            {usage && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#a1a1aa' }}>Appels utilisés</span>
                  <span style={{ fontWeight: 700 }}>{usageLabel(usage.vapi.callsUsed, usage.vapi.callsUnlimited ? null : usage.vapi.callsLimit)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Minutes utilisées</span>
                  <span style={{ fontWeight: 700 }}>{usageLabel(usage.vapi.minutesUsed, usage.vapi.minutesLimit)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>% consommé (appels)</span>
                  <span style={{ fontWeight: 700 }}>{usage.vapi.callsPercent !== null ? `${usage.vapi.callsPercent}%` : '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#a1a1aa' }}>Statut quota vocal</span>
                  <span
                    style={{
                      background: USAGE_STATUS_BADGE[usage.vapi.status].bg,
                      color: USAGE_STATUS_BADGE[usage.vapi.status].color,
                      borderRadius: '999px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {USAGE_STATUS_BADGE[usage.vapi.status].label}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={card}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Derniers événements</p>
            {(!metrics?.events || metrics.events.length === 0) && (
              <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>Logs à venir</p>
            )}
            {metrics?.events && metrics.events.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {metrics.events.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#e4e4e7' }}>{ev.label}</span>
                    <span style={{ color: '#71717a', whiteSpace: 'nowrap' }}>
                      {new Date(ev.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {cancelOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%' }}>
            <p style={{ fontWeight: 700, fontSize: '16px', margin: '0 0 8px' }}>Résilier l&apos;abonnement</p>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '0 0 16px' }}>
              Êtes-vous sûr ? Cette action résilie l&apos;abonnement du client.
            </p>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#a1a1aa', marginBottom: '20px' }}>
              <input type="checkbox" checked={cancelNotify} onChange={(e) => setCancelNotify(e.target.checked)} />
              Notifier le client par email
            </label>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button style={secondaryButton} onClick={() => setCancelOpen(false)}>Annuler</button>
              <button
                style={{ ...primaryButton, background: '#dc2626', color: '#ffffff' }}
                onClick={handleCancelConfirm}
              >
                Confirmer la résiliation
              </button>
            </div>
          </div>
        </div>
      )}

      {emailOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%' }}>
            <p style={{ fontWeight: 700, fontSize: '16px', margin: '0 0 16px' }}>Envoyer un email à {client.email}</p>

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
                    ...(emailTemplate === name ? { background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' } : {}),
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
              <button style={secondaryButton} onClick={() => setEmailOpen(false)}>Annuler</button>
              <button style={primaryButton} onClick={handleSendEmail} disabled={emailSending}>
                Envoyer via Resend
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1023px) {
          .admin-client-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
