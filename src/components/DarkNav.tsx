'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { KadriaLogo } from '@/src/components/KadriaLogo';

export function DarkNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '/demo', label: 'Essayer' },
    { href: '/tarifs', label: 'Tarifs' },
  ];

  return (
    <header
      className={`fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-5xl min-h-14 -translate-x-1/2 rounded-2xl border border-white/10 px-8 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition-colors duration-200 ${
        scrolled ? 'border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-[12px]' : 'bg-white/[0.06] backdrop-blur-[16px]'
      }`}
    >
      <div className="flex items-center">
        <Link href="/" className="whitespace-nowrap">
          <KadriaLogo size="sm" noLink />
        </Link>
        <nav className="ml-auto hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="cursor-pointer transition-colors duration-150 hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-8 hidden items-center gap-3 md:flex">
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
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-accent px-4 py-2 text-sm font-semibold text-background transition-all duration-150 hover:scale-[1.02] hover:opacity-90"
          >
            Essai gratuit
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl text-white md:hidden"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-[250ms] ease-out md:hidden ${
          mobileOpen ? 'mt-3 max-h-[420px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="-mx-8 rounded-b-2xl border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-[12px]">
          <nav className="flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="border-b border-zinc-800 px-6 py-4 text-lg text-zinc-300 transition-colors duration-150 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/demo-request"
              onClick={() => setMobileOpen(false)}
              className="border-b border-zinc-800 px-6 py-4 text-lg text-zinc-300 transition-colors duration-150 hover:text-white"
            >
              Demander une démo
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="border-b border-zinc-800 px-6 py-4 text-lg text-zinc-300 transition-colors duration-150 hover:text-white"
            >
              Se connecter
            </Link>
          </nav>
          <div className="flex flex-col gap-3 p-6">
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-11 w-full items-center justify-center rounded-[10px] bg-accent px-5 py-2 text-sm font-semibold text-background transition-transform duration-200 hover:scale-[1.02] hover:opacity-90"
            >
              Essai gratuit
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default DarkNav;
