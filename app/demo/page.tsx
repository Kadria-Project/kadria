'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink, LayoutDashboard, MessageCircle } from 'lucide-react';
import { DarkNav } from '@/src/components/DarkNav';
import { useScrollReveal, ANIMATION_STYLES } from '@/src/components/KadriaPages';
import ChatWidgetInline from '@/src/components/chat/ChatWidgetInline';

export default function DemoPage() {
  useScrollReveal();

  const [activeDemo, setActiveDemo] = useState<'chat' | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  function scrollToChat() {
    setActiveDemo('chat');
    requestAnimationFrame(() => {
      chatRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white">
      <style>{ANIMATION_STYLES}</style>

      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(34,197,94,0.05)_0%,transparent_60%)]" />

      <DarkNav />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-16 pt-[100px]">
        <section className="kr-reveal kr-visible space-y-4 pb-12 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-green-500">
            Démo interactive
          </span>
          <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold leading-tight text-white">
            Voyez Kadria <span className="text-green-500">qualifier</span> un prospect
          </h1>
          <p className="mx-auto max-w-xl text-base text-zinc-400">
            Choisissez un scénario et observez comment Kadria transforme une demande en dossier
            complet en moins de 3 minutes.
          </p>
        </section>

        <section className="kr-reveal border-t border-zinc-800 pb-12 pt-12">
          <p className="mb-4 text-center text-sm text-zinc-400">Que voulez-vous tester ?</p>
          <div className="mx-auto grid max-w-[600px] grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={scrollToChat}
              className={`cursor-pointer rounded-2xl border bg-zinc-900 p-6 text-center transition-all duration-200 hover:-translate-y-[2px] ${
                activeDemo === 'chat'
                  ? 'border-green-500 bg-green-500/[0.06] shadow-[0_0_0_1px_rgba(34,197,94,0.3)]'
                  : 'border-zinc-800 hover:border-green-500/30 hover:bg-green-500/[0.04]'
              }`}
            >
              <MessageCircle size={28} className="mx-auto mb-3 text-green-500" />
              <p className="text-base font-bold text-white">Assistant Kadria</p>
              <p className="mt-1.5 text-sm text-zinc-400">
                Simulez une conversation de qualification prospect
              </p>
              <span className="mt-3 inline-block rounded-full border border-green-500/20 bg-green-500/[0.08] px-2 py-0.5 text-xs text-green-500">
                Interactif
              </span>
            </button>

            <button
              type="button"
              onClick={() => window.open('/demo-dashboard', '_blank')}
              className="cursor-pointer rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center transition-all duration-200 hover:-translate-y-[2px] hover:border-green-500/30 hover:bg-green-500/[0.04]"
            >
              <LayoutDashboard size={28} className="mx-auto mb-3 text-green-500" />
              <p className="text-base font-bold text-white">Dashboard complet</p>
              <p className="mt-1.5 text-sm text-zinc-400">
                Explorez le CRM, le Kanban et les analytics en lecture seule
              </p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/[0.08] px-2 py-0.5 text-xs text-green-500">
                Lecture seule <ExternalLink size={12} className="text-zinc-500" />
              </span>
            </button>
          </div>
        </section>

        <section className="kr-reveal border-t border-zinc-800 pb-12 pt-12">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-green-500/30 bg-zinc-900 p-6 sm:flex-row sm:p-8">
            <div className="text-center sm:text-left">
              <p className="text-base font-bold text-white">Tester avec votre propre projet</p>
              <p className="mt-1 text-sm text-zinc-400">
                Connectez Kadria à votre activité en 15 minutes
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-green-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition-transform duration-150 hover:scale-[1.02] sm:w-auto"
            >
              Commencer gratuitement <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section
          ref={chatRef}
          className={`kr-reveal border-t border-zinc-800 pt-12 ${activeDemo === 'chat' ? 'block' : 'hidden'}`}
        >
          <div className="overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900">
            <ChatHeader />
            <div className="border-b border-zinc-800 bg-zinc-800/40 px-5 py-3 text-center text-sm text-zinc-400">
              Testez Kadria avec votre propre projet
            </div>
            <div className="p-5">
              <ChatWidgetInline artisanId="Artisan_demo" />
            </div>
          </div>
        </section>

        <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-400">
          © 2025 Kadria · <Link href="/" className="text-zinc-400 transition-colors duration-150 hover:text-white">Retour à l&apos;accueil</Link>
        </footer>
      </main>
    </div>
  );
}

function ChatHeader() {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-800/40 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-extrabold text-zinc-950">
          K
        </div>
        <div>
          <p className="text-sm font-bold text-white">Kadria</p>
          <p className="text-xs text-zinc-400">Assistant en ligne</p>
        </div>
      </div>
      <span className="kr-badge-pulse h-2.5 w-2.5 rounded-full bg-green-500" />
    </div>
  );
}
