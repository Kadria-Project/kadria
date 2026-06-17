'use client';

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
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
  variant = 'default',
}: {
  children: ReactNode;
  feature: PlanFeatureKey;
  requiredPlan?: PlanKey;
  className?: string;
  variant?: 'default' | 'menuItem';
}) {
  const currentPlan = useCurrentPlan();
  const [isOpen, setIsOpen] = useState(false);

  const upgradePlan = requiredPlan ?? getRequiredPlanForFeature(feature);

  if (hasFeature(currentPlan, feature)) {
    return <>{children}</>;
  }

  const lockedChildren =
    variant === 'default' && isValidElement(children)
      ? cloneElement(
          children as ReactElement<{
            children?: ReactNode;
            className?: string;
            style?: CSSProperties;
          }>,
          {
            className: [
              (children.props as { className?: string }).className,
              'inline-flex items-center justify-center gap-2 whitespace-nowrap',
            ]
              .filter(Boolean)
              .join(' '),
            style: {
              ...((children.props as { style?: CSSProperties }).style || {}),
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              minWidth: 'max-content',
            },
            children: (
              <>
                {(children.props as { children?: ReactNode }).children}
                <Lock className="h-3.5 w-3.5 shrink-0 text-green-500/80" aria-hidden />
              </>
            ),
          }
        )
      : children;

  return (
    <>
      <div className={`relative ${className}`}>
        <div aria-hidden className="pointer-events-none opacity-60">
          {lockedChildren}
        </div>

        <button
          type="button"
          aria-label={`Découvrir le plan ${getPlanLabel(upgradePlan)}`}
          title={`Disponible avec ${getPlanLabel(upgradePlan)}`}
          onClick={() => setIsOpen(true)}
          className="absolute inset-0 z-10 rounded-[inherit] bg-zinc-950/5 transition-colors hover:bg-zinc-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/60"
        >
          <span className="sr-only">Disponible avec {getPlanLabel(upgradePlan)}</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
              Plan {getPlanLabel(upgradePlan)}
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white">
              Débloquez le suivi avancé
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Cette fonctionnalité est incluse dans le plan {getPlanLabel(upgradePlan)}. Passez au
              niveau supérieur pour automatiser davantage votre suivi commercial.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={`/checkout/${upgradePlan}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-green-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition-transform duration-150 hover:scale-[1.02]"
              >
                Passer à {getPlanLabel(upgradePlan)}
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
