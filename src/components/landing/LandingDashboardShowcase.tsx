import { motion, useReducedMotion } from "motion/react";
import {
  BarChart3,
  Calendar,
  Users,
  CheckSquare,
  Sparkles,
  Sun,
  User,
  LogOut,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Phone,
  FileText,
  RotateCcw,
  CalendarClock,
  Wallet,
  ArrowRight,
  ArrowUpRight,
  Circle,
} from "lucide-react";

const GREEN = "oklch(0.86 0.19 145)";
const GREEN_SOFT = "color-mix(in oklab, oklch(0.86 0.19 145) 14%, transparent)";
const GREEN_BORDER = "color-mix(in oklab, oklch(0.86 0.19 145) 35%, transparent)";
const DARK_BG = "oklch(0.16 0.008 260)";
const APP_BG = "oklch(0.185 0.008 260)";
const PANEL = "oklch(0.215 0.008 260)";
const PANEL_2 = "oklch(0.245 0.008 260)";
const ROW = "oklch(0.235 0.008 260)";
const BORDER = "oklch(1 0 0 / 0.08)";
const BORDER_STRONG = "oklch(1 0 0 / 0.16)";
const TEXT = "oklch(0.96 0.005 90)";
const TEXT_MUTED = "oklch(0.7 0.01 260)";
const TEXT_DIM = "oklch(0.55 0.01 260)";

const RED = "oklch(0.72 0.19 25)";
const ORANGE = "oklch(0.82 0.16 65)";
const BLUE = "oklch(0.78 0.14 235)";
const VIOLET = "oklch(0.72 0.16 300)";

const KPIS = [
  { label: "CA potentiel", value: "36,5 k€", delta: "+12%", tone: GREEN, icon: <TrendingUp size={14} /> },
  { label: "Devis envoyés", value: "13,6 k€", delta: "+4%", tone: BLUE, icon: <FileText size={14} /> },
  { label: "Chantiers gagnés", value: "1,4 k€", delta: "+2%", tone: VIOLET, icon: <CheckSquare size={14} /> },
  { label: "Taux de conversion", value: "23,1 %", delta: "+1,4 pt", tone: ORANGE, icon: <BarChart3 size={14} /> },
];

const OPP_RISK = [
  { name: "Philippe Lambert", meta: "Devis 3 200 € — envoyé il y a 9 j", tag: "À RELANCER", tone: RED },
  { name: "Élodie Garnier", meta: "RDV manqué — 8 500 €", tag: "Relancer", tone: ORANGE },
];

const ACTIONS = [
  { icon: <Phone size={13} />, label: "4 appels", tone: BLUE },
  { icon: <FileText size={13} />, label: "2 devis", tone: VIOLET },
  { icon: <RotateCcw size={13} />, label: "3 relances", tone: ORANGE },
  { icon: <CalendarClock size={13} />, label: "4 rendez-vous", tone: GREEN },
  { icon: <Wallet size={13} />, label: "3 acomptes", tone: RED },
];

const GUIDELINE: Array<{ title: string; rows: { label: string; value: string; tone?: string }[] }> = [
  {
    title: "Qualifier",
    rows: [
      { label: "Qualification à terminer", value: "3" },
      { label: "Photos à demander", value: "5" },
      { label: "Rendez-vous à planifier", value: "2" },
    ],
  },
  {
    title: "Chiffrer",
    rows: [
      { label: "Devis à envoyer", value: "2", tone: ORANGE },
      { label: "Devis refusés à traiter", value: "1" },
      { label: "Acomptes à demander", value: "3" },
    ],
  },
  {
    title: "Sécuriser",
    rows: [
      { label: "Acomptes demandés", value: "3" },
      { label: "Acomptes reçus", value: "2", tone: GREEN },
      { label: "CA sécurisé", value: "8,2 k€", tone: GREEN },
      { label: "Taux de sécurisation", value: "62 %" },
    ],
  },
  {
    title: "Réaliser & fidéliser",
    rows: [
      { label: "Interventions à programmer", value: "4" },
      { label: "Avis clients à demander", value: "6" },
      { label: "Relances", value: "3", tone: ORANGE },
    ],
  },
];

