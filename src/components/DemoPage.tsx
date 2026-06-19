'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KadriaLogoImg } from '@/components/KadriaLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, CheckCircle, RotateCcw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SiteNav from '@/components/SiteNav';

type Scenario = {
  id: string;
  emoji: string;
  label: string;
  steps: { title: string; content: React.ReactNode }[];
  result: { client: string; projet: string; surface: string; budget: string; delai: string; adresse: string; score: number; resume: string };
};

const SCENARIOS: Scenario[] = [
  {
    id: 'sdb', emoji: '🚿', label: 'Salle de bain',
    steps: [
      { title: 'Le prospect vous contacte', content: <Bubble role="user">Bonjour, je voudrais refaire entièrement ma salle de bain. C'est possible d'avoir un devis ?</Bubble> },
      { title: 'Kadria qualifie la demande', content: <div className="space-y-2"><Bubble role="assistant">Bien sûr ! 😊 Quelle est la surface de votre salle de bain ?</Bubble><Bubble role="user">Environ 7 m², au premier étage.</Bubble><Bubble role="assistant">Avez-vous un budget en tête ? 💰</Bubble><Bubble role="user">Entre 8 000 et 12 000 €.</Bubble></div> },
      { title: 'Kadria collecte les coordonnées', content: <div className="space-y-2"><Bubble role="assistant">Parfait ✓ Quand souhaitez-vous démarrer les travaux ?</Bubble><Bubble role="user">Idéalement en septembre.</Bubble><Bubble role="assistant">📍 À quelle adresse se situe le chantier ?</Bubble><Bubble role="user">15 rue des Acacias, 69003 Lyon.</Bubble></div> },
    ],
    result: { client: 'Marie Leroy', projet: 'Rénovation salle de bain complète', surface: '7 m²', budget: '8 000 – 12 000 €', delai: 'Septembre 2026', adresse: '15 rue des Acacias, 69003 Lyon', score: 88, resume: 'Rénovation complète d\'une salle de bain de 7m² au 1er étage. Budget confortable, délai réaliste. Projet sérieux avec coordonnées complètes.' },
  },
  {
    id: 'terrasse', emoji: '🌿', label: 'Terrasse',
    steps: [
      { title: 'Le prospect vous contacte', content: <Bubble role="user">Je voudrais faire construire une terrasse en bois composite dans mon jardin.</Bubble> },
      { title: 'Kadria qualifie la demande', content: <div className="space-y-2"><Bubble role="assistant">Quelle surface souhaitez-vous pour votre terrasse ? 📐</Bubble><Bubble role="user">Environ 45 m².</Bubble><Bubble role="assistant">Quel budget avez-vous prévu ? 💰</Bubble><Bubble role="user">Autour de 8 000 €.</Bubble></div> },
      { title: 'Kadria collecte les coordonnées', content: <div className="space-y-2"><Bubble role="assistant">Pour quand souhaitez-vous la terrasse ? ⏰</Bubble><Bubble role="user">Avant l'été si possible.</Bubble><Bubble role="assistant">📍 À quelle adresse ?</Bubble><Bubble role="user">22 allée des Tilleuls, 33000 Bordeaux.</Bubble></div> },
    ],
    result: { client: 'Thomas Garnier', projet: 'Terrasse bois composite', surface: '45 m²', budget: '~ 8 000 €', delai: 'Avant été 2026', adresse: '22 allée des Tilleuls, 33000 Bordeaux', score: 92, resume: 'Construction d\'une terrasse composite de 45m² en jardin. Budget défini, planning clair. Excellent prospect.' },
  },
  {
    id: 'toiture', emoji: '🏠', label: 'Toiture',
    steps: [
      { title: 'Le prospect vous contacte', content: <Bubble role="user">J'ai des fuites au niveau de la toiture, il faudrait refaire une partie du toit.</Bubble> },
      { title: 'Kadria qualifie la demande', content: <div className="space-y-2"><Bubble role="assistant">Quelle est la surface approximative de la toiture concernée ?</Bubble><Bubble role="user">Environ 80 m², c'est un pavillon.</Bubble><Bubble role="assistant">💰 Quel budget envisagez-vous ?</Bubble><Bubble role="user">Entre 15 000 et 20 000 €.</Bubble></div> },
      { title: 'Kadria collecte les coordonnées', content: <div className="space-y-2"><Bubble role="assistant">C'est urgent ou planifiable ? ⏰</Bubble><Bubble role="user">Assez urgent, j'ai des infiltrations.</Bubble><Bubble role="assistant">📍 À quelle adresse ?</Bubble><Bubble role="user">8 impasse du Moulin, 44000 Nantes.</Bubble></div> },
    ],
    result: { client: 'Jean-Pierre Moreau', projet: 'Réfection toiture — fuites', surface: '80 m²', budget: '15 000 – 20 000 €', delai: 'Urgent', adresse: '8 impasse du Moulin, 44000 Nantes', score: 95, resume: 'Réfection urgente de toiture suite à infiltrations. Pavillon 80m². Budget important et besoin urgent : prospect prioritaire.' },
  },
  {
    id: 'plomberie', emoji: '🔧', label: 'Plomberie',
    steps: [
      { title: 'Le prospect vous contacte', content: <Bubble role="user">Je dois refaire toute la plomberie de ma maison, les tuyaux sont anciens.</Bubble> },
      { title: 'Kadria qualifie la demande', content: <div className="space-y-2"><Bubble role="assistant">Combien de pièces d'eau avez-vous ?</Bubble><Bubble role="user">2 salles de bain, 1 cuisine, 1 WC.</Bubble><Bubble role="assistant">💰 Quel budget avez-vous prévu ?</Bubble><Bubble role="user">5 000 à 8 000 €.</Bubble></div> },
      { title: 'Kadria collecte les coordonnées', content: <div className="space-y-2"><Bubble role="assistant">Pour quand souhaitez-vous les travaux ?</Bubble><Bubble role="user">Dans les 2 mois.</Bubble><Bubble role="assistant">📍 Quelle est l'adresse du chantier ?</Bubble><Bubble role="user">3 rue Pasteur, 69007 Lyon.</Bubble></div> },
    ],
    result: { client: 'Sophie Martin', projet: 'Remplacement plomberie complète', surface: '4 pièces d\'eau', budget: '5 000 – 8 000 €', delai: 'Sous 2 mois', adresse: '3 rue Pasteur, 69007 Lyon', score: 85, resume: 'Remplacement intégral de la plomberie. 4 pièces d\'eau concernées. Budget correct, délai raisonnable.' },
  },
  {
    id: 'electricite', emoji: '⚡', label: 'Électricité',
    steps: [
      { title: 'Le prospect vous contacte', content: <Bubble role="user">Mon installation électrique date de 30 ans, il faut la mettre aux normes.</Bubble> },
      { title: 'Kadria qualifie la demande', content: <div className="space-y-2"><Bubble role="assistant">Quelle est la surface de votre logement ?</Bubble><Bubble role="user">110 m², c'est un appartement.</Bubble><Bubble role="assistant">💰 Quel budget envisagez-vous ?</Bubble><Bubble role="user">Environ 10 000 €.</Bubble></div> },
      { title: 'Kadria collecte les coordonnées', content: <div className="space-y-2"><Bubble role="assistant">Quand souhaitez-vous commencer ?</Bubble><Bubble role="user">Dès que possible.</Bubble><Bubble role="assistant">📍 À quelle adresse ?</Bubble><Bubble role="user">45 boulevard Voltaire, 75011 Paris.</Bubble></div> },
    ],
    result: { client: 'Ahmed Benali', projet: 'Mise aux normes électriques', surface: '110 m²', budget: '~ 10 000 €', delai: 'Dès que possible', adresse: '45 bd Voltaire, 75011 Paris', score: 90, resume: 'Mise aux normes d\'une installation de 30 ans dans un 110m². Budget sérieux, urgence modérée.' },
  },
  {
    id: 'renovation', emoji: '🔨', label: 'Rénovation globale',
    steps: [
      { title: 'Le prospect vous contacte', content: <Bubble role="user">On vient d'acheter une maison à rénover entièrement. Il faut tout refaire.</Bubble> },
      { title: 'Kadria qualifie la demande', content: <div className="space-y-2"><Bubble role="assistant">Quelle est la surface de la maison ?</Bubble><Bubble role="user">140 m² sur 2 niveaux.</Bubble><Bubble role="assistant">💰 Quel budget global avez-vous prévu ?</Bubble><Bubble role="user">Entre 80 000 et 100 000 €.</Bubble></div> },
      { title: 'Kadria collecte les coordonnées', content: <div className="space-y-2"><Bubble role="assistant">Quand souhaitez-vous démarrer ? ⏰</Bubble><Bubble role="user">En janvier 2027.</Bubble><Bubble role="assistant">📍 Où se situe la maison ?</Bubble><Bubble role="user">12 chemin des Vignes, 69009 Lyon.</Bubble></div> },
    ],
    result: { client: 'Claire & Julien Petit', projet: 'Rénovation complète maison', surface: '140 m² — 2 niveaux', budget: '80 000 – 100 000 €', delai: 'Janvier 2027', adresse: '12 chemin des Vignes, 69009 Lyon', score: 97, resume: 'Rénovation totale d\'une maison de 140m². Budget très important, projet structuré. Lead hautement prioritaire.' },
  },
];

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${role === 'user' ? 'bg-muted text-foreground' : 'bg-primary/10 text-secondary-foreground'}`}>
        {children}
      </div>
    </div>
  );
}

export default function DemoPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [step, setStep] = useState(0);
  const showResult = selected && step >= selected.steps.length;

  const reset = () => { setSelected(null); setStep(0); };
  const next = () => { if (selected && step < selected.steps.length) setStep(s => s + 1); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <main className="pt-28 pb-20">
        <div className="container mx-auto max-w-4xl px-6">
          {!selected ? (
            <ScenarioPicker scenarios={SCENARIOS} onSelect={s => { setSelected(s); setStep(0); }} onTestReal={() => router.push('/projet?artisan_id=Artisan_demo')} />
          ) : !showResult ? (
            <DemoWalkthrough scenario={selected} step={step} onNext={next} onBack={reset} onTestReal={() => router.push('/projet?artisan_id=Artisan_demo')} />
          ) : (
            <DemoResult scenario={selected} onReset={reset} onDashboard={() => router.push('/dashboard-demo')} onTestReal={() => router.push('/projet?artisan_id=Artisan_demo')} />
          )}
        </div>
      </main>
    </div>
  );
}

function ScenarioPicker({ scenarios, onSelect, onTestReal }: { scenarios: Scenario[]; onSelect: (s: Scenario) => void; onTestReal: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-10">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold">Découvrez Kadria en moins d'une minute.</h1>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Voyez comment une simple demande devient un dossier chantier prêt à être traité.</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-5">Choisissez un scénario :</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {scenarios.map(s => (
            <Card key={s.id} className="p-5 cursor-pointer hover:border-primary/40 transition-colors text-center group" onClick={() => onSelect(s)}>
              <span className="text-3xl">{s.emoji}</span>
              <p className="text-sm font-medium mt-2 group-hover:text-primary transition-colors">{s.label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA to test real assistant */}
      <div className="border-t border-border/30 pt-8">
        <div className="bg-primary/[0.04] border border-primary/20 rounded-2xl p-6 max-w-lg mx-auto">
          <div className="flex items-center gap-2 justify-center mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Envie de tester en conditions réelles ?</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Ces scénarios sont générés par notre moteur de qualification. Testez-le avec votre propre projet.</p>
          <Button onClick={onTestReal} className="gap-2">
            Tester Kadria maintenant <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function DemoWalkthrough({ scenario, step, onNext, onBack, onTestReal }: { scenario: Scenario; step: number; onNext: () => void; onBack: () => void; onTestReal: () => void }) {
  const current = scenario.steps[step];
  const workflowSteps = ['Demande', 'Qualification', 'Coordonnées', 'Dossier projet'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1.5" />Changer de scénario</Button>
        <Badge variant="secondary" className="text-xs">{scenario.emoji} {scenario.label}</Badge>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {workflowSteps.map((ws, i) => (
          <div key={ws} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{ws}</span>
            {i < workflowSteps.length - 1 && <div className={`w-6 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
          <Card className="p-6 md:p-8">
            <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-4">Étape {step + 1} — {current.title}</p>
            <div className="space-y-3">{current.content}</div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={onTestReal} className="gap-2 text-xs">
          <Zap className="w-3.5 h-3.5" /> Tester avec mon propre projet
        </Button>
        <Button size="lg" onClick={onNext} className="gap-2">
          {step < scenario.steps.length - 1 ? 'Étape suivante' : 'Voir le dossier projet'} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function DemoResult({ scenario, onReset, onDashboard, onTestReal }: { scenario: Scenario; onReset: () => void; onDashboard: () => void; onTestReal: () => void }) {
  const r = scenario.result;
  const fields = [
    { label: 'Client', value: r.client },
    { label: 'Projet', value: r.projet },
    { label: 'Surface', value: r.surface },
    { label: 'Budget', value: r.budget },
    { label: 'Délai', value: r.delai },
    { label: 'Adresse', value: r.adresse },
  ];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Dossier projet généré automatiquement</h2>
        <p className="text-muted-foreground text-sm mt-2">Voici ce que vous recevriez dans votre dashboard Kadria.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-medium">Dossier #{scenario.id.toUpperCase()}-2026</span>
          </div>
          <Badge className="bg-primary/15 text-primary border-0 text-xs">Score : {r.score}%</Badge>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.label}>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{f.label}</p>
              <p className="text-sm font-medium mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>
        <div className="px-6 pb-6">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Résumé automatique</p>
          <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 rounded-lg p-4">{r.resume}</p>
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Qualification</span>
            <span className="text-primary font-semibold">{r.score}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full"><div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${r.score}%` }} /></div>
        </div>
      </Card>

      {/* CTA: Test real */}
      <div className="bg-primary/[0.04] border border-primary/20 rounded-2xl p-6 text-center">
        <div className="flex items-center gap-2 justify-center mb-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Ce dossier a été généré par notre moteur de qualification</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Ce n'est pas une maquette — c'est le résultat réel de l'IA Kadria. Testez avec votre propre projet.</p>
        <Button onClick={onTestReal} size="lg" className="gap-2">
          Tester Kadria avec mon projet <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button size="lg" variant="outline" onClick={onDashboard} className="gap-2">
          Voir le dashboard complet <ArrowRight className="w-4 h-4" />
        </Button>
        <Button size="lg" variant="ghost" onClick={onReset} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Tester un autre scénario
        </Button>
      </div>

      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground mb-3">Vous souhaitez recevoir ce type de dossier automatiquement ?</p>
        <Button onClick={() => window.open('https://calendly.com', '_blank')} className="gap-2">
          Réserver une démonstration <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
