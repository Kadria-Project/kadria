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
import { getBestFollowUpTime, getIdealActionLabel, shouldShowIdealFollowUp } from '@/src/lib/commercial-actions';
import { useDemoMode } from '@/src/contexts/DemoModeContext';
import type { DemoQuoteBuilder, DemoQuoteBuilderLine } from '@/src/lib/demo-data';
import { buildDemoDevisList as buildDemoDevisListFromData, normalizeQuoteBuilder, computeQuoteBuilderSummary } from '@/src/lib/demo-data';
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

// Catalogue statique pour le bloc "Suggestions de lignes de devis" en démo —
// version allégée du moteur prod (src/lib/quote-suggestions.ts), qui dépend
// de profils métier/référentiel Supabase non disponibles ici. Lecture seule :
// le clic affiche un toast simulé, aucune ligne n'est ajoutée à un devis réel.
const DEMO_QUOTE_SUGGESTIONS_CATALOG: { id: string; label: string; unitPriceHt: number }[] = [
  { id: 'demo_suggestion_depose', label: 'Dépose des équipements existants', unitPriceHt: 420 },
  { id: 'demo_suggestion_fourniture', label: 'Fourniture du matériel principal', unitPriceHt: 1850 },
  { id: 'demo_suggestion_pose', label: 'Pose et raccordements', unitPriceHt: 980 },
  { id: 'demo_suggestion_finitions', label: 'Finitions et nettoyage de chantier', unitPriceHt: 260 },
  { id: 'demo_suggestion_mise_en_service', label: 'Mise en service et contrôle', unitPriceHt: 150 },
];

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

// Confirmation avant clôture commerciale (gagné/perdu), alignée sur
// app/dashboard-v2/projet/[id]/page.tsx — aucune action sensible n'est
// déclenchée sans passer par cette boîte de dialogue.
type CommercialClosureStatus = 'Gagné' | 'Perdu';

type CommercialClosureConfirmState = {
  status: CommercialClosureStatus;
  title: string;
  description: string;
  confirmLabel: string;
};

function getCommercialClosureConfirmState(status: CommercialClosureStatus): CommercialClosureConfirmState {
  if (status === 'Gagné') {
    return {
      status,
      title: 'Confirmer le dossier gagné',
      description: 'Le dossier sera marqué comme gagné et sortira du suivi commercial en cours.',
      confirmLabel: 'Marquer gagné',
    };
  }

  return {
    status,
    title: 'Confirmer le dossier perdu',
    description: 'Le dossier sera clôturé comme perdu et sortira du suivi commercial en cours.',
    confirmLabel: 'Marquer perdu',
  };
}

// "Activité du dossier" (aligné sur app/dashboard-v2/projet/[id]/page.tsx) :
// reprend telle quelle la présentation prod des évènements (titre + détail +
// ton + badge), appliquée ici aux activités mockées de la démo
// (buildDemoActivities). Aucun appel réseau, aucune donnée réelle.
type ActivityTone = 'success' | 'error' | 'info';

interface ActivityFeedItem {
  id: string;
  action?: string;
  createdAt?: string | null;
  title: string;
  detail?: string | null;
  tone: ActivityTone;
}

function sanitizeActivityDetail(detail?: string | null, tone: ActivityTone = 'info') {
  const normalized = String(detail || '').trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  const looksTechnical = lower.includes('provider_message_id')
    || lower.includes('stack')
    || lower.includes('trace')
    || lower.includes('resend')
    || lower.includes('smtp')
    || normalized.includes('{')
    || normalized.includes('[');

  if (looksTechnical) {
    return tone === 'error' ? "Echec de l'envoi. Reessayez." : null;
  }

  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
}

function getActivityPresentation(activity: { action?: string; description?: string; createdAt?: string | null; id?: string }, index: number): ActivityFeedItem {
  const action = String(activity.action || '').trim();
  const description = String(activity.description || '').trim();

  if (action === 'DEVIS_FOLLOW_UP_SENT') {
    return {
      id: activity.id || `activity-item-${index}`,
      action,
      createdAt: activity.createdAt,
      title: 'Relance devis envoyee',
      detail: sanitizeActivityDetail(description, 'success'),
      tone: 'success',
    };
  }

  if (action === 'DEVIS_FOLLOW_UP_FAILED') {
    return {
      id: activity.id || `activity-item-${index}`,
      action,
      createdAt: activity.createdAt,
      title: 'Echec de la relance devis',
      detail: sanitizeActivityDetail(description, 'error') || "Echec de l'envoi. Reessayez.",
      tone: 'error',
    };
  }

  if (action === 'GOOGLE_REVIEW_REQUEST_SENT') {
    return {
      id: activity.id || `activity-item-${index}`,
      action,
      createdAt: activity.createdAt,
      title: "Demande d'avis Google envoyee",
      detail: sanitizeActivityDetail(description, 'success'),
      tone: 'success',
    };
  }

  if (action === 'GOOGLE_REVIEW_REQUEST_FAILED') {
    return {
      id: activity.id || `activity-item-${index}`,
      action,
      createdAt: activity.createdAt,
      title: "Echec de la demande d'avis Google",
      detail: sanitizeActivityDetail(description, 'error') || "Echec de l'envoi. Reessayez.",
      tone: 'error',
    };
  }

  if (action === 'CLIENT_INFO_UPDATED') {
    return {
      id: activity.id || `activity-item-${index}`,
      action,
      createdAt: activity.createdAt,
      title: 'Informations complétées par le client',
      detail: sanitizeActivityDetail(description, 'info')
        || 'Le client a complété des informations depuis le portail client. Source : Portail client.',
      tone: 'info',
    };
  }

  if (action === 'CREATED') {
    return {
      id: activity.id || `activity-item-${index}`,
      action,
      createdAt: activity.createdAt,
      title: 'Dossier cree',
      detail: sanitizeActivityDetail(description, 'info'),
      tone: 'info',
    };
  }

  if (action.includes('STATUS')) {
    return {
      id: activity.id || `activity-item-${index}`,
      action,
      createdAt: activity.createdAt,
      title: 'Statut du dossier mis a jour',
      detail: sanitizeActivityDetail(description, 'info'),
      tone: 'info',
    };
  }

  if (action.includes('CALLBACK')) {
    return {
      id: activity.id || `activity-item-${index}`,
      action,
      createdAt: activity.createdAt,
      title: 'Rappel client programme',
      detail: sanitizeActivityDetail(description, 'info'),
      tone: 'info',
    };
  }

  if (action.includes('NOTE')) {
    return {
      id: activity.id || `activity-item-${index}`,
      action,
      createdAt: activity.createdAt,
      title: 'Note interne mise a jour',
      detail: sanitizeActivityDetail(description, 'info'),
      tone: 'info',
    };
  }

  if (action === 'DEVIS') {
    return {
      id: activity.id || `activity-item-${index}`,
      action,
      createdAt: activity.createdAt,
      title: 'Mouvement sur le devis',
      detail: sanitizeActivityDetail(description, 'info'),
      tone: 'info',
    };
  }

  if (action === 'ACOMPTE_PAYMENT_LINK_CREATED' || action === 'ACOMPTE_REQUESTED') {
    return {
      id: activity.id || `activity-item-${index}`,
      action,
      createdAt: activity.createdAt,
      title: "Lien d'acompte cree",
      detail: sanitizeActivityDetail(description, 'success'),
      tone: 'success',
    };
  }

  if (action === 'ACOMPTE_PAID') {
    return {
      id: activity.id || `activity-item-${index}`,
      action,
      createdAt: activity.createdAt,
      title: 'Acompte paye',
      detail: sanitizeActivityDetail(description, 'success'),
      tone: 'success',
    };
  }

  return {
    id: activity.id || `activity-item-${index}`,
    action,
    createdAt: activity.createdAt,
    title: description || 'Action enregistree',
    detail: description && description !== 'Action enregistree' ? sanitizeActivityDetail(description, 'info') : null,
    tone: 'info',
  };
}