const LEADS = [
  { rank: 1, name: "Antoine Rousseau", trade: "chauffagiste — Maromme", score: 80, badge: "Priorité élevée", amount: "400 €" },
  { rank: 2, name: "Nicolas Dupont", trade: "plombier — Bois-Guillaume", score: 79, badge: "À suivre", amount: "250 €" },
  { rank: 3, name: "Sophie Lefèvre", trade: "plombier chauffagiste — Rouen", score: 75, badge: "À suivre", amount: "4 500 €" },
  { rank: 4, name: "Élodie Garnier", trade: "plombier — Darnétal", score: 75, badge: "À suivre", amount: "8 500 €" },
  { rank: 5, name: "Claire Martin", trade: "plombier chauffagiste — Mont-Saint-Aignan", score: 74, badge: "À suivre", amount: "1 200 €" },
];

function MobileDashboardPreview() {
  const mobileLeads = LEADS.slice(0, 3);

  return (
    <div
      className="rounded-2xl p-3"
      style={{
        backgroundColor: APP_BG,
        border: `1px solid ${BORDER_STRONG}`,
        boxShadow: "0 1px 0 0 oklch(1 0 0 / 0.05) inset, 0 30px 70px -30px oklch(0 0 0 / 0.7)",
      }}
    >
      {/* Mini-header */}
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-base font-semibold"
          style={{ backgroundColor: GREEN, color: "oklch(0.2 0.02 150)", fontFamily: '"Instrument Serif", serif' }}
        >
          K
        </div>
        <div className="text-sm font-semibold tracking-wide">KADRIA</div>
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest"
          style={{ backgroundColor: GREEN_SOFT, color: GREEN, border: `1px solid ${GREEN_BORDER}` }}
        >
          PRO
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Suivi commercial</div>
          <div className="text-[11px]" style={{ color: TEXT_MUTED }}>
            Ce mois
          </div>
        </div>
      </div>

      {/* KPI cards, 2 colonnes */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-xl p-2.5" style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between text-[10px]" style={{ color: TEXT_MUTED }}>
              <span>{k.label}</span>
              <span style={{ color: k.tone }}>{k.icon}</span>
            </div>
            <div className="mt-1 text-lg font-semibold">{k.value}</div>
            <div className="mt-0.5 text-[10px]" style={{ color: k.tone }}>
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Opportunités à sécuriser */}
      <div className="mt-3 rounded-xl p-2.5" style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold">Opportunités à sécuriser</div>
          <AlertTriangle size={13} style={{ color: ORANGE }} />
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {OPP_RISK.map((o) => (
            <div key={o.name} className="rounded-lg p-2" style={{ backgroundColor: ROW, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[12px] font-medium">{o.name}</div>
                <span
                  className="whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider"
                  style={{
                    color: o.tone,
                    backgroundColor: `color-mix(in oklab, ${o.tone} 14%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${o.tone} 35%, transparent)`,
                  }}
                >
                  {o.tag}
                </span>
              </div>
              <div className="mt-0.5 text-[10px]" style={{ color: TEXT_MUTED }}>
                {o.meta}
              </div>
            </div>
          ))}
        </div>
        <button className="mt-2.5 inline-flex items-center gap-1 text-[11px]" style={{ color: GREEN }}>
          Voir les dossiers en risque <ArrowRight size={11} />
        </button>
      </div>

      {/* Actions à traiter */}
      <div className="mt-3 rounded-xl p-2.5" style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold">Actions à traiter</div>
          <span className="text-[11px]" style={{ color: TEXT_MUTED }}>
            16 en attente
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          {ACTIONS.map((a) => (
            <div
              key={a.label}
              className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-[12px]"
              style={{ backgroundColor: ROW, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: a.tone }}>{a.icon}</span>
                {a.label}
              </div>
              <ArrowUpRight size={12} style={{ color: TEXT_DIM }} />
            </div>
          ))}
        </div>
      </div>

      {/* Opportunités prioritaires (3 seulement) */}
      <div className="mt-3 rounded-xl p-2.5" style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <div className="text-[13px] font-semibold">Opportunités prioritaires</div>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ color: GREEN, backgroundColor: GREEN_SOFT, border: `1px solid ${GREEN_BORDER}` }}
          >
            <Sparkles size={10} /> Score IA
          </span>
        </div>
        <div className="mt-2.5 flex flex-col gap-2">
          {mobileLeads.map((l) => {
            const isTop = l.rank === 1;
            return (
              <div
                key={l.rank}
                className="flex items-center justify-between gap-2 rounded-lg p-2.5"
                style={{
                  backgroundColor: isTop ? GREEN_SOFT : ROW,
                  border: `1px solid ${isTop ? GREEN_BORDER : BORDER}`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold"
                    style={{
                      backgroundColor: isTop ? GREEN : "oklch(1 0 0 / 0.06)",
                      color: isTop ? "oklch(0.2 0.02 150)" : TEXT,
                      border: `1px solid ${isTop ? GREEN : BORDER}`,
                    }}
                  >
                    #{l.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium">{l.name}</div>
                    <div className="text-[10px]" style={{ color: TEXT_MUTED }}>
                      {l.score}
                      <span style={{ color: TEXT_MUTED }}>/100</span> · {l.amount}
                    </div>
                  </div>
                </div>
                <a
                  href="#"
                  className="inline-flex shrink-0 items-center gap-0.5 text-[10px]"
                  style={{ color: GREEN }}
                >
                  Voir le dossier <ArrowRight size={9} />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LandingDashboardShowcase() {
  const reduce = useReducedMotion();

  const fadeUp = reduce
    ? { initial: false, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.6, ease: "easeOut" as const },
      };

  const dashReveal = reduce
    ? { initial: false, animate: { opacity: 1, y: 0, scale: 1 } }
    : {
        initial: { opacity: 0, y: 28, scale: 0.97 },
        whileInView: { opacity: 1, y: 0, scale: 1 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <section
      style={{ backgroundColor: DARK_BG, color: TEXT }}
      className="relative overflow-hidden py-14 sm:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.05) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[1000px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(closest-side, color-mix(in oklab, ${GREEN} 16%, transparent), transparent 70%)`,
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        {/* Lien visuel avec la section précédente : faisceau vert dégradé du
            point de jonction (fin de LandingChaosSection) jusqu'au badge.
            Positionné à top-0 SANS translation négative : la section a
            "overflow-hidden", donc un élément décalé au-dessus de top-0 via
            -translate-y-full était clippé et invisible — c'était la cause de
            la rupture visuelle perçue entre les deux sections.
            Hauteur mesurée précisément via getBoundingClientRect() sur le
            rendu réel (badge.top - section.top) : 101px en desktop/tablette
            (>= sm) et 77px en mobile — l'ancien h-14/h-20 (56px/80px, calé
            uniquement sur le padding-top de la section) s'arrêtait ~21px
            avant le badge, laissant le trait visuellement coupé avant
            d'atteindre "Kadria prend le relais". Les valeurs exactes ci-
            dessous font que le trait rejoint réellement le bord haut du
            badge, sans espace ajouté. */}
        {reduce ? (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[77px] w-px -translate-x-1/2 sm:h-[101px]"
            style={{
              background: `linear-gradient(to bottom, color-mix(in oklab, ${GREEN} 60%, transparent), transparent)`,
              boxShadow: `0 0 10px 1px color-mix(in oklab, ${GREEN} 45%, transparent)`,
            }}
          />
        ) : (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[77px] w-px origin-top -translate-x-1/2 sm:h-[101px]"
            style={{
              background: `linear-gradient(to bottom, color-mix(in oklab, ${GREEN} 60%, transparent), transparent)`,
              boxShadow: `0 0 10px 1px color-mix(in oklab, ${GREEN} 45%, transparent)`,
            }}
            initial={{ opacity: 0, scaleY: 0 }}
            whileInView={{ opacity: 0.55, scaleY: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          />
        )}
        <motion.div {...fadeUp}>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{
              color: GREEN,
              backgroundColor: GREEN_SOFT,
              border: `1px solid ${GREEN_BORDER}`,
            }}
          >
            Kadria prend le relais
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-[-0.02em] sm:text-4xl md:text-5xl">
            Tout est structuré. Vous passez à l'action.
          </h2>
        </motion.div>
      </div>

      {/* Mobile : preview simplifiée, sans mockup horizontal ni scroll. */}
      <div className="relative mx-auto mt-8 block max-w-[calc(100vw-32px)] px-4 md:hidden">
        <MobileDashboardPreview />
      </div>

      {/* Desktop/tablette : mockup complet, largeur contrainte au viewport. */}
      <motion.div
        {...dashReveal}
        className="relative mx-auto mt-8 hidden md:block"
        style={{ width: "min(94vw, 1500px)", maxWidth: "calc(100vw - 48px)" }}
      >
        <div className="rounded-2xl">
          <div
            className="rounded-2xl"
            style={{
              backgroundColor: APP_BG,
              border: `1px solid ${BORDER_STRONG}`,
              boxShadow:
                "0 1px 0 0 oklch(1 0 0 / 0.05) inset, 0 60px 120px -40px oklch(0 0 0 / 0.75)",
            }}
          >
            <div
              className="flex items-center gap-3 border-b px-4 py-3"
              style={{ borderColor: BORDER }}
            >
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "oklch(0.7 0.18 25)" }} />
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "oklch(0.82 0.16 75)" }} />
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "oklch(0.78 0.15 145)" }} />
              </div>
              <div
                className="ml-4 flex-1 rounded-md px-3 py-1 text-xs"
                style={{ backgroundColor: PANEL, color: TEXT_DIM, border: `1px solid ${BORDER}` }}
              >
                app.kadria.io/suivi
              </div>
            </div>

            <div className="grid grid-cols-[220px_1fr]">
              <aside
                className="flex flex-col border-r p-3"
                style={{ borderColor: BORDER, backgroundColor: "oklch(0.2 0.008 260)" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-semibold"
                    style={{
                      backgroundColor: GREEN,
                      color: "oklch(0.2 0.02 150)",
                      fontFamily: '"Instrument Serif", serif',
                    }}
                  >
                    K
                  </div>
                  <div className="text-sm font-semibold tracking-wide">KADRIA</div>
                  <span
                    className="ml-1 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest"
                    style={{ backgroundColor: GREEN_SOFT, color: GREEN, border: `1px solid ${GREEN_BORDER}` }}
                  >
                    PRO
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium">Bonjour Laurent</div>
                  <div className="text-[11px]" style={{ color: TEXT_DIM }}>
                    Mardi 7 juillet 2026
                  </div>
                </div>

                <nav className="mt-4 flex flex-col gap-1 text-[13px]">
                  {[
                    { icon: <TrendingUp size={14} />, label: "Valeur générée" },
                    { icon: <BarChart3 size={14} />, label: "Suivi commercial", active: true },
                    { icon: <Calendar size={14} />, label: "Calendrier" },
                    { icon: <Users size={14} />, label: "Mes clients" },
                    { icon: <CheckSquare size={14} />, label: "Mes tâches" },
                  ].map((it) => (
                    <div
                      key={it.label}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5"
                      style={{
                        backgroundColor: it.active ? GREEN_SOFT : "transparent",
                        color: it.active ? GREEN : TEXT_MUTED,
                        border: it.active ? `1px solid ${GREEN_BORDER}` : "1px solid transparent",
                      }}
                    >
                      {it.icon}
                      <span>{it.label}</span>
                    </div>
                  ))}
                </nav>

                <div className="my-3 h-px" style={{ backgroundColor: BORDER }} />

                <nav className="flex flex-col gap-1 text-[12px]" style={{ color: TEXT_DIM }}>
                  {[
                    { icon: <CreditCard size={13} />, label: "Changer d'offre" },
                    { icon: <Sun size={13} />, label: "Thème clair" },
                    { icon: <User size={13} />, label: "Mon profil" },
                    { icon: <LogOut size={13} />, label: "Déconnexion" },
                  ].map((it) => (
                    <div key={it.label} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                      {it.icon}
                      <span>{it.label}</span>
                    </div>
                  ))}
                </nav>
              </aside>

              <div className="p-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Suivi commercial</h3>
                    <p className="text-xs" style={{ color: TEXT_MUTED }}>
                      Du 7 juin au 7 juillet 2026
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[12px]">
                    {["7 jours", "Ce mois", "3 mois", "Cette année"].map((p, i) => (
                      <button
                        key={p}
                        className="rounded-md px-2.5 py-1"
                        style={{
                          backgroundColor: i === 1 ? GREEN_SOFT : "transparent",
                          color: i === 1 ? GREEN : TEXT_MUTED,
                          border: `1px solid ${i === 1 ? GREEN_BORDER : BORDER}`,
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {KPIS.map((k) => (
                    <div
                      key={k.label}
                      className="rounded-xl p-3"
                      style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}` }}
                    >
                      <div className="flex items-center justify-between text-[11px]" style={{ color: TEXT_MUTED }}>
                        <span>{k.label}</span>
                        <span style={{ color: k.tone }}>{k.icon}</span>
                      </div>
                      <div className="mt-1.5 text-xl font-semibold">{k.value}</div>
                      <div className="mt-0.5 text-[11px]" style={{ color: k.tone }}>
                        {k.delta}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div
                    className="col-span-1 rounded-xl p-3"
                    style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Opportunités à sécuriser</div>
                      <AlertTriangle size={14} style={{ color: ORANGE }} />
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {OPP_RISK.map((o) => (
                        <div
                          key={o.name}
                          className="rounded-lg p-2.5"
                          style={{ backgroundColor: ROW, border: `1px solid ${BORDER}` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-[13px] font-medium">{o.name}</div>
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider"
                              style={{
                                color: o.tone,
                                backgroundColor: `color-mix(in oklab, ${o.tone} 14%, transparent)`,
                                border: `1px solid color-mix(in oklab, ${o.tone} 35%, transparent)`,
                              }}
                            >
                              {o.tag}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>
                            {o.meta}
                          </div>
                          <div className="mt-2 flex gap-1.5 text-[10px]">
                            {["Relancer", "Tâche", "Clôturer"].map((b) => (
                              <span
                                key={b}
                                className="rounded px-1.5 py-0.5"
                                style={{ backgroundColor: PANEL_2, color: TEXT_MUTED, border: `1px solid ${BORDER}` }}
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      className="mt-3 inline-flex items-center gap-1 text-[11px]"
                      style={{ color: GREEN }}
                    >
                      Voir tous les dossiers en risque <ArrowRight size={11} />
                    </button>
                  </div>

                  <div
                    className="col-span-1 rounded-xl p-3"
                    style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}` }}
                  >
                    <div className="text-sm font-semibold">Santé commerciale</div>
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-full text-sm font-semibold"
                        style={{
                          background: `conic-gradient(${GREEN} 0 77%, ${BORDER_STRONG} 77% 100%)`,
                          color: GREEN,
                        }}
                      >
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-full"
                          style={{ backgroundColor: PANEL }}
                        >
                          77
                        </div>
                      </div>
                      <div>
                        <div className="text-[13px] font-medium" style={{ color: GREEN }}>
                          En excellente santé
                        </div>
                        <div className="text-[11px]" style={{ color: TEXT_MUTED }}>
                          Maturité moyenne 77/100
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-md p-2" style={{ backgroundColor: ROW, border: `1px solid ${BORDER}` }}>
                        <div style={{ color: TEXT_MUTED }}>Critiques</div>
                        <div className="text-base font-semibold">0</div>
                      </div>
                      <div className="rounded-md p-2" style={{ backgroundColor: ROW, border: `1px solid ${BORDER}` }}>
                        <div style={{ color: TEXT_MUTED }}>Actions à traiter</div>
                        <div className="text-base font-semibold">0</div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="col-span-1 rounded-xl p-3"
                    style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Actions à traiter</div>
                      <span className="text-[11px]" style={{ color: TEXT_MUTED }}>
                        16 en attente
                      </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-1.5">
                      {ACTIONS.map((a) => (
                        <div
                          key={a.label}
                          className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-[12px]"
                          style={{ backgroundColor: ROW, border: `1px solid ${BORDER}` }}
                        >
                          <div className="flex items-center gap-2">
                            <span style={{ color: a.tone }}>{a.icon}</span>
                            {a.label}
                          </div>
                          <ArrowUpRight size={12} style={{ color: TEXT_DIM }} />
                        </div>
                      ))}
                    </div>
                    <button
                      className="mt-3 inline-flex items-center gap-1 text-[11px]"
                      style={{ color: GREEN }}
                    >
                      Voir mes tâches <ArrowRight size={11} />
                    </button>
                  </div>
                </div>

                <div
                  className="mt-3 rounded-xl p-3"
                  style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Guideline commerciale</div>
                    <span className="text-[11px]" style={{ color: TEXT_MUTED }}>
                      Pipeline structuré
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {GUIDELINE.map((col) => (
                      <div
                        key={col.title}
                        className="rounded-lg p-2.5"
                        style={{ backgroundColor: ROW, border: `1px solid ${BORDER}` }}
                      >
                        <div
                          className="text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: GREEN }}
                        >
                          {col.title}
                        </div>
                        <div className="mt-2 flex flex-col gap-1.5">
                          {col.rows.map((r) => (
                            <div
                              key={r.label}
                              className="flex items-center justify-between text-[11px]"
                            >
                              <span style={{ color: TEXT_MUTED }}>{r.label}</span>
                              <span
                                className="font-semibold"
                                style={{ color: r.tone || TEXT }}
                              >
                                {r.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="mt-3 rounded-xl p-3"
                  style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}` }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">Opportunités prioritaires</div>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            color: GREEN,
                            backgroundColor: GREEN_SOFT,
                            border: `1px solid ${GREEN_BORDER}`,
                          }}
                        >
                          <Sparkles size={10} /> Score IA
                        </span>
                      </div>
                      <p className="mt-1 max-w-2xl text-[11px]" style={{ color: TEXT_MUTED }}>
                        Les dossiers à rappeler en premier selon complétude, budget, urgence,
                        délai, réactivité et distance.
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible">
                    {LEADS.map((l) => {
                      const isTop = l.rank === 1;
                      return (
                        <div
                          key={l.rank}
                          className="flex min-w-[150px] flex-1 flex-col justify-between gap-1.5 rounded-lg p-2.5"
                          style={{
                            backgroundColor: isTop ? GREEN_SOFT : ROW,
                            border: `1px solid ${isTop ? GREEN_BORDER : BORDER}`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold"
                              style={{
                                backgroundColor: isTop ? GREEN : "oklch(1 0 0 / 0.06)",
                                color: isTop ? "oklch(0.2 0.02 150)" : TEXT,
                                border: `1px solid ${isTop ? GREEN : BORDER}`,
                              }}
                            >
                              #{l.rank}
                            </span>
                            <span className="text-[12px] font-semibold" style={{ color: GREEN }}>
                              {l.score}
                              <span className="text-[9px]" style={{ color: TEXT_MUTED }}>
                                /100
                              </span>
                            </span>
                          </div>
                          <div>
                            <div className="truncate text-[12px] font-medium">{l.name}</div>
                            <div className="truncate text-[10px]" style={{ color: TEXT_MUTED }}>
                              {l.trade}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                              style={
                                isTop
                                  ? { color: "oklch(0.2 0.02 150)", backgroundColor: GREEN, border: `1px solid ${GREEN}` }
                                  : { color: TEXT, backgroundColor: "oklch(1 0 0 / 0.06)", border: `1px solid ${BORDER_STRONG}` }
                              }
                            >
                              {l.badge}
                            </span>
                            <span className="whitespace-nowrap text-[11px] font-semibold">{l.amount}</span>
                          </div>
                          <a
                            href="#"
                            className="inline-flex items-center gap-0.5 text-[10px]"
                            style={{ color: GREEN }}
                          >
                            Voir <ArrowRight size={9} />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
