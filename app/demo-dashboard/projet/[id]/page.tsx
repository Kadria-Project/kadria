'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock,
  Eye,
  FileText as FileTextIcon,
  Lock,
  Plus,
} from 'lucide-react';
import { UpgradeModal } from '@/src/components/FeatureGate';
import { hasFeature, type PlanFeatureKey, type PlanKey } from '@/src/lib/plans';
import { getBestFollowUpTime } from '@/src/lib/commercial-actions';
import { useDemoMode } from '@/src/contexts/DemoModeContext';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Nouveau':      { bg: 'rgba(63,63,70,0.4)',   text: 'var(--text-2)', border: 'var(--border)' },
  'À rappeler':   { bg: 'rgba(217,119,6,0.15)', text: '#d97706', border: 'rgba(217,119,6,0.3)' },
  'Qualifié':     { bg: 'rgba(22,163,74,0.15)', text: '#16a34a', border: 'rgba(22,163,74,0.3)' },
  'Devis envoyé': { bg: 'rgba(37,99,235,0.15)', text: '#2563eb', border: 'rgba(37,99,235,0.3)' },
  'Gagné':        { bg: 'rgba(21,128,61,0.15)', text: '#15803d', border: 'rgba(21,128,61,0.3)' },
  'Perdu':        { bg: 'rgba(220,38,38,0.15)', text: '#dc2626', border: 'rgba(220,38,38,0.3)' },
};

const statusColors = STATUS_COLORS;
const statusStyles = STATUS_COLORS;
const DEMO_PLAN: PlanKey = 'performance';

const DEMO_STATUS_NORMALIZATION: Record<string, string> = {
  'A rappeler': 'À rappeler',
  'Qualifie': 'Qualifié',
  'Devis envoye': 'Devis envoyé',
  'Gagne': 'Gagné',
};

interface DevisListItem {
  id: string;
  numero: string;
  token?: string;
  amount: number;
  sent: boolean;
  statut: string;
  pdf_url: string | null;
  date_emission: string;
  date_validite: string;
  client_email: string;
  opens_count: number;
  last_opened_date: string | null;
  accepted: boolean;
  accepted_at: string | null;
  quote_sent_at?: string;
  last_follow_up_at?: string | null;
  follow_up_count?: number;
}

function formatDevisDate(value: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return formatMediumDate(value, value);
}

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const MEDIUM_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const INTEGER_FORMATTER = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
});

const MONEY_FORMATTER = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function parseValidDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortDate(value?: string | null, fallback = 'Non renseigné') {
  const date = parseValidDate(value);
  return date ? SHORT_DATE_FORMATTER.format(date) : fallback;
}

function formatMediumDate(value?: string | null, fallback = 'Non renseigné') {
  const date = parseValidDate(value);
  return date ? MEDIUM_DATE_FORMATTER.format(date) : fallback;
}

function formatDateTime(value?: string | null, fallback = 'Date non renseignée') {
  const date = parseValidDate(value);
  return date ? DATE_TIME_FORMATTER.format(date) : fallback;
}

function formatInteger(value?: number | null) {
  return INTEGER_FORMATTER.format(Number(value || 0));
}

function formatMoney(value?: number | null) {
  return MONEY_FORMATTER.format(Number(value || 0));
}

function normalizeDemoStatus(status?: string | null) {
  return DEMO_STATUS_NORMALIZATION[status || ''] || status || 'Nouveau';
}

function buildDemoArtisanConfig(artisan: ReturnType<typeof useDemoMode>['artisan']) {
  return {
    siret: '123 456 789 00012',
    raisonSociale: artisan.companyName || 'Kadria Démo',
    adressePro: artisan.address || 'Adresse professionnelle',
    assuranceNonRequise: false,
    assureur: 'MMA Pro',
    numAssurance: 'ASS-DEMO-2026',
  };
}

function buildDemoDevisList(project: any): DevisListItem[] {
  if (!project) return [];
  const normalizedStatus = normalizeDemoStatus(project.status);
  const shouldHaveQuote = normalizedStatus === 'Devis envoyé' || normalizedStatus === 'Gagné' || Number(project.devisAmount || 0) > 0;
  if (!shouldHaveQuote) return [];

  return [
    {
      id: `demo-devis-${project.id}`,
      numero: project.projectNumber?.replace('DEV-', 'DEVIS-') || 'DEVIS-DEMO-001',
      token: `demo-${project.id}`,
      amount: Number(project.devisAmount || 0) || 8600,
      sent: normalizedStatus === 'Devis envoyé' || normalizedStatus === 'Gagné',
      statut: normalizedStatus === 'Devis envoyé' || normalizedStatus === 'Gagné' ? 'Envoyé' : 'Brouillon',
      pdf_url: null,
      date_emission: project.createdAt,
      date_validite: project.createdAt,
      client_email: project.clientEmail || '',
      opens_count: normalizedStatus === 'Devis envoyé' ? 2 : normalizedStatus === 'Gagné' ? 3 : 0,
      last_opened_date: normalizedStatus === 'Devis envoyé' || normalizedStatus === 'Gagné' ? project.createdAt : null,
      accepted: normalizedStatus === 'Gagné',
      accepted_at: normalizedStatus === 'Gagné' ? project.createdAt : null,
      quote_sent_at: normalizedStatus === 'Devis envoyé' || normalizedStatus === 'Gagné' ? project.createdAt : undefined,
      last_follow_up_at: null,
      follow_up_count: 0,
    },
  ];
}

