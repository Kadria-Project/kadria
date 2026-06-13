'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Euro,
  FileText,
  Globe,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Phone,
  Rocket,
  Search,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { KadriaLogoImg } from '@/src/components/KadriaLogo';
import ChatWidget from '@/src/components/ChatWidget';
import PricingQuiz from '@/src/components/PricingQuiz';

const ShaderGradientCanvas = dynamic(
  () => import('@shadergradient/react').then((m) => m.ShaderGradientCanvas),
  { ssr: false }
);
const ShaderGradient = dynamic(
  () => import('@shadergradient/react').then((m) => m.ShaderGradient),
  { ssr: false }
);

const kadriaGradientProps = {
  animate: 'on',
  axesHelper: 'off',
  brightness: 1.2,
  cAzimuthAngle: 180,
  cDistance: 3.6,
  cPolarAngle: 90,
  cameraZoom: 1,
  color1: '#32ae74',
  color2: '#111516',
  color3: '#32ae74',
  destination: 'onCanvas',
  embedMode: 'off',
  envPreset: 'city',
  fov: 45,
  frameRate: 10,
  grain: 'on',
  lightType: 'env',
  pixelDensity: 1,
  positionX: -1.4,
  positionY: 0,
  positionZ: 0,
  reflection: 0.1,
  rotationX: 0,
  rotationY: 10,
  rotationZ: 50,
  shader: 'defaults',
  type: 'waterPlane',
  uAmplitude: 1,
  uDensity: 1.3,
  uFrequency: 5.5,
  uSpeed: 0.2,
  uStrength: 4,
  uTime: 0,
  wireframe: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

function KadriaGradient() {
  return (
    <ShaderGradientCanvas style={{ width: '100%', height: '100%' }}>
      <ShaderGradient {...kadriaGradientProps} />
    </ShaderGradientCanvas>
  );
}

function KadriaGradientBackground({ opacity }: { opacity: number }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      zIndex: 0, opacity,
      pointerEvents: 'none',
    }}>
      <KadriaGradient />
    </div>
  );
}

const features = [
  {
    icon: Globe,
    title: 'Assistant web',
    text: 'Qualifie chaque demande entrante, collecte le besoin, le budget, les delais et cree un dossier complet.',
  },
  {
    icon: Phone,
    title: 'Assistant vocal',
    text: 'Repond aux appels quand vous etes indisponible et transforme les appels manques en opportunites.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard commercial',
    text: 'Centralise vos prospects, statuts, relances, priorites et chiffre d affaires potentiel.',
  },
  {
    icon: Target,
    title: 'Priorisation IA',
    text: 'Classe les dossiers par potentiel commercial pour traiter d abord les meilleurs chantiers.',
  },
  {
    icon: ClipboardCheck,
    title: 'Dossiers structures',
    text: 'Resume IA, coordonnees, adresse, metier, budget, delai et score de completude au meme endroit.',
  },
  {
    icon: BarChart3,
    title: 'Pilotage',
    text: 'Suit vos conversions, paniers moyens, dossiers a relancer et opportunites gagnees.',
  },
];

