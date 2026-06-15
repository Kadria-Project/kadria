'use client';

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Banknote,
  BarChart3,
  Bot,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  Euro,
  Eye,
  FileCheck,
  FileQuestion,
  FileText,
  Globe,
  Hammer,
  KanbanSquare,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Mail,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  MessageSquare,
  Minus,
  PenLine,
  Phone,
  PieChart,
  Receipt,
  Rocket,
  Search,
  Send,
  Shield,
  Sparkles,
  Table,
  Target,
  TrendingUp,
  User,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { KadriaLogo } from '@/src/components/KadriaLogo';
import { DarkNav } from '@/src/components/DarkNav';
import ChatWidget from '@/src/components/ChatWidget';

const DottedSurface = dynamic(
  () => import('@/components/ui/dotted-surface').then((mod) => mod.DottedSurface),
  {
    ssr: false,
    loading: () => null,
  }
);

const features = [
  {
    icon: Globe,
    title: 'Assistant web',
    text: 'Qualifie chaque demande entrante, collecte le besoin, le budget, les délais et cree un dossier complet.',
  },
  {
    icon: Phone,
    title: 'Assistant vocal',
    text: 'Répond aux appels quand vous etes indisponible et transforme les appels manqués en opportunités.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard commercial',
    text: "Centralise vos prospects, statuts, relances, priorités et chiffre d'affaires potentiel.",
  },
  {
    icon: Target,
    title: 'Priorisation IA',
    text: "Classe les dossiers par potentiel commercial pour traiter d'abord les meilleurs chantiers.",
  },
  {
    icon: ClipboardCheck,
    title: 'Dossiers structures',
    text: 'Resume IA, coordonnées, adresse, métier, budget, delai et score de complétude au meme endroit.',
  },
  {
    icon: BarChart3,
    title: 'Pilotage',
    text: 'Suit vos conversions, paniers moyens, dossiers a relancer et opportunités gagnées.',
  },
];

const FEATURE_GLOW = [
  { glow: 'rgba(34,197,94,0.15)', iconBg: 'rgba(34,197,94,0.12)', iconBorder: 'rgba(34,197,94,0.25)', iconColor: '#22c55e' },
  { glow: 'rgba(96,165,250,0.15)', iconBg: 'rgba(96,165,250,0.12)', iconBorder: 'rgba(96,165,250,0.25)', iconColor: '#60a5fa' },
  { glow: 'rgba(245,158,11,0.15)', iconBg: 'rgba(245,158,11,0.12)', iconBorder: 'rgba(245,158,11,0.25)', iconColor: '#f59e0b' },
  { glow: 'rgba(167,139,250,0.15)', iconBg: 'rgba(167,139,250,0.12)', iconBorder: 'rgba(167,139,250,0.25)', iconColor: '#a78bfa' },
  { glow: 'rgba(34,197,94,0.15)', iconBg: 'rgba(34,197,94,0.12)', iconBorder: 'rgba(34,197,94,0.25)', iconColor: '#22c55e' },
  { glow: 'rgba(96,165,250,0.15)', iconBg: 'rgba(96,165,250,0.12)', iconBorder: 'rgba(96,165,250,0.25)', iconColor: '#60a5fa' },
];

interface PlanFeature {
  text: string;
  badge?: string;
}

const plans: { slug: string; name: string; price: string; description: string; features: PlanFeature[]; highlighted?: boolean }[] = [
  {
    slug: 'essentiel',
    name: 'Essentiel',
    price: '149 €',
    description: 'Pour démarrer et ne plus manquer de demandes web.',
    features: [
      { text: 'Assistant chat web 24h/24' },
      { text: 'Qualification IA + score dossier' },
      { text: 'CRM vue liste' },
      { text: '50 dossiers / mois' },
      { text: 'Export CSV' },
    ],
  },
  {
    slug: 'performance',
    name: 'Performance',
    price: '249 €',
    description: 'Pour ne plus perdre aucune opportunité.',
    features: [
      { text: 'Tout Essentiel inclus' },
      { text: 'Dossiers illimités + vue Kanban' },
      { text: 'Pipeline commercial' },
      { text: 'Génération de devis professionnels' },
      { text: 'Assistant vocal', badge: 'Bientôt' },
      { text: 'Relances automatiques', badge: 'Bientôt' },
    ],
    highlighted: true,
  },
  {
    slug: 'agence',
    name: 'Agence',
    price: 'Sur devis',
    description: "Pour les groupements d'artisans et réseaux.",
    features: [
      { text: 'Tout Performance inclus' },
      { text: "Jusqu'à 10 artisans" },
      { text: 'Marque blanche complète' },
      { text: 'API access' },
      { text: 'Account manager dédié' },
    ],
  },
];

const demoProjects = [
  {
    client: 'Marie Leroy',
    project: 'Renovation salle de bain',
    city: 'Lyon 3e',
    budget: '8 000 - 12 000 €',
    score: 92,
    status: 'Nouveau',
  },
  {
    client: 'Thomas Garnier',
    project: 'Terrasse bois composite',
    city: 'Bordeaux',
    budget: '~ 8 000 €',
    score: 88,
    status: 'Qualifie',
  },
  {
    client: 'Jean-Pierre Moreau',
    project: 'Refection toiture',
    city: 'Nantes',
    budget: '15 000 - 20 000 €',
    score: 95,
    status: 'Urgent',
  },
];

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      {children}
      <Footer />
    </div>
  );
}

function SiteHeader() {
  const links = [
    { label: 'Comment ca marche', href: '/#comment-ca-marche' },
    { label: 'Demo', href: '/demo' },
    { label: 'Tarifs', href: '/tarifs' },
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-[#0a0b0f]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1488px] items-center justify-between px-6">
        <KadriaLogo size="sm" />

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/dashboard-v2" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex">
            Connexion
          </Link>
          <Link href="/demo" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-white/[0.03]">
            Reserver une demo
          </Link>
          <Link href="/demo" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            Tester Kadria
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto flex max-w-[1488px] flex-col gap-4 px-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <KadriaLogo size="md" />
        <p>© {new Date().getFullYear()} Kadria. Tous droits reserves.</p>
      </div>
    </footer>
  );
}

function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">{title}</h2>
      <p className="mt-5 text-base leading-7 text-muted-foreground md:text-lg">{text}</p>
    </div>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center rounded-lg border border-white/10 px-5 py-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-white/[0.03]">
      {children}
    </Link>
  );
}

