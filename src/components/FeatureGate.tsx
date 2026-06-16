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
          onClick={() => setIsOpen(true)}
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-zinc-950/20 transition-colors hover:bg-zinc-950/30"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/95 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            <Lock className="h-3.5 w-3.5 text-green-500" />
            Disponible avec {getPlanLabel(upgradePlan)}
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
              Votre plan actuel est {getPlanLabel(currentPlan)}. Kadria est deja pret pour une
              future facturation: ici, nous verrouillons simplement l&apos;acces sans activer de
              logique Stripe.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-green-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition-transform duration-150 hover:scale-[1.02]"
              >
                Voir les plans
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-zinc-500"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
