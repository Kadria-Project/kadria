'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject, updateProject, getProjectActivity } from '@/src/lib/api';
import AuthGuard from '@/src/components/AuthGuard';
import { Button } from '@/src/components/ui/button';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText as FileTextIcon,
  Lock,
  Plus,
  Search,
} from 'lucide-react';
import { UpgradeModal } from '@/src/components/FeatureGate';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { hasFeature, normalizePlan, type PlanFeatureKey, type PlanKey } from '@/src/lib/plans';
import { haversineDistanceKm, calculateTravelCost, calculateTravelFeeRecommendation, type VehicleType, type ChargingType } from '@/src/config/travel';
import { getBestFollowUpTime, getIdealActionLabel, shouldShowIdealFollowUp } from '@/src/lib/commercial-actions';
import { getQuoteFollowupState } from '@/src/lib/quote-followup';
import { getProjectCommercialAnalysis, buildTravelCostSignal, type NextActionType } from '@/src/lib/project-scoring';
import { getQuoteSuggestions, buildQuoteDraftPayload, getQuoteDraftStorageKey, getMatchedQuoteTemplateName, type ArtisanServiceCatalogItem, type ArtisanQuoteTemplate, type QuoteSuggestionLine } from '@/src/lib/quote-suggestions';
import { matchProjectToServices, type ServiceMatcherBusinessProfile, type ServiceMatcherServiceProfile, type ServiceMatchResult } from '@/src/lib/service-matcher';
import { computeNextAction } from '@/src/lib/action-engine';

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

