'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Globe, Phone, LayoutDashboard, PhoneOff, ClipboardCheck, BarChart3, History, TrendingUp, Bell, PieChart, Globe2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import SiteNav from '@/components/SiteNav';

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

type Feature = { icon: typeof Globe; title: string; desc: string; badge?: string };

const FEATURES: Feature[] = [
  { icon: Globe, title: 'Assistant Web', desc: 'Répond aux visiteurs de votre site 24h/24. Collecte le besoin, qualifie le projet et crée automatiquement un dossier complet avec coordonnées, budget et photos.' },
  { icon: Phone, title: 'Assistant Vocal', desc: 'Répond aux appels entrants quand vous êtes sur chantier. Engage une conversation naturelle, comprend le besoin et récupère toutes les informations nécessaires.', badge: 'Nouveau' },
  { icon: ClipboardCheck, title: 'Qualification automatique', desc: 'Chaque prospect est automatiquement scoré selon la complétude du dossier, le budget, l\'urgence et le potentiel commercial. Vous savez immédiatement quels projets prioriser.' },
  { icon: PhoneOff, title: 'Gestion des appels manqués', desc: 'Les appels manqués sont automatiquement rappelés par Kadria. Le prospect est qualifié et son dossier est ajouté à votre dashboard.' },
  { icon: LayoutDashboard, title: 'Dashboard commercial', desc: 'Centralisez tous vos prospects — web et téléphone — dans un tableau de bord unique. Visualisez votre pipeline, vos statuts et votre chiffre d\'affaires potentiel.' },
  { icon: History, title: 'Historique des prospects', desc: 'Retrouvez l\'intégralité de chaque échange : conversation web, transcription d\'appel, documents envoyés, notes et historique des statuts.' },
  { icon: TrendingUp, title: 'Priorisation des opportunités', desc: 'Les prospects sont classés automatiquement par potentiel commercial. Les dossiers les plus prometteurs remontent en haut de votre liste.' },
  { icon: Bell, title: 'Relances automatiques', desc: 'Kadria identifie les dossiers non traités depuis plus de 48h et vous alerte. Vous ne laissez plus jamais un prospect sans réponse.' },
  { icon: PieChart, title: 'Statistiques et reporting', desc: 'Taux de transformation, panier moyen, nombre de leads par mois, chiffre d\'affaires potentiel — pilotez votre activité commerciale en temps réel.' },
  { icon: Globe2, title: 'Site web connecté', desc: 'Avec l\'offre Kadria Performance, votre site professionnel est directement connecté à Kadria. Chaque visiteur est accueilli et qualifié automatiquement.' },
];

export default function FeaturesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <main className="pt-28 pb-20">
        <div className="container mx-auto max-w-5xl px-6">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            {/* Hero */}
            <motion.div variants={fadeUp} className="text-center mb-16">
              <Badge variant="secondary" className="text-xs mb-4">10 fonctionnalités</Badge>
              <h1 className="text-3xl sm:text-4xl font-bold">Tout ce dont un artisan a besoin pour ne plus perdre de prospects.</h1>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">Kadria est un assistant commercial complet : qualification automatique, gestion des appels, dashboard projets et bien plus.</p>
            </motion.div>

            {/* Grid */}
            <div className="grid sm:grid-cols-2 gap-5">
              {FEATURES.map((f, i) => (
                <motion.div key={f.title} variants={fadeUp}>
                  <Card className="p-6 h-full space-y-3 hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <f.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{f.title}</h3>
                          {f.badge && <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0">{f.badge}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{f.desc}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.div variants={fadeUp} className="text-center mt-16 space-y-4">
              <h2 className="text-2xl font-bold">Prêt à ne plus perdre un seul prospect ?</h2>
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={() => router.push('/demo')} className="gap-2">Tester Kadria <ArrowRight className="w-4 h-4" /></Button>
                <Button size="lg" variant="outline" onClick={() => window.open('https://calendly.com', '_blank')}>Réserver une démonstration</Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
