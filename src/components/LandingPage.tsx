import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, Phone, Globe, LayoutDashboard, PhoneOff, MessageSquareOff, UserX, FileX, AlertTriangle, Target, Zap, Check } from 'lucide-react';
import { KadriaLogoImg } from '@/components/KadriaLogo';
import HeroAnimation from '@/components/HeroAnimation';
import ROICalculator from '@/components/landing/ROICalculator';
import TradesExpanded from '@/components/landing/TradesExpanded';
import DashboardPreview from '@/components/landing/DashboardPreview';
import { SampleProjectButton, SampleProjectModal } from '@/components/landing/SampleProjectModal';
import LaunchProgram from '@/components/landing/Testimonials';
import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

export default function LandingPage() {
  const nav = useNavigate();
  const [sampleOpen, setSampleOpen] = useState(false);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const navHeight = 80; // 64px nav + 16px breathing room
      const y = el.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav nav={nav} scrollTo={scrollTo} openSample={() => setSampleOpen(true)} />
      <Hero nav={nav} />
      <Stats />
      <ProblemSection />
      <SolutionBlocks />
      <VocalSection />
      <HowItWorks />
      <DashboardPreview />
      <ROICalculator />
      <TradesExpanded />
      <LaunchProgram />
      <FinalCTA nav={nav} />
      <Footer />
      <SampleProjectModal open={sampleOpen} onOpenChange={setSampleOpen} />
    </div>
  );
}

