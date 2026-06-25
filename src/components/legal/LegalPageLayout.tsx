import type { ReactNode } from 'react';
import { KadriaLogo } from '@/src/components/KadriaLogo';
import { Footer } from '@/src/components/KadriaPages';

/**
 * Layout partagé pour les pages légales publiques (/privacy, /terms, /legal).
 * Reprend l'identité visuelle sombre de la landing page (fond anthracite,
 * accent vert, texte off-white) sans dupliquer tout le chrome de la landing
 * (header complet, menu mobile, modales). Réutilise le Footer existant pour
 * que les liens légaux y apparaissent partout de façon cohérente.
 */
export function LegalPageLayout({
  title,
  intro,
  lastUpdated,
  children,
}: {
  title: string;
  intro: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-white/5 bg-[#0a0b0f]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1488px] items-center justify-between px-4 sm:px-6">
          <KadriaLogo size="sm" />
        </div>
      </header>

      <main className="px-4 pb-24 pt-16 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight leading-[1.05] md:text-5xl">{title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-400">{intro}</p>
          <p className="mt-4 text-sm text-zinc-500">Dernière mise à jour : {lastUpdated}</p>
        </div>

        <div className="mx-auto mt-14 max-w-3xl space-y-6">{children}</div>
      </main>

      <Footer />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-8 md:px-10">
      <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-zinc-400">{children}</div>
    </section>
  );
}

/**
 * Badge visuel pour les champs juridiques non confirmés (SIREN, TVA,
 * adresse, capital social, directeur de publication...). Affiché de façon
 * visible — jamais omis, jamais inventé — pour signaler clairement à un
 * futur éditeur ce qu'il reste à compléter.
 */
export function ToComplete() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-400">
      À compléter
    </span>
  );
}

export function LegalField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/5 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-semibold text-zinc-300">{label}</span>
      <span className="text-sm text-zinc-400">{value}</span>
    </div>
  );
}
