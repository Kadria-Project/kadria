'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/src/components/AuthGuard';
import { Button } from '@/src/components/ui/button';
import { AlertTriangle, ArrowLeft, ArrowDown, ArrowUp, CheckCircle, Loader2, Lock, Plus, Trash2, X, XCircle } from 'lucide-react';
import { UpgradeModal } from '@/src/components/FeatureGate';
import { hasFeature, normalizePlan, type PlanFeatureKey, type PlanKey } from '@/src/lib/plans';
import { getQuoteDraftStorageKey, templateToQuoteDraftLines, type QuoteDraftLine, type QuoteDraftPayload, type ArtisanQuoteTemplate, type ArtisanServiceCatalogItem, type QuoteCommercialSettings } from '@/src/lib/quote-suggestions';
import { formatFullAddress } from '@/src/lib/devis-legal';

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
  businessConfig?: {
    serviceCatalog?: ArtisanServiceCatalogItem[];
    quoteTemplates?: ArtisanQuoteTemplate[];
    quoteSettings?: QuoteCommercialSettings;
  };
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
  fromCatalog?: boolean;
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
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<'draft' | 'send' | null>(null);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState('');
  const [nextDevisNumber, setNextDevisNumber] = useState('');
  const [plan, setPlan] = useState<PlanKey>('essentiel');
  const [upgradeFeature, setUpgradeFeature] = useState<PlanFeatureKey | null>(null);
  const [quotaExceededMessage, setQuotaExceededMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const canQuote = hasFeature(plan, 'quoteGeneration');
  const openUpgradeModal = (feature: PlanFeatureKey) => setUpgradeFeature(feature);
  const [prefilledFromSuggestions, setPrefilledFromSuggestions] = useState(false);
  const [prefilledTemplateName, setPrefilledTemplateName] = useState<string | null>(null);

  // ── Sélecteur manuel de modèle (Mission "manual quote template selection") :
  // action volontaire de l'artisan, jamais appliquée automatiquement.
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null);

  // ── Paramètres commerciaux par défaut (Mission "quote commercial
  // settings") : appliqués une seule fois au chargement initial, jamais
  // utilisés pour générer un devis automatiquement.
  const [quoteSettingsApplied, setQuoteSettingsApplied] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

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
        const [configRes, projectRes, nextNumberRes, sessionRes] = await Promise.all([
          fetch('/api/artisan/config'),
          fetch(`/api/projects/${projetId}`),
          fetch('/api/devis/next-number'),
          fetch('/api/auth/session'),
        ]);
        const configData = await configRes.json();
        const projectData = await projectRes.json();
        const nextNumberData = await nextNumberRes.json();
        const sessionData = await sessionRes.json();

        if (sessionData.success) {
          setPlan(normalizePlan(sessionData.plan));
        }

        if (configData.success) {
          const config = configData.config as ArtisanConfig;
          setArtisanConfig(config);
          const quoteSettings = config.businessConfig?.quoteSettings;
          const defaultVatRate = quoteSettings?.defaultVatRate ?? config.devisTvaDefaut ?? 20;
          setDateValidite(addDays(new Date().toISOString().slice(0, 10), quoteSettings?.defaultValidityDays ?? config.devisValidite ?? 90));
          setConditionsPaiement(config.devisConditionsPaiement || quoteSettings?.defaultPaymentTerms || '');
          setMentionsLegales(config.devisMentionLegale || quoteSettings?.defaultNotes || '');
          if (quoteSettings?.defaultEstimatedDelay) {
            setDelaiExecution(quoteSettings.defaultEstimatedDelay);
          }
          if (quoteSettings && Object.keys(quoteSettings).length > 0) {
            setQuoteSettingsApplied(true);
          }

          // Brouillon prerempli depuis les suggestions Kadria (fiche projet) :
          // simple aide front, jamais persistee tant que l'artisan n'a pas
          // valide le devis. Lu une seule fois puis supprime du storage.
          let appliedDraft = false;
          try {
            const draftKey = getQuoteDraftStorageKey(projetId);
            const rawDraft = sessionStorage.getItem(draftKey);
            if (rawDraft) {
              const parsed = JSON.parse(rawDraft) as QuoteDraftPayload | QuoteDraftLine[];
              const draftLines: QuoteDraftLine[] = Array.isArray(parsed) ? parsed : parsed.lines;
              const draftTemplateName = Array.isArray(parsed) ? undefined : parsed.templateName;
              if (Array.isArray(draftLines) && draftLines.length > 0) {
                setLines(
                  draftLines.map((d) => ({
                    id: makeLineId(),
                    type: 'item',
                    description: d.label,
                    quantity: d.quantity ?? 1,
                    unit: d.unit || 'u',
                    unitPrice: d.unitPrice ?? 0,
                    tvaRate: d.vatRate ?? defaultVatRate,
                    fromCatalog: d.fromCatalog,
                  }))
                );
                appliedDraft = true;
                setPrefilledFromSuggestions(true);
                if (draftTemplateName) setPrefilledTemplateName(draftTemplateName);
              }
              sessionStorage.removeItem(draftKey);
            }
          } catch {
            // sessionStorage indisponible : pas bloquant, formulaire reste vide/par defaut.
          }

          if (!appliedDraft) {
            setLines((prev) =>
              prev.map((l) => ({ ...l, tvaRate: defaultVatRate }))
            );
          }
        } else {
          setConfigError(configData.error || 'Erreur lors du chargement de la configuration.');
          console.error('[DEVIS NEW] Config error:', configData.error);
        }

        if (projectData.success) {
          const p = projectData.project as ProjectData;
          setClientName(`${p.clientFirstName || ''} ${p.clientName || ''}`.trim());
          setClientAddress(formatFullAddress({ address: p.siteAddress, postalCode: p.postalCode, city: p.city }));
          setClientEmail(p.clientEmail || '');
          setClientPhone(p.clientPhone || '');
          setObjet(p.projectType ? `Travaux de ${p.projectType}` : '');
        }

        if (nextNumberData.success) {
          setNextDevisNumber(nextNumberData.nextNumber);
        }
      } catch (err) {
        setError('Erreur lors du chargement des données.');
        setConfigError('Erreur lors du chargement de la configuration.');
        console.error('[DEVIS NEW] Erreur de chargement:', err);
      } finally {
        setLoading(false);
        setConfigLoading(false);
      }
    };
    loadData();
  }, [projetId]);

  // ── Gestion des lignes ─────────────────────────────────────────────────
  const getDefaultVatRate = () =>
    artisanConfig?.businessConfig?.quoteSettings?.defaultVatRate ?? artisanConfig?.devisTvaDefaut ?? 20;

  const addItemLine = () => {
    setLines((prev) => [
      ...prev,
      { id: makeLineId(), type: 'item', description: '', quantity: 1, unit: 'u', unitPrice: 0, tvaRate: getDefaultVatRate() },
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

  const applyTemplate = () => {
    const activeTemplates = artisanConfig?.businessConfig?.quoteTemplates?.filter((t) => t.isActive !== false) || [];
    const template = activeTemplates.find((t) => t.id === selectedTemplateId);
    if (!template) return;

    const hasExistingContent = lines.some((l) => l.description.trim() || l.unitPrice > 0);
    if (hasExistingContent) {
      const confirmed = window.confirm(
        `Remplacer les lignes actuelles par le modèle "${template.name}" ? Cette action est irréversible.`
      );
      if (!confirmed) return;
    }

    const draftLines = templateToQuoteDraftLines({
      template,
      serviceCatalog: artisanConfig?.businessConfig?.serviceCatalog,
    });
    setLines(
      draftLines.map((d) => ({
        id: makeLineId(),
        type: 'item',
        description: d.label,
        quantity: d.quantity ?? 1,
        unit: d.unit || 'u',
        unitPrice: d.unitPrice ?? 0,
        tvaRate: d.vatRate ?? getDefaultVatRate(),
        fromCatalog: d.fromCatalog,
      }))
    );
    setAppliedTemplateName(template.name);
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

  const itemLines = lines.filter((l) => l.type === 'item');
  const itemLinesWithText = itemLines.filter((l) => l.description.trim());
  const linesMissingPrice = itemLinesWithText.filter((l) => !l.unitPrice || l.unitPrice <= 0);
  const allItemLinesPriceless = itemLinesWithText.length > 0 && linesMissingPrice.length === itemLinesWithText.length;
  const depositPercent = artisanConfig?.businessConfig?.quoteSettings?.defaultDepositPercent;

  const recapAlerts: string[] = [];
  if (linesMissingPrice.length > 0) {
    recapAlerts.push(
      allItemLinesPriceless
        ? 'Aucune ligne n\'a de prix renseigné — le devis affichera un total à 0 €.'
        : `${linesMissingPrice.length} ligne${linesMissingPrice.length > 1 ? 's' : ''} sans prix : prix à compléter.`
    );
  }
  if (!conditionsPaiement.trim()) {
    recapAlerts.push('Aucune condition de paiement renseignée.');
  }
  if (!dateValidite) {
    recapAlerts.push('Aucune date de validité renseignée.');
  }
  if (!clientEmail.trim()) {
    recapAlerts.push('Le client n\'a pas d\'email — l\'envoi par email ne sera pas possible.');
  }
  if (itemLinesWithText.length === 0) {
    recapAlerts.push('Le devis ne contient aucune ligne de prestation.');
  }
  if (!clientAddress.trim()) {
    recapAlerts.push('Aucune adresse client / lieu d\'exécution renseignée.');
  }
  if (!artisanConfig?.siret) {
    recapAlerts.push('SIRET de l\'entreprise manquant.');
  }
  if (!artisanConfig?.adressePro) {
    recapAlerts.push('Adresse de l\'entreprise manquante.');
  }
  if (!artisanConfig?.businessConfig?.quoteSettings?.quotePricingType) {
    recapAlerts.push('Mention "devis gratuit / payant" non renseignée (à compléter dans les paramètres).');
  }
  if (!artisanConfig?.assuranceNonRequise && !artisanConfig?.businessConfig?.quoteSettings?.insuranceEnabled && !(artisanConfig?.assureur && artisanConfig?.numAssurance)) {
    recapAlerts.push('Informations d\'assurance non renseignées.');
  }
  if (artisanConfig?.businessConfig?.quoteSettings?.vatMode === 'vat_exempt_293b' && totalTVA > 0) {
    recapAlerts.push('Incohérence : franchise en base de TVA (art. 293 B) activée mais des lignes de TVA sont présentes.');
  }

  const devisNumberPreview = nextDevisNumber || (artisanConfig
    ? `${artisanConfig.devisPrefixe || 'DEV'}-${new Date().getFullYear()}-${String((artisanConfig.devisCompteur || 0) + 1).padStart(3, '0')}`
    : '...');

  const legalComplete = !!(
    artisanConfig?.siret &&
    artisanConfig?.raisonSociale &&
    artisanConfig?.adressePro &&
    (artisanConfig?.assuranceNonRequise || (artisanConfig?.assureur && artisanConfig?.numAssurance))
  );

  const missingLegalFields: string[] = [];
  if (!artisanConfig?.siret) missingLegalFields.push('SIRET manquant');
  if (!artisanConfig?.raisonSociale) missingLegalFields.push('Raison sociale manquante');
  if (!artisanConfig?.adressePro) missingLegalFields.push('Adresse professionnelle manquante');
  if (!artisanConfig?.assuranceNonRequise && !(artisanConfig?.assureur && artisanConfig?.numAssurance)) {
    missingLegalFields.push('Informations d\'assurance manquantes');
  }

  const handleSubmit = async (mode: 'draft' | 'send') => {
    setError('');
    if (!canQuote) {
      openUpgradeModal('quoteGeneration');
      return;
    }

    if (!objet.trim()) {
      setError('Veuillez renseigner l\'objet du devis.');
      return;
    }

    const itemLines = lines.filter((l) => l.type === 'item');
    if (itemLines.length === 0 || itemLines.every((l) => !l.description.trim())) {
      setError('Veuillez ajouter au moins une ligne avec une description.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMode(mode);
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
        if (data.quotaExceeded) {
          setQuotaExceededMessage(data.error);
          setIsSubmitting(false);
          setSubmitMode(null);
          return;
        }
        setError(data.error || 'Erreur lors de l\'enregistrement du devis.');
        setToast({ type: 'error', message: '✗ Erreur lors de l\'enregistrement — Veuillez réessayer' });
        console.error('[DEVIS NEW] Erreur enregistrement:', data.error);
        setIsSubmitting(false);
        setSubmitMode(null);
        return;
      }
      const numero = data.numero || data.devis?.devisNumber || devisNumberPreview;
      const devisId = data.devis?.id || data.devis_id || '';
      setSavedId(devisId);

      const finalizeRes = await fetch(`/api/devis/${devisId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const finalizeData = await finalizeRes.json();
      if (!finalizeData.success) {
        setError(finalizeData.error || 'Erreur lors de la génération du PDF.');
        setToast({ type: 'error', message: '✗ Erreur lors de la génération du PDF — Veuillez réessayer' });
        console.error('[DEVIS NEW] Erreur finalize:', finalizeData.error);
        setIsSubmitting(false);
        setSubmitMode(null);
        return;
      }

      if (mode === 'draft') {
        setToast({ type: 'success', message: `✓ Devis ${numero} enregistré — PDF généré · Envoi possible depuis le dossier` });
      } else if (finalizeData.email_sent) {
        setToast({ type: 'success', message: `✓ Devis ${numero} envoyé à ${clientEmail} — PDF joint à l'email` });
      } else {
        setToast({ type: 'warning', message: `⚠️ Devis ${numero} enregistré mais l'email n'a pas pu être envoyé — vérifiez l'email client` });
      }
      setTimeout(() => {
        router.push(`/dashboard-v2/projet/${projetId}`);
      }, 2000);
    } catch (err) {
      setError('Erreur lors de l\'enregistrement du devis.');
      setToast({ type: 'error', message: '✗ Erreur lors de l\'enregistrement — Veuillez réessayer' });
      console.error('[DEVIS NEW] Erreur enregistrement:', err);
      setIsSubmitting(false);
      setSubmitMode(null);
    }
  };

  const openPdfPreview = async () => {
    if (!canQuote) {
      openUpgradeModal('quoteGeneration');
      return;
    }
    if (!savedId) return;
    const res = await fetch(`/api/devis/${savedId}/pdf`);
    if (res.status === 403) {
      openUpgradeModal('quoteGeneration');
      return;
    }
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

  if (loading || configLoading) {
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
              {configError
                ? configError
                : 'Vos informations légales sont incomplètes. Elles sont nécessaires pour générer un devis conforme.'}
            </p>
            {!configError && missingLegalFields.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
                {missingLegalFields.map((field) => (
                  <li key={field} style={{ color: '#f59e0b', fontSize: '12px', marginTop: '4px' }}>
                    {field}
                  </li>
                ))}
              </ul>
            )}
            <a href="/parametres" style={{ color: '#22c55e', fontWeight: 600, fontSize: '14px' }}>
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
              disabled={!savedId && canQuote}
              title={!canQuote ? 'Disponible avec Performance' : !savedId ? 'Enregistrez le devis pour pouvoir l\'exporter en PDF' : undefined}
              style={{
                background: '#18181b',
                border: '1px solid #27272a',
                color: '#a1a1aa',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                cursor: !canQuote || savedId ? 'pointer' : 'not-allowed',
                opacity: !canQuote || savedId ? 1 : 0.4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
            }}
          >
              {!canQuote && <Lock size={14} />}
              📄 Aperçu PDF
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

        {!canQuote && (
          <div
            style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: '12px',
              padding: '14px 18px',
              color: '#d4d4d8',
              fontSize: '13px',
            }}
          >
            Passez à Performance pour envoyer vos devis, générer des PDF et suivre leur statut.
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

        {/* Sélecteur manuel de modèle de devis */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>Partir d&apos;un modèle</h2>
          {(() => {
            const activeTemplates = artisanConfig?.businessConfig?.quoteTemplates?.filter((t) => t.isActive !== false) || [];
            if (activeTemplates.length === 0) {
              return (
                <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>
                  Aucun modèle disponible. Ajoutez-en depuis Paramètres.
                </p>
              );
            }
            const hasExistingContent = lines.some((l) => l.description.trim() || l.unitPrice > 0);
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  style={{ ...inputStyle, maxWidth: '320px' }}
                >
                  <option value="">Choisir un modèle…</option>
                  {activeTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.trade ? ` (${t.trade})` : ''}{t.category ? ` — ${t.category}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={applyTemplate}
                  disabled={!selectedTemplateId}
                  style={{
                    background: selectedTemplateId ? 'rgba(34,197,94,0.1)' : '#27272a',
                    border: selectedTemplateId ? '1px solid rgba(34,197,94,0.3)' : '1px solid #3f3f46',
                    color: selectedTemplateId ? '#22c55e' : '#71717a',
                    borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600,
                    cursor: selectedTemplateId ? 'pointer' : 'not-allowed',
                  }}
                >
                  {hasExistingContent ? 'Remplacer les lignes par ce modèle' : 'Appliquer le modèle'}
                </button>
              </div>
            );
          })()}
          {appliedTemplateName && (
            <p style={{ fontSize: '12px', color: '#22c55e', margin: '10px 0 0' }}>
              Modèle appliqué : {appliedTemplateName}. Vérifiez et adaptez les lignes avant envoi.
            </p>
          )}
          {quoteSettingsApplied && (
            <p style={{ fontSize: '11px', color: '#71717a', margin: '10px 0 0' }}>
              Paramètres de devis appliqués depuis vos préférences.
            </p>
          )}
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

          {prefilledFromSuggestions && (
            <div style={{
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '12px',
              color: '#a1a1aa',
              fontSize: '12px',
            }}>
              {prefilledTemplateName ? `Prérempli depuis le modèle : ${prefilledTemplateName}` : 'Suggestions Kadria à vérifier et adapter avant envoi.'}
            </div>
          )}

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
                        {prefilledFromSuggestions && (
                          <p style={{ color: line.unitPrice > 0 ? '#22c55e' : '#71717a', fontSize: '11px', margin: '4px 0 0' }}>
                            {line.unitPrice > 0 ? (line.fromCatalog ? 'Depuis votre catalogue' : 'Montant suggéré') : 'Prix à compléter'}
                          </p>
                        )}
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

        {/* Section 5 — Récapitulatif du devis */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Récapitulatif du devis</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
            <div>
              <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Lignes</p>
              <p style={{ color: 'white', fontSize: '16px', fontWeight: 700, margin: 0 }}>{itemLines.length}</p>
            </div>
            <div>
              <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Total HT</p>
              <p style={{ color: 'white', fontSize: '16px', fontWeight: 700, margin: 0 }}>{totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
            </div>
            <div>
              <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Total TVA</p>
              <p style={{ color: 'white', fontSize: '16px', fontWeight: 700, margin: 0 }}>{totalTVA.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
            </div>
            <div>
              <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Total TTC</p>
              <p style={{ color: '#22c55e', fontSize: '16px', fontWeight: 700, margin: 0 }}>{totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#a1a1aa', marginBottom: recapAlerts.length > 0 ? '16px' : 0 }}>
            <p style={{ margin: 0 }}>Validité du devis : {dateValidite || 'non renseignée'}</p>
            {depositPercent != null && (
              <p style={{ margin: 0 }}>Acompte demandé : {depositPercent}%</p>
            )}
            {conditionsPaiement.trim() && (
              <p style={{ margin: 0 }}>Conditions de paiement : {conditionsPaiement}</p>
            )}
            {delaiExecution.trim() && (
              <p style={{ margin: 0 }}>Délai estimatif : {delaiExecution}</p>
            )}
          </div>
          {recapAlerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recapAlerts.map((alertMsg) => (
                <div
                  key={alertMsg}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: '8px', padding: '8px 12px', color: '#f59e0b', fontSize: '12px',
                  }}
                >
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ marginTop: '1px' }} />
                  <span>{alertMsg}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 6 — Prévisualisation simple */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Prévisualisation</h2>
          <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '10px', padding: '16px', fontSize: '13px', color: '#d4d4d8', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Client</p>
              <p style={{ margin: 0 }}>{clientName || 'Client non renseigné'}</p>
              {clientAddress && <p style={{ margin: 0, color: '#a1a1aa' }}>{clientAddress}</p>}
            </div>
            {objet.trim() && (
              <div>
                <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Objet</p>
                <p style={{ margin: 0 }}>{objet}</p>
              </div>
            )}
            <div>
              <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Lignes</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {lines.map((l) => (
                  <p key={l.id} style={{ margin: 0, color: l.type === 'section' ? 'white' : '#d4d4d8', fontWeight: l.type === 'section' ? 700 : 400 }}>
                    {l.type === 'section'
                      ? (l.description || 'Section sans titre')
                      : `${l.description || 'Sans description'} — ${l.quantity} ${l.unit} × ${l.unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                  </p>
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px solid #27272a', paddingTop: '10px' }}>
              <p style={{ margin: 0 }}>Total HT : {totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € — Total TVA : {totalTVA.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € — Total TTC : {totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
            </div>
            {conditionsPaiement.trim() && <p style={{ margin: 0, color: '#a1a1aa' }}>Conditions de paiement : {conditionsPaiement}</p>}
            {noteInterne.trim() && <p style={{ margin: 0, color: '#71717a', fontStyle: 'italic' }}>Note interne (non visible client) : {noteInterne}</p>}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#71717a', fontSize: '12px', margin: 0 }}>
          Rien n&apos;est envoyé automatiquement. Vous gardez la main jusqu&apos;à l&apos;envoi.
        </p>

        {/* Section 7 — Barre d'action sticky */}
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
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#22c55e' }}>
            Total TTC : {totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSubmit('draft')}
              disabled={isSubmitting}
              style={{
                background: '#18181b',
                border: '1px solid #27272a',
                color: '#f4f4f5',
                fontWeight: 600,
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '14px',
                cursor: isSubmitting ? 'default' : 'pointer',
                opacity: isSubmitting && submitMode !== 'draft' ? 0.5 : 1,
                transition: 'border-color 150ms',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#27272a'; }}
            >
              {!canQuote && <Lock size={14} />}
              {isSubmitting && submitMode === 'draft' && <Loader2 className="animate-spin" size={14} />}
              {isSubmitting && submitMode === 'draft' ? 'Génération du PDF...' : 'Enregistrer le devis · Envoyer plus tard'}
            </button>
            <button
              onClick={() => handleSubmit('send')}
              disabled={isSubmitting}
              style={{
                background: '#22c55e',
                border: 'none',
                color: '#09090b',
                fontWeight: 700,
                borderRadius: '12px',
                padding: '12px 32px',
                fontSize: '14px',
                cursor: isSubmitting ? 'default' : 'pointer',
                opacity: isSubmitting && submitMode !== 'send' ? 0.5 : 1,
                transition: 'opacity 150ms',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.opacity = '1'; }}
            >
              {!canQuote && <Lock size={14} />}
              {isSubmitting && submitMode === 'send' && <Loader2 className="animate-spin" size={14} />}
              {isSubmitting && submitMode === 'send' ? 'Génération du PDF...' : 'Envoyer au client →'}
            </button>
          </div>
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

      {upgradeFeature && (
        <UpgradeModal
          feature={upgradeFeature}
          requiredPlan="performance"
          onClose={() => setUpgradeFeature(null)}
        />
      )}

      {quotaExceededMessage && (
        <UpgradeModal
          feature="quoteGeneration"
          requiredPlan="performance"
          title="Quota de devis atteint"
          message={quotaExceededMessage}
          onClose={() => setQuotaExceededMessage(null)}
        />
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
