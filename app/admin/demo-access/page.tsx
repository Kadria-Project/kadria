'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminBadge, { type AdminBadgeTone } from '@/src/components/admin/AdminBadge';
import AdminButton from '@/src/components/admin/AdminButton';
import AdminCard from '@/src/components/admin/AdminCard';
import AdminEmptyState from '@/src/components/admin/AdminEmptyState';
import AdminTable from '@/src/components/admin/AdminTable';
import LoadingTable from '@/src/components/ui/loading/LoadingTable';

type DemoAccessStatus = 'pending' | 'approved' | 'rejected' | 'revoked' | 'expired';
type DemoAccessFilter = 'all' | DemoAccessStatus | 'revoked_or_expired';

interface DemoAccessRequest {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  trade: string | null;
  monthly_requests_volume: string | null;
  current_tool: string | null;
  main_need: string | null;
  objective: string | null;
  message: string | null;
  consent_contact: boolean;
  status: DemoAccessStatus;
  effective_status: DemoAccessStatus;
  expires_at: string | null;
  last_access_at: string | null;
  access_count: number;
  internal_note: string | null;
}

const STATUS_LABELS: Record<DemoAccessStatus, string> = {
  pending: 'En attente',
  approved: 'Approuve',
  rejected: 'Refuse',
  revoked: 'Revoque',
  expired: 'Expire',
};

const STATUS_TONES: Record<DemoAccessStatus, AdminBadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  revoked: 'neutral',
  expired: 'info',
};

