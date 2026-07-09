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
      className="rounded-[16px] border px-3 py-3 sm:rounded-[18px] sm:px-3.5 sm:py-3.5 lg:px-4 lg:py-3.5"
      style={{
        background: 'linear-gradient(180deg, rgba(13,17,24,0.92), rgba(9,12,18,0.98))',
        borderColor: 'rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div
        className="flex h-7 w-7 items-center justify-center rounded-[9px] sm:h-8 sm:w-8"
        style={{
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.18)',
          color: GREEN,
        }}
      >
        <Icon size={14} />
      </div>
      <p className="mt-2 text-[13px] font-semibold leading-[1.2] sm:mt-2.5 sm:text-[14px]" style={{ color: TEXT }}>
        {title}
      </p>
      <p className="mt-1 text-[11.5px] leading-[1.4] sm:mt-1.5 sm:text-[12px] sm:leading-[1.45]" style={{ color: MUTED }}>
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
    <section className="relative overflow-hidden bg-[#070b11] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 22% 18%, rgba(34,197,94,0.12), transparent 34%), radial-gradient(circle at 76% 30%, rgba(34,197,94,0.08), transparent 28%), linear-gradient(180deg, rgba(4,7,11,0.95), rgba(5,8,13,0.98))',
        }}
      />

      <div
        className="relative mx-auto max-w-[1660px] overflow-hidden rounded-[28px] border px-4 py-6 shadow-[0_28px_100px_rgba(0,0,0,0.34)] sm:px-5 sm:py-7 lg:px-7 lg:py-8"
        style={{
          background: 'linear-gradient(180deg, rgba(8,12,18,0.94), rgba(7,10,16,0.98))',
          borderColor: BORDER,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[18%] top-0 h-48 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0.03) 45%, transparent 72%)',
          }}
        />

        <motion.div {...appear(0, reduced)} className="relative mx-auto max-w-3xl text-center">
          <div
            className="inline-flex rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] sm:px-4 sm:py-1.5 sm:text-[11px]"
            style={{
              color: GREEN,
              borderColor: 'rgba(34,197,94,0.24)',
              background: 'rgba(6,18,11,0.72)',
            }}
          >
            Calculez votre impact
          </div>
          <h2 className="mt-4 text-balance text-[1.7rem] font-semibold leading-[1.02] text-white sm:text-[2.35rem] lg:text-[3.3rem]">
            Combien de chantiers <span style={{ color: GREEN }}>perdez-vous</span> chaque mois ?
          </h2>
          <p className="mx-auto mt-3.5 max-w-2xl text-pretty text-[14px] leading-6 sm:text-[15px] sm:leading-7" style={{ color: MUTED }}>
            Estimez l&apos;impact financier des demandes non traitées, devis oubliés et relances trop tardives sur votre chiffre d&apos;affaires.
          </p>
        </motion.div>

        <div className="relative mt-7 grid gap-4 lg:mt-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-4">
          <motion.div
            {...appear(1, reduced)}
            className="min-w-0 rounded-[22px] border p-3.5 sm:p-4 lg:p-4.5"
            style={{
              background: `linear-gradient(180deg, ${CARD_SOFT}, ${CARD})`,
              borderColor: BORDER,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            <div className="mb-3 sm:mb-4">
              <p className="text-[20px] font-semibold sm:text-[22px]" style={{ color: GREEN }}>
                Ajustez vos chiffres
              </p>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {sliderConfigs.map((config) => {
                const current = values[config.key];
                const displayValue =
                  config.suffix === 'EUR'
                    ? formatEuro(current)
                    : `${formatNumber(current)}${config.suffix ? config.suffix : ''}`;

                return (
                  <div
                    key={config.key}
                    className="rounded-[18px] border px-3 py-3 sm:px-3.5 sm:py-3.5"
                    style={{
                      background: 'linear-gradient(180deg, rgba(14,18,27,0.88), rgba(10,14,22,0.96))',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="mt-0.5 flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[12px] sm:h-9 sm:w-9"
                        style={{
                          background: `color-mix(in oklab, ${config.color} 14%, transparent)`,
                          border: `1px solid color-mix(in oklab, ${config.color} 26%, transparent)`,
                          color: config.color,
                        }}
                      >
                        <config.icon size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold leading-[1.35] sm:text-[14px]" style={{ color: TEXT }}>
                              {config.label}
                            </p>
                            <p className="mt-0.5 text-[11.5px] leading-[1.35] sm:text-[12px]" style={{ color: MUTED }}>
                              {config.hint}
                            </p>
                          </div>
                          <div
                            className="shrink-0 rounded-[11px] border px-2.5 py-1.5 text-[11.5px] font-semibold sm:text-[12px]"
                            style={{
                              color: TEXT,
                              borderColor: 'rgba(255,255,255,0.08)',
                              background: 'rgba(255,255,255,0.03)',
                            }}
                          >
                            {displayValue}
                          </div>
                        </div>

                        <div className="mt-2.5">
                          <input
                            aria-label={config.label}
                            type="range"
                            min={config.min}
                            max={config.max}
                            value={current}
                            onChange={(event) => setValue(config.key, Number(event.target.value))}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-transparent"
                            style={{
                              accentColor: GREEN,
                              background: buildSliderBackground(current, config.min, config.max),
                            }}
                          />
                          <div className="mt-1.5 flex items-center justify-between text-[10.5px] sm:text-[11px]" style={{ color: DIM }}>
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

          <div className="min-w-0 space-y-3">
            <motion.div
              {...appear(2, reduced)}
              className="rounded-[22px] border p-4 sm:p-4.5 lg:p-5"
              style={{
                background: `linear-gradient(180deg, ${CARD_SOFT}, ${CARD})`,
                borderColor: BORDER,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <p className="text-[20px] font-semibold sm:text-[22px]" style={{ color: GREEN }}>
                Votre manque à gagner estimé
              </p>
              <p className="mt-2 text-[13px] leading-5.5 sm:text-[14px] sm:leading-6" style={{ color: MUTED }}>
                Chaque mois, vous laissez peut-être passer :
              </p>

              <motion.div {...appear(3, reduced)} className="mt-4 sm:mt-4.5">
                <div className="text-[2.35rem] font-semibold leading-[0.96] text-white sm:text-[3.25rem] lg:text-[4rem]" style={{ color: GREEN }}>
                  {formatEuro(caPerduMois)}
                </div>
                <p className="mt-1.5 text-[14px] font-medium leading-6 sm:text-[15px] sm:leading-6.5" style={{ color: TEXT }}>
                  de chiffre d&apos;affaires potentiel
                </p>
              </motion.div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
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
                    className="rounded-[18px] border px-3.5 py-3.5"
                    style={{
                      background: 'linear-gradient(180deg, rgba(14,18,27,0.88), rgba(10,14,22,0.96))',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                      style={{
                        background: `color-mix(in oklab, ${stat.accent} 15%, transparent)`,
                        border: `1px solid color-mix(in oklab, ${stat.accent} 24%, transparent)`,
                        color: stat.accent,
                      }}
                    >
                      <stat.icon size={15} />
                    </div>
                    <p className="mt-3 text-[1.45rem] font-semibold leading-none sm:text-[1.6rem]" style={{ color: TEXT }}>
                      {stat.value}
                    </p>
                    <p className="mt-1.5 max-w-[18ch] text-[11.5px] leading-[1.35] sm:text-[12px] sm:leading-[1.4]" style={{ color: MUTED }}>
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              {...appear(6, reduced)}
              className="rounded-[20px] border px-3.5 py-3.5 sm:px-4 sm:py-4"
              style={{
                background: 'linear-gradient(180deg, rgba(9,35,18,0.94), rgba(7,23,13,0.98))',
                borderColor: 'rgba(34,197,94,0.28)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 20px 60px rgba(12,38,18,0.28)',
              }}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
                  style={{
                    background: 'rgba(34,197,94,0.14)',
                    border: '1px solid rgba(34,197,94,0.22)',
                    color: GREEN,
                  }}
                >
                  <Trophy size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium leading-5.5 sm:text-[15px] sm:leading-6" style={{ color: TEXT }}>
                    Avec seulement 1 chantier récupéré sur 2, <span style={{ color: GREEN }}>Kadria s&apos;autofinance.</span>
                  </p>
                  <p className="mt-1.5 text-[12px] leading-5 sm:text-[13px]" style={{ color: 'rgba(230,255,238,0.8)' }}>
                    Et votre temps retrouve sa vraie valeur.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2.5 lg:mt-4.5 lg:grid-cols-4 lg:gap-3">
          {benefitCards.map((benefit, index) => (
            <BenefitCard key={benefit.title} {...benefit} index={index + 7} reduced={reduced} />
          ))}
        </div>

        <motion.div
          {...appear(11, reduced)}
          className="relative mx-auto mt-5 flex max-w-2xl items-start justify-center gap-2 text-center sm:mt-6"
        >
          <ShieldCheck className="mt-0.5 shrink-0" size={16} style={{ color: DIM }} />
          <p className="text-[11px] leading-5 sm:text-[12px] sm:leading-5.5" style={{ color: DIM }}>
            Simulation basée sur vos données. Résultats indicatifs. Kadria ne garantit pas un niveau de revenu ou de conversion.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