function buildDemoActivities(project: any, events: any[]) {
  if (!project) return [];
  const timeline = [
    {
      id: `created-${project.id}`,
      description: `Dossier créé - ${project.status || 'Nouveau'}`,
      createdAt: project.createdAt,
      action: 'CREATED',
    },
    ...(project.callbackDate
      ? [
          {
            id: `callback-${project.id}`,
            description: 'Relance planifiée',
            createdAt: project.callbackDate,
            action: 'CALLBACK_UPDATED',
          },
        ]
      : []),
    ...(project.internalNotes || project.notes
      ? [
          {
            id: `note-${project.id}`,
            description: 'Note interne mise à jour',
            createdAt: project.updatedAt || project.createdAt,
            action: 'NOTE_UPDATED',
          },
        ]
      : []),
    ...events
      .filter((event) => event.projectId === project.id)
      .map((event) => ({
        id: event.id,
        description: `${event.type} - ${event.title}`,
        createdAt: event.date,
        action: event.type === 'Relance' || event.type === 'Rappel' ? 'CALLBACK_UPDATED' : 'EVENT_CREATED',
      })),
  ];

  return timeline.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export default function ProjectDetailPage() {
  return <ProjectDetail />;
}

function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {
    projects,
    events,
    artisan,
    updateProjectStatus,
    updateProjectNote,
    updateProjectCallback,
    updateProjectFields,
    createEvent,
  } = useDemoMode();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [callbackDate, setCallbackDate] = useState('');
  const [showCallback, setShowCallback] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [showRdvModal, setShowRdvModal] = useState(false);
  const [savingRdv, setSavingRdv] = useState(false);
  const [rdvData, setRdvData] = useState({
    title: '',
    date: '',
    time: '',
    type: 'RDV',
    notes: '',
  });
  const [eventType, setEventType] = useState('Relance');
  const [eventDate, setEventDate] = useState(callbackDate || '');
  const [savingEvent, setSavingEvent] = useState(false);

  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    clientFirstName: project?.clientFirstName || '',
    clientName: project?.clientName || '',
    clientPhone: project?.clientPhone || '',
    clientEmail: project?.clientEmail || '',
    siteAddress: project?.siteAddress || '',
  });
  const [savingContact, setSavingContact] = useState(false);

  const [devisAmount, setDevisAmount] = useState<string>(
    project?.devisAmount ? String(project.devisAmount) : ''
  );
  const [savingDevis, setSavingDevis] = useState(false);
  const [plan] = useState<PlanKey>(DEMO_PLAN);
  const [upgradeFeature, setUpgradeFeature] = useState<PlanFeatureKey | null>(null);
  const canQuote = hasFeature(plan, 'quoteGeneration');
  const canExportPdf = hasFeature(plan, 'pdfExports');
  const openUpgradeModal = (feature: PlanFeatureKey) => setUpgradeFeature(feature);

  const [showAllHistory, setShowAllHistory] = useState(false);

  const [artisanConfig, setArtisanConfig] = useState<{
    siret?: string;
    raisonSociale?: string;
    adressePro?: string;
    assuranceNonRequise?: boolean;
    assureur?: string;
    numAssurance?: string;
  } | null>(null);

  const [devisList, setDevisList] = useState<DevisListItem[]>([]);
  const [followUpToast, setFollowUpToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [followingUpDevisId, setFollowingUpDevisId] = useState<string | null>(null);
  useEffect(() => {
    if (!followUpToast) return;
    const timeout = window.setTimeout(() => setFollowUpToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [followUpToast]);


  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const EVENT_TYPES = [
    { value: 'Relance', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: '#d97706' },
    { value: 'Rappel', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', border: '#3b82f6' },
    { value: 'RDV', color: '#4ade80', bg: 'rgba(34,197,94,0.15)', border: 'var(--accent)' },
    { value: 'Intervention', color: '#c084fc', bg: 'rgba(192,132,252,0.15)', border: '#a855f7' },
  ];

  useEffect(() => {
    const current = projects.find((item) => item.id === id);

    if (!current) {
      setProject(null);
      setLoading(false);
      return;
    }

    const normalizedProject = {
      ...current,
      status: normalizeDemoStatus(current.status),
      internalNotes: current.notes || '',
      updatedAt: current.updatedAt || current.createdAt,
      lastInteractionAt: current.lastInteractionAt || current.callbackDate || current.createdAt,
      quoteSentAt:
        current.quoteSentAt || (normalizeDemoStatus(current.status).startsWith('Devis') ? current.createdAt : null),
      opensCount:
        typeof current.opensCount === 'number'
          ? current.opensCount
          : normalizeDemoStatus(current.status).startsWith('Devis')
            ? 2
            : 0,
    };

    setProject(normalizedProject);
    setNote(normalizedProject.internalNotes || '');
    setCallbackDate(normalizedProject.callbackDate || '');
    setShowCallback(!!normalizedProject.callbackDate);
    setDevisAmount(normalizedProject.devisAmount ? String(normalizedProject.devisAmount) : '');
    setArtisanConfig(buildDemoArtisanConfig(artisan));
    setDevisList(buildDemoDevisList(normalizedProject));
    setActivities(buildDemoActivities(normalizedProject, events));
    setLoading(false);
  }, [artisan, events, id, projects]);
  async function followUpQuote(devis: DevisListItem) {
    if (!canQuote) {
      openUpgradeModal('quoteGeneration');
      return;
    }

    if (!devis.token || devis.token.includes('undefined')) {
      setFollowUpToast({ type: 'error', message: 'Impossible de relancer ce devis : lien de devis introuvable.' });
      return;
    }

    setFollowingUpDevisId(devis.id);
    try {
      const sentAt = new Date().toISOString();
      createEvent({
        title: `Relance devis - ${project.clientFirstName} ${project.clientName}`,
        date: sentAt,
        type: 'Relance',
        projectId: project.id,
        notes: 'Relance de devis envoyée en mode démo',
        status: 'Prévu',
      });
      setDevisList((prev) =>
        prev.map((item) =>
          item.id === devis.id
            ? {
                ...item,
                last_follow_up_at: sentAt,
                follow_up_count: (item.follow_up_count || 0) + 1,
              }
            : item
        )
      );
      setFollowUpToast({ type: 'success', message: 'Relance envoyée en mode démo' });
    } catch (error) {
      setFollowUpToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Impossible de relancer le devis',
      });
    } finally {
      setFollowingUpDevisId(null);
    }
  }

  const legalComplete = !!(
    artisanConfig?.siret &&
    artisanConfig?.raisonSociale &&
    artisanConfig?.adressePro &&
    (artisanConfig?.assuranceNonRequise || (artisanConfig?.assureur && artisanConfig?.numAssurance))
  );

  async function updateStatus(status: string) {
    try {
      setUpdating(true);
      updateProjectStatus(id, status);
      setProject((current: any) => (current ? { ...current, status } : current));
    } catch (error) {
      console.error('UPDATE_STATUS_ERROR', error);
    } finally {
      setUpdating(false);
    }
  }

  async function saveNote() {
    try {
      setUpdating(true);
      updateProjectNote(id, note);
      setProject((current: any) => (current ? { ...current, internalNotes: note, notes: note } : current));
    } catch (error) {
      console.error('SAVE_NOTES_ERROR', error);
    } finally {
      setUpdating(false);
    }
  }

  async function saveCallback() {
    try {
      setUpdating(true);
      updateProjectCallback(id, callbackDate || null);
      setProject((current: any) => (current ? { ...current, callbackDate: callbackDate || null } : current));
    } catch (error) {
      console.error('SAVE_CALLBACK_DATE_ERROR', error);
    } finally {
      setUpdating(false);
    }
  }

  async function handleRdvSave() {
    if (!rdvData.title || !rdvData.date) return;
    setSavingRdv(true);
    try {
      createEvent({
        title: rdvData.title || `RDV ${project.clientFirstName} ${project.clientName}`,
        date: `${rdvData.date}T${rdvData.time || '09:00'}:00`,
        type: rdvData.type as 'RDV' | 'Relance' | 'Rappel' | 'Intervention',
        projectId: project.id,
        notes: rdvData.notes || '',
        status: 'Prévu',
      });
      setShowRdvModal(false);
      alert('RDV enregistré dans le calendrier !');
    } finally {
      setSavingRdv(false);
    }
  }

  async function saveCalendarEvent() {
    if (!eventDate) return;
    setSavingEvent(true);
    try {
      createEvent({
        title: `${eventType} - ${project.clientFirstName} ${project.clientName}`,
        date: eventDate.includes('T') ? eventDate : `${eventDate}T09:00:00`,
        type: eventType as 'RDV' | 'Relance' | 'Rappel' | 'Intervention',
        projectId: project.id,
        notes: 'Planifié depuis le dossier projet',
        status: 'Prévu',
      });
      if (eventType === 'Relance') {
        updateProjectCallback(project.id, eventDate);
        setProject((current: any) => (current ? { ...current, callbackDate: eventDate } : current));
      }
      setEventDate('');
      alert(`${eventType} ajouté au calendrier ✓`);
    } catch {
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSavingEvent(false);
    }
  }

  function focusNote() {
    setShowNotes(true);
    setTimeout(() => {
      noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => noteRef.current?.focus(), 400);
    }, 100);
  }

  if (loading) {
    return (
      <div className="dashboard-shell min-h-screen bg-[var(--bg)] text-[var(--text-1)] flex items-center justify-center">
        <p className="text-[var(--text-2)]">Chargement du dossier...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="dashboard-shell min-h-screen bg-[var(--bg)] text-[var(--text-1)] flex items-center justify-center">
        <p className="text-[var(--text-2)]">Dossier introuvable.</p>
      </div>
    );
  }

  const currentStyle = statusStyles[project.status] || statusStyles['Nouveau'];
  const verdict = getVerdict(project);
  const recommendation = getRecommendation(project);
  const indicators = getIndicators(project);
  const summary = getStructuredSummary(project);
  const followUpTime = getBestFollowUpTime(project);
  const clientLabel = [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || 'Client non renseigne';
  const projectLabel = project.projectType || project.trade || 'Projet';
  const score = Number(project.completenessScore || 0);
  const projectIdentityItems = [
    { label: 'Reference', value: project.projectNumber || project.id || 'Non renseignee' },
    { label: 'Metier', value: project.trade || 'Non renseigne' },
    { label: 'Budget', value: project.budget || 'Non renseigne' },
    { label: 'Delai', value: project.desiredTimeline || 'Non renseigne' },
    { label: 'Ville', value: project.city || 'Non renseignee' },
    { label: 'Source', value: project.source || 'Demo Kadria' },
  ];
  const clientIdentityItems = [
    { label: 'Nom', value: clientLabel },
    { label: 'Telephone', value: project.clientPhone || 'Non renseigne' },
    { label: 'Email', value: project.clientEmail || 'Non renseigne' },
    { label: 'Adresse chantier', value: project.siteAddress || 'Non renseignee' },
    { label: 'Maturite', value: project.maturity || 'A qualifier' },
    { label: 'Cree le', value: formatShortDate(project.createdAt) },
  ];
  const actionPriority =
    score >= 90 ? 'Priorite haute' : score >= 75 ? 'Priorite moyenne' : 'Priorite a qualifier';
  const actionSummary =
    followUpTime.lastInteractionDate
      ? `Dernier echange le ${formatShortDate(followUpTime.lastInteractionDate)}`
      : 'Aucun echange date dans la demo';

  return (
    <div className="dashboard-shell min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--text-1)]">
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5 sm:px-6 sm:py-8">
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '24px', gap: isMobile ? '12px' : '16px' }}>
          <Button variant="ghost" onClick={() => router.push('/demo-dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <button
            onClick={async () => {
              if (!canExportPdf) {
                openUpgradeModal('pdfExports');
                return;
              }
              const preview = devisList[0] || buildDemoDevisList({ ...project, devisAmount: Number(devisAmount || project.devisAmount || 8600) })[0];
              if (!preview) return;
              const raisonSociale = artisanConfig?.raisonSociale || 'Kadria Démo';
              const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${preview.numero}</title><style>
                body{font-family:Inter,Arial,sans-serif;background:#fff;color:#18181b;padding:40px;line-height:1.5}
                .card{max-width:760px;margin:0 auto;border:1px solid #e4e4e7;border-radius:16px;padding:32px}
                .muted{color:#71717a}
                .accent{color:#16a34a}
                .row{display:flex;justify-content:space-between;gap:24px;margin:10px 0;border-bottom:1px solid #f4f4f5;padding-bottom:8px}
                .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
                table{width:100%;border-collapse:collapse;margin-top:16px}
                th,td{text-align:left;padding:8px;border-bottom:1px solid #f4f4f5;font-size:14px}
                .total{font-size:18px;font-weight:700;margin-top:16px;text-align:right}
                .watermark{position:fixed;top:40%;left:10%;font-size:64px;color:rgba(22,163,74,.08);transform:rotate(-25deg);font-weight:800;letter-spacing:.1em}
                @media print { .watermark{display:none} }
              </style></head><body>
                <div class="watermark">APERÇU DÉMO</div>
                <div class="card">
                  <div class="header">
                    <div>
                      <p class="accent" style="font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0">${raisonSociale}</p>
                      <p class="muted" style="margin:4px 0 0;font-size:13px">${artisanConfig?.adressePro || ''}</p>
                    </div>
                    <div style="text-align:right">
                      <h1 style="margin:0;font-size:28px">${preview.numero}</h1>
                      <p class="muted" style="margin:4px 0 0">Émis le ${formatDevisDate(preview.date_emission)}</p>
                    </div>
                  </div>
                  <div class="row"><span>Client</span><strong>${project.clientFirstName || ''} ${project.clientName || ''}</strong></div>
                  <div class="row"><span>Adresse chantier</span><strong>${project.siteAddress || ''} ${project.city || ''}</strong></div>
                  <div class="row"><span>Téléphone</span><strong>${project.clientPhone || ''}</strong></div>
                  <div class="row"><span>Projet</span><strong>${project.projectType || 'Projet'}</strong></div>
                  <table>
                    <thead><tr><th>Désignation</th><th>Détail</th><th style="text-align:right">Montant</th></tr></thead>
                    <tbody>
                      <tr><td>${project.trade || 'Prestation'}</td><td class="muted">${project.projectType || ''}</td><td style="text-align:right">${formatMoney(preview.amount)} €</td></tr>
                    </tbody>
                  </table>
                  <p class="total">Total TTC : ${formatMoney(preview.amount)} €</p>
                  <p class="muted" style="margin-top:24px;font-size:12px">Document de démonstration généré par Kadria — non valable comme devis officiel.</p>
                </div>
              </body></html>`;
              const win = window.open('', '_blank');
              if (win) {
                win.document.write(html);
                win.document.close();
                setTimeout(() => win.print(), 500);
              }
            }}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              borderRadius: '8px',
              padding: isMobile ? '10px 14px' : '8px 16px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: 'center',
              width: isMobile ? '100%' : undefined,
            }}
          >
            {!canExportPdf && <Lock size={14} />}
            📄 Exporter PDF
          </button>
        </div>

        {artisanConfig && !legalComplete && (
          <div
            className="flex items-center gap-3 flex-wrap mb-4"
            style={{
              background: 'rgba(217,119,6,0.08)',
              border: '1px solid rgba(217,119,6,0.3)',
              borderRadius: '12px',
              padding: isMobile ? '14px 16px' : '14px 20px',
            }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <p className="text-sm text-[var(--text-2)] flex-1 m-0">
              Complétez vos informations légales pour générer des devis professionnels.
            </p>
            <a href="/demo-parametres" className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--accent)' }}>
              Compléter mon profil →
            </a>
          </div>
        )}

        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: isMobile ? '18px 16px' : '24px',
          marginBottom: '16px',
          maxWidth: '100%',
        }}>
          {/* Ligne 1 : Nom + Statut */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'flex-start',
            gap: isMobile ? '12px' : 0,
            marginBottom: '6px',
          }}>
            <div>
              <h1 style={{
                color: 'var(--text-1)',
                fontSize: isMobile ? '24px' : '28px',
                fontWeight: 700,
                margin: '0 0 4px',
              }}>
                {projectLabel}
              </h1>
              <p style={{
                color: 'var(--text-2)',
                fontSize: '14px',
                margin: 0,
              }}>
                {clientLabel} · {project.trade || 'Projet'} · {project.city || 'Ville non renseignee'}
              </p>
            </div>
            {/* Statut */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isMobile ? 'flex-start' : 'flex-end',
              alignSelf: isMobile ? 'flex-start' : undefined,
              gap: '8px',
              flexShrink: 0,
            }}>
              <div>
                <p style={{
                  color: 'var(--text-3)',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: '0 0 4px',
                  textAlign: isMobile ? 'left' : 'right',
                }}>
                  Statut dossier
                </p>
                <span style={{
                  background: currentStyle.bg,
                  color: currentStyle.text,
                  border: `1px solid ${currentStyle.border}`,
                  borderRadius: '20px',
                  padding: '5px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  alignSelf: 'flex-start',
                }}>
                  {project.status || 'Nouveau'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'var(--bg)',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '999px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}>
                  Score {formatInteger(score)}/100
                </span>
                <span style={{
                  background: verdict.bg,
                  color: verdict.color,
                  border: `1px solid ${verdict.border}`,
                  borderRadius: '999px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {verdict.label}
                </span>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '12px',
          }}>
            {[project.projectNumber, project.maturity, project.budget, project.source].filter(Boolean).map((item) => (
              <span
                key={item}
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '999px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {item}
              </span>
            ))}
          </div>

          {/* Séparateur */}
          <hr style={{
            border: 'none',
            borderTop: '1px solid var(--border)',
            margin: '16px 0',
          }} />

          {/* Ligne 2 : Infos de contact */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: isMobile ? '12px' : '20px',
            alignItems: isMobile ? 'flex-start' : 'center',
          }}>
            {project.clientPhone && (
              <a href={`tel:${project.clientPhone}`} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                color: 'var(--text-1)', textDecoration: 'none', fontSize: '13px',
              }}>
                <span style={{ color: 'var(--accent)', fontSize: '14px' }}>📞</span>
                {project.clientPhone}
              </a>
            )}
            {project.clientEmail && (
              <a href={`mailto:${project.clientEmail}`} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                color: 'var(--text-1)', textDecoration: 'none', fontSize: '13px',
              }}>
                <span style={{ color: 'var(--accent)', fontSize: '14px' }}>✉️</span>
                {project.clientEmail}
              </a>
            )}
            {project.siteAddress && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                color: 'var(--text-1)', fontSize: '13px',
              }}>
                <span style={{ color: 'var(--accent)', fontSize: '14px' }}>📍</span>
                {(() => {
                  const addr = project.siteAddress || '';
                  const city = project.city || '';
                  if (city && addr.toLowerCase().includes(city.toLowerCase())) {
                    return addr;
                  }
                  return city ? `${addr}, ${city}` : addr;
                })()}
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              color: 'var(--text-3)', fontSize: '12px',
              marginLeft: 'auto',
            }}>
              <span>📅</span>
              Créé le {formatShortDate(project.createdAt)}
            </div>
            <button
              onClick={() => {
                setContactForm({
                  clientFirstName: project.clientFirstName || '',
                  clientName: project.clientName || '',
                  clientPhone: project.clientPhone || '',
                  clientEmail: project.clientEmail || '',
                  siteAddress: project.siteAddress || '',
                });
                setEditingContact(true);
              }}
              title="Modifier les informations"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-3)',
                borderRadius: '6px',
                padding: isMobile ? '8px 10px' : '4px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                width: isMobile ? '100%' : undefined,
                justifyContent: 'center',
              }}
            >
              ✏️ Modifier
            </button>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid rgba(34,197,94,0.24)',
          boxShadow: '0 0 0 1px rgba(34,197,94,0.06), 0 8px 28px rgba(34,197,94,0.08)',
          borderRadius: '16px',
          padding: isMobile ? '16px' : '18px 20px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: isMobile ? 'flex-start' : 'center',
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              color: 'var(--accent)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 6px',
            }}>
              Action recommandee
            </p>
            <p style={{ color: 'var(--text-1)', fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>
              {recommendation}
            </p>
            <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: 0 }}>
              {followUpTime.primarySlot} · {followUpTime.secondarySlot}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid var(--border)',
                color: score >= 90 ? 'var(--accent)' : score >= 75 ? '#f59e0b' : 'var(--text-2)',
              }}>
                {actionPriority}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                {actionSummary}
              </span>
            </div>
          </div>

          <div style={{ minWidth: isMobile ? '100%' : '220px', width: isMobile ? '100%' : undefined }}>
            <button
              type="button"
              onClick={() => setShowCallback(true)}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: '#0b0f0d',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Planifier la prochaine action
            </button>
            <p style={{ margin: '8px 0 0', color: 'var(--text-3)', fontSize: '11px' }}>
              Simulation locale uniquement - aucune donnee reelle modifiee.
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
          gap: '16px',
          marginBottom: '16px',
        }}>
          <section style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: isMobile ? '16px' : '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              alignItems: 'center',
            }}>
              <div>
                <p style={{ margin: '0 0 4px', color: 'var(--text-3)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Fiche projet
                </p>
                <h2 style={{ margin: 0, color: 'var(--text-1)', fontSize: '16px', fontWeight: 700 }}>
                  Informations principales
                </h2>
              </div>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-2)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                padding: '4px 10px',
              }}>
                {formatInteger(score)}% complet
              </span>
            </div>
            <div style={{ padding: isMobile ? '16px' : '16px 20px', display: 'grid', gap: '12px' }}>
              {projectIdentityItems.map((item) => (
                <div key={item.label} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '6px', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>{item.label}</span>
                  <span style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 600, textAlign: isMobile ? 'left' : 'right' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: isMobile ? '16px' : '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              alignItems: 'center',
            }}>
              <div>
                <p style={{ margin: '0 0 4px', color: 'var(--text-3)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Client
                </p>
                <h2 style={{ margin: 0, color: 'var(--text-1)', fontSize: '16px', fontWeight: 700 }}>
                  Coordonnees et contexte
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setContactForm({
                    clientFirstName: project.clientFirstName || '',
                    clientName: project.clientName || '',
                    clientPhone: project.clientPhone || '',
                    clientEmail: project.clientEmail || '',
                    siteAddress: project.siteAddress || '',
                  });
                  setEditingContact(true);
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-2)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Modifier
              </button>
            </div>
            <div style={{ padding: isMobile ? '16px' : '16px 20px', display: 'grid', gap: '12px' }}>
              {clientIdentityItems.map((item) => (
                <div key={item.label} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '6px', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>{item.label}</span>
                  <span style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 600, textAlign: isMobile ? 'left' : 'right' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '16px',
        }}>
          {/* Header */}
          <div style={{
            padding: isMobile ? '16px' : '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '10px' : 0,
          }}>
            <h2 style={{
              color: 'var(--text-1)',
              fontSize: '15px',
              fontWeight: 600,
              margin: 0
            }}>
              Suivi commercial
            </h2>
            {/* ID + source */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '11px', color: 'var(--text-3)',
                background: 'var(--border)', borderRadius: '6px',
                padding: '3px 8px', whiteSpace: 'nowrap',
                fontFamily: 'monospace',
              }}>
                #{project.id?.slice(-8).toUpperCase()}
              </span>
              {project.source && (
                <span style={{
                  fontSize: '11px', color: 'var(--text-3)',
                  background: 'var(--border)', borderRadius: '6px',
                  padding: '3px 8px', whiteSpace: 'nowrap',
                }}>
                  via {project.source}
                </span>
              )}
            </div>
          </div>

          {/* Pipeline — changer de statut */}
          <div style={{
            padding: isMobile ? '14px 16px' : '14px 20px',
            borderBottom: '1px solid var(--border)',
          }}>
            <p style={{
              color: 'var(--text-3)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 10px',
            }}>
              Faire avancer le dossier
            </p>
            <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px', flexWrap: 'wrap' }}>
              {['À rappeler', 'Qualifié', 'Devis envoyé', 'Gagné', 'Perdu'].map(s => (
                <button
                  key={s}
                  disabled={updating}
                  onClick={() => updateStatus(s)}
                  style={{
                    padding: isMobile ? '8px 10px' : '7px 14px',
                    borderRadius: '8px',
                    fontSize: isMobile ? '12px' : '13px',
                    fontWeight: (project.status === s) ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: (project.status === s)
                      ? statusColors[s].bg
                      : 'var(--bg)',
                    color: (project.status === s)
                      ? statusColors[s].text
                      : 'var(--text-2)',
                    border: `1px solid ${statusColors[s].border}`,
                    opacity: (project.status === s) ? 1 : 0.75,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div style={{
              borderTop: '1px solid var(--border)',
              marginTop: '12px',
              paddingTop: '14px',
            }}>
              <p style={{
                color: 'var(--text-3)', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                margin: '0 0 10px',
              }}>
                Montant du devis
              </p>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', alignItems: isMobile ? 'stretch' : 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="number"
                    value={devisAmount}
                    onChange={e => setDevisAmount(e.target.value)}
                    placeholder={`Budget estimé : ${project.budget || 'non renseigné'}`}
                    style={{
                      width: '100%',
                      background: 'var(--border)',
                      border: devisAmount ? '1px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 40px 8px 12px',
                      color: 'var(--text-1)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-3)',
                    fontSize: '14px',
                  }}>€</span>
                </div>
                <button
                  onClick={async () => {
                    setSavingDevis(true);
                    try {
                      const nextAmount = devisAmount ? Number(devisAmount) : null;
                      updateProjectFields(project.id, { devisAmount: nextAmount ?? undefined });
                      setProject((current: any) => (current ? { ...current, devisAmount: nextAmount ?? undefined } : current));
                    } catch {
                      alert('Erreur lors de la sauvegarde');
                    } finally {
                      setSavingDevis(false);
                    }
                  }}
                  disabled={savingDevis}
                  style={{
                    background: savingDevis ? 'var(--border)' : 'var(--accent)',
                    border: 'none',
                    color: savingDevis ? 'var(--text-3)' : 'black',
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    cursor: savingDevis ? 'default' : 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    width: isMobile ? '100%' : undefined,
                  }}
                >
                  {savingDevis ? '...' : 'Enregistrer'}
                </button>
              </div>
              {devisAmount && (
                <p style={{
                  color: 'var(--accent)', fontSize: '12px', margin: '6px 0 0',
                }}>
                  ✓ Montant réel : {formatInteger(Number(devisAmount))} €
                  {' '}— utilisé pour les KPIs
                </p>
              )}
              {!devisAmount && project.budget && (
                <p style={{
                  color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0',
                }}>
                  Budget estimé utilisé par défaut : {project.budget}
                </p>
              )}
            </div>

            <div style={{
              borderTop: '1px solid var(--border)',
              marginTop: '12px',
              paddingTop: '14px',
            }}>
              <button
                onClick={() => {
                  if (!canQuote) {
                    openUpgradeModal('quoteGeneration');
                    return;
                  }
                  if (!legalComplete) return;
                  const generatedQuote = devisList[0] || buildDemoDevisList({ ...project, devisAmount: Number(devisAmount || project.devisAmount || 8600), status: project.status || 'Devis envoyé' })[0];
                  if (generatedQuote) {
                    setDevisList((current) => (current.length > 0 ? current : [generatedQuote]));
                    setProject((current: any) => (current ? { ...current, devisAmount: generatedQuote.amount } : current));
                    setFollowUpToast({ type: 'success', message: 'Devis de démonstration généré' });
                  }
                }}
                disabled={!legalComplete && canQuote}
                title={!legalComplete ? 'Complétez vos infos légales d\'abord' : undefined}
                style={{
                  width: '100%',
                  background: 'var(--bg-elevated)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  cursor: !canQuote || legalComplete ? 'pointer' : 'not-allowed',
                  opacity: !canQuote || legalComplete ? 1 : 0.4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (legalComplete) e.currentTarget.style.background = 'rgba(34,197,94,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                }}
              >
                {!canQuote && <Lock size={14} />}
                📄 Générer un devis
              </button>

              {devisList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {devisList.map((devis) => (
                    <div
                      key={devis.id}
                      onClick={() => { const win = window.open('', '_blank'); if (win) { win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${devis.numero}</title><style>body{font-family:Inter,Arial,sans-serif;background:#0b0f0d;color:#f4f4f5;padding:40px;line-height:1.5} .card{max-width:760px;margin:0 auto;border:1px solid rgba(63,63,70,.8);border-radius:24px;background:#111315;padding:32px} .muted{color:#a1a1aa} .accent{color:#22c55e} .row{display:flex;justify-content:space-between;gap:24px;margin:12px 0}</style></head><body><div class="card"><p class="accent" style="font-weight:700;letter-spacing:.08em;text-transform:uppercase">Kadria Demo</p><h1 style="margin:8px 0 0;font-size:32px">${devis.numero}</h1><p class="muted">Aper?u du devis de d?monstration</p><div class="row"><span>Client</span><strong>${project.clientFirstName || ''} ${project.clientName || ''}</strong></div><div class="row"><span>Projet</span><strong>${project.projectType || 'Projet'}</strong></div><div class="row"><span>Montant</span><strong>${formatMoney(devis.amount)} ?</strong></div><div class="row"><span>Statut</span><strong>${devis.statut}</strong></div></div></body></html>`); win.document.close(); } }}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: isMobile ? '14px 16px' : '14px 20px',
                        cursor: 'pointer',
                        marginTop: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'border-color 150ms, transform 150ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '12px', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, width: isMobile ? '100%' : undefined, flexWrap: 'wrap' }}>
                          <FileTextIcon size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{devis.numero}</span>
                          <span style={{ color: 'var(--text-3)' }}>·</span>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>
                            {formatMoney(devis.amount)} €
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-3)', display: 'flex', flexDirection: 'column', gap: '2px', width: isMobile ? '100%' : undefined }}>
                          <span>Généré le {formatDevisDate(devis.date_emission)}</span>
                          <span>Expire le {formatDevisDate(devis.date_validite)}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: isMobile ? '100%' : undefined }}>
                          {devis.accepted && (
                            <span style={{
                              background: 'rgba(34,197,94,0.1)',
                              color: 'var(--accent)',
                              border: '1px solid rgba(34,197,94,0.3)',
                              borderRadius: '999px',
                              padding: '4px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}>
                              ✓ Accepté le {formatDevisDate(devis.accepted_at || '')}
                            </span>
                          )}
                          {devis.sent || devis.statut?.startsWith('Envoy') ? (
                            <span style={{
                              background: 'rgba(34,197,94,0.1)',
                              color: 'var(--accent)',
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
                              📄 Enregistré · Non envoyé
                            </span>
                          )}
                          <ChevronRight size={14} style={{ color: 'var(--text-3)', marginLeft: '4px' }} />
                        </div>
                      </div>

                          {(devis.sent || devis.statut?.startsWith('Envoy')) && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                followUpQuote(devis);
                              }}
                              disabled={followingUpDevisId === devis.id}
                              style={{
                                alignSelf: 'flex-start',
                                background: 'var(--accent)',
                                border: 'none',
                                color: 'var(--bg)',
                                borderRadius: '9px',
                                padding: '8px 14px',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: followingUpDevisId === devis.id ? 'default' : 'pointer',
                                opacity: followingUpDevisId === devis.id ? 0.7 : 1,
                                width: isMobile ? '100%' : undefined,
                              }}
                            >
                              {followingUpDevisId === devis.id ? 'Envoi...' : isMobile ? 'Relancer' : 'Relancer le devis'}
                            </button>
                          )}

                          {(devis.sent || devis.statut?.startsWith('Envoy')) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: devis.opens_count > 0 ? 'var(--text-2)' : 'var(--text-3)', flexWrap: 'wrap' }}>
                              {devis.opens_count > 0 ? (
                                <>
                                  <Eye size={12} />
                                  <span>Ouvert {devis.opens_count} fois - Derniere ouverture : {formatDevisDate(devis.last_opened_date || '')}</span>
                                </>
                              ) : (
                                <>
                                  <Eye size={12} />
                                  <span>Pas encore ouvert</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{
                  borderTop: '1px solid var(--border)',
                  marginTop: '12px',
                  paddingTop: '12px',
                }}>
                  <p style={{
                    color: 'var(--text-3)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    margin: '0 0 8px',
                  }}>
                    Cloture du dossier
                  </p>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
                <button
                  onClick={() => updateStatus('Gagné')}
                  style={{
                    flex: 1,
                    background: project.status === 'Gagné'
                      ? 'rgba(21,128,61,0.25)' : 'rgba(21,128,61,0.1)',
                    border: '1px solid #16a34a',
                    color: '#15803d',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  🏆 Chantier gagné
                </button>
                <button
                  onClick={() => {
                    if (confirm('Archiver ce dossier comme perdu ?')) updateStatus('Perdu');
                  }}
                  style={{
                    flex: 1,
                    background: project.status === 'Perdu'
                      ? 'rgba(220,38,38,0.2)' : 'rgba(220,38,38,0.08)',
                    border: '1px solid #dc2626',
                    color: '#b91c1c',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  🗄️ Archiver (perdu)
                </button>
              </div>
            </div>
          </div>

          {/* Planificateur calendrier */}
            <div style={{ padding: isMobile ? '14px 16px' : '14px 20px' }}>
            <div style={{
              borderTop: '1px solid var(--border)',
              marginTop: '12px',
              paddingTop: '14px',
            }}>
              <p style={{
                color: 'var(--text-3)', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                margin: '0 0 10px',
              }}>
                Planifier dans le calendrier
              </p>

              {/* Type selector */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {EVENT_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setEventType(t.value)}
                    style={{
                      background: eventType === t.value ? t.bg : 'var(--border)',
                      border: `1px solid ${eventType === t.value ? t.border : 'var(--border)'}`,
                      color: eventType === t.value ? t.color : 'var(--text-2)',
                      borderRadius: '8px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: eventType === t.value ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.value}
                  </button>
                ))}
              </div>

              {/* Date + bouton */}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', alignItems: isMobile ? 'stretch' : 'center' }}>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--border)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '7px 10px',
                    color: 'var(--text-1)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={saveCalendarEvent}
                  disabled={savingEvent || !eventDate}
                  style={{
                    background: savingEvent || !eventDate ? 'var(--border)' : 'var(--accent)',
                    border: 'none',
                    color: savingEvent || !eventDate ? 'var(--text-3)' : 'black',
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '7px 16px',
                    fontSize: '13px',
                    cursor: savingEvent || !eventDate ? 'default' : 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    width: isMobile ? '100%' : undefined,
                  }}
                >
                  {savingEvent ? '...' : '+ Calendrier'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          {/* Header avec badge verdict */}
          <div style={{
            padding: isMobile ? '16px' : '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '10px' : 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '16px' }}>✦</span>
              <span style={{
                color: 'var(--accent)',
                fontWeight: 700,
                fontSize: '14px',
                letterSpacing: '0.02em'
              }}>
                Analyse Kadria
              </span>
            </div>
            {/* Badge verdict */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                color: 'var(--text-2)',
                fontSize: '12px',
                fontWeight: 600,
              }}>
                {formatInteger(score)}/100
              </span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: verdict.bg,
                border: `1px solid ${verdict.border}`,
                borderRadius: '20px',
                padding: '4px 12px',
              }}>
                <span style={{ fontSize: '12px' }}>{verdict.icon}</span>
                <span style={{
                  color: verdict.color,
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  {verdict.label}
                </span>
              </div>
            </div>
          </div>

          {/* Indicateurs qualité */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '1px',
            background: 'var(--border)',
            borderBottom: '1px solid var(--border)',
          }}>
            {indicators.map((ind, i) => {
              if (i === 3 && project.photos && project.photos.length > 0) {
                const photos = project.photos;

                return (
                  <div key={i} style={{
                    background: 'var(--bg-elevated)',
                    padding: isMobile ? '12px' : '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--accent)', fontSize: '14px' }}>✓</span>
                      <span style={{ color: 'var(--text-1)', fontSize: '12px', fontWeight: 500 }}>
                        Photos jointes
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', paddingLeft: isMobile ? '0' : '20px', flexWrap: 'wrap' }}>
                      {photos.slice(0, 4).map((photo: any, idx: number) => {
                        const url = photo.url || (typeof photo === 'string' ? photo : '#');
                        const thumbUrl = photo.thumbnailUrl || photo.url || (typeof photo === 'string' ? photo : '');

                        return (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1px solid var(--border)',
                              display: 'block',
                            }}
                          >
                            <img
                              src={thumbUrl}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </a>
                        );
                      })}
                      {photos.length > 4 && (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-2)',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          +{photos.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} style={{
                  background: 'var(--bg-elevated)',
                  padding: isMobile ? '12px' : '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      color: ind.ok ? 'var(--accent)' : '#b91c1c',
                      fontSize: '14px'
                    }}>
                      {ind.ok ? '✓' : '✗'}
                    </span>
                    <span style={{
                      color: ind.ok ? 'var(--text-1)' : 'var(--text-2)',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}>
                      {ind.label}
                    </span>
                  </div>
                  <span style={{
                    color: 'var(--text-3)',
                    fontSize: '11px',
                    paddingLeft: '20px',
                  }}>
                    {ind.detail}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Résumé structuré */}
          <div style={{ padding: isMobile ? '16px' : '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{
              color: 'var(--accent)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: '0 0 10px',
            }}>
              Résumé du projet
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: '🏗️', label: 'Le projet', value: summary.projet },
                { icon: '💶', label: 'L\'enjeu', value: summary.enjeu },
                { icon: '🎯', label: 'Priorité', value: summary.priorite },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{
                    color: 'var(--text-3)',
                    fontSize: '12px',
                      minWidth: isMobile ? '72px' : '80px',
                    flexShrink: 0,
                  }}>
                    {item.label} :
                  </span>
                  <span style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 500 }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Synthèse IA longue */}
          {project.aiSummary && (
            <div style={{ padding: isMobile ? '16px' : '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <p style={{
                color: 'var(--accent)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                margin: '0 0 8px',
              }}>
                Synthèse IA
              </p>
              <p style={{
                color: 'var(--text-2)',
                fontSize: '13px',
                lineHeight: '1.7',
                margin: 0,
                fontStyle: 'italic',
              }}>
                {project.aiSummary}
              </p>
            </div>
          )}

          {/* Recommandation IA */}
          <div style={{
            padding: isMobile ? '14px 16px' : '14px 20px',
            background: 'rgba(34, 197, 94, 0.05)',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
            <div>
              <p style={{
                color: 'var(--accent)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                margin: '0 0 4px',
              }}>
                Recommandation Kadria
              </p>
              <p style={{
                color: 'var(--text-2)',
                fontSize: '13px',
                lineHeight: '1.6',
                margin: 0,
              }}>
                {recommendation}
              </p>
            </div>
          </div>
        </div>

        {!showNotes ? (
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: isMobile ? '16px' : '16px 20px',
            marginBottom: '16px',
          }}>
            <button
              onClick={() => setShowNotes(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-2)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: 0,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
              }}
            >
              <span>📝</span>
              <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>Notes internes</span>
              {note && (
                <span style={{
                  background: 'var(--accent)', color: 'black',
                  borderRadius: '10px', padding: '1px 7px',
                  fontSize: '11px', fontWeight: 700,
                }}>
                  1
                </span>
              )}
              <span style={{
                marginLeft: isMobile ? 0 : 'auto',
                width: isMobile ? '100%' : undefined,
                fontSize: '12px',
                color: 'var(--accent)',
              }}>
                {note ? 'Voir / modifier →' : '+ Ajouter une note →'}
              </span>
            </button>
            {note && (
              <p style={{
                color: 'var(--text-2)', fontSize: '13px',
                margin: '10px 0 0', fontStyle: 'italic', lineHeight: 1.6,
              }}>
                {note.slice(0, 120)}{note.length > 120 ? '...' : ''}
              </p>
            )}
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: isMobile ? '16px' : '20px', marginBottom: '16px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '12px', gap: '12px',
            }}>
              <h3 style={{ color: 'var(--text-1)', fontSize: '15px', fontWeight: 600, margin: 0 }}>
                📝 Notes internes
              </h3>
              <button
                onClick={() => setShowNotes(false)}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--text-3)', cursor: 'pointer', fontSize: '18px',
                }}
              >✕</button>
            </div>
            <textarea
              ref={noteRef}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ajouter une note interne pour le suivi commercial..."
              style={{
                width: '100%', minHeight: '120px',
                background: 'var(--border)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '12px',
                color: 'var(--text-1)', fontSize: '13px',
                resize: 'vertical', outline: 'none',
                fontFamily: 'system-ui, sans-serif',
                lineHeight: 1.6, boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => { saveNote(); setShowNotes(false); }}
              style={{
                marginTop: '10px', background: 'var(--accent)',
                border: 'none', color: 'black', fontWeight: 600,
                borderRadius: '8px', padding: '8px 20px',
                fontSize: '13px', cursor: 'pointer', width: isMobile ? '100%' : undefined,
              }}
            >
              Enregistrer la note
            </button>
          </div>
        )}

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--text-1)] mb-5">Historique du dossier</h2>

          {(() => {
            const allEvents = [...activities, {
              id: 'creation',
              description: `Dossier créé — statut initial : ${project.status || 'Nouveau'}`,
              createdAt: project.createdAt,
              action: 'CREATED',
            }];
            const events = showAllHistory ? allEvents : allEvents.slice(0, 3);

            return (
              <>
                <div className="relative">
                  <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-[var(--bg-hover)]" />

                  {events.map((activity) => (
                    <div key={activity.id} className="relative pl-10 pb-5 last:pb-0">
                      <TimelineIcon action={activity.action} />

                      <p className="font-medium text-[var(--text-1)] text-sm">{activity.description}</p>

                      <p className="text-xs text-[var(--text-2)] mt-0.5">
                        {activity.createdAt
                          ? formatDateTime(activity.createdAt)
                          : 'Date inconnue'}
                      </p>
                    </div>
                  ))}
                </div>

                {allEvents.length > 3 && (
                  <button
                    onClick={() => setShowAllHistory((v) => !v)}
                    className="text-sm text-green-500 hover:underline"
                  >
                    {showAllHistory ? 'Réduire' : "Voir tout l'historique"}
                  </button>
                )}
              </>
            );
          })()}
        </section>

      </main>

      {showRdvModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[var(--text-1)] font-bold text-lg">📅 Nouveau rendez-vous</h2>

              <button
                onClick={() => setShowRdvModal(false)}
                className="text-[var(--text-2)] hover:text-[var(--text-1)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-2)] uppercase tracking-wide">Titre</label>
                <input
                  type="text"
                  value={rdvData.title}
                  onChange={(e) => setRdvData({ ...rdvData, title: e.target.value })}
                  placeholder="Visite technique, Devis..."
                  className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-2 text-sm text-[var(--text-1)] outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--text-2)] uppercase tracking-wide">Type</label>
                <select
                  value={rdvData.type}
                  onChange={(e) => setRdvData({ ...rdvData, type: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-2 text-sm text-[var(--text-1)] outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="RDV">RDV</option>
                  <option value="Relance">Relance</option>
                  <option value="Rappel">Rappel</option>
                  <option value="Intervention">Intervention</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-[var(--text-2)] uppercase tracking-wide">Date</label>
                  <input
                    type="date"
                    value={rdvData.date}
                    onChange={(e) => setRdvData({ ...rdvData, date: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-2 text-sm text-[var(--text-1)] outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--text-2)] uppercase tracking-wide">Heure</label>
                  <input
                    type="time"
                    value={rdvData.time}
                    onChange={(e) => setRdvData({ ...rdvData, time: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-2 text-sm text-[var(--text-1)] outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--text-2)] uppercase tracking-wide">Notes</label>
                <textarea
                  value={rdvData.notes}
                  onChange={(e) => setRdvData({ ...rdvData, notes: e.target.value })}
                  rows={3}
                  className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-2 text-sm text-[var(--text-1)] outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <button
              onClick={handleRdvSave}
              disabled={savingRdv || !rdvData.title || !rdvData.date}
              className="w-full bg-green-500 text-black font-bold rounded-lg px-4 py-2 disabled:opacity-50"
            >
              {savingRdv ? 'Enregistrement...' : 'Enregistrer le RDV'}
            </button>
          </div>
        </div>
      )}

      {editingContact && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[var(--text-1)] font-bold text-lg">✏️ Modifier les informations</h2>

              <button
                onClick={() => setEditingContact(false)}
                className="text-[var(--text-2)] hover:text-[var(--text-1)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-[var(--text-2)] uppercase tracking-wide">Prénom</label>
                  <input
                    type="text"
                    value={contactForm.clientFirstName}
                    onChange={(e) => setContactForm({ ...contactForm, clientFirstName: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-2 text-sm text-[var(--text-1)] outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--text-2)] uppercase tracking-wide">Nom</label>
                  <input
                    type="text"
                    value={contactForm.clientName}
                    onChange={(e) => setContactForm({ ...contactForm, clientName: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-2 text-sm text-[var(--text-1)] outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--text-2)] uppercase tracking-wide">Téléphone</label>
                <input
                  type="text"
                  value={contactForm.clientPhone}
                  onChange={(e) => setContactForm({ ...contactForm, clientPhone: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-2 text-sm text-[var(--text-1)] outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--text-2)] uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={contactForm.clientEmail}
                  onChange={(e) => setContactForm({ ...contactForm, clientEmail: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-2 text-sm text-[var(--text-1)] outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--text-2)] uppercase tracking-wide">Adresse du chantier</label>
                <input
                  type="text"
                  value={contactForm.siteAddress}
                  onChange={(e) => setContactForm({ ...contactForm, siteAddress: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-2 text-sm text-[var(--text-1)] outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setEditingContact(false)}
                className="flex-1 bg-[var(--bg-hover)] text-[var(--text-1)] font-bold rounded-lg px-4 py-2 border border-[var(--border)]"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  setSavingContact(true);
                  try {
                    const nextFields = {
                      clientFirstName: contactForm.clientFirstName,
                      clientName: contactForm.clientName,
                      clientPhone: contactForm.clientPhone,
                      clientEmail: contactForm.clientEmail,
                      siteAddress: contactForm.siteAddress,
                    };
                    updateProjectFields(project.id, nextFields);
                    setProject((current: any) => (current ? { ...current, ...nextFields } : current));
                    setEditingContact(false);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
                  } finally {
                    setSavingContact(false);
                  }
                }}
                disabled={savingContact}
                className="flex-1 bg-green-500 text-black font-bold rounded-lg px-4 py-2 disabled:opacity-50"
              >
                {savingContact ? 'Enregistrement...' : 'Sauvegarder les modifications'}
              </button>
            </div>
          </div>
        </div>
      )}

      {followUpToast && (
        <div
          className={`fixed bottom-4 left-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm ${
            followUpToast.type === 'error'
              ? 'border-red-500/30 bg-[var(--bg-elevated)] text-red-200'
              : 'border-green-500/30 bg-[var(--bg-elevated)] text-[var(--text-1)]'
          }`}
        >
          {followUpToast.message}
        </div>
      )}


      {upgradeFeature && (
        <UpgradeModal
          feature={upgradeFeature}
          requiredPlan="performance"
          onClose={() => setUpgradeFeature(null)}
        />
      )}
    </div>
  );
}

function TimelineIcon({ action }: { action?: string }) {
  if (action === 'CREATED') {
    return (
      <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
        <Plus className="w-3 h-3 text-zinc-950" />
      </span>
    );
  }

  if (action?.includes('STATUS')) {
    return (
      <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-[var(--bg-hover)] border-2 border-[var(--border)] flex items-center justify-center">
        <ArrowRight className="w-3 h-3 text-[var(--text-1)]" />
      </span>
    );
  }

  if (action?.includes('CALLBACK')) {
    return (
      <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
        <Clock className="w-3 h-3 text-amber-500" />
      </span>
    );
  }

  if (action?.includes('NOTE')) {
    return (
      <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
        <FileTextIcon className="w-3 h-3 text-blue-400" />
      </span>
    );
  }

  return (
    <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-[var(--bg-hover)] border-2 border-[var(--border)] flex items-center justify-center">
      <ArrowRight className="w-3 h-3 text-[var(--text-1)]" />
    </span>
  );
}

function getVerdict(project: any) {
  const score = project.completenessScore || 0;
  const maturity = project.maturity || '';
  const budget = project.budget || '';
  const timeline = project.desiredTimeline || '';

  const isHot = score >= 80 &&
    (maturity.includes('Prêt') || maturity.includes('urgent')) &&
    !budget.includes('sais pas') &&
    (timeline.includes('possible') || timeline.includes('1 mois'));

  const isCold = score < 60 ||
    budget.includes('sais pas') ||
    maturity.includes('renseigne');

  if (isHot) return {
    label: 'Prospect chaud',
    color: 'var(--accent)',
    bg: 'rgba(34,197,94,0.15)',
    border: 'rgba(34,197,94,0.25)',
    icon: '🔥',
    description: 'Budget défini, délai court, prêt à démarrer'
  };
  if (isCold) return {
    label: 'Prospect froid',
    color: '#b91c1c',
    bg: 'rgba(220,38,38,0.10)',
    border: 'rgba(220,38,38,0.2)',
    icon: '❄️',
    description: 'Budget flou ou projet peu défini'
  };
  return {
    label: 'Prospect tiède',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.15)',
    border: 'rgba(245,158,11,0.3)',
    icon: '⚡',
    description: 'Quelques informations manquantes'
  };
}

function getRecommendation(project: any) {
  const maturity = project.maturity || '';
  const timeline = project.desiredTimeline || '';
  const budget = project.budget || '';

  if (maturity.includes('Prêt') || maturity.includes('urgent')) {
    return "Ce prospect est prêt à démarrer. Rappel recommandé dans les 24h pour maximiser vos chances de conversion.";
  }
  if (timeline.includes('possible') || timeline.includes('1 mois')) {
    return "Le délai est court. Prenez contact rapidement pour proposer une visite technique avant qu'il ne contacte un concurrent.";
  }
  if (budget.includes('sais pas')) {
    return "Le budget n'est pas défini. Proposez une fourchette lors du premier contact pour qualifier davantage.";
  }
  if (maturity.includes('renseigne') || maturity.includes('compare')) {
    return "Ce prospect est en phase de comparaison. Envoyez un devis rapide et différenciez-vous par la réactivité.";
  }
  return "Prenez contact pour affiner les besoins et proposer une visite technique.";
}

function getIndicators(project: any) {
  return [
    {
      label: 'Budget cohérent',
      ok: !!(project.budget && !project.budget.includes('sais pas')),
      detail: project.budget || 'Non renseigné'
    },
    {
      label: 'Délai réaliste',
      ok: !!(project.desiredTimeline && !project.desiredTimeline.includes('urgence')),
      detail: project.desiredTimeline || 'Non renseigné'
    },
    {
      label: 'Contact vérifié',
      ok: !!(project.clientPhone && project.clientEmail),
      detail: project.clientPhone ? 'Téléphone + email' : 'Incomplet'
    },
    {
      label: 'Photos jointes',
      ok: !!(project.photos && project.photos.length > 0),
      detail: project.photos?.length > 0
        ? `${project.photos.length} photo(s)`
        : 'Aucune photo'
    },
  ];
}

function getStructuredSummary(project: any) {
  return {
    projet: [project.projectType, project.trade]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .join(' · ') || 'Non renseigné',
    enjeu: [project.budget, project.desiredTimeline].filter(Boolean).join(' — ') || 'Non renseigné',
    priorite: project.maturity || 'Non renseignée',
  };
}

