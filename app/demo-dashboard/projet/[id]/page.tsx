'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
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
import type { DemoQuoteBuilder, DemoQuoteBuilderLine } from '@/src/lib/demo-data';
import { getProjectHeadline } from '@/src/lib/project-detail/project-headline';
import { getVerdictDisplay } from '@/src/lib/project-detail/project-verdict';
import { getProjectCommercialAnalysis } from '@/src/lib/project-scoring';
import { computeNextAction } from '@/src/lib/action-engine';
import { getProjectDecisionState, type ProjectDecisionStateKey } from '@/src/lib/quote-status';

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
  declined?: boolean;
  declined_at?: string | null;
  decline_reason?: string | null;
  follow_up_disabled?: boolean;
}

type DemoProjectActivity = {
  id: string;
  description: string;
  createdAt: string;
  action: string;
};

type QuoteBuilderFormState = Omit<DemoQuoteBuilder, 'lines'>;

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

function getSourceLabel(source?: string | null) {
  const normalized = (source || '').trim().toLowerCase();
  if (!normalized) return 'Source inconnue';
  if (normalized === 'voice') return 'Demande vocale';
  if (normalized === 'chat-widget') return 'Widget Kadria';
  if (normalized === 'widget') return 'Widget Kadria';
  if (normalized === 'manual') return 'Saisie manuelle';
  if (normalized === 'email') return 'Demande email';
  return source || 'Source inconnue';
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
  const quote = project.quote;
  const normalizedStatus = normalizeDemoStatus(project.status);
  const shouldHaveQuote =
    quote?.status && quote.status !== 'none'
      ? true
      : normalizedStatus === 'Devis envoyé' || normalizedStatus === 'Gagné' || Number(project.devisAmount || 0) > 0;
  if (!shouldHaveQuote) return [];

  const amount = Number(quote?.amount ?? project.devisAmount ?? 0) || 8600;
  const sent = quote?.status === 'sent' || quote?.status === 'opened' || quote?.status === 'accepted' || quote?.status === 'declined';
  const accepted = quote?.status === 'accepted' || normalizedStatus === 'Gagné';
  const declined = quote?.status === 'declined' || normalizedStatus === 'Perdu';
  const quoteSentAt = quote?.sentAt || project.quoteSentAt || (sent ? project.createdAt : undefined);
  const openedCount = typeof quote?.openedCount === 'number' ? quote.openedCount : project.opensCount || 0;
  const openedAt = quote?.openedAt || (openedCount > 0 ? project.createdAt : null);
  const validUntil = quote?.validUntil || project.createdAt;

  const statut =
    quote?.status === 'draft'
      ? 'Brouillon'
      : quote?.status === 'accepted'
        ? 'Accepté'
        : quote?.status === 'declined'
          ? 'Refusé'
          : sent
            ? 'Envoyé'
            : 'Brouillon';

  return [
    {
      id: `demo-devis-${project.id}`,
      numero: project.projectNumber?.replace('DEV-', 'DEVIS-') || 'DEVIS-DEMO-001',
      token: `demo-${project.id}`,
      amount,
      sent,
      statut,
      pdf_url: null,
      date_emission: quoteSentAt || project.createdAt,
      date_validite: validUntil,
      client_email: project.clientEmail || '',
      opens_count: openedCount,
      last_opened_date: openedAt,
      accepted,
      accepted_at: accepted ? (project.followUp?.date || openedAt || quoteSentAt || project.createdAt) : null,
      quote_sent_at: quoteSentAt,
      last_follow_up_at: project.followUp?.status !== 'none' && project.followUp?.status !== 'planned' ? project.followUp?.date : null,
      follow_up_count: project.followUp?.status === 'done' ? 1 : project.followUp?.status === 'late' ? 1 : 0,
      declined,
      declined_at: declined ? (project.followUp?.date || openedAt || quoteSentAt || project.createdAt) : null,
      decline_reason: quote?.declineReason || null,
      follow_up_disabled: false,
    },
  ];
}

