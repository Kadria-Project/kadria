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
  title: 'Fonctionnalités Kadria | Le cockpit commercial des artisans',
  description:
    'Découvrez les fonctionnalités Kadria pour qualifier vos demandes clients, créer des dossiers complets, suivre vos devis, relancer vos prospects et mieux piloter votre activité artisanale.',
  alternates: { canonical: '/fonctionnalites' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Fonctionnalités Kadria | Le cockpit commercial des artisans',
    description:
      'Découvrez les fonctionnalités Kadria pour qualifier vos demandes clients, créer des dossiers complets, suivre vos devis, relancer vos prospects et mieux piloter votre activité artisanale.',
    url: 'https://kadria.fr/fonctionnalites',
  },
};

const FEATURES = [
  {
    title: 'Qualification des demandes',
    text: "Chaque demande est structurée avec les informations utiles : besoin, coordonnées, délai, budget, photos et contexte du projet.",
  },
  {
    title: 'Fiche projet complète',
    text: "Toutes les informations d'un prospect sont regroupées au même endroit pour éviter les oublis et préparer le devis plus rapidement.",
  },
  {
    title: 'Assistant vocal',
    text: 'Quand vous êtes sur chantier, Kadria peut récupérer les informations clés d\'un appel et préparer un dossier exploitable.',
  },
  {
    title: 'Relances commerciales',
    text: 'Suivez les prospects à rappeler, les devis à relancer et les dossiers qui risquent de passer entre les mailles du filet.',
  },
  {
    title: 'Tableau de bord commercial',
    text: 'Visualisez vos demandes, vos priorités, vos opportunités et vos actions du jour depuis un cockpit clair.',
  },
  {
    title: 'Devis et suivi',
    text: 'Préparez vos devis, suivez les réponses clients et gardez une vision claire des dossiers gagnés, perdus ou à relancer.',
  },
  {
    title: 'Profil Métier',
    text: 'Kadria adapte les questions et les informations collectées selon votre métier : paysagiste, plombier, électricien, couvreur et bien d\'autres.',
  },
  {
    title: 'Agenda et organisation',
    text: 'Préparez vos rappels, vos visites techniques et vos prochaines actions sans multiplier les outils.',
  },
  {
    title: 'Centre de progression',
    text: 'Identifiez les réglages à compléter pour exploiter pleinement Kadria et améliorer progressivement votre organisation commerciale.',
  },
];

const REPLACES = [
  'Carnet papier',
  'Messages WhatsApp dispersés',
  'Notes vocales oubliées',
  'Fichiers Excel',
  'Rappels manuels',
  'Prospects perdus dans les appels',
];

export default function FonctionnalitesPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Fonctionnalités"
        title="Toutes les fonctionnalités pour transformer vos demandes en chantiers"
        subtitle="Kadria centralise vos prospects, structure vos demandes, prépare vos dossiers et vous aide à suivre chaque opportunité commerciale jusqu'au devis."
        primaryCta={{ label: 'Essayer gratuitement', href: '/register' }}
        secondaryCta={{ label: 'Demander une démo', href: '/demander-une-demo' }}
      />

      <MarketingSection
        title="Un cockpit commercial pensé pour les artisans"
        text="Kadria n'est pas un simple formulaire, ni un tableau de suivi générique. C'est un espace de travail conçu pour aider les artisans à gérer leurs demandes entrantes, prioriser les bons prospects et avancer plus vite vers le devis."
      >
        <MarketingGrid columns={3}>
          {FEATURES.map((f) => (
            <MarketingCard key={f.title} title={f.title} text={f.text} />
          ))}
        </MarketingGrid>
      </MarketingSection>

      <MarketingSection title="Ce que Kadria remplace">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPLACES.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-sm font-medium text-zinc-300"
            >
              {item}
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        title="Une plateforme unique pour reprendre le contrôle"
        text="L'objectif de Kadria est simple : vous aider à savoir quoi traiter, quand le traiter, et avec quelles informations. Moins de dispersion, plus de dossiers exploitables, plus de visibilité commerciale."
      >
        <MarketingLinks
          links={[
            { label: 'Assistant vocal', href: '/assistant-vocal-artisan' },
            { label: 'Site vitrine connecté', href: '/site-vitrine-artisan' },
            { label: 'Comment ça marche', href: '/comment-ca-marche' },
            { label: 'Profil Métier', href: '/ressources/profil-metier-kadria' },
          ]}
        />
      </MarketingSection>

      <MarketingCta
        title="Prêt à voir Kadria en action ?"
        subtitle="Testez gratuitement ou demandez une démonstration adaptée à votre métier."
        primaryCta={{ label: 'Essayer gratuitement', href: '/register' }}
        secondaryCta={{ label: 'Demander une démo', href: '/demander-une-demo' }}
      />
    </MarketingShell>
  );
}
