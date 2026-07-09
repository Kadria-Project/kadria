'use client';

import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Globe,
  ImageIcon,
  LineChart,
  MessageCircleMore,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  SquareChartGantt,
  StickyNote,
  Users,
  WalletCards,
} from 'lucide-react';
import { KadriaLogo } from '@/src/components/KadriaLogo';

const CARD = 'oklch(0.19 0.01 260 / 0.9)';
const CARD_SOFT = 'oklch(0.22 0.01 260 / 0.94)';
const BORDER = 'oklch(1 0 0 / 0.09)';
const TEXT = 'oklch(0.96 0.004 90)';
const MUTED = 'oklch(0.71 0.012 255)';
const DIM = 'oklch(0.57 0.012 255)';
const GREEN = 'oklch(0.84 0.19 147)';

const desktopScatteredTools = [
  { label: 'Appels\nmanqués', icon: PhoneCall, color: 'oklch(0.74 0.17 45)' },
  { label: 'WhatsApp\nSMS', icon: MessageCircleMore, color: 'oklch(0.82 0.17 155)' },
  { label: 'Formulaires\nsite web', icon: Globe, color: 'oklch(0.78 0.15 245)' },
  { label: 'Notes\nmanuelles', icon: StickyNote, color: 'oklch(0.85 0.17 90)' },
  { label: 'Photos\nclients', icon: ImageIcon, color: 'oklch(0.74 0.15 300)' },
  { label: 'Tableurs\nExcel', icon: FileSpreadsheet, color: 'oklch(0.82 0.18 145)' },
  { label: 'Devis\nPDF', icon: FileText, color: 'oklch(0.77 0.13 230)' },
  { label: 'Relances\nmanuelles', icon: RefreshCw, color: 'oklch(0.79 0.16 55)' },
  { label: 'Agenda\nRendez-vous', icon: CalendarDays, color: 'oklch(0.75 0.17 20)' },
  { label: 'Contacts\néparpillés', icon: Users, color: 'oklch(0.76 0.15 295)' },
  { label: 'Portail client\nabsent', icon: SquareChartGantt, color: 'oklch(0.8 0.12 210)' },
  { label: 'Reporting\nartisanal', icon: LineChart, color: 'oklch(0.72 0.09 150)' },
];

const mobileScatteredTools = desktopScatteredTools.slice(0, 6);

const structuredOutcomes = [
  { text: 'Dossiers qualifiés et prêts à chiffrer', icon: FileText },
  { text: 'Actions du jour claires et prioritaires', icon: CheckCircle2 },
  { text: 'Devis envoyés et suivis automatiquement', icon: FileText },
  { text: 'Relances au bon moment, plus d’oublis', icon: Bell },
  { text: 'Portail client fluide et professionnel', icon: Users },
  { text: 'Pilotage de votre activité en temps réel', icon: LineChart },
];

const desktopActionItems = [
  { title: 'Relancer 2 devis', sub: 'Priorité haute' },
  { title: 'Rendez-vous à 14h30', sub: 'Client : M. Durand' },
  { title: 'Préparer un devis', sub: 'Salle de bain complète' },
  { title: '1 nouveau dossier', sub: 'Qualifié ce matin' },
];

const mobileActionItems = ['Relancer 2 devis', 'Rendez-vous à 14h30', '1 nouveau dossier'];

const pipelineItems = [
  { label: 'Nouveaux', value: '12' },
  { label: 'En cours', value: '8' },
  { label: 'Devis envoyés', value: '5' },
  { label: 'Gagnés', value: '3' },
];

const desktopKpis = [
  { label: 'CA potentiel', value: '28 450 €' },
  { label: 'Devis en attente', value: '7 450 €' },
  { label: 'Relances aujourd’hui', value: '4' },
  { label: 'Taux de conversion', value: '23 %' },
];

const mobileKpis = [
  { label: 'CA potentiel', value: '28 450 €' },
  { label: 'Devis en attente', value: '7 450 €' },
];

const benefits = [
  {
    title: 'Une seule facturation',
    text: 'Fini les abonnements qui s’accumulent.',
    icon: WalletCards,
  },
  {
    title: 'Moins de ressaisie, plus de temps',
    text: 'L’information saisie une fois reste disponible partout.',
    icon: RefreshCw,
  },
  {
    title: 'Moins d’oublis, plus de suivis',
    text: 'Chaque demande est tracée, rien ne passe à la trappe.',
    icon: Bell,
  },
  {
    title: 'Mises à jour groupées',
    text: 'Une seule plateforme, toujours à jour.',
    icon: CheckCircle2,
  },
];

function appear(index = 0, reduced = false) {
  return reduced
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay: index * 0.06 },
      };
}

