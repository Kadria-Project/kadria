import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DarkNav } from '@/src/components/DarkNav';
import { Footer } from '@/src/components/KadriaPages';

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950 text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(34,197,94,0.05)_0%,transparent_60%)]" />
      <DarkNav />
      <main className="relative z-10 mx-auto max-w-[1180px] px-4 pb-20 pt-[92px] sm:px-6 sm:pb-24 sm:pt-[110px] xl:px-8">
        {children}
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

export function MarketingHero({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}) {
  return (
    <section className="pb-10 text-center sm:pb-14">
      {eyebrow ? (
        <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
        {title}
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">{subtitle}</p>
      {(primaryCta || secondaryCta) && (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {primaryCta ? (
            <Link
              href={primaryCta.href}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-semibold text-black transition-colors duration-150 hover:bg-green-400"
            >
              {primaryCta.label}
              <ArrowRight size={16} />
            </Link>
          ) : null}
          {secondaryCta ? (
            <Link
              href={secondaryCta.href}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-zinc-900"
            >
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function MarketingSection({
  title,
  text,
  children,
}: {
  title?: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-t border-zinc-800 py-10 sm:py-12">
      {title ? <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2> : null}
      {text ? <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-400">{text}</p> : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}

export function MarketingGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  const colClass =
    columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';
  return <div className={`grid grid-cols-1 gap-5 ${colClass}`}>{children}</div>;
}

export function MarketingCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col rounded-[24px] border border-zinc-800 bg-zinc-900/70 p-6 transition-colors duration-200 hover:border-green-500/25 sm:p-7">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{text}</p>
    </div>
  );
}

export function MarketingCta({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
}: {
  title: string;
  subtitle?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}) {
  return (
    <section className="border-t border-zinc-800 bg-zinc-900 py-16 text-center sm:py-20">
      <div className="mx-auto max-w-2xl px-4">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-4 text-base leading-relaxed text-zinc-400">{subtitle}</p> : null}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={primaryCta.href}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-semibold text-black transition-colors duration-150 hover:bg-green-400"
          >
            {primaryCta.label}
            <ArrowRight size={16} />
          </Link>
          {secondaryCta ? (
            <Link
              href={secondaryCta.href}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-zinc-900"
            >
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function MarketingLinks({ links }: { links: { label: string; href: string }[] }) {
  return (
    <p className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-sm text-zinc-400">
      {links.map((link, i) => (
        <span key={link.href}>
          <Link href={link.href} className="font-semibold text-green-400 hover:text-green-300">
            {link.label}
          </Link>
          {i < links.length - 1 ? <span className="text-zinc-600"> · </span> : null}
        </span>
      ))}
    </p>
  );
}
