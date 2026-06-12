'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-6">
          <Link href="/" className="text-lg font-bold text-green-500">
            Kadria
          </Link>

          <Link href="/dashboard-v2" className="text-sm text-zinc-400 hover:text-white">
            Connexion
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-16 space-y-10">
        {!scenario ? (
          <>
            <div className="text-center space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Découvrez Kadria en moins d'une minute.
              </h1>

              <p className="text-zinc-400">
                Voyez comment une simple demande devient un dossier chantier prêt à être traité.
              </p>
            </div>

            <p className="text-center text-sm text-zinc-400">Choisissez un scénario :</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.entries(SCENARIOS).map(([name, data]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => selectScenario(name)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center transition-colors hover:border-zinc-600 hover:bg-zinc-800"
                >
                  <div className="text-3xl mb-2">{data.emoji}</div>
                  <div className="text-white font-medium">{name}</div>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-5 text-center space-y-3">
              <p className="text-white font-semibold">⚡ Envie de tester en conditions réelles ?</p>
              <p className="text-sm text-zinc-400">
                Ces scénarios sont générés par notre moteur de qualification. Testez-le avec votre propre projet.
              </p>
              <button
                type="button"
                onClick={scrollToChat}
                className="inline-flex items-center justify-center rounded-md bg-green-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-green-400 transition-colors"
              >
                Tester Kadria maintenant →
              </button>
            </div>

            <div ref={chatRef} className="pt-4">
              <ChatWidgetInline artisanId="Artisan_demo" />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedScenario(null)}
                className="text-sm text-zinc-400 hover:text-white"
              >
                ← Changer de scénario
              </button>

              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm text-white">
                {scenario.emoji} {selectedScenario}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {STEPPER.map((label, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === scenarioStep;

                return (
                  <div key={label} className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          isActive ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {stepNumber}
                      </span>
                      <span className={`text-sm ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                        {label}
                      </span>
                    </div>

                    {index < STEPPER.length - 1 && <span className="text-zinc-600 px-1">———</span>}
                  </div>
                );
              })}
            </div>

            {scenarioStep < 4 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
                <p className="text-green-500 text-xs uppercase tracking-widest">{currentLabel}</p>

                <div className="space-y-3 min-h-[180px]">
                  {currentMessages.slice(0, visibleCount).map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          message.role === 'user' ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-100'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button type="button" onClick={scrollToChat} className="text-sm text-zinc-400 hover:text-white">
                    ⚡ Tester avec mon propre projet
                  </button>

                  <button
                    type="button"
                    onClick={() => setScenarioStep((s) => Math.min(s + 1, 4))}
                    className="inline-flex items-center justify-center rounded-md bg-green-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-green-400 transition-colors"
                  >
                    Étape suivante →
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

            <div ref={chatRef} className="pt-4 space-y-3">
              <p className="text-center text-sm text-zinc-400">Testez Kadria avec votre propre projet :</p>
              <ChatWidgetInline artisanId="Artisan_demo" />
            </div>
          </>
        )}
      </main>
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
      <p className="text-green-500 text-xs uppercase tracking-widest">{label}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-semibold text-white uppercase tracking-wide">Dossier projet reçu</span>
        </div>

        <span className="rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-semibold text-green-500">
          Score {dossier.score}
        </span>
      </div>

      <div className="rounded-lg bg-zinc-800/50 p-4 space-y-1">
        <p className="text-white font-semibold">{dossier.nom}</p>
        <p className="text-sm text-zinc-400">{dossier.tel}</p>
        <p className="text-sm text-zinc-400">{dossier.email}</p>
        <span className="inline-block mt-2 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-200">Nouveau</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <span className="rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-semibold text-green-500">
          ✅ Conversion Élevée
        </span>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onRestart} className="text-sm text-zinc-400 hover:text-white">
          ← Recommencer
        </button>

        <button
          type="button"
          onClick={onTestYourProject}
          className="inline-flex items-center justify-center rounded-md bg-green-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-green-400 transition-colors"
        >
          Tester avec votre projet →
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
