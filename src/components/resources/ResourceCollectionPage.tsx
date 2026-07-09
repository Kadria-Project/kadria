import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { DarkNav } from '@/src/components/DarkNav';
import { Footer } from '@/src/components/KadriaPages';
import type { Resource } from '@/src/data/resources';

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

export function ResourceCollectionPage({
  title,
  description,
  resources,
  backHref = '/ressources',
  backLabel = 'Retour aux ressources',
}: {
  title: string;
  description: string;
  resources: Resource[];
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 text-white">
      <DarkNav />

      <main className="px-4 pb-24 pt-28 sm:px-6 sm:pt-36">
        <div className="mx-auto max-w-[1200px]">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} />
            {backLabel}
          </Link>

          <div className="mt-8 max-w-3xl">
            <h1 className="text-3xl font-bold leading-[1.08] tracking-tight md:text-4xl">{title}</h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-400 md:text-lg">{description}</p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {resources.map((resource) => (
              <ResourceCard key={resource.slug} resource={resource} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ResourceCollectionPage;