const FILTERS: { key: DemoAccessFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Approuves' },
  { key: 'rejected', label: 'Refuses' },
  { key: 'revoked_or_expired', label: 'Revoques / expires' },
];

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminDemoAccessPage() {
  const [requests, setRequests] = useState<DemoAccessRequest[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState<DemoAccessFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  async function loadRequests() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/demo-access');
      const data = await response.json();
      if (Array.isArray(data)) {
        setRequests(data);
        if (!selectedId && data[0]?.id) {
          setSelectedId(data[0].id);
          setNoteDraft(data[0].internal_note || '');
        }
      }
    } catch {
      setFeedback('Impossible de charger les demandes demo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((request) => {
      const statusOk =
        filter === 'all' ? true :
        filter === 'revoked_or_expired'
          ? request.effective_status === 'revoked' || request.effective_status === 'expired'
          : request.effective_status === filter;

      if (!statusOk) return false;
      if (!term) return true;

      const haystack = [
        request.first_name,
        request.last_name,
        request.company_name || '',
        request.email,
        request.trade || '',
      ].join(' ').toLowerCase();

      return haystack.includes(term);
    });
  }, [filter, requests, search]);

  const selectedRequest = filteredRequests.find((request) => request.id === selectedId)
    || requests.find((request) => request.id === selectedId)
    || filteredRequests[0]
    || null;

  useEffect(() => {
    if (selectedRequest) {
      setSelectedId(selectedRequest.id);
      setNoteDraft(selectedRequest.internal_note || '');
    }
  }, [selectedRequest?.id, selectedRequest?.internal_note]);

  async function handleApprove(sendEmail: boolean) {
    if (!selectedRequest) return;
    setSubmitting(true);
    setFeedback('');

    try {
      const response = await fetch('/api/admin/demo-access/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: selectedRequest.id, sendEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l’approbation');
      }

      setGeneratedLink(data.verifyUrl || '');
      setFeedback(
        sendEmail
          ? data.emailed
            ? 'Acces approuve et email envoye.'
            : 'Acces approuve. Email non envoye, mais le lien est disponible a copier.'
          : 'Acces approuve. Le lien est pret a etre copie.'
      );
      await loadRequests();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erreur lors de l’approbation');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke() {
    if (!selectedRequest) return;
    setSubmitting(true);
    setFeedback('');
    try {
      const response = await fetch('/api/admin/demo-access/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: selectedRequest.id, internalNote: noteDraft }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la revocation');
      }

      setGeneratedLink('');
      setFeedback('Acces revoque.');
      await loadRequests();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erreur lors de la revocation');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!selectedRequest) return;
    setSubmitting(true);
    setFeedback('');
    try {
      const response = await fetch('/api/admin/demo-access/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: selectedRequest.id, internalNote: noteDraft }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du refus');
      }

      setGeneratedLink('');
      setFeedback('Demande refusee.');
      await loadRequests();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erreur lors du refus');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveNote() {
    if (!selectedRequest) return;
    setSubmitting(true);
    setFeedback('');
    try {
      const response = await fetch(`/api/admin/demo-access/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalNote: noteDraft }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      setFeedback('Note interne sauvegardee.');
      await loadRequests();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyLink() {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setFeedback('Lien copie.');
    } catch {
      setFeedback('Impossible de copier automatiquement le lien.');
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Demandes d&apos;acces demo</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: '4px 0 0' }}>
          Qualifiez les prospects avant de leur ouvrir la demonstration complete.
        </p>
      </div>

      <AdminCard radius="md" padding="lg" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              style={{
                borderRadius: '999px',
                border: filter === item.key ? '1px solid rgba(34,197,94,0.4)' : '1px solid var(--border)',
                background: filter === item.key ? 'rgba(34,197,94,0.08)' : 'transparent',
                color: filter === item.key ? 'var(--accent)' : 'var(--text-2)',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher par email ou entreprise"
          style={{
            width: '100%',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            color: 'var(--text-1)',
            fontSize: '13px',
            padding: '10px 12px',
          }}
        />
      </AdminCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(340px, 0.9fr)', gap: '20px' }} className="admin-demo-access-grid">
        <AdminTable
          columns={['Prospect', 'Entreprise', 'Metier', 'Objectif', 'Statut', 'Cree le', 'Expire le', 'Acces']}
          loading={loading ? <LoadingTable columns={8} rows={6} style={{ border: 'none', borderRadius: 0 }} /> : undefined}
          emptyState={!loading && filteredRequests.length === 0 ? (
            <AdminEmptyState title="Aucune demande" description="Aucune demande ne correspond aux filtres actuels." />
          ) : undefined}
        >
          <tbody>
            {filteredRequests.map((request) => (
              <tr
                key={request.id}
                onClick={() => setSelectedId(request.id)}
                style={{
                  borderTop: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: selectedId === request.id ? 'rgba(34,197,94,0.06)' : 'transparent',
                }}
              >
                <td style={{ padding: '12px 20px' }}>
                  <div style={{ fontWeight: 600 }}>{`${request.first_name} ${request.last_name}`.trim()}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: '12px' }}>{request.email}</div>
                </td>
                <td style={{ padding: '12px 20px' }}>{request.company_name || '—'}</td>
                <td style={{ padding: '12px 20px' }}>{request.trade || '—'}</td>
                <td style={{ padding: '12px 20px' }}>{request.objective || '—'}</td>
                <td style={{ padding: '12px 20px' }}>
                  <AdminBadge label={STATUS_LABELS[request.effective_status]} tone={STATUS_TONES[request.effective_status]} variant="status" />
                </td>
                <td style={{ padding: '12px 20px', color: 'var(--text-2)' }}>{formatDateTime(request.created_at)}</td>
                <td style={{ padding: '12px 20px', color: 'var(--text-2)' }}>{formatDateTime(request.expires_at)}</td>
                <td style={{ padding: '12px 20px', color: 'var(--text-2)' }}>
                  {request.access_count} / {formatDateTime(request.last_access_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>

        <AdminCard
          radius="md"
          padding="lg"
          title={selectedRequest ? `${selectedRequest.first_name} ${selectedRequest.last_name}`.trim() : 'Detail demande'}
          subtitle={selectedRequest ? `${selectedRequest.company_name || 'Entreprise non renseignee'} · ${selectedRequest.email}` : 'Selectionnez une demande'}
        >
          {!selectedRequest ? (
            <AdminEmptyState compact title="Aucune demande selectionnee" description="Cliquez sur une ligne pour afficher le detail et agir." />
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <AdminBadge label={STATUS_LABELS[selectedRequest.effective_status]} tone={STATUS_TONES[selectedRequest.effective_status]} variant="status" />
                <AdminBadge label={selectedRequest.trade || 'Metier non renseigne'} tone="neutral" variant="feature" />
                <AdminBadge label={selectedRequest.objective || 'Objectif non renseigne'} tone="info" variant="feature" />
              </div>

              <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                <DetailRow label="Telephone" value={selectedRequest.phone} />
                <DetailRow label="Besoin principal" value={selectedRequest.main_need} />
                <DetailRow label="Outil actuel" value={selectedRequest.current_tool} />
                <DetailRow label="Volume de demandes" value={selectedRequest.monthly_requests_volume} />
                <DetailRow label="Dernier acces" value={formatDateTime(selectedRequest.last_access_at)} />
                <DetailRow label="Nombre d'acces" value={String(selectedRequest.access_count || 0)} />
                <DetailRow label="Consentement contact" value={selectedRequest.consent_contact ? 'Oui' : 'Non'} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700, margin: '0 0 6px' }}>
                  Message libre
                </p>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', fontSize: '13px', color: 'var(--text-2)', minHeight: '72px', whiteSpace: 'pre-wrap' }}>
                  {selectedRequest.message || 'Aucun message'}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700, margin: '0 0 6px' }}>
                  Note interne
                </p>
                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  rows={5}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    color: 'var(--text-1)',
                    fontSize: '13px',
                    padding: '12px',
                    resize: 'vertical',
                  }}
                />
                <div style={{ marginTop: '10px' }}>
                  <AdminButton variant="secondary" onClick={handleSaveNote} disabled={submitting}>
                    Sauvegarder note interne
                  </AdminButton>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                <AdminButton onClick={() => handleApprove(false)} disabled={submitting}>
                  {selectedRequest.effective_status === 'approved' ? 'Regenerer le lien' : 'Approuver'}
                </AdminButton>
                <AdminButton variant="secondary" onClick={() => handleApprove(true)} disabled={submitting}>
                  Approuver + envoyer email
                </AdminButton>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <AdminButton variant="danger" onClick={handleRevoke} disabled={submitting}>
                    Revoquer
                  </AdminButton>
                  <AdminButton variant="ghost" onClick={handleReject} disabled={submitting}>
                    Refuser
                  </AdminButton>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700, margin: '0 0 6px' }}>
                  Lien d'acces genere
                </p>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: generatedLink ? 'var(--text-1)' : 'var(--text-3)', wordBreak: 'break-all' }}>
                  {generatedLink || 'Aucun lien genere dans cette session. Cliquez sur Approuver pour generer ou regenerer le lien.'}
                </div>
                <div style={{ marginTop: '10px' }}>
                  <AdminButton variant="secondary" onClick={handleCopyLink} disabled={!generatedLink}>
                    Copier le lien
                  </AdminButton>
                </div>
              </div>

              {feedback && (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)' }}>{feedback}</p>
              )}
            </>
          )}
        </AdminCard>
      </div>

      <style>{`
        @media (max-width: 1199px) {
          .admin-demo-access-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700, margin: '0 0 4px' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-1)' }}>{value || '—'}</p>
    </div>
  );
}