const quickActionButtonStyle: CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '999px',
  padding: '5px 12px',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-2)',
  cursor: 'pointer',
};

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
  // --- Rendez-vous assisté (Google Calendar) ---
  const [appointment, setAppointment] = useState<{
    id: string;
    start: string;
    end: string;
    location: string | null;
    status: string;
  } | null>(null);
  const [loadingAppointment, setLoadingAppointment] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentSlots, setAppointmentSlots] = useState<Array<{ start: string; end: string }>>([]);
  const [appointmentConnected, setAppointmentConnected] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<{ start: string; end: string } | null>(null);
  const [appointmentError, setAppointmentError] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<string>('');

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
  const canTravelCost = hasFeature(plan, 'travelCost');
  const openUpgradeModal = (feature: PlanFeatureKey) => setUpgradeFeature(feature);

  const [showAllHistory, setShowAllHistory] = useState(false);

  const [artisanConfig, setArtisanConfig] = useState<{
    siret?: string;
    raisonSociale?: string;
    adressePro?: string;
    address?: string;
    assuranceNonRequise?: boolean;
    assureur?: string;
    numAssurance?: string;
    trades?: string[];
    travelConfig?: {
      vehicleType?: string;
      consumptionPer100Km?: number;
      chargingType?: string;
      customCostPerKm?: number;
      originAddress?: string;
      originLat?: number;
      originLng?: number;
      minimumTravelFee?: number;
      freeTravelRadiusKm?: number;
    };
    businessConfig?: {
      acceptedWorkTypes?: string[];
      refusedWorkTypes?: string[];
      customAcceptedWork?: string;
      customRefusedWork?: string;
      serviceCatalog?: ArtisanServiceCatalogItem[];
      quoteTemplates?: ArtisanQuoteTemplate[];
    };
  } | null>(null);
  const [businessProfile, setBusinessProfile] = useState<ServiceMatcherBusinessProfile | null>(null);
  const [serviceProfiles, setServiceProfiles] = useState<ServiceMatcherServiceProfile[]>([]);

  const [devisList, setDevisList] = useState<DevisListItem[]>([]);
  const [followUpToast, setFollowUpToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [followingUpDevisId, setFollowingUpDevisId] = useState<string | null>(null);
  useEffect(() => {
    if (!followUpToast) return;
    const timeout = window.setTimeout(() => setFollowUpToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [followUpToast]);

  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionSearch, setSuggestionSearch] = useState('');
  const [selectedSuggestionLabels, setSelectedSuggestionLabels] = useState<Set<string>>(new Set());
  const [closedSuggestionCategories, setClosedSuggestionCategories] = useState<Set<string>>(new Set());


  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Accordéons de la fiche projet mobile native (détails secondaires repliés).
  const [openMobileSections, setOpenMobileSections] = useState<Set<string>>(new Set());
  function toggleMobileSection(key: string) {
    setOpenMobileSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
    async function loadAppointment() {
      if (!id) return;
      setLoadingAppointment(true);
      try {
        const res = await fetch(`/api/appointments/by-project?projectId=${id}`);
        const data = await res.json();
        if (data.success) setAppointment(data.appointment || null);
      } catch {
        // silencieux : l'absence de RDV n'est pas une erreur bloquante
      } finally {
        setLoadingAppointment(false);
      }
    }

    loadAppointment();
  }, [id]);

  useEffect(() => {
    fetch('/api/artisan/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setArtisanConfig(data.config);
      })
      .catch(() => {});
  }, []);

  // Référentiel métier (profil métier + profils de prestations) : utilisé
  // uniquement pour enrichir les suggestions de lignes de devis ci-dessous,
  // jamais pour le chat, le vocal ou l'Action Engine à ce stade.
  useEffect(() => {
    fetch('/api/artisan/business-profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setBusinessProfile(data.profile || null);
      })
      .catch(() => {});

    fetch('/api/artisan/service-profiles')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setServiceProfiles(data.profiles || []);
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

  async function archiveProject() {
    const confirmed = window.confirm(
      'Archiver ce dossier ? Il restera disponible dans l’historique client mais ne sera plus affiché dans les actions prioritaires.',
    );
    if (!confirmed) return;

    try {
      setUpdating(true);

      const data = await updateProject(id, { leadStatus: 'archived' });

      if (data.success) {
        setProject(data.project);
        await loadActivities();
      }
    } catch (error) {
      console.error('ARCHIVE_PROJECT_ERROR', error);
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

  async function fetchAppointmentSlots(date?: string) {
    setLoadingSlots(true);
    setAppointmentError(null);
    try {
      const url = date
        ? `/api/appointments/availability?projectId=${project.id}&date=${date}`
        : `/api/appointments/availability?projectId=${project.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) {
        setAppointmentError('Erreur Google Calendar — réessayez.');
        setAppointmentConnected(true);
        setAppointmentSlots([]);
        return;
      }
      setAppointmentConnected(!!data.connected);
      setAppointmentSlots(data.connected ? data.slots || [] : []);
    } catch {
      setAppointmentError('Erreur Google Calendar — réessayez.');
    } finally {
      setLoadingSlots(false);
    }
  }

  function openAppointmentModal() {
    setAppointmentDate('');
    setBookingSlot(null);
    setShowAppointmentModal(true);
    fetchAppointmentSlots();
  }

  function handleAppointmentDateChange(date: string) {
    setAppointmentDate(date);
    setBookingSlot(null);
    fetchAppointmentSlots(date || undefined);
  }

  async function refreshAppointmentSlots() {
    await fetchAppointmentSlots(appointmentDate || undefined);
  }

  async function confirmAppointment() {
    if (!bookingSlot) return;
    setAppointmentError(null);
    try {
      const res = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          start: bookingSlot.start,
          end: bookingSlot.end,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.error === 'slot_unavailable') {
          setAppointmentError('Créneau indisponible entre-temps.');
          setBookingSlot(null);
          await refreshAppointmentSlots();
        } else {
          setAppointmentError('Erreur Google Calendar — réessayez.');
        }
        return;
      }
      setAppointment(data.appointment);
      setShowAppointmentModal(false);
      setBookingSlot(null);
    } catch {
      setAppointmentError('Erreur Google Calendar — réessayez.');
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

  // Signal frais de deplacement pour l'Analyse Kadria : reprend les memes
  // helpers que la card "Frais de deplacement estimes" ci-dessous. Ne rien
  // produire si la feature est verrouillee (plan) ou si une donnee
  // necessaire manque (coordonnees, motorisation...) — comportement de
  // scoring identique a avant dans ce cas.
  const travelCostSignal = (() => {
    if (!canTravelCost) return undefined;
    const travelConfig = artisanConfig?.travelConfig;
    const originLat = travelConfig?.originLat;
    const originLng = travelConfig?.originLng;
    const destLat = project?.latitude;
    const destLng = project?.longitude;
    if (originLat === undefined || originLng === undefined) return undefined;
    if (destLat === null || destLat === undefined || destLng === null || destLng === undefined) return undefined;
    if (!travelConfig?.vehicleType) return undefined;

    const distanceKm = haversineDistanceKm(originLat, originLng, destLat, destLng);
    const result = calculateTravelCost(distanceKm, {
      vehicleType: travelConfig.vehicleType as VehicleType,
      consumptionPer100Km: travelConfig.consumptionPer100Km,
      chargingType: travelConfig.chargingType as ChargingType | undefined,
      customCostPerKm: travelConfig.customCostPerKm,
    });
    if (!result) return undefined;

    const recommendation = calculateTravelFeeRecommendation({
      oneWayDistanceKm: result.distanceKm,
      estimatedCost: result.cost,
      minimumTravelFee: travelConfig.minimumTravelFee,
      freeTravelRadiusKm: travelConfig.freeTravelRadiusKm,
    });

    return buildTravelCostSignal({
      oneWayDistanceKm: result.distanceKm,
      roundTripDistanceKm: result.distanceKmAR,
      estimatedCost: result.cost,
      suggestedFee: recommendation.suggestedFee,
      isFreeZone: recommendation.isFreeZone,
    });
  })();

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
  }, {
    artisanTrades: artisanConfig?.trades ?? [],
    acceptedWorkTypes: artisanConfig?.businessConfig?.acceptedWorkTypes,
    refusedWorkTypes: artisanConfig?.businessConfig?.refusedWorkTypes,
    travelSignal: travelCostSignal,
  });
  const verdict = getVerdictDisplay(analysis.temperature, analysis.temperatureLabel);

  // Action Engine V1 : moteur de decision central, independant de cette
  // page (cf. src/lib/action-engine.ts). Ne remplace pas l'Analyse Kadria
  // ci-dessus ni les statuts existants — calcule juste "que faire maintenant".
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
    appointment: appointment ? { start: appointment.start } : null,
    latestDevis: latestDevis
      ? {
          sent: latestDevis.sent,
          accepted: latestDevis.accepted,
          declined: latestDevis.declined,
          sentAt: latestDevis.quote_sent_at || latestDevis.date_emission || null,
        }
      : null,
  });
  const NEXT_ACTION_CTA_LABEL: Record<string, string> = {
    complete_qualification: 'Compléter',
    request_photos: 'Demander photos',
    schedule_appointment: 'Planifier',
    send_quote: 'Préparer le devis',
    follow_up_quote: 'Relancer',
    schedule_intervention: 'Programmer',
    ask_review: 'Demander un avis',
    monitor: 'Consulter',
  };
  // Seuls les CTA deja reellement branches ailleurs sur cette page declenchent
  // une action ; les autres restent volontairement non destructifs (pas de
  // fausse action) tant qu'ils ne sont pas integres.
  const NEXT_ACTION_CTA_HANDLER: Partial<Record<string, () => void>> = {
    schedule_appointment: () => { if (!appointment) openAppointmentModal(); },
    follow_up_quote: () => { if (latestDevis) followUpQuote(latestDevis); },
  };

  // V1 légère "devis assisté métier" (Mission 4) : suggestions de lignes
  // calculées à la demande, jamais persistées, basées sur les mêmes signaux
  // que l'analyse Kadria ci-dessus (métier, projet, déplacement).
  const quoteSuggestionProject = {
    trade: project.trade,
    projectType: project.projectType,
    aiSummary: project.aiSummary,
    tradeAnswers: project.tradeAnswers,
    city: project.city,
    siteAddress: project.siteAddress,
  };
  const quoteSuggestionBusinessConfig = {
    acceptedWorkTypes: artisanConfig?.businessConfig?.acceptedWorkTypes,
    refusedWorkTypes: artisanConfig?.businessConfig?.refusedWorkTypes,
    serviceCatalog: artisanConfig?.businessConfig?.serviceCatalog,
    quoteTemplates: artisanConfig?.businessConfig?.quoteTemplates,
  };
  const quoteSuggestions = getQuoteSuggestions({
    project: quoteSuggestionProject,
    artisanTrades: artisanConfig?.trades,
    businessConfig: quoteSuggestionBusinessConfig,
    travel: travelCostSignal?.available
      ? {
          suggestedFee: travelCostSignal.suggestedFee,
          estimatedCost: travelCostSignal.estimatedCost,
          oneWayDistanceKm: travelCostSignal.oneWayDistanceKm,
          isFreeZone: travelCostSignal.isFreeZone,
        }
      : undefined,
  });
  // Modele suggere (Mission "quote templates", point 7) : affichage informatif
  // uniquement, jamais utilise pour generer un devis automatiquement.
  const matchedQuoteTemplateName = getMatchedQuoteTemplateName({
    project: quoteSuggestionProject,
    artisanTrades: artisanConfig?.trades,
    businessConfig: quoteSuggestionBusinessConfig,
  });

  // Référentiel métier (profil métier + profils de prestations) : suggestions
  // explicables, prioritaires sur les suggestions génériques. Si aucun
  // service ne correspond, ce tableau est vide et le comportement existant
  // (moteur générique seul) est inchangé — aucune régression.
  const serviceMatches: ServiceMatchResult[] = matchProjectToServices(
    {
      trade: project.trade,
      projectType: project.projectType,
      aiSummary: project.aiSummary,
      description: project.description,
      budget: project.budget,
      photosCount: project.photos?.length || 0,
    },
    businessProfile,
    serviceProfiles,
  );

  type ReferentialSuggestionLine = QuoteSuggestionLine & {
    fromReferential?: boolean;
    referentialConfidence?: number;
    referentialReasons?: string[];
    referentialCategory?: string | null;
  };

  const referentialSuggestions: ReferentialSuggestionLine[] = [];
  const HIGH_CONFIDENCE_THRESHOLD = 70;
  serviceMatches.forEach((match) => {
    const recommendedLines = match.recommendedQuoteLines as Array<{ label?: string; unitPriceHT?: number | null; vatRate?: number | null }>;
    const baseLabel = match.serviceProfile.name;
    const linesToAdd = recommendedLines.length > 0
      ? recommendedLines.filter((l) => l.label && l.label.trim())
      : [{ label: baseLabel, unitPriceHT: null, vatRate: match.vatRate }];

    linesToAdd.forEach((line) => {
      referentialSuggestions.push({
        label: line.label || baseLabel,
        reason: match.reasons.join(' · '),
        source: 'project',
        suggestedAmount: typeof line.unitPriceHT === 'number' ? line.unitPriceHT : undefined,
        vatRate: typeof line.vatRate === 'number' ? line.vatRate : match.vatRate ?? undefined,
        confidence: match.confidence >= HIGH_CONFIDENCE_THRESHOLD ? 'high' : match.confidence >= 40 ? 'medium' : 'low',
        fromReferential: true,
        referentialConfidence: match.confidence,
        referentialReasons: match.reasons,
        referentialCategory: match.serviceProfile.category ?? null,
      });
    });
  });

  // Référentiel métier en premier, suggestions génériques en fallback —
  // dédoublonnées par libellé (le référentiel prime en cas de doublon avec
  // une suggestion générique ou un autre profil de prestation).
  const allSuggestions: ReferentialSuggestionLine[] = [];
  {
    const seen = new Set<string>();
    for (const line of [...referentialSuggestions, ...quoteSuggestions]) {
      const key = line.label.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      allSuggestions.push(line);
    }
  }

  function getSuggestionCategory(line: { label: string; source: string }): string {
    const text = line.label.toLowerCase();
    if (text.includes('déplacement')) return 'Déplacement';
    if (text.includes("main d'œuvre") || text.includes('main d’œuvre')) return 'Main d’œuvre';
    if (text.includes('fourniture')) return 'Fournitures';
    if (text.includes('diagnostic') || text.includes('recherche')) return 'Diagnostic';
    if (text.includes('pièce')) return 'Pièces';
    if (line.source === 'template') return 'Modèle';
    if (line.source === 'trade') return 'Main d’œuvre';
    return 'Autres';
  }

  const filteredQuoteSuggestions = allSuggestions.filter((line) =>
    line.label.toLowerCase().includes(suggestionSearch.trim().toLowerCase())
  );
  const quoteSuggestionCategories: { name: string; lines: typeof allSuggestions }[] = [];
  filteredQuoteSuggestions.forEach((line) => {
    const category = (line as ReferentialSuggestionLine).fromReferential ? 'Référentiel métier' : getSuggestionCategory(line);
    let group = quoteSuggestionCategories.find((g) => g.name === category);
    if (!group) {
      group = { name: category, lines: [] };
      quoteSuggestionCategories.push(group);
    }
    group.lines.push(line);
  });
  // Le groupe "Référentiel métier" apparaît toujours en premier.
  quoteSuggestionCategories.sort((a, b) => {
    if (a.name === 'Référentiel métier') return -1;
    if (b.name === 'Référentiel métier') return 1;
    return 0;
  });

  const highConfidenceReferentialSuggestions = allSuggestions.filter(
    (l) => l.fromReferential && (l.referentialConfidence || 0) >= HIGH_CONFIDENCE_THRESHOLD,
  );
  const highConfidenceSuggestions = quoteSuggestions.filter((l) => l.confidence === 'high');
  const mediumConfidenceSuggestions = quoteSuggestions.filter((l) => l.confidence === 'medium');
  const fallbackRecommendedSuggestions = highConfidenceSuggestions.length > 0
    ? highConfidenceSuggestions
    : mediumConfidenceSuggestions;
  // "Ajouter les recommandations" ne doit jamais ajouter automatiquement les
  // suggestions génériques : si le référentiel a au moins une correspondance
  // à confiance élevée, on n'ajoute que celles-ci ; sinon on retombe sur le
  // comportement générique existant (aucune régression).
  const recommendedSuggestions = highConfidenceReferentialSuggestions.length > 0
    ? highConfidenceReferentialSuggestions
    : fallbackRecommendedSuggestions;

  function getConfidenceBadge(confidence?: 'high' | 'medium' | 'low'): { icon: string; label: string } {
    if (confidence === 'high') return { icon: '🟢', label: 'Confiance élevée' };
    if (confidence === 'medium') return { icon: '🟡', label: 'Confiance moyenne' };
    return { icon: '⚪', label: 'À vérifier' };
  }

  function addSuggestionLinesToSelection(lines: typeof quoteSuggestions) {
    if (lines.length === 0) return;
    setSelectedSuggestionLabels((prev) => {
      const next = new Set(prev);
      let added = false;
      lines.forEach((line) => {
        if (!next.has(line.label)) {
          next.add(line.label);
          added = true;
        }
      });
      if (added) {
        setFollowUpToast({
          type: 'success',
          message: lines.length === 1 ? 'Ligne ajoutée au devis' : 'Lignes ajoutées au devis',
        });
      }
      return next;
    });
  }

  const summary = getStructuredSummary(project);
  const followUpTime = getBestFollowUpTime(project);
  const showIdealFollowUp = shouldShowIdealFollowUp(project);
  const idealActionLabel = getIdealActionLabel(project, analysis.nextBestAction.type);

  function getNextActionCtaLabel(type: NextActionType): string {
    switch (type) {
      case 'call': return 'Appeler le prospect';
      case 'quote': return 'Préparer un devis';
      case 'followup': return 'Relancer';
      case 'ask_info': return 'Demander des précisions';
      case 'archive': return 'Archiver le dossier';
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
      case 'archive': {
        archiveProject();
        break;
      }
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

  function impactCardStyle(extra: Record<string, string | number> = {}): Record<string, string | number> {
    return {
      background: 'var(--impact-bg)',
      border: '1px solid var(--impact-border)',
      borderRadius: '16px',
      boxShadow: 'var(--impact-glow)',
      color: 'var(--impact-text)',
      ...extra,
    };
  }

  // Fiche projet mobile native — experience dediee terrain (pas un responsive
  // du desktop). N'utilise que des donnees reelles deja chargees plus haut
  // (project, nextAction, appointment, latestDevis, analysis, activities).
  if (isMobile) {
    const clientLabel = [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || 'Dossier';
    const hasContact = Boolean(project.clientPhone || project.clientEmail);
    const devisStatusLabel = !latestDevis
      ? 'Aucun devis'
      : latestDevis.accepted
        ? 'Devis accepté'
        : latestDevis.declined
          ? 'Devis refusé'
          : latestDevis.sent
            ? 'Devis envoyé'
            : 'Devis créé';
    const devisCtaLabel = !latestDevis ? 'Créer' : latestDevis.sent && !latestDevis.accepted && !latestDevis.declined ? 'Relancer' : 'Voir';
    const devisCtaAction = !latestDevis
      ? () => handleNextBestAction('quote')
      : latestDevis.sent && !latestDevis.accepted && !latestDevis.declined
        ? () => followUpQuote(latestDevis)
        : () => router.push(`/dashboard-v2/projet/${id}/devis/${latestDevis.id}`);

    const qualificationDone = !!(project.completenessScore || project.aiSummary);
    const devisDoneMobile = !!latestDevis;
    const mobileTimelineSteps: Array<{ label: string; detail?: string; state: 'done' | 'current' | 'todo' | 'future' }> = [
      { label: 'Demande reçue', detail: formatShortDate(project.createdAt), state: 'done' },
      { label: 'Qualification', detail: qualificationDone ? `Score ${analysis.score}/100` : undefined, state: qualificationDone ? 'done' : 'todo' },
      { label: 'Rendez-vous', detail: appointment ? formatDateTime(appointment.start) : undefined, state: appointment ? 'done' : 'todo' },
      { label: 'Devis', detail: devisDoneMobile ? `${latestDevis.numero} · ${formatMoney(latestDevis.amount)} €` : 'À envoyer', state: devisDoneMobile ? (latestDevis.accepted ? 'done' : 'current') : 'todo' },
      { label: 'Intervention', detail: 'Bientôt disponible', state: 'future' },
    ];

    const mobileAccordions: Array<{ key: string; title: string; content: ReactNode }> = [
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
                  city: project.city || '',
                  postalCode: project.postalCode || '',
                  latitude: project.latitude ?? null,
                  longitude: project.longitude ?? null,
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
          <button onClick={() => router.push('/dashboard-v2')} aria-label="Retour" style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', padding: '6px', flexShrink: 0 }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {clientLabel}
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-3)' }}>
              {project.status || 'Nouveau'} · Maturité {nextAction.maturityScore}/100
            </p>
          </div>
        </div>

        <main style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Carte Action recommandée */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', margin: '0 0 6px' }}>
              Action recommandée
            </p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 4px' }}>{nextAction.title}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 8px' }}>{nextAction.description}</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', border: '1px solid var(--border)', color: nextAction.priority === 'critical' ? '#dc2626' : nextAction.priority === 'high' ? '#ea580c' : 'var(--text-2)' }}>
                Priorité {nextAction.priority === 'critical' ? 'critique' : nextAction.priority === 'high' ? 'haute' : nextAction.priority === 'medium' ? 'moyenne' : 'basse'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>~{nextAction.estimatedDuration}</span>
            </div>
            <button
              onClick={() => NEXT_ACTION_CTA_HANDLER[nextAction.actionType]?.()}
              disabled={!NEXT_ACTION_CTA_HANDLER[nextAction.actionType]}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                background: NEXT_ACTION_CTA_HANDLER[nextAction.actionType] ? 'var(--accent)' : 'var(--bg)',
                color: NEXT_ACTION_CTA_HANDLER[nextAction.actionType] ? '#fff' : 'var(--text-3)',
                border: NEXT_ACTION_CTA_HANDLER[nextAction.actionType] ? 'none' : '1px solid var(--border)',
                opacity: NEXT_ACTION_CTA_HANDLER[nextAction.actionType] ? 1 : 0.7,
              }}
            >
              {NEXT_ACTION_CTA_LABEL[nextAction.actionType] || 'Consulter'}
            </button>
          </div>

          {/* Résumé IA court */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', fontSize: '13px', color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>Résumé</p>
            <p style={{ margin: 0 }}>Besoin : {project.projectType || project.trade || 'Non renseigné'}</p>
            <p style={{ margin: 0 }}>Urgence : {project.desiredTimeline || 'Non renseignée'}</p>
            <p style={{ margin: 0 }}>Budget : {project.budget || 'Non renseigné'}</p>
            <p style={{ margin: 0 }}>Localisation : {project.siteAddress || project.city || 'Non renseignée'}</p>
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
              { label: '📅 RDV', disabled: !!appointment, onClick: () => { if (!appointment) openAppointmentModal(); } },
              { label: '📄 Devis', disabled: false, onClick: devisCtaAction },
              { label: '🔁 Relancer', disabled: !latestDevis && !project.clientPhone, onClick: () => handleNextBestAction(latestDevis ? 'followup' : 'call') },
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
            {loadingAppointment ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-3)' }}>Chargement...</p>
            ) : appointment ? (
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{formatDateTime(appointment.start)}</p>
                {appointment.location && <p style={{ margin: '0 0 2px', fontSize: '12px', color: 'var(--text-2)' }}>📍 {appointment.location}</p>}
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--accent)' }}>✓ Synchronisé Google Calendar</p>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-2)' }}>Aucun rendez-vous</p>
                <button onClick={openAppointmentModal} style={{ background: 'var(--accent)', border: 'none', color: '#fff', fontWeight: 600, borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}>
                  Planifier
                </button>
              </div>
            )}
          </div>

          {/* Devis */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>Devis</p>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-1)', fontWeight: 600 }}>{devisStatusLabel}</p>
            {latestDevis && <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--text-2)' }}>{formatMoney(latestDevis.amount)} €</p>}
            <button onClick={devisCtaAction} style={{ background: 'var(--accent)', border: 'none', color: '#fff', fontWeight: 600, borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}>
              {devisCtaLabel}
            </button>
          </div>

          {/* Timeline condensée */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>Parcours</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mobileTimelineSteps.map((step, i) => {
                const icon = step.state === 'done' ? '✓' : step.state === 'current' ? '●' : '○';
                const color = step.state === 'done' ? 'var(--accent)' : step.state === 'current' ? 'var(--text-1)' : step.state === 'future' ? 'var(--text-3)' : 'var(--text-2)';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', opacity: step.state === 'future' ? 0.5 : 1 }}>
                    <span style={{ color, fontSize: '12px', fontWeight: 700, width: '14px', flexShrink: 0 }}>{icon}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: step.state === 'current' ? 'var(--text-1)' : color }}>{step.label}</p>
                      {step.detail && <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-3)' }}>{step.detail}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
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
            disabled={!!appointment}
            onClick={() => { if (!appointment) openAppointmentModal(); }}
            style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: appointment ? 'var(--text-3)' : 'var(--text-1)', fontSize: '13px', fontWeight: 700, opacity: appointment ? 0.5 : 1 }}
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

        {showAppointmentModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[var(--text-1)] font-bold text-lg">📅 Planifier un rendez-vous</h2>
                <button
                  onClick={() => { setShowAppointmentModal(false); setBookingSlot(null); setAppointmentError(null); }}
                  className="text-[var(--text-2)] hover:text-[var(--text-1)]"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-2)] uppercase tracking-wide mb-1">
                  Choisir une date
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => handleAppointmentDateChange(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-1)]"
                />
              </div>

              <div>
                <p className="text-xs text-[var(--text-2)] uppercase tracking-wide mb-2">Créneaux disponibles</p>

                {loadingSlots ? (
                  <p className="text-sm text-[var(--text-2)]">Recherche de créneaux disponibles...</p>
                ) : !appointmentConnected ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
                    <p className="text-sm text-[var(--text-2)]">Connecter votre agenda débloquera des rendez-vous synchronisés et un planning fiable.</p>
                    <a href="/dashboard-v2" className="text-sm font-semibold text-[var(--accent)] whitespace-nowrap">Connecter Google Calendar</a>
                  </div>
                ) : appointmentError ? (
                  <p className="text-sm text-red-400">{appointmentError}</p>
                ) : appointmentSlots.length === 0 ? (
                  <p className="text-sm text-[var(--text-2)]">
                    {appointmentDate ? 'Aucun créneau disponible ce jour.' : 'Aucun créneau disponible'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {appointmentSlots.map((slot) => (
                      <button
                        key={slot.start}
                        onClick={() => setBookingSlot(slot)}
                        className={`w-full text-left rounded-lg border p-2 text-sm ${
                          bookingSlot?.start === slot.start
                            ? 'border-green-500 bg-green-500/10 text-[var(--text-1)]'
                            : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)]'
                        }`}
                      >
                        {formatDateTime(slot.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {appointmentConnected && appointmentSlots.length > 0 && (
                <button
                  onClick={confirmAppointment}
                  disabled={!bookingSlot}
                  className="w-full bg-green-500 text-black font-bold rounded-lg px-4 py-2 disabled:opacity-50"
                >
                  Confirmer le rendez-vous
                </button>
              )}
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

        {/* Action recommandée — sortie minimale de l'Action Engine (src/lib/action-engine.ts) */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Action recommandée
            </p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', margin: '0 0 2px' }}>
              {nextAction.title}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 6px' }}>
              {nextAction.description}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid var(--border)',
                color: nextAction.priority === 'critical' ? '#dc2626' : nextAction.priority === 'high' ? '#ea580c' : 'var(--text-2)',
              }}>
                Priorité {nextAction.priority === 'critical' ? 'critique' : nextAction.priority === 'high' ? 'haute' : nextAction.priority === 'medium' ? 'moyenne' : 'basse'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                Impact {nextAction.impact === 'high' ? 'fort' : nextAction.impact === 'medium' ? 'moyen' : 'faible'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                ~{nextAction.estimatedDuration}
              </span>
            </div>
            {nextAction.blockingReasons.length > 0 && (
              <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '6px 0 0' }}>
                Blocages : {nextAction.blockingReasons.join(' · ')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => NEXT_ACTION_CTA_HANDLER[nextAction.actionType]?.()}
            disabled={!NEXT_ACTION_CTA_HANDLER[nextAction.actionType]}
            title={!NEXT_ACTION_CTA_HANDLER[nextAction.actionType] ? 'Action pas encore disponible depuis cette carte' : undefined}
            style={{
              flexShrink: 0,
              background: NEXT_ACTION_CTA_HANDLER[nextAction.actionType] ? 'var(--accent)' : 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: NEXT_ACTION_CTA_HANDLER[nextAction.actionType] ? '#fff' : 'var(--text-3)',
              cursor: NEXT_ACTION_CTA_HANDLER[nextAction.actionType] ? 'pointer' : 'not-allowed',
              opacity: NEXT_ACTION_CTA_HANDLER[nextAction.actionType] ? 1 : 0.6,
              width: isMobile ? '100%' : undefined,
            }}
          >
            {NEXT_ACTION_CTA_LABEL[nextAction.actionType] || 'Consulter'}
          </button>
        </div>

        {/* Centre d'actions — les actions prioritaires du dossier, toujours visibles en haut */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
          gap: '10px',
          marginBottom: '16px',
        }}>
          {/* Rendez-vous */}
          <button
            onClick={() => {
              if (!appointment) openAppointmentModal();
            }}
            disabled={!!appointment}
            style={{
              background: 'var(--bg-elevated)',
              border: appointment ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'left',
              cursor: appointment ? 'default' : 'pointer',
            }}
          >
            <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              📅 Rendez-vous
            </p>
            <p style={{ fontSize: '13px', color: appointment ? 'var(--accent)' : 'var(--text-1)', fontWeight: 600, margin: 0 }}>
              {loadingAppointment ? 'Chargement...' : appointment ? formatDateTime(appointment.start) : 'Planifier un rendez-vous'}
            </p>
          </button>

          {/* Relance */}
          <button
            onClick={() => handleNextBestAction(latestDevis ? 'followup' : 'call')}
            disabled={!latestDevis && !project.clientPhone}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'left',
              cursor: (latestDevis || project.clientPhone) ? 'pointer' : 'not-allowed',
              opacity: (latestDevis || project.clientPhone) ? 1 : 0.5,
            }}
          >
            <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              📞 Relance
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 600, margin: 0 }}>
              Relancer le client
            </p>
          </button>

          {/* Devis */}
          <button
            onClick={() => handleNextBestAction('quote')}
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
              📄 Devis
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 600, margin: 0 }}>
              {latestDevis ? 'Voir / relancer le devis' : 'Préparer un devis'}
            </p>
          </button>

          {/* Intervention — pas de donnée réelle aujourd'hui, affiché honnêtement comme futur */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '14px',
            opacity: 0.55,
          }}>
            <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              🛠️ Intervention
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', fontWeight: 600, margin: 0 }}>
              Bientôt disponible
            </p>
          </div>
        </div>

        {/* Timeline intelligente — uniquement des étapes appuyées sur des données réelles du dossier */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: isMobile ? '16px' : '16px 20px',
          marginBottom: '16px',
        }}>
          <p style={{
            color: 'var(--text-3)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 12px',
          }}>
            Parcours du dossier
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(() => {
              const qualificationDone = !!(project.completenessScore || project.aiSummary);
              const devisDone = !!latestDevis;
              const steps: Array<{ label: string; detail?: string; state: 'done' | 'current' | 'todo' | 'future' }> = [
                { label: 'Demande reçue', detail: formatShortDate(project.createdAt), state: 'done' },
                { label: 'Qualification IA', detail: qualificationDone ? `Score ${analysis.score}/100` : undefined, state: qualificationDone ? 'done' : 'todo' },
                {
                  label: 'Rendez-vous',
                  detail: appointment ? formatDateTime(appointment.start) : undefined,
                  state: appointment ? 'done' : 'todo',
                },
                {
                  label: idealActionLabel.title || analysis.nextBestAction.label,
                  detail: project.leadStatus === 'archived' ? 'Dossier archivé' : analysis.recommendation,
                  state: project.leadStatus === 'archived' || analysis.nextBestAction.type === 'wait' ? 'todo' : 'current',
                },
                {
                  label: 'Devis',
                  detail: devisDone ? `${latestDevis.numero} · ${formatMoney(latestDevis.amount)} €` : 'À envoyer',
                  state: devisDone ? (latestDevis.accepted ? 'done' : 'current') : 'todo',
                },
                { label: 'Intervention', detail: 'Bientôt disponible', state: 'future' },
                { label: 'Facturation', detail: 'Bientôt disponible', state: 'future' },
                { label: "Demande d'avis Google", detail: 'Bientôt disponible', state: 'future' },
              ];
              return steps.map((step, i) => {
                const icon = step.state === 'done' ? '✓' : step.state === 'current' ? '●' : '○';
                const color = step.state === 'done'
                  ? 'var(--accent)'
                  : step.state === 'current'
                    ? 'var(--text-1)'
                    : step.state === 'future'
                      ? 'var(--text-3)'
                      : 'var(--text-2)';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: step.state === 'future' ? 0.55 : 1 }}>
                    <span style={{ color, fontSize: '13px', fontWeight: 700, width: '16px', flexShrink: 0 }}>{icon}</span>
                    <div>
                      <p style={{ color: step.state === 'current' ? 'var(--text-1)' : color, fontSize: '13px', fontWeight: step.state === 'current' ? 700 : 600, margin: 0 }}>
                        {step.label}
                      </p>
                      {step.detail && (
                        <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '2px 0 0' }}>
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-elevated)',
          border: analysis.temperature === 'hot' ? '1px solid rgba(34,197,94,0.18)' : '1px solid var(--border)',
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
              <span style={{ fontSize: '16px', color: 'var(--accent)' }}>✦</span>
              <span style={{
                color: 'var(--text-1)',
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

          {/* Correspondance métier — basé sur les métiers déclarés dans les paramètres */}
          {analysis.tradeFit && (
            <div style={{
              padding: isMobile ? '10px 16px' : '10px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '20px',
                background: analysis.tradeFit.status === 'good'
                  ? 'rgba(34, 197, 94, 0.12)'
                  : analysis.tradeFit.status === 'poor'
                    ? 'rgba(249, 115, 22, 0.12)'
                    : 'var(--bg-hover)',
                color: analysis.tradeFit.status === 'good'
                  ? 'rgb(34, 197, 94)'
                  : analysis.tradeFit.status === 'poor'
                    ? 'rgb(249, 115, 22)'
                    : 'var(--text-2)',
              }}>
                {analysis.tradeFit.label}
              </span>
              <span style={{ color: 'var(--text-3)', fontSize: '11px' }}>
                Basé sur les métiers déclarés dans vos paramètres.
              </span>
            </div>
          )}

          {/* Recommandation principale + CTA */}
          <div style={{
            padding: isMobile ? '14px 16px' : '14px 20px',
            background: 'var(--bg-hover)',
            borderLeft: '2px solid var(--accent)',
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
            {project.leadStatus === 'archived' ? (
              <span style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                📁 Dossier archivé
              </span>
            ) : analysis.nextBestAction.type !== 'wait' && (
              <button
                onClick={() => handleNextBestAction(analysis.nextBestAction.type)}
                disabled={updating}
                style={{
                  background: 'var(--accent)',
                  color: 'black',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: updating ? 'not-allowed' : 'pointer',
                  opacity: updating ? 0.6 : 1,
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
              color: 'var(--text-3)',
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

        {/* Frais de déplacement estimés — plan Performance et supérieur */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: isMobile ? '16px' : '16px 20px',
          marginTop: '16px',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '16px' }}>🚗</span>
            <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '14px' }}>
              Frais de déplacement estimés
            </span>
          </div>
          {!canTravelCost ? (
            <div style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none' }}>
              <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
                Distance aller, aller-retour et coût de déplacement estimé (vol d&apos;oiseau).
              </p>
            </div>
          ) : (() => {
            const travelConfig = artisanConfig?.travelConfig;
            const originAddress = travelConfig?.originAddress || artisanConfig?.address;
            const originLat = travelConfig?.originLat;
            const originLng = travelConfig?.originLng;
            const siteAddress = project?.siteAddress;
            const destLat = project?.latitude;
            const destLng = project?.longitude;

            // Cas 1 : adresse artisan absente
            if (!originAddress) {
              return (
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
                  Adresse professionnelle manquante dans vos paramètres.
                </p>
              );
            }
            // Cas 2 : adresse artisan présente mais coordonnées absentes
            if (originLat === undefined || originLng === undefined) {
              return (
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
                  Adresse professionnelle renseignée, mais non géocodée. Sélectionnez-la via l&apos;autocomplete dans Paramètres.
                </p>
              );
            }
            // Cas 3 : adresse chantier absente
            if (!siteAddress) {
              return (
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
                  Adresse chantier manquante sur le dossier.
                </p>
              );
            }
            // Cas 4 : adresse chantier présente mais coordonnées absentes
            if (destLat === null || destLat === undefined || destLng === null || destLng === undefined) {
              return (
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
                  Adresse chantier renseignée, mais coordonnées GPS manquantes. Les nouveaux dossiers doivent utiliser l&apos;adresse suggérée par l&apos;autocomplete.
                </p>
              );
            }
            if (!travelConfig?.vehicleType) {
              return (
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
                  Motorisation non renseignée dans vos paramètres.
                </p>
              );
            }
            const distanceKm = haversineDistanceKm(originLat, originLng, destLat, destLng);
            const result = calculateTravelCost(distanceKm, {
              vehicleType: travelConfig.vehicleType as VehicleType,
              consumptionPer100Km: travelConfig.consumptionPer100Km,
              chargingType: travelConfig.chargingType as ChargingType | undefined,
              customCostPerKm: travelConfig.customCostPerKm,
            });
            if (!result) {
              return (
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
                  Impossible de calculer le déplacement.
                </p>
              );
            }
            const recommendation = calculateTravelFeeRecommendation({
              oneWayDistanceKm: result.distanceKm,
              estimatedCost: result.cost,
              minimumTravelFee: travelConfig.minimumTravelFee,
              freeTravelRadiusKm: travelConfig.freeTravelRadiusKm,
            });
            return (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <p style={{ color: 'var(--text-3)', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 2px' }}>Distance aller</p>
                    <p style={{ color: 'var(--text-1)', fontSize: '15px', fontWeight: 600, margin: 0 }}>{result.distanceKm.toFixed(1)} km</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-3)', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 2px' }}>Distance aller-retour</p>
                    <p style={{ color: 'var(--text-1)', fontSize: '15px', fontWeight: 600, margin: 0 }}>{result.distanceKmAR.toFixed(1)} km</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-3)', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 2px' }}>Coût estimé ({result.energyLabel})</p>
                    <p style={{ color: 'var(--accent)', fontSize: '15px', fontWeight: 700, margin: 0 }}>{result.cost.toFixed(2)} €</p>
                  </div>
                </div>
                <p style={{ color: 'var(--text-3)', fontSize: '11px', margin: '10px 0 0', fontStyle: 'italic' }}>
                  Distance géographique majorée de 10 %.
                </p>
                <div style={{ marginTop: '10px', padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <p style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700, margin: '0 0 2px' }}>
                    {recommendation.label}
                  </p>
                  <p style={{ color: 'var(--text-2)', fontSize: '12px', margin: 0 }}>
                    {recommendation.isFreeZone
                      ? 'Le chantier est dans votre zone proche. Aucun frais de déplacement spécifique n’est suggéré.'
                      : recommendation.reason}
                  </p>
                  {(travelConfig.minimumTravelFee !== undefined || travelConfig.freeTravelRadiusKm !== undefined) && (
                    <p style={{ color: 'var(--text-3)', fontSize: '11px', margin: '4px 0 0' }}>
                      {travelConfig.minimumTravelFee !== undefined && `Frais minimum : ${travelConfig.minimumTravelFee} €`}
                      {travelConfig.minimumTravelFee !== undefined && travelConfig.freeTravelRadiusKm !== undefined && ' · '}
                      {travelConfig.freeTravelRadiusKm !== undefined && `Zone sans frais : ${travelConfig.freeTravelRadiusKm} km`}
                    </p>
                  )}
                </div>
              </>
            );
          })()}
          {!canTravelCost && (
            <button
              onClick={() => openUpgradeModal('travelCost')}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--accent)',
              }}>
                Disponible avec Performance
              </span>
            </button>
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
                      style={
                        devis.accepted
                          ? {
                              ...impactCardStyle(),
                              padding: isMobile ? '14px 16px' : '14px 20px',
                              cursor: 'pointer',
                              marginTop: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              transition: 'transform 150ms',
                            }
                          : {
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
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!devis.accepted) e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        if (!devis.accepted) e.currentTarget.style.borderColor = 'var(--border)';
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

                {allSuggestions.length > 0 && (
                  <div style={{
                    borderTop: '1px solid var(--border)',
                    marginTop: '12px',
                    paddingTop: '14px',
                  }}>
                    <button
                      type="button"
                      onClick={() => setSuggestionsOpen((v) => !v)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {suggestionsOpen ? '▼' : '▶'} Suggestions de lignes de devis
                          {highConfidenceSuggestions.length > 0 && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--accent)',
                              border: '1px solid var(--border)',
                              borderRadius: '999px',
                              padding: '1px 8px',
                            }}>
                              {highConfidenceSuggestions.length} recommandation{highConfidenceSuggestions.length > 1 ? 's' : ''} forte{highConfidenceSuggestions.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                          Kadria vous propose des lignes adaptées au projet.
                        </span>
                      </span>
                      <ChevronDown
                        size={16}
                        style={{
                          color: 'var(--text-3)',
                          transform: suggestionsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.15s ease',
                          flexShrink: 0,
                        }}
                      />
                    </button>

                    {suggestionsOpen && (
                      <div style={{ marginTop: '12px' }}>
                        {matchedQuoteTemplateName && (
                          <p style={{ fontSize: '12px', color: 'var(--accent)', margin: '0 0 8px', fontWeight: 600 }}>
                            Modèle suggéré : {matchedQuoteTemplateName}
                          </p>
                        )}
                        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 10px' }}>
                          Kadria a identifié les prestations les plus probables pour ce chantier.
                        </p>

                        {serviceProfiles.length === 0 && (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px',
                            padding: '8px 10px', marginBottom: '10px', flexWrap: 'wrap',
                          }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                              Configurer cette étape débloquera des suggestions personnalisées et des devis préremplis.
                            </span>
                            <a
                              href="/parametres/profil-metier"
                              style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}
                            >
                              Configurer mon métier
                            </a>
                          </div>
                        )}

                        <div style={{ position: 'relative', marginBottom: '10px' }}>
                          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                          <input
                            type="text"
                            value={suggestionSearch}
                            onChange={(e) => setSuggestionSearch(e.target.value)}
                            placeholder="Rechercher une prestation..."
                            style={{
                              width: '100%',
                              padding: '7px 10px 7px 30px',
                              fontSize: '12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-1)',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                          <button
                            type="button"
                            onClick={() => addSuggestionLinesToSelection(recommendedSuggestions)}
                            style={quickActionButtonStyle}
                          >
                            Ajouter les recommandations
                          </button>
                          <button
                            type="button"
                            onClick={() => addSuggestionLinesToSelection(filteredQuoteSuggestions)}
                            style={quickActionButtonStyle}
                          >
                            Tout ajouter
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSuggestionLabels(new Set())}
                            style={quickActionButtonStyle}
                          >
                            Tout retirer
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {quoteSuggestionCategories.map((category) => {
                            const isClosed = closedSuggestionCategories.has(category.name);
                            return (
                              <div key={category.name}>
                                <button
                                  type="button"
                                  onClick={() => setClosedSuggestionCategories((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(category.name)) next.delete(category.name);
                                    else next.add(category.name);
                                    return next;
                                  })}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '2px 0',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: 'var(--text-2)',
                                  }}
                                >
                                  <ChevronDown
                                    size={12}
                                    style={{ transform: isClosed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
                                  />
                                  {category.name}
                                  <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({category.lines.length})</span>
                                </button>
                                {!isClosed && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '4px' }}>
                                    {category.lines.map((line, index) => {
                                      const isSelected = selectedSuggestionLabels.has(line.label);
                                      return (
                                        <div
                                          key={`${line.label}-${index}`}
                                          title={line.reason}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '8px',
                                            background: isSelected ? 'var(--accent-soft, var(--bg-elevated))' : 'var(--bg-elevated)',
                                            border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                            borderRadius: '8px',
                                            padding: '6px 10px',
                                            fontSize: '12px',
                                            transition: 'border-color 0.15s ease, background 0.15s ease',
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                            <button
                                              type="button"
                                              onClick={() => addSuggestionLinesToSelection([line])}
                                              disabled={isSelected}
                                              aria-label={isSelected ? 'Ligne déjà ajoutée' : 'Ajouter la ligne'}
                                              style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '6px',
                                                border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                                background: isSelected ? 'var(--accent)' : 'transparent',
                                                color: isSelected ? '#fff' : 'var(--text-2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: isSelected ? 'default' : 'pointer',
                                                flexShrink: 0,
                                                padding: 0,
                                              }}
                                            >
                                              {isSelected ? <Check size={12} /> : <Plus size={12} />}
                                            </button>
                                            <span style={{ color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {line.label}
                                            </span>
                                            {(line as ReferentialSuggestionLine).fromReferential && (
                                              <span
                                                title={((line as ReferentialSuggestionLine).referentialReasons || []).join(' · ')}
                                                style={{
                                                  fontSize: '10px',
                                                  fontWeight: 600,
                                                  color: 'var(--accent)',
                                                  border: '1px solid var(--accent)',
                                                  borderRadius: '999px',
                                                  padding: '1px 6px',
                                                  flexShrink: 0,
                                                  whiteSpace: 'nowrap',
                                                }}
                                              >
                                                Référentiel métier · {(line as ReferentialSuggestionLine).referentialConfidence}%
                                              </span>
                                            )}
                                            <span style={{
                                              fontSize: '10px',
                                              color: 'var(--text-3)',
                                              border: '1px solid var(--border)',
                                              borderRadius: '999px',
                                              padding: '1px 6px',
                                              flexShrink: 0,
                                              whiteSpace: 'nowrap',
                                            }}>
                                              {getConfidenceBadge(line.confidence).icon} {getConfidenceBadge(line.confidence).label}
                                            </span>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            {line.suggestedAmount !== undefined && (
                                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                                                {formatInteger(line.suggestedAmount)} € HT
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => {
                            if (!canQuote) {
                              openUpgradeModal('quoteGeneration');
                              return;
                            }
                            if (!legalComplete) return;
                            const linesToUse = selectedSuggestionLabels.size > 0
                              ? allSuggestions.filter((l) => selectedSuggestionLabels.has(l.label))
                              : allSuggestions;
                            try {
                              sessionStorage.setItem(
                                getQuoteDraftStorageKey(id as string),
                                JSON.stringify(buildQuoteDraftPayload(linesToUse, matchedQuoteTemplateName)),
                              );
                            } catch {
                              // sessionStorage indisponible : pas bloquant, le formulaire s'ouvrira vide.
                            }
                            router.push(`/dashboard-v2/projet/${id}/devis/new`);
                          }}
                          disabled={!legalComplete && canQuote}
                          title={!legalComplete ? 'Complétez vos infos légales d\'abord' : undefined}
                          style={{
                            marginTop: '12px',
                            width: '100%',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-2)',
                            cursor: !canQuote || legalComplete ? 'pointer' : 'not-allowed',
                            opacity: !canQuote || legalComplete ? 1 : 0.4,
                          }}
                        >
                          {!canQuote && <Lock size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
                          Utiliser ces suggestions dans un devis
                        </button>
                      </div>
                    )}
                  </div>
                )}

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

        </div>

        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '16px',
        }}>
          <div style={{
            padding: isMobile ? '16px' : '16px 20px',
            borderBottom: '1px solid var(--border)',
          }}>
            <h2 style={{ color: 'var(--text-1)', fontSize: '15px', fontWeight: 600, margin: 0 }}>
              Rendez-vous
            </h2>
          </div>

          <div style={{ padding: isMobile ? '16px' : '16px 20px' }}>
            {loadingAppointment ? (
              <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>Chargement...</p>
            ) : appointment ? (
              <div>
                <p style={{ color: 'var(--text-1)', fontSize: '14px', margin: '0 0 4px', fontWeight: 600 }}>
                  {formatDateTime(appointment.start)}
                </p>
                {appointment.location && (
                  <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: '0 0 4px' }}>
                    📍 {appointment.location}
                  </p>
                )}
                <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '0 0 8px' }}>
                  Statut : {appointment.status}
                </p>
                <p style={{ color: 'var(--accent)', fontSize: '12px', margin: 0 }}>
                  ✓ Synchronisé Google Calendar
                </p>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: '0 0 10px' }}>
                  Aucun rendez-vous planifié pour ce dossier.
                </p>
                <button
                  onClick={openAppointmentModal}
                  style={{
                    background: 'var(--accent)',
                    border: 'none',
                    color: 'black',
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Planifier un rendez-vous
                </button>
              </div>
            )}
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

      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[var(--text-1)] font-bold text-lg">📅 Planifier un rendez-vous</h2>
              <button
                onClick={() => { setShowAppointmentModal(false); setBookingSlot(null); setAppointmentError(null); }}
                className="text-[var(--text-2)] hover:text-[var(--text-1)]"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-2)] uppercase tracking-wide mb-1">
                Choisir une date
              </label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => handleAppointmentDateChange(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-1)]"
              />
            </div>

            <div>
              <p className="text-xs text-[var(--text-2)] uppercase tracking-wide mb-2">Créneaux disponibles</p>

              {loadingSlots ? (
                <p className="text-sm text-[var(--text-2)]">Recherche de créneaux disponibles...</p>
              ) : !appointmentConnected ? (
                <p className="text-sm text-[var(--text-2)]">Agenda non connecté</p>
              ) : appointmentError ? (
                <p className="text-sm text-red-400">{appointmentError}</p>
              ) : appointmentSlots.length === 0 ? (
                <p className="text-sm text-[var(--text-2)]">
                  {appointmentDate ? 'Aucun créneau disponible ce jour.' : 'Aucun créneau disponible'}
                </p>
              ) : (
                <div className="space-y-2">
                  {appointmentSlots.map((slot) => (
                    <button
                      key={slot.start}
                      onClick={() => setBookingSlot(slot)}
                      className={`w-full text-left rounded-lg border p-2 text-sm ${
                        bookingSlot?.start === slot.start
                          ? 'border-green-500 bg-green-500/10 text-[var(--text-1)]'
                          : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)]'
                      }`}
                    >
                      {formatDateTime(slot.start)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {appointmentConnected && appointmentSlots.length > 0 && (
              <button
                onClick={confirmAppointment}
                disabled={!bookingSlot}
                className="w-full bg-green-500 text-black font-bold rounded-lg px-4 py-2 disabled:opacity-50"
              >
                Confirmer le rendez-vous
              </button>
            )}
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

