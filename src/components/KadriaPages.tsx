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
  Image as ImageIcon,
  CalendarCheck,
  Check,
  CheckCircle,
  CheckSquare,
  ChevronDown,
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
  Menu,
  MessageCircle,
  X,
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
  XCircle,
  Zap,
} from 'lucide-react';
import { KadriaLogo } from '@/src/components/KadriaLogo';
import { DarkNav } from '@/src/components/DarkNav';
import ChatWidget from '@/src/components/ChatWidget';
import {
  BILLING_MODES,
  WEBSITE_ADDON,
  getAnnualOneShotPrice,
  getAnnualFullPrice,
  getAnnualPitchLabel,
  getMonthlyPriceForMode,
  formatEuro,
  PLAN_BASE_MONTHLY_PRICE,
  type BillingModeKey,
  type PricingPlanKey,
} from '@/src/config/pricing';

// Tiny module-level event bus so any CTA anywhere in this file can open the
// trial plan-choice modal without prop-drilling through PageShell/SiteHeader.
const TRIAL_MODAL_EVENT = 'kadria:open-trial-modal';

export function openTrialPlanModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(TRIAL_MODAL_EVENT));
  }
}

export function TrialPlanModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(TRIAL_MODAL_EVENT, handler);
    return () => window.removeEventListener(TRIAL_MODAL_EVENT, handler);
  }, []);

  if (!open) return null;

  const goTo = (href: string) => {
    setOpen(false);
    window.location.href = href;
  };

  const features = [
    { icon: Layers, text: 'Dossiers illimités' },
    { icon: FileCheck, text: 'Devis illimités' },
    { icon: Bot, text: 'Assistant web de qualification' },
    { icon: CheckSquare, text: 'Qualification automatique' },
    { icon: KanbanSquare, text: 'Pipeline commercial' },
    { icon: Send, text: 'Relances automatiques de devis' },
    { icon: Target, text: 'Priorités du jour' },
    { icon: MapPin, text: 'Géolocalisation des projets' },
    { icon: LayoutDashboard, text: 'Tableau de bord de pilotage' },
    { icon: BarChart3, text: 'Reporting avancé' },
    { icon: Download, text: 'Export PDF' },
    { icon: TrendingUp, text: 'Suivi de la valeur générée' },
  ];

  const guarantees = [
    { icon: Banknote, text: 'Carte bancaire requise' },
    { icon: Clock, text: 'Aucun débit pendant 7 jours' },
    { icon: CheckCircle, text: 'Résiliable à tout moment' },
    { icon: Shield, text: 'Accès complet à toutes les fonctionnalités' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <button
        type="button"
        aria-label="Fermer"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-0 cursor-default"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-white/10 bg-gradient-to-b from-zinc-950 to-black p-6 shadow-[0_24px_100px_rgba(34,197,94,0.12)] sm:p-9">
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-green-400">
            Essai gratuit 7 jours
          </span>
          <h2 className="mt-4 break-words text-2xl font-extrabold leading-tight text-white sm:text-3xl">
            Découvrez
            <br />
            <span className="text-green-500">Kadria Performance</span>
          </h2>
          <p className="mx-auto mt-3 max-w-sm break-words text-sm leading-6 text-zinc-400">
            Testez toutes les fonctionnalités sans limitation et voyez la différence pour votre activité.
          </p>
        </div>

        <div className="relative mx-auto mt-7 w-full max-w-sm">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-green-500/20 blur-3xl" />
          <div className="relative box-border w-full max-w-full overflow-hidden rounded-2xl border border-green-500/30 bg-zinc-900/80 p-4 shadow-[0_0_60px_rgba(34,197,94,0.18)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Pilotage commercial</span>
              <span className="flex h-2 w-2 rounded-full bg-green-500" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
                <p className="text-[10px] text-zinc-500">Dossiers</p>
                <p className="mt-1 text-sm font-bold text-white">128</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
                <p className="text-[10px] text-zinc-500">Devis</p>
                <p className="mt-1 text-sm font-bold text-white">46</p>
              </div>
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-2">
                <p className="text-[10px] text-green-400">CA potentiel</p>
                <p className="mt-1 text-sm font-bold text-green-400">28.4k€</p>
              </div>
            </div>
            <div className="mt-3 flex items-end gap-1.5">
              {[40, 65, 50, 80, 60, 95, 70].map((height, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-green-500/20 to-green-500"
                  style={{ height: `${height * 0.4}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs font-semibold uppercase tracking-widest text-green-500">
          Ce qui est inclus pendant votre essai
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {features.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-300"
            >
              <Icon className="h-4 w-4 flex-shrink-0 text-green-500" />
              <span className="break-words">{text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          {guarantees.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center"
            >
              <Icon className="h-5 w-5 text-green-500" />
              <span className="break-words text-xs text-zinc-400">{text}</span>
            </div>
          ))}
        </div>

        <div className="mt-7 text-center">
          <p className="text-3xl font-black text-green-500">
            {PLAN_BASE_MONTHLY_PRICE.performance}€<span className="text-base font-semibold text-zinc-400">/mois</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">après la période d&apos;essai</p>
        </div>

        <button
          type="button"
          onClick={() => goTo('/register?plan=performance&interval=monthly')}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 text-base font-bold text-black shadow-[0_8px_30px_rgba(34,197,94,0.35)] transition-colors hover:bg-green-400"
        >
          Commencer mon essai gratuit
          <ArrowRight className="h-5 w-5" />
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-500">
          <Shield className="h-3.5 w-3.5" />
          Vos données sont sécurisées
        </p>
      </div>
    </div>
  );
}

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
      { text: 'Devis inclus — 10 devis/mois' },
      { text: 'Assistant vocal inclus — 10 appels/mois' },
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
      { text: 'Devis illimités' },
      { text: 'Assistant vocal étendu selon quota' },
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

const LANDING_FAQ_ITEMS = [
  {
    question: 'Combien de temps faut-il pour installer Kadria ?',
    answer:
      "Kadria s\u2019installe rapidement sur votre site existant gr\u00e2ce \u00e0 un simple widget. L\u2019installation est accompagn\u00e9e pour que vous puissiez commencer \u00e0 recevoir des demandes qualifi\u00e9es sans complexit\u00e9 technique.",
  },
  {
    question: 'Est-ce que Kadria fonctionne avec mon site actuel ?',
    answer:
      'Oui. Kadria peut être ajouté à votre site actuel sans le refaire. Il suffit d’intégrer le widget sur vos pages de contact, devis ou accueil.',
  },
  {
    question: 'Que se passe-t-il quand un prospect me contacte ?',
    answer:
      'Kadria échange avec le prospect, pose les bonnes questions, récupère les informations essentielles puis crée automatiquement un dossier structuré dans votre tableau de bord.',
  },
  {
    question: 'Kadria remplace-t-il mon téléphone ?',
    answer:
      'Non. Kadria ne remplace pas votre relation client. Il vous aide à ne plus perdre les demandes reçues lorsque vous êtes indisponible, sur chantier ou en dehors de vos horaires.',
  },
  {
    question: 'Quels métiers sont compatibles ?',
    answer:
      'Kadria est conçu pour les artisans et entreprises du bâtiment : paysagistes, électriciens, plombiers, peintres, menuisiers, rénovateurs, terrassiers et autres métiers de service sur devis.',
  },
  {
    question: 'Puis-je personnaliser les questions posées aux prospects ?',
    answer:
      'Oui. Les questions peuvent être adaptées à votre métier, vos prestations, votre zone d’intervention et votre manière de qualifier les demandes.',
  },
  {
    question: 'Est-ce que je peux générer des devis avec Kadria ?',
    answer:
      'Oui. Une fois la demande qualifiée, vous pouvez créer un devis, générer un PDF et l’envoyer au client directement depuis Kadria.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer:
      'Oui. Les accès sont sécurisés, les données sont isolées par artisan et les informations sensibles ne sont pas exposées publiquement.',
  },
  {
    question: 'Est-ce sans engagement ?',
    answer:
      'Oui. Les offres Kadria sont pensées pour rester flexibles. Vous pouvez commencer simplement, tester la valeur créée et faire évoluer votre formule selon vos besoins.',
  },
  {
    question: 'Quelle offre choisir ?',
    answer:
      'L’offre Essentiel convient aux artisans indépendants qui veulent structurer leurs demandes. L’offre Performance est recommandée pour les entreprises qui veulent automatiser davantage le suivi commercial. Pour les réseaux ou besoins spécifiques, une offre sur mesure est proposée.',
  },
] as const;

const LANDING_REASSURANCE_ITEMS = [
  {
    icon: Rocket,
    title: 'Installation accompagnée',
    description: 'Nous vous aidons à configurer Kadria selon votre activité.',
  },
  {
    icon: Globe,
    title: 'Compatible avec votre site actuel',
    description: 'Ajoutez Kadria à votre site sans le refaire.',
  },
  {
    icon: CheckCircle,
    title: 'Sans engagement',
    description: 'Faites évoluer votre formule à votre rythme.',
  },
  {
    icon: Shield,
    title: 'Données sécurisées',
    description: 'Vos informations restent isolées et protégées.',
  },
  {
    icon: MessageCircle,
    title: 'Support inclus',
    description: 'Une équipe disponible pour vous accompagner.',
  },
] as const;

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
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteHeader />
      {children}
      <Footer />
      <TrialPlanModal />
    </div>
  );
}

function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [
    { label: 'Comment ca marche', href: '/#comment-ca-marche' },
    { label: 'Demo', href: '/demo' },
    { label: 'Tarifs', href: '/tarifs' },
  ];

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-[#0a0b0f]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1488px] items-center justify-between px-4 sm:px-6">
          <KadriaLogo size="sm" />

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex lg:gap-8">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/dashboard-v2" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Connexion
            </Link>
            <Link href="/demo-request" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-white/[0.03]">
              Reserver une demo
            </Link>
            <Link href="/register" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Tester Kadria
            </Link>
          </div>

          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMobileOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div
          className={`mx-auto max-w-[1488px] overflow-hidden px-4 transition-all duration-200 ease-out sm:px-6 md:hidden ${
            mobileOpen ? 'max-h-[420px] pb-4 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="rounded-2xl border border-white/10 bg-zinc-900/95 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            <nav className="flex flex-col">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-base text-zinc-300 transition-colors hover:bg-white/[0.03] hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/dashboard-v2"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-base text-zinc-300 transition-colors hover:bg-white/[0.03] hover:text-white"
              >
                Connexion
              </Link>
            </nav>
            <div className="mt-2 grid gap-3 border-t border-white/10 p-3">
              <Link
                href="/demo-request"
                onClick={() => setMobileOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-white/[0.03]"
              >
                Reserver une demo
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Tester Kadria
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
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

function RouteSectionTitle({
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

const LANDING_SECTION_CLASS = 'w-full py-24 lg:py-32';
const LANDING_H1_CLASS = 'text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95]';
const LANDING_H2_CLASS = 'text-4xl md:text-5xl font-bold tracking-tight leading-tight';
const LANDING_H3_CLASS = 'text-xl font-semibold';
const LANDING_DESCRIPTION_CLASS = 'text-lg text-zinc-400 leading-relaxed max-w-3xl mx-auto';

function SectionTitle({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={`${LANDING_H2_CLASS} ${className}`.trim()}>{children}</h2>;
}

function SectionDescription({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={`${LANDING_DESCRIPTION_CLASS} ${className}`.trim()}>{children}</p>;
}

function CardTitle({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h3 className={`${LANDING_H3_CLASS} ${className}`.trim()}>{children}</h3>;
}

function LandingFaqSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className={`${LANDING_SECTION_CLASS} border-t border-zinc-800 bg-zinc-950`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="kr-reveal text-xs font-semibold uppercase tracking-widest text-green-500">FAQ</p>
          <SectionTitle className="kr-reveal kr-reveal-delay-1 mt-4 text-center">
            Questions fréquentes
          </SectionTitle>
          <SectionDescription className="kr-reveal kr-reveal-delay-2 mt-5">
            Les réponses essentielles pour comprendre comment Kadria s’intègre à votre activité et vous aide à ne plus perdre de demandes.
          </SectionDescription>
        </div>

        <div className="kr-reveal kr-reveal-delay-2 mx-auto mt-12 max-w-4xl space-y-3">
          {LANDING_FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={item.question}
                className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70 transition-colors duration-200 hover:border-green-500/20"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex((current) => (current === index ? -1 : index))}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left md:px-6"
                >
                  <span className="text-base font-semibold text-white md:text-lg">{item.question}</span>
                  <span
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-zinc-400 transition-all duration-300 ${
                      isOpen ? 'rotate-180 border-green-500/30 text-green-500' : ''
                    }`}
                  >
                    <ChevronDown size={18} />
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p
                      className={`px-5 pb-5 text-sm leading-7 text-zinc-400 transition-opacity duration-200 md:px-6 md:text-base ${
                        isOpen ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="kr-reveal kr-reveal-delay-3 mx-auto mt-12 max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-8 text-center md:px-10">
          <SectionTitle className="text-center">Une question spécifique sur votre activité ?</SectionTitle>
          <SectionDescription className="mt-4">
            Voyons ensemble comment Kadria peut s’adapter à votre métier, vos demandes et votre façon de travailler.
          </SectionDescription>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/demo-request"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-6 py-3 text-sm font-semibold text-black transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-green-400"
            >
              Réserver une démo <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => openTrialPlanModal()}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-green-500/40 hover:bg-white/[0.03]"
            >
              Essai gratuit
            </button>
          </div>
        </div>
      </div>
    </section>
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
  { icon: User, title: 'Prospect', subtitle: 'Demande entrante site ou t\u00e9l\u00e9phone', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', glow: 'rgba(167,139,250,0.3)' },
  { icon: Sparkles, title: 'Qualification', subtitle: 'Kadria pose les bonnes questions', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', glow: 'rgba(34,197,94,0.3)' },
  { icon: FileText, title: 'Dossier', subtitle: 'Besoin, budget, d\u00e9lai et priorit\u00e9', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', glow: 'rgba(96,165,250,0.3)' },
  { icon: Receipt, title: 'Devis', subtitle: 'Opportunit\u00e9 pr\u00eate \u00e0 chiffrer', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', glow: 'rgba(245,158,11,0.3)' },
  { icon: Hammer, title: 'Chantier', subtitle: 'Suivi commercial jusqu\u2019\u00e0 signature', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', glow: 'rgba(34,197,94,0.4)' },
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
    title: 'ACQUISITION & QUALIFICATION',
    description: 'Transformez chaque demande entrante en premier dossier qualifi\u00e9.',
    features: [
      'Assistant web 24h/24',
      'Assistant vocal',
      'Qualification automatique',
      'Collecte des photos et informations',
    ],
    tools: [
      { icon: FileQuestion, color: '#f59e0b', name: 'Formulaire de contact', desc: 'Demandes web dispers\u00e9es' },
      { icon: MessageCircle, color: '#60a5fa', name: 'Chatbot', desc: 'R\u00e9ponses isol\u00e9es' },
      { icon: Phone, color: '#a78bfa', name: 'Standard t\u00e9l\u00e9phonique', desc: 'Appels entrants' },
    ],
    badge: '3 outils remplac\u00e9s',
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
    title: 'CRM & SUIVI COMMERCIAL',
    description: 'Gardez chaque opportunit\u00e9 visible, suivie et relanc\u00e9e au bon moment.',
    features: [
      'Pipeline commercial',
      'Historique des \u00e9changes',
      'Notes internes',
      'Calendrier int\u00e9gr\u00e9',
      'Relances',
    ],
    tools: [
      { icon: Table, color: '#22c55e', name: 'Excel', desc: 'Suivi manuel' },
      { icon: CheckSquare, color: '#a78bfa', name: 'Trello', desc: 'Pipeline bricol\u00e9' },
      { icon: Users, color: '#60a5fa', name: 'HubSpot / Pipedrive', desc: 'CRM g\u00e9n\u00e9raliste' },
    ],
    badge: '3 outils remplac\u00e9s',
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
    title: 'DEVIS & ADMINISTRATION',
    description: 'Passez d\u2019un dossier qualifi\u00e9 \u00e0 un devis envoy\u00e9 sans changer d\u2019outil.',
    features: [
      'G\u00e9n\u00e9ration de devis',
      'Envoi par e-mail',
      'Suivi des ouvertures',
      'Export PDF',
    ],
    tools: [
      { icon: FileText, color: '#f59e0b', name: 'Tolteck', desc: 'Cr\u00e9ation de devis' },
      { icon: Receipt, color: '#22c55e', name: 'Obat', desc: 'Devis artisan' },
      { icon: PenLine, color: '#60a5fa', name: 'DocuSign', desc: 'Validation document' },
    ],
    badge: '3 outils remplac\u00e9s',
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
    title: 'PILOTAGE & PERFORMANCE',
    description: 'Suivez vos indicateurs et concentrez-vous sur les chantiers les plus prometteurs.',
    features: [
      'Tableau de bord',
      'Suivi des indicateurs',
      'Priorisation des opportunit\u00e9s',
      'Rapports d\u2019activit\u00e9',
    ],
    tools: [
      { icon: Table, color: '#f59e0b', name: 'Excel', desc: 'Tableaux de bord' },
      { icon: PieChart, color: '#a78bfa', name: 'Power BI', desc: 'Reporting avanc\u00e9' },
      { icon: Calendar, color: '#22c55e', name: 'Calendly', desc: 'Rendez-vous isol\u00e9s' },
    ],
    badge: '3 outils remplac\u00e9s',
  },
];

const REPLACED_TOOL_ICONS: {
  icon: typeof MessageCircle;
  key: string;
  x: string;
  y: string;
  endX: string;
  endY: string;
  delay: string;
}[] = [
  { key: 'chat', icon: MessageCircle, x: '-96px', y: '-88px', endX: '-24px', endY: '-22px', delay: '0.00s' },
  { key: 'phone', icon: Phone, x: '-32px', y: '-110px', endX: '-8px', endY: '-28px', delay: '0.18s' },
  { key: 'form', icon: FileQuestion, x: '34px', y: '-110px', endX: '9px', endY: '-28px', delay: '0.36s' },
  { key: 'crm', icon: Users, x: '100px', y: '-88px', endX: '25px', endY: '-22px', delay: '0.54s' },
  { key: 'map', icon: MapIcon, x: '-118px', y: '-24px', endX: '-30px', endY: '-6px', delay: '0.72s' },
  { key: 'table', icon: Table, x: '-54px', y: '-24px', endX: '-14px', endY: '-6px', delay: '0.90s' },
  { key: 'tasks', icon: CheckSquare, x: '54px', y: '-24px', endX: '14px', endY: '-6px', delay: '1.08s' },
  { key: 'document', icon: FileText, x: '118px', y: '-24px', endX: '30px', endY: '-6px', delay: '1.26s' },
  { key: 'reporting', icon: BarChart3, x: '-96px', y: '40px', endX: '-24px', endY: '10px', delay: '1.44s' },
  { key: 'email', icon: Mail, x: '-32px', y: '62px', endX: '-8px', endY: '16px', delay: '1.62s' },
  { key: 'calendar', icon: Calendar, x: '34px', y: '62px', endX: '9px', endY: '16px', delay: '1.80s' },
  { key: 'clock', icon: Clock, x: '100px', y: '40px', endX: '25px', endY: '10px', delay: '1.98s' },
];

const DOSSIER_FIELDS: [typeof Hammer, string, string][] = [
  [Target, 'SCORE', '94 / 100'],
  [Banknote, 'BUDGET', '8 000 \u2013 12 000 \u20ac'],
  [Clock, 'D\u00c9LAI', 'Sous 1 mois'],
  [KanbanSquare, 'STATUT', 'Priorit\u00e9 haute'],
];

function ToolsMergeSummary({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="mx-auto mt-16 max-w-5xl rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-6 py-8 md:px-10">
      <div className="flex flex-col gap-8 md:grid md:grid-cols-[150px_minmax(0,1fr)_150px] md:items-center">
        <div className="order-1 md:order-2">
          <div className={`kr-tools-merge-stage ${reduceMotion ? 'kr-tools-merge-stage-static' : ''}`}>
            <div className="kr-tools-merge-ambient" />
            <div className={`kr-tools-merge-halo ${reduceMotion ? 'kr-tools-merge-halo-static' : ''}`} />
            {REPLACED_TOOL_ICONS.map((item) => {
              const Icon = item.icon;
              const style = {
                '--merge-x': item.x,
                '--merge-y': item.y,
                '--merge-end-x': item.endX,
                '--merge-end-y': item.endY,
                '--merge-delay': item.delay,
              } as CSSProperties;

              return (
                <div
                  key={item.key}
                  className={`kr-tools-merge-icon ${reduceMotion ? 'kr-tools-merge-icon-static' : ''}`}
                  style={style}
                >
                  <Icon size={18} />
                </div>
              );
            })}
            <div className={`kr-tools-merge-core ${reduceMotion ? 'kr-tools-merge-core-static' : ''}`}>
              <div className="kr-tools-merge-core-ring" />
              <div className="kr-tools-merge-core-badge">
                <KadriaLogo noLink size="sm" theme="dark" />
              </div>
            </div>
          </div>
        </div>

        <div className="order-2 grid grid-cols-2 gap-4 md:contents">
          <div className="text-center md:order-1">
            <p className="text-4xl font-black text-[var(--accent)]">12</p>
            <p className="mt-1 text-sm text-[var(--text-2)]">outils remplacés</p>
          </div>
          <div className="text-center md:order-3">
            <p className="text-4xl font-black text-[var(--text-1)]">1</p>
            <p className="mt-1 text-sm text-[var(--text-2)]">seule plateforme</p>
            <p className="mt-1 text-xs font-semibold text-[var(--accent)]">Tout est centralisé.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
                  style={{
                    backgroundColor: step.bg,
                    boxShadow: isActive
                      ? `0 0 ${index === QUALIFICATION_STEPS.length - 1 ? 18 : 16}px ${step.glow}`
                      : 'none',
                    transition: 'box-shadow 300ms ease',
                  }}
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
    filter: blur(80px);
    background: radial-gradient(ellipse at center, rgba(34,197,94,0.04) 0%, transparent 70%);
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

  /* Assistant vocal bento card — scoped tokens */
  .kr-voice-card {
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

  /* Assistant vocal bento card — waveform */
  @keyframes voice-wave {
    0%, 100% { height: 8px; opacity: 0.4; }
    50% { height: 36px; opacity: 1; }
  }
  .voice-bar {
    animation: voice-wave var(--duration) var(--delay) ease-in-out infinite;
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
  /* Replace 12 tools â€” merge showcase */
  .kr-tools-merge-stage {
    position: relative;
    margin: 0 auto;
    width: min(100%, 420px);
    min-height: 300px;
    overflow: hidden;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background:
      radial-gradient(circle at center, rgba(34, 197, 94, 0.08), transparent 42%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
  }
  .kr-tools-merge-ambient {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at center, rgba(34, 197, 94, 0.12), transparent 44%),
      radial-gradient(circle at center, rgba(34, 197, 94, 0.05), transparent 68%);
    opacity: 0.9;
  }
  .kr-tools-merge-icon,
  .kr-tools-merge-core,
  .kr-tools-merge-halo {
    position: absolute;
    left: 50%;
    top: 50%;
  }
  .kr-tools-merge-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    background: rgba(24, 24, 27, 0.78);
    color: rgba(244, 244, 245, 0.42);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 12px 30px rgba(0, 0, 0, 0.28);
    transform: translate(-50%, -50%) translate(var(--merge-x), calc(var(--merge-y) + 10px)) scale(0.82);
    opacity: 0;
    animation: tools-merge-icon 8.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
    animation-delay: var(--merge-delay);
  }
  .kr-tools-merge-halo {
    width: 168px;
    height: 168px;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(34, 197, 94, 0.28), rgba(34, 197, 94, 0.08) 48%, transparent 74%);
    filter: blur(8px);
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.7);
    animation: tools-merge-halo 8.6s ease-in-out infinite;
  }
  .kr-tools-merge-core {
    transform: translate(-50%, -50%) scale(0.78);
    opacity: 0.2;
    animation: tools-merge-core 8.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
  }
  .kr-tools-merge-core-ring {
    position: absolute;
    inset: 50% auto auto 50%;
    width: 112px;
    height: 112px;
    border-radius: 999px;
    border: 1px solid rgba(34, 197, 94, 0.24);
    background: radial-gradient(circle, rgba(34, 197, 94, 0.24), rgba(34, 197, 94, 0.08) 58%, transparent 74%);
    box-shadow:
      0 0 36px rgba(34, 197, 94, 0.18),
      inset 0 0 20px rgba(34, 197, 94, 0.12);
    transform: translate(-50%, -50%);
  }
  .kr-tools-merge-core-badge {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 150px;
    min-height: 60px;
    padding: 0 18px;
    border-radius: 18px;
    border: 1px solid rgba(34, 197, 94, 0.28);
    background: rgba(10, 10, 12, 0.86);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      0 0 30px rgba(34, 197, 94, 0.12);
  }
  .kr-tools-merge-stage-static .kr-tools-merge-halo,
  .kr-tools-merge-halo-static {
    opacity: 0.7;
    transform: translate(-50%, -50%) scale(1);
    animation: none;
  }
  .kr-tools-merge-stage-static .kr-tools-merge-core,
  .kr-tools-merge-core-static {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
    animation: none;
  }
  .kr-tools-merge-stage-static .kr-tools-merge-icon,
  .kr-tools-merge-icon-static {
    opacity: 0.95;
    color: rgba(244, 244, 245, 0.72);
    transform: translate(-50%, -50%) translate(var(--merge-x), var(--merge-y)) scale(1);
    animation: none;
  }
  @keyframes tools-merge-icon {
    0%, 8% {
      opacity: 0;
      color: rgba(244, 244, 245, 0.32);
      transform: translate(-50%, -50%) translate(var(--merge-x), calc(var(--merge-y) + 10px)) scale(0.82);
    }
    18%, 34% {
      opacity: 0.9;
      color: rgba(244, 244, 245, 0.54);
      transform: translate(-50%, -50%) translate(var(--merge-x), var(--merge-y)) scale(1);
    }
    44%, 58% {
      opacity: 1;
      color: #22c55e;
      border-color: rgba(34, 197, 94, 0.34);
      box-shadow:
        0 0 24px rgba(34, 197, 94, 0.18),
        inset 0 0 18px rgba(34, 197, 94, 0.12);
      transform: translate(-50%, -50%) translate(var(--merge-x), var(--merge-y)) scale(1.02);
    }
    78% {
      opacity: 0.95;
      color: #22c55e;
      transform: translate(-50%, -50%) translate(var(--merge-end-x), var(--merge-end-y)) scale(0.88);
    }
    92%, 100% {
      opacity: 0;
      color: #22c55e;
      transform: translate(-50%, -50%) translate(0px, 0px) scale(0.38);
    }
  }
  @keyframes tools-merge-halo {
    0%, 48% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.7);
    }
    66% {
      opacity: 0.6;
      transform: translate(-50%, -50%) scale(0.92);
    }
    82% {
      opacity: 0.95;
      transform: translate(-50%, -50%) scale(1.18);
    }
    100% {
      opacity: 0.35;
      transform: translate(-50%, -50%) scale(1.02);
    }
  }
  @keyframes tools-merge-core {
    0%, 54% {
      opacity: 0.18;
      transform: translate(-50%, -50%) scale(0.78);
    }
    72% {
      opacity: 0.82;
      transform: translate(-50%, -50%) scale(0.96);
    }
    86%, 100% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
  @media (max-width: 767px) {
    .kr-tools-merge-stage {
      min-height: 250px;
    }
    .kr-tools-merge-icon {
      width: 38px;
      height: 38px;
    }
    .kr-tools-merge-core-badge {
      min-width: 132px;
      min-height: 54px;
      padding: 0 14px;
    }
  }

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

const BENEFITS_DATA = [
  { icon: MessageCircle, title: 'Ne laissez plus une demande sans r\u00e9ponse', description: "R\u00e9pondez instantan\u00e9ment \u00e0 vos prospects, m\u00eame en dehors de vos horaires d'ouverture." },
  { icon: ClipboardCheck, title: 'Recevez des dossiers complets d\u00e8s le premier \u00e9change', description: 'Budget, d\u00e9lai, besoin, localisation : les informations essentielles sont collect\u00e9es automatiquement.' },
  { icon: Layers, title: 'Centralisez tous vos \u00e9changes au m\u00eame endroit', description: 'Fini les informations dispers\u00e9es entre appels, SMS, e-mails et formulaires.' },
  { icon: Target, title: 'Priorisez les opportunit\u00e9s les plus prometteuses', description: 'Kadria vous aide \u00e0 identifier les projets les plus urgents et les plus qualifi\u00e9s.' },
  { icon: Receipt, title: 'Cr\u00e9ez et envoyez vos devis plus rapidement', description: 'Transformez une demande qualifi\u00e9e en devis en quelques clics.' },
  { icon: LayoutDashboard, title: 'Gardez le contr\u00f4le de votre activit\u00e9', description: 'Suivez vos demandes, vos devis et votre pipeline commercial depuis un seul tableau de bord.' },
];

function metricBorderClasses(i: number) {
  const base = i < 5 ? 'border-b border-zinc-800' : 'border-b-0';
  const mdRight = i % 2 === 0 ? 'md:border-r md:border-zinc-800' : 'md:border-r-0';
  const mdBottom = i < 4 ? 'md:border-b md:border-zinc-800' : 'md:border-b-0';
  const lgRight = i % 3 !== 2 ? 'lg:border-r lg:border-zinc-800' : 'lg:border-r-0';
  const lgBottom = i < 3 ? 'lg:border-b lg:border-zinc-800' : 'lg:border-b-0';
  return `${base} ${mdRight} ${mdBottom} ${lgRight} ${lgBottom}`;
}

function BenefitsGrid() {
  return (
    <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {BENEFITS_DATA.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="kr-reveal rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 transition-colors hover:border-green-500/30 hover:bg-zinc-900/80"
            style={{ transitionDelay: (i * 70) + 'ms' }}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-green-500/20 bg-green-500/[0.08] text-green-500">
              <Icon size={20} />
            </div>
            <CardTitle className="mt-5 leading-snug text-white">{item.title}</CardTitle>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{item.description}</p>
          </div>
        );
      })}
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

interface ChatMsg {
  role: 'assistant' | 'user';
  text: string;
  delay: number;
  isPhotoConfirmation?: boolean;
  isContactCard?: boolean;
  isSuccess?: boolean;
}

const CHAT_MESSAGES: ChatMsg[] = [
  {
    role: 'assistant',
    text: "Bonjour, je suis l'assistant Kadria 👋\nPour commencer, quel type de travaux souhaitez-vous réaliser ?",
    delay: 0,
  },
  { role: 'user', text: 'Entretien', delay: 1800 },
  {
    role: 'assistant',
    text: "Vous souhaitez donc réaliser des travaux d'entretien. Pouvez-vous préciser quel type d'entretien vous envisagez ? Par exemple, s'agit-il de l'entretien d'un jardin, d'une maison, ou d'un autre domaine ?",
    delay: 3200,
  },
  { role: 'user', text: 'Massif floral', delay: 5800 },
  {
    role: 'assistant',
    text: "Vous souhaitez donc réaliser l'entretien d'un massif floral. Pour mieux comprendre votre besoin, pouvez-vous me dire quelle est la surface approximative de ce massif ?",
    delay: 7400,
  },
  { role: 'user', text: '30m²', delay: 9800 },
  {
    role: 'assistant',
    text: "Merci pour cette précision. Pour l'entretien de votre massif floral de 30m², avez-vous des préférences concernant les types de plantes ou de fleurs à entretenir ?",
    delay: 11200,
  },
  {
    role: 'user',
    text: 'Plantes méditerranéennes (palmiers, yuccas, cordylines, lauriers roses)',
    delay: 13800,
  },
  {
    role: 'assistant',
    text: "Vous souhaitez entretenir des plantes méditerranéennes comme des palmiers, yuccas, cordylines et lauriers roses. Avez-vous besoin de services spécifiques, comme la taille, le désherbage ou l'ajout de terreau ?",
    delay: 16400,
  },
  { role: 'user', text: 'Taille, nettoyage', delay: 19200 },
  {
    role: 'assistant',
    text: 'Vous avez besoin de services de taille et de nettoyage pour votre massif floral. Quel est votre budget estimatif pour ces travaux ?',
    delay: 20800,
  },
  { role: 'user', text: 'Moins de 2 000 €', delay: 23000 },
  {
    role: 'assistant',
    text: "Pour mieux préparer le devis, pouvez-vous estimer plus précisément ? Par exemple, avez-vous une idée si c'est plutôt autour de 200-500 €, 500-1 000 € ou 1 000-2 000 € ?",
    delay: 24600,
  },
  { role: 'user', text: '200 – 500 €', delay: 27400 },
  {
    role: 'assistant',
    text: "Vous envisagez un budget compris entre 200 et 500 € pour l'entretien de votre massif floral. Souhaitez-vous réaliser ce projet rapidement ou plutôt dans les prochains mois ?",
    delay: 28800,
  },
  { role: 'user', text: 'Sous 1 mois', delay: 31600 },
  {
    role: 'assistant',
    text: 'Vous souhaitez réaliser ce projet sous 1 mois. Où en êtes-vous dans votre réflexion ?',
    delay: 33000,
  },
  { role: 'user', text: 'Prêt à démarrer', delay: 34800 },
  {
    role: 'assistant',
    text: "Avez-vous des photos, plans ou documents à joindre pour aider l'artisan à préparer son devis ? 📎",
    delay: 36200,
  },
  {
    role: 'user',
    text: "J'ai ajouté 1 photo(s) à mon dossier.",
    delay: 38800,
    isPhotoConfirmation: true,
  },
  {
    role: 'assistant',
    text: "Quelle est l'adresse du chantier concerné ? 📍",
    delay: 40200,
  },
  { role: 'user', text: '40 Rue Bonnat 31400 Toulouse', delay: 42600 },
  {
    role: 'assistant',
    text: 'Pour finaliser votre dossier, renseignez vos coordonnées ci-dessous.',
    delay: 44000,
  },
  {
    role: 'user',
    text: 'Prénom: Jean, Nom: Dupont, Téléphone: 06 06 77 88 99, Email: jean@jean.com',
    delay: 47000,
    isContactCard: true,
  },
  {
    role: 'assistant',
    text: "Parfait ! Vérifiez votre dossier et validez l'envoi. 📋",
    delay: 48600,
  },
  {
    role: 'assistant',
    text: "✅ Votre dossier a bien été transmis (réf. #PEIUET). L'artisan va vous recontacter très prochainement. Merci !",
    delay: 50400,
    isSuccess: true,
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
        if (msg.role === 'assistant' && !msg.isSuccess) {
          timeouts.push(setTimeout(() => setTypingBeforeIndex(i), Math.max(msg.delay - 900, 0)));
        }
        timeouts.push(setTimeout(() => {
          setTypingBeforeIndex(null);
          setVisibleMessages(i + 1);
        }, msg.delay));
      });

      const lastDelay = CHAT_MESSAGES[CHAT_MESSAGES.length - 1].delay;
      timeouts.push(setTimeout(run, lastDelay + 4000));
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

  // Dynamic progress bar
  const lastIdx = visibleMessages > 0 ? visibleMessages - 1 : 0;
  const step = lastIdx <= 5 ? 1 : lastIdx <= 11 ? 2 : lastIdx <= 17 ? 3 : 4;
  const stepLabels = ['', 'Projet', 'Détails', 'Précisions', 'Validation'];
  const stepWidths = ['', '25%', '50%', '75%', '100%'];

  return (
    <div className="kr-assistant-card flex h-full w-full flex-col overflow-hidden">
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
          <span className="text-xs text-[var(--text-2)]">Étape {step} sur 4 — {stepLabels[step]}</span>
        </div>
        <div className="mt-0.5 h-0.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: stepWidths[step], transition: 'width 400ms ease' }}
          />
        </div>
      </div>

      <div ref={chatRef} className="kr-assistant-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3.5 py-3">
        {CHAT_MESSAGES.slice(0, visibleMessages).map((msg, i) => {
          const animClass = reduceMotion ? '' : msg.role === 'assistant' ? 'kr-assistant-msg-in' : 'kr-assistant-user-in';

          if (msg.isSuccess) {
            return (
              <div
                key={i}
                className={`self-start ${animClass}`}
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid var(--accent-border)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  maxWidth: '90%',
                }}
              >
                <CheckCircle size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '12px', lineHeight: 1.4 }}>
                  {msg.text}
                </span>
              </div>
            );
          }

          if (msg.isContactCard) {
            return (
              <div
                key={i}
                className={`self-end ${animClass}`}
                style={{
                  background: 'var(--accent)',
                  color: 'var(--bg)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  maxWidth: '80%',
                }}
              >
                <span className="text-[11px] font-bold">Jean Dupont</span>
                <span className="text-[11px]">Tél : 06 06 77 88 99</span>
                <span className="text-[11px]">jean@jean.com</span>
              </div>
            );
          }

          if (msg.isPhotoConfirmation) {
            return (
              <div
                key={i}
                className={`max-w-[80%] self-end rounded-[12px] rounded-br-[2px] bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-[var(--bg)] ${animClass}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <div style={{
                  width: '24px', height: '24px', borderRadius: '4px', flexShrink: 0,
                  background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ImageIcon size={12} color="rgba(0,0,0,0.55)" />
                </div>
                {msg.text}
              </div>
            );
          }

          if (msg.role === 'assistant') {
            return (
              <div
                key={i}
                className={`max-w-[85%] self-start whitespace-pre-line rounded-[12px] rounded-bl-[2px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--text-1)] ${animClass}`}
              >
                {msg.text}
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`max-w-[75%] self-end rounded-[12px] rounded-br-[2px] bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-[var(--bg)] ${animClass}`}
            >
              {msg.text}
            </div>
          );
        })}
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

const VOICE_MESSAGES: { role: 'client' | 'kadria'; text: string; delay: number }[] = [
  { role: 'client', text: "Bonjour, je cherche un électricien pour installer une borne de recharge.", delay: 0 },
  { role: 'kadria', text: "Bonjour ! Je suis l'assistant de AD Elec. Je peux vous aider. Avez-vous déjà un emplacement prévu pour la borne ?", delay: 2000 },
  { role: 'client', text: "Oui, dans mon garage.", delay: 4500 },
  { role: 'kadria', text: "Parfait. Votre tableau électrique est-il récent ? Et quel est votre budget approximatif ?", delay: 6000 },
  { role: 'client', text: "Tableau de 2018, budget autour de 1 500€.", delay: 8500 },
  { role: 'kadria', text: "Très bien. Je note votre demande et transmets un dossier complet à notre artisan. Vous recevrez un devis sous 24h.", delay: 10500 },
  { role: 'client', text: "Merci beaucoup !", delay: 13000 },
  { role: 'kadria', text: "Avec plaisir. Bonne journée ! 🎯 Dossier créé — Score 91%", delay: 14500 },
];

const VOICE_WAVE_BARS: { duration: number; delay: number; accent: boolean }[] = [
  { duration: 600, delay: 0, accent: true },
  { duration: 700, delay: 100, accent: true },
  { duration: 500, delay: 50, accent: true },
  { duration: 650, delay: 150, accent: true },
  { duration: 550, delay: 75, accent: true },
  { duration: 750, delay: 200, accent: false },
  { duration: 625, delay: 125, accent: false },
  { duration: 575, delay: 175, accent: false },
];

function VoiceAssistantCard({ reduceMotion }: { reduceMotion: boolean }) {
  const [visibleMessages, setVisibleMessages] = useState(reduceMotion ? VOICE_MESSAGES.length : 0);
  const [elapsed, setElapsed] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setVisibleMessages(0);

      VOICE_MESSAGES.forEach((msg, i) => {
        timeouts.push(setTimeout(() => setVisibleMessages(i + 1), msg.delay));
      });

      const lastDelay = VOICE_MESSAGES[VOICE_MESSAGES.length - 1].delay;
      timeouts.push(setTimeout(run, lastDelay + 3000));
    };

    run();

    return () => timeouts.forEach(clearTimeout);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [reduceMotion]);

  useEffect(() => {
    if (!transcriptRef.current) return;
    transcriptRef.current.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [visibleMessages, reduceMotion]);

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="kr-voice-card flex h-full w-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-[var(--border)] px-4 py-3.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#60a5fa] text-sm font-extrabold text-white">
          K
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--text-1)]">Kadria Vocal</p>
          <p className="text-xs text-[var(--text-2)]">Appel en cours...</p>
        </div>
        <span className="ml-auto font-mono text-xs font-semibold text-[var(--accent)]">
          {minutes}:{seconds}
        </span>
        <span className="kr-badge-pulse flex-shrink-0 rounded-full border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.15)] px-2 py-0.5 text-xs font-bold text-[#dc2626]">
          🔴 EN DIRECT
        </span>
      </div>

      <div className="flex h-12 flex-shrink-0 items-end justify-center gap-1 border-b border-[var(--border)] px-4 py-4">
        {VOICE_WAVE_BARS.map((bar, i) => (
          <div
            key={i}
            className={`w-1 rounded-sm ${reduceMotion ? '' : 'voice-bar'} ${bar.accent ? 'bg-[var(--accent)]' : 'bg-[rgba(96,165,250,0.4)]'}`}
            style={
              reduceMotion
                ? { height: '22px' }
                : ({ '--duration': `${bar.duration}ms`, '--delay': `${bar.delay}ms` } as CSSProperties)
            }
          />
        ))}
      </div>

      <div ref={transcriptRef} className="kr-assistant-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3.5">
        {VOICE_MESSAGES.slice(0, visibleMessages).map((msg, i) =>
          msg.role === 'client' ? (
            <div
              key={i}
              className={`max-w-[85%] self-start rounded-[10px] rounded-bl-[2px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-2)] ${
                reduceMotion ? '' : 'kr-assistant-msg-in'
              }`}
            >
              <span className="text-[10px] text-[var(--text-3)]">👤 Client · </span>
              {msg.text}
            </div>
          ) : (
            <div
              key={i}
              className={`max-w-[85%] self-end rounded-[10px] rounded-br-[2px] border border-[rgba(96,165,250,0.25)] bg-[rgba(96,165,250,0.12)] px-3 py-2 text-xs text-[var(--text-1)] ${
                reduceMotion ? '' : 'kr-assistant-user-in'
              }`}
            >
              <span className="text-[10px] text-[#60a5fa]">🤖 Kadria · </span>
              {msg.text}
            </div>
          )
        )}
      </div>

      <div className="flex flex-shrink-0 items-center justify-between border-t border-[var(--border)] px-3.5 py-2.5" style={{ background: 'rgba(34,197,94,0.06)' }}>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
          <CheckCircle size={12} color="var(--accent)" />
          Dossier créé automatiquement
        </div>
        <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-[var(--bg)]">
          Score: 91%
        </span>
      </div>
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

export function LandingRoutePage() {
  useScrollReveal();
  const reduceMotion = usePrefersReducedMotion();
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
    'Vous r\u00e9pondez entre deux interventions, quand vous avez le temps.',
    'Les informations sont dispers\u00e9es entre appels, SMS, e-mails et formulaires.',
    'Les prospects doivent \u00eatre relanc\u00e9s pour obtenir le budget, le d\u00e9lai ou les photos.',
    'Certaines demandes passent entre les mailles du filet.',
    'Le suivi commercial repose sur votre m\u00e9moire ou vos notes.',
  ];
  const missedNotifs = [
    { icon: '\ud83d\udcde', text: 'Appel manqu\u00e9 pendant un chantier', rotate: -1.5 },
    { icon: '\ud83d\udcac', text: 'Message oubli\u00e9 dans WhatsApp', rotate: 0.5 },
    { icon: '\ud83d\udccb', text: 'Formulaire incomplet', rotate: -0.8 },
  ];
  const apres = [
    'R\u00e9pondez instantan\u00e9ment, m\u00eame lorsque vous \u00eates sur le chantier.',
    'Recevez des demandes plus compl\u00e8tes d\u00e8s le premier contact.',
    'Pr\u00e9parez vos devis sans relancer vos prospects.',
    'Priorisez les opportunit\u00e9s les plus prometteuses.',
    'Centralisez vos \u00e9changes, relances et rendez-vous.',
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 text-white">
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
          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[0.95fr_1.05fr] md:items-center md:gap-10 md:py-10 lg:px-12">
            <div>
              <div className="kr-reveal inline-flex max-w-full items-center rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-green-400 sm:text-xs sm:tracking-[0.18em]">
                Assistant commercial IA pour artisans
              </div>
              <h1 className={`kr-reveal kr-reveal-delay-1 mt-5 max-w-3xl ${LANDING_H1_CLASS}`}>
                Transformez chaque demande en chantier qualifi&eacute;.
              </h1>
              <SectionDescription className="kr-reveal kr-reveal-delay-2 mt-5 max-w-3xl mx-0">
                Kadria qualifie vos prospects 24h/24, sur votre site et par t&eacute;l&eacute;phone. Chaque conversation devient un dossier complet, prioris&eacute; et pr&ecirc;t &agrave; &ecirc;tre chiffr&eacute;.
              </SectionDescription>
              <div className="kr-reveal kr-reveal-delay-3 mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/demo-request"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-green-500 px-6 py-3 text-sm font-semibold text-black transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-green-400 sm:w-auto"
                >
                  R&eacute;server une d&eacute;mo <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => openTrialPlanModal()}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-green-500/40 hover:bg-white/[0.03] sm:w-auto"
                >
                  Essai gratuit
                </button>
              </div>
              <div className="kr-reveal kr-reveal-delay-4 mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-400">
                {[
                  'Installation en moins de 30 minutes',
                  'Compatible avec votre site actuel',
                  'Sans engagement',
                ].map((item, index) => (
                  <span key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {item}
                    {index < 2 && <span className="hidden text-zinc-700 sm:inline">&bull;</span>}
                  </span>
                ))}
              </div>
            </div>

            <div className="kr-reveal kr-reveal-right min-w-0 rounded-xl shadow-[0_0_60px_rgba(34,197,94,0.08)]">
              <QualificationShowcase />
            </div>
          </div>
        </section>

        {/* 3. SOCIAL PROOF */}
        <section className={`${LANDING_SECTION_CLASS} border-y border-zinc-800 bg-zinc-900`}>
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <SectionTitle className="kr-reveal kr-reveal-delay-1">
                Ce que Kadria change concr&egrave;tement
              </SectionTitle>
              <SectionDescription className="kr-reveal kr-reveal-delay-2 mt-5">
                Moins de temps perdu, plus de demandes qualifi&eacute;es et un suivi commercial enfin centralis&eacute;.
              </SectionDescription>
            </div>
            <BenefitsGrid />
          </div>
        </section>

        {/* 4. PROBLEME -> SOLUTION */}
        <section className={`${LANDING_SECTION_CLASS} bg-zinc-950`}>
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <SectionTitle className="kr-reveal kr-reveal-delay-1">
                Chaque demande m&eacute;rite une r&eacute;ponse. Chaque r&eacute;ponse m&eacute;rite un chantier.
              </SectionTitle>
              <SectionDescription className="kr-reveal kr-reveal-delay-2 mt-5">
                Les demandes oubli&eacute;es, incompl&egrave;tes ou trait&eacute;es trop tard repr&eacute;sentent des opportunit&eacute;s perdues. Kadria les transforme en dossiers qualifi&eacute;s, pr&ecirc;ts &agrave; &ecirc;tre chiffr&eacute;s.
              </SectionDescription>
            </div>
            <div className="relative mt-12 grid items-stretch gap-8 lg:grid-cols-2">
              {/* Flèche centrale */}
              <div className="kr-reveal kr-reveal-delay-3 pointer-events-none absolute left-1/2 top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-green-500/30 bg-zinc-900 shadow-[0_0_32px_rgba(34,197,94,0.22)] lg:flex">
                <ArrowRight size={20} className="text-green-500" />
              </div>

              {/* AVANT KADRIA */}
              <div className="kr-reveal kr-reveal-left flex flex-col overflow-hidden rounded-xl border border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.03)]">
                <div className="flex items-center gap-3 border-b border-[rgba(220,38,38,0.15)] bg-[rgba(220,38,38,0.06)] px-6 py-4">
                  <AlertTriangle size={18} className="text-[#dc2626]" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626]">Sans Kadria</p>
                    <p className="text-sm text-zinc-400">Sans syst&egrave;me commercial centralis&eacute;</p>
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
                      Chaque demande non trait&eacute;e rapidement est une opportunit&eacute; qui peut partir chez un concurrent.
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
                    <p className="text-sm text-zinc-400">Disponible 24h/24</p>
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
                      Recevez des dossiers complets et exploitables d&egrave;s le premier &eacute;change.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="kr-reveal kr-reveal-delay-3 mt-10 flex flex-col items-center gap-4 text-center">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/demo-request"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-6 py-3 text-sm font-semibold text-black transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-green-400"
                >
                  R&eacute;server une d&eacute;mo <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => openTrialPlanModal()}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-green-500/40 hover:bg-white/[0.03]"
                >
                  Essai gratuit
                </button>
              </div>
              <p className="text-sm text-zinc-500">
                Installation accompagn&eacute;e &bull; Compatible avec votre site actuel &bull; Sans engagement
              </p>
            </div>
          </div>
        </section>
        {/* 4. COMMENT CA MARCHE */}
        <section id="comment-ca-marche" className={`${LANDING_SECTION_CLASS} border-y border-zinc-800 bg-zinc-900/70`}>
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <SectionTitle className="kr-reveal kr-reveal-delay-1">
                Comment &ccedil;a marche ?
              </SectionTitle>
              <SectionDescription className="kr-reveal kr-reveal-delay-2 mt-5">
                Installez Kadria en quelques minutes et laissez l&apos;assistant g&eacute;rer vos demandes.
              </SectionDescription>
            </div>

            <div className="relative mt-14">
              <div className="absolute left-5 top-0 h-full w-px bg-zinc-800 md:left-0 md:top-10 md:h-px md:w-full" />
              <div className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-green-500 via-green-500/70 to-transparent md:left-0 md:top-10 md:h-px md:w-full md:bg-gradient-to-r" />
              <div className="relative grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                  {
                    icon: Globe,
                    title: "Connectez Kadria \u00e0 votre site.",
                    description: "Ajoutez le widget en quelques minutes, sans modifier votre site existant.",
                  },
                  {
                    icon: MessageCircle,
                    title: "Vos prospects \u00e9changent avec Kadria.",
                    description: "Par chat ou par t\u00e9l\u00e9phone, Kadria pose les bonnes questions au bon moment.",
                  },
                  {
                    icon: ClipboardCheck,
                    title: "Les demandes sont qualifi\u00e9es automatiquement.",
                    description: "Budget, d\u00e9lai, photos, localisation et besoin sont structur\u00e9s dans un dossier unique.",
                  },
                  {
                    icon: LayoutDashboard,
                    title: "Pilotez et envoyez vos devis.",
                    description: "Retrouvez vos opportunit\u00e9s dans votre dashboard et transformez-les en chantiers.",
                  },
                ].map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="kr-reveal relative pl-14 md:pl-0" style={{ transitionDelay: (index * 90) + 'ms' }}>
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-green-500/30 bg-zinc-950 text-green-500 shadow-[0_0_24px_rgba(34,197,94,0.14)] md:left-1/2 md:-translate-x-1/2">
                        <Icon size={18} />
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5 transition-colors hover:border-green-500/30 hover:bg-zinc-900/80 md:mt-16">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-green-500">0{index + 1}</span>
                        <CardTitle className="mt-3 leading-snug text-white">{step.title}</CardTitle>
                        <p className="mt-3 text-sm leading-6 text-zinc-400">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="kr-reveal kr-reveal-delay-3 mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-zinc-400">
              {['Compatible avec votre site actuel', 'Installation accompagn\u00e9e', 'Sans engagement'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  {item}
                </span>
              ))}
            </div>

            <div className="kr-reveal kr-reveal-delay-4 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/demo-request"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-6 py-3 text-sm font-semibold text-black transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-green-400"
              >
                R&eacute;server une d&eacute;mo <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => openTrialPlanModal()}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-green-500/40 hover:bg-white/[0.03]"
              >
                Essai gratuit
              </button>
            </div>
          </div>
        </section>
        {/* 4. REMPLACE 12 OUTILS */}
        <section className="kr-tools-section relative border-b border-t border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-24 lg:py-32">
          <div className="relative mx-auto max-w-6xl">
            <div className="flex justify-center">
              <span className="kr-reveal rounded-full border border-[var(--accent-border)] bg-[rgba(34,197,94,0.08)] px-4 py-1 text-xs font-bold text-[var(--accent)]">
                KADRIA PRO
              </span>
            </div>
            <SectionTitle className="kr-reveal kr-reveal-delay-1 mt-4 text-center">
              Remplacez jusqu&apos;à 12 outils.
              <br />
              Pilotez toute votre activité depuis <span className="text-[var(--accent)]">une seule plateforme.</span>
            </SectionTitle>
            <SectionDescription className="kr-reveal kr-reveal-delay-2 mt-5 text-center text-[var(--text-2)]">
              Capturez vos demandes, qualifiez vos prospects, envoyez vos devis et suivez votre activité depuis un
              seul tableau de bord.
            </SectionDescription>

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
                      <CardTitle className="mt-2">{card.title}</CardTitle>
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

            <ToolsMergeSummary reduceMotion={reduceMotion} />
            <p className="kr-reveal kr-reveal-delay-1 mx-auto mt-8 max-w-2xl text-center text-xl font-bold text-[var(--text-1)]">
              Moins d&apos;outils. Moins de ressaisies. Plus de chantiers.
            </p>
            <p className="kr-reveal kr-reveal-delay-2 mx-auto mt-3 max-w-2xl text-center text-sm text-[var(--text-2)]">
              Toutes vos demandes, vos devis et votre suivi commercial enfin réunis au même endroit.
            </p>
            <div className="kr-reveal kr-reveal-delay-3 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/demo-request"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-6 py-3 text-sm font-semibold text-black transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-green-400"
              >
                Réserver une démo <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => openTrialPlanModal()}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-green-500/40 hover:bg-white/[0.03]"
              >
                Essai gratuit
              </button>
            </div>
            <p className="kr-reveal kr-reveal-delay-4 mt-4 text-center text-sm text-[var(--text-2)]">
              Installation accompagnée • Compatible avec votre site actuel • Sans engagement
            </p>
          </div>
        </section>

        {/* 5. FEATURES — BENTO GRID */}
        <section className={`${LANDING_SECTION_CLASS} relative overflow-hidden bg-zinc-950`}>
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
              <SectionTitle className="kr-reveal kr-reveal-delay-1 mt-4">
                Deux assistants. <span style={{ color: 'var(--accent)' }}>Une seule plateforme.</span>
              </SectionTitle>
              <SectionDescription className="kr-reveal kr-reveal-delay-2 mt-5">
                Kadria répond sur votre site et au téléphone, qualifie vos prospects et crée les dossiers — même quand vous êtes sur le chantier.
              </SectionDescription>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p className="kr-reveal text-xs font-semibold uppercase tracking-widest text-green-500">Assistant web</p>
                <p className="kr-reveal mb-4 mt-2 text-sm text-zinc-400">
                  Qualifie chaque demande 24h/24 par chat sur votre site
                </p>
                <div
                  className="kr-reveal h-[420px] overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.03] md:h-[520px]"
                  style={{ boxShadow: '0 0 40px rgba(34,197,94,0.08)' }}
                >
                  <AssistantWebChatCard reduceMotion={reduceMotion} />
                </div>
              </div>
              <div>
                <p className="kr-reveal text-xs font-semibold uppercase tracking-widest text-green-500">Assistant vocal</p>
                <p className="kr-reveal mb-4 mt-2 text-sm text-zinc-400">
                  Répond aux appels entrants et qualifie les prospects par téléphone
                </p>
                <div
                  className="kr-reveal h-[420px] overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.03] md:h-[520px]"
                  style={{ boxShadow: '0 0 40px rgba(96,165,250,0.08)' }}
                >
                  <VoiceAssistantCard reduceMotion={reduceMotion} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DASHBOARD PREVIEW */}
        <section className={`${LANDING_SECTION_CLASS} bg-zinc-900`}>
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="kr-reveal text-xs font-semibold uppercase tracking-widest text-green-500">Dashboard</p>
              <SectionTitle className="kr-reveal kr-reveal-delay-1 mt-4">
                4 fonctionnalités clés,{' '}
                <span className="kr-gradient-text">révélées en toute fluidité</span>
              </SectionTitle>
              <SectionDescription className="kr-reveal kr-reveal-delay-2 mt-5">
                Une expérience moderne et interactive pour piloter votre activité depuis un seul tableau de bord.
              </SectionDescription>
            </div>
            <div className="kr-reveal kr-reveal-scale kr-reveal-delay-2 mx-auto mt-12 max-w-6xl">
              <DashboardCarousel />
            </div>
          </div>
        </section>

        {/* SIMULATEUR */}
        <SimulateurSection />

        {/* METIERS */}
        <section id="metiers" className={`${LANDING_SECTION_CLASS} bg-zinc-900`}>
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <SectionTitle className="kr-reveal">Kadria parle le même langage que vous</SectionTitle>
              <SectionDescription className="kr-reveal kr-reveal-delay-1 mt-5">
                Chaque métier a ses questions, son vocabulaire, ses chantiers. Kadria s&apos;adapte.
              </SectionDescription>
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
                <CardTitle className="text-white">
                  {displayTrade.emoji} {displayTrade.label}
                </CardTitle>

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
                  href="/demo-dashboard"
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-green-500 transition-colors hover:bg-green-500/10"
                >
                  Voir un exemple de conversation →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* PROGRAMME LANCEMENT */}
        <section className={`${LANDING_SECTION_CLASS} bg-zinc-950`}>
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="kr-reveal kr-glass rounded-xl p-8 md:p-12">
              <span className="kr-badge-pulse inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-green-400">
                Programme de lancement
              </span>
              <SectionTitle className="kr-reveal kr-reveal-delay-1 mt-4">
                Programme de lancement <span className="text-green-500">Kadria</span>
              </SectionTitle>
              <SectionDescription className="kr-reveal kr-reveal-delay-2 mt-5 max-w-2xl mx-0">
                Kadria est en cours de déploiement auprès d un nombre limité d artisans et d entreprises du bâtiment.
                Les premiers partenaires bénéficient d un accompagnement personnalisé pour configurer leur assistant,
                connecter leur site et leur ligne téléphonique, et adapter Kadria à leur métier.
              </SectionDescription>
              <p className="kr-reveal kr-reveal-delay-2 mt-5 max-w-2xl text-base font-semibold leading-7 text-white">
                Vous souhaitez faire partie des premiers professionnels à tester Kadria ?
              </p>
              <p className="kr-reveal kr-reveal-delay-3 mt-6 flex items-center gap-2 text-sm text-zinc-400">
                <span className="kr-badge-pulse inline-block h-2 w-2 rounded-full bg-green-500" />
                12 artisans déjà partenaires · 8 places restantes
              </p>
              <Link
                href="/parametres"
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
        <section className={`${LANDING_SECTION_CLASS} bg-zinc-900`}>
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="kr-reveal text-xs font-semibold uppercase tracking-widest text-green-500">Tarifs</p>
              <SectionTitle className="kr-reveal kr-reveal-delay-1 mt-4">
                Un tarif simple, <span className="kr-gradient-text">adapté à votre activité.</span>
              </SectionTitle>
            </div>
            <SwipeHint
              label="Faites glisser horizontalement pour comparer les formules"
              className="mb-4 justify-center text-xs md:hidden"
            />
            <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mt-12 md:grid md:grid-cols-3 md:items-center md:gap-4 md:overflow-visible md:px-0 md:pb-0">
              {plans.map((plan, i) => (
                <div
                  key={plan.slug}
                  className={`kr-reveal kr-reveal-scale kr-reveal-delay-${i + 1} kr-card-hover min-w-[85vw] shrink-0 snap-center rounded-xl border p-6 sm:min-w-[80vw] md:min-w-0 md:shrink ${
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
                  <CardTitle className="mt-3">{plan.name}</CardTitle>
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
                ➕ Site vitrine clé en main — +300 € HT une fois — Essentiel et Performance
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

        <LandingFaqSection />

        {/* 7. CTA FINAL */}
        <section className="relative overflow-hidden border-y border-zinc-800 bg-zinc-900 px-6 py-24 lg:py-32">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(34,197,94,0.06)_0%,transparent_70%)]" />
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {LANDING_REASSURANCE_ITEMS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="kr-reveal rounded-xl border border-zinc-800 bg-white/[0.03] p-5 transition-colors duration-200 hover:border-green-500/25 hover:bg-white/[0.05]"
                    style={{ transitionDelay: `${index * 70}ms` }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-green-500/20 bg-green-500/[0.08] text-green-500">
                      <Icon size={18} />
                    </div>
                    <CardTitle className="mt-4 text-white">{item.title}</CardTitle>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="kr-reveal kr-reveal-delay-3 mx-auto mt-12 max-w-3xl text-center">
              <SectionTitle className="text-center">
                Prêt à transformer vos demandes en chantiers qualifiés ?
              </SectionTitle>
              <SectionDescription className="mt-5">
                Voyons ensemble comment Kadria peut s&apos;adapter à votre métier, vos demandes et votre façon de travailler.
              </SectionDescription>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/demo-request"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-6 py-3 text-sm font-semibold text-black transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-green-400"
                >
                  Réserver une démo <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => openTrialPlanModal()}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-green-500/40 hover:bg-white/[0.03]"
                >
                  Essai gratuit
                </button>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-zinc-400">
                {['Sans engagement', 'Support inclus dès le premier jour', 'Installation accompagnée'].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {item}
                  </span>
                ))}
              </div>
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
        <RouteSectionTitle
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
  priceNote?: string;
  originalAnnualPrice?: string;
  features: PricingFeature[];
  highlighted: boolean;
  availabilityBadge?: string;
  cta: { label: string; href: string; primary: boolean; disabled?: boolean };
  checkout?: { plan: 'essentiel' | 'performance'; interval: 'monthly' | 'yearly' };
}

function buildPricingPlanCards(billingMode: BillingModeKey): PricingPlanCard[] {
  const isAnnual = billingMode !== 'monthly';
  const checkoutIntervalFor = (): 'monthly' | 'yearly' =>
    billingMode === 'monthly' ? 'monthly' : 'yearly';
  const priceNoteFor = (plan: PricingPlanKey) =>
    billingMode === 'monthly' ? undefined : BILLING_MODES[billingMode].label;

  const priceFor = (plan: PricingPlanKey) =>
    isAnnual
      ? `${formatEuro(getAnnualOneShotPrice(plan, billingMode))}€`
      : `${getMonthlyPriceForMode(plan, billingMode)}€`;

  const periodFor = () => (isAnnual ? '/an' : '/mois');

  const originalAnnualPriceFor = (plan: PricingPlanKey) =>
    isAnnual ? `${formatEuro(getAnnualFullPrice(plan))}€` : undefined;

  const annualPitchFor = (plan: PricingPlanKey) =>
    billingMode === 'monthly' ? getAnnualPitchLabel(plan) : undefined;

  return [
    {
      slug: 'essentiel',
      name: 'Essentiel',
      price: priceFor('essentiel'),
      priceSize: 'text-5xl',
      period: periodFor(),
      priceNote: priceNoteFor('essentiel') ?? annualPitchFor('essentiel'),
      originalAnnualPrice: originalAnnualPriceFor('essentiel'),
      description: 'Pour démarrer avec une base claire de qualification et de suivi.',
      features: [
        { text: '50 dossiers / mois' },
        { text: 'Assistant web de qualification' },
        { text: 'Création automatique de dossiers projet' },
        { text: 'Tableau de bord artisan' },
        { text: 'Fiche projet détaillée' },
        { text: 'Suivi commercial simple' },
        { text: 'Devis — 10 devis/mois' },
        { text: 'Appels vocaux — 10 appels/mois' },
        { text: 'Base clients' },
        { text: 'Site vitrine en option (+300 € HT one-shot)' },
        { text: 'Pipeline avancé', badge: 'Limité' },
        { text: 'Reporting avancé', badge: 'Limité' },
        { text: 'Export PDF', badge: 'Limité' },
        { text: 'Assistant vocal au-delà de 10 appels', badge: 'Limité' },
        { text: 'Valeur générée avancée', badge: 'Limité' },
        { text: 'Géolocalisation / frais de déplacement avancés', badge: 'Limité' },
      ],
      highlighted: false,
      cta: { label: "Commencer l'essai gratuit", href: '/register', primary: true },
      checkout: { plan: 'essentiel', interval: checkoutIntervalFor() },
    },
    {
      slug: 'performance',
      name: 'Performance',
      price: priceFor('performance'),
      priceSize: 'text-5xl',
      period: periodFor(),
      priceNote: priceNoteFor('performance') ?? annualPitchFor('performance'),
      originalAnnualPrice: originalAnnualPriceFor('performance'),
      description: 'L’offre recommandée pour capter, qualifier, suivre et convertir plus de demandes.',
      features: [
        { text: 'Dossiers illimités' },
        { text: 'Devis illimités' },
        { text: 'Assistant web de qualification' },
        { text: 'Assistant vocal inclus selon quota' },
        { text: 'Tableau de bord complet' },
        { text: 'Valeur générée par Kadria' },
        { text: 'Suivi commercial avancé' },
        { text: 'Pipeline commercial' },
        { text: 'Priorités et actions à faire' },
        { text: 'Relances devis' },
        { text: 'Devis PDF — envoi, acceptation, refus' },
        { text: 'Catalogue de prestations' },
        { text: 'Modèles de devis' },
        { text: 'Frais de déplacement / estimation selon configuration' },
        { text: 'Base clients enrichie' },
        { text: 'Reporting avancé' },
        { text: 'Site vitrine en option (+300 € HT one-shot)' },
      ],
      highlighted: true,
      cta: { label: "Commencer l'essai gratuit", href: '/register', primary: true },
      checkout: { plan: 'performance', interval: checkoutIntervalFor() },
    },
    {
      slug: 'agence',
      name: 'Agence',
      price: 'Sur devis',
      priceSize: 'text-[28px]',
      period: '',
      description: 'Pour les équipes artisanales qui veulent centraliser plusieurs utilisateurs, numéros et volumes.',
      priceNote: "499 €/mois ou sur devis selon volume/besoins spécifiques.",
      features: [
        { text: 'Tout Performance inclus' },
        { text: 'Site vitrine inclus' },
        { text: 'Multi-utilisateurs' },
        { text: 'Multi-numéros' },
        { text: 'Quotas vocaux renforcés' },
        { text: 'Accompagnement prioritaire' },
        { text: 'Configuration avancée' },
        { text: 'Sur devis possible selon volume / besoins spécifiques' },
      ],
      highlighted: false,
      availabilityBadge: 'BIENTÔT DISPONIBLE',
      cta: { label: 'Nous contacter', href: '/contact', primary: false, disabled: true },
    },
  ];
}

const addonSiteVitrine = {
  title: WEBSITE_ADDON.headline,
  description: WEBSITE_ADDON.positioning,
  availabilityText: 'Disponible en option sur Essentiel et Performance — inclus dans Agence',
  features: WEBSITE_ADDON.features,
  mention: WEBSITE_ADDON.smallPrintNote,
  cta: { label: 'Ajouter le site vitrine', href: '/contact?sujet=addon-site' },
};

const pricingGuarantees = [
  { title: 'Sans engagement', subtitle: 'Résiliez à tout moment' },
  { title: 'Essai 7 jours', subtitle: 'Carte requise, aucun débit avant la fin de l\'essai' },
  { title: 'Support J+1', subtitle: 'Réponse sous 24h ouvrées' },
];

const pricingFaqQuick = [
  {
    question: 'Puis-je changer de plan ?',
    answer: 'Oui, à tout moment depuis votre espace client.',
  },
  {
    question: "L'essai gratuit inclut-il toutes les fonctionnalités ?",
    answer: 'Oui, accès complet au plan Performance pendant 7 jours.',
  },
  {
    question: "Que se passe-t-il après l'essai ?",
    answer:
      "Votre carte est débitée automatiquement à la fin des 7 jours, sauf si vous annulez avant — sans engagement.",
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
      ['Assistant vocal', '10 appels/mois', 'Quota étendu', '✓'],
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
      ['Génération de devis', '10 devis/mois', 'Illimité', 'Illimité'],
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
    category: 'Site vitrine',
    rows: [
      ['Site vitrine connecté à Kadria', 'En option (+300€ HT)', 'En option (+300€ HT)', 'Inclus'],
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

function SwipeHint({ label, className = '' }: { label: string; className?: string }) {
  return (
    <p className={`kr-swipe-hint flex items-center gap-1.5 text-green-500 ${className}`}>
      <ChevronLeft size={14} className="kr-swipe-arrow-left" />
      <span>{label}</span>
      <ChevronRight size={14} className="kr-swipe-arrow-right" />
    </p>
  );
}

export function PricingRoutePage() {
  const [billingMode, setBillingMode] = useState<BillingModeKey>('monthly');
  const [checkoutLoadingSlug, setCheckoutLoadingSlug] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<{ slug: string; message: string } | null>(null);
  const pricingPlanCards = buildPricingPlanCards(billingMode);
  const selectedAddon = WEBSITE_ADDON.oneShot;

  const handleCheckout = async (plan: PricingPlanCard) => {
    if (!plan.checkout) return;
    setCheckoutError(null);
    setCheckoutLoadingSlug(plan.slug);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.checkout.plan, interval: plan.checkout.interval }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/register?plan=${plan.checkout.plan}&interval=${plan.checkout.interval}`;
        return;
      }
      if (data.success && data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError({ slug: plan.slug, message: data.error || 'Une erreur est survenue.' });
    } catch {
      setCheckoutError({ slug: plan.slug, message: 'Une erreur est survenue.' });
    } finally {
      setCheckoutLoadingSlug(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <DarkNav />

      <main className="px-4 pt-[92px] sm:px-6 sm:pt-[100px]">
        <div className="mx-auto max-w-6xl">
          {/* HEADER */}
          <section className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-500">Tarifs</p>
            <h1 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight">
              Un tarif simple, <span className="text-green-500">adapté</span> à votre activité.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-zinc-400 sm:text-base">
              Sans engagement sur l’offre mensuelle. Résiliation à tout moment. Support inclus dès le premier jour.
            </p>

            <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 p-1.5">
              {(Object.keys(BILLING_MODES) as BillingModeKey[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setBillingMode(mode)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                    billingMode === mode
                      ? 'bg-green-500 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {BILLING_MODES[mode].shortLabel}
                  {BILLING_MODES[mode].discount > 0 && (
                    <span className="ml-1.5 text-[11px] font-bold text-current opacity-80">-15%</span>
                  )}
                </button>
              ))}
            </div>

            <p className="mx-auto mt-3 max-w-md text-xs text-zinc-500">
              {billingMode === 'monthly'
                ? 'Sans engagement — Facturation mensuelle.'
                : '-15 % — Paiement annuel en une fois — Engagement 12 mois.'}
            </p>
          </section>

          {/* GRILLE 3 PLANS */}
          <section className="mt-10 md:mt-12">
            <SwipeHint
              label="Faites glisser horizontalement pour comparer les formules"
              className="mb-4 justify-center text-xs md:hidden"
            />
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
              {pricingPlanCards.map((plan) => (
                <div
                  key={plan.slug}
                  className={`relative flex min-w-[calc(100vw-64px)] max-w-[360px] shrink-0 snap-start flex-col rounded-[20px] p-5 sm:p-6 md:min-w-0 md:max-w-none md:shrink lg:p-8 ${
                    plan.highlighted
                      ? 'border-2 border-green-500/30 bg-zinc-900 shadow-[0_0_40px_rgba(34,197,94,0.08)] md:scale-[1.02]'
                      : 'border border-zinc-800 bg-zinc-900'
                  }`}
                >
                  {(plan.highlighted || plan.availabilityBadge) && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {plan.highlighted && (
                        <span className="inline-flex items-center rounded-full bg-green-500 px-4 py-1.5 text-xs font-bold text-black">
                          LE PLUS POPULAIRE
                        </span>
                      )}
                      {plan.availabilityBadge && (
                        <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-4 py-1.5 text-xs font-semibold text-zinc-200">
                          {plan.availabilityBadge}
                        </span>
                      )}
                    </div>
                  )}

                  <h3 className="text-xl font-extrabold">{plan.name}</h3>

                  {plan.originalAnnualPrice && (
                    <p className="mt-3">
                      <span
                        className="text-base font-semibold"
                        style={{ textDecoration: 'line-through', opacity: 0.5, color: 'var(--text-2)' }}
                      >
                        {plan.originalAnnualPrice} / an
                      </span>
                    </p>
                  )}
                  <p className={plan.originalAnnualPrice ? 'mt-1' : 'mt-3'}>
                    <span className={`${plan.priceSize} font-black`}>{plan.price}</span>
                    {plan.period && <span className="text-base text-zinc-400"> {plan.period}</span>}
                    {plan.originalAnnualPrice && (
                      <span className="ml-2 text-sm font-bold text-green-500">-15%</span>
                    )}
                  </p>

                  {plan.priceNote && <p className="mt-2 text-sm leading-6 text-zinc-500">{plan.priceNote}</p>}
                  <p className="mb-5 mt-2 text-sm text-zinc-400 sm:mb-6">{plan.description}</p>

                  <div className="border-t border-zinc-800" />

                  <ul className="mt-5 flex flex-col gap-2.5 sm:gap-3">
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
                    {plan.cta.disabled ? (
                      <span className="block w-full cursor-not-allowed rounded-xl border border-zinc-800 bg-zinc-900/80 py-3 text-center text-sm font-semibold text-zinc-500 opacity-70">
                        {plan.cta.label}
                      </span>
                    ) : plan.checkout ? (
                      <button
                        type="button"
                        onClick={() => handleCheckout(plan)}
                        disabled={checkoutLoadingSlug === plan.slug}
                        className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                          plan.cta.primary
                            ? 'bg-green-500 font-bold text-black hover:bg-green-400'
                            : 'border border-zinc-800 font-semibold text-white hover:bg-zinc-800'
                        } ${checkoutLoadingSlug === plan.slug ? 'cursor-default opacity-70' : ''}`}
                      >
                        {checkoutLoadingSlug === plan.slug ? 'Redirection...' : plan.cta.label}
                      </button>
                    ) : (
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
                    )}
                    {checkoutError?.slug === plan.slug && (
                      <p className="mt-2 text-center text-xs text-red-400">{checkoutError.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ADD-ON SITE VITRINE */}
          <section id="addon" className="mx-auto mt-8 max-w-2xl rounded-[20px] border border-green-500/30 bg-green-500/[0.03] p-5 sm:p-8">
            <div className="flex flex-col items-start gap-8 md:flex-row md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-green-500">Add-on</p>
                <h3 className="mt-2 text-xl font-extrabold">{addonSiteVitrine.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{addonSiteVitrine.description}</p>
                <p className="mt-3 text-xs font-semibold text-green-500">{addonSiteVitrine.availabilityText}</p>

                <p className="mt-4">
                  <span className="text-3xl font-black text-green-500">{selectedAddon.label}</span>
                </p>
                <p className="mt-2 text-sm text-zinc-400">{selectedAddon.description}</p>

                <ul className="mt-4 flex flex-col gap-2">
                  {addonSiteVitrine.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <Check size={14} className="mt-0.5 flex-shrink-0 text-green-500" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-zinc-500">{addonSiteVitrine.mention}</p>
                <p className="mt-1 text-xs text-zinc-500">{WEBSITE_ADDON.agencyNote}</p>
                <p className="mt-3 text-xs font-semibold text-zinc-300">{WEBSITE_ADDON.checkoutMention}</p>
              </div>

              <div className="w-full md:min-w-[200px] md:w-auto">
                <Link
                  href={addonSiteVitrine.cta.href}
                  className="block w-full rounded-xl bg-green-500 px-6 py-3 text-center text-sm font-bold text-black transition-colors hover:bg-green-400"
                >
                  {addonSiteVitrine.cta.label}
                </Link>
                <p className="mt-2 text-center text-xs text-zinc-400">
                  Abonnement Kadria facturé séparément
                </p>
              </div>
            </div>
          </section>

          {/* GARANTIES */}
          <section className="mt-10 grid grid-cols-1 gap-5 text-center md:mt-12 md:grid-cols-3 md:gap-6">
            {pricingGuarantees.map((g) => (
              <div key={g.title} className="rounded-[18px] border border-zinc-800/80 bg-zinc-900/60 px-4 py-5">
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
            <div className="mt-8 space-y-3 md:hidden">
              <SwipeHint
                label="Faites glisser horizontalement pour comparer les formules"
                className="justify-center text-xs"
              />
              {comparatifCategories.map((group, index) => (
                <details
                  key={group.category}
                  className="group overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900/70 transition-colors group-open:border-green-500/30 group-open:bg-[rgba(10,25,18,0.92)]"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left marker:content-none">
                    <span className="text-sm font-semibold text-white">{group.category}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/80 text-zinc-400 transition-all group-open:border-green-500/30 group-open:bg-green-500/10 group-open:text-green-400">
                      <ChevronDown size={16} className="transition-transform duration-200 group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
                    <SwipeHint
                      label="Glissez pour voir Performance et Agence"
                      className="mb-3 text-[11px] font-medium"
                    />
                    <div className="relative">
                      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <table className="w-full min-w-[680px] text-left text-sm">
                      <thead>
                        <tr className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
                          <th className="w-[260px] px-4 py-3">Fonctionnalité</th>
                          <th className="w-[120px] px-4 py-3">Essentiel</th>
                          <th className="w-[140px] px-4 py-3 text-green-500">Performance</th>
                          <th className="w-[120px] px-4 py-3">Agence</th>
                        </tr>
                      </thead>
                      <tbody>
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
                      </tbody>
                        </table>
                      </div>
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent" />
                    </div>
                  </div>
                </details>
              ))}
            </div>
            <div className="mt-8 hidden overflow-x-auto rounded-xl border border-zinc-800 md:block">
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
          <section className="mx-auto mt-16 max-w-3xl pb-20 sm:pb-24">
            <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Questions fréquentes</h2>
            <div className="mt-8 space-y-4 sm:space-y-6">
              {pricingFaqQuick.map((faq) => (
                <div key={faq.question} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
                  <p className="font-semibold">{faq.question}</p>
                  <p className="mt-2 text-sm text-zinc-400">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* CTA FINAL */}
        <section className="border-t border-zinc-800 bg-zinc-900 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Arrêtez de perdre des opportunités.</h2>
            <p className="mt-5 text-base leading-7 text-zinc-400 md:text-lg">
              Mettez en place Kadria en quelques jours et ne laissez plus aucune demande sans suite.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-green-400 sm:w-auto">
                Tester Kadria <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/demo-request" className="inline-flex w-full items-center justify-center rounded-md border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 sm:w-auto">
                Réserver une démonstration
              </Link>
            </div>
            <Link href="/demo-dashboard" className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white">
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
        <RouteSectionTitle
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
            <PrimaryLink href="/demo-request">Reserver une demonstration</PrimaryLink>
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

