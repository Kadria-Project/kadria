import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MarketingShell,
  MarketingHero,
  MarketingSection,
  MarketingCta,
} from '@/src/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Comment fonctionne Kadria | De la demande client au chantier',
  description:
    'Comprenez en quelques étapes comment Kadria transforme une demande client en dossier qualifié, prêt à chiffrer et à suivre commercialement.',
  alternates: { canonical: '/comment-ca-marche' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Comment fonctionne Kadria | De la demande client au chantier',
    description:
      'Comprenez en quelques étapes comment Kadria transforme une demande client en dossier qualifié, prêt à chiffrer et à suivre commercialement.',
    url: 'https://kadria.fr/comment-ca-marche',
  },
};

const STEPS = [
  {
    title: 'Le prospect vous contacte',
    text: 'Appel, message, formulaire, photo ou demande incomplète : Kadria vous aide à capter l\'intention du client dès le départ.',
  },
  {
    title: 'Kadria qualifie la demande',
    text: 'Le besoin est clarifié avec les bonnes questions : type de projet, urgence, budget, délai, localisation, photos et informations utiles au métier.',
  },
  {
    title: 'Un dossier projet est créé',
    text: 'Les informations sont centralisées dans une fiche claire, exploitable et prête à être enrichie.',
  },
  {
    title: 'Vous savez quoi traiter en priorité',
    text: 'Kadria met en avant les prospects chauds, les relances importantes et les dossiers qui méritent votre attention.',
  },
  {
    title: 'Vous préparez le devis plus vite',
    text: 'Avec un dossier complet, vous gagnez du temps au moment de chiffrer, de rappeler ou de planifier une visite.',
  },
  {
    title: 'Vous suivez jusqu\'à la décision',
    text: 'Devis envoyé, relance, acceptation, refus : chaque dossier avance dans un suivi commercial clair.',
  },
];

const BEFORE = [
  'Informations dispersées',
  'Prospects oubliés',
  'Devis repoussés',
  'Relances au hasard',
  'Manque de visibilité',
];

const WITH = [
  'Dossiers centralisés',
  'Demandes qualifiées',
  'Priorités visibles',
  'Relances suivies',
  'Meilleur pilotage',
];

export default function CommentCaMarchePage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Fonctionnement"
        title="Comment Kadria transforme une demande en dossier prêt à vendre"
        subtitle="Du premier contact client jusqu'au devis, Kadria vous aide à structurer l'information, prioriser les opportunités et ne plus laisser filer vos prospects."
        primaryCta={{ label: 'Voir les fonctionnalités', href: '/fonctionnalites' }}
        secondaryCta={{ label: 'Essayer gratuitement', href: '/register' }}
      />

      <MarketingSection title="Les 6 étapes">
        <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col rounded-[24px] border border-zinc-800 bg-zinc-900/70 p-6 sm:p-7"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-green-500/20 bg-green-500/[0.08] text-sm font-semibold text-green-500">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{step.text}</p>
            </li>
          ))}
        </ol>
      </MarketingSection>

      <MarketingSection title="Avant / Avec Kadria">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-[24px] border border-zinc-800 bg-zinc-900/40 p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Avant</p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
              {BEFORE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-green-500/20 bg-green-500/[0.04] p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-500">Avec Kadria</p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-300">
              {WITH.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </MarketingSection>

      <MarketingCta
        title="Voyez comment Kadria s'applique à votre activité"
        primaryCta={{ label: 'Voir les fonctionnalités', href: '/fonctionnalites' }}
        secondaryCta={{ label: 'Demander une démo', href: '/demander-une-demo' }}
      />

      <p className="pb-4 text-center text-sm text-zinc-500">
        Comparez Kadria à votre organisation actuelle sur la page{' '}
        <Link href="/comparatif" className="font-semibold text-green-400 hover:text-green-300">
          comparatif
        </Link>
        .
      </p>
    </MarketingShell>
  );
}
