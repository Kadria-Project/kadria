'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import { DarkNav } from '@/src/components/DarkNav';
import { useScrollReveal, ANIMATION_STYLES } from '@/src/components/KadriaPages';
import ChatWidgetInline from '@/src/components/chat/ChatWidgetInline';

type Exchange = { role: 'assistant' | 'user'; content: string };

type Dossier = {
  nom: string;
  tel: string;
  email: string;
  projet: string;
  ville: string;
  budget: string;
  delai: string;
  score: number;
  resume: string;
};

type ScenarioData = {
  emoji: string;
  etape1: { label: string; message: string };
  etape2: { label: string; exchanges: Exchange[] };
  etape3: { label: string; exchanges: Exchange[] };
  etape4: { label: string; dossier: Dossier };
};

const SCENARIOS: Record<string, ScenarioData> = {
  'Salle de bain': {
    emoji: '🚿',
    etape1: {
      label: 'ÉTAPE 1 — LE PROSPECT VOUS CONTACTE',
      message:
        "Bonjour, je voudrais refaire entièrement ma salle de bain. C'est possible d'avoir un devis ?",
    },
    etape2: {
      label: 'ÉTAPE 2 — KADRIA QUALIFIE',
      exchanges: [
        { role: 'assistant', content: "Parfait ! Création ou rénovation d'une salle existante ?" },
        { role: 'user', content: 'Rénovation complète.' },
        { role: 'assistant', content: 'Quelle est la surface approximative ?' },
        { role: 'user', content: 'Environ 7m².' },
        { role: 'assistant', content: 'Douche italienne, baignoire, ou les deux ?' },
        { role: 'user', content: 'Douche italienne + double vasque.' },
      ],
    },
    etape3: {
      label: 'ÉTAPE 3 — COORDONNÉES',
      exchanges: [
        { role: 'assistant', content: 'Quel est votre budget approximatif ?' },
        { role: 'user', content: 'Entre 8 000 et 12 000 €.' },
        { role: 'assistant', content: 'Quel est votre prénom ?' },
        { role: 'user', content: 'Marie.' },
        { role: 'assistant', content: 'Et votre numéro de téléphone ?' },
        { role: 'user', content: '06 12 34 56 78' },
      ],
    },
    etape4: {
      label: 'ÉTAPE 4 — DOSSIER GÉNÉRÉ',
      dossier: {
        nom: 'Marie Leroy',
        tel: '06 12 34 56 78',
        email: 'marie.leroy@email.fr',
        projet: 'Rénovation SDB',
        ville: 'Lyon 3e',
        budget: '8 000 – 12 000 €',
        delai: 'Sept. 2026',
        score: 92,
        resume:
          "Rénovation complète d'une salle de bain de 7m² avec douche italienne et double vasque. Budget et délai définis, contact direct disponible.",
      },
    },
  },
  Terrasse: {
    emoji: '🌿',
    etape1: {
      label: 'ÉTAPE 1 — LE PROSPECT VOUS CONTACTE',
      message: "Bonjour, je voudrais faire construire une terrasse extérieure, vous pouvez m'aider ?",
    },
    etape2: {
      label: 'ÉTAPE 2 — KADRIA QUALIFIE',
      exchanges: [
        { role: 'assistant', content: 'Avec plaisir ! Quelle surface souhaitez-vous pour votre terrasse ?' },
        { role: 'user', content: 'Environ 25m².' },
        { role: 'assistant', content: 'Quel matériau préférez-vous : bois, composite ou carrelage ?' },
        { role: 'user', content: 'Composite, plutôt.' },
        { role: 'assistant', content: 'Le terrain est-il plat ou en pente ?' },
        { role: 'user', content: 'Plutôt plat, accès facile par le jardin.' },
      ],
    },
    etape3: {
      label: 'ÉTAPE 3 — COORDONNÉES',
      exchanges: [
        { role: 'assistant', content: 'Quel est votre budget approximatif ?' },
        { role: 'user', content: 'Entre 5 000 et 8 000 €.' },
        { role: 'assistant', content: 'Quel est votre prénom ?' },
        { role: 'user', content: 'Thomas.' },
        { role: 'assistant', content: 'Et votre numéro de téléphone ?' },
        { role: 'user', content: '06 23 45 67 89' },
      ],
    },
    etape4: {
      label: 'ÉTAPE 4 — DOSSIER GÉNÉRÉ',
      dossier: {
        nom: 'Thomas Bernard',
        tel: '06 23 45 67 89',
        email: 'thomas.bernard@email.fr',
        projet: 'Création terrasse composite',
        ville: 'Bordeaux',
        budget: '5 000 – 8 000 €',
        delai: 'Juin 2026',
        score: 88,
        resume:
          "Création d'une terrasse composite de 25m² sur terrain plat avec accès facile. Budget et délai définis, projet prêt à chiffrer.",
      },
    },
  },
  Toiture: {
    emoji: '🏠',
    etape1: {
      label: 'ÉTAPE 1 — LE PROSPECT VOUS CONTACTE',
      message: "Bonjour, j'ai une fuite sur ma toiture et je pense qu'il faut la refaire entièrement.",
    },
    etape2: {
      label: 'ÉTAPE 2 — KADRIA QUALIFIE',
      exchanges: [
        { role: 'assistant', content: "D'accord. Quelle est la surface approximative de la toiture ?" },
        { role: 'user', content: 'Environ 90m².' },
        { role: 'assistant', content: 'Quel est le matériau actuel de couverture ?' },
        { role: 'user', content: 'Tuiles mécaniques.' },
        { role: 'assistant', content: "L'accès au chantier est-il facile pour un échafaudage ?" },
        { role: 'user', content: 'Oui, accès large par la rue.' },
      ],
    },
    etape3: {
      label: 'ÉTAPE 3 — COORDONNÉES',
      exchanges: [
        { role: 'assistant', content: 'Quel est votre budget approximatif ?' },
        { role: 'user', content: 'Entre 10 000 et 20 000 €.' },
        { role: 'assistant', content: 'Quel est votre prénom ?' },
        { role: 'user', content: 'Julien.' },
        { role: 'assistant', content: 'Et votre numéro de téléphone ?' },
        { role: 'user', content: '06 34 56 78 90' },
      ],
    },
    etape4: {
      label: 'ÉTAPE 4 — DOSSIER GÉNÉRÉ',
      dossier: {
        nom: 'Julien Petit',
        tel: '06 34 56 78 90',
        email: 'julien.petit@email.fr',
        projet: 'Réfection toiture',
        ville: 'Nantes',
        budget: '10 000 – 20 000 €',
        delai: 'Oct. 2026',
        score: 95,
        resume:
          "Réfection complète d'une toiture de 90m² en tuiles mécaniques, accès chantier facile. Dossier urgent à fort potentiel.",
      },
    },
  },
  Plomberie: {
    emoji: '🔧',
    etape1: {
      label: 'ÉTAPE 1 — LE PROSPECT VOUS CONTACTE',
      message:
        "Bonjour, j'ai une fuite sous mon évier et je voudrais aussi refaire l'installation de la salle de bain.",
    },
    etape2: {
      label: 'ÉTAPE 2 — KADRIA QUALIFIE',
      exchanges: [
        {
          role: 'assistant',
          content: "Je vois. S'agit-il d'une réparation ponctuelle ou d'une rénovation complète de l'installation ?",
        },
        { role: 'user', content: "Rénovation complète de l'installation." },
        { role: 'assistant', content: 'Quelle est la surface concernée ?' },
        { role: 'user', content: 'Environ 5m².' },
        { role: 'assistant', content: "Faut-il déplacer des arrivées d'eau ou évacuations ?" },
        { role: 'user', content: 'Oui, on veut déplacer la douche.' },
      ],
    },
    etape3: {
      label: 'ÉTAPE 3 — COORDONNÉES',
      exchanges: [
        { role: 'assistant', content: 'Quel est votre budget approximatif ?' },
        { role: 'user', content: 'Entre 3 000 et 5 000 €.' },
        { role: 'assistant', content: 'Quel est votre prénom ?' },
        { role: 'user', content: 'Sophie.' },
        { role: 'assistant', content: 'Et votre numéro de téléphone ?' },
        { role: 'user', content: '06 45 67 89 01' },
      ],
    },
    etape4: {
      label: 'ÉTAPE 4 — DOSSIER GÉNÉRÉ',
      dossier: {
        nom: 'Sophie Martin',
        tel: '06 45 67 89 01',
        email: 'sophie.martin@email.fr',
        projet: 'Rénovation plomberie SDB',
        ville: 'Toulouse',
        budget: '3 000 – 5 000 €',
        delai: 'Août 2026',
        score: 84,
        resume:
          "Rénovation de l'installation de plomberie d'une salle de bain de 5m² avec déplacement de la douche. Contraintes techniques identifiées.",
      },
    },
  },
  Électricité: {
    emoji: '⚡',
    etape1: {
      label: 'ÉTAPE 1 — LE PROSPECT VOUS CONTACTE',
      message: 'Bonjour, mon tableau électrique est ancien et je veux faire une mise aux normes complète.',
    },
    etape2: {
      label: 'ÉTAPE 2 — KADRIA QUALIFIE',
      exchanges: [
        { role: 'assistant', content: 'D\'accord. Votre installation est-elle ancienne (avant 1990) ou plus récente ?' },
        { role: 'user', content: 'Très ancienne, fusibles porcelaine.' },
        { role: 'assistant', content: 'Quel est le nombre de pièces concernées ?' },
        { role: 'user', content: '5 pièces.' },
        { role: 'assistant', content: 'Souhaitez-vous ajouter des points électriques (prises, luminaires) ?' },
        { role: 'user', content: 'Oui, quelques prises supplémentaires.' },
      ],
    },
    etape3: {
      label: 'ÉTAPE 3 — COORDONNÉES',
      exchanges: [
        { role: 'assistant', content: 'Quel est votre budget approximatif ?' },
        { role: 'user', content: 'Entre 2 000 et 5 000 €.' },
        { role: 'assistant', content: 'Quel est votre prénom ?' },
        { role: 'user', content: 'Karim.' },
        { role: 'assistant', content: 'Et votre numéro de téléphone ?' },
        { role: 'user', content: '06 56 78 90 12' },
      ],
    },
    etape4: {
      label: 'ÉTAPE 4 — DOSSIER GÉNÉRÉ',
      dossier: {
        nom: 'Karim Haddad',
        tel: '06 56 78 90 12',
        email: 'karim.haddad@email.fr',
        projet: 'Mise aux normes électriques',
        ville: 'Marseille',
        budget: '2 000 – 5 000 €',
        delai: 'Juil. 2026',
        score: 79,
        resume:
          "Mise aux normes complète d'une installation électrique ancienne sur 5 pièces avec ajout de points électriques. Dossier technique prêt pour devis.",
      },
    },
  },
  'Rénovation globale': {
    emoji: '🏗️',
    etape1: {
      label: 'ÉTAPE 1 — LE PROSPECT VOUS CONTACTE',
      message: "Bonjour, on vient d'acheter un appartement ancien et on souhaite tout rénover.",
    },
    etape2: {
      label: 'ÉTAPE 2 — KADRIA QUALIFIE',
      exchanges: [
        { role: 'assistant', content: "Super projet ! Quelle est la surface totale de l'appartement ?" },
        { role: 'user', content: 'Environ 75m².' },
        { role: 'assistant', content: "Quel est l'état général actuel (à rafraîchir, vétuste, à reconstruire) ?" },
        { role: 'user', content: 'Assez vétuste, tout à refaire.' },
        { role: 'assistant', content: 'Quelles sont vos priorités : cuisine, salle de bain, électricité, isolation ?' },
        { role: 'user', content: 'Tout, idéalement : cuisine, SDB, électricité et isolation.' },
      ],
    },
    etape3: {
      label: 'ÉTAPE 3 — COORDONNÉES',
      exchanges: [
        { role: 'assistant', content: 'Quel est votre budget global approximatif ?' },
        { role: 'user', content: 'Entre 40 000 et 60 000 €.' },
        { role: 'assistant', content: 'Quel est votre prénom ?' },
        { role: 'user', content: 'Camille.' },
        { role: 'assistant', content: 'Et votre numéro de téléphone ?' },
        { role: 'user', content: '06 67 89 01 23' },
      ],
    },
    etape4: {
      label: 'ÉTAPE 4 — DOSSIER GÉNÉRÉ',
      dossier: {
        nom: 'Camille Dubois',
        tel: '06 67 89 01 23',
        email: 'camille.dubois@email.fr',
        projet: 'Rénovation globale appartement',
        ville: 'Paris 11e',
        budget: '40 000 – 60 000 €',
        delai: 'Jan. 2027',
        score: 97,
        resume:
          'Rénovation globale d\'un appartement de 75m² (cuisine, salle de bain, électricité, isolation). Budget conséquent et projet multi-lots à coordonner.',
      },
    },
  },
};

