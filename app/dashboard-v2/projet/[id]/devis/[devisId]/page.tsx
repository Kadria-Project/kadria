'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/src/components/AuthGuard';
import { Button } from '@/src/components/ui/button';
import { AlertTriangle, ArrowLeft, CheckCircle, Clock, Copy, Download, Eye, Loader2, XCircle } from 'lucide-react';

interface DevisLine {
  type: 'item' | 'section';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  tvaRate: number;
}

interface DevisData {
  id: string;
  devisNumber: string;
  projetId: string;
  dateEmission: string;
  dateValidite: string;
  objet: string;
  lignesJson: string;
  totalHT: number;
  totalTVA: number;
  tvaBreakdownJson: string;
  totalTTC: number;
  conditionsPaiement: string;
  delaiExecution: string;
  mentionsLegales: string;
  statut: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;
  sent: boolean;
  pdfUrl: string | null;
  token: string;
  opensCount: number;
  lastOpenedDate: string | null;
  firstOpenedAt: string | null;
  accepted: boolean;
  acceptedAt: string | null;
  acceptedIp: string | null;
}

function formatDate(value: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatEuro(value: number) {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function DevisViewPage() {
  return (
    <AuthGuard>
      <DevisView />
    </AuthGuard>
  );
}

function DevisView() {
  const params = useParams();
  const router = useRouter();
  const projetId = params.id as string;
  const devisId = params.devisId as string;

  const [devis, setDevis] = useState<DevisData | null>(null);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [devisRes, projectRes] = await Promise.all([
          fetch(`/api/devis/${devisId}`),
          fetch(`/api/projects/${projetId}`),
        ]);
        const devisData = await devisRes.json();
        const projectData = await projectRes.json();

        if (devisData.success) {
          setDevis(devisData.devis);
        } else {
          setError(devisData.error || 'Erreur lors du chargement du devis.');
        }

        if (projectData.success) {
          const p = projectData.project;
          setClientName(`${p.clientFirstName || ''} ${p.clientName || ''}`.trim());
        }
      } catch (err) {
        setError('Erreur lors du chargement du devis.');
        console.error('[DEVIS VIEW] Erreur de chargement:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [devisId, projetId]);

  const sendNow = async () => {
    if (!devis) return;
    setSending(true);
    try {
      const res = await fetch(`/api/devis/${devisId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'send' }),
      });
      const data = await res.json();
      if (!data.success) {
        setToast({ type: 'error', message: '✗ Erreur lors de l\'envoi — Veuillez réessayer' });
        console.error('[DEVIS VIEW] Erreur finalize:', data.error);
        return;
      }
      setDevis((prev) => prev ? { ...prev, sent: true, statut: 'Envoyé', pdfUrl: data.pdf_url || prev.pdfUrl } : prev);
      if (data.email_sent) {
        setToast({ type: 'success', message: `✓ Devis ${devis.devisNumber} envoyé à ${devis.clientEmail} — PDF joint à l'email` });
      } else {
        setToast({ type: 'warning', message: `⚠️ Devis ${devis.devisNumber} enregistré mais l'email n'a pas pu être envoyé — vérifiez l'email client` });
      }
    } catch (err) {
      setToast({ type: 'error', message: '✗ Erreur lors de l\'envoi — Veuillez réessayer' });
      console.error('[DEVIS VIEW] Erreur envoi:', err);
    } finally {
      setSending(false);
    }
  };

  const copyClientLink = async () => {
    if (!devis) return;
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/devis/${devis.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast({ type: 'success', message: '✓ Lien copié !' });
    } catch (err) {
      setToast({ type: 'error', message: '✗ Impossible de copier le lien' });
      console.error('[DEVIS VIEW] Erreur copie lien:', err);
    }
  };

  const sectionCard: React.CSSProperties = {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    color: '#a1a1aa',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '6px',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">Chargement...</p>
      </div>
    );
  }

  if (error || !devis) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <main className="mx-auto max-w-3xl px-6 py-8">
          <Button variant="ghost" onClick={() => router.push(`/dashboard-v2/projet/${projetId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div style={{ ...sectionCard, marginTop: '16px', textAlign: 'center' }}>
            <p className="text-zinc-300">{error || 'Devis introuvable.'}</p>
          </div>
        </main>
      </div>
    );
  }

  let lines: DevisLine[] = [];
  try {
    const parsed = JSON.parse(devis.lignesJson);
    if (Array.isArray(parsed)) lines = parsed;
  } catch {
    lines = [];
  }

  let tvaBreakdown: Record<string, number> = {};
  try {
    const parsed = JSON.parse(devis.tvaBreakdownJson);
    if (parsed && typeof parsed === 'object') tvaBreakdown = parsed;
  } catch {
    tvaBreakdown = {};
  }

  const isSent = devis.sent || devis.statut === 'Envoyé';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="mx-auto max-w-5xl px-6 py-8 space-y-4">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
          <div>
            <Button variant="ghost" onClick={() => router.push(`/dashboard-v2/projet/${projetId}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au dossier {clientName || ''}
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0 4px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Devis {devis.devisNumber}</h1>
              {isSent ? (
                <span style={{
                  background: 'rgba(34,197,94,0.1)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '999px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}>
                  ✓ Envoyé
                </span>
              ) : (
                <span style={{
                  background: 'rgba(245,158,11,0.1)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '999px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}>
                  Brouillon
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => devis.pdfUrl && window.open(devis.pdfUrl, '_blank')}
              disabled={!devis.pdfUrl}
              title={!devis.pdfUrl ? 'PDF non disponible' : undefined}
              style={{
                background: '#18181b',
                border: '1px solid #27272a',
                color: '#a1a1aa',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                cursor: devis.pdfUrl ? 'pointer' : 'not-allowed',
                opacity: devis.pdfUrl ? 1 : 0.4,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Download size={14} />
              Télécharger PDF
            </button>
            {!isSent && (
              <button
                onClick={sendNow}
                disabled={sending}
                style={{
                  background: '#22c55e',
                  border: 'none',
                  color: '#09090b',
                  fontWeight: 700,
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  cursor: sending ? 'default' : 'pointer',
                  opacity: sending ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {sending && <Loader2 className="animate-spin" size={14} />}
                {sending ? 'Envoi...' : 'Envoyer maintenant →'}
              </button>
            )}
          </div>
        </div>

        {/* Suivi */}
        <div style={sectionCard}>
          <p style={labelStyle}>Suivi</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: devis.accepted ? '16px' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#71717a' }}>Ouvertures</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{devis.opensCount}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: '#a1a1aa', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#71717a' }}>Première ouverture</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{formatDate(devis.firstOpenedAt || '')}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {devis.accepted ? (
                <CheckCircle size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
              ) : devis.opensCount > 0 ? (
                <Eye size={16} style={{ color: '#a1a1aa', flexShrink: 0 }} />
              ) : (
                <Clock size={16} style={{ color: '#71717a', flexShrink: 0 }} />
              )}
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#71717a' }}>Statut</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                  {devis.accepted ? 'Accepté' : devis.opensCount > 0 ? 'En attente' : 'Non ouvert'}
                </p>
              </div>
            </div>
          </div>

          {devis.accepted && (
            <div style={{
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>
                ✓ Devis accepté le {formatDate(devis.acceptedAt || '')}
              </p>
              {devis.acceptedIp && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a' }}>IP : {devis.acceptedIp}</p>
              )}
            </div>
          )}

          <button
            onClick={copyClientLink}
            style={{
              background: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Copy size={14} />
            Copier le lien client
          </button>
        </div>

        {/* Infos générales */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Informations générales</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ ...labelStyle, marginBottom: '10px' }}>Client</p>
              <p style={{ color: 'white', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>{devis.clientName || '—'}</p>
              <p style={{ color: '#a1a1aa', fontSize: '13px', margin: '0 0 2px' }}>{devis.clientAddress || '—'}</p>
              <p style={{ color: '#a1a1aa', fontSize: '13px', margin: '0 0 2px' }}>{devis.clientEmail || '—'}</p>
              <p style={{ color: '#a1a1aa', fontSize: '13px', margin: '0 0 2px' }}>{devis.clientPhone || '—'}</p>
            </div>
            <div>
              <p style={{ ...labelStyle, marginBottom: '10px' }}>Dates</p>
              <p style={{ color: '#a1a1aa', fontSize: '13px', margin: '0 0 4px' }}>Date d&apos;émission : <span style={{ color: 'white', fontWeight: 600 }}>{formatDate(devis.dateEmission)}</span></p>
              <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0 }}>Valide jusqu&apos;au : <span style={{ color: 'white', fontWeight: 600 }}>{formatDate(devis.dateValidite)}</span></p>
            </div>
          </div>

          {devis.objet && (
            <div style={{
              background: '#27272a',
              borderLeft: '3px solid #22c55e',
              padding: '12px 16px',
              fontSize: '14px',
              marginTop: '20px',
              borderRadius: '6px',
            }}>
              {devis.objet}
            </div>
          )}
        </div>

        {/* Lignes */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Détail des prestations</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lines.map((line, index) =>
              line.type === 'section' ? (
                <div key={index} style={{
                  fontWeight: 700,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  color: '#a1a1aa',
                  marginTop: '8px',
                  borderBottom: '1px solid #27272a',
                  paddingBottom: '6px',
                }}>
                  {line.description}
                </div>
              ) : (
                <div key={index} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr repeat(4, auto)',
                  gap: '12px',
                  alignItems: 'baseline',
                  fontSize: '13px',
                  padding: '6px 0',
                  borderBottom: '1px solid #27272a',
                }}>
                  <span>{line.description}</span>
                  <span style={{ color: '#a1a1aa', textAlign: 'right' }}>{line.quantity} {line.unit}</span>
                  <span style={{ color: '#a1a1aa', textAlign: 'right' }}>{formatEuro(line.unitPrice)}</span>
                  <span style={{ color: '#a1a1aa', textAlign: 'right' }}>{line.tvaRate}%</span>
                  <span style={{ fontWeight: 600, textAlign: 'right', color: '#22c55e' }}>{formatEuro(line.quantity * line.unitPrice)}</span>
                </div>
              )
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px', marginLeft: 'auto', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '14px' }}>
              <span>Total HT</span>
              <span>{formatEuro(devis.totalHT)}</span>
            </div>
            {Object.entries(tvaBreakdown)
              .filter(([, amount]) => amount > 0)
              .map(([rate, amount]) => (
                <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '14px' }}>
                  <span>TVA ({rate}%)</span>
                  <span>{formatEuro(amount)}</span>
                </div>
              ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between', color: 'white', fontSize: '17px', fontWeight: 700,
              borderTop: '1px solid #27272a', paddingTop: '8px', marginTop: '4px',
            }}>
              <span>Total TTC</span>
              <span style={{ color: '#22c55e' }}>{formatEuro(devis.totalTTC)}</span>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Conditions & mentions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {devis.conditionsPaiement && (
              <div>
                <p style={labelStyle}>Conditions de paiement</p>
                <p style={{ color: '#d4d4d8', fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>{devis.conditionsPaiement}</p>
              </div>
            )}
            {devis.delaiExecution && (
              <div>
                <p style={labelStyle}>Délai d&apos;exécution</p>
                <p style={{ color: '#d4d4d8', fontSize: '13px', margin: 0 }}>{devis.delaiExecution}</p>
              </div>
            )}
            {devis.mentionsLegales && (
              <div>
                <p style={labelStyle}>Mentions légales</p>
                <p style={{ color: '#71717a', fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>{devis.mentionsLegales}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 50,
            background: '#18181b',
            border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.3)' : toast.type === 'warning' ? 'rgba(245,158,11,0.3)' : '#dc2626'}`,
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: toast.type === 'success' ? 'white' : toast.type === 'warning' ? '#f59e0b' : '#dc2626',
            fontSize: '13px',
            maxWidth: '360px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#dc2626' }} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
