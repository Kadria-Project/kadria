'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import {
  getPlanLabel,
  getRequiredPlanForFeature,
  hasFeature,
  normalizePlan,
  type PlanFeatureKey,
  type PlanKey,
} from '@/src/lib/plans';

const PlanContext = createContext<PlanKey>('essentiel');

export function PlanProvider({
  plan,
  children,
}: {
  plan?: string | null;
  children: ReactNode;
}) {
  const value = useMemo(() => normalizePlan(plan), [plan]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function useCurrentPlan(): PlanKey {
  return useContext(PlanContext);
}

export function FeatureGate({
  children,
  feature,
  requiredPlan,
  className = '',
}: {
  children: ReactNode;
  feature: PlanFeatureKey;
  requiredPlan?: PlanKey;
  className?: string;
}) {
  const currentPlan = useCurrentPlan();
  const [isOpen, setIsOpen] = useState(false);

  const upgradePlan = requiredPlan ?? getRequiredPlanForFeature(feature);

  if (hasFeature(currentPlan, feature)) {
    return <>{children}</>;
  }

  return (
    <>
      <div className={`relative ${className}`}>
        <div aria-hidden className="pointer-events-none opacity-60">
          {children}
        </div>

        <button
          type="button"
          aria-label={`Decouvrir le plan ${getPlanLabel(upgradePlan)}`}
          onClick={() => setIsOpen(true)}
          className="absolute inset-0 z-10 rounded-[inherit] bg-zinc-950/10 transition-colors hover:bg-zinc-950/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/60"
        >
          <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-950/95 px-2 py-1 text-[11px] font-semibold text-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            <Lock className="h-3 w-3 text-green-500" />
            {getPlanLabel(upgradePlan)}
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
              Upgrade requis
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white">
              Cette fonctionnalite est reservee au plan {getPlanLabel(upgradePlan)}
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Votre plan actuel est {getPlanLabel(currentPlan)}. Passez au plan{' '}
              {getPlanLabel(upgradePlan)} pour debloquer cette fonctionnalite et automatiser
              davantage votre suivi commercial.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={`/checkout/${upgradePlan}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-green-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition-transform duration-150 hover:scale-[1.02]"
              >
                Passer a {getPlanLabel(upgradePlan)}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-zinc-500"
              >
                Comparer les plans
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md px-4 py-3 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
