'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createProjectDepositCheckout, getProject, updateProject, getProjectActivity, sendProjectCompletionSms } from '@/src/lib/api';
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
import LoadingSkeleton from '@/src/components/ui/loading/LoadingSkeleton';
import LoadingForm from '@/src/components/ui/loading/LoadingForm';
import LoadingCard from '@/src/components/ui/loading/LoadingCard';
import { hasFeature, normalizePlan, type PlanFeatureKey, type PlanKey } from '@/src/lib/plans';
import { haversineDistanceKm, calculateTravelCost, calculateTravelFeeRecommendation, type VehicleType, type ChargingType } from '@/src/config/travel';
import { getBestFollowUpTime, getIdealActionLabel, shouldShowIdealFollowUp } from '@/src/lib/commercial-actions';
import { getQuoteFollowupState } from '@/src/lib/quote-followup';
import { getProjectCommercialAnalysis, buildTravelCostSignal, type NextActionType } from '@/src/lib/project-scoring';
import { getQuoteSuggestions, buildQuoteDraftPayload, getQuoteDraftStorageKey, getMatchedQuoteTemplateName, type ArtisanServiceCatalogItem, type ArtisanQuoteTemplate, type QuoteSuggestionLine } from '@/src/lib/quote-suggestions';
import { matchProjectToServices, type ServiceMatcherBusinessProfile, type ServiceMatcherServiceProfile, type ServiceMatchResult } from '@/src/lib/service-matcher';
import { computeNextAction } from '@/src/lib/action-engine';
import { getProjectDecisionState } from '@/src/lib/quote-status';
import { getProjectHeadline } from '@/src/lib/project-detail/project-headline';
import { getVerdictDisplay } from '@/src/lib/project-detail/project-verdict';
import { computeRecommendedDeposit, formatEuro, normalizeDepositStatus, normalizeStripeConnectStatus, type DepositType, type StripeConnectStatus } from '@/src/lib/deposit';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Nouveau':      { bg: 'rgba(63,63,70,0.4)',   text: 'var(--text-2)', border: 'var(--border)' },
  'À rappeler':   { bg: 'rgba(217,119,6,0.15)', text: '#d97706', border: 'rgba(217,119,6,0.3)' },
  'Qualifié':     { bg: 'rgba(22,163,74,0.15)', text: '#16a34a', border: 'rgba(22,163,74,0.3)' },
  'Devis envoyé': { bg: 'rgba(37,99,235,0.15)', text: '#2563eb', border: 'rgba(37,99,235,0.3)' },
  'Gagné':        { bg: 'rgba(21,128,61,0.15)', text: '#15803d', border: 'rgba(21,128,61,0.3)' },
  'Perdu':        { bg: 'rgba(220,38,38,0.15)', text: '#dc2626', border: 'rgba(220,38,38,0.3)' },
};

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

// Construit un instant (Date, donc UTC en interne) correspondant à
// hour:minute en heure de Paris pour la date "YYYY-MM-DD" donnée, en tenant
// compte du décalage saisonnier (CET/CEST) — même algorithme que
// buildParisDateTime dans src/lib/appointment-slots.ts (server-only), copié
// ici côté client pour la sélection d'amplitude du rendez-vous, afin de ne
// jamais produire un start_time/end_time naïf ou décalé pour Google Calendar.
function parisOffsetHoursFor(date: Date): number {
  const utcHour = date.getUTCHours();
  const parisHour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hour: 'numeric', hourCycle: 'h23' }).format(date)
  );
  let diff = parisHour - utcHour;
  if (diff < 0) diff += 24;
  if (diff > 12) diff -= 24;
  return diff;
}

function buildParisDateTime(dateStr: string, hour: number, minute: number): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = parisOffsetHoursFor(approxUtc);
  return new Date(Date.UTC(year, month - 1, day, hour - offset, minute));
}

const TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
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

type ActivityTone = 'success' | 'error' | 'info';

interface ActivityFeedItem {
  id: string;
  action?: string;
  createdAt?: string | null;
  title: string;
  detail?: string | null;
  tone: ActivityTone;
}

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

// Messages client (portail V1) : la colonne client_messages est aujourd'hui
// écrite par l'API comme une chaîne accumulée ("[date] message" séparés par
// des lignes vides — voir app/api/client-portal/[token]/route.ts, PATCH).
// On reste toutefois tolérant à d'autres formats possibles (tableau
// d'objets, objet unique, JSON stringifié) pour ne jamais faire planter la
// fiche projet, quel que soit l'état réel de la donnée en base.
type ClientPortalMessage = { text: string; date: string | null };

function extractMessageFromObject(obj: Record<string, unknown>): ClientPortalMessage {
  const text =
    typeof obj.text === 'string' ? obj.text :
    typeof obj.message === 'string' ? obj.message :
    typeof obj.content === 'string' ? obj.content :
    (() => {
      try { return JSON.stringify(obj); } catch { return String(obj); }
    })();
  const date =
    typeof obj.date === 'string' ? obj.date :
    typeof obj.createdAt === 'string' ? obj.createdAt :
    typeof obj.created_at === 'string' ? obj.created_at :
    null;
  return { text, date };
}

function parseClientMessages(raw: unknown): ClientPortalMessage[] {
  try {
    if (raw === null || raw === undefined) return [];

    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return [];

      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          return parseClientMessages(JSON.parse(trimmed));
        } catch {
          // Pas du JSON valide malgré les apparences : on retombe sur le
          // traitement "texte brut" ci-dessous.
        }
      }

      // Texte brut : chaque complément est ajouté sous la forme
      // "[dd/mm/yyyy hh:mm:ss] message", séparé par une ligne vide.
      return trimmed.split(/\n\s*\n/).filter(Boolean).map((entry) => {
        const match = entry.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
        if (match) return { text: match[2].trim() || entry.trim(), date: match[1] };
        return { text: entry.trim(), date: null };
      }).filter((m) => m.text);
    }

    if (Array.isArray(raw)) {
      return raw
        .map((item) => {
          if (item && typeof item === 'object') return extractMessageFromObject(item as Record<string, unknown>);
          if (typeof item === 'string') return { text: item, date: null };
          return { text: String(item), date: null };
        })
        .filter((m) => m.text);
    }

    if (typeof raw === 'object') {
      return [extractMessageFromObject(raw as Record<string, unknown>)];
    }

    return [{ text: String(raw), date: null }];
  } catch {
    // Format totalement inattendu : on affiche la valeur brute plutôt que
    // de faire planter la fiche projet.
    try {
      return [{ text: String(raw), date: null }];
    } catch {
      return [];
    }
  }
}

// Timeline client (lot messagerie/timeline V1) : événements issus de la
// table ProjectClientEvents (client_message, artisan_reply,
// client_info_updated, + futurs types réservés). Distinct des notes
// internes (jamais mélangés) et distinct de l'Activity interne générique.
type ClientTimelineEvent = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  source: string;
  createdAt: string | null;
  metadata: Record<string, unknown>;
};

// Résumé compact du rendez-vous pour la quick action "Rendez-vous" (Part 4) :
// distingue un RDV court (avec durée), une demi-journée / journée complète
// (amplitude, sans heure de fin explicite) et un chantier multi-jours
// (plage de dates), en se basant uniquement sur start/end déjà stockés.
function summarizeAppointment(appointment: { start: string; end: string } | null, synced = true): { title: string; detail: string } {
  if (!appointment) {
    return { title: 'Rendez-vous', detail: 'Planifier un rendez-vous' };
  }
  const start = parseValidDate(appointment.start);
  const end = parseValidDate(appointment.end);
  if (!start || !end) {
    return { title: 'Rendez-vous', detail: formatDateTime(appointment.start) };
  }

  const dayKey = (d: Date) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const isMultiDay = dayKey(start) !== dayKey(end);
  const durationMs = end.getTime() - start.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  const syncLine = synced ? 'Synchronisé Google Calendar' : 'Synchronisation Google Calendar à vérifier';

  if (isMultiDay) {
    return {
      title: 'Rendez-vous',
      detail: `Chantier prévu du ${formatShortDate(appointment.start)} au ${formatShortDate(appointment.end)} · Amplitude : plusieurs jours · ${syncLine}`,
    };
  }
  if (durationHours >= 9.5) {
    return {
      title: 'Rendez-vous',
      detail: `RDV prévu le ${formatShortDate(appointment.start)} · Amplitude : journée complète · ${syncLine}`,
    };
  }
  const durationLabel = Number.isInteger(durationHours) ? `${durationHours}h` : `${durationHours.toFixed(1).replace('.', 'h')}`;
  return {
    title: 'Rendez-vous',
    detail: `RDV prévu le ${formatShortDate(appointment.start)} à ${TIME_FORMATTER.format(start)} · Durée : ${durationLabel} · ${syncLine}`,
  };
}

function formatInteger(value?: number | null) {
  return INTEGER_FORMATTER.format(Number(value || 0));
}

function formatMoney(value?: number | null) {
  return MONEY_FORMATTER.format(Number(value || 0));
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

function hasMeaningfulValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function normalizeSmsStatus(status?: string | null) {
  return String(status || '').trim().toLowerCase();
}

// Un projet est considéré "sourcé Vapi" uniquement via des champs qui ne
// sont écrits QUE par le flux d'appel vocal (app/api/vapi/create-project) :
// - la colonne `source` ('vapi'), posée une seule fois à la création
// - `call_id`, jamais renseigné ailleurs
// Les champs sms_completion_token / sms_status / completion_source ne
// suffisent PAS à eux seuls : ils peuvent aussi être écrits par la route
// manuelle app/api/projects/[id]/send-completion-sms (qui n'exige pas que
// le projet vienne de Vapi). Les utiliser comme signal de provenance
// ferait donc apparaître ce bloc pour des dossiers classiques dès qu'un
// SMS de complément est envoyé manuellement. Règle de repli : provenance
// inconnue => on masque (mieux vaut cacher à tort que montrer à tort).
function isVapiSourcedProject(project: any) {
  const source = String(project?.source || '').trim().toLowerCase();
  const projectSource = String(project?.projectSource || '').trim().toLowerCase();
  const createdFrom = String(project?.createdFrom || '').trim().toLowerCase();

  return (
    source === 'vapi'
    || projectSource === 'vapi'
    || createdFrom === 'vapi'
    || hasMeaningfulValue(project?.callId)
  );
}

function shouldShowSmsCompletionCard(project: any) {
  if (!isVapiSourcedProject(project)) return false;

  const smsStatus = normalizeSmsStatus(project?.smsStatus);
  const completionStatus = String(project?.completionStatus || '').trim().toLowerCase();
  const hasPhone = hasMeaningfulValue(project?.clientPhone);

  // Pertinence : on ne montre le bloc que si les infos client peuvent
  // encore être complétées (pas déjà complété), et soit le SMS n'a pas
  // encore été envoyé/a échoué, soit il est en attente de complétion, soit
  // le téléphone est manquant (état compact non prioritaire à afficher).
  if (completionStatus === 'completed') return true; // état compact "complété" à titre informatif
  if (!hasPhone) return true; // état compact "Téléphone manquant"

  return smsStatus === '' || smsStatus === 'not_sent' || smsStatus === 'pending' || smsStatus === 'sent' || smsStatus === 'failed';
}

function getSmsCompletionBadge(status: string, completionCompletedAt?: string | null) {
  if (completionCompletedAt || status === 'completed') {
    return {
      label: 'Informations complétées',
      styles: {
        background: 'rgba(34,197,94,0.12)',
        border: '1px solid rgba(34,197,94,0.24)',
        color: '#86efac',
      } as CSSProperties,
    };
  }

  if (status === 'sent') {
    return {
      label: 'SMS envoyé',
      styles: {
        background: 'rgba(59,130,246,0.12)',
        border: '1px solid rgba(59,130,246,0.24)',
        color: '#93c5fd',
      } as CSSProperties,
    };
  }

  if (status === 'failed') {
    return {
      label: 'SMS échoué',
      styles: {
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.24)',
        color: '#fca5a5',
      } as CSSProperties,
    };
  }

  return {
    label: 'SMS non envoyé',
    styles: {
      background: 'rgba(245,158,11,0.10)',
      border: '1px solid rgba(245,158,11,0.24)',
      color: '#fcd34d',
    } as CSSProperties,
  };
}

interface FollowUpRecommendedWindow {
  startMinutes: number;
  endMinutes: number;
}

interface FollowUpRecommendedMoment {
  hasRecommendation: boolean;
  isInRecommendedSlot: boolean;
  recommendedLabel: string;
}

function formatRecommendedTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours} h` : `${hours} h ${String(mins).padStart(2, '0')}`;
}

function extractRecommendedWindows(...slots: Array<string | undefined>) {
  const pattern = /(\d{1,2})\s*h(?:\s*(\d{2}))?\s*(?:à|a|et|-)\s*(\d{1,2})\s*h(?:\s*(\d{2}))?/gi;
  const windows: FollowUpRecommendedWindow[] = [];

  slots.forEach((slot) => {
    if (!slot) return;
    for (const match of slot.matchAll(pattern)) {
      const startHour = Number(match[1]);
      const startMinute = Number(match[2] || 0);
      const endHour = Number(match[3]);
      const endMinute = Number(match[4] || 0);

      if ([startHour, startMinute, endHour, endMinute].some((value) => Number.isNaN(value))) continue;

      windows.push({
        startMinutes: startHour * 60 + startMinute,
        endMinutes: endHour * 60 + endMinute,
      });
    }
  });

  return windows;
}

function getFollowUpRecommendedMoment(primarySlot?: string, secondarySlot?: string): FollowUpRecommendedMoment {
  const windows = extractRecommendedWindows(primarySlot, secondarySlot);
  if (windows.length === 0) {
    return {
      hasRecommendation: false,
      isInRecommendedSlot: false,
      recommendedLabel: '',
    };
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isInRecommendedSlot = windows.some((window) => nowMinutes >= window.startMinutes && nowMinutes < window.endMinutes);
  const recommendedLabel = windows
    .map((window) => `entre ${formatRecommendedTime(window.startMinutes)} et ${formatRecommendedTime(window.endMinutes)}`)
    .join(' ou ');

  return {
    hasRecommendation: true,
    isInRecommendedSlot,
    recommendedLabel,
  };
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
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activityUnavailable, setActivityUnavailable] = useState(false);
  const [note, setNote] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [callbackDate, setCallbackDate] = useState('');
  const [showCallback, setShowCallback] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const actionsAndQuoteRef = useRef<HTMLDivElement>(null);
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
  // Amplitude / durée du rendez-vous (Part 5) : 'slot' = flux existant
  // (créneaux 1h proposés par Google Calendar) ; les autres valeurs
  // basculent sur une plage calculée manuellement (durée personnalisée,
  // demi-journée, journée complète, plusieurs jours).
  const [appointmentAmplitude, setAppointmentAmplitude] = useState<'slot' | 'custom' | 'half_day' | 'full_day' | 'multi_day'>('slot');
  const [customDurationMin, setCustomDurationMin] = useState<number>(60);
  const [appointmentStartTime, setAppointmentStartTime] = useState<string>('09:00');
  const [halfDayPeriod, setHalfDayPeriod] = useState<'morning' | 'afternoon'>('morning');
  const [multiDayEndDate, setMultiDayEndDate] = useState<string>('');

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

  const [plan, setPlan] = useState<PlanKey>('essentiel');
  const [upgradeFeature, setUpgradeFeature] = useState<PlanFeatureKey | null>(null);
  const canQuote = hasFeature(plan, 'quoteGeneration');
  const canExportPdf = hasFeature(plan, 'pdfExports');
  const canTravelCost = hasFeature(plan, 'travelCost');
  const openUpgradeModal = (feature: PlanFeatureKey) => setUpgradeFeature(feature);


  const [artisanConfig, setArtisanConfig] = useState<{
    siret?: string;
    raisonSociale?: string;
    googleReviewUrl?: string;
    depositEnabled?: boolean;
    depositType?: DepositType;
    depositValue?: number | null;
    stripeConnectStatus?: StripeConnectStatus;
    stripeAccountId?: string;
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
  const [followUpConfirmDevis, setFollowUpConfirmDevis] = useState<DevisListItem | null>(null);
  const [followUpConfirmError, setFollowUpConfirmError] = useState('');
  const [reviewRequestToast, setReviewRequestToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [sendingReviewRequest, setSendingReviewRequest] = useState(false);
  const [reviewRequestConfirmOpen, setReviewRequestConfirmOpen] = useState(false);
  const [reviewRequestError, setReviewRequestError] = useState('');
  const [commercialClosureConfirm, setCommercialClosureConfirm] = useState<CommercialClosureConfirmState | null>(null);
  const [depositCheckoutLoading, setDepositCheckoutLoading] = useState(false);
  const [depositActionMessage, setDepositActionMessage] = useState<string | null>(null);
  const [depositActionError, setDepositActionError] = useState<string | null>(null);
  const [smsCompletionLoading, setSmsCompletionLoading] = useState(false);
  const [smsCompletionToast, setSmsCompletionToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [clientPortalLoading, setClientPortalLoading] = useState(false);
  const [clientPortalToast, setClientPortalToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [clientTimelineEvents, setClientTimelineEvents] = useState<ClientTimelineEvent[]>([]);
  const [clientReplyMessage, setClientReplyMessage] = useState('');
  const [clientReplySending, setClientReplySending] = useState(false);
  const [clientReplyError, setClientReplyError] = useState('');
  const [clientReplySuccess, setClientReplySuccess] = useState('');
  useEffect(() => {
    if (!clientPortalToast) return;
    const timeout = window.setTimeout(() => setClientPortalToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [clientPortalToast]);
  useEffect(() => {
    if (!followUpToast) return;
    const timeout = window.setTimeout(() => setFollowUpToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [followUpToast]);

  useEffect(() => {
    if (!reviewRequestToast) return;
    const timeout = window.setTimeout(() => setReviewRequestToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [reviewRequestToast]);

  useEffect(() => {
    if (!depositActionMessage) return;
    const timeout = window.setTimeout(() => setDepositActionMessage(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [depositActionMessage]);

  useEffect(() => {
    if (!smsCompletionToast) return;
    const timeout = window.setTimeout(() => setSmsCompletionToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [smsCompletionToast]);

  useEffect(() => {
    const depositParam = searchParams?.get('deposit');
    if (!depositParam) return;

    if (depositParam === 'success') {
      setDepositActionError(null);
      setDepositActionMessage('Paiement en cours de verification. Le statut sera mis a jour automatiquement.');
    } else if (depositParam === 'cancelled') {
      setDepositActionError(null);
      setDepositActionMessage("Paiement annule ou interrompu. Le lien reste disponible si le client souhaite reessayer.");
    }

    router.replace(`/dashboard-v2/projet/${encodeURIComponent(String(id))}`, { scroll: false });
  }, [id, router, searchParams]);

  useEffect(() => {
    if (!followUpConfirmDevis) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !followingUpDevisId) {
        setFollowUpConfirmDevis(null);
        setFollowUpConfirmError('');
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [followUpConfirmDevis, followingUpDevisId]);

  useEffect(() => {
    if (!reviewRequestConfirmOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !sendingReviewRequest) {
        setReviewRequestConfirmOpen(false);
        setReviewRequestError('');
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [reviewRequestConfirmOpen, sendingReviewRequest]);

  useEffect(() => {
    if (!commercialClosureConfirm) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !updating) {
        setCommercialClosureConfirm(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [commercialClosureConfirm, updating]);

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

  // Option A (préférée) : lecture combinée — les événements
  // 'client_info_updated' issus de ProjectClientEvents sont ajoutés à la
  // source de l'activité du dossier sans jamais écrire dans la table
  // Activity, pour ne pas polluer une convention qu'on ne maîtrise pas
  // entièrement. Les messages (client_message/artisan_reply) n'apparaissent
  // volontairement jamais ici : ils vivent exclusivement dans la section
  // "Discussion client" plus haut.
  const clientInfoActivityItems = clientTimelineEvents
    .filter((ev) => ev.type === 'client_info_updated')
    .map((ev) => ({
      id: `client-event-${ev.id}`,
      description: ev.message || 'Le client a complété son adresse, budget, délai ou précisions depuis le portail.',
      createdAt: ev.createdAt,
      action: 'CLIENT_INFO_UPDATED',
    }));

  const dossierActivitySource = [
    ...activities,
    ...clientInfoActivityItems,
    ...devisList.flatMap((devis) => {
      const items: { id: string; description: string; createdAt?: string | null; action: string }[] = [];
      if (devis.date_emission) {
        items.push({
          id: `${devis.id}-created`,
          description: `Devis ${devis.numero} cree — ${formatMoney(devis.amount)} € TTC`,
          createdAt: devis.date_emission,
          action: 'DEVIS',
        });
      }
      if (devis.sent && devis.quote_sent_at) {
        items.push({
          id: `${devis.id}-sent`,
          description: `Devis ${devis.numero} envoye — ${formatMoney(devis.amount)} € TTC`,
          createdAt: devis.quote_sent_at,
          action: 'DEVIS',
        });
      }
      if (devis.follow_up_count && devis.last_follow_up_at) {
        items.push({
          id: `${devis.id}-followup`,
          description: `Relance envoyee pour le devis ${devis.numero}`,
          createdAt: devis.last_follow_up_at,
          action: 'DEVIS',
        });
      }
      if (devis.accepted) {
        items.push({
          id: `${devis.id}-accepted`,
          description: `Devis ${devis.numero} accepte`,
          createdAt: devis.accepted_at,
          action: 'DEVIS',
        });
      }
      if (devis.declined) {
        items.push({
          id: `${devis.id}-declined`,
          description: devis.decline_reason
            ? `Devis ${devis.numero} refuse — Motif : ${devis.decline_reason}`
            : `Devis ${devis.numero} refuse`,
          createdAt: devis.declined_at,
          action: 'DEVIS',
        });
      }
      return items;
    }),
    {
      id: 'creation',
      description: `Dossier cree — statut initial : ${project?.status || 'Nouveau'}`,
      createdAt: project?.createdAt,
      action: 'CREATED',
    },
  ]
    .filter((activity) => activity.createdAt || activity.description)
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

  const activityItems = dossierActivitySource
    .map((activity, index) => getActivityPresentation(activity, index));

  const recentActivityItems = activityItems.slice(0, 8);

  async function loadActivities() {
    try {
      setActivityUnavailable(false);
      const activityData = await getProjectActivity(id);

      if (activityData.success) {
        setActivities(Array.isArray(activityData.activities) ? activityData.activities : []);
        return;
      }

      setActivities([]);
      setActivityUnavailable(true);
    } catch (error) {
      console.error('PROJECT_ACTIVITY_LOAD_ERROR', error);
      setActivities([]);
      setActivityUnavailable(true);
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

  // Timeline client (lot messagerie/timeline V1) : tolérant à l'absence de
  // la table ProjectClientEvents (migration pas encore appliquée) — l'API
  // renvoie alors simplement un tableau vide plutôt qu'une erreur.
  async function loadClientTimeline() {
    if (!id) return;
    try {
      const res = await fetch(`/api/projects/${id}/client-replies`);
      const data = await res.json();
      if (data.success) setClientTimelineEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      // non bloquant : la fiche projet reste utilisable sans timeline
    }
  }

  useEffect(() => {
    loadClientTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Marque les nouveautés client comme lues à l'ouverture de la fiche projet
  // (colonne Activité du suivi commercial). Appel unique, best-effort : ne
  // doit jamais bloquer/casser l'affichage de la fiche si ça échoue (table
  // ou colonne pas encore migrée, réseau, etc.).
  useEffect(() => {
    if (!id) return;
    fetch(`/api/projects/${id}/mark-activity-seen`, { method: 'POST' }).catch(() => {});
  }, [id]);

  async function submitClientReply() {
    const trimmed = clientReplyMessage.trim();
    setClientReplyError('');
    setClientReplySuccess('');

    if (!trimmed) {
      setClientReplyError('Merci de saisir un message avant de publier.');
      return;
    }
    if (trimmed.length > 2000) {
      setClientReplyError('Le message est trop long (2000 caractères maximum).');
      return;
    }

    setClientReplySending(true);
    try {
      const res = await fetch(`/api/projects/${id}/client-replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setClientReplyError(data.error || "Erreur lors de l'envoi de la réponse.");
        return;
      }
      setClientReplyMessage('');
      setClientReplySuccess('Réponse ajoutée au portail client');
      await loadClientTimeline();
    } catch {
      setClientReplyError("Erreur lors de l'envoi de la réponse.");
    } finally {
      setClientReplySending(false);
    }
  }

  async function handleCreateDepositCheckout() {
    setDepositCheckoutLoading(true);
    setDepositActionError(null);
    setDepositActionMessage(null);

    try {
      const data = await createProjectDepositCheckout(id);

      setProject((current: any) => current ? {
        ...current,
        depositStatus: data.depositStatus || 'requested',
        depositAmount: data.depositAmount ?? current.depositAmount ?? recommendedDeposit?.amount ?? null,
        depositRequestedAt: data.depositRequestedAt || new Date().toISOString(),
        depositPaymentUrl: data.depositPaymentUrl || data.url || current.depositPaymentUrl || '',
        depositProvider: data.depositProvider || 'stripe_connect',
      } : current);

      setDepositActionMessage("Lien d'acompte cree");
      await loadActivities();
    } catch (error) {
      setDepositActionError(error instanceof Error ? error.message : "Impossible de generer le lien d'acompte pour le moment.");
    } finally {
      setDepositCheckoutLoading(false);
    }
  }

  async function copyDepositLink(url: string) {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setDepositActionError(null);
      setDepositActionMessage('Lien copie');
    } catch (error) {
      console.error('[DEPOSIT COPY LINK]', error);
      setDepositActionError('Impossible de copier le lien');
    }
  }

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

  function requestQuoteFollowUp(devis: DevisListItem) {
    if (!canQuote) {
      openUpgradeModal('quoteGeneration');
      return;
    }

    if (!devis.token || devis.token.includes('undefined')) {
      setFollowUpToast({ type: 'error', message: 'Impossible de relancer ce devis : lien de devis introuvable.' });
      return;
    }

    setFollowUpConfirmError('');
    setFollowUpConfirmDevis(devis);
  }

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
      setFollowUpConfirmError('');
      setFollowUpConfirmDevis(null);
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
      setFollowUpToast({ type: 'success', message: data.message || 'Relance envoyée. Le client a reçu un email lui rappelant ce devis en attente.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de relancer le devis';
      setFollowUpConfirmError(message);
      setFollowUpToast({
        type: 'error',
        message,
      });
    } finally {
      setFollowingUpDevisId(null);
    }
  }

  async function copyClientPortalLink() {
    if (!project?.id) {
      setClientPortalToast({ type: 'error', message: 'Projet introuvable.' });
      return;
    }

    setClientPortalLoading(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/client-portal-link`);
      const text = await response.text();
      let data: { success?: boolean; url?: string; error?: string } = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { success: false, error: text || 'Reponse serveur invalide' };
      }

      if (!response.ok || !data.success || !data.url) {
        setClientPortalToast({
          type: 'error',
          message: response.status === 401
            ? 'Session expirée, reconnectez-vous.'
            : (data.error || 'Impossible de récupérer le lien du portail client.'),
        });
        return;
      }

      const url = data.url;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
        } else {
          const tempInput = document.createElement('textarea');
          tempInput.value = url;
          tempInput.style.position = 'fixed';
          tempInput.style.opacity = '0';
          document.body.appendChild(tempInput);
          tempInput.focus();
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
        }
        setClientPortalToast({ type: 'success', message: 'Lien portail client copié' });
      } catch (copyError) {
        console.error('[CLIENT PORTAL COPY LINK]', copyError);
        setClientPortalToast({ type: 'error', message: `Impossible de copier automatiquement. Lien : ${url}` });
      }
    } catch (error) {
      console.error('[CLIENT PORTAL LINK]', error);
      setClientPortalToast({ type: 'error', message: 'Erreur réseau, réessayez.' });
    } finally {
      setClientPortalLoading(false);
    }
  }

  function requestGoogleReview() {
    if (!project?.clientEmail) {
      setReviewRequestToast({ type: 'error', message: 'Email client manquant.' });
      return;
    }

    if (!artisanConfig?.googleReviewUrl) {
      setReviewRequestToast({
        type: 'error',
        message: "Ajoutez votre lien de demande d'avis Google dans vos parametres pour utiliser cette action.",
      });
      return;
    }

    setReviewRequestError('');
    setReviewRequestConfirmOpen(true);
  }

  async function sendGoogleReviewRequest() {
    if (!project?.id) return;

    setSendingReviewRequest(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/request-review`, { method: 'POST' });
      const text = await response.text();
      let data: { success?: boolean; error?: string; message?: string } = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { success: false, error: text || 'Reponse serveur invalide' };
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Impossible d'envoyer la demande d'avis");
      }

      await loadActivities();
      setReviewRequestError('');
      setReviewRequestConfirmOpen(false);
      setReviewRequestToast({
        type: 'success',
        message: data.message || "Demande d'avis envoyee au client.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'envoyer la demande d'avis";
      setReviewRequestError(message);
      setReviewRequestToast({ type: 'error', message });
    } finally {
      setSendingReviewRequest(false);
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
        message: nextDisabled
          ? 'Relances désactivées. Ce devis ne sera plus relancé automatiquement.'
          : 'Relances réactivées. Ce devis sera de nouveau relancé automatiquement si besoin.',
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

  function requestCommercialClosure(status: CommercialClosureStatus) {
    setCommercialClosureConfirm(getCommercialClosureConfirmState(status));
  }

  async function confirmCommercialClosure() {
    if (!commercialClosureConfirm) return;
    const nextStatus = commercialClosureConfirm.status;
    setCommercialClosureConfirm(null);
    await updateStatus(nextStatus);
  }

  async function reloadProject() {
    const data = await getProject(id);
    if (data?.success && data.project) {
      setProject(data.project);
    }
  }

  async function handleSendCompletionSms() {
    try {
      setSmsCompletionLoading(true);
      const data = await sendProjectCompletionSms(id);
      if (data?.project) {
        setProject(data.project);
      } else {
        await reloadProject();
      }
      await loadActivities();
      setSmsCompletionToast({ type: 'success', message: data.message || 'SMS de complément envoyé.' });
    } catch (error) {
      setSmsCompletionToast({
        type: 'error',
        message: error instanceof Error ? error.message : "Erreur lors de l'envoi du SMS de complément",
      });
      try {
        await reloadProject();
      } catch {
        // no-op
      }
    } finally {
      setSmsCompletionLoading(false);
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
    setAppointmentAmplitude('slot');
    setCustomDurationMin(60);
    setAppointmentStartTime('09:00');
    setHalfDayPeriod('morning');
    setMultiDayEndDate('');
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

  // Calcule la plage start/end (ISO) pour les amplitudes manuelles
  // (durée personnalisée / demi-journée / journée complète / plusieurs
  // jours), en heure de Paris, avec un end toujours cohérent et jamais
  // réduit à 30/60 min par défaut. Retourne null tant que les champs
  // requis ne sont pas renseignés.
  function computeManualAppointmentRange(): { start: string; end: string } | null {
    if (!appointmentDate) return null;
    if (appointmentAmplitude === 'custom') {
      const [h, m] = appointmentStartTime.split(':').map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
      const start = buildParisDateTime(appointmentDate, h, m);
      const end = new Date(start.getTime() + customDurationMin * 60000);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (appointmentAmplitude === 'half_day') {
      const [startHour, endHour] = halfDayPeriod === 'morning' ? [8, 12] : [14, 18];
      const start = buildParisDateTime(appointmentDate, startHour, 0);
      const end = buildParisDateTime(appointmentDate, endHour, 0);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (appointmentAmplitude === 'full_day') {
      const start = buildParisDateTime(appointmentDate, 8, 0);
      const end = buildParisDateTime(appointmentDate, 18, 0);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (appointmentAmplitude === 'multi_day') {
      if (!multiDayEndDate) return null;
      const start = buildParisDateTime(appointmentDate, 8, 0);
      const end = buildParisDateTime(multiDayEndDate, 18, 0);
      if (end.getTime() <= start.getTime()) return null;
      return { start: start.toISOString(), end: end.toISOString() };
    }
    return null;
  }

  async function confirmAppointment() {
    const range = appointmentAmplitude === 'slot' ? bookingSlot : computeManualAppointmentRange();
    if (!range) return;
    setAppointmentError(null);
    try {
      const res = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          start: range.start,
          end: range.end,
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
      <div className="dashboard-shell min-h-screen bg-[var(--bg)] text-[var(--text-1)]" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <LoadingSkeleton width="70%" style={{ maxWidth: '280px' }} height="24px" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
          <LoadingForm fields={4} />
          <LoadingCard lines={3} />
        </div>
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
  // Montant du devis : jamais de saisie libre. On distingue "devis envoyé"
  // (montant figé, priorité absolue) de "devis préparé mais non envoyé"
  // (montant indicatif). devisList est trié par date_emission décroissante
  // (cf. /api/devis), donc le premier devis envoyé trouvé est le plus récent.
  const sentDevis = devisList.find((d) => d.sent || d.statut?.startsWith('Envoy'));
  const preparedDevis = !sentDevis ? latestDevis : undefined;
  // Base la plus fiable disponible pour le calcul d'acompte : montant du
  // devis envoyé (figé) en priorité, sinon montant préparé — jamais un
  // montant saisi à la main.
  const safeDevisAmount = sentDevis?.amount ?? preparedDevis?.amount ?? null;
  const recommendedDeposit = computeRecommendedDeposit({
    depositEnabled: artisanConfig?.depositEnabled,
    depositType: artisanConfig?.depositType,
    depositValue: artisanConfig?.depositValue,
  }, safeDevisAmount);
  const normalizedStripeConnectStatus = normalizeStripeConnectStatus(artisanConfig?.stripeConnectStatus);
  const normalizedDepositStatus = normalizeDepositStatus(project.depositStatus);
  const depositPaymentUrl = typeof project.depositPaymentUrl === 'string' ? project.depositPaymentUrl : '';
  const hasDepositLink = depositPaymentUrl.trim().length > 0 && normalizedDepositStatus === 'requested';
  const effectiveDepositAmount = project.depositAmount ?? recommendedDeposit?.amount ?? null;
  const depositPaidDateLabel = project.depositPaidAt ? formatDateTime(project.depositPaidAt, '') : '';

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

  // Source de vérité métier : Profil métier Supabase (primary_trade +
  // covered_trades) en priorité, avec repli sur les métiers legacy
  // (Artisan_config.trades) si le Profil métier n'est pas encore renseigné —
  // même ordre de résolution que resolveArtisanTradeContext côté serveur
  // (src/lib/business-profile.ts), recalculé ici côté client puisque cette
  // page charge déjà les deux sources séparément.
  const businessProfileRow = businessProfile as unknown as { primary_trade?: string | null; covered_trades?: string[] | null } | null;
  const resolvedPrimaryTrade = (businessProfileRow?.primary_trade || '').trim() || (artisanConfig?.trades?.[0] || '');
  const resolvedCoveredTrades = (() => {
    const fromProfile = (businessProfileRow?.covered_trades || []).filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
    if (fromProfile.length > 0) return fromProfile;
    return (artisanConfig?.trades || []).filter(t => t !== resolvedPrimaryTrade);
  })();
  const resolvedArtisanTrades = [resolvedPrimaryTrade, ...resolvedCoveredTrades].filter(Boolean);

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
    artisanTrades: resolvedArtisanTrades,
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
          // Ne pas retomber sur date_emission : ce n'est pas la date d'envoi
          // reelle, et cela faussait le delai de relance (48h) calcule par
          // l'Action Engine.
          sentAt: latestDevis.quote_sent_at || null,
        }
      : null,
  });

  // Source unique de la décision commerciale (src/lib/quote-status.ts) :
  // tous les blocs de la page (Action recommandée, cartes rapides, Analyse
  // Kadria, Moment idéal, Actions et devis) doivent lire ce même état
  // plutôt que recalculer chacun leur propre condition de relance, pour
  // éviter les contradictions entre blocs.
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
          first_opened_at: latestDevis.first_opened_at,
          last_follow_up_at: latestDevis.last_follow_up_at,
          follow_up_count: latestDevis.follow_up_count,
          follow_up_disabled: latestDevis.follow_up_disabled,
          client_email: project.clientEmail,
        }
      : null,
    nextAction,
  );

  const NEXT_ACTION_CTA_LABEL: Record<string, string> = {
    complete_qualification: 'Compléter',
    request_photos: 'Demander photos',
    schedule_appointment: 'Planifier',
    send_quote: 'Préparer le devis',
    follow_up_quote: 'Relancer',
    review_quote_decline: 'Créer un nouveau devis',
    schedule_intervention: 'Programmer',
    ask_review: 'Demander un avis',
    monitor: 'Consulter',
  };
  // Seuls les CTA deja reellement branches ailleurs sur cette page declenchent
  // une action ; les autres restent volontairement non destructifs (pas de
  // fausse action) tant qu'ils ne sont pas integres.
  const NEXT_ACTION_CTA_HANDLER: Partial<Record<string, () => void>> = {
    schedule_appointment: () => { if (!appointment) openAppointmentModal(); },
    follow_up_quote: () => { if (latestDevis && decision.canFollowUpQuote) requestQuoteFollowUp(latestDevis); },
    ask_review: () => { requestGoogleReview(); },
    review_quote_decline: () => { router.push(`/dashboard-v2/projet/${id}/devis/new`); },
    // Reprend le canal email/téléphone déjà utilisé ailleurs sur cette page
    // pour contacter le client (cf. boutons "✉️ Message" / "tel:") plutôt
    // que d'inventer une nouvelle API de demande de photos.
    request_photos: () => {
      if (project.clientEmail) {
        const subject = encodeURIComponent('Photos pour votre projet');
        const body = encodeURIComponent(
          'Bonjour,\n\nPourriez-vous nous envoyer quelques photos de votre projet afin de mieux préparer votre devis ?\n\nMerci.'
        );
        window.location.href = `mailto:${project.clientEmail}?subject=${subject}&body=${body}`;
      } else if (project.clientPhone) {
        window.location.href = `tel:${project.clientPhone}`;
      }
    },
  };
  // Raison affichée quand le CTA n'est pas actionnable, plutôt qu'un bouton
  // grisé silencieux (ex: "Demander photos" sans email ni téléphone client).
  const NEXT_ACTION_CTA_DISABLED_REASON: Partial<Record<string, string>> = {
    ask_review: !project.clientEmail
      ? 'Email client manquant'
      : !artisanConfig?.googleReviewUrl
        ? "Lien de demande d'avis Google non configure"
        : undefined,
    request_photos: project.clientEmail || project.clientPhone
      ? undefined
      : 'Aucun email ni téléphone client renseigné',
  };

  // V1 légère "devis assisté métier" (Mission 4) : suggestions de lignes
  // calculées à la demande, jamais persistées, basées sur les mêmes signaux
  // que l'analyse Kadria ci-dessus (métier, projet, déplacement).
  const projectTitle = getProjectHeadline(project);
  const clientLabel = [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || 'Client non renseigne';
  const sourceLabel = getSourceLabel(project.source);
  const showSmsCompletionCard = shouldShowSmsCompletionCard(project);
  const smsCompletionStatus = project.completionStatus === 'completed'
    ? 'completed'
    : normalizeSmsStatus(project.smsStatus) || 'not_sent';
  const smsCompletionBadge = getSmsCompletionBadge(smsCompletionStatus, project.completionCompletedAt);
  const smsCompletionHasPhone = hasMeaningfulValue(project.clientPhone);
  const smsCompletionHasLink = hasMeaningfulValue(project.smsCompletionUrl);
  const smsCompletionPhotosCount = Array.isArray(project.photos) ? project.photos.length : 0;
  const heroSubtitle = [clientLabel, project.trade || 'Metier non renseigne', project.city || 'Ville non renseignee', sourceLabel].join(' · ');
  const budgetLabel = project.budget || 'Budget non renseigne';
  const timelineLabel = project.desiredTimeline || 'Delai non precise';
  const scrollToActionsAndQuote = () => {
    actionsAndQuoteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const recommendedAction = (() => {
    if (project.status === 'Perdu' || decision.state === 'quote_declined') {
      // Le devis a été refusé (ou le dossier déjà marqué perdu) : l'action
      // doit clôturer directement le dossier, plutôt que de renvoyer vers
      // "Actions et devis" qui ne porte plus les boutons de statut.
      const alreadyClosed = project.status === 'Perdu';
      return {
        title: 'Clôturer le dossier',
        ctaLabel: alreadyClosed ? 'Dossier clôturé (perdu)' : 'Marquer comme perdu',
        onClick: alreadyClosed ? undefined : () => requestCommercialClosure('Perdu'),
        meta: latestDevis?.decline_reason || 'Motif de refus à consigner si besoin.',
      };
    }
    if (project.status === 'Gagné' || decision.state === 'quote_accepted') {
      // Regle acompte : quand les acomptes sont actives pour l'artisan, le
      // devis accepte seul ne suffit plus a "gagner" le dossier — l'acompte
      // devient l'etape commerciale intermediaire avant la planification.
      // Reutilise le meme etat (normalizedDepositStatus) et le meme handler
      // (handleCreateDepositCheckout) que la carte acompte existante, sans
      // dupliquer la logique Stripe.
      if (artisanConfig?.depositEnabled) {
        if (normalizedDepositStatus === 'paid') {
          // Cas C — acompte paye : chantier securise, place a la planification.
          return {
            title: 'Planifier le chantier',
            ctaLabel: appointment ? 'Voir le rendez-vous' : 'Planifier un rendez-vous',
            onClick: appointment ? scrollToActionsAndQuote : () => { if (!appointment) openAppointmentModal(); },
            meta: appointment
              ? `L’acompte est payé, rendez-vous prévu le ${formatDateTime(appointment.start)}.`
              : 'L’acompte est payé. Le chantier est sécurisé.',
          };
        }
        if (normalizedDepositStatus === 'requested' && depositPaymentUrl) {
          // Cas B — lien genere, paiement en attente.
          return {
            title: 'Suivre l’acompte',
            ctaLabel: 'Ouvrir le lien',
            onClick: () => window.open(depositPaymentUrl, '_blank', 'noopener,noreferrer'),
            meta: 'Le lien d’acompte a été généré. Le paiement est encore en attente.',
          };
        }
        // Cas A — devis accepte, aucun lien d'acompte genere pour le moment.
        return {
          title: 'Demander l’acompte',
          ctaLabel: 'Créer le lien d’acompte',
          onClick: handleCreateDepositCheckout,
          meta: 'Le devis est accepté. Sécurisez le chantier avant de le planifier.',
        };
      }
      // Cas D — acompte non active : comportement historique inchange.
      return {
        title: 'Planifier l’intervention chantier',
        ctaLabel: appointment ? 'Voir le rendez-vous' : 'Planifier l’intervention',
        onClick: appointment ? scrollToActionsAndQuote : () => { if (!appointment) openAppointmentModal(); },
        meta: appointment
          ? `Rendez-vous prévu le ${formatDateTime(appointment.start)}.`
          : 'Le devis est accepté : proposez un créneau d’intervention et préparez le passage en production.',
      };
    }
    const budgetMissing = nextAction.blockingReasons.includes('Budget absent');
    if (!latestDevis && budgetMissing) {
      return {
        title: 'Compléter le budget',
        ctaLabel: 'Contacter le client',
        onClick: scrollToActionsAndQuote,
        meta: 'Le besoin est identifié, mais le budget manque pour préparer un devis fiable.',
      };
    }
    const appointmentMissing = nextAction.blockingReasons.includes('Rendez-vous non planifié');
    if (!latestDevis && appointmentMissing) {
      return {
        title: 'Planifier un rendez-vous',
        ctaLabel: 'Planifier',
        onClick: () => { if (!appointment) openAppointmentModal(); },
        meta: 'Un échange ou une visite permettra de verrouiller les derniers éléments avant chiffrage.',
      };
    }
    if (!latestDevis) {
      return {
        title: 'Créer le devis',
        ctaLabel: 'Créer un devis',
        onClick: () => handleNextBestAction('quote'),
        meta: 'Le dossier contient assez d’éléments pour préparer une première proposition.',
      };
    }
    if (!latestDevis.sent) {
      return {
        title: 'Finaliser et envoyer le devis',
        ctaLabel: 'Voir le devis',
        onClick: () => router.push(`/dashboard-v2/projet/${id}/devis/${latestDevis.id}`),
        meta: 'Le devis existe déjà mais attend encore un envoi au client.',
      };
    }
    if (decision.canFollowUpQuote) {
      return {
        title: 'Relancer le devis',
        ctaLabel: 'Relancer le client',
        onClick: () => requestQuoteFollowUp(latestDevis),
        meta: latestDevis.opens_count > 0
          ? `Le devis a été consulté ${latestDevis.opens_count} fois. Relancez le client pendant que le projet est encore chaud.`
          : 'Le devis a été envoyé. Relancez le client pendant que le projet est encore chaud.',
      };
    }
    if (latestDevis.sent) {
      return {
        title: 'Suivre le devis envoyé',
        ctaLabel: 'Voir le devis',
        onClick: () => router.push(`/dashboard-v2/projet/${id}/devis/${latestDevis.id}`),
        meta: decision.followUpAvailableAt
          ? `Relance possible à partir du ${formatShortDate(decision.followUpAvailableAt)}.`
          : 'Le devis a été envoyé, gardez la conversation ouverte.',
      };
    }
    return {
      title: 'Clarifier le besoin',
      ctaLabel: 'Appeler le client',
      onClick: () => { if (project.clientPhone) window.location.href = `tel:${project.clientPhone}`; else scrollToActionsAndQuote(); },
      meta: 'Contactez le prospect pour compléter les informations manquantes et qualifier le dossier.',
    };
  })();
  // Acompte : etape commerciale intermediaire, affichee uniquement quand les
  // acomptes sont actives pour l'artisan (sinon on ne l'insere pas du tout
  // dans le stepper, cf. brief — comportement historique inchange sinon).
  const depositStepDone = normalizedDepositStatus === 'paid';
  const depositStepLabel = normalizedDepositStatus === 'paid'
    ? 'Acompte payé'
    : normalizedDepositStatus === 'requested'
      ? 'Acompte demandé'
      : 'Acompte à demander';
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
    ...(artisanConfig?.depositEnabled
      ? [{ id: 'deposit', label: depositStepLabel, done: depositStepDone }]
      : []),
    {
      id: 'outcome',
      label: 'Gagné / perdu',
      done: project.status === 'Gagné' || project.status === 'Perdu' || depositStepDone,
    },
  ];

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
    artisanTrades: resolvedArtisanTrades,
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
    artisanTrades: resolvedArtisanTrades,
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
  const followUpIdealActionLabel = getIdealActionLabel(project, 'followup');
  const followUpRecommendedMoment = getFollowUpRecommendedMoment(
    followUpIdealActionLabel.mainSlot,
    followUpIdealActionLabel.secondarySlot
  );
  const followUpClientLabel = [project?.clientFirstName, project?.clientName].filter(Boolean).join(' ') || 'Client non renseigné';
  const followUpProjectLabel = [project?.projectType, project?.trade].filter(Boolean).join(' · ') || 'Projet non renseigné';

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

  function handleNextBestAction(type: NextActionType | 'ask_review') {
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
          requestQuoteFollowUp(latestDevis);
        }
        break;
      }
      case 'ask_review': {
        requestGoogleReview();
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
            ? decision.state === 'quote_followup_available' ? 'Devis à relancer' : 'Devis envoyé'
            : 'Devis en préparation';
    const devisCtaLabel = !latestDevis
      ? 'Créer'
      : latestDevis.sent && !latestDevis.accepted && !latestDevis.declined
        ? decision.canFollowUpQuote ? 'Relancer' : 'Consulter'
        : 'Voir';
    const devisCtaAction = !latestDevis
      ? () => handleNextBestAction('quote')
      : latestDevis.sent && !latestDevis.accepted && !latestDevis.declined
        ? decision.canFollowUpQuote
          ? () => requestQuoteFollowUp(latestDevis)
          : () => router.push(`/dashboard-v2/projet/${id}/devis/${latestDevis.id}`)
        : () => router.push(`/dashboard-v2/projet/${id}/devis/${latestDevis.id}`);


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
        key: 'activity',
        title: 'Activite du dossier',
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activityUnavailable && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)' }}>Activite indisponible pour le moment.</p>}
            {!activityUnavailable && recentActivityItems.length === 0 && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)' }}>Aucune activite enregistree pour le moment. Les relances, demandes d'avis et changements importants apparaitront ici.</p>}
            {false && activities.length === 0 && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)' }}>Aucun évènement enregistré</p>}
            {!activityUnavailable && recentActivityItems.map((item) => {
              const tone = getActivityToneStyles(item.tone);
              return (
                <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    marginTop: '5px',
                    borderRadius: '999px',
                    background: tone.dotBg,
                    border: `1px solid ${tone.badgeBorder}`,
                    flexShrink: 0,
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-2)' }}>
                      {item.createdAt ? formatDateTime(item.createdAt) : 'Date inconnue'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-1)', fontWeight: 600 }}>
                      {item.title}
                    </p>
                    {item.detail && item.detail !== item.title && (
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.5 }}>
                        {item.detail}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {false && activities.map((a, i) => (
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
            <p style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {projectTitle}
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
            <p style={{ margin: 0 }}>RDV : {appointment ? formatDateTime(appointment.start) : 'Non planifié'}</p>
          </div>

          {/* Complément client (SMS) — uniquement pour les dossiers
              sourcés Vapi/appel vocal, cf. shouldShowSmsCompletionCard.
              Volontairement placé après Action recommandée et Résumé,
              en carte compacte (pas de slab pleine hauteur en haut de
              page) : cf. lot correctif affichage mobile. */}
          {showSmsCompletionCard && (
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 700, margin: '0 0 2px' }}>
                    Complément client
                  </p>
                  <p style={{ color: 'var(--text-3)', fontSize: '11px', margin: 0, lineHeight: 1.4 }}>
                    Envoyer un lien au client pour compléter adresse, coordonnées ou photos.
                  </p>
                </div>
                <span style={{
                  ...smsCompletionBadge.styles,
                  borderRadius: '999px',
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {!smsCompletionHasPhone && smsCompletionStatus !== 'completed' ? 'Téléphone manquant' : smsCompletionBadge.label}
                </span>
              </div>

              {smsCompletionStatus === 'completed' ? (
                <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '11px' }}>
                  Complété le <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{formatDateTime(project.completionCompletedAt)}</span>
                  {' · '}{smsCompletionPhotosCount} photo{smsCompletionPhotosCount > 1 ? 's' : ''}
                </p>
              ) : smsCompletionStatus === 'sent' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '11px' }}>
                    Envoyé le {formatDateTime(project.smsSentAt)} · en attente de complétion
                  </p>
                  {smsCompletionHasLink && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(project.smsCompletionUrl);
                          setSmsCompletionToast({ type: 'success', message: 'Lien de complément copié.' });
                        } catch {
                          setSmsCompletionToast({ type: 'error', message: 'Impossible de copier le lien.' });
                        }
                      }}
                      style={{ ...quickActionButtonStyle, padding: '8px 12px', fontSize: '12px' }}
                    >
                      Copier le lien
                    </button>
                  )}
                </div>
              ) : smsCompletionHasPhone ? (
                <button
                  type="button"
                  onClick={handleSendCompletionSms}
                  disabled={smsCompletionLoading}
                  style={{
                    ...quickActionButtonStyle,
                    background: 'var(--accent)',
                    border: '1px solid rgba(34,197,94,0.35)',
                    color: 'black',
                    fontWeight: 700,
                    padding: '9px 12px',
                    fontSize: '13px',
                    width: '100%',
                  }}
                >
                  {smsCompletionLoading ? 'Envoi...' : smsCompletionStatus === 'failed' ? "Réessayer l'envoi" : 'Envoyer le SMS'}
                </button>
              ) : null}
            </div>
          )}

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
              { label: '📅 RDV', disabled: !!appointment, onClick: () => { if (!appointment) openAppointmentModal(); } },
              { label: '📄 Devis', disabled: false, onClick: devisCtaAction },
              decision.canFollowUpQuote
                ? { label: '🔁 Relancer', disabled: false, onClick: () => latestDevis && requestQuoteFollowUp(latestDevis) }
                : { label: '📞 Contacter', disabled: !latestDevis && !project.clientPhone, onClick: () => handleNextBestAction(latestDevis ? 'followup' : 'call') },
              {
                label: '⭐ Avis Google',
                disabled: !project.clientEmail || !artisanConfig?.googleReviewUrl,
                onClick: requestGoogleReview,
              },
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
          {(!artisanConfig?.googleReviewUrl || !project.clientEmail) && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.5 }}>
              {!artisanConfig?.googleReviewUrl ? (
                <>
                  Ajoutez votre lien de demande d&apos;avis Google dans vos paramètres pour utiliser cette action.
                  <button
                    type="button"
                    onClick={() => router.push('/parametres?section=entreprise')}
                    style={{ ...quickActionButtonStyle, marginLeft: '8px', padding: '4px 10px' }}
                  >
                    Configurer
                  </button>
                </>
              ) : (
                'Ajoutez un email client pour pouvoir envoyer une demande d’avis.'
              )}
            </div>
          )}

          {/* Rendez-vous */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>Rendez-vous</p>
            {loadingAppointment ? (
              <LoadingSkeleton width="70%" height="13px" />
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
            {mobileAccordions.filter((section) => section.key !== 'activity').map((section) => {
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

          <section
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4"
            style={{ marginTop: '16px', marginBottom: '12px' }}
          >
            <div className="flex flex-col gap-2">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-1)]">Activite du dossier</h2>
                <p className="mt-1 text-sm text-[var(--text-2)]">
                  Les dernieres actions enregistrees sur ce projet.
                </p>
              </div>
              {!activityUnavailable && recentActivityItems.length > 0 && (
                <span className="inline-flex w-fit rounded-full border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-1 text-xs font-medium text-[var(--text-2)]">
                  {activityItems.length} evenement{activityItems.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {activityUnavailable && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-4 text-sm text-[var(--text-2)]">
                  Activite indisponible pour le moment.
                </div>
              )}

              {!activityUnavailable && recentActivityItems.length === 0 && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-4 text-sm text-[var(--text-2)]">
                  Aucune activite enregistree pour le moment.
                  Les relances, demandes d'avis et changements importants apparaitront ici.
                </div>
              )}

              {!activityUnavailable && recentActivityItems.map((item) => {
                const tone = getActivityToneStyles(item.tone);
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-4"
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
                    <div className="flex flex-col items-start gap-2">
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
          </section>
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
                <p className="text-xs text-[var(--text-2)] uppercase tracking-wide mb-2">Amplitude</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: 'slot', label: '1h (créneau proposé)' },
                    { key: 'custom', label: 'Durée personnalisée' },
                    { key: 'half_day', label: 'Demi-journée' },
                    { key: 'full_day', label: 'Journée complète' },
                    { key: 'multi_day', label: 'Plusieurs jours' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => { setAppointmentAmplitude(opt.key); setBookingSlot(null); }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        appointmentAmplitude === opt.key
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-1)]'
                          : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {appointmentAmplitude === 'slot' ? (
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
                              ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-1)]'
                              : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)]'
                          }`}
                        >
                          {formatDateTime(slot.start)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {!appointmentConnected && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
                      <p className="text-sm text-[var(--text-2)]">Connecter votre agenda débloquera des rendez-vous synchronisés et un planning fiable.</p>
                      <a href="/dashboard-v2" className="text-sm font-semibold text-[var(--accent)] whitespace-nowrap">Connecter Google Calendar</a>
                    </div>
                  )}
                  {appointmentAmplitude === 'custom' && (
                    <>
                      <div>
                        <label className="block text-xs text-[var(--text-2)] uppercase tracking-wide mb-1">Heure de début</label>
                        <input
                          type="time"
                          value={appointmentStartTime}
                          onChange={(e) => setAppointmentStartTime(e.target.value)}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-1)]"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[30, 60, 90, 120, 180, 240].map((min) => (
                          <button
                            key={min}
                            type="button"
                            onClick={() => setCustomDurationMin(min)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                              customDurationMin === min
                                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-1)]'
                                : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)]'
                            }`}
                          >
                            {min < 60 ? `${min}min` : min % 60 === 0 ? `${min / 60}h` : `${Math.floor(min / 60)}h${min % 60}`}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {appointmentAmplitude === 'half_day' && (
                    <div className="flex flex-wrap gap-2">
                      {([{ key: 'morning', label: 'Matin (08h-12h)' }, { key: 'afternoon', label: 'Après-midi (14h-18h)' }] as const).map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setHalfDayPeriod(opt.key)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            halfDayPeriod === opt.key
                              ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-1)]'
                              : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {appointmentAmplitude === 'full_day' && (
                    <p className="text-sm text-[var(--text-2)]">Amplitude par défaut : 08h00 - 18h00.</p>
                  )}
                  {appointmentAmplitude === 'multi_day' && (
                    <div>
                      <label className="block text-xs text-[var(--text-2)] uppercase tracking-wide mb-1">Date de fin</label>
                      <input
                        type="date"
                        value={multiDayEndDate}
                        min={appointmentDate || undefined}
                        onChange={(e) => setMultiDayEndDate(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-1)]"
                      />
                      <p className="mt-1 text-xs text-[var(--text-2)]">Chantier de {formatShortDate(appointmentDate)} 08h00 à {multiDayEndDate ? formatShortDate(multiDayEndDate) : '…'} 18h00.</p>
                    </div>
                  )}
                  {appointmentError && <p className="text-sm text-red-400">{appointmentError}</p>}

                  {(() => {
                    const range = computeManualAppointmentRange();
                    if (!range) return null;
                    const start = new Date(range.start);
                    const end = new Date(range.end);
                    return (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-xs text-[var(--text-2)]">
                        <p className="mb-1 font-semibold text-[var(--text-1)]">Récapitulatif</p>
                        <p>Début : {formatDateTime(start.toISOString())}</p>
                        <p>Fin : {formatDateTime(end.toISOString())}</p>
                        <p>{appointmentConnected ? 'Sera synchronisé avec Google Calendar.' : 'Google Calendar non connecté — synchronisation impossible.'}</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {((appointmentAmplitude === 'slot' && appointmentConnected && appointmentSlots.length > 0) || (appointmentAmplitude !== 'slot' && appointmentConnected)) && (
                <button
                  onClick={confirmAppointment}
                  disabled={appointmentAmplitude === 'slot' ? !bookingSlot : !computeManualAppointmentRange()}
                  className="w-full bg-[var(--accent)] text-black font-bold rounded-lg px-4 py-2 disabled:opacity-50"
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
      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-5 sm:px-6 sm:py-8">
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
                {projectTitle}
              </h1>
              <p style={{
                color: 'var(--text-2)',
                fontSize: '14px',
                margin: 0,
              }}>
                {heroSubtitle}
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
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'flex-start' : 'flex-end',
              }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  color: 'var(--text-2)',
                }}>
                  Score {nextAction.maturityScore}/100
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-2)',
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
            marginBottom: '16px',
          }}>
            {[
              `Budget ${budgetLabel}`,
              `Délai ${timelineLabel}`,
              `Source ${sourceLabel}`,
            ].map((badge) => (
              <span
                key={badge}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: '999px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-2)',
                }}
              >
                {badge}
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

        {/* Pilotage commercial — fusion de "Action recommandée" et
            "Avancement commercial" (sortie de l'Action Engine, src/lib/action-engine.ts,
            + timeline commerciale) dans une seule carte pleine largeur, pour
            réduire la hauteur totale sans perdre la hiérarchie : action à
            gauche (CTA toujours visible), timeline compacte à droite. */}
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
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 6px' }}>
                {recommendedAction.meta}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '10px' }}>
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
                <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '0 0 6px' }}>
                  Blocages : {nextAction.blockingReasons.join(' · ')}
                </p>
              )}
              {NEXT_ACTION_CTA_DISABLED_REASON[nextAction.actionType] && (
                <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '0 0 6px' }}>
                  {NEXT_ACTION_CTA_DISABLED_REASON[nextAction.actionType]}
                </p>
              )}
              {(() => {
                const ctaActionable = !!recommendedAction.onClick && !NEXT_ACTION_CTA_DISABLED_REASON[nextAction.actionType];
                const disabledTitle = NEXT_ACTION_CTA_DISABLED_REASON[nextAction.actionType]
                  || (!recommendedAction.onClick ? 'Action pas encore disponible depuis cette carte' : undefined);
                return (
                  <button
                    type="button"
                    onClick={recommendedAction.onClick}
                    disabled={!ctaActionable}
                    title={!ctaActionable ? disabledTitle : undefined}
                    style={{
                      marginTop: '4px',
                      background: ctaActionable ? 'var(--accent)' : 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: ctaActionable ? '#fff' : 'var(--text-3)',
                      cursor: ctaActionable ? 'pointer' : 'not-allowed',
                      opacity: ctaActionable ? 1 : 0.6,
                      width: isMobile ? '100%' : undefined,
                    }}
                  >
                    {recommendedAction.ctaLabel}
                  </button>
                );
              })()}
              {/* Décision commerciale manuelle — seul endroit de la fiche
                  permettant de marquer un dossier gagné/perdu à la main
                  (ex. accord verbal, refus téléphonique), en plus du
                  passage automatique via l'acceptation/le refus du devis
                  en ligne. Remplace les anciens boutons dupliqués de
                  "Actions et devis" (Faire avancer le dossier / Clôture). */}
              {project.status !== 'Gagné' && project.status !== 'Perdu' && (
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

            {/* Avancement commercial — timeline verticale compacte pour ne
                jamais prendre plus de place que l'action recommandée. */}
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
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
          gap: '10px',
          marginBottom: '16px',
        }}>
          {/* Rendez-vous — porte désormais le résumé compact du RDV (date,
              amplitude/durée, statut de synchronisation Google Calendar),
              la carte "Rendez-vous" dédiée ayant été retirée (doublon). */}
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
            <p style={{ fontSize: '13px', color: appointment ? 'var(--accent)' : 'var(--text-1)', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
              {loadingAppointment ? 'Chargement...' : summarizeAppointment(appointment).detail}
            </p>
          </button>

          {/* Suivi client — uniquement actionnable quand decision.canFollowUpQuote
              est vraie, pour ne jamais contredire l'Action recommandée */}
          <button
            onClick={() => decision.canFollowUpQuote && latestDevis ? requestQuoteFollowUp(latestDevis) : handleNextBestAction(latestDevis ? 'followup' : 'call')}
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

          {/* Devis client */}
          <button
            onClick={() => latestDevis ? router.push(`/dashboard-v2/projet/${id}/devis/${latestDevis.id}`) : handleNextBestAction('quote')}
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
                : decision.state === 'quote_draft'
                  ? 'Reprendre le devis'
                  : decision.state === 'quote_accepted'
                    ? 'Devis accepté'
                    : decision.state === 'quote_declined'
                      ? 'Devis refusé'
                      : decision.canFollowUpQuote
                        ? 'Consulter / relancer'
                        : 'Consulter le devis'}
            </p>
          </button>

          {/* Avis Google — même logique/handler que l'action rapide mobile
              (requestGoogleReview) ; auparavant absente en desktop (bug
              d'affichage), pas de condition métier supplémentaire ajoutée. */}
          <button
            onClick={requestGoogleReview}
            disabled={!project.clientEmail || !artisanConfig?.googleReviewUrl}
            title={!artisanConfig?.googleReviewUrl
              ? "Ajoutez votre lien de demande d'avis Google dans vos paramètres."
              : !project.clientEmail
                ? 'Ajoutez un email client pour pouvoir envoyer une demande d’avis.'
                : undefined}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'left',
              cursor: (!project.clientEmail || !artisanConfig?.googleReviewUrl) ? 'not-allowed' : 'pointer',
              opacity: (!project.clientEmail || !artisanConfig?.googleReviewUrl) ? 0.5 : 1,
            }}
          >
            <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              ⭐ Avis client
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 600, margin: 0 }}>
              Demander avis Google
            </p>
          </button>
        </div>

        {/* Portail client — reprend la logique de l'endpoint interne
            /api/projects/[id]/client-portal-link (token généré paresseusement
            côté serveur). Le front ne fait qu'appeler l'endpoint et copier
            l'URL renvoyée, aucune génération de token côté client. */}
        <div style={{
          marginBottom: '16px',
          padding: isMobile ? '14px' : '16px',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div>
            <p style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>
              Portail client
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
              Partagez ce lien avec le client pour qu'il consulte et complète sa demande.
            </p>
          </div>
          <button
            type="button"
            onClick={copyClientPortalLink}
            disabled={clientPortalLoading || !project?.id}
            style={{
              ...quickActionButtonStyle,
              width: isMobile ? '100%' : 'fit-content',
              opacity: (clientPortalLoading || !project?.id) ? 0.6 : 1,
              cursor: (clientPortalLoading || !project?.id) ? 'not-allowed' : 'pointer',
            }}
          >
            {clientPortalLoading ? 'Copie en cours...' : 'Copier le lien'}
          </button>
        </div>

        {/* Retours client / Compléments client — distinct des notes internes
            (section plus bas) : ce bloc n'affiche QUE ce qui vient du client
            via le portail (messages, dernière mise à jour, complétions),
            jamais les notes internes de l'artisan. Tolérant à tous les
            formats de client_messages et à l'absence des colonnes portail
            (migration non encore appliquée). */}
        {(() => {
          const clientMessages = parseClientMessages(project?.clientMessages);
          const clientUpdateCount = Number(project?.clientUpdateCount) || 0;
          const clientLastUpdateAt = project?.clientLastUpdateAt || null;
          const hasClientActivity = clientUpdateCount > 0 || !!clientLastUpdateAt || clientMessages.length > 0;

          return (
            <div style={{
              marginBottom: '16px',
              padding: isMobile ? '14px' : '16px',
              borderRadius: '14px',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <p style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 700, margin: 0 }}>
                  Retours client
                </p>
                {hasClientActivity && (
                  <span style={{
                    background: 'rgba(22,163,74,0.15)',
                    color: '#16a34a',
                    border: '1px solid rgba(22,163,74,0.3)',
                    borderRadius: '999px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}>
                    {clientUpdateCount > 0 ? 'Infos complétées par le client' : 'Complément client reçu'}
                  </span>
                )}
              </div>

              <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>
                {clientLastUpdateAt
                  ? `Dernière mise à jour client : ${formatDateTime(clientLastUpdateAt)}`
                  : 'Aucune mise à jour client pour le moment'}
              </p>

              {!hasClientActivity && (
                <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>
                  Aucun complément reçu via le portail client pour le moment.
                </p>
              )}

              {hasClientActivity && (
                <p style={{ color: 'var(--text-2)', fontSize: '12px', margin: 0 }}>
                  Le client a complété certaines informations depuis le portail.
                  {project?.siteAddress || project?.budget || project?.desiredTimeline ? ' Résumé :' : ''}
                </p>
              )}

              {hasClientActivity && (project?.siteAddress || project?.budget || project?.desiredTimeline) && (
                <ul style={{ margin: 0, padding: '0 0 0 18px', color: 'var(--text-2)', fontSize: '12px', lineHeight: 1.7 }}>
                  {project?.siteAddress && <li>Adresse chantier : {project.siteAddress}</li>}
                  {project?.budget && <li>Budget : {project.budget}</li>}
                  {project?.desiredTimeline && <li>Délai souhaité : {project.desiredTimeline}</li>}
                </ul>
              )}

              {/* Discussion client — bulles façon iOS, réservées aux SEULS
                  types de discussion (client_message / artisan_reply).
                  client_info_updated et les autres événements système ne
                  sont jamais rendus ici : ils vivent dans l'activité du
                  dossier plus bas sur la page. Repli sur l'ancien champ
                  client_messages (texte accumulé) uniquement si la nouvelle
                  table ne renvoie aucun message de discussion (anciens
                  projets / migration pas encore appliquée). */}
              {(() => {
                const discussionEvents = clientTimelineEvents.filter(
                  (ev) => ev.type === 'client_message' || ev.type === 'artisan_reply',
                );
                const useLegacyFallback = discussionEvents.length === 0 && clientMessages.length > 0;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    <p style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 600, margin: 0 }}>
                      Discussion client
                    </p>

                    {discussionEvents.length === 0 && !useLegacyFallback && (
                      <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '4px 0 0', fontStyle: 'italic' }}>
                        Aucun message client pour le moment.
                      </p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                      {useLegacyFallback
                        ? clientMessages.map((msg, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <div
                              style={{
                                maxWidth: isMobile ? '88%' : '72%',
                                background: '#f1f5f9',
                                color: '#0f172a',
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px 16px 16px 4px',
                                padding: '10px 14px',
                              }}
                            >
                              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                                Client{msg.date ? ` · ${msg.date}` : ''}
                              </div>
                              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {msg.text}
                              </p>
                            </div>
                          </div>
                        ))
                        : discussionEvents.map((ev) => {
                          const isClient = ev.type === 'client_message';
                          return (
                            <div key={ev.id} style={{ display: 'flex', justifyContent: isClient ? 'flex-start' : 'flex-end' }}>
                              <div
                                style={{
                                  maxWidth: isMobile ? '88%' : '72%',
                                  background: isClient ? '#f1f5f9' : 'var(--accent)',
                                  color: isClient ? '#0f172a' : '#ffffff',
                                  border: isClient ? '1px solid #e2e8f0' : 'none',
                                  borderRadius: isClient ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                                  padding: '10px 14px',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    marginBottom: '4px',
                                    color: isClient ? '#64748b' : 'rgba(255,255,255,0.8)',
                                    textAlign: isClient ? 'left' : 'right',
                                  }}
                                >
                                  {isClient ? 'Client' : 'Vous'}
                                  {ev.createdAt ? ` · ${formatDateTime(ev.createdAt)}` : ''}
                                </div>
                                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                  {ev.message || ev.title}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })()}

              {/* Réponse artisan — publiée dans le portail client (visible
                  du client final), strictement distincte des notes internes
                  (section séparée plus bas dans la page). */}
              <div style={{
                marginTop: '4px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <p style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 600, margin: 0 }}>
                  Répondre au client
                </p>
                <textarea
                  value={clientReplyMessage}
                  onChange={(e) => {
                    setClientReplyMessage(e.target.value);
                    setClientReplyError('');
                    setClientReplySuccess('');
                  }}
                  placeholder="Votre réponse sera visible par le client dans son portail..."
                  rows={3}
                  maxLength={2000}
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    color: 'var(--text-1)',
                    background: 'var(--bg-hover)',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
                {clientReplyError && (
                  <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{clientReplyError}</p>
                )}
                {clientReplySuccess && (
                  <p style={{ fontSize: '12px', color: '#16a34a', margin: 0, fontWeight: 600 }}>{clientReplySuccess}</p>
                )}
                <button
                  type="button"
                  onClick={submitClientReply}
                  disabled={clientReplySending || !clientReplyMessage.trim()}
                  style={{
                    width: isMobile ? '100%' : 'fit-content',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: (clientReplySending || !clientReplyMessage.trim()) ? 'var(--bg-elevated)' : 'var(--accent)',
                    color: (clientReplySending || !clientReplyMessage.trim()) ? 'var(--text-3)' : '#ffffff',
                    boxShadow: (clientReplySending || !clientReplyMessage.trim()) ? 'none' : '0 2px 10px rgba(0,0,0,0.18)',
                    opacity: (clientReplySending || !clientReplyMessage.trim()) ? 0.7 : 1,
                    cursor: (clientReplySending || !clientReplyMessage.trim()) ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  {clientReplySending ? 'Publication...' : 'Publier dans le portail client'}
                </button>
              </div>
            </div>
          );
        })()}

        {false && (
        <section
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-6"
          style={{ marginBottom: '16px' }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-1)]">Activite du dossier</h2>
              <p className="mt-1 text-sm text-[var(--text-2)]">
                Les dernieres actions enregistrees sur ce projet.
              </p>
            </div>
            {!activityUnavailable && recentActivityItems.length > 0 && (
              <span className="inline-flex w-fit rounded-full border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-1 text-xs font-medium text-[var(--text-2)]">
                {activityItems.length} evenement{activityItems.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {activityUnavailable && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-4 text-sm text-[var(--text-2)]">
                Activite indisponible pour le moment.
              </div>
            )}

            {!activityUnavailable && recentActivityItems.length === 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-4 text-sm text-[var(--text-2)]">
                Aucune activite enregistree pour le moment.
                Les relances, demandes d'avis et changements importants apparaitront ici.
              </div>
            )}

            {!activityUnavailable && recentActivityItems.map((item) => {
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
        </section>
        )}

        {/* Analyse Kadria — bloc secondaire d'aide à la lecture du dossier,
            volontairement plus neutre que l'Action recommandée. */}
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
            ) : analysis.nextBestAction.type === 'followup' && !decision.canFollowUpQuote ? (
              // Le devis vient d'être envoyé ou n'est pas encore éligible à la
              // relance (cf. decision.canFollowUpQuote, source unique) : on
              // n'affiche jamais de bouton "Relancer" actif ici, pour ne pas
              // contredire l'Action recommandée et la carte Devis.
              <span style={{
                color: 'var(--text-3)',
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {decision.followUpAvailableAt
                  ? `Relance possible à partir du ${formatShortDate(decision.followUpAvailableAt)}`
                  : 'En attente de réponse client'}
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

          {/* Complément client (SMS) — Actions complémentaires, uniquement
              pour les dossiers sourcés Vapi/appel vocal (cf.
              shouldShowSmsCompletionCard). Anciennement piégé dans le modal
              de clôture commerciale (rendu invisible en usage normal) ;
              déplacé ici en carte contextuelle standalone. */}
          {showSmsCompletionCard && (
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Actions complémentaires
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>
                    Complément client
                  </p>
                  <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                    Envoyer un lien au client pour compléter adresse, coordonnées ou photos.
                  </p>
                </div>
                <span style={{
                  ...smsCompletionBadge.styles,
                  borderRadius: '999px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  {!smsCompletionHasPhone && smsCompletionStatus !== 'completed' ? 'Téléphone manquant' : smsCompletionBadge.label}
                </span>
              </div>

              {smsCompletionStatus === 'completed' ? (
                <div style={{ display: 'grid', gap: '8px' }}>
                  <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '12px' }}>
                    Complété le <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{formatDateTime(project.completionCompletedAt)}</span>
                  </p>
                  <div style={{ display: 'grid', gap: '6px', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '12px' }}>
                      Client : <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{clientLabel}</span>
                    </p>
                    <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '12px' }}>
                      Email : <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{project.clientEmail || 'Non renseigné'}</span>
                    </p>
                    <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '12px' }}>
                      Adresse : <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{project.siteAddress || 'Non renseignée'}</span>
                    </p>
                    <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '12px' }}>
                      Ville / CP : <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{[project.city, project.postalCode].filter(Boolean).join(' ') || 'Non renseignés'}</span>
                    </p>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '12px' }}>
                    Photos ajoutées : <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{smsCompletionPhotosCount}</span>
                  </p>
                </div>
              ) : smsCompletionStatus === 'sent' ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '12px' }}>
                    Envoyé le <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{formatDateTime(project.smsSentAt)}</span> · en attente de complétion
                  </p>
                  {smsCompletionHasLink && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(project.smsCompletionUrl);
                            setSmsCompletionToast({ type: 'success', message: 'Lien de complément copié.' });
                          } catch {
                            setSmsCompletionToast({ type: 'error', message: 'Impossible de copier le lien.' });
                          }
                        }}
                        style={quickActionButtonStyle}
                      >
                        Copier le lien
                      </button>
                      <a
                        href={project.smsCompletionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          ...quickActionButtonStyle,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        Ouvrir le lien
                      </a>
                    </div>
                  )}
                </div>
              ) : smsCompletionHasPhone ? (
                <button
                  type="button"
                  onClick={handleSendCompletionSms}
                  disabled={smsCompletionLoading}
                  style={{
                    ...quickActionButtonStyle,
                    background: 'var(--accent)',
                    border: '1px solid rgba(34,197,94,0.35)',
                    color: 'black',
                    fontWeight: 700,
                    width: 'fit-content',
                  }}
                >
                  {smsCompletionLoading ? 'Envoi...' : smsCompletionStatus === 'failed' ? "Réessayer l'envoi" : 'Envoyer le SMS'}
                </button>
              ) : null}
            </div>
          )}

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

          {/* Frais de déplacement estimés — intégré à Analyse Kadria (source
              unique pour ce sujet, l'ancienne carte isolée a été retirée).
              Reprend exactement les mêmes helpers de calcul que l'ancienne
              carte, sans inventer de logique supplémentaire. */}
          <div style={{ padding: isMobile ? '16px' : '16px 20px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <p style={{
              color: 'var(--text-3)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: '0 0 10px',
            }}>
              🚗 Frais de déplacement
            </p>
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

              // Cas 3 — pas d'adresse chantier : non disponible.
              if (!siteAddress) {
                return (
                  <>
                    <p style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>Non disponible</p>
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>
                      Adresse chantier manquante sur le dossier. Ajoutez-la pour permettre l&apos;estimation.
                    </p>
                  </>
                );
              }
              if (!originAddress) {
                return (
                  <>
                    <p style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>Non disponible</p>
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>
                      Adresse professionnelle manquante dans vos paramètres.
                    </p>
                  </>
                );
              }
              // Cas 2 — adresse(s) présente(s) mais coordonnées GPS ou
              // motorisation manquantes : estimation à fiabiliser.
              if (
                originLat === undefined || originLng === undefined
                || destLat === null || destLat === undefined || destLng === null || destLng === undefined
              ) {
                return (
                  <>
                    <p style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>Estimation à fiabiliser</p>
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>
                      {originLat === undefined || originLng === undefined
                        ? "Adresse professionnelle non géocodée. Resélectionnez-la via l'autocomplete dans Paramètres."
                        : "Adresse chantier renseignée mais coordonnées GPS manquantes. Ressaisissez-la via l'autocomplete pour fiabiliser l'estimation."}
                    </p>
                  </>
                );
              }
              if (!travelConfig?.vehicleType) {
                return (
                  <>
                    <p style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>Estimation à fiabiliser</p>
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>
                      Motorisation non renseignée dans vos paramètres.
                    </p>
                  </>
                );
              }

              // Cas 1 — toutes les données sont disponibles : estimation
              // fiable, calculée avec les mêmes helpers que précédemment.
              const distanceKm = haversineDistanceKm(originLat, originLng, destLat, destLng);
              const result = calculateTravelCost(distanceKm, {
                vehicleType: travelConfig.vehicleType as VehicleType,
                consumptionPer100Km: travelConfig.consumptionPer100Km,
                chargingType: travelConfig.chargingType as ChargingType | undefined,
                customCostPerKm: travelConfig.customCostPerKm,
              });
              if (!result) {
                return (
                  <>
                    <p style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>Estimation à fiabiliser</p>
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>Impossible de calculer le déplacement.</p>
                  </>
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
                  <p style={{ color: 'var(--accent)', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>
                    ≈ {result.cost.toFixed(2)} € estimés
                  </p>
                  <p style={{ color: 'var(--text-2)', fontSize: '12px', margin: '0 0 6px' }}>
                    {result.distanceKm.toFixed(1)} km aller · {result.distanceKmAR.toFixed(1)} km aller-retour ({result.energyLabel})
                  </p>
                  <p style={{ color: 'var(--text-3)', fontSize: '11px', margin: 0 }}>
                    À intégrer dans votre tarification (forfait déplacement) — {recommendation.isFreeZone
                      ? 'chantier en zone proche, aucun frais spécifique n’est suggéré.'
                      : recommendation.reason}
                  </p>
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

        {/* Photos du projet — galerie visible (auparavant, seul un compte
            texte "X photo(s) jointe(s)" existait, aucune image affichée). */}
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
              {project.photos.map((photo: { url: string; thumbnailUrl?: string; filename?: string }, i: number) => (
                <a
                  key={`${photo.url}-${i}`}
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}
                >
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt={photo.filename || `Photo ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}

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

        <div ref={actionsAndQuoteRef} style={{
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
              "Pilotage commercial" plus haut — plus de bloc "Faire avancer
              le dossier" ici, pour éviter la double commande de statut. */}
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
                Acompte
              </p>
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '14px',
                background: 'var(--bg-elevated)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                {!artisanConfig?.depositEnabled ? (
                  <>
                    <p style={{ margin: 0, color: 'var(--text-1)', fontSize: '14px', fontWeight: 700 }}>Acompte non active</p>
                    <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6 }}>
                      Activez les acomptes dans les parametres pour securiser les chantiers acceptes.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('/parametres?section=catalogue')}
                      style={{
                        alignSelf: 'flex-start',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-1)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Configurer les acomptes
                    </button>
                  </>
                ) : !recommendedDeposit ? (
                  <>
                    <p style={{ margin: 0, color: 'var(--text-1)', fontSize: '14px', fontWeight: 700 }}>Montant devis necessaire</p>
                    <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6 }}>
                      Ajoutez un montant de devis pour calculer un acompte recommande.
                    </p>
                  </>
                ) : normalizedDepositStatus === 'paid' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ margin: 0, color: 'var(--text-1)', fontSize: '14px', fontWeight: 700 }}>Acompte paye</p>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: '12px' }}>
                          {recommendedDeposit.basisLabel}
                        </p>
                      </div>
                      <span style={{ color: '#4ade80', fontSize: '20px', fontWeight: 800 }}>
                        {formatEuro(effectiveDepositAmount)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        borderRadius: '999px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(34,197,94,0.12)',
                        color: '#4ade80',
                        border: '1px solid rgba(34,197,94,0.22)',
                      }}>
                        Acompte paye
                      </span>
                      {depositPaidDateLabel && (
                        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                          Paye le {depositPaidDateLabel}
                        </span>
                      )}
                    </div>
                    {depositActionMessage && (
                      <p style={{ margin: 0, color: 'var(--accent)', fontSize: '12px', lineHeight: 1.5 }}>
                        {depositActionMessage}
                      </p>
                    )}
                    {depositPaymentUrl && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => window.open(depositPaymentUrl, '_blank', 'noopener,noreferrer')}
                          style={{
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-1)',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Ouvrir le lien
                        </button>
                      </div>
                    )}
                  </>
                ) : hasDepositLink ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ margin: 0, color: 'var(--text-1)', fontSize: '14px', fontWeight: 700 }}>Lien d&apos;acompte genere</p>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: '12px' }}>
                          {recommendedDeposit.basisLabel}
                        </p>
                      </div>
                      <span style={{ color: 'var(--accent)', fontSize: '20px', fontWeight: 800 }}>
                        {formatEuro(effectiveDepositAmount)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        borderRadius: '999px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(59,130,246,0.12)',
                        color: '#93c5fd',
                        border: '1px solid rgba(148,163,184,0.18)',
                      }}>
                        Demande
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {depositPaymentUrl}
                      </span>
                    </div>
                    {depositActionMessage && (
                      <p style={{ margin: 0, color: 'var(--accent)', fontSize: '12px', lineHeight: 1.5 }}>
                        {depositActionMessage}
                      </p>
                    )}
                    {depositActionError && (
                      <p style={{ margin: 0, color: '#fca5a5', fontSize: '12px', lineHeight: 1.5 }}>
                        {depositActionError}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => copyDepositLink(depositPaymentUrl)}
                        style={{
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--text-1)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Copier le lien
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(depositPaymentUrl, '_blank', 'noopener,noreferrer')}
                        style={{
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--text-1)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Ouvrir le lien
                      </button>
                    </div>
                  </>
                ) : normalizedStripeConnectStatus !== 'active' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ margin: 0, color: 'var(--text-1)', fontSize: '14px', fontWeight: 700 }}>Acompte recommande</p>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: '12px' }}>{recommendedDeposit.basisLabel}</p>
                      </div>
                      <span style={{ color: 'var(--accent)', fontSize: '20px', fontWeight: 800 }}>
                        {formatEuro(recommendedDeposit.amount)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        borderRadius: '999px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(148,163,184,0.12)',
                        color: 'var(--text-2)',
                        border: '1px solid rgba(148,163,184,0.18)',
                      }}>
                        {normalizedStripeConnectStatus === 'pending'
                          ? 'Configuration en attente'
                          : normalizedStripeConnectStatus === 'restricted'
                            ? 'Action requise'
                            : 'Stripe non connecte'}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                        {normalizedStripeConnectStatus === 'pending' || normalizedStripeConnectStatus === 'restricted'
                          ? 'Terminez la configuration Stripe pour creer un lien d’acompte.'
                          : 'Connectez Stripe pour creer un lien d’acompte.'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push('/parametres?section=catalogue')}
                      style={{
                        alignSelf: 'flex-start',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-1)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {normalizedStripeConnectStatus === 'pending' || normalizedStripeConnectStatus === 'restricted'
                        ? 'Configurer Stripe'
                        : 'Connecter Stripe'}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ margin: 0, color: 'var(--text-1)', fontSize: '14px', fontWeight: 700 }}>Acompte recommande</p>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: '12px' }}>{recommendedDeposit.basisLabel}</p>
                      </div>
                      <span style={{ color: 'var(--accent)', fontSize: '20px', fontWeight: 800 }}>
                        {formatEuro(recommendedDeposit.amount)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        borderRadius: '999px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: normalizedDepositStatus === 'requested'
                            ? 'rgba(59,130,246,0.12)'
                            : 'rgba(148,163,184,0.12)',
                        color: normalizedDepositStatus === 'requested'
                            ? '#93c5fd'
                            : 'var(--text-2)',
                        border: '1px solid rgba(148,163,184,0.18)',
                      }}>
                        {normalizedDepositStatus === 'requested'
                          ? 'Acompte demande'
                          : normalizedDepositStatus === 'cancelled'
                            ? 'Acompte annule'
                            : 'Stripe connecte'}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                        Stripe est connecte. La generation des liens d’acompte sera activee dans la prochaine etape.
                      </span>
                    </div>
                    {depositActionMessage && (
                      <p style={{ margin: 0, color: 'var(--accent)', fontSize: '12px', lineHeight: 1.5 }}>
                        {depositActionMessage}
                      </p>
                    )}
                    {depositActionError && (
                      <p style={{ margin: 0, color: '#fca5a5', fontSize: '12px', lineHeight: 1.5 }}>
                        {depositActionError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleCreateDepositCheckout}
                      disabled={depositCheckoutLoading}
                      style={{
                        alignSelf: 'flex-start',
                        border: 'none',
                        background: 'var(--accent)',
                        color: 'black',
                        borderRadius: '10px',
                        padding: '9px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: depositCheckoutLoading ? 'wait' : 'pointer',
                        opacity: depositCheckoutLoading ? 0.7 : 1,
                      }}
                    >
                      {depositCheckoutLoading ? 'Creation du lien...' : "Creer le lien d'acompte"}
                    </button>
                  </>
                )}
              </div>
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
              {/* Lecture seule : le montant du devis ne doit jamais être
                  saisi librement dans la fiche projet (raison juridique/
                  business), il vient uniquement du devis réellement généré/
                  envoyé, figé à l'envoi. */}
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '12px 14px',
                background: 'var(--bg-elevated)',
              }}>
                {sentDevis ? (
                  <>
                    <p style={{ margin: 0, color: 'var(--text-1)', fontSize: '14px', fontWeight: 700 }}>
                      Devis envoyé : {formatInteger(sentDevis.amount)} €
                    </p>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: '12px', lineHeight: 1.5 }}>
                      Montant figé à l&apos;envoi client.
                    </p>
                  </>
                ) : preparedDevis ? (
                  <>
                    <p style={{ margin: 0, color: 'var(--text-1)', fontSize: '14px', fontWeight: 700 }}>
                      Montant préparé : {formatInteger(preparedDevis.amount)} €
                    </p>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: '12px', lineHeight: 1.5 }}>
                      Non figé juridiquement tant que le devis n&apos;a pas été envoyé au client.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, color: 'var(--text-1)', fontSize: '14px', fontWeight: 700 }}>
                      Aucun devis envoyé
                    </p>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: '12px', lineHeight: 1.5 }}>
                      Le montant sera renseigné automatiquement après génération et envoi du devis au client.
                    </p>
                  </>
                )}
              </div>
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
                              ✓ {latestDevis && devis.id === latestDevis.id && decision.state === 'quote_followup_available' ? 'Devis à relancer' : 'Envoyé'}
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
                            // Pour le devis courant, on recoupe l'éligibilité
                            // quote-followup.ts avec le délai de grâce 48h de
                            // l'Action Engine (decision.canFollowUpQuote) afin
                            // de ne jamais afficher un bouton "Relancer" actif
                            // alors que l'Action recommandée dit d'attendre.
                            const effectiveCanFollowUp = latestDevis && devis.id === latestDevis.id
                              ? decision.canFollowUpQuote
                              : followupState.canFollowUp;
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
                                  {effectiveCanFollowUp && (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        requestQuoteFollowUp(devis);
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
                                        : effectiveCanFollowUp && followupState.nextFollowupAt
                                          ? followupState.shouldAutoFollowUp
                                            ? `Relance prévue : ${followupState.reason}`
                                            : `Prochaine relance prévue le ${formatDevisDate(followupState.nextFollowupAt)}`
                                          : latestDevis && devis.id === latestDevis.id && decision.followUpAvailableAt
                                            ? `Relance possible à partir du ${formatDevisDate(decision.followUpAvailableAt)}`
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

        <section
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-6"
          style={{ marginBottom: '16px' }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-1)]">Activite du dossier</h2>
              <p className="mt-1 text-sm text-[var(--text-2)]">
                Les dernieres actions enregistrees sur ce projet.
              </p>
            </div>
            {!activityUnavailable && recentActivityItems.length > 0 && (
              <span className="inline-flex w-fit rounded-full border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-1 text-xs font-medium text-[var(--text-2)]">
                {activityItems.length} evenement{activityItems.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {activityUnavailable && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-4 text-sm text-[var(--text-2)]">
                Activite indisponible pour le moment.
              </div>
            )}

            {!activityUnavailable && recentActivityItems.length === 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-4 text-sm text-[var(--text-2)]">
                Aucune activite enregistree pour le moment.
                Les relances, demandes d'avis et changements importants apparaitront ici.
              </div>
            )}

            {!activityUnavailable && recentActivityItems.map((item) => {
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
        </section>
      </main>

      {followUpConfirmDevis && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (!followingUpDevisId) {
              setFollowUpConfirmDevis(null);
              setFollowUpConfirmError('');
            }
          }}
        >
          <div
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 max-w-lg w-full space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[var(--text-1)] font-bold text-lg m-0">
                  {followUpRecommendedMoment.hasRecommendation && !followUpRecommendedMoment.isInRecommendedSlot
                    ? 'Confirmer l’envoi maintenant ?'
                    : 'Confirmer la relance du devis'}
                </h2>
                <p className="text-sm text-[var(--text-2)] mt-1 mb-0">
                  {followUpRecommendedMoment.hasRecommendation
                    ? followUpRecommendedMoment.isInRecommendedSlot
                      ? 'Vous êtes dans le créneau recommandé pour relancer ce client.'
                      : `Pour maximiser les chances d’ouverture, il est conseillé d’envoyer cette relance ${followUpRecommendedMoment.recommendedLabel}.`
                    : 'Une relance sera envoyée au client pour ce devis.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!followingUpDevisId) {
                    setFollowUpConfirmDevis(null);
                    setFollowUpConfirmError('');
                  }
                }}
                disabled={Boolean(followingUpDevisId)}
                className="text-[var(--text-2)] hover:text-[var(--text-1)] disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-3 text-sm">
              <p className="m-0 text-[var(--text-2)]">
                Client : <span className="text-[var(--text-1)] font-semibold">{followUpClientLabel}</span>
              </p>
              <p className="m-0 mt-2 text-[var(--text-2)]">
                Devis : <span className="text-[var(--text-1)] font-semibold">{followUpConfirmDevis.numero || 'Non renseigné'}</span>
              </p>
              <p className="m-0 mt-2 text-[var(--text-2)]">
                Projet : <span className="text-[var(--text-1)] font-semibold">{followUpProjectLabel}</span>
              </p>
            </div>

            {followUpConfirmError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {followUpConfirmError}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!followingUpDevisId) {
                    setFollowUpConfirmDevis(null);
                    setFollowUpConfirmError('');
                  }
                }}
                disabled={Boolean(followingUpDevisId)}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-2.5 text-sm font-semibold text-[var(--text-1)] transition hover:border-green-500/40 hover:text-white disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => followUpQuote(followUpConfirmDevis)}
                disabled={followingUpDevisId === followUpConfirmDevis.id}
                className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-60"
              >
                {followingUpDevisId === followUpConfirmDevis.id
                  ? 'Envoi en cours...'
                  : followUpRecommendedMoment.hasRecommendation && !followUpRecommendedMoment.isInRecommendedSlot
                    ? 'Envoyer maintenant'
                    : 'Envoyer la relance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewRequestConfirmOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (!sendingReviewRequest) {
              setReviewRequestConfirmOpen(false);
              setReviewRequestError('');
            }
          }}
        >
          <div
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 max-w-lg w-full space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[var(--text-1)] font-bold text-lg m-0">Demander un avis Google</h2>
                <p className="text-sm text-[var(--text-2)] mt-1 mb-0">
                  Un email sera envoyé au client avec votre lien d&apos;avis Google.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!sendingReviewRequest) {
                    setReviewRequestConfirmOpen(false);
                    setReviewRequestError('');
                  }
                }}
                disabled={sendingReviewRequest}
                className="text-[var(--text-2)] hover:text-[var(--text-1)] disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-3 text-sm">
              <p className="m-0 text-[var(--text-2)]">
                Client : <span className="text-[var(--text-1)] font-semibold">{clientLabel}</span>
              </p>
              <p className="m-0 mt-2 text-[var(--text-2)]">
                Email : <span className="text-[var(--text-1)] font-semibold">{project?.clientEmail || 'Non renseigné'}</span>
              </p>
              <p className="m-0 mt-2 text-[var(--text-2)]">
                Projet : <span className="text-[var(--text-1)] font-semibold">{projectTitle}</span>
              </p>
            </div>

            {reviewRequestError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {reviewRequestError}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!sendingReviewRequest) {
                    setReviewRequestConfirmOpen(false);
                    setReviewRequestError('');
                  }
                }}
                disabled={sendingReviewRequest}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-4 py-2.5 text-sm font-semibold text-[var(--text-1)] transition hover:border-green-500/40 hover:text-white disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={sendGoogleReviewRequest}
                disabled={sendingReviewRequest}
                className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-60"
              >
                {sendingReviewRequest ? 'Envoi en cours...' : 'Envoyer la demande'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <p className="text-xs text-[var(--text-2)] uppercase tracking-wide mb-2">Amplitude</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'slot', label: '1h (créneau proposé)' },
                  { key: 'custom', label: 'Durée personnalisée' },
                  { key: 'half_day', label: 'Demi-journée' },
                  { key: 'full_day', label: 'Journée complète' },
                  { key: 'multi_day', label: 'Plusieurs jours' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => { setAppointmentAmplitude(opt.key); setBookingSlot(null); }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      appointmentAmplitude === opt.key
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-1)]'
                        : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {appointmentAmplitude === 'slot' ? (
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
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-1)]'
                            : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)]'
                        }`}
                      >
                        {formatDateTime(slot.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {!appointmentConnected && (
                  <p className="text-sm text-[var(--text-2)]">Agenda non connecté — la synchronisation ne sera pas possible.</p>
                )}
                {appointmentAmplitude === 'custom' && (
                  <>
                    <div>
                      <label className="block text-xs text-[var(--text-2)] uppercase tracking-wide mb-1">Heure de début</label>
                      <input
                        type="time"
                        value={appointmentStartTime}
                        onChange={(e) => setAppointmentStartTime(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-1)]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[30, 60, 90, 120, 180, 240].map((min) => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => setCustomDurationMin(min)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            customDurationMin === min
                              ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-1)]'
                              : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)]'
                          }`}
                        >
                          {min < 60 ? `${min}min` : min % 60 === 0 ? `${min / 60}h` : `${Math.floor(min / 60)}h${min % 60}`}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {appointmentAmplitude === 'half_day' && (
                  <div className="flex flex-wrap gap-2">
                    {([{ key: 'morning', label: 'Matin (08h-12h)' }, { key: 'afternoon', label: 'Après-midi (14h-18h)' }] as const).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setHalfDayPeriod(opt.key)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          halfDayPeriod === opt.key
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-1)]'
                            : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                {appointmentAmplitude === 'full_day' && (
                  <p className="text-sm text-[var(--text-2)]">Amplitude par défaut : 08h00 - 18h00.</p>
                )}
                {appointmentAmplitude === 'multi_day' && (
                  <div>
                    <label className="block text-xs text-[var(--text-2)] uppercase tracking-wide mb-1">Date de fin</label>
                    <input
                      type="date"
                      value={multiDayEndDate}
                      min={appointmentDate || undefined}
                      onChange={(e) => setMultiDayEndDate(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-1)]"
                    />
                    <p className="mt-1 text-xs text-[var(--text-2)]">Chantier de {formatShortDate(appointmentDate)} 08h00 à {multiDayEndDate ? formatShortDate(multiDayEndDate) : '…'} 18h00.</p>
                  </div>
                )}
                {appointmentError && <p className="text-sm text-red-400">{appointmentError}</p>}

                {(() => {
                  const range = computeManualAppointmentRange();
                  if (!range) return null;
                  const start = new Date(range.start);
                  const end = new Date(range.end);
                  return (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-xs text-[var(--text-2)]">
                      <p className="mb-1 font-semibold text-[var(--text-1)]">Récapitulatif</p>
                      <p>Début : {formatDateTime(start.toISOString())}</p>
                      <p>Fin : {formatDateTime(end.toISOString())}</p>
                      <p>{appointmentConnected ? 'Sera synchronisé avec Google Calendar.' : 'Google Calendar non connecté — synchronisation impossible.'}</p>
                    </div>
                  );
                })()}
              </div>
            )}

            {((appointmentAmplitude === 'slot' && appointmentConnected && appointmentSlots.length > 0) || (appointmentAmplitude !== 'slot' && appointmentConnected)) && (
              <button
                onClick={confirmAppointment}
                disabled={appointmentAmplitude === 'slot' ? !bookingSlot : !computeManualAppointmentRange()}
                className="w-full bg-[var(--accent)] text-black font-bold rounded-lg px-4 py-2 disabled:opacity-50"
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

      {reviewRequestToast && (
        <div
          className={`fixed bottom-20 left-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm shadow-2xl sm:bottom-24 sm:left-auto sm:right-6 sm:max-w-sm ${
            reviewRequestToast.type === 'error'
              ? 'border-red-500/30 bg-[var(--bg-elevated)] text-red-200'
              : 'border-green-500/30 bg-[var(--bg-elevated)] text-[var(--text-1)]'
          }`}
        >
          {reviewRequestToast.message}
        </div>
      )}

      {smsCompletionToast && (
        <div
          className={`fixed bottom-20 left-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm shadow-2xl sm:bottom-24 sm:left-auto sm:right-6 sm:max-w-sm ${
            smsCompletionToast.type === 'error'
              ? 'border-red-500/30 bg-[var(--bg-elevated)] text-red-200'
              : 'border-green-500/30 bg-[var(--bg-elevated)] text-[var(--text-1)]'
          }`}
        >
          {smsCompletionToast.message}
        </div>
      )}

      {clientPortalToast && (
        <div
          className={`fixed bottom-20 left-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm shadow-2xl sm:bottom-24 sm:left-auto sm:right-6 sm:max-w-sm ${
            clientPortalToast.type === 'error'
              ? 'border-red-500/30 bg-[var(--bg-elevated)] text-red-200'
              : 'border-green-500/30 bg-[var(--bg-elevated)] text-[var(--text-1)]'
          }`}
        >
          {clientPortalToast.message}
        </div>
      )}

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