function getActivityToneStyles(tone: ActivityTone) {
  if (tone === 'success') {
    return {
      dotBg: 'rgba(34, 197, 94, 0.16)',
      dotColor: 'rgb(74, 222, 128)',
      badgeBg: 'rgba(34, 197, 94, 0.14)',
      badgeBorder: 'rgba(34, 197, 94, 0.22)',
      badgeColor: 'rgb(134, 239, 172)',
      badgeLabel: 'Succes',
    };
  }

  if (tone === 'error') {
    return {
      dotBg: 'rgba(248, 113, 113, 0.16)',
      dotColor: 'rgb(248, 113, 113)',
      badgeBg: 'rgba(248, 113, 113, 0.12)',
      badgeBorder: 'rgba(248, 113, 113, 0.24)',
      badgeColor: 'rgb(252, 165, 165)',
      badgeLabel: 'Echec',
    };
  }

  return {
    dotBg: 'rgba(148, 163, 184, 0.14)',
    dotColor: 'rgb(203, 213, 225)',
    badgeBg: 'rgba(148, 163, 184, 0.08)',
    badgeBorder: 'rgba(148, 163, 184, 0.18)',
    badgeColor: 'rgb(203, 213, 225)',
    badgeLabel: 'Info',
  };
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
  return buildDemoDevisListFromData(project) as DevisListItem[];
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
    clientEvents,
    addClientEvent,
  } = useDemoMode();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [commercialClosureConfirm, setCommercialClosureConfirm] = useState<CommercialClosureConfirmState | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [callbackDate, setCallbackDate] = useState('');
  const [showCallback, setShowCallback] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const quoteSectionRef = useRef<HTMLDivElement>(null);
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
  // Amplitude du rendez-vous — reprend le vocabulaire/les options de la
  // prod (app/dashboard-v2/projet/[id]/page.tsx : appointmentAmplitude,
  // customDurationMin, halfDayPeriod), en version 100% simulée : aucun appel
  // Google Calendar, juste un ajout local à DemoModeContext.
  const [eventAmplitude, setEventAmplitude] = useState<'custom' | 'half_day' | 'full_day'>('custom');
  const [eventDurationMin, setEventDurationMin] = useState(60);
  const [eventHalfDayPeriod, setEventHalfDayPeriod] = useState<'morning' | 'afternoon'>('morning');

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
  const [artisanReplyText, setArtisanReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyToast, setReplyToast] = useState<string | null>(null);
  const [copyPortalToast, setCopyPortalToast] = useState<string | null>(null);
  const [showRetoursClient, setShowRetoursClient] = useState(false);
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

  function requestCommercialClosure(status: 'Gagné' | 'Perdu') {
    setCommercialClosureConfirm(getCommercialClosureConfirmState(status));
  }

  async function confirmCommercialClosure() {
    if (!commercialClosureConfirm) return;
    const nextStatus = commercialClosureConfirm.status;
    setCommercialClosureConfirm(null);
    await updateStatus(nextStatus);
    setFollowUpToast({
      type: 'success',
      message: nextStatus === 'Gagné'
        ? 'Action simulée dans la démo : dossier marqué gagné.'
        : 'Action simulée dans la démo : dossier marqué perdu.',
    });
  }

  // Avis Google — action purement simulée : jamais d'appel API Google, pas
  // d'email/SMS réel. Ne devient pertinente qu'une fois le dossier
  // Gagné/en réalisation (cf. isGoogleReviewEligibleStatus plus bas).
  function requestGoogleReview() {
    const now = new Date().toISOString();
    setProject((current: any) => (current
      ? {
          ...current,
          activity: [
            { id: `demo_review_request_${Date.now()}`, label: 'Demande d’avis Google envoyée (démo)', date: now, kind: 'decision' },
            ...(current.activity || []),
          ],
        }
      : current));
    setFollowUpToast({ type: 'success', message: 'Demande d’avis simulée dans la démo. En production, un email/SMS serait envoyé au client avec votre lien Google.' });
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

  // Libellé d'amplitude affiché dans les notes de l'événement simulé —
  // mêmes options que la prod (Durée personnalisée / Demi-journée / Journée
  // complète), sans dépendance à Google Calendar ni aux créneaux réels.
  function amplitudeLabel() {
    if (eventAmplitude === 'half_day') {
      return eventHalfDayPeriod === 'morning' ? 'Demi-journée (08h-12h)' : 'Demi-journée (14h-18h)';
    }
    if (eventAmplitude === 'full_day') {
      return 'Journée complète (08h-18h)';
    }
    const h = Math.floor(eventDurationMin / 60);
    const m = eventDurationMin % 60;
    return `Durée : ${h > 0 ? `${h}h` : ''}${m > 0 ? `${m}min` : ''}`.trim();
  }

  async function saveCalendarEvent() {
    if (!eventDate) return;
    setSavingEvent(true);
    try {
      const baseDate = eventDate.includes('T') ? eventDate : `${eventDate}T09:00:00`;
      createEvent({
        title: `${eventType} - ${project.clientFirstName} ${project.clientName}`,
        date: baseDate,
        type: eventType as 'RDV' | 'Relance' | 'Rappel' | 'Intervention',
        projectId: project.id,
        notes: `Planifié depuis le dossier projet — ${amplitudeLabel()}`,
        status: 'Prévu',
      });
      if (eventType === 'Relance') {
        updateProjectCallback(project.id, eventDate);
        setProject((current: any) => (current ? { ...current, callbackDate: eventDate } : current));
      }
      setEventDate('');
      setFollowUpToast({
        type: 'success',
        message: 'Rendez-vous simulé dans la démo. En production, il serait ajouté au planning Kadria.',
      });
    } catch {
      setFollowUpToast({ type: 'error', message: "Erreur lors de l'enregistrement" });
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
  // Navigation devis demo — route vers la creation si aucun devis n'existe
  // encore pour ce dossier, sinon vers la fiche detail du devis existant.
  const goToDevis = () => {
    if (latestDevis) {
      router.push(`/demo-dashboard/projet/${project.id}/devis/${latestDevis.id}`);
    } else {
      router.push(`/demo-dashboard/projet/${project.id}/devis/new`);
    }
  };
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
  // Bloc "moment ideal pour relancer/contacter" — memes helpers que prod
  // (src/lib/commercial-actions.ts), alimentes par les memes signaux
  // (analysis.nextBestAction.type, decision.shouldShowFollowupBlock) deja
  // calcules ci-dessus dans ce fichier.
  const showIdealFollowUp = shouldShowIdealFollowUp(project);
  const idealActionLabel = getIdealActionLabel(project, analysis.nextBestAction.type);
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
  // Avancement commercial — stepper unique partage par la section "Actions
  // et devis" et le bloc "Avancement commercial" (ex Lot C7 : supprime la
  // duplication avec l ancien quoteTimeline a 6 etapes).
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
  // Prochaine action commerciale = celle deja calculee par l Action Engine
  // (nextAction.title, expose par decision.primaryActionLabel) plutot qu un
  // mapping local sur le libelle de statut devis.
  const nextCommercialAction = decision.primaryActionLabel;
  // Avis Google — n'est pertinent qu'une fois le projet Gagné ou en
  // réalisation (jamais sur Nouveau/Perdu/en cours de négociation), même
  // logique que la fiche prod (isGoogleReviewEligibleStatus).
  const isGoogleReviewEligibleStatus = project.status === 'Gagné' || project.status === 'Réalisation du projet';
  const clientLabel = [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || 'Client non renseigne';
  const projectLabel = getProjectHeadline(project);
  const score = Number(project.completenessScore || 0);
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
  // actions demo-safe (pas d appel reel ; la navigation vers les routes
  // /devis/new et /devis/[devisId] est locale, aucune donnee reelle).
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
          onClick: goToDevis,
          meta: latestDevis?.decline_reason || 'Motif de refus à consigner si besoin.',
        };
      }
      if (project.status === 'Gagné' || decision.state === 'quote_accepted') {
        return {
          title: 'Planifier l’intervention chantier',
          ctaLabel: project.appointment ? 'Voir le rendez-vous' : 'Planifier l’intervention',
          onClick: project.appointment ? goToDevis : () => setShowRdvModal(true),
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
          onClick: goToDevis,
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
          onClick: goToDevis,
          meta: 'Le dossier contient assez d’éléments pour préparer une première proposition.',
        };
      }
      if (!latestDevis.sent) {
        return {
          title: 'Finaliser et envoyer le devis',
          ctaLabel: 'Voir le devis',
          onClick: goToDevis,
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
          onClick: goToDevis,
          meta: decision.followUpAvailableAt
            ? `Relance possible à partir du ${formatShortDate(decision.followUpAvailableAt)}.`
            : 'Le devis a été envoyé, gardez la conversation ouverte.',
        };
      }
      return {
        title: 'Clarifier le besoin',
        ctaLabel: 'Appeler le client',
        onClick: () => { if (project.clientPhone) window.location.href = `tel:${project.clientPhone}`; else goToDevis(); },
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
      ? () => goToDevis()
      : latestDevis.sent && !latestDevis.accepted && !latestDevis.declined
        ? decision.canFollowUpQuote
          ? () => followUpQuote(latestDevis)
          : () => goToDevis()
        : () => goToDevis();

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
        key: 'retours',
        title: 'Retours client',
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(clientEvents[project.id] || []).length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                  Aucun échange pour le moment sur ce dossier démo.
                </p>
              ) : (
                (clientEvents[project.id] || []).map((ev) => {
                  const isClient = ev.type === 'client_message';
                  const isArtisan = ev.type === 'artisan_reply';
                  if (!isClient && !isArtisan) {
                    return (
                      <div key={ev.id} style={{
                        background: 'var(--bg-inset)', border: '1px solid var(--border)',
                        borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: 'var(--text-2)',
                      }}>
                        <strong style={{ color: 'var(--text-1)' }}>{ev.title}</strong>
                        {ev.message ? ` — ${ev.message}` : ''}
                      </div>
                    );
                  }
                  return (
                    <div key={ev.id} style={{ display: 'flex', justifyContent: isClient ? 'flex-start' : 'flex-end' }}>
                      <div style={{
                        maxWidth: '88%',
                        background: isClient ? 'var(--bg-inset)' : 'var(--accent)',
                        color: isClient ? 'var(--text-1)' : 'black',
                        border: isClient ? '1px solid var(--border)' : 'none',
                        borderRadius: isClient ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                        padding: '10px 14px',
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: '4px', opacity: 0.75 }}>
                          {isClient ? 'Client' : 'Vous (artisan)'}
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{ev.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <textarea
              value={artisanReplyText}
              onChange={(e) => setArtisanReplyText(e.target.value)}
              placeholder="Votre réponse sera visible par le client dans son portail (simulation démo)..."
              rows={3}
              maxLength={2000}
              style={{
                width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '10px', color: 'var(--text-1)', fontSize: '13px',
                fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => {
                const text = artisanReplyText.trim();
                if (!text || sendingReply) return;
                setSendingReply(true);
                addClientEvent(project.id, { type: 'artisan_reply', title: 'Réponse artisan', message: text, source: 'artisan' });
                setArtisanReplyText('');
                setReplyToast('Simulation : réponse publiée dans le portail client (démo)');
                window.setTimeout(() => setReplyToast(null), 4000);
                setSendingReply(false);
              }}
              disabled={!artisanReplyText.trim() || sendingReply}
              style={{
                background: !artisanReplyText.trim() || sendingReply ? 'var(--border)' : 'var(--accent)',
                color: !artisanReplyText.trim() || sendingReply ? 'var(--text-3)' : 'black',
                fontWeight: 700, fontSize: '13px', padding: '10px 16px', borderRadius: '8px',
                border: 'none', cursor: !artisanReplyText.trim() || sendingReply ? 'not-allowed' : 'pointer',
              }}
            >
              {sendingReply ? 'Publication...' : 'Publier dans le portail client'}
            </button>
            {replyToast && (
              <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--accent)' }}>{replyToast}</p>
            )}
          </div>
        ),
      },
      {
        key: 'photos',
        title: 'Photos',
        content: (
          project.photos && project.photos.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: project.photos.length === 1 ? 'minmax(0, 60%)' : 'repeat(2, 1fr)',
              gap: '8px',
            }}>
              {project.photos.slice(0, 4).map((photo: { url: string; thumbnailUrl?: string }, i: number) => (
                <a
                  key={`${photo.url}-${i}`}
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}
                >
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt={`Photo ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </a>
              ))}
              {project.photos.length > 4 && (
                <a
                  href={project.photos[4].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    aspectRatio: '1', borderRadius: '10px', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-2)', fontSize: '12px', fontWeight: 700,
                  }}
                >
                  +{project.photos.length - 4} · Voir toutes les photos
                </a>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)' }}>
              Aucune photo jointe
            </p>
          )
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
              <button
                key={d.id}
                type="button"
                onClick={() => router.push(`/demo-dashboard/projet/${project.id}/devis/${d.id}`)}
                style={{
                  fontSize: '13px',
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                📄 Devis {d.numero} — {formatMoney(d.amount)} €
              </button>
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

          {/* Actions rapides — complète la barre sticky (Appeler / RDV /
              Devis) sans la dupliquer, mirroir de app/dashboard-v2/projet/[id]/page.tsx. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { label: '✉️ Message', disabled: !project.clientEmail, onClick: () => { if (project.clientEmail) window.location.href = `mailto:${project.clientEmail}`; } },
              {
                label: '🔗 Portail client',
                disabled: false,
                onClick: async () => {
                  const url = `${window.location.origin}/demo-dashboard/client/projet/${project.id}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopyPortalToast('Simulation : lien portail client copié (démo)');
                  } catch {
                    setCopyPortalToast(`Simulation : lien portail — ${url}`);
                  }
                  window.setTimeout(() => setCopyPortalToast(null), 4000);
                },
              },
              { label: '🔁 Relancer', disabled: !decision.canFollowUpQuote, onClick: () => { if (decision.canFollowUpQuote && latestDevis) followUpQuote(latestDevis); } },
              ...(isGoogleReviewEligibleStatus
                ? [{
                    label: '⭐ Avis Google',
                    disabled: !project.clientEmail,
                    onClick: requestGoogleReview,
                  }]
                : []),
              { label: '📝 Compléter', disabled: false, onClick: () => setEditingContact(true) },
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
      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-5 sm:px-6 sm:py-8">
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


        {showIdealFollowUp && (idealActionLabel.title !== 'Moment idéal pour relancer le devis' || decision.shouldShowFollowupBlock) && (
          <div style={{
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.22)',
            borderRadius: '14px',
            padding: isMobile ? '16px' : '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <div>
              <p style={{
                color: 'var(--accent)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                margin: '0 0 8px',
              }}>
                {idealActionLabel.title}
              </p>
              <p style={{ color: 'var(--text-1)', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>
                {idealActionLabel.mainSlot}
              </p>
              {idealActionLabel.secondarySlot && (
                <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: 0 }}>
                  {idealActionLabel.secondarySlot}
                </p>
              )}
            </div>

            <div style={{ color: 'var(--text-2)', fontSize: '12px', minWidth: isMobile ? '100%' : '220px' }}>
              <p style={{ margin: '0 0 4px' }}>
                Dernier échange :{' '}
                <span style={{ color: 'var(--text-1)' }}>
                  {followUpTime.lastInteractionDate
                    ? formatShortDate(followUpTime.lastInteractionDate)
                    : 'Non renseigné'}
                </span>
              </p>
              <p style={{ margin: 0 }}>
                Sans interaction :{' '}
                <span style={{ color: 'var(--text-1)' }}>
                  {followUpTime.daysWithoutInteraction === null
                    ? 'Non renseigné'
                    : `${followUpTime.daysWithoutInteraction} jour(s)`}
                </span>
              </p>
            </div>
          </div>
        )}

        {(() => {
          // Avancement commercial — mirroir du bloc desktop prod
          // (app/dashboard-v2/projet/[id]/page.tsx, lignes ~2077-2161).
          // `recommendedAction` reste calculé ici car il alimente la phrase
          // "Étape actuelle" du bloc Avancement commercial juste dessous.
          const recommendedAction = (() => {
            if (project.status === 'Perdu' || decision.state === 'quote_declined') {
              return {
                title: 'Clôturer le dossier',
                ctaLabel: 'Clôturer le dossier',
                onClick: goToDevis,
                meta: latestDevis?.decline_reason || 'Motif de refus à consigner si besoin.',
              };
            }
            if (project.status === 'Gagné' || decision.state === 'quote_accepted') {
              return {
                title: 'Planifier l’intervention chantier',
                ctaLabel: project.appointment ? 'Voir le rendez-vous' : 'Planifier l’intervention',
                onClick: project.appointment ? goToDevis : () => setShowRdvModal(true),
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
                onClick: goToDevis,
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
                onClick: () => updateDemoQuoteStatus('draft', 'Action simulée — aucune donnée réelle modifiée.'),
                meta: 'Le dossier contient assez d’éléments pour préparer une première proposition.',
              };
            }
            if (!latestDevis.sent) {
              return {
                title: 'Finaliser et envoyer le devis',
                ctaLabel: 'Voir le devis',
                onClick: goToDevis,
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
                onClick: goToDevis,
                meta: decision.followUpAvailableAt
                  ? `Relance possible à partir du ${formatShortDate(decision.followUpAvailableAt)}.`
                  : 'Le devis a été envoyé, gardez la conversation ouverte.',
              };
            }
            return {
              title: 'Clarifier le besoin',
              ctaLabel: 'Appeler le client',
              onClick: () => { if (project.clientPhone) window.location.href = `tel:${project.clientPhone}`; else goToDevis(); },
              meta: 'Contactez le prospect pour compléter les informations manquantes et qualifier le dossier.',
            };
          })();

          // Pilotage commercial — fusion "Action recommandée" (avec décision
          // commerciale manuelle) + "Avancement commercial", alignée sur la
          // structure de la fiche prod (app/dashboard-v2/projet/[id]/page.tsx,
          // bloc "Pilotage commercial"). Toutes les actions restent locales
          // (état React + toast), aucun appel réseau.
          const allowMarkWon = project.status !== 'Gagné' && project.status !== 'Perdu';
          const allowMarkLost = project.status !== 'Gagné' && project.status !== 'Perdu';

          return (
            <>
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid rgba(34,197,94,0.35)',
                boxShadow: '0 0 0 1px rgba(34,197,94,0.06), 0 4px 16px rgba(34,197,94,0.08)',
                borderRadius: '14px',
                padding: isMobile ? '16px' : '18px 20px',
                marginBottom: '16px',
              }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Pilotage commercial
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.3fr) minmax(0, 1fr)',
                  gap: isMobile ? '18px' : '28px',
                  alignItems: 'start',
                }}>
                  {/* Action recommandée */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Action recommandée
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 2px' }}>
                      {recommendedAction.title}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 10px' }}>
                      {recommendedAction.meta}
                    </p>
                    <button
                      type="button"
                      onClick={recommendedAction.onClick}
                      style={{
                        marginTop: '4px',
                        background: 'var(--accent)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#000',
                        cursor: 'pointer',
                        width: isMobile ? '100%' : undefined,
                      }}
                    >
                      {recommendedAction.ctaLabel}
                    </button>

                    {/* Décision commerciale manuelle — permet de marquer un
                        dossier gagné/perdu à la main (simulation locale
                        uniquement), en complément du passage automatique via
                        acceptation/refus du devis démo. */}
                    {(allowMarkWon || allowMarkLost) && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          disabled={updating}
                          onClick={() => requestCommercialClosure('Gagné')}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(22,163,74,0.4)',
                            color: '#15803d',
                            borderRadius: '999px',
                            padding: '5px 12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: updating ? 'default' : 'pointer',
                            opacity: updating ? 0.6 : 1,
                          }}
                        >
                          🏆 Marquer gagné
                        </button>
                        <button
                          type="button"
                          disabled={updating}
                          onClick={() => requestCommercialClosure('Perdu')}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(220,38,38,0.35)',
                            color: '#b91c1c',
                            borderRadius: '999px',
                            padding: '5px 12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: updating ? 'default' : 'pointer',
                            opacity: updating ? 0.6 : 1,
                          }}
                        >
                          🗄️ Marquer perdu
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Avancement commercial */}
                  <div style={{
                    borderLeft: isMobile ? 'none' : '1px solid var(--border)',
                    borderTop: isMobile ? '1px solid var(--border)' : 'none',
                    paddingLeft: isMobile ? 0 : '24px',
                    paddingTop: isMobile ? '14px' : 0,
                  }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Avancement commercial
                </p>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {commercialTimeline.map((step, index) => {
                    const isCurrent = !step.done && commercialTimeline.slice(0, index).every((s) => s.done);
                    const isLast = index === commercialTimeline.length - 1;
                    return (
                      <div key={step.id} style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <span style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: step.done ? 'rgba(34,197,94,0.18)' : isCurrent ? 'rgba(234,88,12,0.14)' : 'var(--bg)',
                            border: `2px solid ${step.done ? 'rgba(34,197,94,0.5)' : isCurrent ? '#ea580c' : 'var(--border)'}`,
                            color: step.done ? 'var(--accent)' : isCurrent ? '#ea580c' : 'var(--text-3)',
                          }}>
                            {step.done ? '✓' : index + 1}
                          </span>
                          {!isLast && (
                            <span style={{ width: '2px', flex: 1, minHeight: '10px', background: step.done ? 'rgba(34,197,94,0.35)' : 'var(--border)' }} />
                          )}
                        </div>
                        <p style={{
                          margin: isLast ? '2px 0 0' : '2px 0 10px',
                          fontSize: '12px',
                          color: step.done ? 'var(--text-1)' : isCurrent ? '#ea580c' : 'var(--text-3)',
                          fontWeight: step.done || isCurrent ? 700 : 500,
                          lineHeight: 1.3,
                        }}>
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p style={{ margin: '16px 0 0', fontSize: '12px', color: 'var(--text-3)' }}>
                  Étape actuelle : {(() => {
                    const current = commercialTimeline.find((s) => !s.done) || commercialTimeline[commercialTimeline.length - 1];
                    return `${current.label} — ${recommendedAction.title.charAt(0).toLowerCase()}${recommendedAction.title.slice(1)}.`;
                  })()}
                </p>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* Quick-actions — mirroir de app/dashboard-v2/projet/[id]/page.tsx :
            5 raccourcis compacts (Rendez-vous / Suivi client / Devis client /
            Avis client / Portail client), remplacent les anciens blocs
            "Informations principales" / "Coordonnees et contexte" (doublons
            des donnees deja affichees dans le header projet ci-dessus). */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)',
          gap: '10px',
          marginBottom: '16px',
        }}>
          <button
            onClick={() => { if (!project.appointment) setShowRdvModal(true); }}
            disabled={!!project.appointment}
            style={{
              background: 'var(--bg-elevated)',
              border: project.appointment ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'left',
              cursor: project.appointment ? 'default' : 'pointer',
            }}
          >
            <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              📅 Rendez-vous
            </p>
            <p style={{ fontSize: '13px', color: project.appointment ? 'var(--accent)' : 'var(--text-1)', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
              {project.appointment ? formatDateTime(project.appointment.start) : 'Planifier un rendez-vous'}
            </p>
          </button>

          <button
            onClick={() => (decision.canFollowUpQuote && latestDevis ? followUpQuote(latestDevis) : (project.clientPhone ? (window.location.href = `tel:${project.clientPhone}`) : goToDevis()))}
            disabled={!decision.canFollowUpQuote && !latestDevis && !project.clientPhone}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'left',
              cursor: (decision.canFollowUpQuote || latestDevis || project.clientPhone) ? 'pointer' : 'not-allowed',
              opacity: (decision.canFollowUpQuote || latestDevis || project.clientPhone) ? 1 : 0.5,
            }}
          >
            <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              📞 Suivi client
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 600, margin: 0 }}>
              {decision.canFollowUpQuote
                ? 'Relancer le client'
                : decision.followUpAvailableAt
                  ? `Possible à partir du ${formatShortDate(decision.followUpAvailableAt)}`
                  : 'Contacter le client si nécessaire'}
            </p>
          </button>

          <button
            onClick={() => goToDevis()}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              📄 Devis client
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 600, margin: 0 }}>
              {!latestDevis
                ? 'Préparer un devis'
                : latestDevis.accepted
                  ? 'Devis accepté'
                  : latestDevis.declined
                    ? 'Devis refusé'
                    : decision.canFollowUpQuote
                      ? 'Consulter / relancer'
                      : 'Consulter le devis'}
            </p>
          </button>

          <button
            onClick={requestGoogleReview}
            disabled={!isGoogleReviewEligibleStatus || !project.clientEmail}
            title={!isGoogleReviewEligibleStatus
              ? 'Disponible une fois le projet terminé.'
              : !project.clientEmail
                ? 'Ajoutez un email client pour pouvoir envoyer une demande d’avis.'
                : undefined}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'left',
              cursor: (!isGoogleReviewEligibleStatus || !project.clientEmail) ? 'not-allowed' : 'pointer',
              opacity: (!isGoogleReviewEligibleStatus || !project.clientEmail) ? 0.5 : 1,
            }}
          >
            <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              ⭐ Avis client
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 600, margin: 0 }}>
              Demander avis Google
            </p>
          </button>

          <button
            type="button"
            onClick={async () => {
              const url = `${window.location.origin}/demo-dashboard/client/projet/${project.id}`;
              try {
                await navigator.clipboard.writeText(url);
                setCopyPortalToast('Simulation : lien portail client copié (démo)');
              } catch {
                setCopyPortalToast(`Simulation : lien portail — ${url}`);
              }
              window.setTimeout(() => setCopyPortalToast(null), 4000);
            }}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              🔗 Portail client
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 600, margin: 0 }}>
              Copier le lien
            </p>
          </button>
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
              Actions et devis
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

          {/* Statut commercial (Gagné/Perdu/etc.) piloté depuis la carte
              "Pilotage commercial" plus haut (Décision commerciale manuelle) —
              plus de bloc "Faire avancer le dossier" ici, pour éviter la
              double commande de statut, comme en prod (voir commentaire dans
              app/dashboard-v2/projet/[id]/page.tsx). */}
          <div style={{
            padding: isMobile ? '14px 16px' : '14px 20px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div>
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
                  router.push(`/demo-dashboard/projet/${project.id}/devis/new`);
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
                      onClick={() => router.push(`/demo-dashboard/projet/${project.id}/devis/${devis.id}`)}
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
                  onClick={() => requestCommercialClosure('Gagné')}
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
                  onClick={() => requestCommercialClosure('Perdu')}
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

              {/* Amplitude — mêmes options que la prod (Durée personnalisée /
                  Demi-journée / Journée complète), 100% simulé : aucun appel
                  Google Calendar, aucune écriture Supabase. */}
              <div style={{ marginBottom: '10px' }}>
                <p style={{ margin: '0 0 6px', color: 'var(--text-3)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Amplitude
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {([
                    { key: 'custom', label: 'Durée personnalisée' },
                    { key: 'half_day', label: 'Demi-journée' },
                    { key: 'full_day', label: 'Journée complète' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setEventAmplitude(opt.key)}
                      style={{
                        background: eventAmplitude === opt.key ? 'rgba(34,197,94,0.12)' : 'var(--border)',
                        border: `1px solid ${eventAmplitude === opt.key ? 'var(--accent)' : 'var(--border)'}`,
                        color: eventAmplitude === opt.key ? 'var(--text-1)' : 'var(--text-2)',
                        borderRadius: '999px',
                        padding: '5px 12px',
                        fontSize: '12px',
                        fontWeight: eventAmplitude === opt.key ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {eventAmplitude === 'custom' && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[30, 60, 90, 120, 180, 240].map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setEventDurationMin(min)}
                        style={{
                          background: eventDurationMin === min ? 'rgba(34,197,94,0.12)' : 'var(--border)',
                          border: `1px solid ${eventDurationMin === min ? 'var(--accent)' : 'var(--border)'}`,
                          color: eventDurationMin === min ? 'var(--text-1)' : 'var(--text-2)',
                          borderRadius: '999px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: eventDurationMin === min ? 700 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {min < 60 ? `${min}min` : min % 60 === 0 ? `${min / 60}h` : `${Math.floor(min / 60)}h${min % 60}`}
                      </button>
                    ))}
                  </div>
                )}
                {eventAmplitude === 'half_day' && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {([{ key: 'morning', label: 'Matin (08h-12h)' }, { key: 'afternoon', label: 'Après-midi (14h-18h)' }] as const).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setEventHalfDayPeriod(opt.key)}
                        style={{
                          background: eventHalfDayPeriod === opt.key ? 'rgba(34,197,94,0.12)' : 'var(--border)',
                          border: `1px solid ${eventHalfDayPeriod === opt.key ? 'var(--accent)' : 'var(--border)'}`,
                          color: eventHalfDayPeriod === opt.key ? 'var(--text-1)' : 'var(--text-2)',
                          borderRadius: '999px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: eventHalfDayPeriod === opt.key ? 700 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                {eventAmplitude === 'full_day' && (
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '11px' }}>Amplitude par défaut : 08h00 - 18h00.</p>
                )}
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

        {/* Acompte — reprend le vocabulaire de src/lib/deposit.ts (DepositStatus)
            sur les champs depositStatus/depositAmount/depositPaymentUrl portés
            par DemoProject. Aucun appel Stripe : toute action affiche un toast
            "Paiement simulé dans la démo" et met seulement à jour l'état local. */}
        {(() => {
          const depositStatus = project.depositStatus || 'not_requested';
          const depositLabel: Record<string, string> = {
            not_requested: 'Aucun acompte demandé',
            recommended: 'Acompte recommandé',
            requested: 'Acompte demandé — en attente de paiement',
            paid: 'Acompte payé',
            cancelled: 'Acompte annulé / expiré',
          };
          const depositColor =
            depositStatus === 'paid' ? '#16a34a' : depositStatus === 'requested' ? '#f59e0b' : depositStatus === 'cancelled' ? '#ef4444' : 'var(--text-3)';
          return (
            <div style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: isMobile ? '16px' : '16px 20px', marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>💶 Acompte</p>
                  <p style={{ margin: 0, fontSize: '12px', color: depositColor, fontWeight: 600 }}>{depositLabel[depositStatus]}</p>
                  {typeof project.depositAmount === 'number' && project.depositAmount > 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-3)' }}>
                      Montant : {project.depositAmount.toLocaleString('fr-FR')} €
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {depositStatus === 'not_requested' || depositStatus === 'recommended' ? (
                    <button
                      onClick={() => {
                        const amount = project.devisAmount ? Math.round(project.devisAmount * 0.3) : 0;
                        updateProjectFields(project.id, {
                          depositStatus: 'requested',
                          depositAmount: amount || project.depositAmount || 0,
                          depositPaymentUrl: `demo-deposit-link-${project.id}`,
                          depositRequestedAt: new Date().toISOString(),
                        });
                        setCopyPortalToast('Simulation : lien d’acompte envoyé au client (démo)');
                        window.setTimeout(() => setCopyPortalToast(null), 4000);
                      }}
                      style={{ background: 'var(--accent)', color: 'black', fontWeight: 700, fontSize: '12px', padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                    >
                      Demander l&apos;acompte
                    </button>
                  ) : depositStatus === 'requested' ? (
                    <button
                      onClick={() => {
                        updateProjectFields(project.id, { depositStatus: 'paid', depositPaidAt: new Date().toISOString() });
                        setCopyPortalToast('Paiement simulé dans la démo — acompte marqué comme payé');
                        window.setTimeout(() => setCopyPortalToast(null), 4000);
                      }}
                      style={{ background: 'transparent', color: 'var(--text-1)', fontWeight: 600, fontSize: '12px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}
                    >
                      Simuler le paiement
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Portail client et Avis Google : plus de sections pleine largeur
            dediees ici — mirroir strict de la prod, ou ces deux actions sont
            uniquement les boutons compacts de la grille "Quick-actions"
            ci-dessus (pas de doublon). copyPortalToast reste utilise par
            cette grille et par le bloc Acompte plus bas. */}

        {/* Retours client — bulles de discussion + activité du dossier,
            reprend la logique de app/dashboard-v2/projet/[id]/page.tsx mais
            sur clientEvents locaux (DemoModeContext), aucun appel réseau. */}
        {!showRetoursClient ? (
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: isMobile ? '16px' : '16px 20px', marginBottom: '16px',
          }}>
            <button
              onClick={() => setShowRetoursClient(true)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer',
                fontSize: '14px', padding: 0, width: '100%', display: 'flex', alignItems: 'center',
                gap: '8px', textAlign: 'left',
              }}
            >
              <span>💬</span>
              <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>Retours client</span>
              {(clientEvents[project.id]?.length || 0) > 0 && (
                <span style={{
                  background: 'var(--accent)', color: 'black', borderRadius: '10px',
                  padding: '1px 7px', fontSize: '11px', fontWeight: 700,
                }}>
                  {clientEvents[project.id]?.length}
                </span>
              )}
              <span style={{
                marginLeft: isMobile ? 0 : 'auto', width: isMobile ? '100%' : undefined,
                fontSize: '12px', color: 'var(--accent)',
              }}>
                Voir la discussion et l&apos;activité du dossier →
              </span>
            </button>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: isMobile ? '16px' : '20px', marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
              <h3 style={{ color: 'var(--text-1)', fontSize: '15px', fontWeight: 600, margin: 0 }}>💬 Retours client</h3>
              <button
                onClick={() => setShowRetoursClient(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '13px' }}
              >
                Réduire
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {(clientEvents[project.id] || []).length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                  Aucun échange pour le moment sur ce dossier démo.
                </p>
              ) : (
                (clientEvents[project.id] || []).map((ev) => {
                  const isClient = ev.type === 'client_message';
                  const isArtisan = ev.type === 'artisan_reply';
                  if (!isClient && !isArtisan) {
                    return (
                      <div key={ev.id} style={{
                        background: 'var(--bg-inset)', border: '1px solid var(--border)',
                        borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: 'var(--text-2)',
                      }}>
                        <strong style={{ color: 'var(--text-1)' }}>{ev.title}</strong>
                        {ev.message ? ` — ${ev.message}` : ''}
                      </div>
                    );
                  }
                  return (
                    <div key={ev.id} style={{ display: 'flex', justifyContent: isClient ? 'flex-start' : 'flex-end' }}>
                      <div style={{
                        maxWidth: '80%',
                        background: isClient ? 'var(--bg-inset)' : 'var(--accent)',
                        color: isClient ? 'var(--text-1)' : 'black',
                        border: isClient ? '1px solid var(--border)' : 'none',
                        borderRadius: isClient ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                        padding: '10px 14px',
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: '4px', opacity: 0.75 }}>
                          {isClient ? 'Client' : 'Vous (artisan)'}
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{ev.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <textarea
              value={artisanReplyText}
              onChange={(e) => setArtisanReplyText(e.target.value)}
              placeholder="Votre réponse sera visible par le client dans son portail (simulation démo)..."
              rows={3}
              maxLength={2000}
              style={{
                width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '10px', color: 'var(--text-1)', fontSize: '13px',
                fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: '10px',
              }}
            />
            <button
              onClick={() => {
                const text = artisanReplyText.trim();
                if (!text || sendingReply) return;
                setSendingReply(true);
                addClientEvent(project.id, { type: 'artisan_reply', title: 'Réponse artisan', message: text, source: 'artisan' });
                setArtisanReplyText('');
                setReplyToast('Simulation : réponse publiée dans le portail client (démo)');
                window.setTimeout(() => setReplyToast(null), 4000);
                setSendingReply(false);
              }}
              disabled={!artisanReplyText.trim() || sendingReply}
              style={{
                background: !artisanReplyText.trim() || sendingReply ? 'var(--border)' : 'var(--accent)',
                color: !artisanReplyText.trim() || sendingReply ? 'var(--text-3)' : 'black',
                fontWeight: 700, fontSize: '13px', padding: '10px 16px', borderRadius: '8px',
                border: 'none', cursor: !artisanReplyText.trim() || sendingReply ? 'not-allowed' : 'pointer',
              }}
            >
              {sendingReply ? 'Publication...' : 'Publier dans le portail client'}
            </button>
            {replyToast && (
              <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--accent)' }}>{replyToast}</p>
            )}
          </div>
        )}

        {/* Photos du projet — galerie visible, mirroir du bloc desktop prod
            (app/dashboard-v2/projet/[id]/page.tsx, "Photos du projet"),
            placee apres Retours client comme en prod. */}
        {project.photos && project.photos.length > 0 && (
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: isMobile ? '14px 16px' : '16px 20px',
            marginBottom: '16px',
          }}>
            <p style={{
              color: 'var(--text-3)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: '0 0 10px',
            }}>
              Photos du projet ({project.photos.length})
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: '8px',
            }}>
              {project.photos.map((photo: { url: string; thumbnailUrl?: string }, i: number) => (
                <a
                  key={`${photo.url}-${i}`}
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}
                >
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt={`Photo ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}

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

        <section
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-6"
          style={{ marginBottom: '16px' }}
        >
          {(() => {
            const dossierActivitySource = [
              ...activities,
              {
                id: 'creation',
                description: `Dossier créé — statut initial : ${project.status || 'Nouveau'}`,
                createdAt: project.createdAt,
                action: 'CREATED',
              },
            ]
              .filter((activity) => activity.createdAt || activity.description)
              .sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeB - timeA;
              });

            const activityItems = dossierActivitySource.map((activity, index) => getActivityPresentation(activity, index));
            const recentActivityItems = showAllHistory ? activityItems : activityItems.slice(0, 8);

            return (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-1)]">Activité du dossier</h2>
                    <p className="mt-1 text-sm text-[var(--text-2)]">
                      Les dernières actions enregistrées sur ce projet.
                    </p>
                  </div>
                  {activityItems.length > 0 && (
                    <span className="inline-flex w-fit rounded-full border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-1 text-xs font-medium text-[var(--text-2)]">
                      {activityItems.length} évènement{activityItems.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  {activityItems.length === 0 && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-4 text-sm text-[var(--text-2)]">
                      Aucune activité enregistrée pour le moment.
                      Les relances, demandes d'avis et changements importants apparaîtront ici.
                    </div>
                  )}

                  {recentActivityItems.map((item) => {
                    const tone = getActivityToneStyles(item.tone);
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex min-w-0 gap-3">
                          <span
                            className="mt-1 inline-flex h-3 w-3 flex-shrink-0 rounded-full"
                            style={{ background: tone.dotBg, border: `1px solid ${tone.badgeBorder}` }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--text-1)]">{item.title}</p>
                            {item.detail && item.detail !== item.title && (
                              <p className="mt-1 text-sm leading-6 text-[var(--text-2)]">{item.detail}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-2 sm:items-end">
                          <span
                            className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                            style={{
                              background: tone.badgeBg,
                              borderColor: tone.badgeBorder,
                              color: tone.badgeColor,
                            }}
                          >
                            {tone.badgeLabel}
                          </span>
                          <p className="text-xs text-[var(--text-3)]">
                            {item.createdAt ? formatDateTime(item.createdAt) : 'Date inconnue'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {activityItems.length > 8 && (
                  <button
                    onClick={() => setShowAllHistory((v) => !v)}
                    className="mt-3 text-sm text-green-500 hover:underline"
                  >
                    {showAllHistory ? 'Réduire' : "Voir toute l'activité"}
                  </button>
                )}
              </>
            );
          })()}
        </section>

      </main>

      {commercialClosureConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (!updating) setCommercialClosureConfirm(null);
          }}
        >
          <div
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 max-w-lg w-full space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[var(--text-1)] font-bold text-lg m-0">{commercialClosureConfirm.title}</h2>
                <p className="text-sm text-[var(--text-2)] mt-1 mb-0">
                  {commercialClosureConfirm.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!updating) setCommercialClosureConfirm(null);
                }}
                disabled={updating}
                className="text-[var(--text-2)] hover:text-[var(--text-1)] disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-3 text-sm">
              <p className="m-0 text-[var(--text-2)]">
                Dossier : <span className="text-[var(--text-1)] font-semibold">{clientLabel || project.projectType || 'Projet'}</span>
              </p>
              <p className="m-0 mt-2 text-[var(--text-2)]">
                Statut actuel : <span className="text-[var(--text-1)] font-semibold">{project.status || 'Non renseigné'}</span>
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!updating) setCommercialClosureConfirm(null);
                }}
                disabled={updating}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-2.5 text-sm font-semibold text-[var(--text-1)] transition hover:border-green-500/40 hover:text-white disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmCommercialClosure}
                disabled={updating}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition hover:brightness-110 disabled:opacity-60 ${
                  commercialClosureConfirm.status === 'Gagné'
                    ? 'bg-[var(--accent)] text-black'
                    : 'bg-red-500 text-white'
                }`}
              >
                {updating ? 'Mise à jour...' : commercialClosureConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

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

