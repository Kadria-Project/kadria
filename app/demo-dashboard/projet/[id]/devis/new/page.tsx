'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { useDemoMode } from '@/src/contexts/DemoModeContext';
import {
  normalizeQuoteBuilder,
  computeQuoteBuilderSummary,
  type DemoQuoteBuilderLine,
  type DemoProject,
} from '@/src/lib/demo-data';
import { resolveDevisBranding } from '@/src/lib/devis-branding';

function makeLineId() {
  return `l_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function DemoNewDevisPage() {
  return <DemoNewDevis />;
}

function DemoNewDevis() {
  const params = useParams();
  const router = useRouter();
  const projetId = params.id as string;
  const { projects, artisan, updateProjectFields } = useDemoMode();
  const project = useMemo(() => projects.find((p) => p.id === projetId) || null, [projects, projetId]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const initialBuilder = useMemo(() => normalizeQuoteBuilder(project), [project]);

  const branding = useMemo(
    () =>
      resolveDevisBranding({
        plan: artisan.whiteLabelPlanId,
        whiteLabelEnabled: artisan.whiteLabelEnabled,
        widgetBrandName: artisan.widgetBrandName,
        widgetBrandLogoUrl: artisan.widgetBrandLogoUrl,
        logoUrl: artisan.logoUrl,
        companyName: artisan.companyName,
        raisonSociale: artisan.raisonSociale,
        primaryColor: artisan.primaryColor,
        secondaryColor: artisan.secondaryColor,
      }),
    [artisan]
  );

  const [clientName, setClientName] = useState(initialBuilder.clientName);
  const [siteAddress, setSiteAddress] = useState(initialBuilder.siteAddress);
  const [projectTitle, setProjectTitle] = useState(initialBuilder.projectTitle);
  const [validityDays, setValidityDays] = useState(initialBuilder.validityDays);
  const [depositPercent, setDepositPercent] = useState(initialBuilder.depositPercent);
  const [paymentTerms, setPaymentTerms] = useState(initialBuilder.paymentTerms);
  const [clientNote, setClientNote] = useState(initialBuilder.clientNote);
  const [lines, setLines] = useState<DemoQuoteBuilderLine[]>(
    initialBuilder.lines.length
      ? initialBuilder.lines
      : [{ id: makeLineId(), label: '', quantity: 1, unit: 'u', unitPriceHt: 0, vatRate: 20, enabled: true }]
  );
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const summary = useMemo(() => computeQuoteBuilderSummary(lines, depositPercent), [lines, depositPercent]);

  function updateLine<Key extends keyof DemoQuoteBuilderLine>(id: string, key: Key, value: DemoQuoteBuilderLine[Key]) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [key]: value } : l)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: makeLineId(), label: '', quantity: 1, unit: 'u', unitPriceHt: 0, vatRate: 20, enabled: true },
    ]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function moveLine(id: string, direction: -1 | 1) {
    setLines((prev) => {
      const index = prev.findIndex((l) => l.id === id);
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy;
    });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    background: 'var(--bg)',
    border: '1px solid var(--border-soft)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'var(--text-1)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--text-2)',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '6px',
  };

  const sectionCard: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
  };

  function iconBtnStyle(disabled: boolean, danger?: boolean): React.CSSProperties {
    return {
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      color: disabled ? 'var(--border-soft)' : danger ? 'var(--status-lost)' : 'var(--text-2)',
      borderRadius: '6px',
      padding: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }

  if (!project) {
    return (
      <div className="dashboard-shell min-h-screen bg-[var(--bg)] text-[var(--text-1)] flex items-center justify-center">
        <p style={{ color: 'var(--text-3)' }}>Dossier introuvable.</p>
      </div>
    );
  }

  function handleSubmit() {
    if (!project) return;
    setError('');
    const itemLinesWithText = lines.filter((l) => l.label.trim());
    if (itemLinesWithText.length === 0) {
      setError('Veuillez ajouter au moins une ligne avec une description.');
      return;
    }

    setSubmitting(true);
    const now = new Date().toISOString();
    const quoteNumber = initialBuilder.quoteNumber;

    const nextQuoteBuilder = {
      quoteNumber,
      clientName,
      projectTitle,
      siteAddress,
      validityDays,
      defaultVat: initialBuilder.defaultVat,
      depositPercent,
      paymentTerms,
      clientNote,
      lines,
    };

    updateProjectFields(projetId, {
      status: project.status === 'Nouveau' ? 'Qualifié' : project.status,
      devisAmount: Number(summary.totalTtc.toFixed(2)),
      quoteBuilder: nextQuoteBuilder,
      quote: {
        status: 'draft',
        amount: Number(summary.totalTtc.toFixed(2)),
        sentAt: null,
        openedAt: null,
        openedCount: 0,
        validUntil: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString(),
        declineReason: null,
      },
      activity: [
        { id: `demo_quote_created_${Date.now()}`, label: 'Devis préparé en brouillon (démo)', date: now, kind: 'quote' },
        ...(project.activity || []),
      ],
    } as Partial<DemoProject>);

    setToast({ type: 'success', message: 'Action simulée — devis enregistré localement, aucune donnée réelle modifiée.' });
    setSubmitting(false);
    setTimeout(() => {
      router.push(`/demo-dashboard/projet/${projetId}/devis/demo-devis-${projetId}`);
    }, 600);
  }

  return (
    <div className="dashboard-shell min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      <main
        className="mx-auto max-w-5xl px-6 py-8 space-y-4"
        style={isMobile ? { padding: '12px', paddingBottom: 'calc(220px + env(safe-area-inset-bottom, 0px))' } : { paddingBottom: '110px' }}
      >
        {/* Bandeau de marque (branding D1/D2/D3 reproduit en demo) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          {branding.isWhiteLabelActive && branding.brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.brandLogoUrl}
              alt={branding.brandName}
              style={{ height: '28px', maxWidth: '140px', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
          <span style={{ fontSize: '14px', fontWeight: 700, color: branding.isWhiteLabelActive ? branding.primaryColor : 'var(--text-1)' }}>
            {branding.brandName}
          </span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
          <div>
            <Button variant="ghost" onClick={() => router.push(`/demo-dashboard/projet/${projetId}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au dossier
            </Button>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '12px 0 4px' }}>Nouveau devis</h1>
            <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
              {clientName || 'Client'} — {initialBuilder.quoteNumber}
            </p>
          </div>
          <span style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.24)', borderRadius: '999px', padding: '6px 12px', fontSize: '12px', fontWeight: 700 }}>
            Démo
          </span>
        </div>

        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-2)', fontSize: '13px' }}>
          Mode démo — ce devis est enregistré localement uniquement. Aucune donnée réelle, email ou PDF officiel n&apos;est créé.
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '12px 16px', color: 'var(--status-lost)', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Section 1 — Infos générales */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Informations générales</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Numéro de devis</label>
              <input style={{ ...inputStyle, color: 'var(--text-3)' }} value={initialBuilder.quoteNumber} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Validité (jours)</label>
              <input
                style={inputStyle}
                type="number"
                min={1}
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <p style={{ color: 'var(--text-3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
              Émetteur
            </p>
            <p style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>{artisan.companyName}</p>
            <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: 0 }}>{artisan.address}</p>
          </div>
        </div>

        {/* Section 1b — Client & chantier */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Client &amp; chantier</h2>
          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>Nom du client</label>
            <input style={inputStyle} value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>Adresse du chantier</label>
            <input style={inputStyle} value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} />
          </div>
        </div>

        {/* Section 1c — Objet du devis */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Objet du devis</h2>
          <textarea
            style={{ ...inputStyle, minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }}
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            placeholder="Ex : Rénovation de la salle de bain"
          />
        </div>

        {/* Section 2 — Lignes du devis */}
        <div style={sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Lignes du devis</h2>
            <button
              onClick={addLine}
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--accent)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lines.map((line, index) => (
              <div key={line.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <textarea
                    style={{ ...inputStyle, minHeight: '40px', resize: 'vertical', fontFamily: 'inherit', flex: 1 }}
                    value={line.label}
                    onChange={(e) => updateLine(line.id, 'label', e.target.value)}
                    placeholder="Description de la prestation"
                  />
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0, paddingTop: '2px' }}>
                    <button onClick={() => moveLine(line.id, -1)} disabled={index === 0} style={iconBtnStyle(index === 0)}>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveLine(line.id, 1)} disabled={index === lines.length - 1} style={iconBtnStyle(index === lines.length - 1)}>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeLine(line.id)} style={iconBtnStyle(false, true)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: '8px' }}>
                  <div>
                    <label style={labelStyle}>Qté</label>
                    <input style={inputStyle} type="number" min={0} step="any" value={line.quantity} onChange={(e) => updateLine(line.id, 'quantity', Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Unité</label>
                    <input style={inputStyle} value={line.unit} onChange={(e) => updateLine(line.id, 'unit', e.target.value)} placeholder="u, m², h..." />
                  </div>
                  <div>
                    <label style={labelStyle}>Prix HT</label>
                    <input style={inputStyle} type="number" min={0} step="any" value={line.unitPriceHt} onChange={(e) => updateLine(line.id, 'unitPriceHt', Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={labelStyle}>TVA %</label>
                    <select style={inputStyle} value={line.vatRate} onChange={(e) => updateLine(line.id, 'vatRate', Number(e.target.value))}>
                      {[0, 5.5, 10, 20].map((rate) => (
                        <option key={rate} value={rate}>{rate}%</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Total HT</label>
                    <input
                      style={{ ...inputStyle, color: 'var(--accent)', fontWeight: 600 }}
                      value={`${(line.quantity * line.unitPriceHt).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3 — Totaux */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Totaux</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: isMobile ? '100%' : '320px', marginLeft: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', fontSize: '14px' }}>
              <span>Total HT</span>
              <span>{summary.totalHt.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', fontSize: '14px' }}>
              <span>TVA</span>
              <span>{summary.totalVat.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-1)', fontSize: '17px', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
              <span>Total TTC</span>
              <span style={{ color: 'var(--accent)' }}>{summary.totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            </div>
          </div>
        </div>

        {/* Section 4 — Conditions & mentions */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Conditions & mentions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Conditions de paiement</label>
              <textarea
                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Ex : Acompte de 30% à la commande, solde à la livraison"
              />
            </div>
            <div>
              <label style={labelStyle}>Acompte demandé (%)</label>
              <input style={inputStyle} type="number" min={0} max={100} value={depositPercent} onChange={(e) => setDepositPercent(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label style={labelStyle}>Note client</label>
              <textarea
                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
              />
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>
          Rien n&apos;est envoyé automatiquement. Vous gardez la main jusqu&apos;à l&apos;envoi.
        </p>
        <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '11px', margin: 0 }}>
          {branding.poweredByLabel}
        </p>

        {/* Barre d'action fixe */}
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--bg-elevated)',
            borderTop: '1px solid var(--border)',
            padding: isMobile ? '16px 16px calc(16px + env(safe-area-inset-bottom, 0px))' : '14px 24px',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.45)',
            zIndex: 50,
          }}
        >
          <div style={{ maxWidth: '1024px', margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)', width: isMobile ? '100%' : 'auto' }}>
              Total TTC : {summary.totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                background: 'var(--accent)',
                border: 'none',
                color: 'var(--bg)',
                fontWeight: 700,
                borderRadius: '12px',
                padding: '12px 32px',
                fontSize: '14px',
                cursor: submitting ? 'default' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: isMobile ? '100%' : 'auto',
                minHeight: '48px',
              }}
            >
              {submitting ? 'Enregistrement...' : 'Enregistrer le devis →'}
            </button>
          </div>
        </div>
      </main>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: isMobile ? '90px' : '16px',
            right: '16px',
            zIndex: 60,
            background: 'var(--bg-elevated)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--text-1)',
            fontSize: '13px',
            maxWidth: '360px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