const STEPPER = ['Demande', 'Qualification', 'Coordonnées', 'Dossier projet'];

export default function DemoPage() {
  useScrollReveal();

  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [scenarioStep, setScenarioStep] = useState(1);
  const [visibleCount, setVisibleCount] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);

  const scenario = selectedScenario ? SCENARIOS[selectedScenario] : null;

  const currentMessages: Exchange[] =
    scenario && scenarioStep === 1
      ? [{ role: 'user', content: scenario.etape1.message }]
      : scenario && scenarioStep === 2
        ? scenario.etape2.exchanges
        : scenario && scenarioStep === 3
          ? scenario.etape3.exchanges
          : [];

  const currentLabel =
    scenario && scenarioStep === 1
      ? scenario.etape1.label
      : scenario && scenarioStep === 2
        ? scenario.etape2.label
        : scenario && scenarioStep === 3
          ? scenario.etape3.label
          : scenario
            ? scenario.etape4.label
            : '';

  useEffect(() => {
    if (!scenario || scenarioStep === 4) return;

    setVisibleCount(0);

    const timers: ReturnType<typeof setTimeout>[] = [];

    currentMessages.forEach((_, index) => {
      timers.push(setTimeout(() => setVisibleCount(index + 1), 400 * (index + 1)));
    });

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenario, scenarioStep]);

  function selectScenario(name: string) {
    setSelectedScenario(name);
    setScenarioStep(1);
  }

  function scrollToChat() {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white">
      <style>{ANIMATION_STYLES}</style>

      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(34,197,94,0.05)_0%,transparent_60%)]" />

      <DarkNav />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-16 pt-[100px]">
        {!scenario ? (
          <>
            <section className="kr-reveal kr-visible space-y-4 pb-12 text-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-green-500">
                Démo interactive
              </span>
              <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold leading-tight text-white">
                Voyez Kadria <span className="text-green-500">qualifier</span> un prospect
              </h1>
              <p className="mx-auto max-w-xl text-base text-zinc-400">
                Choisissez un scénario et observez comment Kadria transforme une demande en dossier
                complet en moins de 3 minutes.
              </p>
            </section>

            <section className="border-t border-zinc-800 pb-12 pt-12">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(SCENARIOS).map(([name, data], index) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => selectScenario(name)}
                    className={`kr-reveal kr-reveal-delay-${Math.min(index + 1, 6)} cursor-pointer rounded-2xl border bg-zinc-900 p-7 text-left transition-all duration-200 hover:-translate-y-[3px] ${
                      selectedScenario === name
                        ? 'border-green-500 bg-green-500/[0.06] shadow-[0_0_0_1px_rgba(34,197,94,0.3)]'
                        : 'border-zinc-800 hover:border-green-500/30 hover:bg-green-500/[0.04]'
                    }`}
                  >
                    <div className="mb-3 text-[32px]">{data.emoji}</div>
                    <div className="text-base font-bold text-white">{name}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="kr-reveal border-t border-zinc-800 pb-12 pt-12">
              <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-green-500/30 bg-zinc-900 p-6 sm:flex-row sm:p-8">
                <div className="text-center sm:text-left">
                  <p className="text-base font-bold text-white">Tester avec votre propre projet</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Connectez Kadria à votre activité en 15 minutes
                  </p>
                </div>
                <Link
                  href="/register"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-green-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition-transform duration-150 hover:scale-[1.02] sm:w-auto"
                >
                  Commencer gratuitement <ArrowRight size={16} />
                </Link>
              </div>
            </section>

            <section className="kr-reveal border-t border-zinc-800 pt-12">
              <div ref={chatRef} className="overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900">
                <ChatHeader />
                <div className="p-5">
                  <ChatWidgetInline artisanId="Artisan_demo" />
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setSelectedScenario(null)}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors duration-150 hover:text-white"
              >
                <ArrowLeft size={16} /> Changer de scénario
              </button>

              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm text-white">
                {scenario.emoji} {selectedScenario}
              </span>
            </section>

            <section className="pt-8">
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <div className="flex items-center justify-center gap-2 border-b border-zinc-800 bg-zinc-800/40 px-5 py-4">
                  {STEPPER.map((label, index) => {
                    const stepNumber = index + 1;
                    const isActive = stepNumber === scenarioStep;
                    const isDone = stepNumber < scenarioStep;

                    return (
                      <div key={label} className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                              isActive || isDone ? 'bg-green-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {stepNumber}
                          </span>
                          <span className={`text-sm ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                            {label}
                          </span>
                        </div>

                        {index < STEPPER.length - 1 && (
                          <span className={`mx-1 block h-[2px] w-8 rounded-full ${isDone ? 'bg-green-500' : 'bg-zinc-800'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-6">
                  {scenarioStep < 4 ? (
                    <div className="space-y-4">
                      <p className="text-xs uppercase tracking-widest text-green-500">{currentLabel}</p>

                      <div className="min-h-[180px] space-y-3">
                        {currentMessages.slice(0, visibleCount).map((message, index) => (
                          <div
                            key={index}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                message.role === 'user'
                                  ? 'bg-green-500 text-zinc-950'
                                  : 'bg-zinc-800 text-zinc-100'
                              }`}
                            >
                              {message.content}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={scrollToChat}
                          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400 transition-colors duration-150 hover:border-green-500/30 hover:text-green-500"
                        >
                          <Zap size={14} /> Tester avec mon propre projet
                        </button>

                        <button
                          type="button"
                          onClick={() => setScenarioStep((s) => Math.min(s + 1, 4))}
                          className="inline-flex items-center gap-2 rounded-[10px] bg-green-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-transform duration-150 hover:scale-[1.02]"
                        >
                          Étape suivante <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <DossierCard
                      label={scenario.etape4.label}
                      dossier={scenario.etape4.dossier}
                      onRestart={() => setScenarioStep(1)}
                      onTestYourProject={scrollToChat}
                    />
                  )}
                </div>
              </div>
            </section>

            <section className="border-t border-zinc-800 pt-12">
              <div ref={chatRef} className="overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900">
                <ChatHeader />
                <div className="border-b border-zinc-800 bg-zinc-800/40 px-5 py-3 text-center text-sm text-zinc-400">
                  Testez Kadria avec votre propre projet
                </div>
                <div className="p-5">
                  <ChatWidgetInline artisanId="Artisan_demo" />
                </div>
              </div>
            </section>
          </>
        )}

        <div className="border-t border-zinc-800 pt-8 text-center">
          <Link
            href="/demo-dashboard"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors duration-150 hover:text-white"
          >
            Voir le tableau de bord complet <ArrowRight size={16} />
          </Link>
        </div>

        <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-400">
          © 2025 Kadria · <Link href="/" className="text-zinc-400 transition-colors duration-150 hover:text-white">Retour à l&apos;accueil</Link>
        </footer>
      </main>
    </div>
  );
}

function ChatHeader() {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-800/40 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-extrabold text-zinc-950">
          K
        </div>
        <div>
          <p className="text-sm font-bold text-white">Kadria</p>
          <p className="text-xs text-zinc-400">Assistant en ligne</p>
        </div>
      </div>
      <span className="kr-badge-pulse h-2.5 w-2.5 rounded-full bg-green-500" />
    </div>
  );
}

function DossierCard({
  label,
  dossier,
  onRestart,
  onTestYourProject,
}: {
  label: string;
  dossier: Dossier;
  onRestart: () => void;
  onTestYourProject: () => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-xs uppercase tracking-widest text-green-500">{label}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-semibold uppercase tracking-wide text-white">Dossier projet reçu</span>
        </div>

        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-500">
          Score {dossier.score}
        </span>
      </div>

      <div className="space-y-1 rounded-lg bg-zinc-800/50 p-4">
        <p className="font-semibold text-white">{dossier.nom}</p>
        <p className="text-sm text-zinc-400">{dossier.tel}</p>
        <p className="text-sm text-zinc-400">{dossier.email}</p>
        <span className="mt-2 inline-block rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-200">Nouveau</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DossierField label="Projet" value={dossier.projet} />
        <DossierField label="Ville" value={dossier.ville} />
        <DossierField label="Budget" value={dossier.budget} />
        <DossierField label="Délai" value={dossier.delai} />
      </div>

      <div className="rounded-lg bg-zinc-800/50 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Résumé IA</p>
        <p className="mt-2 text-sm text-white">{dossier.resume}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">Score {dossier.score}</span>
        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-500">
          ✅ Conversion Élevée
        </span>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400 transition-colors duration-150 hover:border-green-500/30 hover:text-green-500"
        >
          <ArrowLeft size={14} /> Recommencer
        </button>

        <button
          type="button"
          onClick={onTestYourProject}
          className="inline-flex items-center gap-2 rounded-[10px] bg-green-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-transform duration-150 hover:scale-[1.02]"
        >
          Tester avec votre projet <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function DossierField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-800/50 p-3">
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
