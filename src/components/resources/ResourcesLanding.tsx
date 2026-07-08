import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { DarkNav } from '@/src/components/DarkNav';
import { Footer } from '@/src/components/KadriaPages';
import {
  getAllResources,
  getFeaturedResources,
  getResourcesByCategory,
  type Resource,
  type ResourceCategory,
} from '@/src/data/resources';

type LandingResourceCategory =
  | ResourceCategory
  | 'Cas d’utilisation'
  | 'Fonctionnalité'
  | 'Nouveautés'
  | 'Métier';

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Link
      href={`/ressources/${resource.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition-colors duration-150 hover:border-green-500/30 hover:bg-zinc-900"
    >
      <span className="inline-flex w-fit items-center rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-green-400">
        {resource.category}
      </span>
      <h3 className="mt-4 text-lg font-semibold leading-snug text-white">{resource.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{resource.excerpt}</p>
      <div className="mt-5 flex items-center justify-between text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={13} />
          {resource.readingTime} de lecture
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-green-400 transition-transform duration-150 group-hover:translate-x-0.5">
          Lire
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}

function ResourceSection({
  id,
  title,
  description,
  resources,
}: {
  id: string;
  title: string;
  description?: string;
  resources: Resource[];
}) {
  if (resources.length === 0) return null;
  return (
    <section id={id} className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{title}</h2>
        {description && <p className="mt-3 text-base leading-relaxed text-zinc-400">{description}</p>}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <ResourceCard key={resource.slug} resource={resource} />
        ))}
      </div>
    </section>
  );
}

const CATEGORY_SECTIONS: { id: string; title: string; description?: string; category: LandingResourceCategory }[] = [
  {
    id: 'metier',
    title: 'Ressources métier',
    description: 'Kadria adapté à votre corps de métier : paysagiste, plombier, électricien, couvreur...',
    category: 'Métier',
  },
  {
    id: 'cas-utilisation',
    title: 'Cas d’utilisation',
    description: 'Comment Kadria transforme concrètement vos demandes en dossiers exploitables.',
    category: 'Cas d’utilisation',
  },
  {
    id: 'fonctionnalites',
    title: 'Fonctionnalités expliquées',
    description: 'Le fonctionnement des outils Kadria, expliqué simplement.',
    category: 'Fonctionnalité',
  },
  {
    id: 'guides',
    title: 'Guides & conseils',
    description: 'Des méthodes concrètes pour mieux gérer vos prospects, vos devis et vos relances.',
    category: 'Guide',
  },
  {
    id: 'nouveautes',
    title: 'Nouveautés produit',
    description: 'Les dernières évolutions du produit, mois après mois.',
    category: 'Nouveautés',
  },
];

export function ResourcesLanding() {
  const featured = getFeaturedResources();

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 text-white">
      <DarkNav />

      <main>
        <section className="px-4 pb-16 pt-32 sm:px-6 sm:pt-40">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-green-400">
              Kadria Academy
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight leading-[1.08] md:text-5xl">
              Ressources pour mieux transformer vos demandes en chantiers
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-zinc-400">
              Cas d’usage, conseils terrain, nouveautés produit et méthodes concrètes pour mieux
              gérer vos prospects, vos devis et vos relances avec Kadria.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#a-la-une"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-accent px-6 py-3 text-sm font-semibold text-background transition-all duration-150 hover:scale-[1.02] hover:opacity-90 sm:w-auto"
              >
                Explorer les ressources
              </a>
              <a
                href="#nouveautes"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] border border-zinc-800 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-zinc-900 sm:w-auto"
              >
                Voir les nouveautés
              </a>
            </div>
          </div>
        </section>

        <ResourceSection
          id="a-la-une"
          title="À la une"
          description="Les ressources à ne pas manquer ce mois-ci."
          resources={featured}
        />

        {CATEGORY_SECTIONS.map((section) => (
          <ResourceSection
            key={section.id}
            id={section.id}
            title={section.title}
            description={section.description}
            resources={getResourcesByCategory(section.category as ResourceCategory)}
          />
        ))}

        {getAllResources().length === 0 && (
          <div className="mx-auto max-w-[1200px] px-4 py-24 text-center text-zinc-500 sm:px-6">
            De nouvelles ressources arrivent bientôt.
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default ResourcesLanding;