/* ── Nav ── */
function Nav({ nav, scrollTo, openSample }: { nav: ReturnType<typeof useNavigate>; scrollTo: (id: string) => void; openSample: () => void }) {
  const navLinks = [
    { label: 'Comment ça marche', action: () => scrollTo('comment-ca-marche') },
    { label: 'Exemple de dossier', action: openSample },
    { label: 'Métiers', action: () => scrollTo('metiers') },
    { label: 'Tarifs', action: () => nav('/tarifs') },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <KadriaLogoImg />
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          {navLinks.map(l => (
            <button key={l.label} onClick={l.action} className="hover:text-foreground transition-colors">
              {l.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => nav('/pro')}>Connexion</Button>
          <Button variant="outline" size="sm" onClick={() => window.open('https://calendly.com', '_blank')} className="hidden sm:inline-flex">Réserver une démo</Button>
          <Button size="sm" onClick={() => nav('/demo')}>Tester Kadria</Button>
        </div>
      </div>
    </header>
  );
}

/* ── Hero ── */
function Hero({ nav }: { nav: ReturnType<typeof useNavigate> }) {
  const trustBadges = [
    'Mise en place rapide',
    'Sans changement de numéro',
    'Compatible web et téléphone',
    'Support inclus',
  ];

  return (
    <section className="pt-32 pb-20 lg:pb-28 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-8">
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight">
              Transformez chaque appel et chaque demande en <span className="text-primary">chantier potentiel.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              Kadria répond à vos prospects 24h/24, comprend leur besoin, qualifie automatiquement leur projet et prépare un dossier prêt à être chiffré.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => nav('/demo')} className="gap-2">
                Tester Kadria <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => window.open('https://calendly.com', '_blank')}>
                Réserver une démonstration
              </Button>
              <SampleProjectButton variant="ghost" size="lg" />
            </motion.div>

            {/* Trust badges */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              {trustBadges.map(b => (
                <span key={b} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-primary" />
                  {b}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }} className="lg:block">
            <HeroAnimation />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── Stats ── */
function Stats() {
  const items = [
    { value: '100 %', label: 'des demandes centralisées dans votre dashboard' },
    { value: '24/7', label: 'Kadria répond même quand vous êtes indisponible' },
    { value: '< 2 min', label: 'pour qualifier et structurer un projet complet' },
  ];
  return (
    <section className="py-20 border-t border-border/50">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8">
          {items.map((s, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center space-y-2">
              <span className="text-4xl font-bold text-primary">{s.value}</span>
              <p className="text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Problem Section ── */
function ProblemSection() {
  const problems = [
    { icon: PhoneOff, label: 'Appels manqués', desc: 'Sur chantier, en rendez-vous… vos prospects tombent sur la messagerie.' },
    { icon: MessageSquareOff, label: 'Demandes incomplètes', desc: '« Je voudrais un devis » — sans dimension, sans budget, sans photo.' },
    { icon: FileX, label: 'Messages oubliés', desc: 'Des demandes restent dans votre boîte mail sans réponse pendant des jours.' },
    { icon: UserX, label: 'Prospects non rappelés', desc: 'Vous oubliez de rappeler, le prospect signe chez un concurrent.' },
    { icon: AlertTriangle, label: "Manque d'informations", desc: '5 allers-retours avant d\'avoir ce qu\'il faut pour faire un devis.' },
  ];

  return (
    <section className="py-24 border-t border-border/50">
      <div className="container mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Chaque prospect non traité est un chantier <span className="text-destructive">perdu.</span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Chaque appel manqué, chaque demande oubliée, c'est un chantier qui signe ailleurs.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {problems.map((p, i) => (
              <motion.div key={i} variants={fadeUp} className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-destructive/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <p.icon className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="font-semibold text-sm">{p.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Solution 3 Blocks ── */
function SolutionBlocks() {
  const blocks = [
    {
      icon: Globe,
      title: 'Assistant Web',
      desc: 'Répond aux visiteurs de votre site 24h/24. Collecte les informations du projet, qualifie la demande et crée automatiquement un dossier complet.',
      features: ['Disponible jour et nuit', 'Questions adaptées au métier', 'Photos et documents collectés'],
    },
    {
      icon: Phone,
      title: 'Assistant Vocal',
      desc: "Répond aux appels entrants et rappelle les appels manqués. Comprend le besoin du client et récupère toutes les informations nécessaires.",
      features: ['Répond quand vous êtes sur chantier', 'Conversation naturelle', 'Coordonnées et projet qualifiés'],
      highlight: true,
    },
    {
      icon: LayoutDashboard,
      title: 'Dashboard commercial',
      desc: 'Centralise tous vos prospects — web et téléphone — dans un tableau de bord unique. Priorisez, suivez et convertissez.',
      features: ['Vue unifiée des opportunités', 'Scoring automatique', 'Suivi des statuts et relances'],
    },
  ];

  return (
    <section id="solution" className="py-24 border-t border-border/50 scroll-mt-20">
      <div className="container mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">La solution</p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Votre assistant commercial, <span className="text-primary">disponible 24h/24.</span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Kadria répond, qualifie et organise automatiquement vos prospects — par téléphone et sur votre site.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {blocks.map((b, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className={`rounded-2xl border p-6 md:p-7 space-y-4 transition-colors ${
                  b.highlight ? 'border-primary/40 bg-card' : 'border-border bg-card/80'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${b.highlight ? 'bg-primary text-primary-foreground' : 'bg-primary/10'}`}>
                  <b.icon className={`w-5 h-5 ${b.highlight ? '' : 'text-primary'}`} />
                </div>
                <h3 className="font-semibold text-lg">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                <ul className="space-y-2 pt-2">
                  {b.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-secondary-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Vocal Section ── */
function VocalSection() {
  const conversation = [
    { role: 'assistant', text: "Bonjour, vous êtes bien chez Martin Rénovation. Comment puis-je vous aider ?" },
    { role: 'user', text: "Bonjour, je voudrais refaire ma salle de bain. C'est possible d'avoir un devis ?" },
    { role: 'assistant', text: "Bien sûr. Pour préparer un devis précis, j'aurais quelques questions. Quelle est la surface de votre salle de bain ?" },
    { role: 'user', text: "Environ 7 m². C'est au premier étage." },
    { role: 'assistant', text: "Parfait. Avez-vous un budget en tête pour ces travaux ?" },
    { role: 'user', text: "Entre 8 000 et 12 000 euros." },
    { role: 'assistant', text: "Très bien. Je vais transmettre votre demande à M. Martin avec toutes ces informations. Il vous recontactera rapidement. Puis-je avoir votre numéro ?" },
  ];

  const capabilities = [
    'Répond naturellement au téléphone',
    'Comprend le besoin du client',
    'Pose les bonnes questions',
    'Récupère les coordonnées',
    'Qualifie le projet automatiquement',
    'Crée un dossier dans le dashboard',
  ];

  return (
    <section className="py-24 border-t border-border/50">
      <div className="container mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">Nouveau</p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Ne perdez plus jamais <span className="text-primary">un appel.</span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Lorsque vous êtes sur un chantier, en rendez-vous ou indisponible, Kadria répond à votre place.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div variants={fadeUp} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium">Appel entrant — 14h32</span>
                <span className="text-xs text-muted-foreground ml-auto">2 min 15s</span>
              </div>
              <div className="p-5 space-y-3 max-h-[420px] overflow-y-auto">
                {conversation.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-muted text-foreground'
                        : 'bg-primary/10 text-secondary-foreground'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col justify-center space-y-6">
              <h3 className="text-xl font-semibold">L'assistant vocal Kadria :</h3>
              <ul className="space-y-4">
                {capabilities.map(c => (
                  <li key={c} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-secondary-foreground">{c}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 mt-2">
                <Button size="lg" onClick={() => window.open('https://calendly.com', '_blank')} className="gap-2">
                  Voir une démonstration <ArrowRight className="w-4 h-4" />
                </Button>
                <SampleProjectButton variant="outline" size="lg" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── How it works ── */
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Le prospect appelle ou visite votre site', desc: "Il tombe sur Kadria qui l'accueille professionnellement, à toute heure.", icon: Phone },
    { n: '02', title: 'Kadria pose les bonnes questions', desc: 'Métier, surface, budget, délai, photos… tout est collecté dans la conversation.', icon: Target },
    { n: '03', title: 'Le dossier projet est créé automatiquement', desc: 'Les informations sont structurées, scorées et centralisées dans votre dashboard.', icon: CheckCircle },
    { n: '04', title: 'Vous recevez une demande prête à être chiffrée', desc: "Tout est là. Vous décidez en 30 secondes si vous donnez suite.", icon: Zap },
  ];

  return (
    <section id="comment-ca-marche" className="py-24 border-t border-border/50 scroll-mt-20">
      <div className="container mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Comment ça fonctionne</h2>
            <p className="text-muted-foreground mt-3">Quatre étapes pour ne plus jamais perdre une opportunité.</p>
          </motion.div>

          <div className="space-y-8">
            {steps.map((s, i) => (
              <motion.div key={i} variants={fadeUp} className="flex gap-6 items-start">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-primary">{s.n}</span>
                    <h3 className="font-semibold">{s.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Final CTA ── */
function FinalCTA({ nav }: { nav: ReturnType<typeof useNavigate> }) {
  return (
    <section className="py-24 border-t border-border/50">
      <div className="container mx-auto px-6 text-center max-w-2xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold">
            Arrêtez de perdre des opportunités.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground mt-4 text-lg leading-relaxed">
            Kadria répond aux prospects à votre place, qualifie leurs besoins et vous livre des dossiers prêts à être traités.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => nav('/demo')} className="gap-2">
              Tester Kadria <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.open('https://calendly.com', '_blank')}>
              Réserver une démonstration
            </Button>
            <SampleProjectButton variant="ghost" size="lg" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="border-t border-border/50 py-8">
      <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <KadriaLogoImg />
        <span>© {new Date().getFullYear()} Kadria — Assistant commercial pour artisans</span>
      </div>
    </footer>
  );
}
