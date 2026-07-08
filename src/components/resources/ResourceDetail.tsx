import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { DarkNav } from '@/src/components/DarkNav';
import { Footer } from '@/src/components/KadriaPages';
import type { Resource } from '@/src/data/resources';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ResourceDetail({ resource }: { resource: Resource }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 text-white">
      <DarkNav />

      <main className="px-4 pb-24 pt-28 sm:px-6 sm:pt-36">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/ressources"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} />
            Retour aux ressources
          </Link>

          <div className="mt-8">
            <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-green-400">
              {resource.category}
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight leading-[1.1] md:text-4xl">
              {resource.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
              <span>{formatDate(resource.publishedAt)}</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} />
                {resource.readingTime} de lecture
              </span>
            </div>
          </div>

          <article className="mt-12 space-y-6">
            {resource.content.map((block, index) => {
              if (block.type === 'heading') {
                return (
                  <h2 key={index} className="pt-4 text-xl font-bold tracking-tight text-white md:text-2xl">
                    {block.text}
                  </h2>
                );
              }
              if (block.type === 'list') {
                return (
                  <ul key={index} className="space-y-2.5">
                    {block.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-3 text-base leading-7 text-zinc-400">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={index} className="text-base leading-7 text-zinc-400">
                  {block.text}
                </p>
              );
            })}
          </article>

          <div className="mt-16 rounded-2xl border border-green-500/20 bg-green-500/[0.06] p-8 text-center sm:p-10">
            <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              Prêt à mieux transformer vos demandes en chantiers ?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 md:text-base">
              Essayez Kadria gratuitement ou demandez une démo pour découvrir comment centraliser
              vos prospects, vos devis et vos relances.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-accent px-6 py-3 text-sm font-semibold text-background transition-all duration-150 hover:scale-[1.02] hover:opacity-90 sm:w-auto"
              >
                Essai gratuit
              </Link>
              <Link
                href="/demo-request"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] border border-zinc-800 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-zinc-900 sm:w-auto"
              >
                Demander une démo
              </Link>
            </div>
          </div>

          <div className="mt-10">
            <Link
              href="/ressources"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              <ArrowLeft size={15} />
              Retour aux ressources
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ResourceDetail;
