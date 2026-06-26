// Mode Expert — orchestrateur pur.
//
// Ce module NE recalcule rien. Il lit uniquement les sorties déjà produites
// par les moteurs existants (Service Matcher, Action Engine, Analyse Kadria
// / Project Scoring, Business Profile, Service Profiles, Suggestions devis)
// et les assemble en une vue décisionnelle unique. Aucune nouvelle IA,
// aucun nouveau prompt, aucun score opaque : la seule logique ajoutée ici
// est la grille de lecture "devis prêt à XX%" explicitement demandée
// (5 tranches fixes de 20%), et de simples lectures/croisements de champs
// déjà calculés ailleurs.

import type { ProjectCommercialAnalysis } from '@/src/lib/project-scoring';
import type { NextAction } from '@/src/lib/action-engine';
import type {
  ServiceMatcherBusinessProfile,
  ServiceMatchResult,
} from '@/src/lib/service-matcher';
import type { QuoteSuggestionLine } from '@/src/lib/quote-suggestions';

// Sous-ensemble du référentiel métier (table `service_profiles`) utile au
// Mode Expert. Déclaré localement (et non importé depuis src/lib/service-profiles.ts,
// qui est `server-only`) pour rester utilisable côté client. Les champs sont
// optionnels : la valeur réellement reçue par cette page (`ServiceMatcherServiceProfile`)
// peut ne pas tous les exposer — dans ce cas, on affiche "non disponible".
export interface ExpertPhotoRequirement {
  id: string;
  title: string;
  description: string;
  required: boolean;
  order: number;
}

export interface ExpertReferentialServiceProfile {
  id?: string;
  name?: string;
  qualification_questions?: string[] | null;
  required_information?: string[] | null;
  required_photos?: boolean | null;
  required_photos_list?: ExpertPhotoRequirement[] | null;
  average_duration_minutes?: number | null;
  travel_required?: boolean | null;
  appointment_recommended?: boolean | null;
  emergency_supported?: boolean | null;
}

export interface ExpertProjectInput {
  project: {
    budget?: string | null;
    tradeAnswers?: unknown;
    photos?: unknown[] | null;
  };
  analysis: ProjectCommercialAnalysis;
  serviceMatches: ServiceMatchResult[];
  nextAction: NextAction;
  businessProfile?: ServiceMatcherBusinessProfile | null;
  serviceProfiles?: ExpertReferentialServiceProfile[] | null;
  quoteSuggestions: QuoteSuggestionLine[];
}

export interface ExpertRecognition {
  available: boolean;
  label: string;
  source: 'Service Matcher';
}

export interface ExpertConfidence {
  available: boolean;
  percent: number | null;
}

export interface ExpertQualificationQuestion {
  label: string;
  answered: boolean;
}

export interface ExpertQualification {
  available: boolean;
  questions: ExpertQualificationQuestion[];
  remaining: number;
  total: number;
}

export interface ExpertPhotos {
  available: boolean;
  required: boolean | null;
  currentCount: number;
  requestedList: ExpertPhotoRequirement[] | null;
  // Préparation pour le chat (non branché ici, cf. brief "Chat").
  photosExpected: number;
  photosReceived: number;
  photosRemaining: number;
}

export interface ExpertQuoteCategory {
  key: 'projetIdentifie' | 'qualificationComplete' | 'photos' | 'budget' | 'lignesDevis';
  label: string;
  done: boolean;
  weight: number;
}

export interface ExpertQuote {
  percent: number;
  categories: ExpertQuoteCategory[];
}

export interface ExpertPlanning {
  available: boolean;
  estimatedDuration: string | null;
  travelRequired: boolean | null;
  appointmentRecommended: boolean | null;
  urgent: boolean | null;
}

export interface ExpertRisks {
  blockingReasons: string[];
}

export interface ExpertSummaryBar {
  label: string;
  percent: number;
}

export interface ExpertSummary {
  bars: ExpertSummaryBar[];
  nextBestAction: NextAction;
}

