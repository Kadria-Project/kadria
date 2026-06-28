'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
import { AlertTriangle, ArrowLeft, CheckCircle, Clock, Copy, Download, Eye, XCircle } from 'lucide-react';
import { useDemoMode } from '@/src/contexts/DemoModeContext';
import {
  buildDemoDevisList,
  normalizeQuoteBuilder,
  computeQuoteBuilderSummary,
  type DemoProject,
} from '@/src/lib/demo-data';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatEuro(value: number) {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function DemoDevisViewPage() {
  return <DemoDevisView />;
}

function DemoDevisView() {
  const params = useParams();
  const router = useRouter();
  const projetId = params.id as string;
  const devisId = params.devisId as string;

  const { projects, artisan, updateProjectFields } = useDemoMode();
  const project = useMemo(() => projects.find((p) => p.id === projetId) || null, [projects, projetId]);

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const devisList = useMemo(() => buildDemoDevisList(project), [project]);
  const devis = devisList.find((d) => d.id === devisId) || devisList[0] || null;

  const quoteBuilder = useMemo(() => normalizeQuoteBuilder(project), [project]);
  const quoteSummary = useMemo(
    () => computeQuoteBuilderSummary(quoteBuilder.lines, quoteBuilder.depositPercent),
    [quoteBuilder]
  );

  const clientName = [project?.clientFirstName, project?.clientName].filter(Boolean).join(' ');

  const sectionCard: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--text-3)',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '6px',
  };

  if (!project || !devis) {
    return (
      <div className="dashboard-shell min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
        <main className="mx-auto max-w-3xl px-6 py-8">
          <Button variant="ghost" onClick={() => router.push(`/demo-dashboard/projet/${projetId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div style={{ ...sectionCard, marginTop: '16px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-2)' }}>Devis introuvable.</p>
          </div>
        </main>
      </div>
    );
  }

  const isSent = devis.sent || devis.statut === 'Envoyé';
  const isDeclined = devis.statut === 'Refusé' || Boolean(devis.declined_at) || Boolean(devis.decline_reason);
  const isAccepted = devis.accepted;

  function persistQuoteStatus(
    nextStatus: 'draft' | 'sent' | 'accepted' | 'declined',
    successMessage: string
  ) {
    const now = new Date().toISOString();
    const currentQuote = project?.quote || {
      status: 'none' as const,
      amount: devis?.amount ?? null,
      sentAt: null,
      openedAt: null,
      openedCount: 0,
      validUntil: null,
      declineReason: null,
    };
    const nextProjectStatus =
      nextStatus === 'accepted'
        ? 'Gagné'
        : nextStatus === 'declined'
          ? 'Perdu'
          : nextStatus === 'sent'
            ? 'Devis envoyé'
            : project?.status;

    updateProjectFields(projetId, {
      status: nextProjectStatus,
      quote: {
        ...currentQuote,
        status: nextStatus,
        sentAt: nextStatus === 'sent' || nextStatus === 'accepted' || nextStatus === 'declined' ? currentQuote.sentAt || now : currentQuote.sentAt,
        declineReason: nextStatus === 'declined' ? currentQuote.declineReason || 'Projet reporté ou arbitrage budgétaire client' : nextStatus === 'accepted' ? null : currentQuote.declineReason,
      },
      activity: [
        {
          id: `demo_quote_${nextStatus}_${Date.now()}`,
          label:
            nextStatus === 'accepted'
              ? 'Devis marqué comme accepté (démo)'
              : nextStatus === 'declined'
                ? 'Devis marqué comme refusé (démo)'
                : nextStatus === 'sent'
                  ? 'Devis envoyé au client (démo)'
                  : 'Devis préparé en brouillon (démo)',
          date: now,
          kind: nextStatus === 'accepted' || nextStatus === 'declined' ? 'decision' : 'quote',
        },
        ...(project?.activity || []),
      ],
    } as Partial<DemoProject>);
    setToast({ type: 'success', message: successMessage });
  }

  function sendNow() {
    persistQuoteStatus('sent', 'Action simulée — aucune donnée réelle modifiée. Aucun email réel n’a été envoyé.');
  }

  function markAccepted() {
    persistQuoteStatus('accepted', 'Action simulée — devis marqué comme accepté localement.');
  }

  function markDeclined() {
    persistQuoteStatus('declined', 'Action simulée — devis marqué comme refusé localement.');
  }

  async function copyClientLink() {
    const url = `${window.location.origin}/demo-dashboard/projet/${projetId}/devis/${devisId}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast({ type: 'success', message: '✓ Lien copié (démo). Ce lien ouvre la fiche démo, aucun lien client réel n’est généré.' });
    } catch {
      setToast({ type: 'error', message: '✗ Impossible de copier le lien' });
    }
  }

  function openPdfPreview() {
    const raisonSociale = artisan.companyName || 'Kadria Démo';
    const htmlRows = quoteSummary.enabledLines
      .map((line) => {
        const lineTotalHt = Number(line.quantity || 0) * Number(line.unitPriceHt || 0);
        return `<tr><td>${line.label}</td><td>${line.quantity} ${line.unit}</td><td>${Number(line.vatRate || 0)}%</td><td style="text-align:right">${formatEuro(lineTotalHt)}</td></tr>`;
      })
      .join('');

    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${devis.numero}</title><style>
      body{font-family:Inter,Arial,sans-serif;background:#fff;color:#18181b;padding:40px;line-height:1.5}
      .card{max-width:860px;margin:0 auto;border:1px solid #e4e4e7;border-radius:16px;padding:32px;position:relative}
      .muted{color:#71717a}
      .accent{color:#16a34a}
      .badge{position:absolute;top:24px;right:24px;background:rgba(22,163,74,.12);color:#16a34a;border:1px solid rgba(22,163,74,.3);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700}
      .row{display:flex;justify-content:space-between;gap:24px;margin:10px 0;border-bottom:1px solid #f4f4f5;padding-bottom:8px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #f4f4f5;font-size:14px}
      .summary{margin-top:20px;display:grid;gap:8px;justify-content:end}
      .summary-row{display:flex;justify-content:space-between;gap:24px;min-width:280px}
      .summary-row.total{font-size:18px;font-weight:700}
      .watermark{position:fixed;top:40%;left:10%;font-size:64px;color:rgba(22,163,74,.08);transform:rotate(-25deg);font-weight:800;letter-spacing:.1em}
      @media print { .watermark{display:none} }
    </style></head><body>
      <div class="watermark">APERCU DEMO</div>
      <div class="card">
        <span class="badge">Démo</span>
        <div class="header">
          <div>
            <p class="accent" style="font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0">${raisonSociale}</p>
            <p class="muted" style="margin:4px 0 0;font-size:13px">${artisan.address || ''}</p>
          </div>
          <div style="text-align:right">
            <h1 style="margin:0;font-size:28px">${devis.numero}</h1>
            <p class="muted" style="margin:4px 0 0">Valable ${quoteBuilder.validityDays} jours</p>
          </div>
        </div>
        <div class="row"><span>Client</span><strong>${quoteBuilder.clientName}</strong></div>
        <div class="row"><span>Adresse chantier</span><strong>${quoteBuilder.siteAddress}</strong></div>
        <div class="row"><span>Projet</span><strong>${quoteBuilder.projectTitle}</strong></div>
        <div class="row"><span>Conditions de paiement</span><strong>${quoteBuilder.paymentTerms}</strong></div>
        <table>
          <thead><tr><th>Désignation</th><th>Quantité</th><th>TVA</th><th style="text-align:right">Montant HT</th></tr></thead>
          <tbody>${htmlRows}</tbody>
        </table>
        <div class="summary">
          <div class="summary-row"><span>Total HT</span><strong>${formatEuro(quoteSummary.totalHt)}</strong></div>
          <div class="summary-row"><span>TVA</span><strong>${formatEuro(quoteSummary.totalVat)}</strong></div>
          <div class="summary-row total"><span>Total TTC</span><strong>${formatEuro(quoteSummary.totalTtc)}</strong></div>
        </div>
        <p class="muted" style="margin-top:24px;font-size:12px">${quoteBuilder.clientNote}</p>
        <p class="muted" style="margin-top:20px;font-size:12px">Document de démonstration généré par Kadria — non valable comme devis officiel.</p>
      </div>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
    setToast({ type: 'success', message: 'Aperçu PDF simulé — aucun fichier réel n’a été généré.' });
  }

  return (
    <div className="dashboard-shell min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      <main className="mx-auto max-w-5xl px-6 py-8 space-y-4">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
          <div>
            <Button variant="ghost" onClick={() => router.push(`/demo-dashboard/projet/${projetId}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au dossier {clientName || ''}
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0 4px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Devis {devis.numero}</h1>
              {isDeclined ? (
                <span style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: 600 }}>
                  ✕ Refusé
                </span>
              ) : isAccepted ? (
                <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: 600 }}>
                  ✓ Accepté
                </span>
              ) : isSent ? (
                <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: 600 }}>
                  ✓ Envoyé
                </span>
              ) : (
                <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: 600 }}>
                  Brouillon
                </span>
              )}
              <span style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.24)', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: 700 }}>
                Démo
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={openPdfPreview}
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} />
              Télécharger PDF
            </button>
            {!isSent && !isAccepted && !isDeclined && (
              <button
                onClick={sendNow}
                style={{ background: '#22c55e', border: 'none', color: '#09090b', fontWeight: 700, borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Envoyer maintenant →
              </button>
            )}
          </div>
        </div>

        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-2)', fontSize: '13px' }}>
          Mode démo — toutes les actions ci-dessous sont simulées localement. Aucun devis réel, email ou PDF officiel n&apos;est envoyé.
        </div>

        {/* Suivi */}
        <div style={sectionCard}>
          <p style={labelStyle}>Suivi</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: isAccepted || isDeclined ? '16px' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)' }}>Ouvertures</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{devis.opens_count}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)' }}>Première ouverture</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{formatDate(devis.last_opened_date)}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isDeclined ? (
                <XCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
              ) : isAccepted ? (
                <CheckCircle size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
              ) : devis.opens_count > 0 ? (
                <Eye size={16} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
              ) : (
                <Clock size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              )}
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)' }}>Statut</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: isDeclined ? '#dc2626' : undefined }}>
                  {isDeclined ? 'Refusé' : isAccepted ? 'Accepté' : devis.opens_count > 0 ? 'En attente' : 'Non ouvert'}
                </p>
              </div>
            </div>
          </div>

          {isDeclined && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                ✕ Devis refusé le {formatDate(devis.declined_at)}
              </p>
              <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Motif du refus
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-2)' }}>
                {devis.decline_reason || 'Non renseigné'}
              </p>
            </div>
          )}

          {isAccepted && !isDeclined && (
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>
                ✓ Devis accepté le {formatDate(devis.accepted_at)}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={copyClientLink}
              style={{ background: 'var(--border)', border: '1px solid var(--border-soft)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', color: 'var(--text-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Copy size={14} />
              Copier le lien client
            </button>
            {isSent && !isAccepted && !isDeclined && (
              <>
                <button
                  onClick={markAccepted}
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Marquer comme accepté
                </button>
                <button
                  onClick={markDeclined}
                  style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Marquer comme refusé
                </button>
              </>
            )}
          </div>
        </div>

        {/* Infos générales */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Informations générales</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ ...labelStyle, marginBottom: '10px' }}>Client</p>
              <p style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>{quoteBuilder.clientName || '—'}</p>
              <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: '0 0 2px' }}>{quoteBuilder.siteAddress || '—'}</p>
              <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: '0 0 2px' }}>{devis.client_email || '—'}</p>
              <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: '0 0 2px' }}>{project.clientPhone || '—'}</p>
            </div>
            <div>
              <p style={{ ...labelStyle, marginBottom: '10px' }}>Dates</p>
              <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: '0 0 4px' }}>Date d&apos;émission : <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{formatDate(devis.date_emission)}</span></p>
              <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: 0 }}>Valide jusqu&apos;au : <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{formatDate(devis.date_validite)}</span></p>
            </div>
          </div>

          {quoteBuilder.projectTitle && (
            <div style={{ background: 'var(--border)', borderLeft: '3px solid #22c55e', padding: '12px 16px', fontSize: '14px', marginTop: '20px', borderRadius: '6px' }}>
              {quoteBuilder.projectTitle}
            </div>
          )}
        </div>

        {/* Lignes */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Détail des prestations</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {quoteSummary.enabledLines.map((line) => (
              <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, auto)', gap: '12px', alignItems: 'baseline', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{line.label}</span>
                <span style={{ color: 'var(--text-2)', textAlign: 'right' }}>{line.quantity} {line.unit}</span>
                <span style={{ color: 'var(--text-2)', textAlign: 'right' }}>{formatEuro(line.unitPriceHt)}</span>
                <span style={{ color: 'var(--text-2)', textAlign: 'right' }}>{line.vatRate}%</span>
                <span style={{ fontWeight: 600, textAlign: 'right', color: '#22c55e' }}>{formatEuro(line.quantity * line.unitPriceHt)}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px', marginLeft: 'auto', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', fontSize: '14px' }}>
              <span>Total HT</span>
              <span>{formatEuro(quoteSummary.totalHt)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', fontSize: '14px' }}>
              <span>TVA</span>
              <span>{formatEuro(quoteSummary.totalVat)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-1)', fontSize: '17px', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
              <span>Total TTC</span>
              <span style={{ color: '#22c55e' }}>{formatEuro(quoteSummary.totalTtc)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', fontSize: '13px' }}>
              <span>Acompte ({quoteBuilder.depositPercent}%)</span>
              <span>{formatEuro(quoteSummary.depositAmount)}</span>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Conditions & mentions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {quoteBuilder.paymentTerms && (
              <div>
                <p style={labelStyle}>Conditions de paiement</p>
                <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>{quoteBuilder.paymentTerms}</p>
              </div>
            )}
            {quoteBuilder.clientNote && (
              <div>
                <p style={labelStyle}>Note client</p>
                <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>{quoteBuilder.clientNote}</p>
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
            background: 'var(--bg-elevated)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.3)' : toast.type === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(220,38,38,0.3)'}`,
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: toast.type === 'success' ? 'var(--text-1)' : toast.type === 'warning' ? '#f59e0b' : '#dc2626',
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
