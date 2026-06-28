'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, MessageCircle, Smartphone, X } from 'lucide-react';
import { DarkNav } from '@/src/components/DarkNav';
import { useScrollReveal, ANIMATION_STYLES } from '@/src/components/KadriaPages';

export default function DemoPage() {
  useScrollReveal();
  const router = useRouter();
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950 text-white">
      <style>{ANIMATION_STYLES}</style>

      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(34,197,94,0.05)_0%,transparent_60%)]" />

      <DarkNav />

      <main className="relative z-10 mx-auto max-w-[1180px] px-4 pb-20 pt-[92px] sm:px-6 sm:pb-24 sm:pt-[110px] xl:px-8">
        <section className="kr-reveal kr-visible pb-10 text-center sm:pb-14">
          <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
            Demo
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
            Découvrez Kadria en situation réelle
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Explorez le tableau de bord artisan, testez l&apos;expérience mobile ou discutez avec
            l&apos;assistant de qualification.
          </p>
        </section>

        <section className="kr-reveal grid gap-5 border-t border-zinc-800 py-10 sm:py-12 lg:grid-cols-3">
          <DemoCard
            icon={LayoutDashboard}
            label="Dashboard desktop"
            title="Dashboard démo desktop"
            text="Visualisez le poste de pilotage complet : dossiers, priorités, devis, relances et pipeline commercial."
            cta="Ouvrir le dashboard desktop"
            onClick={() => router.push('/demo-dashboard')}
          />

          <DemoCard
            icon={Smartphone}
            label="Format mobile"
            title="Dashboard démo mobile"
            text="Prévisualisez l'expérience artisan depuis un smartphone, comme sur le terrain."
            cta="Voir en format mobile"
            onClick={() => setMobilePreviewOpen(true)}
          />

          <DemoCard
            icon={MessageCircle}
            label="Assistant chat"
            title="Assistant chat"
            text="Testez le parcours de qualification côté prospect : questions métier, budget, délai, coordonnées et création de dossier simulée."
            cta="Tester l'assistant"
            onClick={() => router.push('/projet?artisanId=Artisan_demo')}
          />
        </section>

        <section className="kr-reveal border-t border-zinc-800 py-10 text-center sm:py-12">
          <p className="text-sm leading-6 text-zinc-400">
            Vous préférez une démonstration accompagnée ?{' '}
            <Link href="/demo-request" className="font-semibold text-green-500 hover:text-green-400">
              Réservez une démo
            </Link>{' '}
            ou{' '}
            <Link href="/register" className="font-semibold text-green-500 hover:text-green-400">
              créez votre compte
            </Link>
            .
          </p>
        </section>

        <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-400">
          (c) 2025 Kadria -{' '}
          <Link href="/" className="text-zinc-400 transition-colors duration-150 hover:text-white">
            Retour a l&apos;accueil
          </Link>
        </footer>
      </main>

      {mobilePreviewOpen && (
        <MobilePreviewModal onClose={() => setMobilePreviewOpen(false)} />
      )}
    </div>
  );
}

function DemoCard({
  icon: Icon,
  label,
  title,
  text,
  cta,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  title: string;
  text: string;
  cta: string;
  onClick: () => void;
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
      <button
        type="button"
        onClick={onClick}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-green-500/30 bg-green-500/[0.08] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-green-500/[0.14]"
      >
        {cta}
      </button>
    </div>
  );
}

function MobilePreviewModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col overflow-hidden rounded-[40px] border border-zinc-700 bg-zinc-950 shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
        style={{ width: '390px', height: '820px', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Aperçu mobile
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l'aperçu mobile"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
        <iframe
          src="/demo-dashboard?demoDevice=mobile"
          title="Dashboard démo mobile"
          className="flex-1 border-0 bg-zinc-950"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
