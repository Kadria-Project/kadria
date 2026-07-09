'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Bell,
  Clock3,
  Euro,
  Eye,
  FileText,
  Gauge,
  PhoneCall,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';

const CARD = 'oklch(0.19 0.01 260 / 0.9)';
const CARD_SOFT = 'oklch(0.22 0.01 260 / 0.94)';
const BORDER = 'oklch(1 0 0 / 0.09)';
const TEXT = 'oklch(0.96 0.004 90)';
const MUTED = 'oklch(0.71 0.012 255)';
const DIM = 'oklch(0.57 0.012 255)';
const GREEN = 'oklch(0.84 0.19 147)';

type SliderKey =
  | 'demandesMois'
  | 'tauxNonTraite'
  | 'tauxConversion'
  | 'panierMoyen'
  | 'devisOublies';

type SliderConfig = {
  key: SliderKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  value: number;
  suffix?: string;
  icon: typeof PhoneCall;
  color: string;
};

const sliderConfigs: SliderConfig[] = [
  {
    key: 'demandesMois',
    label: 'Demandes reçues / mois',
    hint: 'Appels, formulaires, messages...',
    min: 20,
    max: 300,
    value: 120,
    icon: PhoneCall,
    color: 'oklch(0.82 0.18 155)',
  },
  {
    key: 'tauxNonTraite',
    label: 'Demandes non traitées',
    hint: 'Non vues ou sans réponse',
    min: 5,
    max: 80,
    value: 30,
    suffix: '%',
    icon: Eye,
    color: 'oklch(0.79 0.16 55)',
  },
  {
    key: 'tauxConversion',
    label: 'Taux de conversion actuel',
    hint: 'Devis signés / demandes qualifiées',
    min: 5,
    max: 40,
    value: 18,
    suffix: '%',
    icon: FileText,
    color: 'oklch(0.74 0.15 300)',
  },
  {
    key: 'panierMoyen',
    label: 'Panier moyen par chantier',
    hint: "Montant moyen d'un chantier signé",
    min: 500,
    max: 10000,
    value: 3200,
    suffix: 'EUR',
    icon: Euro,
    color: 'oklch(0.78 0.15 245)',
  },
  {
    key: 'devisOublies',
    label: 'Devis oubliés / non relancés',
    hint: 'Chaque mois',
    min: 0,
    max: 30,
    value: 8,
    icon: Clock3,
    color: 'oklch(0.75 0.17 20)',
  },
];

const benefitCards = [
  {
    title: 'Un outil qui vous fait gagner du temps',
    text: 'Fini les tâches manuelles et la ressaisie.',
    icon: Clock3,
  },
  {
    title: 'Plus de demandes traitées',
    text: 'Chaque opportunité est capturée et suivie.',
    icon: TrendingUp,
  },
  {
    title: "Moins d'oublis, plus de relances",
    text: 'Kadria vous alerte au bon moment.',
    icon: Bell,
  },
  {
    title: 'Plus de chantiers gagnés',
    text: 'Transformez plus de devis en clients.',
    icon: Target,
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

function formatEuro(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits }).format(value);
}

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}

