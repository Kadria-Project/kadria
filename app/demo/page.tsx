'use client';

import Link from 'next/link';
import { ArrowRight, LayoutDashboard, Lock, MessageCircle, ShieldCheck, Smartphone } from 'lucide-react';
import { DarkNav } from '@/src/components/DarkNav';
import { useScrollReveal, ANIMATION_STYLES } from '@/src/components/KadriaPages';

export default function DemoPage() {
  useScrollReveal();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950 text-white">
      <style>{ANIMATION_STYLES}</style>

      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(34,197,94,0.05)_0%,transparent_60%)]" />

      <DarkNav />

      <main className="relative z-10 mx-auto max-w-[1180px] px-4 pb-20 pt-[92px] sm:px-6 sm:pb-24 sm:pt-[110px] xl:px-8">
        <section className="kr-reveal kr-visible pb-10 text-center sm:pb-14">
          <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
            Demo privee
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
            Demandez un acces a la demo Kadria
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            La demo 1:1 de Kadria est reservee aux demandes qualifiees. Presentez votre
            activite et nous revenons vers vous rapidement avec le bon parcours de demonstration.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/demo/acces"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-semibold text-black transition-colors duration-150 hover:bg-green-400"
            >
              Demander un acces demo
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/demo-request"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-zinc-900"
            >
              Reserver une presentation
            </Link>
          </div>
        </section>

        <section className="kr-reveal grid gap-5 border-t border-zinc-800 py-10 sm:py-12 lg:grid-cols-3">
          <DemoCard
            icon={LayoutDashboard}
            label="Dashboard desktop"
            title="Dashboard demo desktop"
            text="Visualisez le poste de pilotage complet : dossiers, priorites, devis, relances et pipeline commercial."
            cta="Acces apres validation"
          />

          <DemoCard
            icon={Smartphone}
            label="Format mobile"
            title="Dashboard demo mobile"
            text="Previsualisez l'experience artisan sur mobile, avec navigation responsive et suivi des dossiers."
            cta="Demo guidee sur demande"
          />

          <DemoCard
            icon={MessageCircle}
            label="Assistant chat"
            title="Assistant de qualification"
            text="Decouvrez le parcours de qualification, les questions metier et la creation de dossier simulee pendant une presentation encadree."
            cta="Voir le parcours en rendez-vous"
          />
        </section>

        <section className="kr-reveal grid gap-4 border-t border-zinc-800 py-10 sm:grid-cols-3 sm:py-12">
          <TrustCard
            icon={Lock}
            title="Acces prive"
            text="Aucun acces direct au dashboard n'est accorde apres la demande. Chaque ouverture est validee manuellement."
          />
          <TrustCard
            icon={ShieldCheck}
            title="Qualification commerciale"
            text="Nous adaptons la demonstration a votre metier, votre volume de demandes et votre besoin principal."
          />
          <TrustCard
            icon={Smartphone}
            title="Parcours reel"
            text="La demo 1:1 reprend l'experience desktop, mobile et assistant sans creer de compte plateforme automatique."
          />
        </section>

        <section className="kr-reveal border-t border-zinc-800 py-10 text-center sm:py-12">
          <p className="text-sm leading-6 text-zinc-400">
            Vous souhaitez decouvrir Kadria dans votre contexte ?{' '}
            <Link href="/demo/acces" className="font-semibold text-green-500 hover:text-green-400">
              Deposez une demande d'acces
            </Link>{' '}
            ou{' '}
            <Link href="/register" className="font-semibold text-green-500 hover:text-green-400">
              creez votre compte
            </Link>
            .
          </p>
        </section>

        <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-400">
          (c) 2025 Kadria -{' '}
          <Link href="/" className="text-zinc-400 transition-colors duration-150 hover:text-white">
            Retour a l'accueil
          </Link>
        </footer>
      </main>
    </div>
  );
}

function DemoCard({
  icon: Icon,
  label,
  title,
  text,
  cta,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  title: string;
  text: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col rounded-[24px] border border-zinc-800 bg-zinc-900/70 p-6 transition-colors duration-200 hover:border-green-500/25 sm:p-7">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/[0.08] text-green-500">
        <Icon size={20} />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-green-500">
        {label}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{text}</p>
      <div className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-green-500/30 bg-green-500/[0.08] px-4 py-2.5 text-sm font-semibold text-white">
        {cta}
      </div>
    </div>
  );
}

function TrustCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Lock;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/[0.08] text-green-500">
        <Icon size={20} />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">{text}</p>
    </div>
  );
}
