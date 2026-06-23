'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

interface DevisLine {
  type: 'item' | 'section';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  tvaRate: number;
}

interface PublicDevis {
  id: string;
  numero: string;
  amount: number;
  total_ht: number;
  total_tva: number;
  lignes: DevisLine[];
  artisan: {
    raison_sociale: string;
    adresse: string;
    siret: string;
    tva: string;
  };
  client: {
    nom: string;
    email: string;
    adresse: string;
    telephone: string;
  };
  date_emission: string;
  date_validite: string;
  objet: string;
  conditions_paiement: string;
  delai_execution: string;
  mention_legale: string;
  pdf_url: string | null;
  accepted: boolean;
  accepted_at: string | null;
  declined: boolean;
  opens_count: number;
}

const DECLINE_REASONS = [
  'Prix trop élevé',
  'Délai trop long',
  "J'ai choisi un autre artisan",
  'Projet reporté',
  'Projet annulé',
  'Autre',
];

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatEuro(value: number) {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function PublicDevisPage() {
  const params = useParams();
  const token = params.token as string;
  const openTrackedRef = useRef(false);

  const [devis, setDevis] = useState<PublicDevis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineCategory, setDeclineCategory] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);
  const [declineError, setDeclineError] = useState('');
  const [declinedConfirmed, setDeclinedConfirmed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/devis/public/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Devis introuvable');
          return;
        }
        setDevis(data);
      } catch {
        setError('Erreur lors du chargement du devis.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    if (!devis || !token || openTrackedRef.current) return;

    const storageKey = `kadria-devis-open-${token}`;
    const now = Date.now();
    const lastTrackedAt = Number(sessionStorage.getItem(storageKey) || 0);

    if (now - lastTrackedAt < 5000) return;

    openTrackedRef.current = true;
    sessionStorage.setItem(storageKey, String(now));

    fetch(`/api/devis/public/${token}/open`, { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.opens_count === 'number') {
          setDevis((prev) => prev ? { ...prev, opens_count: data.opens_count } : prev);
        }
      })
      .catch(() => {
        // Le tracking ne doit jamais bloquer l'affichage du devis.
      });
  }, [devis, token]);

  const handleAccept = async () => {
    setAccepting(true);
    setAcceptError('');
    try {
      const res = await fetch(`/api/devis/public/accept/${token}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setAcceptError(data.error || 'Erreur lors de l\'acceptation');
        return;
      }
      setDevis((prev) => prev ? { ...prev, accepted: true, accepted_at: data.accepted_at } : prev);
    } catch {
      setAcceptError('Erreur lors de l\'acceptation');
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineConfirm = async () => {
    const freeText = declineReason.trim();
    const requiresFreeText = !declineCategory || declineCategory === 'Autre';
    const finalReason = freeText || (requiresFreeText ? '' : declineCategory);

    if (requiresFreeText && !freeText) {
      setDeclineError('Merci de préciser le motif du refus.');
      return;
    }
    if (!finalReason) {
      setDeclineError('Merci de préciser le motif du refus.');
      return;
    }

    setDeclining(true);
    setDeclineError('');
    try {
      const res = await fetch(`/api/devis/public/decline/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason, reasonCategory: declineCategory }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeclineError(data.error || 'Erreur lors du refus');
        return;
      }
      setDevis((prev) => prev ? { ...prev, declined: true } : prev);
      setDeclineOpen(false);
      setDeclinedConfirmed(true);
    } catch {
      setDeclineError('Erreur lors du refus');
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  if (error || !devis) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>{error || 'Devis introuvable.'}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#111827' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ textAlign: 'right', fontSize: '12px', color: '#9ca3af', fontWeight: 700, letterSpacing: '1px', marginBottom: '24px' }}>
          KADRIA
        </div>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px' }}>Devis {devis.numero}</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Émis le {formatDate(devis.date_emission)} · Valable jusqu&apos;au {formatDate(devis.date_validite)}
          </p>
        </div>

        {devis.accepted && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            padding: '12px 20px',
            marginBottom: '24px',
            color: '#15803d',
            fontWeight: 600,
            fontSize: '14px',
          }}>
            ✓ Devis accepté le {formatDate(devis.accepted_at)}
          </div>
        )}

        {/* Artisan + Client */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '8px' }}>
              Émetteur
            </p>
            <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>{devis.artisan.raison_sociale || '—'}</p>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 2px' }}>{devis.artisan.adresse || '—'}</p>
            {devis.artisan.siret && <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 2px' }}>SIRET : {devis.artisan.siret}</p>}
            {devis.artisan.tva && <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>TVA : {devis.artisan.tva}</p>}
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '8px' }}>
              Client
            </p>
            <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>{devis.client.nom || '—'}</p>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 2px' }}>{devis.client.adresse || '—'}</p>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 2px' }}>{devis.client.email || '—'}</p>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{devis.client.telephone || '—'}</p>
          </div>
        </div>

        {devis.objet && (
          <div style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px 20px',
            fontSize: '14px',
            marginBottom: '32px',
          }}>
            {devis.objet}
          </div>
        )}

        {/* Lines table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '24px' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700 }}>Description</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700 }}>Qté</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700 }}>Prix unit.</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700 }}>TVA</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {devis.lignes.map((line, index) =>
              line.type === 'section' ? (
                <tr key={index}>
                  <td colSpan={5} style={{ padding: '12px 12px 6px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>
                    {line.description}
                  </td>
                </tr>
              ) : (
                <tr key={index} style={{ background: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                  <td style={{ padding: '10px 12px' }}>{line.description}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{line.quantity} {line.unit}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatEuro(line.unitPrice)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{line.tvaRate}%</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{formatEuro(line.quantity * line.unitPrice)}</td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '280px', marginLeft: 'auto', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}>
            <span>Total HT</span>
            <span style={{ fontWeight: 700, textAlign: 'right' }}>{formatEuro(devis.total_ht)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}>
            <span>Total TVA</span>
            <span style={{ fontWeight: 700, textAlign: 'right' }}>{formatEuro(devis.total_tva)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: 800, borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
            <span>Total TTC</span>
            <span style={{ textAlign: 'right' }}>{formatEuro(devis.amount)}</span>
          </div>
        </div>

        {/* Conditions */}
        {(devis.conditions_paiement || devis.delai_execution || devis.mention_legale) && (
          <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {devis.conditions_paiement && (
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>
                  Conditions de paiement
                </p>
                <p style={{ fontSize: '13px', color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>{devis.conditions_paiement}</p>
              </div>
            )}
            {devis.delai_execution && (
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>
                  Délai d&apos;exécution
                </p>
                <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>{devis.delai_execution}</p>
              </div>
            )}
            {devis.mention_legale && (
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>
                  Mentions légales
                </p>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, whiteSpace: 'pre-wrap' }}>{devis.mention_legale}</p>
              </div>
            )}
          </div>
        )}

        {/* Acceptance */}
        {devis.accepted ? (
          <div style={{
            background: '#f0fdf4',
            color: '#15803d',
            fontWeight: 600,
            border: '2px solid #22c55e',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            ✓ Vous avez accepté ce devis le {formatDate(devis.accepted_at)}
          </div>
        ) : devis.declined || declinedConfirmed ? (
          <div style={{
            background: '#f9fafb',
            color: '#374151',
            fontWeight: 600,
            border: '2px solid #e5e7eb',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            Votre refus a bien été transmis à l&apos;artisan.
          </div>
        ) : (
          <div style={{
            background: '#f0fdf4',
            border: '2px solid #22c55e',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            <p style={{ fontWeight: 700, fontSize: '20px', margin: '0 0 16px' }}>Accepter ce devis</p>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              En cliquant sur &quot;J&apos;accepte ce devis&quot;, vous confirmez avoir lu et accepté les conditions ci-dessus.
              Cette acceptation a valeur contractuelle conformément à l&apos;article 1366 du Code civil.
              En acceptant ce devis, vous confirmez votre accord sur les prestations, le montant, les conditions de paiement et les délais indiqués.
            </p>
            <button
              onClick={handleAccept}
              disabled={accepting}
              style={{
                background: '#22c55e',
                color: '#000000',
                fontWeight: 700,
                fontSize: '18px',
                padding: '16px 48px',
                borderRadius: '12px',
                border: 'none',
                width: '100%',
                cursor: accepting ? 'default' : 'pointer',
                opacity: accepting ? 0.7 : 1,
              }}
            >
              {accepting ? 'Envoi...' : '✓ J\'accepte ce devis'}
            </button>
            {acceptError && (
              <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '12px' }}>{acceptError}</p>
            )}
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
              🔒 Acceptation horodatée et sécurisée
            </p>

            <button
              onClick={() => setDeclineOpen(true)}
              style={{
                marginTop: '16px',
                background: 'transparent',
                color: '#6b7280',
                fontWeight: 600,
                fontSize: '14px',
                padding: '10px 24px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                width: '100%',
                cursor: 'pointer',
              }}
            >
              Refuser le devis
            </button>
          </div>
        )}

        {/* Decline modal */}
        {declineOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(17,24,39,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 1000,
            }}
            onClick={() => !declining && setDeclineOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '28px',
                width: '100%',
                maxWidth: '440px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px', color: '#111827' }}>
                Refuser ce devis
              </h2>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
                Votre retour aide l&apos;artisan à mieux comprendre votre décision. Aucune justification détaillée n&apos;est attendue, un motif court suffit.
              </p>

              <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '8px' }}>
                Motif
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {DECLINE_REASONS.map((option) => (
                  <label
                    key={option}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      color: '#374151',
                      border: '1px solid ' + (declineCategory === option ? '#22c55e' : '#e5e7eb'),
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="decline-reason"
                      value={option}
                      checked={declineCategory === option}
                      onChange={() => setDeclineCategory(option)}
                    />
                    {option}
                  </label>
                ))}
              </div>

              <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '8px' }}>
                Précisez {declineCategory && declineCategory !== 'Autre' ? '(optionnel)' : ''}
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Quelques mots sur votre décision..."
                rows={3}
                style={{
                  width: '100%',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  marginBottom: '16px',
                  color: '#111827',
                }}
              />

              {declineError && (
                <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>{declineError}</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={handleDeclineConfirm}
                  disabled={declining}
                  style={{
                    background: '#111827',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '15px',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: declining ? 'default' : 'pointer',
                    opacity: declining ? 0.7 : 1,
                  }}
                >
                  {declining ? 'Envoi...' : 'Confirmer le refus'}
                </button>
                <button
                  onClick={() => setDeclineOpen(false)}
                  disabled={declining}
                  style={{
                    background: 'transparent',
                    color: '#6b7280',
                    fontWeight: 600,
                    fontSize: '14px',
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Download PDF */}
        {devis.pdf_url && (
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <a
              href={devis.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: 'transparent',
                border: '1px solid #e5e7eb',
                color: '#374151',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              ⬇ Télécharger le PDF
            </a>
          </div>
        )}

        {/* Footer */}
        <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', margin: 0 }}>
          Devis établi par {devis.artisan.raison_sociale || 'votre artisan'} via Kadria
        </p>
      </div>
    </div>
  );
}
