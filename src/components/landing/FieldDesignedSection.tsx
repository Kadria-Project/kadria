'use client';

import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  CircleX,
  FileText,
  LayoutPanelTop,
  PanelsTopLeft,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
  Users,
  Zap,
} from 'lucide-react';

const CARD = 'oklch(0.19 0.01 260 / 0.9)';
const CARD_SOFT = 'oklch(0.22 0.01 260 / 0.94)';
const BORDER = 'oklch(1 0 0 / 0.09)';
const TEXT = 'oklch(0.96 0.004 90)';
const MUTED = 'oklch(0.71 0.012 255)';
const DIM = 'oklch(0.57 0.012 255)';
const GREEN = 'oklch(0.84 0.19 147)';

const crmLimits = [
  { text: 'Trop de champs à remplir', icon: FileText },
  { text: 'Trop d’écrans', icon: LayoutPanelTop },
  { text: 'Trop de paramétrage', icon: Settings2 },
  { text: 'Pensé pour des équipes commerciales', icon: Users },
  { text: 'Peu adapté aux demandes travaux', icon: Sparkles },
  { text: "L’artisan abandonne vite", icon: PanelsTopLeft },
];

const kadriaUpsides = [
  { text: 'Dossiers prêts à traiter', icon: FileText },
  { text: 'Actions du jour claires', icon: CheckCircle2 },
  { text: 'Devis à suivre', icon: FileText },
  { text: 'Relances recommandées', icon: Sparkles },
  { text: 'Portail client activé', icon: UserRound },
  { text: 'Pilotage simple', icon: ArrowRight },
];

const benefits = [
  {
    title: 'Prise en main rapide',
    text: 'Commencez à gagner du temps dès les premières demandes.',
    icon: Zap,
  },
  {
    title: 'Pensé mobile',
    text: 'Tout ce qu’il faut, partout, tout le temps.',
    icon: Smartphone,
  },
  {
    title: 'Pas besoin d’être commercial',
    text: 'Kadria vous guide, vous alerte et vous recommande.',
    icon: UserRound,
  },
  {
    title: 'Vous gardez le contrôle',
    text: 'Vos données, vos clients, vos décisions.',
    icon: ShieldCheck,
  },
];

function appear(index = 0, reduced = false) {
  return reduced
    ? {}
    : {
        initial: { opacity: 0, y: 22 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay: index * 0.06 },
      };
}