function buildSliderBackground(value: number, min: number, max: number) {
  const percent = ((value - min) / (max - min)) * 100;
  return `linear-gradient(90deg, ${GREEN} 0%, ${GREEN} ${percent}%, rgba(255,255,255,0.12) ${percent}%, rgba(255,255,255,0.12) 100%)`;
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
  icon: typeof Clock3;
  index: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      {...appear(index, reduced)}
      className="rounded-[18px] border px-3.5 py-3.5 sm:rounded-[20px] sm:px-4 sm:py-4 lg:px-5 lg:py-4"
      style={{
        background: 'linear-gradient(180deg, rgba(13,17,24,0.92), rgba(9,12,18,0.98))',
        borderColor: 'rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-[10px] sm:h-9 sm:w-9"
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

export default function RoiSimulatorSection() {
  const reduced = Boolean(useReducedMotion());
  const [values, setValues] = useState<Record<SliderKey, number>>({
    demandesMois: 120,
    tauxNonTraite: 30,
    tauxConversion: 18,
    panierMoyen: 3200,
    devisOublies: 8,
  });

  const demandesPerdues = values.demandesMois * (values.tauxNonTraite / 100);
  const chantiersPerdusDemandes = demandesPerdues * (values.tauxConversion / 100);
  const chantiersPerdusRelances = values.devisOublies * 0.08;
  const chantiersPerdusTotalRaw = Math.max(0, chantiersPerdusDemandes + chantiersPerdusRelances);
  const caPerduMoisRaw = chantiersPerdusTotalRaw * values.panierMoyen;
  const caPerduAnRaw = caPerduMoisRaw * 12;
  const chantiersPerdusTotal = Number(chantiersPerdusTotalRaw.toFixed(1));
  const caPerduMois = roundToNearest(caPerduMoisRaw, caPerduMoisRaw >= 10000 ? 100 : 10);
  const caPerduAn = roundToNearest(caPerduAnRaw, 100);

  function setValue(key: SliderKey, nextValue: number) {
    setValues((current) => ({ ...current, [key]: nextValue }));
  }

  return (
    <section className="relative overflow-hidden bg-[#070b11] px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 22% 18%, rgba(34,197,94,0.12), transparent 34%), radial-gradient(circle at 76% 30%, rgba(34,197,94,0.08), transparent 28%), linear-gradient(180deg, rgba(4,7,11,0.95), rgba(5,8,13,0.98))',
        }}
      />

      <div
        className="relative mx-auto max-w-[1760px] overflow-hidden rounded-[32px] border px-4 py-8 shadow-[0_35px_120px_rgba(0,0,0,0.38)] sm:px-6 sm:py-10 lg:px-9 lg:py-12"
        style={{
          background: 'linear-gradient(180deg, rgba(8,12,18,0.94), rgba(7,10,16,0.98))',
          borderColor: BORDER,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[16%] top-0 h-64 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0.03) 45%, transparent 72%)',
          }}
        />

        <motion.div {...appear(0, reduced)} className="relative mx-auto max-w-4xl text-center">
          <div
            className="inline-flex rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] sm:text-[12px]"
            style={{
              color: GREEN,
              borderColor: 'rgba(34,197,94,0.24)',
              background: 'rgba(6,18,11,0.72)',
            }}
          >
            Calculez votre impact
          </div>
          <h2 className="mt-6 text-balance text-[2rem] font-semibold leading-[0.98] text-white sm:text-[3rem] lg:text-[4.7rem]">
            Combien de chantiers <span style={{ color: GREEN }}>perdez-vous</span> chaque mois ?
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-pretty text-[15px] leading-7 sm:text-[18px] sm:leading-8" style={{ color: MUTED }}>
            Estimez l&apos;impact financier des demandes non traitées, devis oubliés et relances trop tardives sur votre chiffre d&apos;affaires.
          </p>
        </motion.div>

        <div className="relative mt-10 grid gap-5 lg:mt-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-6">
          <motion.div
            {...appear(1, reduced)}
            className="min-w-0 rounded-[26px] border p-4 sm:p-5 lg:p-6"
            style={{
              background: `linear-gradient(180deg, ${CARD_SOFT}, ${CARD})`,
              borderColor: BORDER,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            <div className="mb-4 sm:mb-5">
              <p className="text-[24px] font-semibold sm:text-[28px]" style={{ color: GREEN }}>
                Ajustez vos chiffres
              </p>
            </div>

            <div className="space-y-3.5 sm:space-y-4">
              {sliderConfigs.map((config) => {
                const current = values[config.key];
                const displayValue =
                  config.suffix === 'EUR'
                    ? formatEuro(current)
                    : `${formatNumber(current)}${config.suffix ? config.suffix : ''}`;

                return (
                  <div
                    key={config.key}
                    className="rounded-[20px] border px-3.5 py-3.5 sm:px-4 sm:py-4"
                    style={{
                      background: 'linear-gradient(180deg, rgba(14,18,27,0.88), rgba(10,14,22,0.96))',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]"
                        style={{
                          background: `color-mix(in oklab, ${config.color} 14%, transparent)`,
                          border: `1px solid color-mix(in oklab, ${config.color} 26%, transparent)`,
                          color: config.color,
                        }}
                      >
                        <config.icon size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold leading-5 sm:text-[15px]" style={{ color: TEXT }}>
                              {config.label}
                            </p>
                            <p className="mt-1 text-[12px] leading-[1.45] sm:text-[12.5px]" style={{ color: MUTED }}>
                              {config.hint}
                            </p>
                          </div>
                          <div
                            className="shrink-0 rounded-[12px] border px-2.5 py-2 text-[12px] font-semibold sm:text-[13px]"
                            style={{
                              color: TEXT,
                              borderColor: 'rgba(255,255,255,0.08)',
                              background: 'rgba(255,255,255,0.03)',
                            }}
                          >
                            {displayValue}
                          </div>
                        </div>

                        <div className="mt-3">
                          <input
                            aria-label={config.label}
                            type="range"
                            min={config.min}
                            max={config.max}
                            value={current}
                            onChange={(event) => setValue(config.key, Number(event.target.value))}
                            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-transparent"
                            style={{
                              accentColor: GREEN,
                              background: buildSliderBackground(current, config.min, config.max),
                            }}
                          />
                          <div className="mt-2 flex items-center justify-between text-[11px] sm:text-[12px]" style={{ color: DIM }}>
                            <span>{config.suffix === 'EUR' ? formatEuro(config.min) : `${config.min}${config.suffix === '%' ? '%' : ''}`}</span>
                            <span>{config.suffix === 'EUR' ? formatEuro(config.max) : `${config.max}${config.suffix === '%' ? '%' : '+'}`}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <div className="min-w-0 space-y-4">
            <motion.div
              {...appear(2, reduced)}
              className="rounded-[26px] border p-5 sm:p-6 lg:p-7"
              style={{
                background: `linear-gradient(180deg, ${CARD_SOFT}, ${CARD})`,
                borderColor: BORDER,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <p className="text-[24px] font-semibold sm:text-[28px]" style={{ color: GREEN }}>
                Votre manque à gagner estimé
              </p>
              <p className="mt-3 text-[14px] leading-6 sm:text-[16px]" style={{ color: MUTED }}>
                Chaque mois, vous laissez peut-être passer :
              </p>

              <motion.div {...appear(3, reduced)} className="mt-5 sm:mt-6">
                <div className="text-[2.8rem] font-semibold leading-[0.95] text-white sm:text-[4.25rem] lg:text-[5.2rem]" style={{ color: GREEN }}>
                  {formatEuro(caPerduMois)}
                </div>
                <p className="mt-2 text-[15px] font-medium leading-7 sm:text-[18px]" style={{ color: TEXT }}>
                  de chiffre d&apos;affaires potentiel
                </p>
              </motion.div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: Gauge,
                    accent: GREEN,
                    value: formatNumber(chantiersPerdusTotal, 1),
                    label: 'chantiers perdus / mois',
                  },
                  {
                    icon: TrendingUp,
                    accent: 'oklch(0.82 0.17 72)',
                    value: formatEuro(caPerduAn),
                    label: 'perdus / an',
                  },
                  {
                    icon: Target,
                    accent: 'oklch(0.74 0.15 300)',
                    value: '+20 à 30 %',
                    label: 'de CA possible avec un meilleur suivi',
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    {...appear(index + 4, reduced)}
                    className="rounded-[20px] border px-4 py-4"
                    style={{
                      background: 'linear-gradient(180deg, rgba(14,18,27,0.88), rgba(10,14,22,0.96))',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-[12px]"
                      style={{
                        background: `color-mix(in oklab, ${stat.accent} 15%, transparent)`,
                        border: `1px solid color-mix(in oklab, ${stat.accent} 24%, transparent)`,
                        color: stat.accent,
                      }}
                    >
                      <stat.icon size={18} />
                    </div>
                    <p className="mt-4 text-[1.8rem] font-semibold leading-none sm:text-[2rem]" style={{ color: TEXT }}>
                      {stat.value}
                    </p>
                    <p className="mt-2 max-w-[18ch] text-[12px] leading-[1.45] sm:text-[12.5px]" style={{ color: MUTED }}>
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              {...appear(6, reduced)}
              className="rounded-[24px] border px-4 py-4 sm:px-5 sm:py-5"
              style={{
                background: 'linear-gradient(180deg, rgba(9,35,18,0.94), rgba(7,23,13,0.98))',
                borderColor: 'rgba(34,197,94,0.28)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 20px 60px rgba(12,38,18,0.28)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
                  style={{
                    background: 'rgba(34,197,94,0.14)',
                    border: '1px solid rgba(34,197,94,0.22)',
                    color: GREEN,
                  }}
                >
                  <Trophy size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[16px] font-medium leading-6 sm:text-[18px]" style={{ color: TEXT }}>
                    Avec seulement 1 chantier récupéré sur 2, <span style={{ color: GREEN }}>Kadria s&apos;autofinance.</span>
                  </p>
                  <p className="mt-2 text-[13px] leading-6 sm:text-[14px]" style={{ color: 'rgba(230,255,238,0.8)' }}>
                    Et votre temps retrouve sa vraie valeur.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 lg:mt-6 lg:grid-cols-4 lg:gap-4">
          {benefitCards.map((benefit, index) => (
            <BenefitCard key={benefit.title} {...benefit} index={index + 7} reduced={reduced} />
          ))}
        </div>

        <motion.div
          {...appear(11, reduced)}
          className="relative mx-auto mt-7 flex max-w-3xl items-start justify-center gap-2.5 text-center sm:mt-8"
        >
          <ShieldCheck className="mt-0.5 shrink-0" size={16} style={{ color: DIM }} />
          <p className="text-[12px] leading-6 sm:text-[13px]" style={{ color: DIM }}>
            Simulation basée sur vos données. Résultats indicatifs. Kadria ne garantit pas un niveau de revenu ou de conversion.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
