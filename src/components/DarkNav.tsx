'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { KadriaLogo } from '@/src/components/KadriaLogo';
import { openTrialPlanModal, TrialPlanModal } from '@/src/components/KadriaPages';

export function DarkNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  const navLinks = [
    { href: '/demo', label: 'Mode démo' },
    { href: '/tarifs', label: 'Tarifs' },
  ];

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}
      <header
      className={`fixed left-1/2 top-3 z-50 w-[calc(100%-1rem)] max-w-5xl -translate-x-1/2 rounded-2xl border border-white/10 px-4 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition-colors duration-200 sm:w-[calc(100%-2rem)] sm:px-5 md:top-4 md:px-8 md:py-3 ${
        scrolled ? 'border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-[12px]' : 'bg-white/[0.06] backdrop-blur-[16px]'
      }`}
    >
      <div className="flex min-h-11 items-center gap-3">
        <Link href="/" className="min-w-0 whitespace-nowrap" onClick={() => setMobileOpen(false)}>
          <KadriaLogo size="sm" noLink />
        </Link>
        <nav className="ml-auto hidden items-center gap-6 text-sm text-zinc-400 md:flex lg:gap-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="cursor-pointer transition-colors duration-150 hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-6 hidden items-center gap-3 md:flex">
          <Link
            href="/demo-request"
            className="rounded-[10px] border border-zinc-800 px-4 py-2 text-sm text-white transition-colors duration-150 hover:bg-zinc-900"
          >
            Demander une démo
          </Link>
          <Link
            href="/login"
            className="rounded-[10px] border border-zinc-800 px-4 py-2 text-sm text-white transition-colors duration-150 hover:bg-zinc-900"
          >
            Se connecter
          </Link>
          <button
            type="button"
            onClick={() => openTrialPlanModal()}
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-accent px-4 py-2 text-sm font-semibold text-background transition-all duration-150 hover:scale-[1.02] hover:opacity-90"
          >
            Essai gratuit
          </button>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={mobileOpen}
          className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white md:hidden"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-[250ms] ease-out md:hidden ${
          mobileOpen ? 'mt-3 max-h-[420px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-[12px]">
          <nav className="flex flex-col px-2 py-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-base text-zinc-300 transition-colors duration-150 hover:bg-white/[0.03] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/demo-request"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 text-base text-zinc-300 transition-colors duration-150 hover:bg-white/[0.03] hover:text-white"
            >
              Demander une démo
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 text-base text-zinc-300 transition-colors duration-150 hover:bg-white/[0.03] hover:text-white"
            >
              Se connecter
            </Link>
          </nav>
          <div className="grid gap-3 border-t border-white/10 p-4">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openTrialPlanModal();
              }}
              className="flex min-h-11 w-full items-center justify-center rounded-[10px] bg-accent px-5 py-2 text-sm font-semibold text-background transition-transform duration-200 hover:scale-[1.02] hover:opacity-90"
            >
              Essai gratuit
            </button>
          </div>
        </div>
      </div>
    </header>
    <TrialPlanModal />
    </>
  );
}

export default DarkNav;