function CompareListCard({
  title,
  items,
  positive,
  mobileNegativeTitle,
  index,
  reduced,
}: {
  title: string;
  items: Array<{ text: string; icon: typeof FileText }>;
  positive: boolean;
  mobileNegativeTitle?: string;
  index: number;
  reduced: boolean;
}) {
  const cardTitle = mobileNegativeTitle ?? title;

  return (
    <motion.div
      {...appear(index, reduced)}
      className={`rounded-[22px] border px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5 ${positive ? 'lg:shadow-[0_24px_70px_rgba(15,60,24,0.22)]' : ''}`}
      style={{
        background: positive
          ? 'linear-gradient(180deg, rgba(9,29,17,0.94), rgba(7,20,13,0.98))'
          : 'linear-gradient(180deg, rgba(20,24,31,0.92), rgba(13,16,22,0.98))',
        borderColor: positive ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          className={`text-[18px] font-semibold sm:text-[20px] ${positive ? 'text-green-400' : 'text-white/75'}`}
          style={positive ? undefined : { color: 'rgba(255,255,255,0.72)' }}
        >
          {cardTitle}
        </h3>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border"
          style={{
            background: positive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
            borderColor: positive ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.08)',
            color: positive ? GREEN : 'rgba(255,255,255,0.65)',
          }}
        >
          {positive ? <CheckCircle2 size={18} /> : <CircleX size={18} />}
        </div>
      </div>

      <div className="mt-4 divide-y" style={{ borderColor: positive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.07)' }}>
        {items.map((item) => (
          <div key={item.text} className="flex items-center gap-3 py-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
              style={{
                background: positive
                  ? 'rgba(34,197,94,0.12)'
                  : 'rgba(255,255,255,0.06)',
                border: positive
                  ? '1px solid rgba(34,197,94,0.18)'
                  : '1px solid rgba(255,255,255,0.08)',
                color: positive ? GREEN : 'rgba(255,255,255,0.7)',
              }}
            >
              <item.icon size={17} />
            </div>
            <p className="text-[14px] leading-[1.45] sm:text-[15px]" style={{ color: positive ? TEXT : 'rgba(255,255,255,0.9)' }}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function BenefitCard({
  title,
  text,
  icon: Icon,
  index,
  reduced,
}: {
  title: string;
  text: string;
  icon: typeof Zap;
  index: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      {...appear(index, reduced)}
      className="rounded-[18px] border px-3.5 py-3.5 sm:rounded-[20px] sm:px-4 sm:py-4 lg:px-4.5 lg:py-4.5"
      style={{
        background: 'linear-gradient(180deg, rgba(13,17,24,0.92), rgba(9,12,18,0.98))',
        borderColor: 'rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-[10px] sm:h-9 sm:w-9 sm:rounded-[11px]"
        style={{
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.18)',
          color: GREEN,
        }}
      >
        <Icon size={15} />
      </div>
      <p className="mt-2.5 text-[14px] font-semibold leading-[1.22] sm:mt-3 sm:text-[15px]" style={{ color: TEXT }}>
        {title}
      </p>
      <p className="mt-1.5 text-[12px] leading-[1.45] sm:mt-2 sm:text-[12.5px] sm:leading-[1.5]" style={{ color: MUTED }}>
        {text}
      </p>
    </motion.div>
  );
}

export default function FieldDesignedSection() {
  const reduced = Boolean(useReducedMotion());

  return (
    <section className="relative overflow-hidden bg-[#070b11] px-4 py-16 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 24% 18%, rgba(34,197,94,0.12), transparent 34%), radial-gradient(circle at 76% 24%, rgba(34,197,94,0.08), transparent 28%), linear-gradient(180deg, rgba(4,7,11,0.95), rgba(5,8,13,0.98))',
        }}
      />

      <div
        className="relative mx-auto max-w-[1760px] overflow-hidden rounded-[30px] border px-4 py-6 shadow-[0_30px_110px_rgba(0,0,0,0.34)] sm:px-6 sm:py-8 lg:px-8 lg:py-9"
        style={{
          background: 'linear-gradient(180deg, rgba(8,12,18,0.94), rgba(7,10,16,0.98))',
          borderColor: BORDER,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[18%] top-0 h-52 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0.03) 45%, transparent 72%)',
          }}
        />

        <motion.div {...appear(0, reduced)} className="relative mx-auto max-w-4xl text-center">
          <div
            className="inline-flex rounded-full border px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] sm:text-[11px]"
            style={{
              color: GREEN,
              borderColor: 'rgba(34,197,94,0.24)',
              background: 'rgba(6,18,11,0.72)',
            }}
          >
            Pensé terrain
          </div>
          <h2 className="mt-5 text-balance text-[1.95rem] font-semibold leading-[1.02] text-white sm:text-[2.7rem] lg:text-[4rem]">
            Un outil commercial pensé pour les <span style={{ color: GREEN }}>artisans</span>, pas pour les commerciaux.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-pretty text-[14px] leading-6 sm:text-[16px] sm:leading-7" style={{ color: MUTED }}>
            Kadria va à l&apos;essentiel : comprendre la demande, prioriser les bons dossiers, suivre les devis et vous dire quoi faire ensuite. Sans paramétrage lourd ni jargon métier inutile.
          </p>
        </motion.div>

        <div className="relative mt-8 hidden items-center gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]">
          <CompareListCard title="Un CRM classique" items={crmLimits} positive={false} index={1} reduced={reduced} />

          <motion.div {...appear(2, reduced)} className="flex flex-col items-center justify-center gap-3">
            <div className="flex w-full items-center gap-2">
              <div
                className="h-px flex-1 border-t border-dashed"
                style={{ borderColor: 'rgba(34,197,94,0.24)' }}
              />
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full border"
                style={{
                  background: 'rgba(9,28,16,0.82)',
                  borderColor: 'rgba(34,197,94,0.34)',
                  color: GREEN,
                  boxShadow: '0 0 28px rgba(34,197,94,0.18)',
                }}
              >
                <ArrowRight size={24} />
              </div>
              <div
                className="h-px flex-1 border-t border-dashed"
                style={{ borderColor: 'rgba(34,197,94,0.24)' }}
              />
            </div>
            <p className="text-center text-[14px] font-medium leading-5" style={{ color: GREEN }}>
              Kadria simplifie
            </p>
          </motion.div>

          <CompareListCard title="Kadria" items={kadriaUpsides} positive index={3} reduced={reduced} />
        </div>

        <div className="relative mt-8 space-y-4 lg:hidden">
          <CompareListCard title="Kadria" items={kadriaUpsides} positive index={1} reduced={reduced} />
          <CompareListCard
            title="Un CRM classique"
            mobileNegativeTitle="Ce que Kadria évite"
            items={crmLimits}
            positive={false}
            index={2}
            reduced={reduced}
          />
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 lg:mt-6 lg:grid-cols-4 lg:gap-4">
          {benefits.map((benefit, index) => (
            <BenefitCard key={benefit.title} {...benefit} index={index + 4} reduced={reduced} />
          ))}
        </div>

        <motion.div
          {...appear(9, reduced)}
          className="relative mx-auto mt-6 flex max-w-3xl items-start justify-center gap-2.5 text-center"
        >
          <ShieldCheck className="mt-0.5 shrink-0" size={16} style={{ color: DIM }} />
          <p className="text-[12px] leading-6 sm:text-[13px]" style={{ color: DIM }}>
            Kadria est un assistant commercial, pas un CRM complexe.{' '}
            <span style={{ color: GREEN }}>Simple, clair et pensé pour votre quotidien sur le terrain.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
