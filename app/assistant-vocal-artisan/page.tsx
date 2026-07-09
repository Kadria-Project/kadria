import type { Metadata } from 'next';
import {
  MarketingShell,
  MarketingHero,
  MarketingSection,
  MarketingGrid,
  MarketingCard,
  MarketingCta,
  MarketingLinks,
} from '@/src/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Assistant vocal pour artisans | Kadria',
  description:
    "L'assistant vocal Kadria aide les artisans à qualifier les appels entrants, récupérer les informations importantes et créer des dossiers exploitables même lorsqu'ils sont sur chantier.",
  alternates: { canonical: '/assistant-vocal-artisan' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Assistant vocal pour artisans | Kadria',
    description:
      "L'assistant vocal Kadria aide les artisans à qualifier les appels entrants, récupérer les informations importantes et créer des dossiers exploitables même lorsqu'ils sont sur chantier.",
    url: 'https://kadria.fr/assistant-vocal-artisan',
  },
};

const RECOVERED = [
  'Nom du client',
  'Commune',
  'Type de projet',
  'Urgence',
  'Délai',
  'Budget indicatif',
  'Description du besoin',
  'Éléments à rappeler',
];

const EXAMPLES = [
  { title: 'Paysagiste', text: 'Demande de taille de haie.' },
  { title: 'Plombier', text: 'Fuite ou remplacement.' },
  { title: 'Couvreur', text: 'Infiltration toiture.' },
  { title: 'Électricien', text: 'Dépannage ou rénovation.' },
];

export default function AssistantVocalArtisanPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Assistant vocal"
        title="Un assistant vocal pour ne plus laisser vos appels sans suite"
        subtitle="Quand vous êtes sur chantier, en déplacement ou déjà avec un client, Kadria peut récupérer les informations essentielles et préparer un dossier exploitable."
        primaryCta={{ label: 'Découvrir en démo', href: '/demander-une-demo' }}
        secondaryCta={{ label: 'Voir les fonctionnalités', href: '/fonctionnalites' }}
      />

      <MarketingSection
        title="Le problème des appels terrain"
        text="Un appel manqué peut devenir un chantier perdu. Mais répondre à chaque appel est impossible quand on travaille sur chantier, en rendez-vous ou en intervention."
      />

      <MarketingSection title="Ce que l'assistant vocal peut récupérer">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RECOVERED.map((r) => (
            <li
              key={r}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-sm font-medium text-zinc-300"
            >
              {r}
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection
        title="Un appel devient une fiche projet"
        text="L'objectif n'est pas de remplacer l'artisan. L'objectif est de préparer le terrain : vous récupérez une demande claire, vous savez pourquoi rappeler et vous évitez de repartir de zéro."
      />

      <MarketingSection title="Exemples">
        <MarketingGrid columns={4}>
          {EXAMPLES.map((e) => (
            <MarketingCard key={e.title} title={e.title} text={e.text} />
          ))}
        </MarketingGrid>
      </MarketingSection>

      <MarketingSection title="Pourquoi c'est différent d'un répondeur">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-[24px] border border-zinc-800 bg-zinc-900/40 p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Répondeur classique</p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
              <li>Message libre</li>
              <li>Information incomplète</li>
              <li>Pas de structure</li>
              <li>Rappel difficile</li>
            </ul>
          </div>
          <div className="rounded-[24px] border border-green-500/20 bg-green-500/[0.04] p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-500">Assistant vocal Kadria</p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-300">
              <li>Questions utiles</li>
              <li>Dossier structuré</li>
              <li>Contexte clair</li>
              <li>Meilleur rappel</li>
            </ul>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection>
        <MarketingLinks
          links={[
            { label: 'Voir les fonctionnalités', href: '/fonctionnalites' },
            { label: 'Demander une démo', href: '/demander-une-demo' },
            { label: 'Lire la ressource dédiée', href: '/ressources/assistant-vocal-artisans' },
          ]}
        />
      </MarketingSection>

      <MarketingCta
        title="Ne laissez plus un appel devenir un chantier perdu"
        primaryCta={{ label: 'Découvrir en démo', href: '/demander-une-demo' }}
        secondaryCta={{ label: 'Voir les fonctionnalités', href: '/fonctionnalites' }}
      />
    </MarketingShell>
  );
}
