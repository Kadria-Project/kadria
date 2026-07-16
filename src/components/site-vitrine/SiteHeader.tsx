'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { NavLink } from '@/src/lib/site-vitrine/types'

type SiteHeaderProps = {
  wordmark: [string, string]
  tagline: string
  nav: NavLink[]
  phoneDisplay: string
  phoneNote: string
  ctaLabel: string
  ctaHref: string
}

export function SiteHeader({
  wordmark,
  tagline,
  nav,
  phoneDisplay,
  phoneNote,
  ctaLabel,
  ctaHref,
}: SiteHeaderProps) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const closeMenu = () => setOpen(false)

  return (
    <header
      className="sticky top-0 z-40 transition-shadow"
      style={{
        background: 'var(--sv-paper)',
        borderBottom: '1px solid var(--sv-line)',
        boxShadow: scrolled ? '0 1px 12px rgba(19,28,43,0.07)' : 'none',
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <a href="#haut" className="flex min-w-0 items-baseline gap-2" aria-label={`${wordmark[0]} ${wordmark[1]} — retour en haut de page`}>
          <span
            className="text-xl font-extrabold leading-none tracking-tight"
            style={{ color: 'var(--sv-night)', fontFamily: 'var(--font-sv-display)' }}
          >
            {wordmark[0]}
            <span aria-hidden="true" style={{ color: 'var(--sv-accent)' }}>
              ⌁
            </span>
            {wordmark[1]}
          </span>
          <span className="hidden truncate text-xs lg:inline" style={{ color: 'var(--sv-muted)' }}>
            {tagline}
          </span>
        </a>

        <nav aria-label="Navigation principale" className="hidden items-center gap-6 lg:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-sm font-medium transition-colors hover:opacity-100"
              style={{ color: 'var(--sv-body)' }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-right md:block" title={phoneNote}>
            <span className="block text-sm font-semibold tabular-nums" style={{ color: 'var(--sv-night)' }}>
              {phoneDisplay}
            </span>
            <span className="block text-[10px] leading-tight" style={{ color: 'var(--sv-muted)' }}>
              {phoneNote}
            </span>
          </span>
          <Link
            href={ctaHref}
            className="hidden whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors sm:inline-block"
            style={{ background: 'var(--sv-accent)' }}
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md lg:hidden"
            style={{ border: '1px solid var(--sv-line)', color: 'var(--sv-night)' }}
            aria-expanded={open}
            aria-controls="sv-mobile-menu"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      <div
        id="sv-mobile-menu"
        hidden={!open}
        className="lg:hidden"
        style={{ background: 'var(--sv-paper)', borderTop: '1px solid var(--sv-line)' }}
      >
        <nav aria-label="Navigation mobile" className="mx-auto max-w-6xl px-4 pb-5 pt-2 sm:px-6">
          <ul>
            {nav.map((item) => (
              <li key={item.href} style={{ borderBottom: '1px solid var(--sv-line)' }}>
                <a
                  href={item.href}
                  onClick={closeMenu}
                  className="flex min-h-12 items-center justify-between py-3 text-base font-medium"
                  style={{ color: 'var(--sv-ink)' }}
                >
                  {item.label}
                  <span aria-hidden="true" style={{ color: 'var(--sv-accent)' }}>
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-3">
            <Link
              href={ctaHref}
              onClick={closeMenu}
              className="rounded-md px-4 py-3.5 text-center text-base font-semibold text-white"
              style={{ background: 'var(--sv-accent)' }}
            >
              {ctaLabel}
            </Link>
            <p className="text-center text-sm" style={{ color: 'var(--sv-muted)' }}>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--sv-night)' }}>
                {phoneDisplay}
              </span>
              {' — '}
              {phoneNote}
            </p>
          </div>
        </nav>
      </div>
    </header>
  )
}
