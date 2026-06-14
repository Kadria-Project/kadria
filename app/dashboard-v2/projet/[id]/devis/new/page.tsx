'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/src/components/AuthGuard';
import { Button } from '@/src/components/ui/button';
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';

interface ArtisanConfig {
  companyName: string;
  phone: string;
  email: string;
  raisonSociale: string;
  formeJuridique: string;
  siret: string;
  tvaNumber: string;
  tvaAssujetti: boolean;
  adressePro: string;
  cpPro: string;
  villePro: string;
  assureur: string;
  numAssurance: string;
  assuranceNonRequise: boolean;
  devisPrefixe: string;
  devisValidite: number;
  devisTvaDefaut: number;
  devisConditionsPaiement: string;
  devisMentionLegale: string;
  devisCompteur: number;
}

interface ProjectData {
  id: string;
  clientName: string;
  clientFirstName: string;
  clientEmail: string;
  clientPhone: string;
  siteAddress: string;
  city: string;
  postalCode: string;
  projectType: string;
}

interface DevisLine {
  id: string;
  type: 'item' | 'section';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  tvaRate: number;
}

interface Prestation {
  id: string;
  description: string;
  unit: string;
  unitPrice: number;
  tvaRate: number;
}

function makeLineId() {
  return `l_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function NewDevisPage() {
  return (
    <AuthGuard>
      <NewDevis />
    </AuthGuard>
  );
}

function NewDevis() {
  const params = useParams();
  const router = useRouter();
  const projetId = params.id as string;

  const [artisanConfig, setArtisanConfig] = useState<ArtisanConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState('');

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Champs du formulaire ───────────────────────────────────────────────
  const [objet, setObjet] = useState('');
  const [dateEmission, setDateEmission] = useState(new Date().toISOString().slice(0, 10));
  const [dateValidite, setDateValidite] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [conditionsPaiement, setConditionsPaiement] = useState('');
  const [delaiExecution, setDelaiExecution] = useState('');
  const [mentionsLegales, setMentionsLegales] = useState('');
  const [noteInterne, setNoteInterne] = useState('');

  const [lines, setLines] = useState<DevisLine[]>([
    { id: makeLineId(), type: 'item', description: '', quantity: 1, unit: 'u', unitPrice: 0, tvaRate: 10 },
  ]);

  // ── Bibliothèque de prestations ────────────────────────────────────────
  const [showPrestationsModal, setShowPrestationsModal] = useState(false);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [loadingPrestations, setLoadingPrestations] = useState(false);
  const [newPrestation, setNewPrestation] = useState({ description: '', unit: 'u', unitPrice: '', tvaRate: 10 });
  const [savingPrestation, setSavingPrestation] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [configRes, projectRes] = await Promise.all([
          fetch('/api/artisan/config'),
          fetch(`/api/projects/${projetId}`),
        ]);
        const configData = await configRes.json();
        const projectData = await projectRes.json();

        if (configData.success) {
          const config = configData.config as ArtisanConfig;
          setArtisanConfig(config);
          setDateValidite(addDays(new Date().toISOString().slice(0, 10), config.devisValidite || 90));
          setConditionsPaiement(config.devisConditionsPaiement || '');
          setMentionsLegales(config.devisMentionLegale || '');
          setLines((prev) =>
            prev.map((l) => ({ ...l, tvaRate: config.devisTvaDefaut || 10 }))
          );
        }

        if (projectData.success) {
          const p = projectData.project as ProjectData;
          setClientName(`${p.clientFirstName || ''} ${p.clientName || ''}`.trim());
          setClientAddress(`${p.siteAddress || ''}${p.postalCode ? ', ' + p.postalCode : ''}${p.city ? ' ' + p.city : ''}`.trim());
          setClientEmail(p.clientEmail || '');
          setClientPhone(p.clientPhone || '');
          setObjet(p.projectType ? `Travaux de ${p.projectType}` : '');
        }
      } catch {
        setError('Erreur lors du chargement des données.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projetId]);

  // ── Gestion des lignes ─────────────────────────────────────────────────
  const addItemLine = () => {
    setLines((prev) => [
      ...prev,
      { id: makeLineId(), type: 'item', description: '', quantity: 1, unit: 'u', unitPrice: 0, tvaRate: artisanConfig?.devisTvaDefaut || 10 },
    ]);
  };

  const addSectionLine = () => {
    setLines((prev) => [
      ...prev,
      { id: makeLineId(), type: 'section', description: '', quantity: 0, unit: '', unitPrice: 0, tvaRate: 0 },
    ]);
  };

  const updateLine = (id: string, patch: Partial<DevisLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const moveLine = (id: string, direction: -1 | 1) => {
    setLines((prev) => {
      const index = prev.findIndex((l) => l.id === id);
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy;
    });
  };

  // ── Bibliothèque de prestations ────────────────────────────────────────
  const openPrestationsModal = async () => {
    setShowPrestationsModal(true);
    setLoadingPrestations(true);
    try {
      const res = await fetch('/api/artisan/prestations');
      const data = await res.json();
      if (data.success) setPrestations(data.prestations);
    } catch {
      // ignore
    } finally {
      setLoadingPrestations(false);
    }
  };

  const addPrestationAsLine = (prestation: Prestation) => {
    setLines((prev) => [
      ...prev,
      {
        id: makeLineId(),
        type: 'item',
        description: prestation.description,
        quantity: 1,
        unit: prestation.unit,
        unitPrice: prestation.unitPrice,
        tvaRate: prestation.tvaRate,
      },
    ]);
  };

  const createPrestation = async () => {
    if (!newPrestation.description.trim()) return;
    setSavingPrestation(true);
    try {
      const res = await fetch('/api/artisan/prestations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newPrestation.description,
          unit: newPrestation.unit,
          unitPrice: Number(newPrestation.unitPrice) || 0,
          tvaRate: newPrestation.tvaRate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPrestations(data.prestations);
        setNewPrestation({ description: '', unit: 'u', unitPrice: '', tvaRate: artisanConfig?.devisTvaDefaut || 10 });
      }
    } catch {
      // ignore
    } finally {
      setSavingPrestation(false);
    }
  };

  const deletePrestation = async (id: string) => {
    try {
      const res = await fetch(`/api/artisan/prestations?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setPrestations(data.prestations);
    } catch {
      // ignore
    }
  };

  // ── Totaux ──────────────────────────────────────────────────────────────
  const totalHT = lines
    .filter((l) => l.type === 'item')
    .reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const tvaBreakdown = lines
    .filter((l) => l.type === 'item')
    .reduce<Record<string, number>>((acc, l) => {
      const base = l.quantity * l.unitPrice;
      const rate = l.tvaRate;
      acc[rate] = (acc[rate] || 0) + (base * rate) / 100;
      return acc;
    }, {});

  const totalTVA = Object.values(tvaBreakdown).reduce((a, b) => a + b, 0);
  const totalTTC = totalHT + totalTVA;

  const devisNumberPreview = artisanConfig
    ? `${artisanConfig.devisPrefixe || 'DEV'}-${new Date().getFullYear()}-${String((artisanConfig.devisCompteur || 0) + 1).padStart(3, '0')}`
    : '...';

  const legalComplete = !!(
    artisanConfig?.siret &&
    artisanConfig?.raisonSociale &&
    artisanConfig?.adressePro &&
    (artisanConfig?.assuranceNonRequise || (artisanConfig?.assureur && artisanConfig?.numAssurance))
  );

  const save = async () => {
    setError('');

    if (!objet.trim()) {
      setError('Veuillez renseigner l\'objet du devis.');
      return;
    }

    const itemLines = lines.filter((l) => l.type === 'item');
    if (itemLines.length === 0 || itemLines.every((l) => !l.description.trim())) {
      setError('Veuillez ajouter au moins une ligne avec une description.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projetId,
          objet,
          dateEmission,
          dateValidite,
          clientName,
          clientAddress,
          clientEmail,
          clientPhone,
          lines,
          totalHT,
          totalTVA,
          totalTTC,
          tvaBreakdown,
          conditionsPaiement,
          delaiExecution,
          mentionsLegales,
          noteInterne,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Erreur lors de l\'enregistrement du devis.');
        setSaving(false);
        return;
      }
      setSavedId(data.devis?.id || '');
      router.push(`/dashboard-v2/projet/${projetId}`);
    } catch {
      setError('Erreur lors de l\'enregistrement du devis.');
      setSaving(false);
    }
  };

  const openPdfPreview = async () => {
    if (!savedId) return;
    const res = await fetch(`/api/devis/${savedId}/pdf`);
    const html = await res.text();
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
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

  const sectionCard: React.CSSProperties = {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">Chargement...</p>
      </div>
    );
  }

  if (!legalComplete) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <main className="mx-auto max-w-3xl px-6 py-8">
          <Button variant="ghost" onClick={() => router.push(`/dashboard-v2/projet/${projetId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div style={{ ...sectionCard, marginTop: '16px', textAlign: 'center' }}>
            <p className="text-zinc-300 mb-4">
              Vos informations légales sont incomplètes. Elles sont nécessaires pour générer un devis conforme.
            </p>
            <a href="/onboarding" style={{ color: '#22c55e', fontWeight: 600, fontSize: '14px' }}>
              Compléter mon profil →
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="mx-auto max-w-5xl px-6 py-8 space-y-4" style={isMobile ? { padding: '12px' } : undefined}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
          <div>
            <Button variant="ghost" onClick={() => router.push(`/dashboard-v2/projet/${projetId}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au dossier
            </Button>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '12px 0 4px' }}>Nouveau devis</h1>
            <p style={{ color: '#71717a', fontSize: '13px', margin: 0 }}>
              {clientName || 'Client'} — {devisNumberPreview}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={openPdfPreview}
              disabled={!savedId}
              title={!savedId ? 'Enregistrez le devis pour pouvoir l\'exporter en PDF' : undefined}
              style={{
                background: '#18181b',
                border: '1px solid #27272a',
                color: '#a1a1aa',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                cursor: savedId ? 'pointer' : 'not-allowed',
                opacity: savedId ? 1 : 0.4,
              }}
            >
              📄 Aperçu PDF
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{
                background: saving ? '#27272a' : '#22c55e',
                border: 'none',
                color: saving ? '#71717a' : 'black',
                fontWeight: 600,
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                cursor: saving ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: '10px',
            padding: '12px 16px',
            color: '#f87171',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        {/* Section 1 — Infos générales */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Informations générales</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                Émetteur
              </p>
              <p style={{ color: 'white', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>
                {artisanConfig?.raisonSociale || artisanConfig?.companyName}
              </p>
              <p style={{ color: '#a1a1aa', fontSize: '13px', margin: '0 0 2px' }}>
                {artisanConfig?.adressePro}
              </p>
              <p style={{ color: '#a1a1aa', fontSize: '13px', margin: '0 0 2px' }}>
                {artisanConfig?.cpPro} {artisanConfig?.villePro}
              </p>
              <p style={{ color: '#a1a1aa', fontSize: '13px', margin: '0 0 2px' }}>
                SIRET : {artisanConfig?.siret}
              </p>
            </div>

            <div>
              <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                Client
              </p>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Nom du client</label>
                <input style={inputStyle} value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Adresse du chantier</label>
                <input style={inputStyle} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Téléphone</label>
                  <input style={inputStyle} type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px', marginTop: '20px', borderTop: '1px solid #27272a', paddingTop: '20px' }}>
            <div>
              <label style={labelStyle}>Numéro de devis</label>
              <input style={{ ...inputStyle, color: '#71717a' }} value={devisNumberPreview} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Date d&apos;émission</label>
              <input style={inputStyle} type="date" value={dateEmission} onChange={(e) => setDateEmission(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Date de validité</label>
              <input style={inputStyle} type="date" value={dateValidite} onChange={(e) => setDateValidite(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={labelStyle}>Objet du devis</label>
            <textarea
              style={{ ...inputStyle, minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }}
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder="Ex : Rénovation de la salle de bain"
            />
          </div>
        </div>

        {/* Section 2 — Lignes du devis */}
        <div style={sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Lignes du devis</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={openPrestationsModal}
                style={{
                  background: '#27272a', border: '1px solid #3f3f46', color: '#a1a1aa',
                  borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
                }}
              >
                📚 Mes prestations
              </button>
              <button
                onClick={addSectionLine}
                style={{
                  background: '#27272a', border: '1px solid #3f3f46', color: '#a1a1aa',
                  borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
                }}
              >
                + Titre de section
              </button>
              <button
                onClick={addItemLine}
                style={{
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e',
                  borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lines.map((line, index) => (
              <div
                key={line.id}
                style={{
                  background: '#09090b',
                  border: '1px solid #27272a',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {line.type === 'section' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      style={{ ...inputStyle, fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}
                      value={line.description}
                      onChange={(e) => updateLine(line.id, { description: e.target.value })}
                      placeholder="TITRE DE SECTION"
                    />
                    <div style={{ display: 'flex', gap: '4px' }}>
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
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <textarea
                        style={{ ...inputStyle, minHeight: '40px', resize: 'vertical', fontFamily: 'inherit', flex: 1 }}
                        value={line.description}
                        onChange={(e) => updateLine(line.id, { description: e.target.value })}
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
                        <input
                          style={inputStyle}
                          type="number"
                          min={0}
                          step="any"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Unité</label>
                        <input
                          style={inputStyle}
                          value={line.unit}
                          onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                          placeholder="u, m², h..."
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Prix HT</label>
                        <input
                          style={inputStyle}
                          type="number"
                          min={0}
                          step="any"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(line.id, { unitPrice: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>TVA %</label>
                        <select
                          style={inputStyle}
                          value={line.tvaRate}
                          onChange={(e) => updateLine(line.id, { tvaRate: Number(e.target.value) })}
                        >
                          {[0, 5.5, 10, 20].map((rate) => (
                            <option key={rate} value={rate}>{rate}%</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Total HT</label>
                        <input
                          style={{ ...inputStyle, color: '#22c55e', fontWeight: 600 }}
                          value={`${(line.quantity * line.unitPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                          readOnly
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 3 — Totaux */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Totaux</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: isMobile ? '100%' : '320px', marginLeft: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '14px' }}>
              <span>Total HT</span>
              <span>{totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            </div>
            {Object.entries(tvaBreakdown)
              .filter(([, amount]) => amount > 0 || Object.keys(tvaBreakdown).length > 0)
              .map(([rate, amount]) => (
                <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '14px' }}>
                  <span>TVA ({rate}%)</span>
                  <span>{amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
              ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between', color: 'white', fontSize: '17px', fontWeight: 700,
              borderTop: '1px solid #27272a', paddingTop: '8px', marginTop: '4px',
            }}>
              <span>Total TTC</span>
              <span style={{ color: '#22c55e' }}>{totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
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
                value={conditionsPaiement}
                onChange={(e) => setConditionsPaiement(e.target.value)}
                placeholder="Ex : Acompte de 30% à la commande, solde à la livraison"
              />
            </div>
            <div>
              <label style={labelStyle}>Délai d&apos;exécution</label>
              <input
                style={inputStyle}
                value={delaiExecution}
                onChange={(e) => setDelaiExecution(e.target.value)}
                placeholder="Ex : 2 à 3 semaines à compter de l'acceptation du devis"
              />
            </div>
            <div>
              <label style={labelStyle}>Mentions légales</label>
              <textarea
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                value={mentionsLegales}
                onChange={(e) => setMentionsLegales(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Note interne (non visible par le client)</label>
              <textarea
                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
                value={noteInterne}
                onChange={(e) => setNoteInterne(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 5 — Barre d'action sticky */}
        <div style={{
          position: 'sticky',
          bottom: '12px',
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: '14px', color: '#a1a1aa' }}>
            Total TTC : <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '16px' }}>
              {totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
          <button
            onClick={save}
            disabled={saving}
            style={{
              background: saving ? '#27272a' : '#22c55e',
              border: 'none',
              color: saving ? '#71717a' : 'black',
              fontWeight: 600,
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer le devis'}
          </button>
        </div>
      </main>

      {showPrestationsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setShowPrestationsModal(false)}
        >
          <div
            style={{
              background: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Mes prestations</h2>
              <button
                onClick={() => setShowPrestationsModal(false)}
                style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingPrestations ? (
              <p style={{ color: '#71717a', fontSize: '13px' }}>Chargement...</p>
            ) : prestations.length === 0 ? (
              <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '16px' }}>
                Aucune prestation enregistrée pour le moment.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {prestations.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: '#09090b',
                      border: '1px solid #27272a',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: 'white', fontSize: '13px', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.description}
                      </p>
                      <p style={{ color: '#71717a', fontSize: '12px', margin: 0 }}>
                        {p.unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / {p.unit} — TVA {p.tvaRate}%
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        onClick={() => addPrestationAsLine(p)}
                        style={{
                          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e',
                          borderRadius: '6px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer',
                        }}
                      >
                        + Ajouter
                      </button>
                      <button onClick={() => deletePrestation(p.id)} style={iconBtnStyle(false, true)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid #27272a', paddingTop: '16px' }}>
              <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                Ajouter une prestation
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  style={inputStyle}
                  value={newPrestation.description}
                  onChange={(e) => setNewPrestation((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de la prestation"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <input
                    style={inputStyle}
                    value={newPrestation.unit}
                    onChange={(e) => setNewPrestation((prev) => ({ ...prev, unit: e.target.value }))}
                    placeholder="Unité"
                  />
                  <input
                    style={inputStyle}
                    type="number"
                    min={0}
                    step="any"
                    value={newPrestation.unitPrice}
                    onChange={(e) => setNewPrestation((prev) => ({ ...prev, unitPrice: e.target.value }))}
                    placeholder="Prix HT"
                  />
                  <select
                    style={inputStyle}
                    value={newPrestation.tvaRate}
                    onChange={(e) => setNewPrestation((prev) => ({ ...prev, tvaRate: Number(e.target.value) }))}
                  >
                    {[0, 5.5, 10, 20].map((rate) => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={createPrestation}
                  disabled={savingPrestation || !newPrestation.description.trim()}
                  style={{
                    background: savingPrestation || !newPrestation.description.trim() ? '#27272a' : '#22c55e',
                    border: 'none',
                    color: savingPrestation || !newPrestation.description.trim() ? '#71717a' : 'black',
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    cursor: savingPrestation || !newPrestation.description.trim() ? 'default' : 'pointer',
                  }}
                >
                  {savingPrestation ? 'Ajout...' : 'Ajouter à ma bibliothèque'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function iconBtnStyle(disabled: boolean, danger?: boolean): React.CSSProperties {
  return {
    background: '#18181b',
    border: '1px solid #27272a',
    color: disabled ? '#3f3f46' : danger ? '#f87171' : '#a1a1aa',
    borderRadius: '6px',
    padding: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}
