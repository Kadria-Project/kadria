'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject, updateProject, getProjectActivity } from '@/src/lib/api';
import AuthGuard from '@/src/components/AuthGuard';
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
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { hasFeature, normalizePlan, type PlanFeatureKey, type PlanKey } from '@/src/lib/plans';
import { getBestFollowUpTime, shouldShowIdealFollowUp } from '@/src/lib/commercial-actions';
import { getQuoteFollowupState } from '@/src/lib/quote-followup';
import { getProjectCommercialAnalysis, type NextActionType } from '@/src/lib/project-scoring';

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
  first_opened_at?: string | null;
  follow_up_disabled?: boolean;
  follow_up_disabled_at?: string | null;
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

export default function ProjectDetailPage() {
  return (
    <AuthGuard>
      <ProjectDetail />
    </AuthGuard>
  );
}

function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

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
    city: project?.city || '',
    postalCode: project?.postalCode || '',
    latitude: project?.latitude ?? null as number | null,
    longitude: project?.longitude ?? null as number | null,
  });
  const [savingContact, setSavingContact] = useState(false);

  const [devisAmount, setDevisAmount] = useState<string>(
    project?.devisAmount ? String(project.devisAmount) : ''
  );
  const [savingDevis, setSavingDevis] = useState(false);
  const [plan, setPlan] = useState<PlanKey>('essentiel');
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
    trades?: string[];
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

  async function loadActivities() {
    const activityData = await getProjectActivity(id);

    if (activityData.success) {
      setActivities(activityData.activities);
    }
  }

  useEffect(() => {
    async function loadProject() {
      try {
        const data = await getProject(id);

        setProject(data.project);
        setNote(data.project?.internalNotes || '');
        setCallbackDate(data.project?.callbackDate || '');
        setShowCallback(!!data.project?.callbackDate);
        setDevisAmount(data.project?.devisAmount ? String(data.project.devisAmount) : '');

        await loadActivities();
      } catch (error) {
        console.error('PROJECT_DETAIL_ERROR', error);
      } finally {
        setLoading(false);
      }
    }

    if (id) loadProject();
  }, [id]);

  useEffect(() => {
    fetch('/api/artisan/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setArtisanConfig(data.config);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPlan(normalizePlan(data.plan));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/devis?projet_id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setDevisList(data.devis);
        } else {
          console.error('[DEVIS LIST] Erreur chargement devis du projet:', data.error);
        }
      })
      .catch((error) => {
        console.error('[DEVIS LIST] Erreur réseau chargement devis du projet:', error);
      });
  }, [id]);
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
      const response = await fetch(`/api/devis/${devis.id}/follow-up`, { method: 'POST' });
      const text = await response.text();
      let data: { success?: boolean; error?: string; message?: string; sent_at?: string } = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { success: false, error: text || 'Reponse serveur invalide' };
      }

      if (response.status === 403) {
        openUpgradeModal('quoteGeneration');
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Impossible de relancer le devis');
      }

      await loadActivities();
      setDevisList((prev) =>
        prev.map((item) =>
          item.id === devis.id
            ? {
                ...item,
                last_follow_up_at: data.sent_at,
                follow_up_count: (item.follow_up_count || 0) + 1,
              }
            : item
        )
      );
      setFollowUpToast({ type: 'success', message: data.message || 'Relance envoyee' });
    } catch (error) {
      setFollowUpToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Impossible de relancer le devis',
      });
    } finally {
      setFollowingUpDevisId(null);
    }
  }

  async function toggleFollowUpDisabled(devis: DevisListItem) {
    const nextDisabled = !devis.follow_up_disabled;
    try {
      const response = await fetch(`/api/devis/${devis.id}/follow-up-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: nextDisabled }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Impossible de mettre a jour les relances');
      }

      setDevisList((prev) =>
        prev.map((item) =>
          item.id === devis.id
            ? { ...item, follow_up_disabled: nextDisabled, follow_up_disabled_at: nextDisabled ? new Date().toISOString() : null }
            : item
        )
      );
      await loadActivities();
      setFollowUpToast({
        type: 'success',
        message: nextDisabled ? 'Relances desactivees pour ce devis' : 'Relances reactivees pour ce devis',
      });
    } catch (error) {
      setFollowUpToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Impossible de mettre a jour les relances',
      });
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

      const data = await updateProject(id, { status, contacted: true });

      if (data.success) {
        setProject(data.project);
        await loadActivities();
      }
    } catch (error) {
      console.error('UPDATE_STATUS_ERROR', error);
    } finally {
      setUpdating(false);
    }
  }

  async function saveNote() {
    try {
      setUpdating(true);

      const data = await updateProject(id, { internalNotes: note });

      if (data.success) {
        setProject(data.project);
        await loadActivities();
      }
    } catch (error) {
      console.error('SAVE_NOTES_ERROR', error);
    } finally {
      setUpdating(false);
    }
  }

  async function saveCallback() {
    try {
      setUpdating(true);

      const data = await updateProject(id, { callbackDate: callbackDate || null });

      if (data.success) {
        setProject(data.project);
        await loadActivities();
      }
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
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rdvData.title || `RDV ${project.clientFirstName} ${project.clientName}`,
          date: `${rdvData.date}T${rdvData.time || '09:00'}:00`,
          type: rdvData.type || 'RDV',
          projectId: project.id,
          notes: rdvData.notes || '',
        }),
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
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${eventType} — ${project.clientFirstName} ${project.clientName}`,
          date: eventDate.includes('T') ? eventDate : `${eventDate}T09:00:00`,
          type: eventType,
          projectId: project.id,
          notes: 'Planifié depuis le dossier projet',
        }),
      });
      if (eventType === 'Relance') {
        await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callbackDate: eventDate }),
        });
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
  const latestDevis = devisList[0];
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
  }, { artisanTrades: artisanConfig?.trades ?? [] });
  const verdict = getVerdictDisplay(analysis.temperature, analysis.temperatureLabel);
  const summary = getStructuredSummary(project);
  const followUpTime = getBestFollowUpTime(project);
  const showIdealFollowUp = shouldShowIdealFollowUp(project);

  function getNextActionCtaLabel(type: NextActionType): string {
    switch (type) {
      case 'call': return 'Appeler le prospect';
      case 'quote': return 'Préparer un devis';
      case 'followup': return 'Relancer';
      case 'ask_info': return 'Demander des précisions';
      case 'archive': return 'Classer';
      case 'wait': return 'Attendre';
      default: return 'Voir';
    }
  }

  function handleNextBestAction(type: NextActionType) {
    switch (type) {
      case 'call': {
        if (project.clientPhone) {
          window.location.href = `tel:${project.clientPhone}`;
        } else {
          setContactForm({
            clientFirstName: project.clientFirstName || '',
            clientName: project.clientName || '',
            clientPhone: project.clientPhone || '',
            clientEmail: project.clientEmail || '',
            siteAddress: project.siteAddress || '',
            city: project.city || '',
            postalCode: project.postalCode || '',
            latitude: project.latitude ?? null,
            longitude: project.longitude ?? null,
          });
          setEditingContact(true);
        }
        break;
      }
      case 'quote': {
        if (!canQuote) {
          openUpgradeModal('quoteGeneration');
          break;
        }
        router.push(`/dashboard-v2/projet/${id}/devis/new`);
        break;
      }
      case 'followup': {
        if (latestDevis) {
          followUpQuote(latestDevis);
        }
        break;
      }
      case 'ask_info': {
        setContactForm({
          clientFirstName: project.clientFirstName || '',
          clientName: project.clientName || '',
          clientPhone: project.clientPhone || '',
          clientEmail: project.clientEmail || '',
          siteAddress: project.siteAddress || '',
          city: project.city || '',
          postalCode: project.postalCode || '',
          latitude: project.latitude ?? null,
          longitude: project.longitude ?? null,
        });
        setEditingContact(true);
        break;
      }
      case 'archive':
      case 'wait':
      default:
        break;
    }
  }

  function getVerdictDisplay(temperature: 'hot' | 'warm' | 'cold', temperatureLabel: string) {
    if (temperature === 'hot') {
      return { icon: '🔥', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', label: temperatureLabel };
    }
    if (temperature === 'warm') {
      return { icon: '🌤️', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: temperatureLabel };
    }
    return { icon: '❄️', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)', label: temperatureLabel };
  }

  return (
    <div className="dashboard-shell min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--text-1)]">
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5 sm:px-6 sm:py-8">
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '24px', gap: isMobile ? '12px' : '16px' }}>
          <Button variant="ghost" onClick={() => router.push('/dashboard-v2')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <button
            onClick={async () => {
              if (!canExportPdf) {
                openUpgradeModal('pdfExports');
                return;
              }
              const res = await fetch(`/api/projects/${project.id}/pdf`);
              if (res.status === 403) {
                openUpgradeModal('pdfExports');
                return;
              }
              const html = await res.text();
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
            <a href="/parametres" className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--accent)' }}>
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
                fontSize: isMobile ? '22px' : '24px',
                fontWeight: 700,
                margin: '0 0 4px',
              }}>
                {project.clientFirstName} {project.clientName}
              </h1>
              <p style={{
                color: 'var(--text-2)',
                fontSize: '14px',
                margin: 0,
              }}>
                {project.trade} · {project.city}
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
            </div>
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
                  city: project.city || '',
                  postalCode: project.postalCode || '',
                  latitude: project.latitude ?? null,
                  longitude: project.longitude ?? null,
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
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          {/* Header avec badge température + score */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                color: 'var(--text-2)',
                fontSize: '12px',
                fontWeight: 600,
              }}>
                {analysis.score}/100
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

          {/* Recommandation principale + CTA */}
          <div style={{
            padding: isMobile ? '14px 16px' : '14px 20px',
            background: 'rgba(34, 197, 94, 0.05)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: '12px',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
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
                  {analysis.nextBestAction.label}
                </p>
                <p style={{
                  color: 'var(--text-2)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  margin: 0,
                }}>
                  {analysis.recommendation}
                </p>
              </div>
            </div>
            {analysis.nextBestAction.type !== 'wait' && (
              <button
                onClick={() => handleNextBestAction(analysis.nextBestAction.type)}
                style={{
                  background: 'var(--accent)',
                  color: 'black',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {getNextActionCtaLabel(analysis.nextBestAction.type)}
              </button>
            )}
          </div>

          {/* Forces / points faibles / risques */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '1px',
            background: 'var(--border)',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ background: 'var(--bg-elevated)', padding: isMobile ? '12px 16px' : '12px 16px' }}>
              <p style={{ color: 'var(--text-3)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                Forces
              </p>
              {analysis.strengths.length > 0 ? (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {analysis.strengths.map((item, i) => (
                    <li key={i} style={{ color: 'var(--text-1)', fontSize: '12px', display: 'flex', gap: '6px' }}>
                      <span style={{ color: 'var(--accent)' }}>✓</span>{item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>Aucune pour le moment</p>
              )}
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px' }}>
              <p style={{ color: 'var(--text-3)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                Infos manquantes
              </p>
              {analysis.missingInfo.length > 0 ? (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {analysis.missingInfo.map((item, i) => (
                    <li key={i} style={{ color: 'var(--text-2)', fontSize: '12px', display: 'flex', gap: '6px' }}>
                      <span style={{ color: '#f59e0b' }}>•</span>{item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>Dossier complet</p>
              )}
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px' }}>
              <p style={{ color: 'var(--text-3)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                Risques
              </p>
              {analysis.riskFlags.length > 0 ? (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {analysis.riskFlags.map((item, i) => (
                    <li key={i} style={{ color: '#dc2626', fontSize: '12px', display: 'flex', gap: '6px' }}>
                      <span>⚠</span>{item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>Aucun risque identifié</p>
              )}
            </div>
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
        </div>

        {showIdealFollowUp && (
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
                Moment idéal de relance
              </p>
              <p style={{ color: 'var(--text-1)', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>
                {followUpTime.primarySlot}
              </p>
              <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: 0 }}>
                {followUpTime.secondarySlot}
              </p>
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
                      await fetch(`/api/projects/${project.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          fields: {
                            Devis_amount: devisAmount ? Number(devisAmount) : null,
                          },
                        }),
                      });
                      project.devisAmount = Number(devisAmount);
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
                  router.push(`/dashboard-v2/projet/${id}/devis/new`);
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
                      onClick={() => router.push(`/dashboard-v2/projet/${id}/devis/${devis.id}`)}
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
                          {devis.declined ? (
                            <span style={{
                              background: 'rgba(220,38,38,0.1)',
                              color: '#dc2626',
                              border: '1px solid rgba(220,38,38,0.3)',
                              borderRadius: '999px',
                              padding: '4px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}>
                              ✕ Refusé
                            </span>
                          ) : devis.accepted ? (
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
                          ) : devis.sent || devis.statut?.startsWith('Envoy') ? (
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

                          {devis.declined && (
                            <div style={{
                              background: 'rgba(220,38,38,0.06)',
                              border: '1px solid rgba(220,38,38,0.25)',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                            }}>
                              <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600 }}>
                                Refusé le {formatDevisDate(devis.declined_at || '')}
                              </span>
                              {devis.decline_reason && (
                                <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>
                                  Motif : {devis.decline_reason}
                                </span>
                              )}
                            </div>
                          )}

                          {(() => {
                            const followupState = getQuoteFollowupState(devis);
                            return devis.declined ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`/dashboard-v2/projet/${id}/devis/new`);
                                }}
                                style={{
                                  alignSelf: 'flex-start',
                                  background: 'var(--bg-elevated)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-1)',
                                  borderRadius: '9px',
                                  padding: '8px 14px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  width: isMobile ? '100%' : undefined,
                                }}
                              >
                                Créer un nouveau devis
                              </button>
                            ) : devis.accepted ? (
                              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                                Devis accepté — aucune relance nécessaire
                              </span>
                            ) : followupState.stage === 'expired' ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`/dashboard-v2/projet/${id}/devis/new`);
                                }}
                                style={{
                                  alignSelf: 'flex-start',
                                  background: 'var(--bg-elevated)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-1)',
                                  borderRadius: '9px',
                                  padding: '8px 14px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  width: isMobile ? '100%' : undefined,
                                }}
                              >
                                Créer un nouveau devis
                              </button>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {followupState.canFollowUp && (
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
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        toggleFollowUpDisabled(devis);
                                      }}
                                      style={{
                                        alignSelf: 'flex-start',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-2)',
                                        borderRadius: '9px',
                                        padding: '8px 14px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        width: isMobile ? '100%' : undefined,
                                      }}
                                    >
                                      {devis.follow_up_disabled ? 'Relances désactivées' : 'Désactiver les relances'}
                                    </button>
                                  )}
                                </div>

                                {(devis.sent || devis.statut?.startsWith('Envoy')) && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: 'var(--text-3)' }}>
                                    <span>
                                      {devis.follow_up_count ? `${devis.follow_up_count} relance(s) envoyée(s)` : 'Aucune relance envoyée'}
                                      {devis.last_follow_up_at ? ` · Dernière le ${formatDevisDate(devis.last_follow_up_at)}` : ''}
                                    </span>
                                    <span>
                                      {devis.follow_up_disabled
                                        ? 'Relances désactivées'
                                        : followupState.canFollowUp && followupState.nextFollowupAt
                                          ? followupState.shouldAutoFollowUp
                                            ? `Relance prévue : ${followupState.reason}`
                                            : `Prochaine relance prévue le ${formatDevisDate(followupState.nextFollowupAt)}`
                                          : 'Aucune relance nécessaire pour le moment'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {!devis.declined && (devis.sent || devis.statut?.startsWith('Envoy')) && (
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
                  opacity: (project.status === 'Gagné' || project.status === 'Perdu') ? 1 : 0.7,
                }}>
                  <p style={{
                    color: 'var(--text-3)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    margin: '0 0 8px',
                  }}>
                    Clôture du dossier
                  </p>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
                <button
                  onClick={() => updateStatus('Gagné')}
                  style={{
                    flex: 1,
                    background: project.status === 'Gagné'
                      ? 'rgba(21,128,61,0.25)' : 'rgba(21,128,61,0.06)',
                    border: project.status === 'Gagné' ? '1px solid #16a34a' : '1px solid rgba(22,163,74,0.4)',
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
                      ? 'rgba(220,38,38,0.2)' : 'rgba(220,38,38,0.05)',
                    border: project.status === 'Perdu' ? '1px solid #dc2626' : '1px solid rgba(220,38,38,0.35)',
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
                <AddressAutocomplete
                  value={contactForm.siteAddress}
                  onChange={(value) => setContactForm({ ...contactForm, siteAddress: value })}
                  onSelect={(selection) => setContactForm({
                    ...contactForm,
                    siteAddress: selection.address,
                    city: selection.city || contactForm.city,
                    postalCode: selection.postalCode || contactForm.postalCode,
                    latitude: selection.latitude,
                    longitude: selection.longitude,
                  })}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-1)',
                    fontSize: '14px',
                    padding: '8px',
                    marginTop: '4px',
                  }}
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
                    const res = await fetch(`/api/projects/${project.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        fields: {
                          'Client First Name': contactForm.clientFirstName,
                          'Client Name': contactForm.clientName,
                          'Client Phone': contactForm.clientPhone,
                          'Client Email': contactForm.clientEmail,
                          'Site Address': contactForm.siteAddress,
                          City: contactForm.city,
                          'Postal Code': contactForm.postalCode,
                          ...(contactForm.latitude !== null ? { Latitude: contactForm.latitude } : {}),
                          ...(contactForm.longitude !== null ? { Longitude: contactForm.longitude } : {}),
                        },
                      }),
                    });
                    const data = await res.json();
                    if (!data.success) {
                      throw new Error(data.error || 'Erreur lors de la sauvegarde');
                    }
                    Object.assign(project, {
                      clientFirstName: contactForm.clientFirstName,
                      clientName: contactForm.clientName,
                      clientPhone: contactForm.clientPhone,
                      clientEmail: contactForm.clientEmail,
                      siteAddress: contactForm.siteAddress,
                      city: contactForm.city,
                      postalCode: contactForm.postalCode,
                      latitude: contactForm.latitude,
                      longitude: contactForm.longitude,
                    });
                    setEditingContact(false);
                    window.location.reload();
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