function LeadCard() {
  return (
    <div className="card-premium w-full max-w-[660px] overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Dossier projet recu
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Score 92%
        </span>
      </div>

      <div className="space-y-5 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-bold text-primary">
              ML
            </div>
            <div>
              <p className="font-semibold">Marie Leroy</p>
              <p className="text-sm text-muted-foreground">06 12 34 56 78 · marie.leroy@email.fr</p>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Nouveau</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTile icon={FileText} label="Projet" value="Renovation SDB" />
          <InfoTile icon={MapPin} label="Ville" value="Lyon 3e" />
          <InfoTile icon={Euro} label="Budget" value="8 000 - 12 000 €" />
          <InfoTile icon={Clock} label="Delai" value="Sept. 2026" />
        </div>

        <div className="rounded-xl border border-white/7 bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Resume IA</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Renovation complete d une salle de bain de 7m2. Budget confortable, delai realiste.
            Plomberie a verifier, dossier pret a chiffrer.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/7 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

const QUALIFICATION_STEPS = [
  { icon: User, title: 'Prospect', subtitle: 'Vous contacte via votre site ou téléphone', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', glow: 'rgba(167,139,250,0.3)' },
  { icon: Globe, title: 'Site web ou téléphone', subtitle: 'Le prospect arrive sur Kadria', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', glow: 'rgba(96,165,250,0.3)' },
  { icon: Zap, title: 'Kadria qualifie', subtitle: 'Budget, délai, adresse, coordonnées...', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', glow: 'rgba(34,197,94,0.3)' },
  { icon: FileText, title: 'Dossier scoré', subtitle: 'Complet, structuré, prêt à chiffrer', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', glow: 'rgba(245,158,11,0.3)' },
  { icon: CheckCircle, title: 'Artisan notifié', subtitle: 'Dossier reçu — action immédiate', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', glow: 'rgba(34,197,94,0.4)' },
];

const REPLACE_TOOLS_CARDS = [
  {
    number: '01',
    color: '#22c55e',
    iconBg: 'rgba(34,197,94,0.12)',
    iconBorder: 'rgba(34,197,94,0.25)',
    glow: 'rgba(34,197,94,0.15)',
    badgeBg: 'rgba(34,197,94,0.08)',
    badgeBorder: 'rgba(34,197,94,0.2)',
    icon: MessageSquare,
    title: 'Acquisition & Qualification',
    description: 'Capturez et qualifiez chaque prospect 24h/24, par chat ou par téléphone.',
    features: [
      'Chat IA 24h/24',
      'Assistant vocal (appels entrants)',
      'Qualification automatique',
      'Questions adaptées au métier',
      'Résumé IA des besoins',
    ],
    tools: [
      { icon: MessageCircle, color: '#60a5fa', name: 'Tidio / Crisp', desc: 'Chatbot & live chat' },
      { icon: Phone, color: '#a78bfa', name: 'Aircall / Ringover', desc: 'Standard téléphonique' },
      { icon: FileQuestion, color: '#f59e0b', name: 'Formulaire de contact', desc: 'Capture de leads web' },
    ],
    badge: '3 outils remplacés',
  },
  {
    number: '02',
    color: '#60a5fa',
    iconBg: 'rgba(96,165,250,0.12)',
    iconBorder: 'rgba(96,165,250,0.25)',
    glow: 'rgba(96,165,250,0.15)',
    badgeBg: 'rgba(96,165,250,0.08)',
    badgeBorder: 'rgba(96,165,250,0.2)',
    icon: BarChart3,
    title: 'CRM & Suivi commercial',
    description: 'Gérez tous vos prospects et projets depuis un pipeline visuel centralisé.',
    features: [
      'Pipeline commercial visuel',
      'Vue Kanban par statut',
      'Historique des échanges',
      'Notes internes par dossier',
      'Relances planifiables',
      'Calendrier intégré',
    ],
    tools: [
      { icon: Users, color: '#60a5fa', name: 'HubSpot / Pipedrive', desc: 'CRM commercial' },
      { icon: Table, color: '#22c55e', name: 'Excel / Google Sheets', desc: 'Suivi tableur' },
      { icon: CheckSquare, color: '#a78bfa', name: 'Trello / Notion', desc: 'Gestion de tâches' },
    ],
    badge: '3 outils remplacés',
  },
  {
    number: '03',
    color: '#f59e0b',
    iconBg: 'rgba(245,158,11,0.12)',
    iconBorder: 'rgba(245,158,11,0.25)',
    glow: 'rgba(245,158,11,0.15)',
    badgeBg: 'rgba(245,158,11,0.08)',
    badgeBorder: 'rgba(245,158,11,0.2)',
    icon: Receipt,
    title: 'Devis & Administration',
    description: 'Générez, envoyez et suivez vos devis professionnels en quelques clics.',
    features: [
      'Génération de devis ligne par ligne',
      'Envoi automatisé par email',
      'Suivi des ouvertures en temps réel',
      'Acceptation électronique client',
      'Bibliothèque de prestations',
      'Export PDF professionnel',
    ],
    tools: [
      { icon: FileText, color: '#f59e0b', name: 'Tolteck / Obat', desc: 'Logiciel de devis' },
      { icon: PenLine, color: '#60a5fa', name: 'DocuSign / YouSign', desc: 'Signature électronique' },
      { icon: Mail, color: '#22c55e', name: 'Brevo / Mailchimp', desc: "Envoi d'emails" },
    ],
    badge: '3 outils remplacés',
  },
  {
    number: '04',
    color: '#a78bfa',
    iconBg: 'rgba(167,139,250,0.12)',
    iconBorder: 'rgba(167,139,250,0.25)',
    glow: 'rgba(167,139,250,0.15)',
    badgeBg: 'rgba(167,139,250,0.08)',
    badgeBorder: 'rgba(167,139,250,0.2)',
    icon: TrendingUp,
    title: 'Pilotage & Performance',
    description: 'Analysez votre activité et prenez les bonnes décisions avec des données en temps réel.',
    features: [
      'KPI temps réel (CA, conversion, panier)',
      'Évolution du CA sur la période',
      'Score IA des opportunités',
      'Chantiers géolocalisés',
      'Top 3 opportunités prioritaires',
      'Export CSV & rapports PDF',
    ],
    tools: [
      { icon: PieChart, color: '#a78bfa', name: 'Looker Studio / Power BI', desc: 'Reporting BI' },
      { icon: Table, color: '#f59e0b', name: 'Excel / Google Sheets', desc: 'Tableaux de bord' },
      { icon: MapIcon, color: '#22c55e', name: 'Google Maps / Calendly', desc: 'Planning terrain' },
    ],
    badge: '3+ outils remplacés',
  },
];

const REPLACED_TOOL_ICONS = [
  MessageCircle, Phone, Users, BarChart3, FileText, PenLine, Table, CheckSquare, Mail, PieChart, MapIcon, Calendar,
];

const DOSSIER_FIELDS: [typeof Hammer, string, string][] = [
  [Hammer, 'PROJET', 'Rénovation salle de bain'],
  [MapPin, 'VILLE', 'Lyon 3e'],
  [Banknote, 'BUDGET', '8 000 – 12 000 €'],
  [Clock, 'DÉLAI', 'Sous 1 mois'],
];

function QualificationShowcase() {
  const [activeStep, setActiveStep] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 4 : 0
  );
  const [showDossier, setShowDossier] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setShowDossier(false);
      setActiveStep(0);
      timeouts.push(setTimeout(() => setActiveStep(1), 2000));
      timeouts.push(setTimeout(() => setActiveStep(2), 4000));
      timeouts.push(setTimeout(() => setActiveStep(3), 6000));
      timeouts.push(setTimeout(() => setActiveStep(4), 8000));
      timeouts.push(setTimeout(() => setShowDossier(true), 8500));
    };

    run();
    const interval = setInterval(run, 12000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  if (showDossier) {
    return (
      <div className="kr-glass-hero animate-in fade-in slide-in-from-bottom-4 duration-500 w-full p-5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white">
            <span className="text-green-500">●</span> DOSSIER PROJET REÇU
          </p>
          <span className="rounded-full border border-green-500/30 bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
            Score 94%
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
            ML
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Marie Leroy</p>
            <p className="text-xs text-zinc-400">06 12 34 56 78 · marie@email.fr</p>
          </div>
          <span
            className="rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ background: 'rgba(63,63,70,0.6)', color: '#a1a1aa', borderColor: '#3f3f46' }}
          >
            Nouveau
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-800 p-3">
          {DOSSIER_FIELDS.map(([Icon, label, value]) => (
            <div key={label}>
              <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Icon size={12} className="text-green-500" />
                {label}
              </p>
              <p className="mt-1 text-sm font-medium text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-green-500">
              <Sparkles size={12} className="text-green-500" /> Analyse Kadria
            </p>
            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">🔥 Prospect chaud</span>
          </div>
          <p className="mt-2 text-xs italic text-zinc-300">
            Rénovation complète SDB 7m². Budget cohérent, délai court.
            Prêt à démarrer — rappel recommandé sous 24h.
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="font-bold text-green-500">Score 94%</span>
          <span className="text-zinc-500">·</span>
          <span className="font-medium text-green-500">Conversion Élevée</span>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-400">Reçu il y a 2 min</span>
        </div>
      </div>
    );
  }

  return (
    <div className="kr-glass-hero w-full p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-green-500">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Parcours de qualification
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/[0.08] px-2 py-0.5 text-xs font-bold text-green-500">
          <span className="kr-badge-pulse h-1.5 w-1.5 rounded-full bg-green-500" />
          EN DIRECT
        </span>
      </div>
      <div className="relative mt-6" style={{ paddingLeft: 28 }}>
        <div className="absolute bottom-0 top-0 w-0.5 rounded-full bg-zinc-800" style={{ left: 8 }} />
        <div
          className="absolute top-0 w-0.5 rounded-full bg-green-500 transition-[height] duration-[400ms] ease-out"
          style={{ left: 8, height: `${(activeStep / (QUALIFICATION_STEPS.length - 1)) * 100}%` }}
        />

        <div className="flex flex-col gap-3">
          {QUALIFICATION_STEPS.map((step, index) => {
            const isActive = index === activeStep;
            const isCompleted = index < activeStep;
            const Icon = step.icon;

            const cardClass = isActive
              ? 'border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.06)]'
              : 'border-transparent bg-transparent';

            const textClass = isActive ? 'font-bold text-green-500' : 'text-zinc-400';

            return (
              <div
                key={step.title}
                className={`relative flex items-center gap-3 rounded-md border py-3 pl-2 pr-4 transition-all duration-500 ${cardClass}`}
                style={isActive ? { boxShadow: '0 0 12px rgba(34,197,94,0.08)' } : undefined}
              >
                <span
                  key={`icon-${step.title}-${activeStep}`}
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-shadow duration-300 ${isActive ? 'kr-step-icon-enter' : ''}`}
                  style={{ backgroundColor: step.bg, boxShadow: `0 0 16px ${step.glow}` }}
                >
                  <Icon size={16} style={{ color: step.color }} />
                  <span
                    className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] font-bold"
                    style={
                      isCompleted || isActive
                        ? { background: '#22c55e', color: '#09090b', borderColor: '#22c55e' }
                        : { background: '#18181b', color: '#a1a1aa', borderColor: '#27272a' }
                    }
                  >
                    {index + 1}
                  </span>
                </span>
                <div
                  key={`text-${step.title}-${activeStep}`}
                  className={isActive ? 'kr-step-text-enter' : ''}
                >
                  <p className={`text-sm transition-colors duration-500 ${textClass}`}>{step.title}</p>
                  <p className="text-xs text-zinc-500">{step.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const TRADES_DATA = [
  {
    id: 'paysagiste',
    emoji: '🌿',
    label: 'Paysagiste',
    types: 'Création jardin, terrasse, allée, clôture, bassin',
    questions: 'Surface, terrain, accès, matériaux, évacuation',
    resultat: 'Demande qualifiée avec contraintes terrain',
  },
  {
    id: 'salle-de-bain',
    emoji: '🚿',
    label: 'Salle de bain',
    types: 'Rénovation complète, douche, carrelage, plomberie',
    questions: 'Surface, création/réno, équipements, déplacement',
    resultat: 'Dossier avec plans et spécifications',
  },
  {
    id: 'electricien',
    emoji: '⚡',
    label: 'Électricien',
    types: 'Installation neuve, mise aux normes, tableau, VMC',
    questions: 'Type install, tableau, normes, nombre de points',
    resultat: 'Dossier technique prêt pour devis',
  },
  {
    id: 'plombier',
    emoji: '🔧',
    label: 'Plombier',
    types: 'Rénovation SDB, fuite, installation, chauffage',
    questions: 'Type travaux, surface, déplacement plomberie, accès',
    resultat: 'Dossier complet avec contraintes techniques',
  },
  {
    id: 'couvreur',
    emoji: '🏠',
    label: 'Couvreur',
    types: 'Réfection toiture, isolation, zinguerie, velux',
    questions: 'Surface, matériau actuel, accès, état, urgence',
    resultat: 'Diagnostic et dossier technique',
  },
  {
    id: 'menuisier',
    emoji: '🪟',
    label: 'Menuisier',
    types: 'Pose fenêtres, portes, parquet, escalier, sur-mesure',
    questions: 'Type ouvrage, dimensions, fourniture, délai',
    resultat: 'Dossier avec métrés et spécifications',
  },
  {
    id: 'peintre',
    emoji: '🎨',
    label: 'Peintre',
    types: 'Peinture intérieure, ravalement, décoration',
    questions: 'Nombre pièces, surface, état murs, plafonds',
    resultat: 'Métré complet et cahier des charges',
  },
  {
    id: 'renovation',
    emoji: '🏗️',
    label: 'Rénovation',
    types: "Rénovation globale, multi-corps d'état, permis",
    questions: 'Surface, état actuel, priorités, budget global',
    resultat: 'Dossier multi-lots coordonné',
  },
];


const DASHBOARD_TABS = [
  {
    number: '01.',
    title: 'Dossier qualifié en un coup d’œil',
    description: 'Chaque demande entrante est automatiquement qualifiée et enrichie : coordonnées, type de projet, budget estimé et score de priorité.',
    icon: FileCheck,
    color: '#22c55e',
    iconBg: 'rgba(34,197,94,0.1)',
    iconBorder: 'rgba(34,197,94,0.3)',
    glow: 'rgba(34,197,94,0.35)',
  },
  {
    number: '02.',
    title: 'Pipeline visuel par étape',
    description: 'Glissez-déposez vos opportunités d’une étape à l’autre : nouveau, à rappeler, qualifié, devis envoyé, gagné.',
    icon: KanbanSquare,
    color: '#60a5fa',
    iconBg: 'rgba(96,165,250,0.1)',
    iconBorder: 'rgba(96,165,250,0.3)',
    glow: 'rgba(96,165,250,0.35)',
  },
  {
    number: '03.',
    title: 'Devis générés en un clic',
    description: 'Transformez un dossier qualifié en devis professionnel prêt à envoyer, avec vos tarifs et conditions personnalisées.',
    icon: Receipt,
    color: '#f59e0b',
    iconBg: 'rgba(245,158,11,0.1)',
    iconBorder: 'rgba(245,158,11,0.3)',
    glow: 'rgba(245,158,11,0.35)',
  },
  {
    number: '04.',
    title: 'Calendrier centralisé',
    description: 'Visualisez rendez-vous, relances et chantiers planifiés sur un calendrier unique, partagé avec toute votre équipe.',
    icon: CalendarCheck,
    color: '#a78bfa',
    iconBg: 'rgba(167,139,250,0.1)',
    iconBorder: 'rgba(167,139,250,0.3)',
    glow: 'rgba(167,139,250,0.35)',
  },
]

const kLabel: CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

function MockupDossier() {
  const criteria = [
    { ok: true, title: 'Budget cohérent', detail: '8 000 – 12 000€' },
    { ok: true, title: 'Délai réaliste', detail: 'Sous 1 mois' },
    { ok: true, title: 'Contact vérifié', detail: 'Tél + email' },
    { ok: false, title: 'Photos jointes', detail: 'Aucune photo' },
  ]
  return (
    <div className="kr-mockup" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid var(--border)' }} className="flex items-start justify-between gap-3 p-4 sm:px-5">
        <div>
          <p style={{ ...kLabel, color: 'var(--accent)' }} className="mb-1">Dossier qualifié</p>
          <p className="text-lg font-extrabold text-white">Marie Leroy</p>
          <p className="text-xs text-zinc-400">Rénovation salle de bain · Lyon 3e</p>
        </div>
        <span style={{ background: 'var(--accent)', color: 'var(--bg)' }} className="whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-bold">
          Score 94%
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 sm:px-5">
        <p style={{ color: 'var(--accent)' }} className="text-sm font-bold">✦ Analyse Kadria</p>
        <span
          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
          className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold"
        >
          🔥 Prospect chaud
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 px-4 sm:px-5">
        {criteria.map((c) => {
          const Icon = c.ok ? CheckCircle : XCircle
          const color = c.ok ? 'var(--accent)' : '#dc2626'
          return (
            <div key={c.title} style={{ background: 'var(--bg)', border: '1px solid var(--border)' }} className="rounded-lg p-2.5">
              <div className="mb-1 flex items-center gap-1.5">
                <Icon size={12} color={c.ok ? 'var(--accent)' : '#dc2626'} />
                <span className="text-xs font-semibold" style={{ color: c.ok ? 'var(--text-1)' : color, opacity: c.ok ? 1 : 0.6 }}>
                  {c.title}
                </span>
              </div>
              <p className="text-xs" style={{ color: c.ok ? 'var(--text-2)' : 'var(--text-3)' }}>{c.detail}</p>
            </div>
          )
        })}
      </div>

      <div style={{ background: 'var(--bg)' }} className="mx-4 mt-3 rounded-lg p-3 sm:mx-5">
        <p style={kLabel} className="mb-1.5 text-zinc-500">Synthèse IA</p>
        <p className="text-xs italic leading-relaxed text-zinc-400">
          Rénovation complète SDB 7m². Budget cohérent, délai court. Prospect disponible rapidement.
        </p>
      </div>

      <div
        style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid var(--accent-border)' }}
        className="mx-4 mt-2 flex items-start gap-2 rounded-lg p-3 sm:mx-5"
      >
        <Lightbulb size={12} color="#22c55e" className="mt-0.5 shrink-0" />
        <p className="text-xs font-medium text-white">
          Rappel recommandé sous 24h — fort potentiel de conversion.
        </p>
      </div>

      <div style={{ background: 'var(--bg)', borderRadius: '8px', padding: '10px 14px', margin: '8px 20px' }} className="flex items-center gap-3">
        <span
          style={{ background: 'rgba(34,197,94,0.2)', color: 'var(--accent)', fontWeight: 700, fontSize: '12px' }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        >
          ML
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Marie Leroy</p>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>06 12 34 56 78</p>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>marie@email.fr</p>
        </div>
        <span
          style={{ background: 'rgba(63,63,70,0.6)', color: '#a1a1aa', border: '1px solid #3f3f46', borderRadius: '999px' }}
          className="whitespace-nowrap px-2 py-0.5 text-xs"
        >
          Nouveau
        </span>
      </div>

      <div style={{ borderTop: '1px solid var(--border)' }} className="mt-auto flex items-center gap-3 px-4 py-2.5 sm:px-5">
        <span style={{ color: 'var(--accent)' }} className="text-xs font-bold">Score 94%</span>
        <span className="text-xs text-zinc-600">·</span>
        <span style={{ color: 'var(--accent)' }} className="text-xs">Conversion Élevée</span>
        <span className="text-xs text-zinc-600">·</span>
        <span className="text-xs text-zinc-600">Reçu il y a 2 min</span>
      </div>
    </div>
  )
}

function MockupPipeline() {
  const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    nouveau: { label: 'Nouveau', bg: 'rgba(63,63,70,0.6)', color: '#a1a1aa' },
    rappeler: { label: 'À rappeler', bg: 'rgba(217,119,6,0.15)', color: '#d97706' },
    qualifie: { label: 'Qualifié', bg: 'rgba(22,163,74,0.15)', color: '#16a34a' },
    devis: { label: 'Devis envoyé', bg: 'rgba(37,99,235,0.15)', color: '#60a5fa' },
    gagne: { label: 'Gagné', bg: 'rgba(21,128,61,0.15)', color: '#15803d' },
  }
  const scoreColor = (score: number) => {
    if (score >= 80) return 'var(--accent)'
    if (score >= 60) return '#f59e0b'
    return '#dc2626'
  }
  const columns = [
    {
      title: 'Nouveau', border: '#3f3f46', headerBadgeBg: '#3f3f46', headerBadgeColor: '#a1a1aa', count: 4,
      footer: '4 dossiers · 6.7k€', footerColor: 'var(--text-2)',
      cards: [
        { initials: 'MT', name: 'Morel Thomas', project: 'jardin', city: 'Sotteville-lès-Rouen', score: 85, age: 'il y a 2j', status: 'nouveau' },
        { initials: 'FL', name: 'Fontaine Laura', project: 'salle de bain', city: 'Franqueville', score: 100, age: 'il y a 3j', status: 'nouveau' },
      ],
    },
    {
      title: 'À rappeler', border: '#d97706', headerBadgeBg: '#d97706', headerBadgeColor: '#ffffff', count: 3,
      footer: '3 dossiers · 7k€', footerColor: 'var(--text-2)',
      cards: [
        { initials: 'SM', name: 'Sophie Martin', project: 'jardin', city: 'Rouen', score: 100, age: 'il y a 2j', status: 'rappeler' },
        { initials: 'DN', name: 'Dubois Nicolas', project: 'jardin', city: 'Rouen', score: 100, age: 'il y a 2j', status: 'rappeler' },
      ],
    },
    {
      title: 'Qualifié', border: '#16a34a', headerBadgeBg: '#16a34a', headerBadgeColor: '#ffffff', count: 1,
      footer: '1 dossier · 3k€', footerColor: 'var(--text-2)',
      cards: [
        { initials: 'DM', name: 'Dumontier Maxime', project: 'Paysagiste', city: 'Amfreville', score: 90, age: 'il y a 5j', status: 'qualifie' },
      ],
    },
    {
      title: 'Devis env...', border: '#2563eb', headerBadgeBg: '#2563eb', headerBadgeColor: '#ffffff', count: 5,
      footer: '5 dossiers · 9.9k€', footerColor: 'var(--text-2)',
      cards: [
        { initials: 'LD', name: 'Léon Duval', project: 'jardin', city: 'Rouen', score: 100, age: 'il y a 2j', status: 'devis' },
        { initials: 'LM', name: 'Laurent Martin', project: 'Plomberie', city: 'La Neuville', score: 95, age: 'il y a 5j', status: 'devis' },
      ],
    },
    {
      title: 'Gagné 🏆', border: '#15803d', headerBadgeBg: '#15803d', headerBadgeColor: '#ffffff', count: 2,
      footer: '2 dossiers · 15.4k€', footerColor: 'var(--accent)', footerWeight: 700,
      cards: [
        { initials: 'LC', name: 'Leroy Celine', project: 'jardin', city: 'Le Petit-Quevilly', score: 100, age: 'il y a 2j', status: 'gagne' },
        { initials: 'RS', name: 'Roussel Sebastien', project: 'Plomberie', city: 'Montmain', score: 90, age: 'il y a 4j', status: 'gagne' },
      ],
    },
  ]
  return (
    <div className="kr-mockup" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ borderBottom: '1px solid var(--border)', padding: '10px 14px', flexShrink: 0 }} className="flex items-center justify-between gap-2">
        <p style={{ ...kLabel, color: '#60a5fa' }}>Pipeline Kanban</p>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-2)' }}>17 dossiers</span>
          <span style={{ color: 'var(--accent)' }} className="text-xs font-bold">42.8k€ potentiel</span>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid var(--border)', padding: '6px 14px', flexShrink: 0 }} className="flex items-center gap-2">
        <span
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', width: '140px' }}
          className="flex items-center gap-1.5 px-2 py-1 text-xs"
        >
          <Search size={10} color="var(--text-3)" />
          <span style={{ color: 'var(--text-3)' }} className="truncate">Nom, projet...</span>
        </span>
        <span style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '4px' }} className="px-2 py-0.5 text-xs">
          Liste
        </span>
        <span style={{ background: '#22c55e', color: 'var(--bg)', borderRadius: '4px' }} className="px-2 py-0.5 text-xs font-bold">
          Kanban
        </span>
        <span style={{ border: '1px solid var(--border)', borderRadius: '4px' }} className="flex items-center gap-1 px-2 py-0.5 text-xs">
          <Download size={10} />
          Exporter
        </span>
      </div>

      <div className="grid flex-1 grid-cols-5 gap-1.5" style={{ overflow: 'hidden', padding: '8px' }}>
        {columns.map((col) => (
          <div
            key={col.title}
            style={{ borderTop: `2px solid ${col.border}`, borderRight: '1px solid var(--border)' }}
            className="flex min-h-0 flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between gap-1 px-2 py-2">
              <span className="truncate text-xs font-bold text-white">{col.title}</span>
              <span
                style={{ background: col.headerBadgeBg, color: col.headerBadgeColor }}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs"
              >
                {col.count}
              </span>
            </div>
            <div className="flex flex-1 flex-col overflow-hidden px-2" style={{ minHeight: 0 }}>
              {col.cards.map((card) => {
                const badge = STATUS_BADGE[card.status]
                return (
                  <div
                    key={card.name}
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', marginBottom: '6px' }}
                    className="flex flex-col"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        style={{ background: 'var(--bg-hover)', fontSize: '9px', fontWeight: 700 }}
                        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-white"
                      >
                        {card.initials}
                      </span>
                      <span className="truncate text-[11px] font-semibold" style={{ color: 'var(--text-1)' }}>{card.name}</span>
                    </div>
                    <p className="truncate text-[10px]" style={{ color: 'var(--text-2)', marginTop: '3px' }}>{card.project}</p>
                    <p className="truncate text-[10px]" style={{ color: 'var(--text-3)' }}>{card.city}</p>
                    <div className="flex items-center justify-between gap-1" style={{ marginTop: '6px' }}>
                      <span className="text-[10px] font-bold" style={{ color: scoreColor(card.score) }}>Score: {card.score}%</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{card.age}</span>
                    </div>
                    <span
                      style={{ background: badge.bg, color: badge.color, borderRadius: '999px', fontWeight: 700, marginTop: '6px', width: 'fit-content' }}
                      className="px-2 py-0.5 text-[9px]"
                    >
                      {badge.label}
                    </span>
                  </div>
                )
              })}
              {col.cards.length < 2 && <div className="flex-1" />}
            </div>
            <p
              className="py-1 text-center text-xs"
              style={{ borderTop: '1px solid var(--border)', color: col.footerColor, fontWeight: col.footerWeight, marginTop: 'auto' }}
            >
              {col.footer}
            </p>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px', flexShrink: 0 }} className="flex items-center justify-between gap-2">
        <span style={{ color: 'var(--accent)' }} className="text-xs font-bold">CA total: 42.8k€</span>
        <span className="text-xs" style={{ color: 'var(--text-2)' }}>Taux conversion: 12%</span>
        <span className="text-xs" style={{ color: 'var(--text-2)' }}>17 dossiers actifs</span>
      </div>
    </div>
  )
}

function MockupDevis() {
  const lines = [
    { label: 'Dépose ancienne cuisine', price: '450,00 €', bold: false },
    { label: 'Fourniture cuisine équipée', price: '6 200,00 €', bold: true },
    { label: 'Installation électrique & plomberie', price: '1 350,00 €', bold: false },
    { label: 'Pose & finitions', price: '1 800,00 €', bold: false },
  ]
  return (
    <div className="kr-mockup" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid var(--border)' }} className="flex items-start justify-between gap-3 p-4 sm:px-5">
        <div>
          <p style={{ ...kLabel, color: '#f59e0b' }} className="mb-1">Devis en un clic</p>
          <p className="text-lg font-extrabold text-white">DEV-2026-002</p>
          <p className="text-xs text-zinc-400">Sophie Martin — Rénovation cuisine</p>
        </div>
        <span
          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
          className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold"
        >
          Brouillon
        </span>
      </div>

      <div className="px-4 pt-3 sm:px-5">
        {lines.map((line) => (
          <div key={line.label} style={{ borderBottom: '1px solid var(--border)' }} className="flex items-center justify-between gap-3 py-2">
            <span className="text-xs text-white">{line.label}</span>
            <span className={`whitespace-nowrap text-xs text-white ${line.bold ? 'font-semibold' : 'font-medium'}`}>
              {line.price}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 sm:px-5">
        <span className="text-sm font-bold text-white">Total TTC</span>
        <span style={{ color: 'var(--accent)' }} className="text-xl font-black">9 800,00 €</span>
      </div>

      <div
        style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid var(--accent-border)' }}
        className="mx-4 mt-2 flex items-center gap-2 rounded-lg p-3 sm:mx-5"
      >
        <Eye size={12} color="#22c55e" className="shrink-0" />
        <p className="text-xs font-medium text-white">Envoyé · Ouvert 2 fois · En attente de signature</p>
      </div>

      <div style={{ background: 'var(--bg)', borderRadius: '8px', padding: '10px 14px', margin: '0 20px 12px' }} className="mt-2 flex flex-1 flex-col justify-center gap-1.5">
        <p style={kLabel} className="mb-0.5 text-zinc-500">Historique devis</p>
        <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
          <CheckCircle size={10} color="var(--accent)" />
          Devis envoyé le 15/06/2026
        </p>
        <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
          <Eye size={10} color="#60a5fa" />
          Ouvert le 15/06 à 14h32 (2 fois)
        </p>
        <p className="flex items-center gap-1.5 text-xs" style={{ color: '#f59e0b' }}>
          <Clock size={10} color="#f59e0b" />
          En attente de signature
        </p>
      </div>

      <div className="px-4 py-3 sm:px-5">
        <button style={{ background: 'var(--accent)', color: 'var(--bg)' }} className="w-full rounded-xl py-2.5 text-sm font-bold">
          Envoyer le devis →
        </button>
      </div>
    </div>
  )
}

type CalendarEventType = 'rdv' | 'relance' | 'rappel' | 'intervention'

const CALENDAR_TYPE_STYLE: Record<CalendarEventType, { bg: string; color: string }> = {
  rdv: { bg: 'rgba(34,197,94,0.2)', color: '#22c55e' },
  relance: { bg: 'rgba(217,119,6,0.2)', color: '#f59e0b' },
  rappel: { bg: 'rgba(37,99,235,0.2)', color: '#60a5fa' },
  intervention: { bg: 'rgba(139,92,246,0.2)', color: '#a78bfa' },
}

function MockupCalendar() {
  const weekDays = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
  const events: { day: number; type: CalendarEventType; label: string; struck?: boolean }[] = [
    { day: 3, type: 'rdv', label: 'Visite chantier' },
    { day: 3, type: 'relance', label: 'Devis Leroy' },
    { day: 10, type: 'relance', label: 'Relance Sophie' },
    { day: 11, type: 'relance', label: 'Devis à valider' },
    { day: 16, type: 'rappel', label: 'Rappel Antonin', struck: true },
    { day: 17, type: 'rappel', label: 'Rappel Leroy' },
    { day: 19, type: 'relance', label: 'Visite Martin' },
    { day: 22, type: 'intervention', label: 'Installation PAC' },
    { day: 22, type: 'rdv', label: 'RDV Blanchard' },
    { day: 24, type: 'rdv', label: 'RDV Blanchard' },
    { day: 26, type: 'rdv', label: 'Visite TEST' },
    { day: 29, type: 'relance', label: 'Relance mensuelle' },
  ]
  const eventsByDay = new Map<number, typeof events>()
  events.forEach((e) => {
    eventsByDay.set(e.day, [...(eventsByDay.get(e.day) ?? []), e])
  })
  const today = 15
  const cells = Array.from({ length: 42 }, (_, i) => (
    i < 30 ? { day: i + 1, current: true } : { day: i - 29, current: false }
  ))

  return (
    <div className="kr-mockup" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid var(--border)' }} className="flex items-center justify-between gap-2 p-3 sm:px-4">
        <p className="text-base font-extrabold text-white">Juin 2026</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">‹ ›</span>
          <span style={{ background: 'var(--accent)', color: 'var(--bg)' }} className="whitespace-nowrap rounded-md px-2 py-1 text-xs font-bold">
            + Événement
          </span>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid var(--border)' }} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-2 sm:px-4">
        {(['rdv', 'relance', 'rappel', 'intervention'] as CalendarEventType[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: CALENDAR_TYPE_STYLE[type].color }} />
            {type === 'rdv' ? 'RDV' : type === 'relance' ? 'Relance' : type === 'rappel' ? 'Rappel' : 'Intervention'}
          </span>
        ))}
      </div>

      <div className="flex flex-1 flex-col p-2 sm:px-4 sm:pt-3">
        <div className="mb-1 grid grid-cols-7">
          {weekDays.map((d) => (
            <span key={d} className="pb-1 text-center text-[10px] text-zinc-600">{d}</span>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-7">
          {cells.map((cell, i) => {
            const dayEvents = cell.current ? eventsByDay.get(cell.day) ?? [] : []
            const isToday = cell.current && cell.day === today
            return (
              <div
                key={i}
                style={{ borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
                className="flex min-h-[56px] flex-col gap-0.5 p-[3px]"
              >
                {isToday ? (
                  <span style={{ background: 'var(--accent)', color: 'var(--bg)' }} className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-bold">
                    {cell.day}
                  </span>
                ) : (
                  <span className="text-[10px]" style={{ color: cell.current ? 'var(--text-2)' : '#3f3f46' }}>{cell.day}</span>
                )}
                {dayEvents.map((event, j) => (
                  <span
                    key={j}
                    style={{
                      background: CALENDAR_TYPE_STYLE[event.type].bg,
                      color: CALENDAR_TYPE_STYLE[event.type].color,
                      textDecoration: event.struck ? 'line-through' : 'none',
                      opacity: event.struck ? 0.6 : 1,
                    }}
                    className="truncate rounded px-1.5 py-0.5 text-[9px] font-medium"
                  >
                    {event.label}
                  </span>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)' }} className="flex flex-col gap-1.5 p-3 sm:px-4">
        {[
          { day: 3, label: 'RDV Leroy Celine', color: CALENDAR_TYPE_STYLE.rdv.color },
          { day: 10, label: 'Relance Sophie Martin', color: CALENDAR_TYPE_STYLE.relance.color },
          { day: 19, label: 'Visite technique Martin', color: CALENDAR_TYPE_STYLE.relance.color },
          { day: 22, label: 'Installation PAC Lamani', color: CALENDAR_TYPE_STYLE.intervention.color },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 py-0.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.color }} />
            <span className="text-xs text-zinc-400">
              {item.day} juin — <span className="text-white">{item.label}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const DASHBOARD_MOCKUPS = [MockupDossier, MockupPipeline, MockupDevis, MockupCalendar]

function DashboardCarousel() {
  const [activeTab, setActiveTab] = useState(0)
  const [displayedTab, setDisplayedTab] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter-start' | 'enter'>('idle')
  const [paused, setPaused] = useState(false)

  const switchMockup = (next: number) => {
    setPhase('exit')
    setTimeout(() => {
      setDisplayedTab(next)
      setPhase('enter-start')
      requestAnimationFrame(() => {
        setPhase('enter')
        setTimeout(() => setPhase('idle'), 350)
      })
    }, 250)
  }

  const handleSelect = (i: number) => {
    if (i === activeTab) return
    setActiveTab(i)
    switchMockup(i)
  }

  useEffect(() => {
    if (paused) return
    const timer = setTimeout(() => {
      const next = (activeTab + 1) % DASHBOARD_TABS.length
      setActiveTab(next)
      switchMockup(next)
    }, 5000)
    return () => clearTimeout(timer)
  }, [activeTab, paused])

  const mockupStyle: CSSProperties = {
    idle: { opacity: 1, transform: 'translateY(0) scale(1)', transition: 'opacity 350ms cubic-bezier(0.16,1,0.3,1), transform 350ms cubic-bezier(0.16,1,0.3,1)' },
    exit: { opacity: 0, transform: 'translateY(-12px) scale(0.98)', transition: 'opacity 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1)' },
    'enter-start': { opacity: 0, transform: 'translateY(12px) scale(0.98)', transition: 'none' },
    enter: { opacity: 1, transform: 'translateY(0) scale(1)', transition: 'opacity 350ms cubic-bezier(0.16,1,0.3,1), transform 350ms cubic-bezier(0.16,1,0.3,1)' },
  }[phase]

  const activeTabData = DASHBOARD_TABS[displayedTab]
  const ActiveMockup = DASHBOARD_MOCKUPS[displayedTab]

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-10"
    >
      {/* Tabs liquid glass */}
      <div className="order-2 flex flex-col gap-3 lg:order-1">
        {DASHBOARD_TABS.map((tab, i) => {
          const active = i === activeTab
          const Icon = tab.icon
          return (
            <div
              key={tab.number}
              onClick={() => handleSelect(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleSelect(i)
              }}
              style={{
                background: active ? 'rgba(39,39,42,0.6)' : 'rgba(24,24,27,0.4)',
                border: `1px solid ${active ? tab.iconBorder : '#27272a'}`,
                borderRadius: '16px',
                padding: '16px 20px',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                transition: 'background 300ms ease, border-color 300ms ease',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  style={{
                    width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                    background: tab.iconBg, border: `1px solid ${tab.iconBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color={tab.color} />
                </div>
                <div className="flex-1">
                  <span style={{ color: tab.color, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em' }}>
                    {tab.number}
                  </span>
                  <p className="text-sm font-bold text-white sm:text-base">{tab.title}</p>
                </div>
                <ChevronRight
                  size={18}
                  style={{
                    color: active ? tab.color : '#52525b',
                    transform: active ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 300ms ease',
                    flexShrink: 0,
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateRows: active ? '1fr' : '0fr', transition: 'grid-template-rows 300ms ease' }}>
                <div style={{ overflow: 'hidden' }}>
                  <p className="pt-3 text-sm leading-relaxed text-zinc-400">{tab.description}</p>
                  <div style={{ width: '100%', height: '2px', borderRadius: '1px', background: '#27272a', marginTop: '14px', overflow: 'hidden' }}>
                    {active && (
                      <div
                        key={activeTab}
                        style={{
                          height: '100%', borderRadius: '1px', background: tab.color, width: '0%',
                          animation: 'kr-dash-progress-v2 5000ms linear forwards',
                          animationPlayState: paused ? 'paused' : 'running',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mockup + glow */}
      <div className="relative order-1 h-full lg:order-2">
        <div
          className="kr-glow-pulse pointer-events-none absolute -inset-6 -z-10 rounded-[32px] sm:-inset-10"
          style={{ background: activeTabData.glow, filter: 'blur(60px)', transition: 'background 600ms ease' }}
        />
        <div
          className="mockup-float max-h-[320px] overflow-auto rounded-2xl lg:max-h-none lg:h-full lg:overflow-visible"
          style={{
            background: 'rgba(24,24,27,0.6)',
            border: '1px solid #27272a',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            ...mockupStyle,
          }}
        >
          <ActiveMockup />
        </div>
      </div>

      <style>{`
        @keyframes kr-dash-progress-v2 {
          from { width: 0%; }
          to { width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes kr-dash-progress-v2 {
            from { width: 100%; }
            to { width: 100%; }
          }
        }
      `}</style>
    </div>
  )
}
export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('kr-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    const elements = document.querySelectorAll('.kr-reveal')
    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export const ANIMATION_STYLES = `
  .kr-reveal {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .kr-reveal.kr-visible {
    opacity: 1;
    transform: translateY(0);
  }
  .kr-reveal-delay-1 { transition-delay: 0.1s; }
  .kr-reveal-delay-2 { transition-delay: 0.2s; }
  .kr-reveal-delay-3 { transition-delay: 0.3s; }
  .kr-reveal-delay-4 { transition-delay: 0.4s; }
  .kr-reveal-delay-5 { transition-delay: 0.5s; }
  .kr-reveal-delay-6 { transition-delay: 0.6s; }

  .kr-reveal-left {
    opacity: 0;
    transform: translateX(-32px);
    transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .kr-reveal-left.kr-visible {
    opacity: 1;
    transform: translateX(0);
  }

  .kr-reveal-right {
    opacity: 0;
    transform: translateX(32px);
    transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .kr-reveal-right.kr-visible {
    opacity: 1;
    transform: translateX(0);
  }

  .kr-reveal-scale {
    opacity: 0;
    transform: scale(0.92);
    transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .kr-reveal-scale.kr-visible {
    opacity: 1;
    transform: scale(1);
  }

  /* Compteur animé */
  @keyframes kr-count-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .kr-count {
    animation: kr-count-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  /* Ligne verte underline animée */
  .kr-underline {
    position: relative;
    display: inline-block;
  }
  .kr-underline::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    width: 0;
    height: 2px;
    background: #22c55e;
    transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s;
  }
  .kr-reveal.kr-visible .kr-underline::after,
  .kr-underline.kr-visible::after {
    width: 100%;
  }

  /* Carte hover lift */
  .kr-card-hover {
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.3s ease,
                border-color 0.3s ease;
  }
  .kr-card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    border-color: rgba(34,197,94,0.25) !important;
  }

  /* Badge pulse */
  @keyframes kr-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
    50%       { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
  }
  .kr-badge-pulse {
    animation: kr-pulse 2.5s infinite;
  }

  /* Gradient text */
  .kr-gradient-text {
    background: linear-gradient(135deg, #22c55e 0%, #86efac 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Ligne qui s'étend */
  @keyframes kr-line-grow {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  .kr-line-grow {
    transform-origin: left;
    animation: kr-line-grow 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  /* Number ticker */
  @keyframes kr-ticker {
    from { opacity: 0; transform: translateY(100%); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .kr-ticker {
    overflow: hidden;
    display: inline-block;
  }
  .kr-ticker span {
    display: inline-block;
    animation: kr-ticker 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  /* Glassmorphism */
  .kr-glass {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  /* Bento grid */
  .kr-bento {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-auto-rows: minmax(180px, auto);
    gap: 16px;
  }
  @media (max-width: 768px) {
    .kr-bento {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 400px) {
    .kr-bento {
      grid-template-columns: repeat(1, 1fr);
      grid-auto-rows: auto;
    }
    .kr-bento-item {
      grid-column: span 1 !important;
      grid-row: span 1 !important;
    }
  }

  /* Sound wave */
  @keyframes kr-wave {
    0%, 100% { transform: scaleY(0.4); opacity: 0.6; }
    50% { transform: scaleY(1); opacity: 1; }
  }
  .kr-wave {
    animation: kr-wave 1.2s ease-in-out infinite;
    transform-origin: bottom;
  }

  /* Kanban card entry */
  @keyframes kr-card-in {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* Typing indicator */
  @keyframes kr-typing-dot {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }
  .kr-typing-dot {
    animation: kr-typing-dot 1s ease-in-out infinite;
  }

  /* Parcours de qualification — step enter */
  @keyframes kr-step-icon-in {
    from { opacity: 0; transform: scale(0.8); }
    to   { opacity: 1; transform: scale(1); }
  }
  .kr-step-icon-enter {
    animation: kr-step-icon-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes kr-step-text-in {
    from { opacity: 0; transform: translateX(-4px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .kr-step-text-enter {
    animation: kr-step-text-in 200ms ease-out both;
  }

  /* Liquid glass bento card with hover glow */
  .kr-glass-bento {
    position: relative;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
    transition: background 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
  }
  @supports (backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px)) {
    .kr-glass-bento {
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
  }
  .kr-glass-bento::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    background: var(--glow-color, transparent);
    opacity: 0;
    filter: blur(20px);
    z-index: -1;
    transition: opacity 300ms ease;
    pointer-events: none;
  }
  .kr-glass-bento:hover::before {
    opacity: 0.6;
  }
  .kr-glass-bento:hover,
  .kr-glass-bento[aria-expanded="true"] {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.15);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.1),
      0 0 0 1px rgba(34,197,94,0.15),
      0 8px 32px rgba(0,0,0,0.3);
  }

  /* Liquid glass hero showcase card */
  .kr-glass-hero {
    position: relative;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.10);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.05),
      0 24px 80px rgba(0,0,0,0.4),
      inset 0 1px 0 rgba(255,255,255,0.08);
    border-radius: 20px;
  }
  @supports (backdrop-filter: blur(20px)) or (-webkit-backdrop-filter: blur(20px)) {
    .kr-glass-hero {
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
  }
  .kr-glass-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    filter: blur(60px);
    background: radial-gradient(ellipse at center, rgba(34,197,94,0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  /* Assistant web bento card — scoped tokens */
  .kr-assistant-card {
    --bg: #09090b;
    --bg-elevated: #18181b;
    --bg-hover: #27272a;
    --border: #27272a;
    --text-1: #ffffff;
    --text-2: #a1a1aa;
    --text-3: #71717a;
    --accent: #22c55e;
    --accent-border: rgba(34, 197, 94, 0.3);
  }

  /* Assistant web bento card — message enter animations */
  .kr-assistant-scroll {
    scroll-behavior: smooth;
  }
  @keyframes kr-assistant-msg-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .kr-assistant-msg-in {
    animation: kr-assistant-msg-in 250ms ease-out both;
  }
  @keyframes kr-assistant-user-in {
    from { opacity: 0; transform: translateX(8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .kr-assistant-user-in {
    animation: kr-assistant-user-in 200ms ease-out both;
  }

  /* Replace 12 tools — section scoped tokens */
  .kr-tools-section {
    --bg: #09090b;
    --bg-elevated: #18181b;
    --bg-hover: #27272a;
    --border: #27272a;
    --text-1: #ffffff;
    --text-2: #a1a1aa;
    --text-3: #71717a;
    --accent: #22c55e;
    --accent-border: rgba(34, 197, 94, 0.3);
  }

  /* Replace 12 tools — carousel card */
  .kr-tools-card {
    width: 720px;
    max-width: 92vw;
    border-radius: 24px;
    overflow: hidden;
    position: absolute;
    background: rgba(15, 15, 18, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.10);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 32px 80px rgba(0, 0, 0, 0.6);
    transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1),
                opacity 600ms cubic-bezier(0.16, 1, 0.3, 1),
                filter 600ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  @supports (backdrop-filter: blur(24px)) or (-webkit-backdrop-filter: blur(24px)) {
    .kr-tools-card {
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
    }
  }
  @supports not (backdrop-filter: blur(24px)) {
    .kr-tools-card {
      background: rgba(15, 15, 18, 0.97);
    }
  }
  .kr-tools-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  }
  .kr-tools-card[data-position="side"] {
    pointer-events: none;
  }
  @media (max-width: 767px) {
    .kr-tools-card[data-position="side"] {
      display: none;
    }
    .kr-tools-card[data-position="active"] {
      width: 95vw !important;
      transform: none !important;
    }
    .kr-tools-card-grid {
      grid-template-columns: 1fr !important;
    }
  }
  @media (min-width: 768px) and (max-width: 1023px) {
    .kr-tools-card {
      width: 640px;
    }
  }

  /* Replace 12 tools — nav buttons */
  .kr-tools-nav-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--text-1, #fff);
    transition: background 200ms ease, transform 200ms ease;
  }
  @supports (backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px)) {
    .kr-tools-nav-btn {
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
  }
  .kr-tools-nav-btn:hover {
    background: rgba(255, 255, 255, 0.10);
    transform: scale(1.05);
  }
  @media (max-width: 767px) {
    .kr-tools-nav-btn {
      display: none;
    }
  }

  /* Replace 12 tools — dots */
  .kr-tools-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
    transition: width 300ms ease, background 300ms ease;
  }
  .kr-tools-dot.kr-tools-dot-active {
    width: 24px;
    background: var(--accent, #22c55e);
  }

  /* Replace 12 tools — float animation on active card */
  @keyframes card-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  .carousel-card-float {
    animation: card-float 5s ease-in-out infinite;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .kr-reveal,
    .kr-reveal-left,
    .kr-reveal-right,
    .kr-reveal-scale,
    .kr-card-hover,
    .kr-badge-pulse,
    .kr-line-grow,
    .kr-wave,
    .kr-typing-dot,
    .kr-step-icon-enter,
    .kr-step-text-enter,
    .kr-ticker span {
      transition: none !important;
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
    .kr-glass-bento,
    .kr-glass-bento::before {
      transition: none !important;
    }
    .kr-tools-card,
    .carousel-card-float {
      transition: none !important;
      animation: none !important;
    }
    .kr-assistant-scroll {
      scroll-behavior: auto !important;
    }
    .kr-assistant-msg-in,
    .kr-assistant-user-in {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }
`

const METRICS_DATA: {
  valeur: string;
  label: string;
  description: string;
  countTarget: number | null;
  prefix: string;
  suffix: string;
}[] = [
  { valeur: 'Zéro', label: 'saisie manuelle', description: 'tout est structuré automatiquement', countTarget: null, prefix: '', suffix: '' },
  { valeur: '0', label: 'prospect perdu', description: 'chaque demande est captée et traitée', countTarget: 0, prefix: '', suffix: '' },
  { valeur: '+40%', label: 'taux de réponse', description: 'vs un artisan sans assistant', countTarget: 40, prefix: '+', suffix: '%' },
  { valeur: '100%', label: 'dossiers scorés', description: 'priorisés par potentiel commercial', countTarget: 100, prefix: '', suffix: '%' },
  { valeur: '24h/24', label: 'votre site répond', description: 'même quand vous êtes sur le chantier', countTarget: null, prefix: '', suffix: '' },
  { valeur: '< 15 min', label: 'mise en place', description: 'opérationnel dès aujourd\'hui', countTarget: 15, prefix: '< ', suffix: ' min' },
];

function countUp(element: HTMLElement, target: number, duration: number, prefix: string, suffix: string) {
  const start = performance.now();
  const animate = (now: number) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    element.textContent = `${prefix}${current}${suffix}`;
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

function metricBorderClasses(i: number) {
  const base = i < 5 ? 'border-b border-zinc-800' : 'border-b-0';
  const mdRight = i % 2 === 0 ? 'md:border-r md:border-zinc-800' : 'md:border-r-0';
  const mdBottom = i < 4 ? 'md:border-b md:border-zinc-800' : 'md:border-b-0';
  const lgRight = i % 3 !== 2 ? 'lg:border-r lg:border-zinc-800' : 'lg:border-r-0';
  const lgBottom = i < 3 ? 'lg:border-b lg:border-zinc-800' : 'lg:border-b-0';
  return `${base} ${mdRight} ${mdBottom} ${lgRight} ${lgBottom}`;
}

function MetricsGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const valueRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      itemRefs.current.forEach((el) => el?.classList.add('metric-visible'));
      lineRefs.current.forEach((el) => el?.classList.add('metric-line-visible'));
      METRICS_DATA.forEach((m, i) => {
        const el = valueRefs.current[i];
        if (el && m.countTarget !== null) {
          el.textContent = `${m.prefix}${m.countTarget}${m.suffix}`;
        }
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = itemRefs.current.indexOf(entry.target as HTMLDivElement);
          if (index === -1) return;
          const delay = index * 100;
          const metric = METRICS_DATA[index];

          setTimeout(() => {
            entry.target.classList.add('metric-visible');
            const valueEl = valueRefs.current[index];
            if (valueEl && metric.countTarget !== null) {
              countUp(valueEl, metric.countTarget, 1200, metric.prefix, metric.suffix);
            }
          }, delay);

          setTimeout(() => {
            lineRefs.current[index]?.classList.add('metric-line-visible');
          }, delay + 300);

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    itemRefs.current.forEach((el) => el && observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {METRICS_DATA.map((m, i) => (
        <div
          key={m.label}
          ref={(el) => { itemRefs.current[i] = el; }}
          style={{ transitionDelay: `${i * 100}ms` }}
          className={`metric-hidden px-8 py-10 text-center ${metricBorderClasses(i)}`}
        >
          <p
            ref={(el) => { valueRefs.current[i] = el; }}
            className="text-[clamp(2.2rem,4vw,3.2rem)] font-black leading-none tracking-[-0.02em] text-green-500"
          >
            {m.valeur}
          </p>
          <span ref={(el) => { lineRefs.current[i] = el; }} className="metric-line" />
          <p className="mt-2 text-base font-bold text-white">{m.label}</p>
          <p className="mx-auto mt-1 min-h-[36px] max-w-[160px] text-center text-[13px] leading-[1.5] text-zinc-400">{m.description}</p>
        </div>
      ))}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

const fmtNum = (n: number) => n.toLocaleString('fr-FR');

function FadeIn({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`flex h-full flex-col transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
}

const CHAT_MESSAGES: { role: 'assistant' | 'user'; text: string; delay: number }[] = [
  {
    role: 'assistant',
    text: "Bonjour, je suis l'assistant Kadria 👋\nPour commencer, quel type de travaux ou de projet souhaitez-vous réaliser ?",
    delay: 0,
  },
  { role: 'user', text: 'Nouveau projet', delay: 1000 },
  {
    role: 'assistant',
    text: 'Merci pour cette précision. Pour mieux comprendre votre projet, pouvez-vous nous donner une description détaillée de ce que vous souhaitez réaliser ?',
    delay: 2000,
  },
  {
    role: 'user',
    text: "Installation d'une prise pour recharger une voiture électrique devant ma maison",
    delay: 3200,
  },
  {
    role: 'assistant',
    text: "C'est un projet intéressant ! Pour l'installation de cette prise, avez-vous déjà un emplacement précis en tête et des travaux d'électricité sont-ils nécessaires ?",
    delay: 4400,
  },
  { role: 'user', text: 'Oui à côté du garage', delay: 5600 },
  {
    role: 'assistant',
    text: 'Avez-vous déjà vérifié si le tableau électrique est suffisant pour supporter cette nouvelle prise ?',
    delay: 6800,
  },
  { role: 'user', text: "Oui c'est bon", delay: 7800 },
  {
    role: 'assistant',
    text: 'Parfait ! Pour préparer un devis, pouvez-vous me dire si vous avez une idée du budget que vous souhaitez allouer à ce projet ? 💰',
    delay: 8800,
  },
  { role: 'user', text: 'Moins de 2 000 €', delay: 10000 },
  {
    role: 'assistant',
    text: 'Pour mieux préparer le devis, pouvez-vous estimer plus précisément ? Par exemple, 200-500€, 500-1 000€ ou 1 000-2 000€ ?',
    delay: 11200,
  },
  { role: 'user', text: '200 – 500 €', delay: 12400 },
  {
    role: 'assistant',
    text: 'Merci pour cette précision sur le budget. Souhaitez-vous réaliser ce projet rapidement ou plutôt dans les prochains mois ? 📅',
    delay: 13600,
  },
  { role: 'user', text: 'Dès que possible', delay: 14800 },
  {
    role: 'assistant',
    text: 'Où en êtes-vous dans votre réflexion ?',
    delay: 15800,
  },
  { role: 'user', text: 'Prêt à démarrer', delay: 16800 },
  {
    role: 'assistant',
    text: "Avez-vous des photos, plans ou documents à joindre pour aider l'artisan à préparer son devis ? 📎",
    delay: 17800,
  },
];

function AssistantWebChatCard({ reduceMotion }: { reduceMotion: boolean }) {
  const [visibleMessages, setVisibleMessages] = useState(reduceMotion ? CHAT_MESSAGES.length : 0);
  const [typingBeforeIndex, setTypingBeforeIndex] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setVisibleMessages(0);
      setTypingBeforeIndex(null);

      CHAT_MESSAGES.forEach((msg, i) => {
        if (msg.role === 'assistant') {
          timeouts.push(setTimeout(() => setTypingBeforeIndex(i), Math.max(msg.delay - 800, 0)));
        }
        timeouts.push(setTimeout(() => {
          setTypingBeforeIndex(null);
          setVisibleMessages(i + 1);
        }, msg.delay));
      });

      const lastDelay = CHAT_MESSAGES[CHAT_MESSAGES.length - 1].delay;
      timeouts.push(setTimeout(run, lastDelay + 2000));
    };

    run();

    return () => timeouts.forEach(clearTimeout);
  }, [reduceMotion]);

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [visibleMessages, typingBeforeIndex, reduceMotion]);

  return (
    <div className="kr-assistant-card -m-6 flex h-[calc(100%+3rem)] w-[calc(100%+3rem)] flex-col overflow-hidden rounded-xl">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-[var(--border)] px-4 py-3.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-extrabold text-[var(--bg)]">
          K
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--text-1)]">Kadria</p>
          <p className="text-xs text-[var(--text-2)]">Assistant en ligne</p>
        </div>
        <span className="kr-badge-pulse ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent)]" />
      </div>

      <div className="flex-shrink-0 border-b border-[var(--border)] px-4 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-2)]">Votre projet</span>
          <span className="text-xs text-[var(--text-2)]">Étape 1 sur 4 — Projet</span>
        </div>
        <div className="mt-0.5 h-0.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div className="h-full w-1/4 rounded-full bg-[var(--accent)]" />
        </div>
      </div>

      <div ref={chatRef} className="kr-assistant-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-3.5 py-3">
        {CHAT_MESSAGES.slice(0, visibleMessages).map((msg, i) =>
          msg.role === 'assistant' ? (
            <div
              key={i}
              className={`max-w-[85%] self-start whitespace-pre-line rounded-[12px] rounded-bl-[2px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--text-1)] ${
                reduceMotion ? '' : 'kr-assistant-msg-in'
              }`}
            >
              {msg.text}
            </div>
          ) : (
            <div
              key={i}
              className={`max-w-[75%] self-end rounded-[12px] rounded-br-[2px] bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-[var(--bg)] ${
                reduceMotion ? '' : 'kr-assistant-user-in'
              }`}
            >
              {msg.text}
            </div>
          )
        )}
        {typingBeforeIndex !== null && (
          <div className="flex w-fit items-center gap-1 self-start rounded-[12px] bg-[var(--bg-elevated)] px-3 py-2">
            <span className="kr-typing-dot h-2 w-2 rounded-full bg-[var(--text-3)] [animation-delay:0ms]" />
            <span className="kr-typing-dot h-2 w-2 rounded-full bg-[var(--text-3)] [animation-delay:150ms]" />
            <span className="kr-typing-dot h-2 w-2 rounded-full bg-[var(--text-3)] [animation-delay:300ms]" />
          </div>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 border-t border-[var(--border)] px-3.5 py-2.5">
        <div className="flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5">
          <span className="text-xs text-[var(--text-3)]">Écrivez votre message...</span>
        </div>
        <div className="flex flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[var(--bg)]">
          <Send size={14} />
        </div>
      </div>
    </div>
  );
}

const WEB_CHAT_MESSAGES = [
  { from: 'user', text: 'Bonjour, je voudrais un devis pour une rénovation salle de bain 🛁' },
  { from: 'kadria', text: 'Bien sûr ! Quelle est la surface approximative ?' },
  { from: 'user', text: 'Environ 8m², budget entre 8 000 et 12 000€' },
  { from: 'kadria', text: 'Parfait. Avez-vous des photos du chantier à partager ?' },
];

function WebChatDemo({ reduceMotion }: { reduceMotion: boolean }) {
  const messages = WEB_CHAT_MESSAGES;
  const [visibleCount, setVisibleCount] = useState(reduceMotion ? messages.length : 0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const delays = [500, 1500, 2500, 3500];

    const run = () => {
      setVisibleCount(0);
      setTyping(false);
      messages.forEach((msg, i) => {
        if (msg.from === 'kadria') {
          timeouts.push(setTimeout(() => { if (!cancelled) setTyping(true); }, delays[i] - 400));
        }
        timeouts.push(setTimeout(() => {
          if (cancelled) return;
          setTyping(false);
          setVisibleCount(i + 1);
        }, delays[i]));
      });
      timeouts.push(setTimeout(() => { if (!cancelled) run(); }, delays[delays.length - 1] + 4000));
    };

    run();
    return () => { cancelled = true; timeouts.forEach(clearTimeout); };
  }, [reduceMotion]);

  return (
    <div className="mt-4 flex flex-col gap-2">
      {messages.slice(0, visibleCount).map((msg, i) =>
        msg.from === 'user' ? (
          <div key={i} className="max-w-[85%] rounded-lg rounded-tl-sm bg-zinc-800 px-3 py-2 text-xs leading-5 text-zinc-300">
            {msg.text}
          </div>
        ) : (
          <div key={i} className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-green-500/15 px-3 py-2 text-xs leading-5 text-green-300">
            {msg.text}
          </div>
        )
      )}
      {typing && (
        <div className="ml-auto flex w-fit items-center gap-1 rounded-lg rounded-tr-sm bg-green-500/15 px-3 py-2">
          <span className="kr-typing-dot h-1.5 w-1.5 rounded-full bg-green-300 [animation-delay:0ms]" />
          <span className="kr-typing-dot h-1.5 w-1.5 rounded-full bg-green-300 [animation-delay:150ms]" />
          <span className="kr-typing-dot h-1.5 w-1.5 rounded-full bg-green-300 [animation-delay:300ms]" />
        </div>
      )}
    </div>
  );
}

const VOICE_TRANSCRIPT_LINES = [
  { who: 'client', text: 'Client : Bonjour, je cherche un plombier pour...' },
  { who: 'kadria', text: "Kadria : Bonjour ! Je suis l'assistant de l'artisan. Quel est le problème ?" },
  { who: 'client', text: "Client : Une fuite sous l'évier, urgent" },
  { who: 'kadria', text: 'Kadria : Je comprends. Êtes-vous disponible demain matin ?' },
];

function VoiceAssistantDemo({ reduceMotion }: { reduceMotion: boolean }) {
  const lines = VOICE_TRANSCRIPT_LINES;
  const [visibleCount, setVisibleCount] = useState(reduceMotion ? lines.length : 0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setVisibleCount(0);
      lines.forEach((_, i) => {
        timeouts.push(setTimeout(() => { if (!cancelled) setVisibleCount(i + 1); }, 600 * (i + 1)));
      });
      timeouts.push(setTimeout(() => { if (!cancelled) run(); }, 600 * lines.length + 4000));
    };

    run();
    return () => { cancelled = true; timeouts.forEach(clearTimeout); };
  }, [reduceMotion]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const waveBars = [
    'h-2 [animation-delay:0ms]',
    'h-4 [animation-delay:100ms]',
    'h-6 [animation-delay:200ms]',
    'h-3 [animation-delay:300ms]',
    'h-5 [animation-delay:400ms]',
    'h-2 [animation-delay:500ms]',
    'h-4 [animation-delay:600ms]',
    'h-3 [animation-delay:700ms]',
  ];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="kr-badge-pulse inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
          🔴 EN DIRECT
        </span>
        <span className="font-mono text-xs text-zinc-400">{mm}:{ss}</span>
      </div>
      <div className="mt-3 flex h-8 items-end gap-1.5">
        {waveBars.map((bar, idx) => (
          <div key={idx} className={`kr-wave w-1.5 rounded-full bg-green-500/60 ${bar}`} />
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {lines.slice(0, visibleCount).map((l, i) => (
          <p key={i} className={`text-[11px] leading-4 ${l.who === 'kadria' ? 'text-green-400' : 'text-zinc-300'}`}>
            {l.who === 'kadria' ? '🟢 ' : '🔴 '}{l.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function KanbanDemo({ reduceMotion }: { reduceMotion: boolean }) {
  const columns = ['Nouveau', 'À rappeler', 'Qualifié', 'Gagné'];
  const [cards, setCards] = useState([
    { name: 'M. Dupont', amount: '4 200€', col: 0 },
    { name: 'Mme Leroy', amount: '8 900€', col: 1 },
    { name: 'M. Martin', amount: '2 500€', col: 2 },
  ]);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setCards((prev) => prev.map((c) => ({ ...c, col: (c.col + 1) % columns.length })));
    }, 2000);
    return () => clearInterval(interval);
  }, [reduceMotion, columns.length]);

  return (
    <div className="mt-4 grid grid-cols-4 gap-1.5">
      {columns.map((col, ci) => (
        <div key={col} className="rounded-lg bg-zinc-800 p-1.5">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">{col}</p>
          <div className="flex min-h-[70px] flex-col gap-1.5">
            {cards.filter((c) => c.col === ci).map((c) => (
              <div
                key={c.name}
                className={`rounded-md border border-zinc-700 bg-zinc-900 p-1.5 text-[9px] transition-all duration-400 ${
                  reduceMotion ? '' : 'animate-[kr-card-in_400ms_ease-out]'
                }`}
              >
                <p className="font-semibold text-white">{c.name}</p>
                <p className="text-green-400">{c.amount}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function usePulseValues(targets: number[], duration: number, reduceMotion: boolean) {
  const [values, setValues] = useState(targets);
  const prevTargets = useRef(targets);

  useEffect(() => {
    if (reduceMotion) { prevTargets.current = targets; return; }
    const starts = prevTargets.current;
    const startTime = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setValues(targets.map((target, i) => Math.round(starts[i] + (target - starts[i]) * progress)));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else prevTargets.current = targets;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(targets), duration, reduceMotion]);

  return reduceMotion ? targets : values;
}

function PrioritisationDemo({ reduceMotion }: { reduceMotion: boolean }) {
  const [prospects, setProspects] = useState([
    { name: 'Dupont - SDB', score: 94, trend: 'up' as 'up' | 'down' },
    { name: 'Martin - Toiture', score: 87, trend: 'up' as 'up' | 'down' },
    { name: 'Leroy - Électricité', score: 71, trend: 'down' as 'up' | 'down' },
  ]);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setProspects((prev) => prev.map((p) => {
        const delta = Math.round((Math.random() - 0.5) * 10);
        const next = Math.max(40, Math.min(99, p.score + delta));
        return { ...p, score: next, trend: next >= p.score ? 'up' : 'down' };
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  const colorFor = (score: number) =>
    score > 80
      ? 'text-green-400 bg-green-500/10 border-green-500/30'
      : score > 60
      ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
      : 'text-red-400 bg-red-400/10 border-red-400/30';

  const displayedScores = usePulseValues(prospects.map((p) => p.score), 400, reduceMotion);

  return (
    <div className="mt-4 space-y-2">
      {prospects.map((p, i) => {
        const displayed = displayedScores[i];
        return (
          <div key={p.name} className="flex items-center justify-between rounded-md bg-zinc-800 px-3 py-2">
            <span className="text-xs text-zinc-300">{p.name}</span>
            <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold transition-colors duration-300 ${colorFor(displayed)}`}>
              {p.trend === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {displayed}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

const DOSSIER_DEMO_FIELDS = [
  { label: 'Nom', value: 'M. Bernard' },
  { label: 'Projet', value: 'Rénovation salle de bain' },
  { label: 'Surface', value: '8 m²' },
  { label: 'Budget', value: '8 000 - 12 000 €' },
  { label: 'Délai', value: 'Sous 2 mois' },
];

function DossierDemo({ reduceMotion }: { reduceMotion: boolean }) {
  const fields = DOSSIER_DEMO_FIELDS;
  const [visible, setVisible] = useState(reduceMotion ? fields.length : 0);
  const [score, setScore] = useState(reduceMotion ? 94 : 0);
  const [complete, setComplete] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setVisible(0);
      setScore(0);
      setComplete(false);
      fields.forEach((_, i) => {
        timeouts.push(setTimeout(() => { if (!cancelled) setVisible(i + 1); }, 300 * (i + 1)));
      });
      const scoreStart = 300 * (fields.length + 1);
      timeouts.push(setTimeout(() => {
        if (cancelled) return;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / 800, 1);
          setScore(Math.round(progress * 94));
          if (progress < 1 && !cancelled) requestAnimationFrame(tick);
          else if (!cancelled) setComplete(true);
        };
        requestAnimationFrame(tick);
      }, scoreStart));
      timeouts.push(setTimeout(() => { if (!cancelled) run(); }, scoreStart + 1500 + 4000));
    };

    run();
    return () => { cancelled = true; timeouts.forEach(clearTimeout); };
  }, [reduceMotion]);

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="mt-4 rounded-lg bg-zinc-800 p-3">
      <div className="space-y-1.5">
        {fields.slice(0, visible).map((f) => (
          <div key={f.label} className="flex justify-between text-xs">
            <span className="text-zinc-500">{f.label}</span>
            <span className="text-white">{f.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="relative h-12 w-12">
          <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
            <circle cx="22" cy="22" r={radius} fill="none" stroke="#27272a" strokeWidth="4" />
            <circle
              cx="22" cy="22" r={radius} fill="none" stroke="#22c55e" strokeWidth="4"
              strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{score}/100</span>
        </div>
        {complete && (
          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-semibold text-green-400">
            ✓ Dossier complet
          </span>
        )}
      </div>
    </div>
  );
}

function KpiDemo({ reduceMotion }: { reduceMotion: boolean }) {
  const metrics = [
    { label: 'CA ce mois', target: 24500, suffix: ' €', trend: '+12%' },
    { label: 'Taux conversion', target: 67, suffix: ' %' },
    { label: 'Dossiers traités', target: 43, suffix: '' },
    { label: 'Panier moyen', target: 3200, suffix: ' €' },
  ];
  const [values, setValues] = useState(reduceMotion ? metrics.map((m) => m.target) : metrics.map(() => 0));
  const [dashOffset, setDashOffset] = useState(reduceMotion ? 0 : 200);

  useEffect(() => {
    if (reduceMotion) return;
    const duration = 1500;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValues(metrics.map((m) => Math.round(m.target * eased)));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const timeout = setTimeout(() => setDashOffset(0), 50);
    return () => { cancelAnimationFrame(raf); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const points = [10, 25, 18, 30, 22, 38];
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * 20} ${40 - p}`).join(' ');

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m, i) => (
          <div key={m.label} className="rounded-lg bg-zinc-800 p-2">
            <p className="text-[10px] text-zinc-500">{m.label}</p>
            <p className="text-sm font-bold text-white">
              {fmtNum(values[i])}{m.suffix}
              {m.trend && <span className="ml-1 text-[10px] font-semibold text-green-500">↑ {m.trend}</span>}
            </p>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 100 40" className="mt-3 h-12 w-full">
        <path
          d={path} fill="none" stroke="#22c55e" strokeWidth="2"
          strokeDasharray="200" strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
      </svg>
    </div>
  );
}

function DossierReceivedCard({ reduceMotion }: { reduceMotion: boolean }) {
  const [visible, setVisible] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setVisible(false);
      timeouts.push(setTimeout(() => { if (!cancelled) setVisible(true); }, 50));
      timeouts.push(setTimeout(() => { if (!cancelled) run(); }, 3000));
    };

    run();
    return () => { cancelled = true; timeouts.forEach(clearTimeout); };
  }, [reduceMotion]);

  return (
    <div
      className={`mb-5 rounded-xl border border-green-500/25 bg-zinc-900 p-3.5 transition-[opacity,transform] duration-[600ms] ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Dossier reçu</p>
      <p className="mt-2 text-sm font-semibold text-white">Marie Leroy</p>
      <p className="text-sm text-zinc-400">Rénovation SDB · 8 000–12 000€</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-green-500 px-2.5 py-1 text-xs font-bold text-zinc-950">Score 94%</span>
        <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">🟢 Prospect chaud</span>
      </div>
    </div>
  );
}

const featureDemos = [
  WebChatDemo,
  VoiceAssistantDemo,
  KanbanDemo,
  PrioritisationDemo,
  DossierDemo,
  KpiDemo,
];

export function LandingRoutePage() {
  useScrollReveal();
  const reduceMotion = usePrefersReducedMotion();
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [activeMetier, setActiveMetier] = useState<string | null>(TRADES_DATA[0].id);
  const [metierCardVisible, setMetierCardVisible] = useState(true);
  const displayTrade = TRADES_DATA.find((m) => m.id === activeMetier);

  useEffect(() => {
    if (activeMetier) {
      setMetierCardVisible(false);
      const timeout = setTimeout(() => setMetierCardVisible(true), 20);
      return () => clearTimeout(timeout);
    }
  }, [activeMetier]);

  const [activeToolsCard, setActiveToolsCard] = useState(0);
  const [toolsCarouselPaused, setToolsCarouselPaused] = useState(false);

  useEffect(() => {
    if (toolsCarouselPaused) return;
    const interval = setInterval(() => {
      setActiveToolsCard((c) => (c + 1) % REPLACE_TOOLS_CARDS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [toolsCarouselPaused]);

  const avant = [
    'Appels manqués sur chantier — vos prospects rappellent un concurrent.',
    'Demandes sans informations : « Je voudrais un devis », sans surface ni budget.',
    'Relances oubliées — 70% des prospects non rappelés sous 24h signent ailleurs.',
    'Qualification chronophage : 5 allers-retours pour obtenir l\'essentiel.',
    'Chaque demande non traitée est un chantier qui part chez un concurrent.',
  ];

  const missedNotifs = [
    { icon: '📞', text: 'Appel manqué · il y a 2h', rotate: -1.5 },
    { icon: '📞', text: 'Appel manqué · il y a 5h', rotate: 0.5 },
    { icon: '💬', text: 'Message sans réponse · 3 jours', rotate: -0.8 },
  ];

  const apres = [
    'Disponible 24h/24, 7j/7, par chat et par téléphone.',
    'Questions adaptées à votre métier, posées automatiquement.',
    'Photos, adresse et budget collectés sans effort.',
    'Dossier créé, scoré et priorisé instantanément.',
    'Relances et calendrier intégrés au dashboard.',
  ];

  const waveBars = [
    'h-[40%] [animation-delay:0ms]',
    'h-[70%] [animation-delay:100ms]',
    'h-[100%] [animation-delay:200ms]',
    'h-[55%] [animation-delay:300ms]',
    'h-[85%] [animation-delay:400ms]',
    'h-[35%] [animation-delay:500ms]',
    'h-[60%] [animation-delay:600ms]',
  ];

  const pipelinePreview = [
    { label: 'Nouveau', color: 'bg-blue-500', width: 'w-[70%]' },
    { label: 'Qualifié', color: 'bg-green-500', width: 'w-[50%]' },
    { label: 'Gagné', color: 'bg-emerald-400', width: 'w-[30%]' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <style>{ANIMATION_STYLES}</style>

      {/* 1. NAV */}
      <DarkNav />

      <main>
        {/* 2. HERO */}
        <section className="relative flex min-h-[100dvh] w-full items-center overflow-hidden bg-zinc-950 pt-[88px]">
          {/* Three.js background — desktop uniquement */}
          <div className="hidden md:block">
            <DottedSurface
              className="absolute inset-0 opacity-60"
              style={{ zIndex: 0, pointerEvents: 'none' }}
            />
          </div>

          {/* Gradient overlay pour lisibilité du texte */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background: 'radial-gradient(ellipse 70% 50% at 50% 100%, transparent 40%, #09090b 80%)',
            }}
          />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(34,197,94,0.12)_0%,transparent_65%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_70%_50%,rgba(34,197,94,0.08)_0%,transparent_60%)]" />
          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 px-6 py-20 lg:px-12 md:grid-cols-2 md:items-center">
            <div>
              <h1 className="kr-reveal kr-reveal-delay-1 text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-tight">
                Transformez chaque demande en{' '}
                <span className="kr-gradient-text">chantier qualifié.</span>
              </h1>
              <p className="kr-reveal kr-reveal-delay-2 mt-6 max-w-xl text-lg leading-7 text-zinc-400">
                Kadria qualifie vos prospects 24h/24 — par téléphone et sur votre site.
                Chaque conversation devient un dossier complet, scoré et prêt à être chiffré.
              </p>
              <div className="kr-reveal kr-reveal-delay-3 mt-8">
                <Link
                  href="/demo"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-6 py-3 text-sm font-semibold text-black transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-green-400"
                >
                  Tester Kadria <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="kr-reveal kr-reveal-delay-4 mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-400">
                {[
                  'Mise en place rapide',
                  'Sans changement de numéro',
                  'Compatibilité web et téléphone',
                  'Support inclus',
                ].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="kr-reveal kr-reveal-right rounded-xl shadow-[0_0_60px_rgba(34,197,94,0.08)]">
              <QualificationShowcase />
            </div>
          </div>
        </section>

        {/* 3. SOCIAL PROOF */}
        <section className="w-full border-y border-zinc-800 bg-zinc-900 py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="kr-reveal text-xs font-semibold uppercase tracking-widest text-green-500">Résultats</p>
              <h2 className="kr-reveal kr-reveal-delay-1 mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">
                Ce que Kadria change concrètement
              </h2>
            </div>
            <MetricsGrid />
          </div>
        </section>

        {/* 4. PROBLEME -> SOLUTION */}
        <section className="w-full bg-zinc-950 py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="kr-reveal kr-reveal-delay-1 text-3xl font-bold tracking-tight md:text-5xl">
                De la demande perdue au <span className="kr-gradient-text">chantier qualifié.</span>
              </h2>
              <p className="kr-reveal kr-reveal-delay-2 mt-5 text-base leading-7 text-zinc-400 md:text-lg">
                Sans système de qualification automatique, une partie de vos demandes ne se transforme jamais en chantier.
              </p>
            </div>
            <div className="relative mt-12 grid items-stretch gap-8 lg:grid-cols-2">
              {/* Flèche centrale */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 lg:flex">
                <ArrowRight size={20} className="text-green-500" />
              </div>

              {/* AVANT KADRIA */}
              <div className="kr-reveal kr-reveal-left flex flex-col overflow-hidden rounded-xl border border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.03)]">
                <div className="flex items-center gap-3 border-b border-[rgba(220,38,38,0.15)] bg-[rgba(220,38,38,0.06)] px-6 py-4">
                  <AlertTriangle size={18} className="text-[#dc2626]" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626]">Avant Kadria</p>
                    <p className="text-sm text-zinc-400">Sans qualification automatique</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-8">
                  <div className="mb-5 space-y-2">
                    {missedNotifs.map((n) => (
                      <div
                        key={n.text}
                        style={{ transform: `rotate(${n.rotate}deg)` }}
                        className="rounded-[10px] border border-[rgba(220,38,38,0.15)] bg-[rgba(220,38,38,0.06)] px-3.5 py-2.5 text-sm text-zinc-300"
                      >
                        {n.icon} {n.text}
                      </div>
                    ))}
                  </div>
                  <ul className="space-y-4">
                    {avant.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm leading-6 text-zinc-400">
                        <XCircle size={15} className="mt-0.5 flex-shrink-0 text-[#dc2626]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 rounded-[10px] bg-[rgba(220,38,38,0.06)] px-4 py-3">
                    <p className="text-sm font-medium text-[#dc2626]">
                      70% des prospects non rappelés sous 24h signent chez un concurrent
                    </p>
                  </div>
                </div>
              </div>

              {/* AVEC KADRIA */}
              <div className="kr-reveal kr-reveal-right flex flex-col overflow-hidden rounded-xl border border-green-500/25 bg-[rgba(34,197,94,0.02)]">
                <div className="flex items-center gap-3 border-b border-green-500/25 bg-[rgba(34,197,94,0.06)] px-6 py-4">
                  <CheckCircle size={18} className="text-green-500" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-green-500">Avec Kadria</p>
                    <p className="text-sm text-zinc-400">Qualification automatique 24h/24</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-8">
                  <DossierReceivedCard reduceMotion={reduceMotion} />
                  <ul className="space-y-4">
                    {apres.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm font-medium leading-6 text-zinc-200">
                        <CheckCircle size={15} className="mt-0.5 flex-shrink-0 text-green-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 rounded-[10px] bg-[rgba(34,197,94,0.06)] px-4 py-3">
                    <p className="text-sm font-medium text-green-500">
                      &lt; 3 minutes pour recevoir un dossier complet et qualifié
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. REMPLACE 12 OUTILS */}
        <section className="kr-tools-section relative w-full border-b border-t border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-24">
          <div className="relative mx-auto max-w-6xl">
            <div className="flex justify-center">
              <span className="kr-reveal rounded-full border border-[var(--accent-border)] bg-[rgba(34,197,94,0.08)] px-4 py-1 text-xs font-bold text-[var(--accent)]">
                KADRIA PRO
              </span>
            </div>
            <h2 className="kr-reveal kr-reveal-delay-1 mt-4 text-center font-black tracking-[-0.02em] text-[clamp(2.2rem,5vw,3.8rem)]">
              Remplacez jusqu&apos;à 12 outils.
              <br />
              Pilotez tout depuis <span className="text-[var(--accent)]">un seul tableau de bord.</span>
            </h2>
            <p className="kr-reveal kr-reveal-delay-2 mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-[var(--text-2)]">
              Capturez vos demandes, qualifiez vos prospects, gérez vos devis et pilotez votre activité depuis un
              seul tableau de bord.
            </p>

            <div
              className="relative mt-16 flex min-h-[720px] items-center justify-center md:min-h-[480px]"
              onMouseEnter={() => setToolsCarouselPaused(true)}
              onMouseLeave={() => setToolsCarouselPaused(false)}
            >
              {REPLACE_TOOLS_CARDS.map((card, i) => {
                const total = REPLACE_TOOLS_CARDS.length;
                let diff = i - activeToolsCard;
                if (diff > total / 2) diff -= total;
                if (diff < -total / 2) diff += total;
                if (Math.abs(diff) > 1) return null;
                const isActive = diff === 0;
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    data-position={isActive ? 'active' : 'side'}
                    className={`kr-tools-card kr-tools-card-grid grid grid-cols-2 ${
                      isActive && !reduceMotion ? 'carousel-card-float' : ''
                    }`}
                    style={{
                      transform: `translateX(${diff * 340}px) scale(${isActive ? 1 : 0.75})`,
                      opacity: isActive ? 1 : 0.35,
                      filter: isActive ? 'none' : 'blur(2px)',
                      zIndex: isActive ? 10 : 0,
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 -z-10 rounded-[24px]"
                      style={{ boxShadow: `0 0 80px ${card.glow}` }}
                    />
                    {/* GAUCHE */}
                    <div className="flex flex-col p-9">
                      <div
                        className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px]"
                        style={{ background: card.iconBg, border: `1px solid ${card.iconBorder}` }}
                      >
                        <Icon size={24} style={{ color: card.color }} />
                      </div>
                      <span className="mt-5 text-xs font-bold" style={{ color: card.color }}>
                        {card.number}
                      </span>
                      <h3 className="mt-2 text-[22px] font-extrabold">{card.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-[var(--text-2)]">{card.description}</p>
                      <div className="mt-5 flex flex-col gap-2">
                        {card.features.map((f) => (
                          <div key={f} className="flex items-start gap-2 text-sm">
                            <CheckCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color: card.color }} />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* DROITE */}
                    <div className="flex flex-col border-l border-[rgba(255,255,255,0.06)] p-7">
                      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[var(--text-3)]">
                        Remplace
                      </p>
                      <div className="flex flex-col gap-3">
                        {card.tools.map((tool) => {
                          const ToolIcon = tool.icon;
                          return (
                            <div
                              key={tool.name}
                              className="flex items-center gap-3 rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3.5 py-2.5"
                            >
                              <ToolIcon size={16} style={{ color: tool.color }} className="flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold">{tool.name}</p>
                                <p className="text-xs text-[var(--text-2)]">{tool.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div
                        className="mt-auto w-fit rounded-full px-3 py-1 text-xs font-bold"
                        style={{ background: card.badgeBg, border: `1px solid ${card.badgeBorder}`, color: card.color }}
                      >
                        {card.badge}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                aria-label="Carte précédente"
                onClick={() =>
                  setActiveToolsCard((c) => (c - 1 + REPLACE_TOOLS_CARDS.length) % REPLACE_TOOLS_CARDS.length)
                }
                className="kr-tools-nav-btn absolute left-4 z-20 flex h-12 w-12 items-center justify-center rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Carte suivante"
                onClick={() => setActiveToolsCard((c) => (c + 1) % REPLACE_TOOLS_CARDS.length)}
                className="kr-tools-nav-btn absolute right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="mt-8 flex justify-center gap-2">
              {REPLACE_TOOLS_CARDS.map((card, i) => (
                <button
                  key={card.title}
                  type="button"
                  aria-label={`Voir la carte ${card.number}`}
                  aria-current={i === activeToolsCard}
                  onClick={() => setActiveToolsCard(i)}
                  className="flex items-center justify-center p-2"
                >
                  <span className={`kr-tools-dot block ${i === activeToolsCard ? 'kr-tools-dot-active' : ''}`} />
                </button>
              ))}
            </div>

            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-6 py-8 md:grid-cols-3 md:items-center md:px-10">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)]">
                  <Layers size={24} className="text-[var(--accent)]" />
                </div>
                <p className="mt-3 text-4xl font-black text-[var(--accent)]">12</p>
                <p className="text-sm text-[var(--text-2)]">outils remplacés</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {REPLACED_TOOL_ICONS.map((ToolIcon, i) => (
                  <div
                    key={i}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] p-2 text-[var(--text-3)]"
                  >
                    <ToolIcon size={20} />
                  </div>
                ))}
                <ArrowRight size={20} className="mx-4 text-[var(--accent)]" />
                <span className="rounded-[10px] border border-[var(--accent-border)] bg-[rgba(34,197,94,0.1)] px-4 py-2 text-lg font-black text-[var(--accent)]">
                  KADRIA
                </span>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-[var(--text-1)]">1</p>
                <p className="text-sm text-[var(--text-2)]">seule plateforme</p>
                <p className="mt-1 text-xs font-semibold text-[var(--accent)]">Tout est connecté.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. FEATURES — BENTO GRID */}
        <section className="relative w-full overflow-hidden bg-zinc-950 py-24">
          <div
            className="pointer-events-none absolute -left-24 -top-24 -z-0 h-[400px] w-[400px] rounded-full"
            style={{ background: 'rgba(34,197,94,0.04)', filter: 'blur(80px)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -right-24 -z-0 h-[400px] w-[400px] rounded-full"
            style={{ background: 'rgba(96,165,250,0.04)', filter: 'blur(80px)' }}
          />
          <div className="relative mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="kr-reveal text-xs font-semibold uppercase tracking-widest text-green-500">Fonctionnalités</p>
              <h2 className="kr-reveal kr-reveal-delay-1 mt-4 text-3xl font-bold tracking-tight md:text-5xl">
                Tout ce qu&apos;il faut pour <span className="kr-gradient-text">ne plus rien perdre.</span>
              </h2>
            </div>
            <div className="kr-bento mt-12">
              {features.map((f, i) => {
                const Icon = f.icon;
                const isActive = activeFeature === f.title;
                const sizeClass = isActive
                  ? 'col-span-4 row-span-3 md:col-span-4'
                  : i === 0
                  ? 'col-span-4 row-span-2 md:col-span-2'
                  : i === 1
                  ? 'col-span-4 row-span-1 md:col-span-2'
                  : i === 2 || i === 3
                  ? 'col-span-2 row-span-1 md:col-span-1'
                  : 'col-span-4 row-span-1 md:col-span-2';
                const DemoComponent = featureDemos[i];
                return (
                  <div
                    key={f.title}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveFeature((prev) => (prev === f.title ? null : f.title))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveFeature((prev) => (prev === f.title ? null : f.title));
                      }
                    }}
                    aria-expanded={isActive}
                    style={{ '--glow-color': FEATURE_GLOW[i].glow } as CSSProperties}
                    className={`kr-glass-bento kr-bento-item ${sizeClass} flex cursor-pointer flex-col justify-between overflow-visible rounded-xl p-6 text-left`}
                  >
                    {i === 0 ? (
                      <AssistantWebChatCard reduceMotion={reduceMotion} />
                    ) : isActive ? (
                      <FadeIn>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveFeature(null); }}
                          aria-label="Fermer la démo"
                          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div
                          className="inline-flex w-fit rounded-[10px] p-2.5"
                          style={{ background: FEATURE_GLOW[i].iconBg, border: `1px solid ${FEATURE_GLOW[i].iconBorder}` }}
                        >
                          <Icon size={28} style={{ color: FEATURE_GLOW[i].iconColor }} />
                        </div>
                        <h3 className="mt-4 text-base font-bold">{f.title}</h3>
                        <DemoComponent reduceMotion={reduceMotion} />
                      </FadeIn>
                    ) : (
                      <>
                        <div
                          className="inline-flex w-fit rounded-[10px] p-2.5"
                          style={{ background: FEATURE_GLOW[i].iconBg, border: `1px solid ${FEATURE_GLOW[i].iconBorder}` }}
                        >
                          <Icon size={28} style={{ color: FEATURE_GLOW[i].iconColor }} />
                        </div>
                        <div>
                          <h3 className="mt-4 text-base font-bold">{f.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-zinc-400">{f.text}</p>

                          {i === 1 && (
                            <div className="mt-4 flex h-10 items-end gap-1.5">
                              {waveBars.map((bar, idx) => (
                                <div key={idx} className={`kr-wave w-1.5 rounded-full bg-green-500/60 ${bar}`} />
                              ))}
                            </div>
                          )}

                          {i === 2 && (
                            <div className="mt-4 space-y-2">
                              {pipelinePreview.map((row) => (
                                <div key={row.label}>
                                  <p className="mb-1 text-[10px] text-zinc-500">{row.label}</p>
                                  <div className="h-1.5 w-full rounded-full bg-zinc-800">
                                    <div className={`h-1.5 rounded-full ${row.color} ${row.width}`} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* DASHBOARD PREVIEW */}
        <section className="w-full bg-zinc-900 py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="kr-reveal text-xs font-semibold uppercase tracking-widest text-green-500">Dashboard</p>
              <h2 className="kr-reveal kr-reveal-delay-1 mt-4 text-3xl font-bold tracking-tight md:text-5xl">
                4 fonctionnalités clés,{' '}
                <span className="kr-gradient-text">révélées en toute fluidité</span>
              </h2>
              <p className="kr-reveal kr-reveal-delay-2 mt-5 text-base leading-7 text-zinc-400 md:text-lg">
                Une expérience moderne et interactive pour piloter votre activité depuis un seul tableau de bord.
              </p>
            </div>
            <div className="kr-reveal kr-reveal-scale kr-reveal-delay-2 mx-auto mt-12 max-w-6xl">
              <DashboardCarousel />
            </div>
          </div>
        </section>

        {/* SIMULATEUR */}
        <SimulateurSection />

        {/* METIERS */}
        <section id="metiers" className="w-full bg-zinc-900 py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="kr-reveal text-3xl font-bold tracking-tight md:text-5xl">Kadria parle le même langage que vous</h2>
              <p className="kr-reveal kr-reveal-delay-1 mt-5 text-base leading-7 text-zinc-400 md:text-lg">
                Chaque métier a ses questions, son vocabulaire, ses chantiers. Kadria s&apos;adapte.
              </p>
            </div>
            <div className="kr-reveal kr-reveal-delay-2 mt-10 flex flex-wrap justify-center gap-3">
              {TRADES_DATA.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMetier((prev) => (prev === m.id ? null : m.id))}
                  className={`w-28 cursor-pointer rounded-xl border px-4 py-3 text-center transition-colors ${
                    activeMetier === m.id
                      ? 'border-green-500/25 bg-green-500/[0.08] text-green-500'
                      : 'border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  <div className="mb-2 text-2xl">{m.emoji}</div>
                  <div className="text-sm">{m.label}</div>
                </button>
              ))}
            </div>

            {activeMetier && displayTrade && (
              <div
                className={`mt-6 rounded-2xl border border-zinc-700 bg-zinc-800 p-8 transition-all duration-[250ms] ease-out ${
                  metierCardVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                }`}
              >
                <h3 className="text-xl font-semibold text-white">
                  {displayTrade.emoji} {displayTrade.label}
                </h3>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-zinc-900/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Types de projets
                    </p>
                    <p className="mt-2 text-sm text-white">{displayTrade.types}</p>
                  </div>

                  <div className="rounded-lg bg-zinc-900/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Questions posées par Kadria
                    </p>
                    <p className="mt-2 text-sm text-white">{displayTrade.questions}</p>
                  </div>

                  <div className="rounded-xl border border-green-500/25 bg-green-500/[0.08] p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-green-500">
                      Résultat
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      ✅ {displayTrade.resultat}
                    </p>
                  </div>
                </div>

                <Link
                  href="/demo"
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-green-500 transition-colors hover:bg-green-500/10"
                >
                  Voir un exemple de conversation →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* PROGRAMME LANCEMENT */}
        <section className="w-full bg-zinc-950 py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="kr-reveal kr-glass rounded-xl p-8 md:p-12">
              <span className="kr-badge-pulse inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-green-400">
                Programme de lancement
              </span>
              <h2 className="kr-reveal kr-reveal-delay-1 mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                Programme de lancement <span className="text-green-500">Kadria</span>
              </h2>
              <p className="kr-reveal kr-reveal-delay-2 mt-5 max-w-2xl text-base leading-7 text-zinc-400">
                Kadria est en cours de déploiement auprès d un nombre limité d artisans et d entreprises du bâtiment.
                Les premiers partenaires bénéficient d un accompagnement personnalisé pour configurer leur assistant,
                connecter leur site et leur ligne téléphonique, et adapter Kadria à leur métier.
              </p>
              <p className="kr-reveal kr-reveal-delay-2 mt-5 max-w-2xl text-base font-semibold leading-7 text-white">
                Vous souhaitez faire partie des premiers professionnels à tester Kadria ?
              </p>
              <p className="kr-reveal kr-reveal-delay-3 mt-6 flex items-center gap-2 text-sm text-zinc-400">
                <span className="kr-badge-pulse inline-block h-2 w-2 rounded-full bg-green-500" />
                12 artisans déjà partenaires · 8 places restantes
              </p>
              <Link
                href="/onboarding"
                className="kr-reveal kr-reveal-delay-3 mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-green-500 px-5 py-2.5 text-sm font-semibold text-black transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-green-400"
              >
                Rejoindre les premiers artisans Kadria <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="kr-reveal kr-reveal-delay-3 mt-3 text-sm text-zinc-400">
                Places limitées · Accompagnement personnalisé inclus
              </p>
            </div>
          </div>
        </section>

        {/* 6. TARIFS */}
        <section className="w-full bg-zinc-900 py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="kr-reveal text-xs font-semibold uppercase tracking-widest text-green-500">Tarifs</p>
              <h2 className="kr-reveal kr-reveal-delay-1 mt-4 text-3xl font-bold tracking-tight md:text-5xl">
                Un tarif simple, <span className="kr-gradient-text">adapté à votre activité.</span>
              </h2>
            </div>
            <div className="mt-12 grid items-center gap-4 md:grid-cols-3">
              {plans.map((plan, i) => (
                <div
                  key={plan.slug}
                  className={`kr-reveal kr-reveal-scale kr-reveal-delay-${i + 1} kr-card-hover rounded-xl border p-6 ${
                    plan.highlighted
                      ? 'border-green-500/40 bg-green-500/5 shadow-[0_0_40px_rgba(34,197,94,0.08)] lg:scale-[1.02]'
                      : 'border-zinc-700 bg-zinc-800'
                  }`}
                >
                  {plan.highlighted && (
                    <span className="kr-badge-pulse inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-green-400">
                      Populaire
                    </span>
                  )}
                  <h3 className="mt-3 text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-2xl font-bold">
                    {plan.price}
                    {plan.price !== 'Sur devis' && <span className="text-sm font-normal text-zinc-400"> / mois</span>}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{plan.description}</p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feat) => (
                      <li key={feat.text} className="flex items-start gap-2 text-sm leading-6 text-zinc-400">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                        <span>
                          {feat.text}
                          {feat.badge && (
                            <span className="ml-2 inline-flex items-center rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)] px-2 py-0.5 text-xs font-semibold text-[#f59e0b]">
                              {feat.badge}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="kr-reveal kr-reveal-delay-2 mt-8 text-center text-sm text-green-500">
              <Link href="/tarifs#addon" className="hover:underline">
                ➕ Site vitrine clé en main — +50€/mois avec Performance
              </Link>
            </p>
            <p className="kr-reveal kr-reveal-delay-2 mt-4 text-center text-sm text-zinc-400">
              ✓ Sans engagement&nbsp;&nbsp;·&nbsp;&nbsp;✓ Résiliation à tout moment&nbsp;&nbsp;·&nbsp;&nbsp;✓ Support inclus dès le premier jour
            </p>
            <Link href="/tarifs" className="mt-6 block text-center text-sm text-green-500 hover:underline">
              Voir le détail complet des tarifs →
            </Link>
          </div>
        </section>

        {/* 7. CTA FINAL */}
        <section className="relative w-full overflow-hidden border-y border-zinc-800 bg-zinc-900 px-6 py-24">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(34,197,94,0.06)_0%,transparent_70%)]" />
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <p className="kr-reveal text-xs font-semibold uppercase tracking-widest text-green-500">
              Programme de lancement
            </p>
            <h2 className="kr-reveal kr-reveal-delay-1 mb-4 mt-4 text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight">
              Rejoignez les premiers artisans Kadria
            </h2>
            <p className="kr-reveal kr-reveal-delay-2 mx-auto mb-8 max-w-xl text-lg leading-7 text-zinc-400">
              Kadria qualifie vos prospects 24h/24, répond à vos appels et remplit votre dashboard — pendant que vous
              êtes sur le chantier.
            </p>
            <Link
              href="/register"
              className="kr-reveal kr-reveal-delay-3 kr-badge-pulse inline-flex items-center gap-2 rounded-xl bg-green-500 px-10 py-4 text-lg font-bold text-zinc-950 transition-all duration-200 hover:scale-[1.02] hover:opacity-90"
            >
              Tester Kadria gratuitement <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="kr-reveal kr-reveal-delay-3 mt-5 text-sm text-zinc-400">
              ✓ Sans engagement · ✓ Résiliation à tout moment · ✓ Support inclus dès J1
            </p>
            <div className="kr-reveal kr-reveal-delay-3 mt-6 flex items-center justify-center">
              <div className="flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-600 text-xs font-semibold text-white">
                  JM
                </span>
                <span className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-700 text-xs font-semibold text-white">
                  SC
                </span>
                <span className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-600 text-xs font-semibold text-white">
                  PB
                </span>
                <span className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-700 text-xs font-semibold text-white">
                  AL
                </span>
              </div>
              <span className="ml-3 text-sm text-zinc-400">12 artisans nous font déjà confiance</span>
            </div>
          </div>
        </section>
      </main>

      {/* 8. FOOTER */}
      <DarkFooter />
    </div>
  );
}

function DarkFooter() {
  return (
    <footer>
      {/* ZONE 1 — PRINCIPALE */}
      <div className="border-t border-zinc-800 py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-12">
          {/* Colonne 1 — Brand */}
          <div>
            <Link href="/" className="text-lg font-bold text-white">
              <KadriaLogo size="md" noLink />
            </Link>
            <p className="mt-3 max-w-[200px] text-sm text-zinc-400">
              L&apos;assistant qui transforme vos appels en chantiers qualifiés.
            </p>
            <div className="mt-5 flex items-center gap-4">
              <Link href="#" aria-label="LinkedIn" className="text-zinc-400 transition-colors hover:text-white">
                <Globe size={18} />
              </Link>
              <Link href="#" aria-label="Twitter / X" className="text-zinc-400 transition-colors hover:text-white">
                <X size={18} />
              </Link>
            </div>
          </div>

          {/* Colonne 2 — Produit */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Produit</p>
            <div className="flex flex-col gap-3">
              <Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-white">Fonctionnalités</Link>
              <Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-white">Tarifs</Link>
              <Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-white">Démo</Link>
              <Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-white">Assistant vocal</Link>
              <Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-white">CRM</Link>
            </div>
          </div>

          {/* Colonne 3 — Ressources */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Ressources</p>
            <div className="flex flex-col gap-3">
              <Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-white">Comment ça marche</Link>
              <Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-white">Par métier</Link>
              <Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-white">Blog</Link>
              <Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-white">Support</Link>
            </div>
          </div>

          {/* Colonne 4 — Contact */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Contact</p>
            <Link href="#" className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white">
              <Mail size={14} />
              contact@kadria.fr
            </Link>
            <p className="mt-2 text-xs text-zinc-400">Réponse sous 24h</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="kr-badge-pulse inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">
                🟢 Disponible
              </span>
              <span className="text-sm text-zinc-400">Onboarding ouvert</span>
            </div>
          </div>
        </div>
      </div>

      {/* ZONE 2 — BARRE LÉGALE */}
      <div className="border-t border-zinc-800 py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 lg:px-12">
          <p className="text-sm text-zinc-400">© 2025 Kadria. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-white">Mentions légales</Link>
            <Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-white">Politique de confidentialité</Link>
            <Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-white">CGU</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function FeaturesRoutePage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-32">
        <SectionTitle
          eyebrow="Fonctionnalites"
          title="Tout ce dont un artisan a besoin pour ne plus perdre de prospects."
          text="Qualification automatique, appels, dashboard projets, suivi commercial et reporting dans une experience coherente."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="card-premium p-6">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </PageShell>
  );
}

interface PricingFeature {
  text: string;
  badge?: string;
}

interface PricingPlanCard {
  slug: string;
  name: string;
  price: string;
  priceSize: string;
  period: string;
  description: string;
  features: PricingFeature[];
  highlighted: boolean;
  cta: { label: string; href: string; primary: boolean };
}

const pricingPlanCards: PricingPlanCard[] = [
  {
    slug: 'essentiel',
    name: 'Essentiel',
    price: '149€',
    priceSize: 'text-5xl',
    period: '/mois',
    description: 'Pour démarrer et ne plus manquer de demandes web',
    features: [
      { text: 'Assistant chat web 24h/24' },
      { text: 'Qualification IA + score dossier' },
      { text: 'Résumé IA + recommandation par dossier' },
      { text: 'CRM vue liste' },
      { text: 'Filtres simples (statut, métier)' },
      { text: '50 dossiers / mois' },
      { text: 'KPI essentiels' },
      { text: 'Export CSV' },
      { text: 'Support email' },
      { text: '1 utilisateur' },
    ],
    highlighted: false,
    cta: { label: "Commencer l'essai gratuit", href: '/register', primary: true },
  },
  {
    slug: 'performance',
    name: 'Performance',
    price: '249€',
    priceSize: 'text-5xl',
    period: '/mois',
    description: 'Pour ne plus perdre aucune opportunité',
    features: [
      { text: 'Tout Essentiel inclus' },
      { text: 'Dossiers illimités' },
      { text: 'Vue Kanban' },
      { text: 'Filtres avancés (budget, score IA, période, source)' },
      { text: 'KPI avancés avec tendances et sparkline' },
      { text: 'Top 3 opportunités scorées par IA' },
      { text: 'Pipeline commercial' },
      { text: 'Chantiers géolocalisés' },
      { text: 'Calendrier + rappels' },
      { text: 'Export PDF dossiers' },
      { text: 'Génération de devis professionnels' },
      { text: 'Relances planifiables' },
      { text: 'Assistant vocal', badge: 'Bientôt disponible' },
      { text: 'Relances automatiques', badge: 'Bientôt disponible' },
      { text: 'Support prioritaire' },
      { text: '1 utilisateur' },
    ],
    highlighted: true,
    cta: { label: "Commencer l'essai gratuit", href: '/register', primary: true },
  },
  {
    slug: 'agence',
    name: 'Agence',
    price: 'Sur devis',
    priceSize: 'text-[28px]',
    period: '',
    description: "Pour les groupements d'artisans et réseaux",
    features: [
      { text: 'Tout Performance inclus' },
      { text: "Jusqu'à 10 artisans" },
      { text: 'Dashboard multi-comptes' },
      { text: 'Marque blanche complète' },
      { text: 'API access' },
      { text: 'Account manager dédié' },
      { text: 'Onboarding personnalisé' },
      { text: 'Rapports consolidés multi-sites' },
      { text: 'Support téléphonique dédié' },
    ],
    highlighted: false,
    cta: { label: 'Nous contacter', href: '/contact', primary: false },
  },
];

const addonSiteVitrine = {
  title: '➕ Site vitrine clé en main',
  description: 'Votre site professionnel créé et intégré avec votre assistant Kadria',
  price: '+50€/mois',
  priceSub: 'avec le plan Performance',
  features: [
    'Site vitrine professionnel (template métier)',
    'Intégration automatique du widget Kadria',
    '1 modification incluse par mois',
    'Support technique site inclus',
  ],
  mention: '⚠️ Hébergement et nom de domaine non inclus (~15€/mois chez votre hébergeur)',
  cta: { label: 'Ajouter au plan Performance', href: '/contact?sujet=addon-site' },
};

const pricingGuarantees = [
  { title: 'Sans engagement', subtitle: 'Résiliez à tout moment' },
  { title: 'Essai 14 jours', subtitle: 'Sans carte bancaire' },
  { title: 'Support J+1', subtitle: 'Réponse sous 24h ouvrées' },
];

const pricingFaqQuick = [
  {
    question: 'Puis-je changer de plan ?',
    answer: 'Oui, à tout moment depuis votre espace client.',
  },
  {
    question: "L'essai gratuit inclut-il toutes les fonctionnalités ?",
    answer: 'Oui, accès complet au plan Performance pendant 14 jours.',
  },
  {
    question: "Que se passe-t-il après l'essai ?",
    answer: 'Vous choisissez votre plan ou vous arrêtez — sans frais, sans engagement.',
  },
];

type ComparatifValue = '✓' | '✗' | 'bientot' | string;

const comparatifCategories: { category: string; rows: [string, ComparatifValue, ComparatifValue, ComparatifValue][] }[] = [
  {
    category: 'Assistant IA',
    rows: [
      ['Chat web 24h/24', '✓', '✓', '✓'],
      ['Qualification automatique', '✓', '✓', '✓'],
      ['Score IA par dossier', '✓', '✓', '✓'],
      ['Résumé + recommandation', '✓', '✓', '✓'],
      ['Adaptation par métier', '✓', '✓', '✓'],
      ['Assistant vocal', '✗', 'bientot', '✓'],
    ],
  },
  {
    category: 'CRM',
    rows: [
      ['Vue liste', '✓', '✓', '✓'],
      ['Vue Kanban', '✗', '✓', '✓'],
      ['Filtres simples', '✓', '✓', '✓'],
      ['Filtres avancés', '✗', '✓', '✓'],
      ['Dossiers / mois', '50', 'Illimités', 'Illimités'],
      ['Fiches dossiers complètes', '✓', '✓', '✓'],
      ['Historique dossier', '✓', '✓', '✓'],
      ['Notes internes', '✓', '✓', '✓'],
    ],
  },
  {
    category: 'Pilotage',
    rows: [
      ['KPI essentiels', '✓', '✓', '✓'],
      ['KPI avancés + tendances', '✗', '✓', '✓'],
      ['Sparkline CA', '✗', '✓', '✓'],
      ['Top 3 opportunités IA', '✗', '✓', '✓'],
      ['Pipeline commercial', '✗', '✓', '✓'],
      ['Chantiers géolocalisés', '✗', '✓', '✓'],
    ],
  },
  {
    category: 'Actions',
    rows: [
      ['Relances manuelles', '✓', '✓', '✓'],
      ['Relances automatiques', '✗', 'bientot', '✓'],
      ['Calendrier + rappels', '✗', '✓', '✓'],
      ['Génération de devis', '✗', '✓', '✓'],
    ],
  },
  {
    category: 'Export',
    rows: [
      ['Export CSV', '✓', '✓', '✓'],
      ['Export PDF dossiers', '✗', '✓', '✓'],
      ['Rapport mensuel PDF', '✗', '✓', '✓'],
    ],
  },
  {
    category: 'Compte',
    rows: [
      ['Utilisateurs', '1', '1', '10'],
      ['Dashboard multi-comptes', '✗', '✗', '✓'],
      ['Marque blanche', '✗', '✗', '✓'],
      ['API access', '✗', '✗', '✓'],
    ],
  },
  {
    category: 'Support',
    rows: [
      ['Support email', '✓', '✓', '✓'],
      ['Support prioritaire', '✗', '✓', '✓'],
      ['Account manager', '✗', '✗', '✓'],
      ['Support téléphonique', '✗', '✗', '✓'],
    ],
  },
  {
    category: 'Add-on',
    rows: [
      ['Site vitrine clé en main', '✗', '+50€/mois', '✓'],
    ],
  },
];

function ComparatifCell({ value }: { value: ComparatifValue }) {
  if (value === '✓') return <CheckCircle size={16} className="text-green-500" />;
  if (value === '✗') return <Minus size={16} className="text-zinc-500" />;
  if (value === 'bientot') {
    return (
      <span className="inline-flex items-center rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)] px-2 py-0.5 text-xs font-semibold text-[#f59e0b]">
        Bientôt
      </span>
    );
  }
  return <span className="text-zinc-300">{value}</span>;
}

export function PricingRoutePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <DarkNav />

      <main className="px-6 pt-[100px]">
        <div className="mx-auto max-w-6xl">
          {/* HEADER */}
          <section className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-500">Tarifs</p>
            <h1 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight">
              Un tarif simple, <span className="text-green-500">adapté</span> à votre activité.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-400">
              Sans engagement. Résiliation à tout moment. Support inclus dès le premier jour.
            </p>
          </section>

          {/* GRILLE 3 PLANS */}
          <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {pricingPlanCards.map((plan) => (
              <div
                key={plan.slug}
                className={`relative flex flex-col rounded-[20px] p-8 ${
                  plan.highlighted
                    ? 'border-2 border-green-500/30 bg-zinc-900 shadow-[0_0_40px_rgba(34,197,94,0.08)] md:scale-[1.02]'
                    : 'border border-zinc-800 bg-zinc-900'
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-4 py-1 text-xs font-bold text-black">
                    LE PLUS POPULAIRE
                  </span>
                )}

                <h3 className="text-xl font-extrabold">{plan.name}</h3>

                <p className="mt-3">
                  <span className={`${plan.priceSize} font-black`}>{plan.price}</span>
                  {plan.period && <span className="text-base text-zinc-400"> {plan.period}</span>}
                </p>

                <p className="mb-6 mt-2 text-sm text-zinc-400">{plan.description}</p>

                <div className="border-t border-zinc-800" />

                <ul className="mt-5 flex flex-col gap-3">
                  {plan.features.map((feat) => (
                    <li key={feat.text} className="flex items-start gap-2 text-sm">
                      <Check size={14} className="mt-0.5 flex-shrink-0 text-green-500" />
                      <span>
                        {feat.text}
                        {feat.badge && (
                          <span className="ml-2 inline-flex items-center rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)] px-2 py-0.5 text-xs font-semibold text-[#f59e0b]">
                            {feat.badge}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-6">
                  <Link
                    href={plan.cta.href}
                    className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                      plan.cta.primary
                        ? 'bg-green-500 font-bold text-black hover:bg-green-400'
                        : 'border border-zinc-800 font-semibold text-white hover:bg-zinc-800'
                    }`}
                  >
                    {plan.cta.label}
                  </Link>
                </div>
              </div>
            ))}
          </section>

          {/* ADD-ON SITE VITRINE */}
          <section id="addon" className="mx-auto mt-8 max-w-2xl rounded-[20px] border border-green-500/30 bg-green-500/[0.03] p-8">
            <div className="flex flex-col items-start gap-8 md:flex-row md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-green-500">Add-on</p>
                <h3 className="mt-2 text-xl font-extrabold">{addonSiteVitrine.title.replace('➕ ', '')}</h3>
                <p className="mt-2 text-sm text-zinc-400">{addonSiteVitrine.description}</p>
                <p className="mt-4">
                  <span className="text-3xl font-black text-green-500">{addonSiteVitrine.price}</span>
                </p>
                <p className="text-sm text-zinc-400">{addonSiteVitrine.priceSub}</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {addonSiteVitrine.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <Check size={14} className="mt-0.5 flex-shrink-0 text-green-500" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-zinc-500">{addonSiteVitrine.mention}</p>
              </div>

              <div className="w-full md:min-w-[200px] md:w-auto">
                <Link
                  href={addonSiteVitrine.cta.href}
                  className="block w-full rounded-xl bg-green-500 px-6 py-3 text-center text-sm font-bold text-black transition-colors hover:bg-green-400"
                >
                  {addonSiteVitrine.cta.label}
                </Link>
                <p className="mt-2 text-center text-xs text-zinc-400">
                  Disponible uniquement avec Performance
                </p>
              </div>
            </div>
          </section>

          {/* GARANTIES */}
          <section className="mt-12 grid grid-cols-1 gap-6 text-center md:grid-cols-3">
            {pricingGuarantees.map((g) => (
              <div key={g.title}>
                <p className="flex items-center justify-center gap-2 font-bold">
                  <Check size={16} className="text-green-500" />
                  {g.title}
                </p>
                <p className="mt-1 text-sm text-zinc-400">{g.subtitle}</p>
              </div>
            ))}
          </section>

          {/* TABLEAU COMPARATIF */}
          <section className="mt-16">
            <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Comparez les formules</h2>
            <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-4 py-3">Fonctionnalité</th>
                    <th className="px-4 py-3">Essentiel</th>
                    <th className="px-4 py-3 text-green-500">Performance</th>
                    <th className="px-4 py-3">Agence</th>
                  </tr>
                </thead>
                <tbody>
                  {comparatifCategories.map((group) => (
                    <>
                      <tr key={group.category} className="border-t border-zinc-800 bg-zinc-950">
                        <td colSpan={4} className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest text-green-500">
                          {group.category}
                        </td>
                      </tr>
                      {group.rows.map(([feature, essentiel, performance, agence], rowIndex) => (
                        <tr
                          key={feature}
                          className={rowIndex % 2 === 1 ? 'bg-zinc-900' : 'bg-zinc-950'}
                        >
                          <td className="px-4 py-3 font-medium text-white">{feature}</td>
                          <td className="px-4 py-3"><ComparatifCell value={essentiel} /></td>
                          <td className="px-4 py-3"><ComparatifCell value={performance} /></td>
                          <td className="px-4 py-3"><ComparatifCell value={agence} /></td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* FAQ RAPIDE */}
          <section className="mx-auto mt-16 max-w-3xl pb-24">
            <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Questions fréquentes</h2>
            <div className="mt-8 space-y-6">
              {pricingFaqQuick.map((faq) => (
                <div key={faq.question} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                  <p className="font-semibold">{faq.question}</p>
                  <p className="mt-2 text-sm text-zinc-400">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* CTA FINAL */}
        <section className="border-t border-zinc-800 bg-zinc-900 py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Arrêtez de perdre des opportunités.</h2>
            <p className="mt-5 text-base leading-7 text-zinc-400 md:text-lg">
              Mettez en place Kadria en quelques jours et ne laissez plus aucune demande sans suite.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-green-400">
                Tester Kadria <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/demo-request" className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800">
                Réserver une démonstration
              </Link>
            </div>
            <Link href="/demo" className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white">
              👁 Voir un exemple de dossier
            </Link>
          </div>
        </section>
      </main>

      <DarkFooter />
    </div>
  );
}

export function DemoRoutePage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-32">
        <SectionTitle
          eyebrow="Demo"
          title="Voyez comment une demande devient un dossier chantier pret a traiter."
          text="Voici une simulation du parcours de qualification, de la premiere demande au dossier commercial."
        />
        <div className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="card-premium space-y-4 p-6">
            <ChatBubble role="Prospect">Bonjour, je voudrais refaire entierement ma salle de bain.</ChatBubble>
            <ChatBubble role="Kadria">Bien sur. Quelle est la surface, votre budget et votre delai ideal ?</ChatBubble>
            <ChatBubble role="Prospect">7 m2, entre 8 000 et 12 000 €, idealement en septembre.</ChatBubble>
            <ChatBubble role="Kadria">Parfait, je cree votre dossier avec l adresse et les coordonnees.</ChatBubble>
          </div>
          <LeadCard />
        </div>
        <div className="mt-10 text-center">
          <PrimaryLink href="/demo-dashboard">Ouvrir le dashboard demo</PrimaryLink>
        </div>
      </main>
      <ChatWidget artisanId="Artisan_demo" />
    </PageShell>
  );
}

function ChatBubble({ role, children }: { role: string; children: React.ReactNode }) {
  const isKadria = role === 'Kadria';
  return (
    <div className={`rounded-2xl border p-4 ${isKadria ? 'ml-8 border-primary/20 bg-primary/10' : 'mr-8 border-white/10 bg-white/[0.03]'}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{role}</p>
      <p className="mt-2 text-sm leading-6">{children}</p>
    </div>
  );
}

export function DemoDashboardRoutePage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-32">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Dashboard demo</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">Dossiers qualifies</h1>
            <p className="mt-4 text-muted-foreground">Exemple de pipeline commercial genere par Kadria.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <div className="rounded-lg border border-white/10 bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-muted-foreground">
              Rechercher un dossier...
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <MetricCard icon={FileText} label="Dossiers" value="3" />
          <MetricCard icon={Target} label="Score moyen" value="92 %" />
          <MetricCard icon={TrendingUp} label="CA potentiel" value="40k €" />
        </div>

        <div className="mt-8 space-y-3">
          {demoProjects.map((project) => (
            <div key={project.client} className="card-premium grid gap-4 p-5 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center">
              <div>
                <p className="font-semibold">{project.client}</p>
                <p className="text-sm text-muted-foreground">{project.project}</p>
              </div>
              <p className="text-sm text-muted-foreground">{project.city}</p>
              <p className="text-sm font-semibold">{project.budget}</p>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {project.score} %
              </span>
            </div>
          ))}
        </div>
      </main>
    </PageShell>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="card-premium p-5">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

export function CheckoutRoutePage({ plan }: { plan?: string }) {
  const planName = plans.find((item) => item.slug === plan)?.name || 'Kadria';

  return (
    <PageShell>
      <main className="mx-auto max-w-xl px-6 pb-24 pt-32 text-center">
        <div className="card-premium p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Rocket className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-bold">Souscrire a {planName}</h1>
          <p className="mt-4 text-muted-foreground">
            La page de paiement sera bientot disponible. Reservez une demonstration pour demarrer avec votre configuration.
          </p>
          <div className="mt-8 flex justify-center">
            <PrimaryLink href="/demo">Reserver une demonstration</PrimaryLink>
          </div>
        </div>
      </main>
    </PageShell>
  );
}

export function OnboardingRoutePage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-xl px-6 pb-24 pt-32 text-center">
        <div className="card-premium p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Rocket className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-bold">Bienvenue sur Kadria</h1>
          <p className="mt-4 text-muted-foreground">Votre espace sera bientot pret. Nous preparons votre configuration personnalisee.</p>
          <div className="mt-8 space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-5 text-left text-sm text-muted-foreground">
            {['Profil entreprise', 'Personnalisation assistant', 'Connexion telephone', 'Mise en ligne'].map((item, index) => (
              <p key={item}>{index + 1}. {item}</p>
            ))}
          </div>
          <div className="mt-8">
            <PrimaryLink href="/dashboard-v2">Acceder au dashboard</PrimaryLink>
          </div>
        </div>
      </main>
    </PageShell>
  );
}

export function ThankYouRoutePage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-xl px-6 pb-24 pt-32 text-center">
        <div className="card-premium p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-bold">Merci !</h1>
          <p className="mt-4 text-muted-foreground">Votre demande a bien ete prise en compte. Nous vous recontacterons rapidement pour la mise en place.</p>
          <div className="mt-8">
            <PrimaryLink href="/">Retour a l accueil</PrimaryLink>
          </div>
        </div>
      </main>
    </PageShell>
  );
}

export function AssistantRoutePage() {
  return (
    <PageShell>
      <main className="mx-auto grid max-w-[1200px] gap-8 px-6 pb-24 pt-32 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Assistant Kadria</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Testez l experience de qualification.</h1>
          <p className="mt-5 text-muted-foreground">Une interface simple pour simuler l echange entre un prospect et Kadria.</p>
        </div>
        <div className="card-premium p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-white/5 pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Kadria Assistant</p>
              <p className="text-xs text-muted-foreground">Simulation de conversation</p>
            </div>
          </div>
          <div className="space-y-4">
            <ChatBubble role="Kadria">Bonjour, quel chantier souhaitez-vous faire realiser ?</ChatBubble>
            <ChatBubble role="Prospect">Je veux refaire une salle de bain.</ChatBubble>
            <ChatBubble role="Kadria">Parfait. Je vais collecter les informations utiles pour preparer un dossier clair.</ChatBubble>
          </div>
          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
            Le module interactif complet pourra etre branche ici.
          </div>
        </div>
      </main>
    </PageShell>
  );
}

export function AdminRoutePage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-32">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Administration</p>
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Pilotage global Kadria</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">Vue de supervision pour suivre les dossiers, artisans et performances.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <MetricCard icon={FileText} label="Dossiers" value="128" />
          <MetricCard icon={MessageCircle} label="Conversations" value="342" />
          <MetricCard icon={Zap} label="Qualification" value="91 %" />
          <MetricCard icon={Sparkles} label="Automations" value="24/7" />
        </div>
      </main>
    </PageShell>
  );
}

export function SimulateurSection() {
  const [callsPerWeek, setCallsPerWeek] = useState(10)
  const [lostPercent, setLostPercent] = useState(40)
  const [avgValue, setAvgValue] = useState(3000)
  const [margin, setMargin] = useState(25)

  // Calculs — même logique que le code de référence
  const lostPerMonth = Math.round((callsPerWeek * (lostPercent / 100)) * 4.3)
  const lostRevenue = lostPerMonth * avgValue
  const lostMargin = Math.round(lostRevenue * (margin / 100))
  const kadriaMonthly = 249
  const marginPerJob = avgValue * (margin / 100)
  const breakevenJobs = marginPerJob > 0 ? Math.max(1, Math.ceil(kadriaMonthly / marginPerJob)) : 1

  const fmt = (n: number) => n.toLocaleString('fr-FR')

  const sliders = [
    {
      label: 'Demandes reçues par semaine',
      value: callsPerWeek,
      min: 1, max: 40, step: 1,
      display: `${callsPerWeek}`,
      onChange: (v: number) => setCallsPerWeek(v),
    },
    {
      label: 'Part non traitée ou mal qualifiée',
      value: lostPercent,
      min: 10, max: 80, step: 5,
      display: `${lostPercent} %`,
      onChange: (v: number) => setLostPercent(v),
    },
    {
      label: "Valeur moyenne d'un chantier",
      value: avgValue,
      min: 500, max: 20000, step: 500,
      display: `${fmt(avgValue)} €`,
      onChange: (v: number) => setAvgValue(v),
    },
    {
      label: 'Marge nette moyenne',
      value: margin,
      min: 10, max: 50, step: 5,
      display: `${margin} %`,
      onChange: (v: number) => setMargin(v),
    },
  ]

  const results = [
    {
      icon: '⚠️',
      label: 'Opportunités perdues / mois',
      value: `≈ ${lostPerMonth}`,
    },
    {
      icon: '📉',
      label: 'CA potentiel perdu / mois',
      value: `${fmt(lostRevenue)} €`,
    },
    {
      icon: '€',
      label: 'Marge perdue / mois',
      value: `${fmt(lostMargin)} €`,
    },
  ]

  return (
    <section style={{
      padding: '96px 0',
      background: '#09090b',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div className="kr-reveal" style={{ textAlign: 'center', marginBottom: '56px' }}>
          <p style={{
            color: '#22c55e', fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            margin: '0 0 12px',
          }}>
            SIMULATEUR
          </p>
          <h2 style={{
            color: 'white', fontSize: '38px', fontWeight: 800,
            margin: '0 0 12px', lineHeight: 1.2,
          }}>
            Combien de chantiers{' '}
            <span style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #86efac 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              perdez-vous
            </span>{' '}
            chaque mois ?
          </h2>
          <p style={{ color: '#71717a', fontSize: '16px', margin: 0, lineHeight: 1.6 }}>
            Ajustez les curseurs selon votre activité pour estimer
            l&apos;impact des opportunités manquées.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-2">
          {/* Sliders */}
          <div className="kr-reveal-left kr-reveal" style={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '20px',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '32px',
            height: '100%',
          }}>
            {sliders.map((slider, i) => (
              <div key={i}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}>
                  <span style={{ color: 'white', fontSize: '16px', fontWeight: 500 }}>
                    {slider.label}
                  </span>
                  <span style={{
                    color: '#22c55e', fontSize: '16px',
                    fontWeight: 700, minWidth: '80px', textAlign: 'right',
                  }}>
                    {slider.display}
                  </span>
                </div>
                <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                  {/* Track background */}
                  <div style={{
                    position: 'absolute',
                    width: '100%', height: '6px',
                    background: '#3f3f46', borderRadius: '3px',
                  }} />
                  {/* Track fill */}
                  <div style={{
                    position: 'absolute',
                    height: '6px',
                    background: '#22c55e',
                    borderRadius: '3px',
                    width: `${((slider.value - slider.min) / (slider.max - slider.min)) * 100}%`,
                  }} />
                  {/* Input range */}
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={slider.value}
                    onChange={e => slider.onChange(Number(e.target.value))}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      margin: 0,
                      padding: 0,
                      height: '20px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Results */}
          <div className="kr-reveal-right kr-reveal" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {results.map((result, i) => (
              <div key={i} style={{
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(239,68,68,0.1)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '16px',
                  flexShrink: 0,
                }}>
                  {result.icon}
                </div>
                <div>
                  <p style={{ color: '#71717a', fontSize: '11px', margin: '0 0 2px' }}>
                    {result.label}
                  </p>
                  <p style={{
                    color: i === 0 ? '#f59e0b' : i === 1 ? '#dc2626' : 'white',
                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                    fontWeight: 800,
                    margin: 0,
                    transition: 'color 0.3s ease',
                  }}>
                    {result.value}
                  </p>
                </div>
              </div>
            ))}

            {/* Card Abonnement Kadria */}
            <div style={{
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '14px',
              padding: '20px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                gap: '8px', marginBottom: '8px',
              }}>
                <span style={{ color: '#22c55e', fontSize: '16px' }}>✓</span>
                <span style={{
                  color: 'white', fontSize: '13px', fontWeight: 600,
                }}>
                  Abonnement Kadria
                </span>
              </div>
              <p style={{
                color: '#22c55e', fontSize: '2.5rem',
                fontWeight: 800, margin: '0 0 8px',
              }}>
                {kadriaMonthly} €
                <span style={{
                  color: '#71717a', fontSize: '14px', fontWeight: 400,
                }}>
                  /mois
                </span>
              </p>
              <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0 }}>
                {lostPerMonth >= 1
                  ? <>Avec{' '}
                      <strong style={{ color: 'white' }}>{Math.min(breakevenJobs, lostPerMonth)}</strong>{' '}
                      chantier{Math.min(breakevenJobs, lostPerMonth) > 1 ? 's' : ''} récupéré{Math.min(breakevenJobs, lostPerMonth) > 1 ? 's' : ''} sur{' '}
                      <strong style={{ color: 'white' }}>{lostPerMonth}</strong>,
                      Kadria s&apos;autofinance.</>
                  : 'Kadria sécurise chaque opportunité entrante.'
                }
              </p>
            </div>

            {/* Disclaimer en dehors de la card */}
            <p style={{
              color: '#52525b',
              fontSize: '11px',
              margin: '4px 0 0',
              fontStyle: 'italic',
              textAlign: 'center',
            }}>
              Estimation indicative basée sur vos hypothèses.
            </p>
          </div>
        </div>
      </div>

      {/* Style pour le thumb du slider */}
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #22c55e;
          cursor: pointer;
          border: 2px solid #09090b;
          box-shadow: 0 0 0 2px #22c55e;
        }
        input[type=range]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #22c55e;
          cursor: pointer;
          border: 2px solid #09090b;
          box-shadow: 0 0 0 2px #22c55e;
        }
      `}</style>
    </section>
  )
}

