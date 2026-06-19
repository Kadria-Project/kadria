'use client';

import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-24 text-foreground">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border/60 bg-card/70 p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Admin legacy
        </p>
        <h1 className="mt-4 text-3xl font-bold">Ce composant n&apos;est plus utilise par Kadria.</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          L&apos;ancienne version Zite du dashboard admin a ete retiree du build. Utilisez les
          routes Next.js actives du projet a la place.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Ouvrir l&apos;admin active
          </Link>
          <Link
            href="/dashboard-v2"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-semibold"
          >
            Retour au dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
