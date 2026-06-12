import Link from 'next/link';
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

export function LandingRoutePage() {
  return (
    <PageShell>
      <main className="pt-16">
        <section className="mx-auto grid min-h-[650px] max-w-[1488px] items-center gap-12 px-6 py-20 md:grid-cols-[1fr_0.9fr]">
          <div>
            <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
              Transformez chaque appel et chaque demande en <span className="text-primary">chantier potentiel.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-muted-foreground">
              Kadria repond a vos prospects 24h/24, comprend leur besoin, qualifie automatiquement
              leur projet et prepare un dossier pret a etre chiffre.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href="/assistant">Tester Kadria</PrimaryLink>
              <SecondaryLink href="/demo">Voir un exemple de dossier</SecondaryLink>
            </div>
            <div className="mt-16 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
              {['Mise en place rapide', 'Sans changement de numero', 'Support inclus'].map((item) => (
                <p key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {item}
                </p>
              ))}
            </div>
          </div>
          <LeadCard />
        </section>

        <section className="border-y border-white/5 py-16">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-6 text-center md:grid-cols-3">
            <Metric value="100 %" text="des demandes centralisees dans votre dashboard" />
            <Metric value="24/7" text="Kadria repond meme quand vous etes indisponible" />
            <Metric value="< 2 min" text="pour qualifier et structurer un projet complet" />
          </div>
        </section>

        <HowItWorksSection />
      </main>
    </PageShell>
  );
}

function Metric({ value, text }: { value: string; text: string }) {
  return (
    <div>
      <p className="text-4xl font-bold text-primary">{value}</p>
      <p className="mt-3 text-muted-foreground">{text}</p>
    </div>
  );
}

function HowItWorksSection() {
  const steps = [
    ['1', 'Le prospect vous contacte', 'Depuis votre site, votre telephone ou une campagne.'],
    ['2', 'Kadria qualifie le besoin', 'Questions utiles, budget, delai, adresse et contexte.'],
    ['3', 'Vous recevez un dossier', 'Un dossier clair, score, resume IA et prochaines actions.'],
  ];

  return (
    <section id="comment-ca-marche" className="mx-auto max-w-[1200px] px-6 py-24">
      <SectionTitle
        eyebrow="Comment ca marche"
        title="Un parcours simple pour ne plus laisser de prospects sans suite."
        text="Kadria transforme les demandes brutes en dossiers exploitables par votre equipe."
      />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {steps.map(([number, title, text]) => (
          <div key={number} className="card-premium p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {number}
            </span>
            <h3 className="mt-6 text-lg font-semibold">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </section>
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
  return (
    <PageShell>
      <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-32">
        <SectionTitle
          eyebrow="Tarifs"
          title="Choisissez l offre adaptee a votre volume de demandes."
          text="Des offres simples pour demarrer vite, puis monter en puissance avec le vocal et le reporting."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.slug} className={`card-premium p-6 ${plan.highlighted ? 'border-primary/40' : ''}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                {plan.highlighted && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Recommande</span>}
              </div>
              <p className="mt-5 text-4xl font-bold">{plan.price}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={`/checkout/${plan.slug}`} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
                Choisir cette offre
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </main>
    </PageShell>
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