function buildDemoActivities(project: any, events: any[]) {
  if (!project) return [];
  const activityFromProject: DemoProjectActivity[] = (project.activity || []).map((item: any) => ({
    id: item.id,
    description: item.label,
    createdAt: item.date,
    action:
      item.kind === 'quote'
        ? 'DEVIS'
        : item.kind === 'followup'
          ? 'CALLBACK_UPDATED'
          : item.kind === 'decision'
            ? 'STATUS_UPDATED'
            : 'CREATED',
  }));
  const timeline = [
    ...activityFromProject,
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

// Apparence du badge statut devis derivee de decision.state (quote-status.ts)
// plutot que d un matching de sous-chaines sur le libelle affiche — evite
// toute divergence si decision.label change de formulation.
function getQuoteStatusAppearance(state: ProjectDecisionStateKey) {
  if (state === 'quote_accepted' || state === 'won') {
    return { bg: 'rgba(22,163,74,0.15)', text: '#16a34a', border: 'rgba(22,163,74,0.3)' };
  }
  if (state === 'quote_declined' || state === 'lost') {
    return { bg: 'rgba(220,38,38,0.15)', text: '#dc2626', border: 'rgba(220,38,38,0.3)' };
  }
  if (state === 'quote_recently_sent' || state === 'quote_followup_available') {
    return { bg: 'rgba(37,99,235,0.15)', text: '#2563eb', border: 'rgba(37,99,235,0.3)' };
  }
  if (state === 'quote_draft') {
    return { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' };
  }
  return { bg: 'rgba(63,63,70,0.35)', text: 'var(--text-2)', border: 'var(--border)' };
}

function demoActionButtonStyle(
  tone: 'primary' | 'secondary' | 'success' | 'danger',
  disabled = false
) {
  const palette =
    tone === 'primary'
      ? { background: 'var(--accent)', color: '#09090b', border: 'none' }
      : tone === 'success'
        ? { background: 'rgba(21,128,61,0.16)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.28)' }
        : tone === 'danger'
          ? { background: 'rgba(220,38,38,0.12)', color: '#f87171', border: '1px solid rgba(220,38,38,0.24)' }
          : { background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)' };

  return {
    ...palette,
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
  } as const;
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
  const quoteSectionRef = useRef<HTMLDivElement>(null);
  const scrollToQuoteSection = () => quoteSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const [openMobileSections, setOpenMobileSections] = useState<Set<string>>(new Set());
  const toggleMobileSection = (key: string) =>
    setOpenMobileSections((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
  const [quoteBuilderForm, setQuoteBuilderForm] = useState<QuoteBuilderFormState>({
    quoteNumber: '',
    clientName: '',
    projectTitle: '',
    siteAddress: '',
    validityDays: 30,
    defaultVat: 20,
    depositPercent: 30,
    paymentTerms: '',
    clientNote: '',
  });
  const [quoteBuilderLines, setQuoteBuilderLines] = useState<DemoQuoteBuilderLine[]>([]);
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
    const initialQuoteBuilder = normalizeQuoteBuilder(normalizedProject);
    const { totalTtc } = computeQuoteBuilderSummary(initialQuoteBuilder.lines, initialQuoteBuilder.depositPercent);
    setQuoteBuilderForm({
      quoteNumber: initialQuoteBuilder.quoteNumber,
      clientName: initialQuoteBuilder.clientName,
      projectTitle: initialQuoteBuilder.projectTitle,
      siteAddress: initialQuoteBuilder.siteAddress,
      validityDays: initialQuoteBuilder.validityDays,
      defaultVat: initialQuoteBuilder.defaultVat,
      depositPercent: initialQuoteBuilder.depositPercent,
      paymentTerms: initialQuoteBuilder.paymentTerms,
      clientNote: initialQuoteBuilder.clientNote,
    });
    setQuoteBuilderLines(initialQuoteBuilder.lines);
    setDevisAmount(String(Number((normalizedProject.devisAmount ?? totalTtc).toFixed(2))));
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
      syncLocalQuoteState((current) => ({
        ...current,
        followUp: {
          ...(current.followUp || { status: 'done', date: sentAt, channel: 'email', reason: 'Relance devis' }),
          status: 'done',
          date: sentAt,
          reason: 'Relance commerciale effectuée après envoi du devis',
        },
        quote: current.quote
          ? {
              ...current.quote,
              openedCount: Math.max(current.quote.openedCount || 0, 1),
              openedAt: current.quote.openedAt || sentAt,
            }
          : current.quote,
        activity: [
          { id: `demo_followup_sent_${Date.now()}`, label: 'Relance envoyée pour le devis (démo)', date: sentAt, kind: 'followup' },
          ...(current.activity || []),
        ],
        lastInteractionAt: sentAt,
        quoteBuilder: buildCurrentQuoteBuilderPayload(),
      }), 'Action simulée - aucun devis réel n’a été envoyé.');
    } catch (error) {
      setFollowUpToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Impossible de relancer le devis',
      });
    } finally {
      setFollowingUpDevisId(null);
    }
  }

  function syncLocalQuoteState(mutator: (current: any) => any, message: string) {
    setProject((current: any) => {
      if (!current) return current;
      const next = mutator(current);
      setDevisList(buildDemoDevisList(next));
      setActivities(buildDemoActivities(next, events));
      return next;
    });
    setFollowUpToast({ type: 'success', message });
  }

  const quoteSummary = useMemo(
    () => computeQuoteBuilderSummary(quoteBuilderLines, quoteBuilderForm.depositPercent),
    [quoteBuilderForm.depositPercent, quoteBuilderLines]
  );

  function updateQuoteBuilderField<Key extends keyof QuoteBuilderFormState>(key: Key, value: QuoteBuilderFormState[Key]) {
    setQuoteBuilderForm((current) => ({ ...current, [key]: value }));
  }

  function updateQuoteBuilderLine<Key extends keyof DemoQuoteBuilderLine>(
    lineId: string,
    key: Key,
    value: DemoQuoteBuilderLine[Key]
  ) {
    setQuoteBuilderLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, [key]: value } : line))
    );
  }

  function addQuoteBuilderLine() {
    setQuoteBuilderLines((current) => [
      ...current,
      {
        id: `line_${Date.now()}`,
        label: 'Nouvelle prestation',
        quantity: 1,
        unit: 'forfait',
        unitPriceHt: 0,
        vatRate: quoteBuilderForm.defaultVat || 20,
        enabled: true,
      },
    ]);
  }

  function removeQuoteBuilderLine(lineId: string) {
    setQuoteBuilderLines((current) => current.filter((line) => line.id !== lineId));
  }

  function toggleQuoteBuilderLine(lineId: string) {
    setQuoteBuilderLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              enabled: line.enabled === false,
            }
          : line
      )
    );
  }

  function buildCurrentQuoteBuilderPayload() {
    return {
      ...quoteBuilderForm,
      lines: quoteBuilderLines,
    };
  }

  function openDemoPdfPreview() {
    if (!canExportPdf) {
      openUpgradeModal('pdfExports');
      return;
    }

    const preview = devisList[0] || buildDemoDevisList({ ...project, devisAmount: Number(quoteSummary.totalTtc.toFixed(2)) })[0];
    if (!preview) return;

    const raisonSociale = artisanConfig?.raisonSociale || 'Kadria Demo';
    const htmlRows = quoteSummary.enabledLines
      .map((line) => {
        const lineTotalHt = Number(line.quantity || 0) * Number(line.unitPriceHt || 0);
        return `<tr><td>${line.label}</td><td>${line.quantity} ${line.unit}</td><td>${Number(line.vatRate || 0)}%</td><td style="text-align:right">${formatMoney(lineTotalHt)} EUR</td></tr>`;
      })
      .join('');

    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${preview.numero}</title><style>
      body{font-family:Inter,Arial,sans-serif;background:#fff;color:#18181b;padding:40px;line-height:1.5}
      .card{max-width:860px;margin:0 auto;border:1px solid #e4e4e7;border-radius:16px;padding:32px}
      .muted{color:#71717a}
      .accent{color:#16a34a}
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
        <div class="header">
          <div>
            <p class="accent" style="font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0">${raisonSociale}</p>
            <p class="muted" style="margin:4px 0 0;font-size:13px">${artisanConfig?.adressePro || ''}</p>
          </div>
          <div style="text-align:right">
            <h1 style="margin:0;font-size:28px">${quoteBuilderForm.quoteNumber}</h1>
            <p class="muted" style="margin:4px 0 0">Valable ${quoteBuilderForm.validityDays} jours</p>
          </div>
        </div>
        <div class="row"><span>Client</span><strong>${quoteBuilderForm.clientName}</strong></div>
        <div class="row"><span>Adresse chantier</span><strong>${quoteBuilderForm.siteAddress}</strong></div>
        <div class="row"><span>Projet</span><strong>${quoteBuilderForm.projectTitle}</strong></div>
        <div class="row"><span>Conditions de paiement</span><strong>${quoteBuilderForm.paymentTerms}</strong></div>
        <table>
          <thead><tr><th>Designation</th><th>Quantite</th><th>TVA</th><th style="text-align:right">Montant HT</th></tr></thead>
          <tbody>${htmlRows}</tbody>
        </table>
        <div class="summary">
          <div class="summary-row"><span>Total HT</span><strong>${formatMoney(quoteSummary.totalHt)} EUR</strong></div>
          <div class="summary-row"><span>TVA</span><strong>${formatMoney(quoteSummary.totalVat)} EUR</strong></div>
          <div class="summary-row total"><span>Total TTC</span><strong>${formatMoney(quoteSummary.totalTtc)} EUR</strong></div>
          <div class="summary-row"><span>Acompte ${quoteBuilderForm.depositPercent}%</span><strong>${formatMoney(quoteSummary.depositAmount)} EUR</strong></div>
        </div>
        <p class="muted" style="margin-top:24px;font-size:12px">${quoteBuilderForm.clientNote}</p>
        <p class="muted" style="margin-top:20px;font-size:12px">Document de demonstration genere par Kadria - non valable comme devis officiel.</p>
      </div>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
    setFollowUpToast({ type: 'success', message: 'Export PDF simule - aucun fichier reel genere.' });
  }

  function updateDemoQuoteStatus(
    nextStatus: 'draft' | 'sent' | 'opened' | 'accepted' | 'declined',
    successMessage = 'Action simulee - aucune donnee reelle modifiee.'
  ) {
    const now = new Date().toISOString();
    syncLocalQuoteState((current) => {
      const currentAmount = Number(quoteSummary.totalTtc.toFixed(2)) || Number(devisAmount || current.devisAmount || current.quote?.amount || 2490);
      const baseQuote = current.quote || {
        status: 'none',
        amount: currentAmount,
        sentAt: null,
        openedAt: null,
        openedCount: 0,
        validUntil: null,
        declineReason: null,
      };
      const nextQuote = {
        ...baseQuote,
        amount: currentAmount,
        status: nextStatus,
        sentAt:
          nextStatus === 'sent' || nextStatus === 'opened' || nextStatus === 'accepted' || nextStatus === 'declined'
            ? baseQuote.sentAt || now
            : baseQuote.sentAt,
        openedAt:
          nextStatus === 'opened' || nextStatus === 'accepted' || nextStatus === 'declined'
            ? baseQuote.openedAt || now
            : nextStatus === 'sent'
              ? null
              : baseQuote.openedAt,
        openedCount:
          nextStatus === 'opened' || nextStatus === 'accepted' || nextStatus === 'declined'
            ? Math.max(baseQuote.openedCount || 0, 1)
            : nextStatus === 'sent'
              ? 0
              : baseQuote.openedCount || 0,
        validUntil:
          nextStatus === 'sent' || nextStatus === 'opened' || nextStatus === 'accepted' || nextStatus === 'declined'
            ? baseQuote.validUntil || new Date(Date.now() + Number(quoteBuilderForm.validityDays || 30) * 24 * 60 * 60 * 1000).toISOString()
            : baseQuote.validUntil,
        declineReason:
          nextStatus === 'declined'
            ? baseQuote.declineReason || 'Projet reporte ou arbitrage budgetaire client'
            : nextStatus === 'accepted'
              ? null
              : baseQuote.declineReason || null,
      };

      const nextProjectStatus =
        nextStatus === 'accepted'
          ? 'Gagné'
          : nextStatus === 'declined'
            ? 'Perdu'
            : nextStatus === 'sent' || nextStatus === 'opened'
              ? 'Devis envoyé'
              : current.status === 'Nouveau'
                ? 'Qualifié'
                : current.status;

      const nextFollowUp =
        nextStatus === 'sent' || nextStatus === 'opened'
          ? {
              ...(current.followUp || { channel: 'email', reason: 'Suivi devis', status: 'planned', date: null }),
              status: nextStatus === 'opened' ? 'late' : 'planned',
              date: new Date(Date.now() + (nextStatus === 'opened' ? -2 : 2) * 24 * 60 * 60 * 1000).toISOString(),
              channel: current.followUp?.channel || 'email',
              reason:
                nextStatus === 'opened'
                  ? 'Devis ouvert sans decision client'
                  : 'Verification de bonne reception du devis',
            }
          : nextStatus === 'accepted'
            ? {
                ...(current.followUp || { channel: 'phone', reason: 'Validation chantier', status: 'done', date: null }),
                status: 'done',
                date: now,
                channel: 'phone',
                reason: 'Validation client recue',
              }
            : nextStatus === 'declined'
              ? {
                  ...(current.followUp || { channel: 'email', reason: 'Projet refuse', status: 'none', date: null }),
                  status: 'none',
                  date: null,
                  channel: 'email',
                  reason: 'Aucune relance complementaire necessaire',
                }
              : current.followUp;

      const nextActivityEntry =
        nextStatus === 'accepted'
          ? { id: `demo_quote_accept_${Date.now()}`, label: 'Devis marqué comme accepté (démo)', date: now, kind: 'decision' }
          : nextStatus === 'declined'
            ? { id: `demo_quote_decline_${Date.now()}`, label: 'Devis marqué comme refusé (démo)', date: now, kind: 'decision' }
            : nextStatus === 'sent'
              ? { id: `demo_quote_sent_${Date.now()}`, label: 'Devis envoyé au client (démo)', date: now, kind: 'quote' }
              : nextStatus === 'opened'
                ? { id: `demo_quote_opened_${Date.now()}`, label: 'Devis ouvert par le client (démo)', date: now, kind: 'quote' }
                : { id: `demo_quote_draft_${Date.now()}`, label: 'Devis préparé en brouillon (démo)', date: now, kind: 'quote' };

      return {
        ...current,
        status: nextProjectStatus,
        devisAmount: currentAmount,
        quote: nextQuote,
        quoteBuilder: buildCurrentQuoteBuilderPayload(),
        followUp: nextFollowUp,
        lastInteractionAt: now,
        activity: [nextActivityEntry, ...(current.activity || [])],
      };
    }, 'Action simulée - aucun devis réel n’a été envoyé.');
  }

  function markFollowUpDone() {
    const now = new Date().toISOString();
    syncLocalQuoteState((current) => ({
      ...current,
      followUp: {
        ...(current.followUp || { channel: 'phone', reason: 'Relance commerciale', status: 'done', date: now }),
        status: 'done',
        date: now,
      },
      lastInteractionAt: now,
      activity: [
        { id: `demo_followup_done_${Date.now()}`, label: 'Relance commerciale effectuée (démo)', date: now, kind: 'followup' },
        ...(current.activity || []),
      ],
    }), 'Action simulée - relance marquée comme effectuée localement.');
  }

  function planNextFollowUp() {
    const nextDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    syncLocalQuoteState((current) => ({
      ...current,
      followUp: {
        ...(current.followUp || { channel: 'email', reason: 'Suivi commercial', status: 'planned', date: nextDate }),
        status: 'planned',
        date: nextDate,
      },
      callbackDate: nextDate,
      activity: [
        { id: `demo_followup_planned_${Date.now()}`, label: 'Nouvelle relance planifiée (démo)', date: nextDate, kind: 'followup' },
        ...(current.activity || []),
      ],
    }), 'Action simulée - prochaine relance planifiée localement.');
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
  const latestDevis = devisList[0] || null;
  // Moteurs metier prod (src/lib/project-scoring.ts, action-engine.ts,
  // quote-status.ts) branches sur les mocks demo via DevisListItem, qui
  // reprend deja les noms de champs Supabase utilises par la fiche prod
  // (statut, accepted_at, decline_reason...). Seul first_opened_at n'a pas
  // d'equivalent demo direct : mappe depuis last_opened_date.
  const analysis = getProjectCommercialAnalysis({
    status: project.status,
    clientName: project.clientName,
    clientFirstName: project.clientFirstName,
    clientPhone: project.clientPhone,
    clientEmail: project.clientEmail,
    trade: project.trade,
    projectType: project.projectType,
    budget: project.budget,
    desiredTimeline: project.desiredTimeline,
    maturity: project.maturity,
    city: project.city,
    siteAddress: project.siteAddress,
    aiSummary: project.aiSummary,
    tradeAnswers: project.tradeAnswers,
    completenessScore: project.completenessScore,
    photos: project.photos,
    source: project.source,
    latestDevis: latestDevis
      ? {
          sent: latestDevis.sent,
          accepted: latestDevis.accepted,
          declined: latestDevis.declined,
          declineReason: latestDevis.decline_reason,
          opensCount: latestDevis.opens_count,
          lastFollowUpAt: latestDevis.last_follow_up_at,
        }
      : null,
  });
  const verdict = getVerdictDisplay(analysis.temperature, analysis.temperatureLabel);
  const nextAction = computeNextAction({
    status: project.status,
    clientName: project.clientName,
    clientFirstName: project.clientFirstName,
    clientPhone: project.clientPhone,
    clientEmail: project.clientEmail,
    trade: project.trade,
    projectType: project.projectType,
    aiSummary: project.aiSummary,
    tradeAnswers: project.tradeAnswers,
    budget: project.budget,
    desiredTimeline: project.desiredTimeline,
    city: project.city,
    siteAddress: project.siteAddress,
    photos: project.photos,
    completenessScore: project.completenessScore,
    appointment: project.appointment ?? null,
    latestDevis: latestDevis
      ? {
          sent: latestDevis.sent,
          accepted: latestDevis.accepted,
          declined: latestDevis.declined,
          sentAt: latestDevis.quote_sent_at || null,
        }
      : null,
  });
  const decision = getProjectDecisionState(
    { status: project.status },
    latestDevis
      ? {
          sent: latestDevis.sent,
          statut: latestDevis.statut,
          accepted: latestDevis.accepted,
          accepted_at: latestDevis.accepted_at,
          declined: latestDevis.declined,
          declined_at: latestDevis.declined_at,
          decline_reason: latestDevis.decline_reason,
          date_validite: latestDevis.date_validite,
          quote_sent_at: latestDevis.quote_sent_at,
          first_opened_at: latestDevis.last_opened_date,
          last_follow_up_at: latestDevis.last_follow_up_at,
          follow_up_count: latestDevis.follow_up_count,
          follow_up_disabled: latestDevis.follow_up_disabled,
          client_email: project.clientEmail,
        }
      : null,
    nextAction,
  );
  const recommendation = nextAction.description;
  const indicators = getIndicators(project);
  const summary = getStructuredSummary(project);
  const followUpTime = getBestFollowUpTime(project);
  // Statut devis affiche derive de decision.label/decision.state
  // (quote-status.ts) plutot que d une logique locale dupliquee — la prod
  // reste la source de verite sur le cycle de vie du devis.
  const quoteStatusLabel = decision.label;
  const quoteStatusStyle = getQuoteStatusAppearance(decision.state);
  const followUpState = project.followUp || {
    status: 'none',
    date: null,
    channel: 'email',
    reason: 'Aucune relance necessaire',
  };
  const quoteTimeline = [
    { id: 'qualified', label: 'Dossier qualifie', done: true },
    { id: 'draft', label: 'Devis prepare', done: decision.state !== 'no_quote' },
    { id: 'sent', label: 'Devis envoye', done: !!latestDevis?.sent },
    // Pas d equivalent direct dans decision.state (qui ne distingue pas
    // "ouvert" d "envoye") : on garde le signal local d ouverture du devis.
    { id: 'opened', label: 'Devis ouvert par le client', done: !!project.quote?.openedCount },
    {
      id: 'followup',
      label: 'Relance prevue',
      done: followUpState.status === 'planned' || followUpState.status === 'late' || followUpState.status === 'done',
    },
    {
      id: 'decision',
      label: 'Decision client',
      done: ['quote_accepted', 'quote_declined', 'won', 'lost'].includes(decision.state),
    },
  ];
  // Prochaine action commerciale = celle deja calculee par l Action Engine
  // (nextAction.title, expose par decision.primaryActionLabel) plutot qu un
  // mapping local sur le libelle de statut devis.
  const nextCommercialAction = decision.primaryActionLabel;
  const clientLabel = [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || 'Client non renseigne';
  const projectLabel = getProjectHeadline(project);
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
  // Priorite affichee derivee de nextAction.priority (Action Engine) plutot
  // que du score local de completude — le libelle reste identique, seul le
  // signal source change.
  const actionPriority =
    nextAction.priority === 'critical' || nextAction.priority === 'high'
      ? 'Priorite haute'
      : nextAction.priority === 'medium'
        ? 'Priorite moyenne'
        : 'Priorite a qualifier';
  // S il existe un motif bloquant identifie par l Action Engine, on le
  // montre en priorite : c est l information la plus actionnable. Sinon on
  // retombe sur le dernier echange connu (signal local, sans equivalent
  // dans NextAction).
  const actionSummary =
    nextAction.blockingReasons.length > 0
      ? nextAction.blockingReasons[0]
      : followUpTime.lastInteractionDate
        ? `Dernier echange le ${formatShortDate(followUpTime.lastInteractionDate)}`
        : 'Aucun echange date dans la demo';

  // Fiche projet mobile demo — reproduit 1:1 la structure/hierarchie de la
  // branche mobile prod (app/dashboard-v2/projet/[id]/page.tsx), avec des
  // actions demo-safe (pas d appel reel, pas de navigation vers une route
  // devis qui n existe pas en demo).
  if (isMobile) {
    const sourceLabel = getSourceLabel(project.source);
    const projectTitleMobile = getProjectHeadline(project);
    const NEXT_ACTION_CTA_DISABLED_REASON: Partial<Record<string, string>> = {
      request_photos: project.clientEmail || project.clientPhone
        ? undefined
        : 'Aucun email ni téléphone client renseigné',
    };
    const recommendedAction = (() => {
      if (project.status === 'Perdu' || decision.state === 'quote_declined') {
        return {
          title: 'Clôturer le dossier',
          ctaLabel: 'Clôturer le dossier',
          onClick: scrollToQuoteSection,
          meta: latestDevis?.decline_reason || 'Motif de refus à consigner si besoin.',
        };
      }
      if (project.status === 'Gagné' || decision.state === 'quote_accepted') {
        return {
          title: 'Planifier l’intervention chantier',
          ctaLabel: project.appointment ? 'Voir le rendez-vous' : 'Planifier l’intervention',
          onClick: project.appointment ? scrollToQuoteSection : () => setShowRdvModal(true),
          meta: project.appointment
            ? `Rendez-vous prévu le ${formatDateTime(project.appointment.start)}.`
            : 'Le devis est accepté : proposez un créneau d’intervention et préparez le passage en production.',
        };
      }
      const budgetMissing = nextAction.blockingReasons.includes('Budget absent');
      if (!latestDevis && budgetMissing) {
        return {
          title: 'Compléter le budget',
          ctaLabel: 'Contacter le client',
          onClick: scrollToQuoteSection,
          meta: 'Le besoin est identifié, mais le budget manque pour préparer un devis fiable.',
        };
      }
      const appointmentMissing = nextAction.blockingReasons.includes('Rendez-vous non planifié');
      if (!latestDevis && appointmentMissing) {
        return {
          title: 'Planifier un rendez-vous',
          ctaLabel: 'Planifier',
          onClick: () => setShowRdvModal(true),
          meta: 'Un échange ou une visite permettra de verrouiller les derniers éléments avant chiffrage.',
        };
      }
      if (!latestDevis) {
        return {
          title: 'Créer le devis',
          ctaLabel: 'Créer un devis',
          onClick: scrollToQuoteSection,
          meta: 'Le dossier contient assez d’éléments pour préparer une première proposition.',
        };
      }
      if (!latestDevis.sent) {
        return {
          title: 'Finaliser et envoyer le devis',
          ctaLabel: 'Voir le devis',
          onClick: scrollToQuoteSection,
          meta: 'Le devis existe déjà mais attend encore un envoi au client.',
        };
      }
      if (decision.canFollowUpQuote) {
        return {
          title: 'Relancer le devis',
          ctaLabel: 'Relancer le client',
          onClick: () => followUpQuote(latestDevis),
          meta: latestDevis.opens_count > 0
            ? `Le devis a été consulté ${latestDevis.opens_count} fois. Relancez le client pendant que le projet est encore chaud.`
            : 'Le devis a été envoyé. Relancez le client pendant que le projet est encore chaud.',
        };
      }
      if (latestDevis.sent) {
        return {
          title: 'Suivre le devis envoyé',
          ctaLabel: 'Voir le devis',
          onClick: scrollToQuoteSection,
          meta: decision.followUpAvailableAt
            ? `Relance possible à partir du ${formatShortDate(decision.followUpAvailableAt)}.`
            : 'Le devis a été envoyé, gardez la conversation ouverte.',
        };
      }
      return {
        title: 'Clarifier le besoin',
        ctaLabel: 'Appeler le client',
        onClick: () => { if (project.clientPhone) window.location.href = `tel:${project.clientPhone}`; else scrollToQuoteSection(); },
        meta: 'Contactez le prospect pour compléter les informations manquantes et qualifier le dossier.',
      };
    })();
    const commercialTimeline = [
      { id: 'received', label: 'Reçu', done: Boolean(project.createdAt) },
      { id: 'qualified', label: 'Qualifié', done: project.status !== 'Nouveau' },
      { id: 'draft', label: 'Préparé', done: Boolean(latestDevis) },
      { id: 'sent', label: 'Envoyé', done: Boolean(latestDevis?.sent) },
      {
        id: 'followup',
        label: 'Ouvert / relance',
        done: Boolean((latestDevis?.opens_count || 0) > 0 || latestDevis?.last_follow_up_at || decision.canFollowUpQuote),
      },
      {
        id: 'decision',
        label: 'Décision',
        done: Boolean(latestDevis?.accepted || latestDevis?.declined || project.status === 'Gagné' || project.status === 'Perdu'),
      },
      {
        id: 'outcome',
        label: 'Gagné / perdu',
        done: project.status === 'Gagné' || project.status === 'Perdu',
      },
    ];
    const hasContact = Boolean(project.clientPhone || project.clientEmail);
    const devisStatusLabel = !latestDevis
      ? 'Aucun devis'
      : latestDevis.accepted
        ? 'Devis accepté'
        : latestDevis.declined
          ? 'Devis refusé'
          : latestDevis.sent
            ? decision.state === 'quote_followup_available' ? 'Devis à relancer' : 'Devis envoyé'
            : 'Devis en préparation';
    const devisCtaLabel = !latestDevis
      ? 'Créer'
      : latestDevis.sent && !latestDevis.accepted && !latestDevis.declined
        ? decision.canFollowUpQuote ? 'Relancer' : 'Consulter'
        : 'Voir';
    const devisCtaAction = !latestDevis
      ? () => scrollToQuoteSection()
      : latestDevis.sent && !latestDevis.accepted && !latestDevis.declined
        ? decision.canFollowUpQuote
          ? () => followUpQuote(latestDevis)
          : () => scrollToQuoteSection()
        : () => scrollToQuoteSection();

    const mobileAccordions: Array<{ key: string; title: string; content: React.ReactNode }> = [
      {
        key: 'contact',
        title: 'Coordonnées',
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-1)' }}>📞 {project.clientPhone || 'Non renseigné'}</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-1)' }}>✉️ {project.clientEmail || 'Non renseigné'}</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-1)' }}>📍 {project.siteAddress || project.city || 'Non renseignée'}</p>
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
              style={{ marginTop: '4px', alignSelf: 'flex-start', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px' }}
            >
              ✏️ Modifier
            </button>
          </div>
        ),
      },
      {
        key: 'description',
        title: 'Description complète',
        content: (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
            {project.aiSummary || 'Aucune description disponible.'}
          </p>
        ),
      },
      {
        key: 'photos',
        title: 'Photos',
        content: (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)' }}>
            {project.photos && project.photos.length > 0 ? `${project.photos.length} photo(s) jointe(s)` : 'Aucune photo'}
          </p>
        ),
      },
      {
        key: 'analyse',
        title: 'Analyse détaillée',
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-2)' }}>
            <p style={{ margin: 0 }}>Score : {analysis.score}/100 — {analysis.temperatureLabel}</p>
            {analysis.strengths.length > 0 && <p style={{ margin: 0 }}>✓ {analysis.strengths.join(' · ')}</p>}
            {analysis.weaknesses.length > 0 && <p style={{ margin: 0 }}>⚠ {analysis.weaknesses.join(' · ')}</p>}
            {analysis.missingInfo.length > 0 && <p style={{ margin: 0 }}>À compléter : {analysis.missingInfo.join(' · ')}</p>}
          </div>
        ),
      },
      {
        key: 'documents',
        title: 'Documents',
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {devisList.length === 0 && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)' }}>Aucun document</p>}
            {devisList.map((d) => (
              <a
                key={d.id}
                href={d.pdf_url || undefined}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '13px', color: d.pdf_url ? 'var(--accent)' : 'var(--text-3)', pointerEvents: d.pdf_url ? 'auto' : 'none' }}
              >
                📄 Devis {d.numero} — {formatMoney(d.amount)} €
              </a>
            ))}
          </div>
        ),
      },
      {
        key: 'historique',
        title: 'Historique',
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activities.length === 0 && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)' }}>Aucun évènement enregistré</p>}
            {activities.map((a, i) => (
              <p key={a.id || i} style={{ margin: 0, fontSize: '12px', color: 'var(--text-2)' }}>
                {formatShortDate(a.createdAt)} — {a.description}
              </p>
            ))}
          </div>
        ),
      },
    ];

    return (
      <div className="dashboard-shell min-h-screen bg-[var(--bg)] text-[var(--text-1)]" style={{ paddingBottom: '88px' }}>
        {/* Header sticky compact */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <button onClick={() => router.push('/demo-dashboard')} aria-label="Retour" style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', padding: '6px', flexShrink: 0 }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {projectTitleMobile}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {clientLabel} · {project.city || 'Ville non renseignée'} · {sourceLabel}
            </p>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', border: `1px solid ${statusStyles[project.status]?.border || 'var(--border)'}`, color: statusStyles[project.status]?.text || 'var(--text-2)', background: statusStyles[project.status]?.bg || 'transparent' }}>
                {project.status || 'Nouveau'}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                Maturité {nextAction.maturityScore}/100
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', border: '1px solid var(--border)', color: nextAction.priority === 'critical' ? '#dc2626' : nextAction.priority === 'high' ? '#ea580c' : 'var(--text-2)' }}>
                Priorité {nextAction.priority === 'critical' ? 'critique' : nextAction.priority === 'high' ? 'haute' : nextAction.priority === 'medium' ? 'moyenne' : 'basse'}
              </span>
              {nextAction.urgency !== 'none' && (
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', border: '1px solid var(--border)', color: nextAction.urgency === 'overdue' ? '#dc2626' : nextAction.urgency === 'today' ? '#ea580c' : 'var(--text-2)' }}>
                  {nextAction.urgency === 'overdue' ? 'En retard' : nextAction.urgency === 'today' ? "Aujourd'hui" : 'Bientôt'}
                </span>
              )}
            </div>
          </div>
        </div>

        <main style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Carte Action recommandée */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', margin: '0 0 6px' }}>
              Action recommandée
            </p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 4px' }}>{recommendedAction.title}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 8px' }}>{recommendedAction.meta}</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', border: '1px solid var(--border)', color: nextAction.priority === 'critical' ? '#dc2626' : nextAction.priority === 'high' ? '#ea580c' : 'var(--text-2)' }}>
                Priorité {nextAction.priority === 'critical' ? 'critique' : nextAction.priority === 'high' ? 'haute' : nextAction.priority === 'medium' ? 'moyenne' : 'basse'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>~{nextAction.estimatedDuration}</span>
            </div>
            {(() => {
              const ctaActionable = !!recommendedAction.onClick && !NEXT_ACTION_CTA_DISABLED_REASON[nextAction.actionType];
              return (
                <>
                  <button
                    onClick={recommendedAction.onClick}
                    disabled={!ctaActionable}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                      background: ctaActionable ? 'var(--accent)' : 'var(--bg)',
                      color: ctaActionable ? '#fff' : 'var(--text-3)',
                      border: ctaActionable ? 'none' : '1px solid var(--border)',
                      opacity: ctaActionable ? 1 : 0.7,
                    }}
                  >
                      {recommendedAction.ctaLabel}
                  </button>
                  {NEXT_ACTION_CTA_DISABLED_REASON[nextAction.actionType] && (
                    <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '6px 0 0' }}>
                      {NEXT_ACTION_CTA_DISABLED_REASON[nextAction.actionType]}
                    </p>
                  )}
                </>
              );
            })()}
          </div>

          {/* Résumé IA court */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', fontSize: '13px', color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>Résumé</p>
            <p style={{ margin: 0 }}>Besoin : {project.projectType || project.trade || 'Non renseigné'}</p>
            <p style={{ margin: 0 }}>Urgence : {project.desiredTimeline || 'Non renseignée'}</p>
            <p style={{ margin: 0 }}>Budget : {project.budget || 'Non renseigné'}</p>
            <p style={{ margin: 0 }}>Localisation : {project.siteAddress || project.city || 'Non renseignée'}</p>
            <p style={{ margin: 0 }}>Devis : {devisStatusLabel}{latestDevis?.amount ? ` (${formatMoney(latestDevis.amount)} €)` : ''}</p>
            <p style={{ margin: 0 }}>RDV : {project.appointment ? formatDateTime(project.appointment.start) : 'Non planifié'}</p>
          </div>

          {/* Avancement commercial */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', overflow: 'hidden' }}>
            <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>Avancement</p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2px', overflowX: 'hidden' }}>
              {commercialTimeline.map((step, idx) => {
                const isCurrent = !step.done && commercialTimeline.slice(0, idx).every((s) => s.done);
                const color = step.done ? 'var(--accent)' : isCurrent ? '#ea580c' : 'var(--text-3)';
                return (
                  <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      {idx > 0 && <div style={{ flex: 1, height: '2px', background: step.done ? 'var(--accent)' : 'var(--border)' }} />}
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                        background: step.done ? 'var(--accent)' : 'var(--bg)',
                        border: `2px solid ${color}`,
                      }} />
                      {idx < commercialTimeline.length - 1 && <div style={{ flex: 1, height: '2px', background: step.done ? 'var(--accent)' : 'var(--border)' }} />}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '9px', textAlign: 'center', color, lineHeight: 1.2, wordBreak: 'break-word' }}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Blocages */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
            {nextAction.blockingReasons.length > 0 ? (
              <>
                <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 700, color: '#ea580c' }}>⚠ À compléter</p>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-2)' }}>
                  {nextAction.blockingReasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>✓ Dossier exploitable</p>
            )}
          </div>

          {/* Actions rapides */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { label: '📞 Appeler', disabled: !project.clientPhone, onClick: () => { if (project.clientPhone) window.location.href = `tel:${project.clientPhone}`; } },
              { label: '✉️ Message', disabled: !project.clientEmail, onClick: () => { if (project.clientEmail) window.location.href = `mailto:${project.clientEmail}`; } },
              { label: '📅 RDV', disabled: !!project.appointment, onClick: () => { if (!project.appointment) setShowRdvModal(true); } },
              { label: '📄 Devis', disabled: false, onClick: devisCtaAction },
              decision.canFollowUpQuote
                ? { label: '🔁 Relancer', disabled: false, onClick: () => latestDevis && followUpQuote(latestDevis) }
                : { label: '📞 Contacter', disabled: !latestDevis && !project.clientPhone, onClick: () => { if (project.clientPhone) window.location.href = `tel:${project.clientPhone}`; else scrollToQuoteSection(); } },
            ].map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                disabled={a.disabled}
                style={{
                  padding: '12px 6px', borderRadius: '12px', border: '1px solid var(--border)',
                  background: 'var(--bg-elevated)', color: a.disabled ? 'var(--text-3)' : 'var(--text-1)',
                  fontSize: '12px', fontWeight: 600, opacity: a.disabled ? 0.5 : 1,
                }}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Rendez-vous */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>Rendez-vous</p>
            {project.appointment ? (
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{formatDateTime(project.appointment.start)}</p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--accent)' }}>✓ Rendez-vous programmé</p>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-2)' }}>Aucun rendez-vous</p>
                <button onClick={() => setShowRdvModal(true)} style={{ background: 'var(--accent)', border: 'none', color: '#fff', fontWeight: 600, borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}>
                  Planifier
                </button>
              </div>
            )}
          </div>

          {/* Devis */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>Devis</p>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-1)', fontWeight: 600 }}>{devisStatusLabel}</p>
            {latestDevis && <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-2)' }}>{formatMoney(latestDevis.amount)} €</p>}
            <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'var(--text-3)' }}>
              {!latestDevis
                ? 'Aucune proposition envoyée pour le moment.'
                : latestDevis.accepted
                  ? `Accepté le ${formatShortDate(latestDevis.accepted_at)}`
                  : latestDevis.declined
                    ? `Refusé le ${formatShortDate(latestDevis.declined_at)}`
                    : latestDevis.sent
                      ? `Envoyé le ${formatShortDate(latestDevis.quote_sent_at)}${latestDevis.opens_count ? ` · Ouvert ${latestDevis.opens_count} fois` : ''}`
                      : 'Devis brouillon, pas encore envoyé.'}
            </p>
            <p style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--text-3)' }}>
              {!latestDevis
                ? 'Prochaine action : créer le devis.'
                : latestDevis.accepted
                  ? 'Prochaine action : planifier la suite du chantier.'
                  : latestDevis.declined
                    ? 'Prochaine action : clôturer ou clarifier le besoin.'
                    : latestDevis.sent
                      ? `Prochaine action : ${decision.canFollowUpQuote ? 'relancer le client' : 'attendre la réponse'}.`
                      : 'Prochaine action : finaliser et envoyer le devis.'}
            </p>
            <button onClick={devisCtaAction} style={{ background: 'var(--accent)', border: 'none', color: '#fff', fontWeight: 600, borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}>
              {devisCtaLabel}
            </button>
          </div>

          {/* Détails secondaires en accordéons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mobileAccordions.map((section) => {
              const open = openMobileSections.has(section.key);
              return (
                <div key={section.key} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <button
                    onClick={() => toggleMobileSection(section.key)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'transparent', border: 'none', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}
                  >
                    {section.title}
                    <ChevronDown style={{ width: '16px', height: '16px', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }} />
                  </button>
                  {open && <div style={{ padding: '0 14px 14px' }}>{section.content}</div>}
                </div>
              );
            })}
          </div>
        </main>

        {/* Bottom action bar sticky */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
          background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)',
          padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
        }}>
          <button
            disabled={!project.clientPhone}
            onClick={() => { if (project.clientPhone) window.location.href = `tel:${project.clientPhone}`; }}
            style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: project.clientPhone ? 'var(--text-1)' : 'var(--text-3)', fontSize: '13px', fontWeight: 700, opacity: project.clientPhone ? 1 : 0.5 }}
          >
            📞 Appeler
          </button>
          <button
            disabled={!!project.appointment}
            onClick={() => { if (!project.appointment) setShowRdvModal(true); }}
            style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: project.appointment ? 'var(--text-3)' : 'var(--text-1)', fontSize: '13px', fontWeight: 700, opacity: project.appointment ? 0.5 : 1 }}
          >
            📅 RDV
          </button>
          <button
            onClick={devisCtaAction}
            style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 700 }}
          >
            📄 Devis
          </button>
        </div>

        {showRdvModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[var(--text-1)] font-bold text-lg">📅 Planifier un rendez-vous</h2>
                <button
                  onClick={() => setShowRdvModal(false)}
                  className="text-[var(--text-2)] hover:text-[var(--text-1)]"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-2)] uppercase tracking-wide mb-1">Titre</label>
                <input
                  type="text"
                  value={rdvData.title}
                  onChange={(e) => setRdvData({ ...rdvData, title: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-1)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-2)] uppercase tracking-wide mb-1">Date</label>
                <input
                  type="date"
                  value={rdvData.date}
                  onChange={(e) => setRdvData({ ...rdvData, date: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-1)]"
                />
              </div>

              <button
                onClick={handleRdvSave}
                disabled={savingRdv || !rdvData.title || !rdvData.date}
                className="w-full bg-[var(--accent)] text-black font-bold rounded-lg px-4 py-2 disabled:opacity-50"
              >
                {savingRdv ? 'Enregistrement...' : 'Enregistrer le RDV'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

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
              setFollowUpToast({ type: 'success', message: 'Action simulée - aucun PDF réel n’a été généré.' });
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

        <section
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '18px',
            padding: isMobile ? '18px 16px' : '22px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', marginBottom: '18px' }}>
            <div>
              <p style={{ margin: '0 0 6px', color: 'var(--accent)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Construction du devis
              </p>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Base modifiable avant envoi</h2>
              <p style={{ margin: '8px 0 0', color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6 }}>
                Mode demo - tous les boutons ci-dessous sont simulés localement. Aucun devis réel, email ou PDF officiel n&apos;est envoyé.
              </p>
            </div>
            <span
              style={{
                background: 'rgba(34,197,94,0.12)',
                color: 'var(--accent)',
                border: '1px solid rgba(34,197,94,0.24)',
                borderRadius: '999px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              Demo
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '12px' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Statut devis</p>
                  <p style={{ margin: '6px 0 0', fontSize: '20px', fontWeight: 800 }}>{quoteStatusLabel}</p>
                </div>
                <span
                  style={{
                    background: quoteStatusStyle.bg,
                    color: quoteStatusStyle.text,
                    border: `1px solid ${quoteStatusStyle.border}`,
                    borderRadius: '999px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {quoteStatusLabel}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Montant</p>
                  <p style={{ margin: '6px 0 0', fontSize: '18px', fontWeight: 700 }}>
                    {latestDevis ? `${formatMoney(latestDevis.amount)} €` : 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Date d&apos;envoi</p>
                  <p style={{ margin: '6px 0 0', fontSize: '14px', fontWeight: 600 }}>
                    {latestDevis?.quote_sent_at ? formatMediumDate(latestDevis.quote_sent_at) : 'Pas encore envoyé'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Dernière ouverture</p>
                  <p style={{ margin: '6px 0 0', fontSize: '14px', fontWeight: 600 }}>
                    {latestDevis?.last_opened_date ? formatMediumDate(latestDevis.last_opened_date) : 'Aucune ouverture'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Ouvertures</p>
                  <p style={{ margin: '6px 0 0', fontSize: '14px', fontWeight: 600 }}>
                    {latestDevis?.opens_count || 0} fois
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Validité</p>
                  <p style={{ margin: '6px 0 0', fontSize: '14px', fontWeight: 600 }}>
                    {latestDevis?.date_validite ? formatMediumDate(latestDevis.date_validite) : '30 jours'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Prochaine action</p>
                  <p style={{ margin: '6px 0 0', fontSize: '14px', fontWeight: 600 }}>{nextCommercialAction}</p>
                </div>
              </div>

              {latestDevis?.decline_reason && (
                <div style={{ borderRadius: '12px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)', padding: '12px 14px' }}>
                  <p style={{ margin: 0, color: '#fca5a5', fontSize: '12px', fontWeight: 700 }}>Motif de refus</p>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6 }}>
                    {latestDevis.decline_reason}
                  </p>
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' }}>
              <p style={{ margin: '0 0 12px', color: 'var(--text-3)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Relance commerciale
              </p>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Statut</p>
                  <p style={{ margin: '6px 0 0', fontSize: '16px', fontWeight: 700 }}>
                    {followUpState.status === 'late'
                      ? 'Relance en retard'
                      : followUpState.status === 'today'
                        ? 'Relance aujourd hui'
                        : followUpState.status === 'planned'
                          ? 'Relance a venir'
                          : followUpState.status === 'done'
                            ? 'Relance effectuee'
                            : 'Aucune relance'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Date</p>
                  <p style={{ margin: '6px 0 0', fontSize: '14px', fontWeight: 600 }}>
                    {followUpState.date ? formatDateTime(followUpState.date) : 'Non planifiée'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Canal conseillé</p>
                  <p style={{ margin: '6px 0 0', fontSize: '14px', fontWeight: 600 }}>
                    {followUpState.channel === 'phone' ? 'Appel' : 'Email'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Raison</p>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                    {followUpState.reason}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Base du devis
                  </p>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: '13px' }}>
                    Champs pre-remplis et modifiables localement.
                  </p>
                </div>
                <span style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700 }}>
                  {quoteSummary.enabledLines.length} ligne{quoteSummary.enabledLines.length > 1 ? 's' : ''} active{quoteSummary.enabledLines.length > 1 ? 's' : ''}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                {[
                  { label: 'Numero devis', value: quoteBuilderForm.quoteNumber, key: 'quoteNumber' as const, type: 'text' },
                  { label: 'Client', value: quoteBuilderForm.clientName, key: 'clientName' as const, type: 'text' },
                  { label: 'Projet', value: quoteBuilderForm.projectTitle, key: 'projectTitle' as const, type: 'text' },
                  { label: 'Adresse chantier', value: quoteBuilderForm.siteAddress, key: 'siteAddress' as const, type: 'text' },
                ].map((field) => (
                  <label key={field.key} style={{ display: 'grid', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{field.label}</span>
                    <input
                      type={field.type}
                      value={field.value}
                      onChange={(event) => updateQuoteBuilderField(field.key, event.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: 'var(--text-1)',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </label>
                ))}

                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Validite (jours)</span>
                  <input
                    type="number"
                    min={1}
                    value={quoteBuilderForm.validityDays}
                    onChange={(event) => updateQuoteBuilderField('validityDays', Number(event.target.value || 0))}
                    style={{
                      width: '100%',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--text-1)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>TVA par defaut (%)</span>
                  <input
                    type="number"
                    min={0}
                    value={quoteBuilderForm.defaultVat}
                    onChange={(event) => updateQuoteBuilderField('defaultVat', Number(event.target.value || 0))}
                    style={{
                      width: '100%',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--text-1)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Acompte conseille (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={quoteBuilderForm.depositPercent}
                    onChange={(event) => updateQuoteBuilderField('depositPercent', Number(event.target.value || 0))}
                    style={{
                      width: '100%',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--text-1)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '6px', gridColumn: isMobile ? undefined : '1 / -1' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Conditions de paiement</span>
                  <textarea
                    value={quoteBuilderForm.paymentTerms}
                    onChange={(event) => updateQuoteBuilderField('paymentTerms', event.target.value)}
                    rows={2}
                    style={{
                      width: '100%',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--text-1)',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </label>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(180deg, rgba(34,197,94,0.12), rgba(34,197,94,0.03))', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '16px', padding: '18px', display: 'grid', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Resume financier
                </p>
                <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: '13px' }}>
                  Recalcul local en direct selon les lignes actives.
                </p>
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  ['Total HT', `${formatMoney(quoteSummary.totalHt)} EUR`],
                  ['TVA', `${formatMoney(quoteSummary.totalVat)} EUR`],
                  ['Acompte', `${formatMoney(quoteSummary.depositAmount)} EUR`],
                  ['Solde estime', `${formatMoney(quoteSummary.balanceAmount)} EUR`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-3)' }}>{label}</span>
                    <strong style={{ color: 'var(--text-1)' }}>{value}</strong>
                  </div>
                ))}
              </div>
              <div style={{ borderRadius: '14px', background: 'rgba(9,15,13,0.55)', border: '1px solid rgba(34,197,94,0.22)', padding: '14px 16px' }}>
                <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Total TTC</p>
                <p style={{ margin: '6px 0 0', color: 'var(--text-1)', fontSize: '30px', fontWeight: 800 }}>
                  {formatMoney(quoteSummary.totalTtc)} EUR
                </p>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Lignes proposees
                </p>
                <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: '13px' }}>
                  Libelles, quantites, unites, prix HT et TVA restent modifiables localement.
                </p>
              </div>
              <button type="button" onClick={addQuoteBuilderLine} style={demoActionButtonStyle('secondary')}>
                <Plus size={14} />
                Ajouter une ligne
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {quoteBuilderLines.map((line, index) => (
                <div key={line.id} style={{ border: line.enabled === false ? '1px dashed var(--border)' : '1px solid var(--border)', borderRadius: '14px', padding: '14px', background: line.enabled === false ? 'rgba(24,24,27,0.4)' : 'var(--bg-elevated)', opacity: line.enabled === false ? 0.65 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 700 }}>Ligne {index + 1}</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => toggleQuoteBuilderLine(line.id)} style={demoActionButtonStyle('secondary')}>
                        {line.enabled === false ? 'Reactiver' : 'Desactiver'}
                      </button>
                      {quoteBuilderLines.length > 1 && (
                        <button type="button" onClick={() => removeQuoteBuilderLine(line.id)} style={demoActionButtonStyle('danger')}>
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 2fr) repeat(4, minmax(0, 1fr))', gap: '10px' }}>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Libelle</span>
                      <input
                        type="text"
                        value={line.label}
                        onChange={(event) => updateQuoteBuilderLine(line.id, 'label', event.target.value)}
                        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)', fontSize: '14px', outline: 'none' }}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Quantite</span>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={line.quantity}
                        onChange={(event) => updateQuoteBuilderLine(line.id, 'quantity', Number(event.target.value || 0))}
                        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)', fontSize: '14px', outline: 'none' }}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Unite</span>
                      <input
                        type="text"
                        value={line.unit}
                        onChange={(event) => updateQuoteBuilderLine(line.id, 'unit', event.target.value)}
                        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)', fontSize: '14px', outline: 'none' }}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Prix HT</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPriceHt}
                        onChange={(event) => updateQuoteBuilderLine(line.id, 'unitPriceHt', Number(event.target.value || 0))}
                        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)', fontSize: '14px', outline: 'none' }}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>TVA (%)</span>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={line.vatRate}
                        onChange={(event) => updateQuoteBuilderLine(line.id, 'vatRate', Number(event.target.value || 0))}
                        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)', fontSize: '14px', outline: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' }}>
              <p style={{ margin: '0 0 10px', color: 'var(--text-3)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Note client
              </p>
              <textarea
                value={quoteBuilderForm.clientNote}
                onChange={(event) => updateQuoteBuilderField('clientNote', event.target.value)}
                rows={5}
                style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', color: 'var(--text-1)', fontSize: '14px', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' }}>
              <p style={{ margin: '0 0 14px', color: 'var(--text-3)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Actions devis
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                <button type="button" onClick={() => updateDemoQuoteStatus('draft', 'Brouillon simule - aucune donnee reelle modifiee.')} style={demoActionButtonStyle('secondary')}>
                  Enregistrer le brouillon
                </button>
                <button type="button" onClick={() => updateDemoQuoteStatus('sent', 'Envoi simule - aucun email reel envoye.')} style={demoActionButtonStyle('primary')}>
                  Simuler l envoi au client
                </button>
                <button type="button" onClick={openDemoPdfPreview} style={demoActionButtonStyle('secondary')}>
                  Exporter PDF fictif
                </button>
                <button type="button" onClick={() => updateDemoQuoteStatus('accepted', 'Acceptation simulee - aucune donnee reelle modifiee.')} style={demoActionButtonStyle('success')}>
                  Marquer comme accepte
                </button>
                <button type="button" onClick={() => updateDemoQuoteStatus('declined', 'Refus simule - aucune donnee reelle modifiee.')} style={demoActionButtonStyle('danger')}>
                  Marquer comme refuse
                </button>
                <button type="button" onClick={() => latestDevis && followUpQuote(latestDevis)} disabled={!latestDevis || !decision.canFollowUpQuote} style={demoActionButtonStyle('primary', !latestDevis || !decision.canFollowUpQuote)}>
                  Relancer le client
                </button>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
            <p style={{ margin: '0 0 14px', color: 'var(--text-3)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Timeline devis
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(6, minmax(0, 1fr))', gap: '12px' }}>
              {quoteTimeline.map((step, index) => (
                <div key={step.id} style={{ display: 'flex', gap: '10px', alignItems: isMobile ? 'flex-start' : 'center' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '999px',
                      flexShrink: 0,
                      background: step.done ? 'rgba(34,197,94,0.16)' : 'var(--bg-hover)',
                      color: step.done ? 'var(--accent)' : 'var(--text-3)',
                      border: step.done ? '1px solid rgba(34,197,94,0.28)' : '1px solid var(--border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    {step.done ? '✓' : index + 1}
                  </div>
                  <span style={{ fontSize: '13px', color: step.done ? 'var(--text-1)' : 'var(--text-2)', lineHeight: 1.5 }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: '16px' }}>
            <div ref={quoteSectionRef} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' }}>
              <p style={{ margin: '0 0 14px', color: 'var(--text-3)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Actions devis simulées
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                <button type="button" onClick={() => updateDemoQuoteStatus('draft')} style={demoActionButtonStyle('secondary')}>
                  Préparer un devis
                </button>
                <button type="button" onClick={() => updateDemoQuoteStatus('draft')} style={demoActionButtonStyle('secondary')}>
                  Modifier le devis
                </button>
                <button type="button" onClick={() => updateDemoQuoteStatus('sent')} style={demoActionButtonStyle('primary')}>
                  Envoyer le devis
                </button>
                <button type="button" onClick={() => latestDevis && followUpQuote(latestDevis)} disabled={!latestDevis || !decision.canFollowUpQuote} style={demoActionButtonStyle('primary', !latestDevis || !decision.canFollowUpQuote)}>
                  Relancer le client
                </button>
                <button type="button" onClick={() => setFollowUpToast({ type: 'success', message: 'Action simulée - aucun PDF réel n’a été généré.' })} style={demoActionButtonStyle('secondary')}>
                  Exporter PDF
                </button>
                <button type="button" onClick={() => updateDemoQuoteStatus('accepted')} style={demoActionButtonStyle('success')}>
                  Marquer comme accepté
                </button>
                <button type="button" onClick={() => updateDemoQuoteStatus('declined')} style={demoActionButtonStyle('danger')}>
                  Marquer comme refusé
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' }}>
              <p style={{ margin: '0 0 14px', color: 'var(--text-3)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Suivi commercial
              </p>
              <div style={{ display: 'grid', gap: '10px' }}>
                {(project.activity || []).slice(0, 5).map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{item.label}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-3)' }}>{formatDateTime(item.date)}</p>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase' }}>{item.kind}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={markFollowUpDone} style={demoActionButtonStyle('secondary')}>
                  Relance effectuée
                </button>
                <button type="button" onClick={planNextFollowUp} style={demoActionButtonStyle('secondary')}>
                  Planifier une relance
                </button>
              </div>
            </div>
          </div>
        </section>

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
                color: nextAction.priority === 'critical' || nextAction.priority === 'high' ? 'var(--accent)' : nextAction.priority === 'medium' ? '#f59e0b' : 'var(--text-2)',
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
                  updateDemoQuoteStatus('draft');
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

function buildFallbackQuoteBuilder(project: any): DemoQuoteBuilder {
  const clientName = [project?.clientFirstName, project?.clientName].filter(Boolean).join(' ') || 'Client demo';
  const cityLabel = [project?.postalCode, project?.city].filter(Boolean).join(' ');

  return {
    quoteNumber: project?.projectNumber?.replace('DEV-', 'DEVIS-') || `DEVIS-${project?.id || 'DEMO'}`,
    clientName,
    projectTitle: project?.projectType || project?.trade || 'Projet',
    siteAddress: [project?.siteAddress, cityLabel].filter(Boolean).join(', ') || 'Adresse chantier non renseignee',
    validityDays: 30,
    defaultVat: 20,
    depositPercent: 30,
    paymentTerms: 'Acompte a la validation, solde a la reception des travaux.',
    clientNote:
      'Ce devis est etabli sur la base des informations transmises. Une visite technique peut etre necessaire avant validation definitive.',
    lines: [
      {
        id: `fallback_${project?.id || 'demo'}_001`,
        label: project?.trade ? `Intervention ${project.trade.toLowerCase()}` : 'Prestation principale',
        quantity: 1,
        unit: 'forfait',
        unitPriceHt: Number(project?.quote?.amount || project?.devisAmount || 850),
        vatRate: 20,
        enabled: true,
      },
    ],
  };
}

function normalizeQuoteBuilder(project: any): DemoQuoteBuilder {
  const fallback = buildFallbackQuoteBuilder(project);
  const builder = project?.quoteBuilder;

  return {
    ...fallback,
    ...builder,
    lines:
      builder?.lines?.length
        ? builder.lines.map((line: DemoQuoteBuilderLine) => ({
            ...line,
            enabled: line.enabled !== false,
          }))
        : fallback.lines,
  };
}

function computeQuoteBuilderSummary(lines: DemoQuoteBuilderLine[], depositPercent: number) {
  const enabledLines = lines.filter((line) => line.enabled !== false);
  const totalHt = enabledLines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPriceHt || 0), 0);
  const totalVat = enabledLines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPriceHt || 0) * (Number(line.vatRate || 0) / 100),
    0
  );
  const totalTtc = totalHt + totalVat;
  const depositAmount = totalTtc * (Number(depositPercent || 0) / 100);
  const balanceAmount = totalTtc - depositAmount;

  return {
    enabledLines,
    totalHt,
    totalVat,
    totalTtc,
    depositAmount,
    balanceAmount,
  };
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