const plans = [
  {
    slug: 'essentiel',
    name: 'Essentiel',
    price: '149 €',
    description: 'Pour centraliser et qualifier vos demandes web.',
    features: ['Assistant web', 'Dashboard prospects', 'Resume IA', 'Relances manuelles'],
  },
  {
    slug: 'performance',
    name: 'Performance',
    price: '249 €',
    description: 'Pour ne plus perdre les demandes et appels importants.',
    features: ['Tout Essentiel', 'Assistant vocal', 'Priorisation IA', 'Reporting avance'],
    highlighted: true,
  },
  {
    slug: 'kadria360',
    name: 'Kadria 360',
    price: 'Sur mesure',
    description: 'Pour une mise en place complete, site, vocal et suivi.',
    features: ['Site connecte', 'Parcours sur mesure', 'Accompagnement', 'Support prioritaire'],
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
    { label: 'Fonctionnalites', href: '/fonctionnalites' },
    { label: 'Demo', href: '/demo' },
    { label: 'Tarifs', href: '/tarifs' },
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-[#0a0b0f]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1488px] items-center justify-between px-6">
        <KadriaLogoImg />

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
          <Link href="/assistant" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
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
        <KadriaLogoImg />
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
  { icon: '👤', title: 'Prospect', subtitle: 'Vous contacte via votre site ou téléphone' },
  { icon: '🌐', title: 'Site web ou téléphone', subtitle: 'Le prospect arrive sur Kadria' },
  { icon: '⚡', title: 'Kadria qualifie', subtitle: 'Budget, délai, adresse, coordonnées...' },
  { icon: '📋', title: 'Dossier scoré', subtitle: 'Complet, structuré, prêt à chiffrer' },
  { icon: '✅', title: 'Artisan notifié', subtitle: 'Dossier reçu — action immédiate' },
];

const DOSSIER_FIELDS: [string, string, string][] = [
  ['🏗️', 'PROJET', 'Rénovation salle de bain'],
  ['📍', 'VILLE', 'Lyon 3e'],
  ['💶', 'BUDGET', '8 000 – 12 000 €'],
  ['⏱', 'DÉLAI', 'Sous 1 mois'],
];

function QualificationShowcase() {
  const [activeStep, setActiveStep] = useState(0);
  const [showDossier, setShowDossier] = useState(false);

  useEffect(() => {
    if (showDossier) {
      const timeout = setTimeout(() => {
        setShowDossier(false);
        setActiveStep(0);
      }, 4000);

      return () => clearTimeout(timeout);
    }

    if (activeStep === 4) {
      const timeout = setTimeout(() => setShowDossier(true), 500);

      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(() => setActiveStep((step) => step + 1), 2000);

    return () => clearTimeout(timeout);
  }, [activeStep, showDossier]);

  if (showDossier) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
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
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">Nouveau</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-800 p-3">
          {DOSSIER_FIELDS.map(([icon, label, value]) => (
            <div key={label}>
              <p className="text-xs text-zinc-400">
                {icon} {label}
              </p>
              <p className="mt-1 text-sm font-medium text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-green-500">✦ Analyse Kadria</p>
            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">🔥 Prospect chaud</span>
          </div>
          <p className="mt-2 text-xs italic text-zinc-300">
            Rénovation complète SDB 7m². Budget cohérent, délai court.
            Prêt à démarrer — rappel recommandé sous 24h.
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="font-semibold text-green-400">Score 94%</span>
          <span className="text-zinc-500">·</span>
          <span className="text-green-300">Conversion Élevée</span>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-500">Reçu il y a 2 min</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-green-500">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Parcours de qualification
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {QUALIFICATION_STEPS.map((step, index) => {
          const isActive = index === activeStep;
          const isKadria = index === 2;

          const cardClass = isActive
            ? isKadria
              ? 'border-green-500 bg-green-500/20'
              : 'border-zinc-700 bg-zinc-800'
            : 'border-zinc-800/50 bg-transparent';

          const iconClass = isActive && isKadria
            ? 'bg-green-500 text-black rounded-lg'
            : '';

          const textClass = isActive ? 'text-white font-medium' : 'text-zinc-400';

          return (
            <div
              key={step.title}
              className={`flex items-center gap-3 rounded-md border px-4 py-3 transition-all duration-500 ${cardClass}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center text-lg ${iconClass}`}>
                {step.icon}
              </span>
              <div>
                <p className={`text-sm transition-colors duration-500 ${textClass}`}>{step.title}</p>
                <p className="text-xs text-zinc-500">{step.subtitle}</p>
              </div>
            </div>
          );
        })}
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


function DashboardCarousel() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const SLIDES = [
    { id: 'kpis', label: 'KPIs & Métriques', icon: '📊' },
    { id: 'projects', label: 'Liste des projets', icon: '📋' },
    { id: 'pipeline', label: 'Pipeline & Top opportunités', icon: '🏆' },
    { id: 'map', label: 'Chantiers géolocalisés', icon: '📍' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setActiveSlide(s => (s + 1) % SLIDES.length)
        setIsAnimating(false)
      }, 300)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const goTo = (i: number) => {
    setIsAnimating(true)
    setTimeout(() => {
      setActiveSlide(i)
      setIsAnimating(false)
    }, 300)
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Tab navigation */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '16px',
        background: '#18181b', borderRadius: '12px', padding: '4px',
        border: '1px solid #27272a',
      }}>
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => goTo(i)}
            style={{
              flex: 1,
              background: activeSlide === i ? '#09090b' : 'transparent',
              border: activeSlide === i ? '1px solid #27272a' : '1px solid transparent',
              borderRadius: '8px',
              padding: '8px 4px',
              color: activeSlide === i ? 'white' : '#71717a',
              fontSize: '11px',
              fontWeight: activeSlide === i ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{slide.icon}</span>
            <span style={{ display: 'none' }}>{slide.label}</span>
          </button>
        ))}
      </div>

      {/* Label slide actif */}
      <div style={{
        textAlign: 'center', marginBottom: '12px',
        height: '20px',
      }}>
        <span style={{
          color: '#22c55e', fontSize: '12px', fontWeight: 600,
          letterSpacing: '0.06em',
        }}>
          {SLIDES[activeSlide].icon} {SLIDES[activeSlide].label}
        </span>
      </div>

      {/* Slide container */}
      <div style={{
        background: '#18181b',
        border: '1px solid #27272a',
        borderRadius: '16px',
        overflow: 'hidden',
        opacity: isAnimating ? 0 : 1,
        transform: isAnimating ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}>
        {/* Header dashboard commun */}
        <div style={{
          background: '#09090b',
          padding: '10px 16px',
          borderBottom: '1px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ color: '#22c55e', fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              KADRIA PRO
            </p>
            <p style={{ color: 'white', fontSize: '13px', fontWeight: 700, margin: 0 }}>
              Tableau de bord
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['📊 Suivi commercial', '📅 Calendrier', '⚙️ Mon profil'].map(btn => (
              <div key={btn} style={{
                background: btn.startsWith('📊') ? '#22c55e' : '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '10px',
                color: btn.startsWith('📊') ? 'black' : '#a1a1aa',
                fontWeight: btn.startsWith('📊') ? 700 : 400,
              }}>
                {btn}
              </div>
            ))}
          </div>
        </div>

        {/* SLIDE 1 — KPIs */}
        {activeSlide === 0 && (
          <div style={{ padding: '16px' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px', marginBottom: '10px',
            }}>
              {[
                { label: 'CA potentiel', value: '29.5k €', icon: '€', color: '#22c55e', border: '#22c55e' },
                { label: 'Devis envoyés', value: '5.2k €', icon: '✈', color: '#60a5fa', border: '#3b82f6' },
                { label: 'Chantiers gagnés', value: '15.3k €', icon: '🏆', color: '#86efac', border: '#22c55e' },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  background: '#27272a',
                  border: `1px solid #27272a`,
                  borderTop: `2px solid ${kpi.border}`,
                  borderRadius: '10px',
                  padding: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#71717a', fontSize: '11px' }}>{kpi.label}</span>
                    <span style={{ color: kpi.color, fontSize: '12px' }}>{kpi.icon}</span>
                  </div>
                  <p style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}>
              {[
                { label: 'Taux de transformation', value: '25 %', border: '#a78bfa' },
                { label: 'Panier moyen', value: '4.9k €', border: '#fbbf24' },
                { label: 'Dossiers à relancer', value: '0', border: '#27272a' },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  background: '#27272a',
                  border: '1px solid #27272a',
                  borderTop: `2px solid ${kpi.border}`,
                  borderRadius: '10px',
                  padding: '12px',
                }}>
                  <span style={{ color: '#71717a', fontSize: '11px', display: 'block', marginBottom: '8px' }}>
                    {kpi.label}
                  </span>
                  <p style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 2 — Liste projets */}
        {activeSlide === 1 && (
          <div style={{ padding: '16px' }}>
            {/* Filtres */}
            <div style={{
              display: 'flex', gap: '8px', marginBottom: '12px',
            }}>
              <div style={{
                flex: 1, background: '#27272a', border: '1px solid #3f3f46',
                borderRadius: '8px', padding: '6px 12px',
                color: '#71717a', fontSize: '11px',
              }}>
                🔍 Rechercher un client, un projet...
              </div>
              {['Tous les statuts', 'Tous les métiers'].map(f => (
                <div key={f} style={{
                  background: '#27272a', border: '1px solid #3f3f46',
                  borderRadius: '8px', padding: '6px 12px',
                  color: '#71717a', fontSize: '11px', whiteSpace: 'nowrap',
                }}>
                  {f} ▾
                </div>
              ))}
            </div>
            {/* Header tableau */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '55px 65px 130px 1fr 80px 85px 70px 90px',
              padding: '6px 8px',
              borderBottom: '1px solid #27272a',
            }}>
              {['RÉF', 'REÇU', 'CLIENT', 'PROJET', 'VILLE', 'BUDGET', 'SCORE', 'STATUT'].map(h => (
                <span key={h} style={{ color: '#52525b', fontSize: '9px',
                  fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {h}
                </span>
              ))}
            </div>
            {/* Lignes */}
            {[
              { ref: 'recX0J', time: 'il y a 9h', initials: 'AD', color: '#22c55e',
                name: 'Antonin Dugautier', project: 'jardin / paysagisme',
                city: 'Lille', budget: '500–1 000 €', score: '100%',
                status: 'Gagné', statusBg: 'rgba(20,83,45,0.7)', statusColor: '#86efac' },
              { ref: 'recCSS', time: 'il y a 10h', initials: 'AD', color: '#22c55e',
                name: 'Antonin Dugautier', project: 'jardin / paysagisme',
                city: 'Annecy', budget: 'Moins de 2 000 €', score: '100%',
                status: 'À rappeler', statusBg: 'rgba(120,53,15,0.5)', statusColor: '#fbbf24' },
              { ref: 'recmR1', time: 'il y a 2j', initials: 'AT', color: '#3b82f6',
                name: 'Antonin Test', project: 'Test migration',
                city: 'Rouen', budget: '1 000–3 000 €', score: '100%',
                status: 'Nouveau', statusBg: '#27272a', statusColor: '#e4e4e7' },
              { ref: 'recGdq', time: 'il y a 3j', initials: 'LM', color: '#a855f7',
                name: 'Laurent Martin', project: 'Plomberie',
                city: 'Rouen', budget: '3 000–5 000 €', score: '95%',
                status: 'Devis envoyé', statusBg: 'rgba(30,58,95,0.5)', statusColor: '#60a5fa' },
              { ref: 'rec4IO', time: 'il y a 3j', initials: 'DD', color: '#f59e0b',
                name: 'Dugautier Dugautier', project: 'Paysagiste',
                city: 'Wisches', budget: '1 000–3 000 €', score: '90%',
                status: 'Qualifié', statusBg: 'rgba(20,83,45,0.5)', statusColor: '#4ade80' },
            ].map((row, i) => (
              <div key={row.ref} style={{
                display: 'grid',
                gridTemplateColumns: '55px 65px 130px 1fr 80px 85px 70px 90px',
                padding: '8px',
                borderBottom: '1px solid rgba(39,39,42,0.5)',
                alignItems: 'center',
                background: i % 2 === 0 ? 'transparent' : 'rgba(39,39,42,0.2)',
              }}>
                <span style={{ color: '#52525b', fontSize: '10px', fontFamily: 'monospace' }}>
                  {row.ref}
                </span>
                <span style={{ color: '#71717a', fontSize: '10px' }}>{row.time}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: row.color, color: 'black',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '9px', fontWeight: 700, flexShrink: 0,
                  }}>
                    {row.initials}
                  </div>
                  <span style={{ color: 'white', fontSize: '11px', fontWeight: 600 }}>
                    {row.name}
                  </span>
                </div>
                <span style={{ color: '#a1a1aa', fontSize: '11px' }}>{row.project}</span>
                <span style={{ color: '#a1a1aa', fontSize: '11px' }}>{row.city}</span>
                <span style={{ color: '#a1a1aa', fontSize: '10px' }}>{row.budget}</span>
                <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: 700 }}>
                  {row.score}
                </span>
                <span style={{
                  background: row.statusBg,
                  color: row.statusColor,
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontWeight: 600,
                  display: 'inline-block',
                }}>
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* SLIDE 3 — Pipeline + Top opportunités */}
        {activeSlide === 2 && (
          <div style={{ padding: '16px', display: 'grid',
            gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Pipeline */}
            <div>
              <p style={{ color: 'white', fontSize: '13px', fontWeight: 600,
                margin: '0 0 10px' }}>Pipeline</p>
              {[
                { status: 'Nouveau', count: 1, color: '#e4e4e7', pct: 14 },
                { status: 'À rappeler', count: 1, color: '#fbbf24', pct: 14 },
                { status: 'Qualifié', count: 1, color: '#4ade80', pct: 14 },
                { status: 'Devis envoyé', count: 2, color: '#60a5fa', pct: 28 },
                { status: 'Gagné', count: 2, color: '#86efac', pct: 28 },
              ].map(item => (
                <div key={item.status} style={{
                  background: '#27272a', borderRadius: '8px',
                  padding: '8px 12px', marginBottom: '6px',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                      marginBottom: '4px' }}>
                      <span style={{ color: item.color, fontSize: '12px' }}>
                        {item.status}
                      </span>
                      <span style={{
                        background: `${item.color}22`,
                        color: item.color,
                        borderRadius: '10px', padding: '1px 8px',
                        fontSize: '11px', fontWeight: 700,
                      }}>
                        {item.count}
                      </span>
                    </div>
                    <div style={{ height: '3px', background: '#3f3f46',
                      borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${item.pct}%`,
                        background: item.color, borderRadius: '2px',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Top opportunités */}
            <div>
              <p style={{ color: 'white', fontSize: '13px', fontWeight: 600,
                margin: '0 0 10px' }}>🏆 Top opportunités</p>
              {[
                { rank: '#1', score: 240, name: 'Laurent Martin',
                  sub: 'Plomberie · Rouen',
                  status: 'Devis envoyé', statusColor: '#60a5fa',
                  statusBg: 'rgba(30,58,95,0.5)', budget: '3 000–5 000 €' },
                { rank: '#2', score: 230, name: 'Antonin Dugautier',
                  sub: 'jardin / paysagisme · Annecy',
                  status: 'À rappeler', statusColor: '#fbbf24',
                  statusBg: 'rgba(120,53,15,0.5)', budget: 'Moins de 2 000 €' },
                { rank: '#3', score: 230, name: 'Antonin Test',
                  sub: 'Test migration · Rouen',
                  status: 'Nouveau', statusColor: '#e4e4e7',
                  statusBg: '#27272a', budget: '1 000–3 000 €' },
              ].map(opp => (
                <div key={opp.name} style={{
                  background: '#27272a', border: '1px solid #3f3f46',
                  borderRadius: '10px', padding: '10px', marginBottom: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    marginBottom: '4px' }}>
                    <span style={{ color: '#22c55e', fontSize: '10px',
                      fontWeight: 700 }}>
                      {opp.rank}
                    </span>
                    <span style={{ color: '#22c55e', fontSize: '11px',
                      fontWeight: 700 }}>
                      {opp.score}
                    </span>
                  </div>
                  <p style={{ color: 'white', fontSize: '12px',
                    fontWeight: 600, margin: '0 0 2px' }}>
                    {opp.name}
                  </p>
                  <p style={{ color: '#71717a', fontSize: '10px', margin: '0 0 6px' }}>
                    {opp.sub}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{
                      background: opp.statusBg, color: opp.statusColor,
                      borderRadius: '10px', padding: '2px 8px',
                      fontSize: '10px', fontWeight: 600,
                    }}>
                      {opp.status}
                    </span>
                    <span style={{ color: '#71717a', fontSize: '10px' }}>
                      {opp.budget}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 4 — Carte */}
        {activeSlide === 3 && (
          <div style={{ padding: '16px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '12px',
            }}>
              <div>
                <p style={{ color: 'white', fontSize: '13px',
                  fontWeight: 600, margin: '0 0 2px' }}>
                  📍 Chantiers autour de vous
                </p>
                <p style={{ color: '#71717a', fontSize: '11px', margin: 0 }}>
                  Vue géographique simplifiée des prospects qualifiés
                </p>
              </div>
              <span style={{
                background: '#27272a', color: '#a1a1aa',
                borderRadius: '8px', padding: '4px 10px', fontSize: '11px',
              }}>
                7 point(s)
              </span>
            </div>
            {/* Carte SVG France stylisée */}
            <div style={{
              background: '#27272a', borderRadius: '12px',
              overflow: 'hidden', position: 'relative',
              height: '220px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 400 320" style={{ width: '100%', height: '100%' }}>
                {/* Fond carte */}
                <rect width="400" height="320" fill="#1f1f23" />
                {/* Silhouette France simplifiée */}
                <path
                  d="M 120 40 L 180 30 L 240 45 L 280 70 L 310 100 L 320 140
                     L 300 180 L 280 220 L 240 260 L 200 280 L 160 270
                     L 120 240 L 90 200 L 70 160 L 80 120 L 100 80 Z"
                  fill="#27272a"
                  stroke="#3f3f46"
                  strokeWidth="1.5"
                />
                {/* Points chantiers */}
                {[
                  { x: 185, y: 110, city: 'Lille' },
                  { x: 210, y: 135, city: 'Paris' },
                  { x: 230, y: 155, city: 'Rouen' },
                  { x: 175, y: 175, city: 'Annecy' },
                  { x: 145, y: 200, city: 'Bordeaux' },
                  { x: 190, y: 215, city: 'Lyon' },
                  { x: 160, y: 140, city: 'Mesnil-Raoul' },
                ].map((point, i) => (
                  <g key={i}>
                    <circle
                      cx={point.x} cy={point.y} r="8"
                      fill="#22c55e" opacity="0.2"
                    />
                    <circle
                      cx={point.x} cy={point.y} r="5"
                      fill="#22c55e"
                    />
                    <text
                      x={point.x + 8} y={point.y + 4}
                      fill="#a1a1aa" fontSize="9"
                      fontFamily="system-ui"
                    >
                      {point.city}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            {/* Liste prospects */}
            <div style={{ marginTop: '12px', display: 'flex',
              flexDirection: 'column', gap: '6px' }}>
              {[
                { name: 'Antonin Dugautier', sub: 'jardin / paysagisme · Lille' },
                { name: 'Laurent Martin', sub: 'Plomberie · Rouen' },
                { name: 'Antonin Test', sub: 'Test migration · Rouen' },
              ].map(item => (
                <div key={item.name} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 10px', background: '#27272a', borderRadius: '8px',
                }}>
                  <span style={{ color: '#22c55e', fontSize: '12px' }}>📍</span>
                  <div>
                    <p style={{ color: 'white', fontSize: '11px',
                      fontWeight: 600, margin: 0 }}>
                      {item.name}
                    </p>
                    <p style={{ color: '#71717a', fontSize: '10px', margin: 0 }}>
                      {item.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div style={{
          display: 'flex', gap: '4px', padding: '10px 16px',
          borderTop: '1px solid #27272a', background: '#09090b',
        }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => goTo(i)}
              style={{
                flex: 1, height: '3px', borderRadius: '2px',
                background: i === activeSlide ? '#22c55e' : '#27272a',
                cursor: 'pointer', transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
export function LandingRoutePage() {
  const [selectedTrade, setSelectedTrade] = useState<string | null>(TRADES_DATA[0].id);
  const [lastTradeId, setLastTradeId] = useState(TRADES_DATA[0].id);
  const [tradeCardVisible, setTradeCardVisible] = useState(true);
  const displayTrade = TRADES_DATA.find((m) => m.id === lastTradeId);

  useEffect(() => {
    if (selectedTrade) {
      setLastTradeId(selectedTrade);
      setTradeCardVisible(false);
      const timeout = setTimeout(() => setTradeCardVisible(true), 20);
      return () => clearTimeout(timeout);
    }

    setTradeCardVisible(false);
  }, [selectedTrade]);

  const problemes = [
    {
      icon: '🔧',
      title: 'Appels manqués sur chantier',
      text: 'Vos prospects tombent sur messagerie et rappellent un concurrent.',
    },
    {
      icon: '📋',
      title: 'Demandes sans informations',
      text: '« Je voudrais un devis » — sans surface, budget ni photo.',
    },
    {
      icon: '⏰',
      title: 'Relances oubliées',
      text: 'Un prospect non rappelé sous 24h signe ailleurs dans 70% des cas.',
    },
    {
      icon: '🔁',
      title: 'Qualification chronophage',
      text: '5 allers-retours pour obtenir ce qu il faut pour faire un devis.',
    },
    {
      icon: '💸',
      title: 'CA potentiel perdu',
      text: 'Chaque demande non traitée représente un chantier qui part chez un concurrent.',
    },
  ];

  const solutions = [
    {
      icon: '🌐',
      title: 'Assistant Web',
      items: [
        'Disponible 24h/24, 7j/7',
        'Questions adaptées à votre métier',
        'Photos et adresse collectées automatiquement',
        'Dossier créé et scoré instantanément',
      ],
    },
    {
      icon: '📞',
      title: 'Assistant Vocal',
      badge: 'NOUVEAU',
      items: [
        'Répond à vos appels entrants manqués',
        'Qualification complète par téléphone',
        'Même dossier que le chat web',
        'Aucun changement de numéro requis',
      ],
    },
    {
      icon: '📊',
      title: 'Dashboard Commercial',
      items: [
        'Tous vos prospects en un seul endroit',
        'Scoring automatique par IA Kadria',
        'Relances et calendrier intégrés',
        'Accès depuis mobile et desktop',
      ],
    },
  ];

  const etapes = [
    {
      number: '01',
      title: 'Le prospect vous contacte',
      text: 'Il appelle ou visite votre site — Kadria répond immédiatement, à toute heure.',
    },
    {
      number: '02',
      title: 'Kadria pose les bonnes questions',
      text: 'Métier, surface, budget, délai, adresse, photos — tout est collecté naturellement.',
    },
    {
      number: '03',
      title: 'Le dossier est créé automatiquement',
      text: 'Les informations sont structurées, scorées et analysées par l IA Kadria en moins de 3 minutes.',
    },
    {
      number: '04',
      title: 'Vous recevez une demande prête à chiffrer',
      text: 'Dossier complet dans votre dashboard + notification email immédiate. Décidez en 30 secondes.',
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* NAV */}
      <DarkNav />

      <main>
        {/* HERO */}
        <div style={{ position: 'relative', overflow: 'hidden', background: '#09090b' }}>
          <KadriaGradientBackground opacity={0.15} />
          <section className="relative z-10 mx-auto grid max-w-[1280px] gap-12 px-6 py-20 md:grid-cols-2 md:items-center">
            <div>
              <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
                Transformez chaque demande en
                <br />
                <span className="text-green-500">chantier qualifié.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-7 text-zinc-400">
                Kadria qualifie vos prospects 24h/24 — par téléphone et sur votre site.
                Chaque conversation devient un dossier complet, scoré et prêt à être chiffré.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/assistant" className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-green-400">
                  Tester Kadria <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/demo-request" className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800">
                  Réserver une démonstration
                </Link>
              </div>
              <Link href="/demo" className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white">
                👁 Voir un exemple de dossier
              </Link>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-400">
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

            <QualificationShowcase />
          </section>
        </div>

        {/* STATS */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <KadriaGradientBackground opacity={0.1} />
          <section className="relative z-10 border-y border-zinc-800 bg-zinc-900 py-16">
            <div className="mx-auto grid max-w-[1280px] gap-8 px-6 text-center md:grid-cols-3">
              {[
                ['100%', 'des demandes centralisées dans votre dashboard'],
                ['24h/24', 'Kadria répond même quand vous êtes indisponible'],
                ['< 3 min', 'pour qualifier et structurer un projet complet'],
              ].map(([value, text]) => (
                <div key={value}>
                  <p className="text-4xl font-bold text-green-500">{value}</p>
                  <p className="mt-3 text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* PROBLEME */}
        <section className="mx-auto max-w-[1280px] px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Chaque prospect non traité est un chantier <span className="text-red-500">perdu.</span>
            </h2>
            <p className="mt-5 text-base leading-7 text-zinc-400 md:text-lg">
              Sans système de qualification automatique, une partie de vos demandes ne se transforme jamais en chantier.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {problemes.map((p) => (
              <div key={p.title} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <span className="text-2xl text-red-500">{p.icon}</span>
                <h3 className="mt-4 text-base font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SOLUTION */}
        <section className="mx-auto max-w-[1280px] px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-500">La solution</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
              Votre assistant commercial, <span className="text-green-500">disponible 24h/24.</span>
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {solutions.map((s) => (
              <div key={s.title} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{s.icon}</span>
                  {s.badge && (
                    <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-green-400">
                      {s.badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <ul className="mt-4 space-y-3">
                  {s.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm leading-6 text-zinc-400">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* COMMENT CA MARCHE */}
        <section id="comment-ca-marche" className="mx-auto max-w-[1280px] px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Comment ça fonctionne</h2>
            <p className="mt-5 text-base leading-7 text-zinc-400 md:text-lg">
              Kadria transforme les demandes brutes en dossiers exploitables par votre équipe, du premier
              contact au dossier prêt à chiffrer.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {etapes.map((e) => (
              <div key={e.number} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-green-500">
                  {e.number}
                </span>
                <h3 className="mt-4 text-base font-semibold">{e.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{e.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* DASHBOARD PREVIEW */}
        <section style={{ padding: '80px 0' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <p style={{
                color: '#22c55e', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                margin: '0 0 12px',
              }}>
                DASHBOARD
              </p>
              <h2 style={{
                color: 'white', fontSize: '36px', fontWeight: 800,
                margin: '0 0 12px', lineHeight: 1.2,
              }}>
                Pilotez toutes vos opportunités depuis{' '}
                <span style={{ color: '#22c55e' }}>un seul tableau de bord</span>
              </h2>
              <p style={{ color: '#71717a', fontSize: '16px', margin: 0 }}>
                Web, téléphone, rappels et projets qualifiés — centralisés au même endroit.
              </p>
            </div>
            <div style={{ maxWidth: '780px', margin: '0 auto' }}>
              <DashboardCarousel />
            </div>
          </div>
        </section>

        {/* SIMULATEUR */}
        <SimulateurSection />

        {/* METIERS */}
        <section
          id="metiers"
          className="mx-auto max-w-[1280px] px-6 py-24"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTrade(null);
          }}
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Conçu pour chaque métier du bâtiment</h2>
            <p className="mt-5 text-base leading-7 text-zinc-400 md:text-lg">
              Kadria s adapte au vocabulaire et aux besoins de chaque corps de métier.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {TRADES_DATA.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedTrade((prev) => (prev === m.id ? null : m.id))}
                className={`w-28 cursor-pointer rounded-xl border p-4 text-center transition-colors ${
                  selectedTrade === m.id
                    ? 'border-green-500 bg-green-500/10 text-green-500'
                    : 'border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                <div className="mb-2 text-2xl">{m.emoji}</div>
                <div className="text-sm">{m.label}</div>
              </button>
            ))}
          </div>

          {displayTrade && (
            <div
              className={`mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-all duration-300 overflow-hidden ${
                selectedTrade !== null && tradeCardVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <h3 className="text-xl font-semibold text-white">
                {displayTrade.emoji} {displayTrade.label}
              </h3>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-zinc-800/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                    Types de projets qualifiés
                  </p>
                  <p className="mt-2 text-sm text-white">{displayTrade.types}</p>
                </div>

                <div className="rounded-lg bg-zinc-800/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                    Questions posées par Kadria
                  </p>
                  <p className="mt-2 text-sm text-white">{displayTrade.questions}</p>
                </div>

                <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-green-500">
                    Résultat
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    ✅ {displayTrade.resultat}
                  </p>
                </div>
              </div>

              <Link
                href="/demo"
                className="mt-6 inline-flex items-center gap-2 rounded-md border border-zinc-700 px-4 py-2 text-sm text-white transition-colors hover:bg-zinc-800"
              >
                Voir un exemple de conversation →
              </Link>
            </div>
          )}
        </section>

        {/* PROGRAMME LANCEMENT */}
        <section className="mx-auto max-w-[1280px] px-6 py-24">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 md:p-12">
            <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-green-400">
              Programme de lancement
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Programme de lancement <span className="text-green-500">Kadria</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
              Kadria est en cours de déploiement auprès d un nombre limité d artisans et d entreprises du bâtiment.
              Les premiers partenaires bénéficient d un accompagnement personnalisé pour configurer leur assistant,
              connecter leur site et leur ligne téléphonique, et adapter Kadria à leur métier.
            </p>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white">
              Vous souhaitez faire partie des premiers professionnels à tester Kadria ?
            </p>
            <Link href="/onboarding" className="mt-6 inline-flex items-center gap-2 rounded-md bg-green-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-green-400">
              Devenir partenaire pilote <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* CTA FINAL */}
        <div style={{ position: 'relative', overflow: 'hidden', background: '#09090b' }}>
          <KadriaGradientBackground opacity={0.15} />
          <section className="relative z-10 border-t border-zinc-800 py-24">
            <div className="mx-auto max-w-3xl px-6 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Arrêtez de perdre des opportunités.</h2>
              <p className="mt-5 text-base leading-7 text-zinc-400 md:text-lg">
                Mettez en place Kadria en quelques jours et ne laissez plus aucune demande sans suite.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/assistant" className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-green-400">
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
        </div>
      </main>

      {/* FOOTER */}
      <DarkFooter />
    </div>
  );
}

function DarkNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold">
          <span className="text-green-500">K</span>adria
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <Link href="/#comment-ca-marche" className="transition-colors hover:text-white">Comment ça marche</Link>
          <Link href="/demo" className="transition-colors hover:text-white">Exemple de dossier</Link>
          <Link href="/#metiers" className="transition-colors hover:text-white">Métiers</Link>
          <Link href="/tarifs" className="transition-colors hover:text-white">Tarifs</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/dashboard-v2" className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:inline-flex">
            Connexion
          </Link>
          <Link href="/demo-request" className="rounded-md border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800">
            Réserver une démo
          </Link>
          <Link href="/assistant" className="rounded-md bg-green-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-green-400">
            Tester Kadria
          </Link>
        </div>
      </div>
    </header>
  );
}

function DarkFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-900 py-12">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 text-sm text-zinc-400 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="text-lg font-bold text-white">
          <span className="text-green-500">K</span>adria
        </Link>
        <p>© 2025 Kadria. Tous droits réservés.</p>
        <div className="flex items-center gap-4">
          <Link href="/mentions-legales" className="transition-colors hover:text-white">Mentions légales</Link>
          <Link href="/cgu" className="transition-colors hover:text-white">CGU</Link>
          <Link href="/contact" className="transition-colors hover:text-white">Contact</Link>
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

export function PricingRoutePage() {
  const pricingPlans = [
    {
      slug: 'essentiel',
      name: 'Essentiel',
      monthly: 149,
      yearly: 119,
      description: 'Pour démarrer et ne plus manquer aucun appel.',
      features: [
        'Assistant chat web 24h/24',
        '50 dossiers qualifiés / mois',
        'Dashboard de suivi',
        'Scoring automatique',
        'Support email',
      ],
      cta: "Commencer l'essai gratuit",
      highlighted: false,
    },
    {
      slug: 'pro',
      name: 'Pro',
      monthly: 249,
      yearly: 199,
      description: "L'outil complet pour ne plus perdre aucune opportunité.",
      features: [
        'Tout Essentiel inclus',
        'Assistant vocal (appels entrants)',
        'Création de site web professionnel incluse',
        'Dossiers illimités',
        'CRM intégré + relances',
        'Export CSV',
        'Rappels automatiques',
        'Support prioritaire',
      ],
      cta: "Commencer l'essai gratuit",
      highlighted: true,
    },
    {
      slug: 'agence',
      name: 'Agence',
      monthly: null,
      yearly: null,
      description: "Pour les groupements et réseaux d'artisans.",
      features: [
        "Jusqu'à 10 artisans",
        'Marque blanche complète',
        'API access',
        'Dashboard multi-comptes',
        'Account manager dédié',
        'Onboarding personnalisé',
      ],
      cta: 'Nous contacter',
      highlighted: false,
    },
  ];

  const comparatif = [
    ['Assistant chat web', '✓', '✓', '✓'],
    ['Assistant vocal', '✗', '✓', '✓'],
    ['Création site web', '✗', '✓', '✓'],
    ['Dossiers / mois', '50', 'Illimités', 'Illimités'],
    ['Dashboard', 'Basique', 'Complet', 'Multi-comptes'],
    ['CRM + relances', '✗', '✓', '✓'],
    ['Export CSV', '✗', '✓', '✓'],
    ['API access', '✗', '✗', '✓'],
    ['Marque blanche', '✗', '✗', '✓'],
    ['Support', 'Email', 'Prioritaire', 'Account manager'],
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <DarkNav />

      <main>
        {/* HERO PRICING */}
        <section className="mx-auto max-w-[1280px] px-6 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-500">Tarifs</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Un seul outil. <span className="text-green-500">Zéro prospect perdu.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400 md:text-lg">
            Choisissez la formule adaptée à votre activité. Sans engagement, sans frais cachés.
          </p>

          <BillingToggle pricingPlans={pricingPlans} comparatif={comparatif} />
        </section>

        {/* QUIZ TARIFAIRE */}
        <section className="border-t border-zinc-800 bg-zinc-900 px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-500">Pas sûr de votre choix ?</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Trouvez l&apos;offre adaptée à votre activité
            </h2>
          </div>
          <div className="mt-10">
            <PricingQuiz showCTA={true} />
          </div>
        </section>

        {/* FAQ */}
        <PricingFaq />

        {/* CTA FINAL */}
        <section className="border-t border-zinc-800 bg-zinc-900 py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Arrêtez de perdre des opportunités.</h2>
            <p className="mt-5 text-base leading-7 text-zinc-400 md:text-lg">
              Mettez en place Kadria en quelques jours et ne laissez plus aucune demande sans suite.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/assistant" className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-green-400">
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
  const [demandes, setDemandes] = useState(10);
  const [part, setPart] = useState(40);
  const [valeur, setValeur] = useState(3000);
  const [marge, setMarge] = useState(25);

  const opportunitesPerdues = Math.round(demandes * 4 * (part / 100));
  const caPerdu = opportunitesPerdues * valeur;
  const margePerdue = caPerdu * (marge / 100);
  const valeurNum = Number(valeur);
  const breakeven = valeurNum > 0 ? Math.max(1, Math.ceil(249 / valeurNum)) : 1;

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-green-500">Simulateur</p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
          Combien de chantiers <span className="text-green-500">perdez-vous</span> chaque mois ?
        </h2>
        <p className="mt-5 text-base leading-7 text-zinc-400 md:text-lg">
          Estimez l impact financier des demandes non traitées ou mal qualifiées sur votre activité.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between text-sm">
              <label className="text-white">Demandes reçues par semaine</label>
              <span className="font-semibold text-green-500">{demandes}</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={demandes}
              onChange={(e) => setDemandes(Number(e.target.value))}
              className="mt-3 w-full accent-green-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <label className="text-white">Part non traitée ou mal qualifiée</label>
              <span className="font-semibold text-green-500">{part}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              value={part}
              onChange={(e) => setPart(Number(e.target.value))}
              className="mt-3 w-full accent-green-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <label className="text-white">Valeur moyenne d un chantier</label>
              <span className="font-semibold text-green-500">{valeur} €</span>
            </div>
            <input
              type="range"
              min={500}
              max={20000}
              step={100}
              value={valeur}
              onChange={(e) => setValeur(Number(e.target.value))}
              className="mt-3 w-full accent-green-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <label className="text-white">Marge nette moyenne</label>
              <span className="font-semibold text-green-500">{marge}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              value={marge}
              onChange={(e) => setMarge(Number(e.target.value))}
              className="mt-3 w-full accent-green-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-2xl font-bold text-white">{opportunitesPerdues}</p>
            <p className="mt-1 text-sm text-zinc-400">Opportunités perdues / mois</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-2xl font-bold text-white">{caPerdu.toLocaleString('fr-FR')} €</p>
            <p className="mt-1 text-sm text-zinc-400">CA potentiel perdu / mois</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-2xl font-bold text-white">{margePerdue.toLocaleString('fr-FR')} €</p>
            <p className="mt-1 text-sm text-zinc-400">Marge perdue / mois</p>
          </div>

          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
            <p className="text-sm font-semibold text-green-400">✓ Abonnement Kadria</p>
            <p className="mt-2 text-3xl font-bold text-white">249 €/mois</p>
            <p className="mt-2 text-sm text-zinc-400">
              Un seul chantier récupéré sur {breakeven} suffit à rentabiliser Kadria.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

interface PricingPlan {
  slug: string;
  name: string;
  monthly: number | null;
  yearly: number | null;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

function BillingToggle({
  pricingPlans,
  comparatif,
}: {
  pricingPlans: PricingPlan[];
  comparatif: string[][];
}) {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setAnnual(false)}
          className={`rounded-md px-5 py-2.5 text-sm font-medium transition-colors ${
            !annual ? 'bg-green-500 text-black' : 'border border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800'
          }`}
        >
          Mensuel
        </button>
        <button
          type="button"
          onClick={() => setAnnual(true)}
          className={`rounded-md px-5 py-2.5 text-sm font-medium transition-colors ${
            annual ? 'bg-green-500 text-black' : 'border border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800'
          }`}
        >
          Annuel
        </button>
        {annual && (
          <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
            2 mois offerts
          </span>
        )}
      </div>

      {/* PLANS */}
      <div className="mt-12 grid gap-6 text-left lg:grid-cols-3">
        {pricingPlans.map((plan) => (
          <div
            key={plan.slug}
            className={`relative rounded-xl bg-zinc-900 p-6 ${
              plan.highlighted ? 'border-2 border-green-500' : 'border border-zinc-800'
            }`}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-6 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-black">
                Le plus populaire
              </span>
            )}
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <p className="mt-5">
              {plan.monthly === null ? (
                <span className="text-4xl font-bold">Sur devis</span>
              ) : (
                <>
                  <span className="text-4xl font-bold">{annual ? plan.yearly : plan.monthly} €</span>
                  <span className="text-sm text-zinc-400"> / mois</span>
                </>
              )}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{plan.description}</p>
            <ul className="mt-6 space-y-3 text-sm">
              {plan.features.map((item) => (
                <li key={item} className="flex items-start gap-2 text-zinc-300">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/onboarding"
              className={`mt-8 inline-flex w-full items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold transition-colors ${
                plan.highlighted
                  ? 'bg-green-500 text-black hover:bg-green-400'
                  : 'border border-zinc-700 text-white hover:bg-zinc-800'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* COMPARATIF */}
      <div className="mt-24">
        <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Comparez les formules</h2>
        <div className="mt-10 overflow-hidden overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="bg-zinc-800 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3">Fonctionnalité</th>
                <th className="px-4 py-3">Essentiel</th>
                <th className="px-4 py-3">Pro</th>
                <th className="px-4 py-3">Agence</th>
              </tr>
            </thead>
            <tbody>
              {comparatif.map(([feature, essentiel, pro, agence]) => (
                <tr key={feature} className="border-b border-zinc-800/50 last:border-b-0">
                  <td className="px-4 py-3 font-medium text-white">{feature}</td>
                  {[essentiel, pro, agence].map((value, index) => (
                    <td key={index} className="px-4 py-3 text-zinc-400">
                      {value === '✓' ? (
                        <span className="text-green-500">✓</span>
                      ) : value === '✗' ? (
                        <span className="text-zinc-600">✗</span>
                      ) : (
                        value
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function PricingFaq() {
  const faqs = [
    {
      question: "Est-ce que je peux tester avant de m'engager ?",
      answer:
        'Oui. Chaque formule inclut un essai gratuit de 14 jours, sans carte bancaire requise. Vous pouvez annuler à tout moment.',
    },
    {
      question: "Comment Kadria s'intègre sur mon site ?",
      answer:
        "En copiant-collant une seule ligne de code. Notre équipe peut aussi s'en charger gratuitement lors de l'onboarding.",
    },
    {
      question: 'Que se passe-t-il si je dépasse mon quota de dossiers ?',
      answer:
        'Vous recevez une notification avant d atteindre la limite. Vous pouvez upgrader à tout moment ou passer au plan supérieur.',
    },
    {
      question: 'Mes données clients sont-elles sécurisées ?',
      answer:
        "Oui. Toutes les données sont hébergées en Europe, chiffrées, et vous en restez l'unique propriétaire. RGPD conforme.",
    },
    {
      question: "L'assistant vocal fonctionne-t-il avec mon numéro actuel ?",
      answer:
        'Oui. Nous redirigeons vos appels vers Kadria sans changer votre numéro. Vos clients appellent le même numéro qu avant.',
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Questions fréquentes</h2>
      </div>
      <div className="mx-auto mt-12 max-w-3xl space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={faq.question} className="rounded-xl border border-zinc-800 bg-zinc-900">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-sm font-semibold text-white"
              >
                {faq.question}
                <span className="text-green-500">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div className="px-6 pb-4 text-sm leading-6 text-zinc-400">{faq.answer}</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
