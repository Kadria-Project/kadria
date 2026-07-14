import { Activity, ArrowDownRight, Flame, HelpCircle, Minus, Snowflake, TrendingUp } from 'lucide-react';
import type { CommercialMomentum, CommercialTemperature } from './tracking-types';

const temperatureStyles = {
  slate: { className: 'bg-slate-100 text-slate-600', Icon: Snowflake },
  amber: { className: 'bg-amber-50 text-amber-800', Icon: Activity },
  orange: { className: 'bg-orange-50 text-orange-800', Icon: Flame },
  emerald: { className: 'bg-emerald-50 text-emerald-800', Icon: Flame },
};

const momentumStyles = {
  emerald: { className: 'bg-emerald-50 text-emerald-800', Icon: TrendingUp },
  slate: { className: 'bg-slate-100 text-slate-600', Icon: Minus },
  amber: { className: 'bg-amber-50 text-amber-800', Icon: ArrowDownRight },
};

export function TemperatureBadge({ temperature }: { temperature: CommercialTemperature }) {
  const fallback = { className: 'bg-slate-100 text-slate-600', Icon: HelpCircle };
  const { className, Icon } = temperatureStyles[temperature.tone] || fallback;

  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${className}`}><Icon className="size-3" aria-hidden="true" />{temperature.label}</span>;
}

export function MomentumBadge({ momentum }: { momentum: CommercialMomentum }) {
  const fallback = { className: 'bg-slate-100 text-slate-600', Icon: HelpCircle };
  const { className, Icon } = momentumStyles[momentum.tone] || fallback;

  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${className}`}><Icon className="size-3" aria-hidden="true" />{momentum.label}</span>;
}
