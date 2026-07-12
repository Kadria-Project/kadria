'use client';

// Local-only UX/UI audit toolbar.
//
// This component is only ever rendered when the server-side layout has
// already verified `isLocalUxAuditEnabled` (NODE_ENV !== 'production' AND
// KADRIA_LOCAL_UX_AUDIT === 'true'). It receives that decision as a plain
// boolean prop — no secret/env value is ever sent to the browser. It is a
// pure navigation/scenario-switch convenience for local Playwright/manual
// audits and never touches real data or real auth cookies.

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const SCREENS: Array<{ label: string; href: string }> = [
  { label: 'Dashboard', href: '/demo-dashboard' },
  { label: 'Paramètres', href: '/demo-parametres' },
  { label: 'Onboarding', href: '/demo-dashboard/onboarding' },
];

const SCENARIOS = ['normal', 'dense', 'empty', 'essential', 'performance'] as const;

export default function LocalUxAuditToolbar({ enabled }: { enabled: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  if (!enabled) return null;
  if (searchParams.get('auditToolbar') === 'false') return null;

  const scenario = searchParams.get('scenario') || 'normal';

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      data-ux-audit-toolbar="true"
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        zIndex: 999999,
        background: '#111827',
        color: '#f9fafb',
        fontSize: 11,
        fontFamily: 'monospace',
        borderRadius: 8,
        padding: '6px 10px',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        opacity: 0.85,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <span style={{ fontWeight: 700, color: '#facc15' }}>UX AUDIT (local)</span>
      <select
        value={scenario}
        onChange={(e) => setParam('scenario', e.target.value)}
        style={{ background: '#1f2937', color: '#f9fafb', border: 'none', fontSize: 11 }}
      >
        {SCENARIOS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {SCREENS.map((s) => (
        <a key={s.href} href={s.href} style={{ color: '#93c5fd' }}>
          {s.label}
        </a>
      ))}
    </div>
  );
}
