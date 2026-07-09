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
    { href: '/fonctionnalites', label: 'Fonctionnalités' },
    { href: '/demo', label: 'Mode démo' },
    { href: '/tarifs', label: 'Tarifs' },
    { href: '/ressources', label: 'Ressources' },
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
      className={`fixed inset-x-0 top-0 z-50 border-b border-white/10 px-4 transition-colors duration-200 sm:px-6 md:px-8 bg-black/55 backdrop-blur-xl ${
        scrolled ? 'md:bg-black/70 md:backdrop-blur-[14px]' : 'md:bg-black/60 md:backdrop-blur-[14px]'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-3 md:h-[68px]">
        <Link href="/" className="min-w-0 whitespace-nowrap" onClick={() => setMobileOpen(false)}>
          <KadriaLogo size="sm" noLink />
        </Link>
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-sm text-zinc-400 md:flex lg:gap-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="cursor-pointer transition-colors duration-150 hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 md:flex">
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
          mobileOpen ? 'mt-3 max-h-[420px] pb-3 opacity-100' : 'max-h-0 opacity-0'
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