export interface ExpertProjectView {
  recognition: ExpertRecognition;
  confidence: ExpertConfidence;
  qualification: ExpertQualification;
  photos: ExpertPhotos;
  quote: ExpertQuote;
  planning: ExpertPlanning;
  risks: ExpertRisks;
  summary: ExpertSummary;
}

function normalizeForLookup(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Croisement simple (lookup texte, pas une heuristique de scoring) entre les
// questions du référentiel métier et les réponses déjà saisies sur le
// projet (`tradeAnswers`), pour savoir lesquelles restent à poser.
function isQuestionAnswered(question: string, tradeAnswers: unknown): boolean {
  if (!tradeAnswers || typeof tradeAnswers !== 'object') return false;
  const normalizedQuestion = normalizeForLookup(question);
  const entries = Object.entries(tradeAnswers as Record<string, unknown>);
  return entries.some(([key, value]) => {
    if (value === null || value === undefined || value === '') return false;
    const normalizedKey = normalizeForLookup(key);
    return (
      normalizedKey.length > 0 &&
      (normalizedQuestion.includes(normalizedKey) || normalizedKey.includes(normalizedQuestion))
    );
  });
}

function pickBestMatch(serviceMatches: ServiceMatchResult[]): ServiceMatchResult | null {
  if (!serviceMatches || serviceMatches.length === 0) return null;
  return serviceMatches.reduce((best, current) =>
    current.confidence > best.confidence ? current : best
  );
}

function findReferentialProfile(
  serviceProfiles: ExpertReferentialServiceProfile[] | null | undefined,
  bestMatch: ServiceMatchResult | null
): ExpertReferentialServiceProfile | null {
  if (!serviceProfiles || serviceProfiles.length === 0) return null;
  if (!bestMatch) return null;
  const byId = serviceProfiles.find((p) => p.id && p.id === bestMatch.serviceProfile.id);
  if (byId) return byId;
  return serviceProfiles.find((p) => p.name === bestMatch.serviceProfile.name) || null;
}

export function computeExpertProjectView(input: ExpertProjectInput): ExpertProjectView {
  const { project, analysis, serviceMatches, nextAction, serviceProfiles, quoteSuggestions } = input;

  const bestMatch = pickBestMatch(serviceMatches);
  const referentialProfile = findReferentialProfile(serviceProfiles, bestMatch);

  // 1. RECONNAISSANCE — jamais recalculé : on relit le meilleur résultat du
  // Service Matcher.
  const recognition: ExpertRecognition = bestMatch
    ? { available: true, label: bestMatch.serviceProfile.name, source: 'Service Matcher' }
    : { available: false, label: 'non disponible', source: 'Service Matcher' };

  const confidence: ExpertConfidence = bestMatch
    ? { available: true, percent: Math.round(bestMatch.confidence) }
    : { available: false, percent: null };

  // 2. QUALIFICATION — uniquement les questions du référentiel métier
  // (table service_profiles). Si aucun profil métier ne correspond, on
  // n'invente rien : "non disponible".
  const referentialQuestions = referentialProfile?.qualification_questions || [];
  const qualificationQuestions: ExpertQualificationQuestion[] = referentialQuestions.map((q) => ({
    label: q,
    answered: isQuestionAnswered(q, project.tradeAnswers),
  }));
  const qualificationRemaining = qualificationQuestions.filter((q) => !q.answered).length;
  const qualification: ExpertQualification = {
    available: referentialQuestions.length > 0,
    questions: qualificationQuestions,
    remaining: qualificationRemaining,
    total: qualificationQuestions.length,
  };

  // 3. PHOTOS — si le référentiel décrit une liste structurée (preuves
  // visuelles), on l'affiche telle quelle, jamais inventée. Sinon on
  // retombe sur l'ancien booléen "photos requises" (compatibilité).
  const referentialPhotosList = (referentialProfile?.required_photos_list || [])
    .slice()
    .sort((a, b) => a.order - b.order);
  const photosRequired = referentialProfile
    ? referentialPhotosList.length > 0
      ? referentialPhotosList.some((p) => p.required)
      : Boolean(referentialProfile.required_photos)
    : null;
  const currentPhotoCount = Array.isArray(project.photos) ? project.photos.length : 0;
  // photosExpected/photosReceived/photosRemaining : préparation pour le chat
  // (cf. brief), jamais branchée ici. Simple lecture, pas un nouveau score.
  const photosExpected = referentialPhotosList.length > 0
    ? referentialPhotosList.filter((p) => p.required).length
    : photosRequired
      ? 1
      : 0;
  const photosReceived = currentPhotoCount;
  const photosRemaining = Math.max(0, photosExpected - photosReceived);
  const photos: ExpertPhotos = {
    available: referentialProfile != null,
    required: photosRequired,
    currentCount: currentPhotoCount,
    requestedList: referentialPhotosList.length > 0 ? referentialPhotosList : null,
    photosExpected,
    photosReceived,
    photosRemaining,
  };

  // 4. DEVIS — grille fixe à 5 tranches de 20%, demandée explicitement.
  // Chaque tranche est une simple lecture booléenne d'un signal déjà
  // calculé ailleurs (Service Matcher, référentiel, Analyse Kadria,
  // Suggestions devis) ou d'un champ déjà présent sur le projet.
  const projetIdentifieDone = bestMatch != null;
  const qualificationCompleteDone = qualification.available
    ? qualification.remaining === 0
    : analysis.missingInfo.length === 0;
  const photosDone = photosRequired === false || photosRequired === null
    ? true
    : photos.currentCount > 0;
  const budgetDone = Boolean(project.budget && String(project.budget).trim().length > 0);
  const lignesDevisDone = quoteSuggestions.length > 0;

  const quoteCategories: ExpertQuoteCategory[] = [
    { key: 'projetIdentifie', label: 'Projet identifié', done: projetIdentifieDone, weight: 20 },
    { key: 'qualificationComplete', label: 'Qualification complète', done: qualificationCompleteDone, weight: 20 },
    { key: 'photos', label: 'Photos', done: photosDone, weight: 20 },
    { key: 'budget', label: 'Budget', done: budgetDone, weight: 20 },
    { key: 'lignesDevis', label: 'Lignes devis', done: lignesDevisDone, weight: 20 },
  ];
  const quotePercent = quoteCategories.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
  const quote: ExpertQuote = { percent: quotePercent, categories: quoteCategories };

  // 5. PLANIFICATION — uniquement les informations du référentiel métier.
  const planning: ExpertPlanning = {
    available: referentialProfile != null,
    estimatedDuration:
      referentialProfile?.average_duration_minutes != null
        ? `${referentialProfile.average_duration_minutes} min`
        : null,
    travelRequired: referentialProfile ? Boolean(referentialProfile.travel_required) : null,
    appointmentRecommended: referentialProfile ? Boolean(referentialProfile.appointment_recommended) : null,
    urgent: referentialProfile ? Boolean(referentialProfile.emergency_supported) : null,
  };

  // 6. RISQUES — repris tel quel de l'Action Engine.
  const risks: ExpertRisks = { blockingReasons: nextAction.blockingReasons };

  // 7. SYNTHÈSE — les mêmes pourcentages que ci-dessus, pas de nouveau
  // calcul, et la prochaine meilleure action reprise EXACTEMENT de
  // computeNextAction().
  const qualificationPercent = qualification.available
    ? qualification.total === 0
      ? 100
      : Math.round(((qualification.total - qualification.remaining) / qualification.total) * 100)
    : analysis.missingInfo.length === 0
      ? 100
      : 0;

  const summary: ExpertSummary = {
    bars: [
      { label: 'Projet reconnu', percent: confidence.percent ?? 0 },
      { label: 'Devis', percent: quote.percent },
      { label: 'Qualification', percent: qualificationPercent },
    ],
    nextBestAction: nextAction,
  };

  return { recognition, confidence, qualification, photos, quote, planning, risks, summary };
}