function ToolTile({
  label,
  icon: Icon,
  color,
  compact = false,
  index = 0,
  reduced = false,
}: {
  label: string;
  icon: typeof PhoneCall;
  color: string;
  compact?: boolean;
  index?: number;
  reduced?: boolean;
}) {
  return (
    <motion.div
      {...appear(index, reduced)}
      className={`rounded-[18px] border p-4 text-center ${compact ? 'min-h-[100px]' : 'min-h-[124px]'}`}
      style={{
        background: 'linear-gradient(180deg, oklch(0.18 0.01 260 / 0.96), oklch(0.145 0.008 260 / 0.98))',
        borderColor: BORDER,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-[14px]"
        style={{
          background: `color-mix(in oklab, ${color} 16%, transparent)`,
          border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`,
          color,
        }}
      >
        <Icon size={18} />
      </div>
      <div
        className={`mt-3 whitespace-pre-line font-medium ${compact ? 'text-[12.5px] leading-[1.28]' : 'text-[14px] leading-[1.35]'}`}
        style={{ color: TEXT }}
      >
        {label}
      </div>
    </motion.div>
  );
}

function DesktopConnector({ reduced, index = 0 }: { reduced: boolean; index?: number }) {
  return (
    <motion.div
      {...appear(index, reduced)}
      className="hidden h-full items-center justify-center lg:flex"
      aria-hidden
    >
      <div className="flex w-full items-center justify-center gap-2 px-1">
        <div
          className="h-px flex-1"
          style={{
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(34,197,94,0.22) 30%, rgba(34,197,94,0.62) 100%)',
            boxShadow: '0 0 18px rgba(34,197,94,0.18)',
          }}
        />
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full border"
          style={{
            borderColor: 'rgba(34,197,94,0.22)',
            background: 'rgba(10,18,14,0.72)',
            color: GREEN,
            boxShadow: '0 0 18px rgba(34,197,94,0.12)',
          }}
        >
          <ArrowRight size={14} />
        </span>
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
  icon: typeof WalletCards;
  index: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      {...appear(index, reduced)}
      className="rounded-[20px] border px-4 py-4 sm:px-5 sm:py-5"
      style={{
        background: 'linear-gradient(180deg, rgba(13,17,24,0.92), rgba(9,12,18,0.98))',
        borderColor: 'rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-[12px]"
        style={{
          background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.2)',
          color: GREEN,
        }}
      >
        <Icon size={18} />
      </div>
      <p className="mt-3 text-[15px] font-semibold leading-[1.25] sm:text-[16px]" style={{ color: TEXT }}>
        {title}
      </p>
      <p className="mt-2 text-[13px] leading-5 sm:text-[13.5px]" style={{ color: MUTED }}>
        {text}
      </p>
    </motion.div>
  );
}

export default function UnifiedToolsSection() {
  const reduced = Boolean(useReducedMotion());

  return (
    <section
      className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8"
      style={{
        background:
          'radial-gradient(circle at 50% 18%, rgba(34,197,94,0.12), transparent 28%), radial-gradient(circle at 50% 50%, rgba(34,197,94,0.06), transparent 48%), linear-gradient(180deg, #07090d 0%, #05070b 100%)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
        <div
          className="absolute left-1/2 top-24 h-[320px] w-[320px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: 'rgba(34,197,94,0.12)' }}
        />
      </div>

      <div className="relative mx-auto max-w-[1760px]">
        <motion.div {...appear(0, reduced)} className="mx-auto max-w-4xl text-center">
          <span
            className="inline-flex items-center rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{
              color: GREEN,
              borderColor: 'rgba(34,197,94,0.34)',
              background: 'rgba(10,18,14,0.72)',
              boxShadow: '0 0 0 1px rgba(34,197,94,0.08) inset',
            }}
          >
            UNE PLATEFORME, MOINS DE DISPERSION
          </span>
          <h2
            className="mt-5 text-balance text-[clamp(2rem,3.9vw,3.7rem)] font-black leading-[1] sm:text-[clamp(2.1rem,3.6vw,3.7rem)]"
            style={{ color: TEXT }}
          >
            Moins d’outils dispersés.
            <br />
            <span style={{ color: GREEN }}>Plus de demandes traitées.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-balance text-[15px] leading-7 sm:text-[17px]" style={{ color: MUTED }}>
            Kadria centralise les appels, demandes web, notes, photos, devis, relances et actions commerciales dans une
            seule logique de travail.
          </p>
        </motion.div>

        <div className="relative mt-10 lg:hidden">
          <motion.div
            {...appear(1, reduced)}
            className="rounded-[24px] border p-4"
            style={{
              background: 'linear-gradient(180deg, rgba(8,14,12,0.95), rgba(7,10,14,0.98))',
              borderColor: 'rgba(34,197,94,0.42)',
              boxShadow: '0 20px 70px rgba(34,197,94,0.12)',
            }}
          >
            <div className="flex items-center justify-center">
              <KadriaLogo noLink size="sm" theme="dark" />
            </div>
            <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: GREEN }}>
              Kadria centralise
            </p>

            <div className="mt-4 rounded-[18px] border p-3.5" style={{ borderColor: BORDER, background: 'rgba(9,12,18,0.88)' }}>
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: TEXT }}>
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: 'rgba(34,197,94,0.14)', color: GREEN }}
                >
                  <CheckCircle2 size={14} />
                </span>
                Bonjour. 👋
              </div>
              <p className="mt-2 text-[12.5px]" style={{ color: MUTED }}>
                Voici ce qui se passe aujourd’hui.
              </p>

              <div className="mt-4 space-y-2">
                {mobileActionItems.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-[14px] border px-3 py-2.5"
                    style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.02)' }}
                  >
                    <span className="text-[12px] font-medium" style={{ color: TEXT }}>
                      {item}
                    </span>
                    {index === 0 ? (
                      <span className="rounded-full px-2 py-1 text-[9px] font-semibold" style={{ background: 'rgba(34,197,94,0.1)', color: GREEN }}>
                        Priorité haute
                      </span>
                    ) : (
                      <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {mobileKpis.map((item, index) => (
                  <div
                    key={item.label}
                    className="rounded-[14px] border px-3 py-3"
                    style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.02)' }}
                  >
                    <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: DIM }}>
                      {item.label}
                    </p>
                    <p className="mt-1 text-[14px] font-bold" style={{ color: index === 0 ? GREEN : TEXT }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            {...appear(2, reduced)}
            className="mt-4 rounded-[24px] border p-4"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <h3 className="text-center text-[22px] font-extrabold leading-[1.08]" style={{ color: TEXT }}>
              Aujourd’hui : tout est éparpillé
            </h3>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {mobileScatteredTools.map((tool, index) => (
                <ToolTile key={tool.label} {...tool} compact index={index} reduced={reduced} />
              ))}
            </div>
            <div
              className="mt-4 rounded-2xl border px-4 py-3 text-center text-sm font-medium"
              style={{ borderColor: BORDER, background: CARD_SOFT, color: MUTED }}
            >
              +6 autres usages dispersés
            </div>
          </motion.div>

          <motion.div
            {...appear(3, reduced)}
            className="mt-4 rounded-[24px] border p-4"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <h3 className="text-center text-[22px] font-extrabold leading-[1.08]" style={{ color: TEXT }}>
              Tout est structuré
            </h3>
            <div className="mt-4 space-y-2.5">
              {structuredOutcomes.map((item, index) => (
                <motion.div
                  key={item.text}
                  {...appear(index + 3, reduced)}
                  className="flex items-center gap-3 rounded-[16px] border px-3.5 py-3"
                  style={{ borderColor: BORDER, background: CARD_SOFT }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
                    style={{
                      background: 'rgba(34,197,94,0.12)',
                      border: '1px solid rgba(34,197,94,0.22)',
                      color: GREEN,
                    }}
                  >
                    <item.icon size={16} />
                  </span>
                  <p className="text-[13px] font-medium leading-[1.35]" style={{ color: TEXT }}>
                    {item.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div
          className="relative mt-12 hidden rounded-[32px] border px-6 py-8 lg:block"
          style={{
            background: 'linear-gradient(180deg, rgba(9,13,18,0.88), rgba(5,8,12,0.98))',
            borderColor: 'rgba(255,255,255,0.06)',
            boxShadow: '0 30px 120px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_72px_1.2fr_72px_1fr]">
            <motion.div
              {...appear(1, reduced)}
              className="rounded-[24px] border p-5"
              style={{ background: CARD, borderColor: BORDER }}
            >
              <p className="mb-5 text-center text-[24px] font-extrabold leading-none" style={{ color: TEXT }}>
                Aujourd’hui : tout est éparpillé
              </p>
              <div className="grid grid-cols-3 gap-4">
                {desktopScatteredTools.map((tool, index) => (
                  <ToolTile key={tool.label} {...tool} index={index} reduced={reduced} />
                ))}
              </div>
            </motion.div>

            <DesktopConnector reduced={reduced} index={2} />

            <motion.div {...appear(3, reduced)}>
              <div
                className="rounded-[26px] border p-5 shadow-[0_0_0_1px_rgba(34,197,94,0.08),0_20px_70px_rgba(34,197,94,0.12)]"
                style={{
                  background: 'linear-gradient(180deg, rgba(8,14,12,0.95), rgba(7,10,14,0.98))',
                  borderColor: 'rgba(34,197,94,0.42)',
                }}
              >
                <div className="flex items-center justify-center">
                  <KadriaLogo noLink size="sm" theme="dark" />
                </div>
                <p className="mt-4 text-center text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: GREEN }}>
                  Une seule plateforme commerciale
                </p>

                <div className="mt-5 rounded-[22px] border p-4" style={{ background: 'rgba(9,12,18,0.88)', borderColor: BORDER }}>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: TEXT }}>
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ background: 'rgba(34,197,94,0.14)', color: GREEN }}
                    >
                      <CheckCircle2 size={16} />
                    </span>
                    Bonjour. 👋
                  </div>
                  <p className="mt-2 text-[13px]" style={{ color: MUTED }}>
                    Voici ce qui se passe aujourd’hui.
                  </p>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1.08fr_0.8fr]">
                    <div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: DIM }}>
                        Actions du jour
                      </p>
                      <div className="space-y-2.5">
                        {desktopActionItems.map((item, index) => (
                          <motion.div
                            key={item.title}
                            {...appear(index + 4, reduced)}
                            className="flex items-center justify-between gap-3 rounded-[16px] border px-3 py-3"
                            style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.02)' }}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold" style={{ color: TEXT }}>
                                {item.title}
                              </p>
                              <p className="truncate text-[11.5px]" style={{ color: MUTED }}>
                                {item.sub}
                              </p>
                            </div>
                            <span
                              className="rounded-full px-2 py-1 text-[10px] font-semibold"
                              style={{ background: 'rgba(34,197,94,0.1)', color: GREEN }}
                            >
                              {index === 0 ? 'Priorité haute' : 'OK'}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: DIM }}>
                        Pipeline
                      </p>
                      <div className="space-y-2.5">
                        {pipelineItems.map((item, index) => (
                          <motion.div
                            key={item.label}
                            {...appear(index + 7, reduced)}
                            className="flex items-center justify-between rounded-[16px] border px-3 py-3"
                            style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.02)' }}
                          >
                            <span className="text-[12px] font-medium" style={{ color: MUTED }}>
                              {item.label}
                            </span>
                            <span className="text-[13px] font-bold" style={{ color: index === 3 ? GREEN : TEXT }}>
                              {item.value}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-2.5">
                    {desktopKpis.map((item, index) => (
                      <motion.div
                        key={item.label}
                        {...appear(index + 10, reduced)}
                        className="rounded-[16px] border px-3 py-3"
                        style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.02)' }}
                      >
                        <p className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: DIM }}>
                          {item.label}
                        </p>
                        <p className="mt-1 text-[15px] font-extrabold" style={{ color: index === 0 ? GREEN : TEXT }}>
                          {item.value}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <motion.div
                {...appear(14, reduced)}
                className="mt-4 rounded-full border px-4 py-3 text-center text-[12px] font-semibold tracking-[0.08em]"
                style={{
                  color: GREEN,
                  borderColor: 'rgba(34,197,94,0.32)',
                  background: 'rgba(10,18,14,0.72)',
                }}
              >
                Données centralisées • Suivi en temps réel • Historique complet
              </motion.div>
            </motion.div>

            <DesktopConnector reduced={reduced} index={4} />

            <motion.div
              {...appear(5, reduced)}
              className="rounded-[24px] border p-5"
              style={{ background: CARD, borderColor: BORDER }}
            >
              <p className="mb-5 text-center text-[24px] font-extrabold leading-none" style={{ color: TEXT }}>
                Demain : tout est structuré
              </p>
              <div className="space-y-3">
                {structuredOutcomes.map((item, index) => (
                  <motion.div
                    key={item.text}
                    {...appear(index + 6, reduced)}
                    className="flex items-center gap-4 rounded-[18px] border px-4 py-4"
                    style={{ borderColor: BORDER, background: CARD_SOFT }}
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
                      style={{
                        background: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.22)',
                        color: GREEN,
                      }}
                    >
                      <item.icon size={20} />
                    </span>
                    <p className="text-[15px] font-medium leading-[1.38]" style={{ color: TEXT }}>
                      {item.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {benefits.map((benefit, index) => (
            <BenefitCard key={benefit.title} {...benefit} index={index + 15} reduced={reduced} />
          ))}
        </div>

        <motion.div
          {...appear(19, reduced)}
          className="mt-8 flex items-start justify-center gap-3 px-2 text-center"
          style={{ color: DIM }}
        >
          <ShieldCheck size={18} className="mt-0.5 shrink-0" style={{ color: 'oklch(0.72 0.05 165)' }} />
          <p className="max-w-4xl text-[14px] leading-7 sm:text-[15px]">
            Selon votre organisation actuelle, Kadria peut remplacer ou réduire l’usage de plusieurs outils dispersés
            autour du suivi commercial.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
