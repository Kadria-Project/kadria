import { motion, useReducedMotion } from "motion/react";
import {
  PhoneMissed,
  MessageCircle,
  FileText,
  Image as ImageIcon,
  StickyNote,
  Clock,
} from "lucide-react";

const KADRIA_GREEN = "oklch(0.86 0.19 145)";
const DARK_BG = "oklch(0.19 0.008 260)";
const CARD_BG = "oklch(0.24 0.008 260)";
const BORDER = "oklch(1 0 0 / 0.10)";
const BORDER_STRONG = "oklch(1 0 0 / 0.18)";
const TEXT_MUTED = "oklch(0.72 0.01 260)";
const LINE_GLOW = "rgba(100, 255, 130, 0.45)";

type ChaosCard = {
  icon: React.ReactNode;
  title: string;
  meta: string;
  body: string;
  tone?: "warn" | "info" | "danger";
};

const CARDS: ChaosCard[] = [
  {
    icon: <PhoneMissed size={16} />,
    title: "Appel manqué",
    meta: "il y a 2 min",
    body: "06 42 18 •• ••",
    tone: "danger",
  },
  {
    icon: <MessageCircle size={16} />,
    title: "WhatsApp",
    meta: "Mme Perrin",
    body: "« Bonjour, ma chaudière fait un bruit bizarre depuis hier soir… »",
    tone: "info",
  },
  {
    icon: <FileText size={16} />,
    title: "Nouveau formulaire",
    meta: "site web",
    body: "Demande de devis salle de bain complète — 8 m²",
    tone: "info",
  },
  {
    icon: <ImageIcon size={16} />,
    title: "Photo reçue",
    meta: "SMS",
    body: "Fuite sous évier — urgent selon le client",
    tone: "warn",
  },
  {
    icon: <StickyNote size={16} />,
    title: "Note — M. Laurent",
    meta: "post-it bureau",
    body: "Rappeler pour chaudière gaz, budget ~4500 €",
  },
  {
    icon: <Clock size={16} />,
    title: "Devis à relancer",
    meta: "envoyé il y a 6 jours",
    body: "Mme Barbier — rénovation SDB",
    tone: "warn",
  },
];

function toneColor(tone?: ChaosCard["tone"]) {
  if (tone === "danger") return "oklch(0.72 0.18 25)";
  if (tone === "warn") return "oklch(0.82 0.15 75)";
  if (tone === "info") return "oklch(0.78 0.12 220)";
  return TEXT_MUTED;
}

// Courbes décoratives cartes -> K, en coordonnées relatives (viewBox 0-100).
// 3 colonnes desktop (lg:grid-cols-3, 2 lignes) : centres approx. x = 17 / 50 / 83,
// bas de ligne 1 ~ y18, bas de ligne 2 ~ y38. Le K se trouve en bas, ~ (50, 92).
// Les traits partent des interstices sous chaque carte pour rester visibles
// dans les zones libres de la grille (pas depuis une zone cachée).
const CHAOS_LINES = [
  "M17,18 C25,52 38,80 50,92",
  "M50,18 C50,48 50,76 50,92",
  "M83,18 C75,52 62,80 50,92",
  "M17,38 C25,58 38,80 50,92",
  "M50,38 C50,58 50,78 50,92",
  "M83,38 C75,58 62,80 50,92",
];

// Points lumineux simulant un flux d'énergie le long de chaque courbe.
// Approche simplifiée (positions fixes le long du tracé + delay progressif)
// plutôt qu'un suivi exact du path, pour rester simple et fiable.
const CHAOS_POINTS: { cx: number; cy: number; lineIndex: number; t: number }[] = [
  { cx: 22, cy: 40, lineIndex: 0, t: 0 },
  { cx: 42, cy: 85, lineIndex: 0, t: 1 },
  { cx: 50, cy: 45, lineIndex: 1, t: 0 },
  { cx: 50, cy: 80, lineIndex: 1, t: 1 },
  { cx: 78, cy: 40, lineIndex: 2, t: 0 },
  { cx: 58, cy: 85, lineIndex: 2, t: 1 },
  { cx: 22, cy: 50, lineIndex: 3, t: 0 },
  { cx: 42, cy: 85, lineIndex: 3, t: 1 },
  { cx: 50, cy: 55, lineIndex: 4, t: 0 },
  { cx: 50, cy: 82, lineIndex: 4, t: 1 },
  { cx: 78, cy: 50, lineIndex: 5, t: 0 },
  { cx: 58, cy: 85, lineIndex: 5, t: 1 },
];

// Timing global de la séquence (cf. commentaires par étape) :
// cartes 0-0.7s, connecteurs 0.5-1.6s, points lumineux 0.9-1.8s,
// pulse K + anneau 1.6-2.3s, sortie vers dashboard 2.1-2.8s.
const LINE_START = 0.5;
const LINE_DURATION = 0.75;
const LINE_STAGGER = 0.08;
const POINTS_START = 0.9;
const POINT_DURATION = 0.35;
const K_PULSE_DELAY = 1.6;
const K_PULSE_DURATION = 0.7;
const RING_DELAY = 1.65;
const RING_DURATION = 0.9;
const EXIT_DELAY = 2.1;
const EXIT_DURATION = 0.6;
const JUNCTION_POINT_DELAY = EXIT_DELAY + EXIT_DURATION;
const JUNCTION_POINT_DURATION = 0.3;

function ChaosCardItem({ card, index }: { card: ChaosCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: -1 + (index % 3) }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.55,
        ease: "easeOut",
        delay: 0.08 * index,
      }}
      className="group relative z-20 rounded-xl p-5 backdrop-blur-sm"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid ${BORDER}`,
        boxShadow:
          "0 1px 0 0 oklch(1 0 0 / 0.04) inset, 0 20px 40px -25px oklch(0 0 0 / 0.6)",
      }}
    >
      <div className="relative z-30 flex items-center justify-between">
        <div
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider"
          style={{ color: toneColor(card.tone) }}
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{
              backgroundColor: `color-mix(in oklab, ${toneColor(card.tone)} 15%, transparent)`,
            }}
          >
            {card.icon}
          </span>
          {card.title}
        </div>
        <span className="text-[11px]" style={{ color: TEXT_MUTED }}>
          {card.meta}
        </span>
      </div>
      <p
        className="relative z-30 mt-3 text-sm leading-relaxed"
        style={{ color: "oklch(0.92 0.005 90)" }}
      >
        {card.body}
      </p>
    </motion.div>
  );
}

function MobileConnector({
  index,
  reduce,
  tall = false,
}: {
  index: number;
  reduce: boolean | null;
  tall?: boolean;
}) {
  const delay = 0.15 * index;
  return (
    <div
      aria-hidden
      className={`pointer-events-none relative z-0 mx-auto flex w-px items-center justify-center ${
        tall ? "h-10" : "h-6"
      }`}
    >
      {reduce ? (
        <div
          className="h-full w-px"
          style={{
            background: `linear-gradient(to bottom, transparent, ${KADRIA_GREEN}, transparent)`,
            opacity: 0.45,
          }}
        />
      ) : (
        <>
          <motion.div
            className="h-full w-px origin-top"
            style={{
              background: `linear-gradient(to bottom, transparent, ${KADRIA_GREEN}, transparent)`,
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            whileInView={{ scaleY: 1, opacity: 0.55 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay, ease: "easeOut" }}
          />
          <motion.span
            className="absolute h-[6px] w-[6px] rounded-full"
            style={{
              backgroundColor: KADRIA_GREEN,
              boxShadow: `0 0 6px 2px ${LINE_GLOW}`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: [0, 1, 0.6], scale: [0, 1.3, 1] }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: delay + 0.2, ease: "easeOut" }}
          />
        </>
      )}
    </div>
  );
}

export default function LandingChaosSection() {
  const reduce = useReducedMotion();

  return (
    <section
      style={{ backgroundColor: DARK_BG, color: "oklch(0.97 0.005 90)" }}
      className="relative overflow-hidden py-16 sm:py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.05) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[480px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(closest-side, color-mix(in oklab, ${KADRIA_GREEN} 22%, transparent), transparent 70%)`,
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{
              color: KADRIA_GREEN,
              backgroundColor: `color-mix(in oklab, ${KADRIA_GREEN} 12%, transparent)`,
              border: `1px solid color-mix(in oklab, ${KADRIA_GREEN} 30%, transparent)`,
            }}
          >
            Trop de demandes partout
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-[-0.02em] sm:text-4xl md:text-5xl">
            Le quotidien des artisans.
          </h2>
          <p className="mt-4 text-base sm:text-lg" style={{ color: TEXT_MUTED }}>
            Appels, WhatsApp, formulaires, photos, post-it… Les demandes arrivent de partout
            et rien n'est priorisé.
          </p>
        </motion.div>

        {/* Zone cartes + K : porte le SVG de liaisons (z-0), les cartes (z-20)
            et le badge K (z-30). Les traits ne dépassent jamais le contenu
            des cartes grâce à cette hiérarchie de calques stricte. */}
        <div className="relative mt-10">
          {/* Traits verts reliant les cartes au K — courbes complexes, desktop
              uniquement (hidden md:block). Toujours SOUS les cartes (z-0), mais
              suffisamment marqués (largeur, opacité, glow) pour rester
              perceptibles dans les espaces libres entre les cartes. */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full md:block"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            fill="none"
            style={{
              filter: `drop-shadow(0 0 8px ${LINE_GLOW})`,
            }}
          >
            {CHAOS_LINES.map((d, i) =>
              reduce ? (
                <path
                  key={d}
                  d={d}
                  stroke={KADRIA_GREEN}
                  strokeWidth="1.8"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  opacity={0.45}
                />
              ) : (
                <motion.path
                  key={d}
                  d={d}
                  stroke={KADRIA_GREEN}
                  strokeWidth="1.8"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.55 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{
                    duration: LINE_DURATION,
                    ease: "easeOut",
                    delay: LINE_START + LINE_STAGGER * i,
                  }}
                />
              ),
            )}
            {!reduce &&
              CHAOS_POINTS.map((p, i) => (
                <motion.circle
                  key={`${p.cx}-${p.cy}-${i}`}
                  cx={p.cx}
                  cy={p.cy}
                  r={1.6}
                  fill={KADRIA_GREEN}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: [0, 1, 0], scale: [0, 1.4, 0.8] }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{
                    duration: POINT_DURATION,
                    ease: "easeOut",
                    delay: POINTS_START + p.lineIndex * 0.06 + p.t * 0.35,
                  }}
                />
              ))}
          </svg>

          {/* Desktop uniquement : grille de cartes classique. */}
          <div className="relative z-20 hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((c, i) => (
              <ChaosCardItem key={c.title} card={c} index={i} />
            ))}
          </div>

          {/* Mobile uniquement : cartes empilées avec un connecteur animé
              entre chaque paire de cartes (allumage progressif de haut en
              bas), plutôt qu'un simple trait vertical statique. */}
          <div className="relative z-20 grid grid-cols-1 gap-0 sm:hidden">
            {CARDS.map((c, i) => (
              <div key={c.title}>
                <ChaosCardItem card={c} index={i} />
                {i < CARDS.length - 1 && (
                  <MobileConnector index={i} reduce={reduce} />
                )}
                {i === CARDS.length - 1 && (
                  <MobileConnector index={i} reduce={reduce} tall />
                )}
              </div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="relative z-20 mt-12 flex flex-col items-center text-center"
          >
            {/* Halo/glow derrière le K, toujours sous le badge mais au-dessus
                des traits (z-10). */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 z-10 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
              style={{
                background: `radial-gradient(closest-side, color-mix(in oklab, ${KADRIA_GREEN} 45%, transparent), transparent 72%)`,
              }}
            />

            {reduce ? (
              <div
                className="relative z-30 flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold"
                style={{
                  backgroundColor: KADRIA_GREEN,
                  color: "oklch(0.2 0.02 150)",
                  boxShadow: `0 0 0 1px color-mix(in oklab, ${KADRIA_GREEN} 30%, transparent), 0 20px 60px -20px color-mix(in oklab, ${KADRIA_GREEN} 50%, transparent)`,
                }}
              >
                K
              </div>
            ) : (
              <motion.div
                initial={{ scale: 1 }}
                whileInView={{ scale: [1, 1, 1.08, 1] }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: K_PULSE_DURATION,
                  times: [0, 0.55, 0.75, 1],
                  ease: "easeOut",
                  delay: K_PULSE_DELAY,
                }}
                className="relative z-30 flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold"
                style={{
                  backgroundColor: KADRIA_GREEN,
                  color: "oklch(0.2 0.02 150)",
                }}
              >
                {/* Anneau lumineux qui s'étend puis disparaît, déclenché
                    juste après l'arrivée des liaisons sur le K. */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    border: `2px solid color-mix(in oklab, ${KADRIA_GREEN} 70%, transparent)`,
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: [0.8, 1.7], opacity: [0.55, 0] }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{
                    duration: RING_DURATION,
                    ease: "easeOut",
                    delay: RING_DELAY,
                  }}
                />
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl"
                  initial={{
                    boxShadow: `0 0 0 1px color-mix(in oklab, ${KADRIA_GREEN} 30%, transparent), 0 20px 60px -20px color-mix(in oklab, ${KADRIA_GREEN} 50%, transparent)`,
                  }}
                  whileInView={{
                    boxShadow: [
                      `0 0 0 1px color-mix(in oklab, ${KADRIA_GREEN} 30%, transparent), 0 20px 60px -20px color-mix(in oklab, ${KADRIA_GREEN} 50%, transparent)`,
                      `0 0 0 1px color-mix(in oklab, ${KADRIA_GREEN} 30%, transparent), 0 20px 60px -20px color-mix(in oklab, ${KADRIA_GREEN} 50%, transparent)`,
                      `0 0 0 3px color-mix(in oklab, ${KADRIA_GREEN} 75%, transparent), 0 0 70px 10px color-mix(in oklab, ${KADRIA_GREEN} 75%, transparent)`,
                      `0 0 0 1px color-mix(in oklab, ${KADRIA_GREEN} 30%, transparent), 0 20px 60px -20px color-mix(in oklab, ${KADRIA_GREEN} 50%, transparent)`,
                    ],
                  }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{
                    duration: K_PULSE_DURATION,
                    times: [0, 0.55, 0.75, 1],
                    ease: "easeOut",
                    delay: K_PULSE_DELAY,
                  }}
                />
                K
              </motion.div>
            )}

            <p
              className="relative z-30 mt-5 max-w-xl text-base sm:text-lg"
              style={{ color: "oklch(0.94 0.005 90)" }}
            >
              <span style={{ color: KADRIA_GREEN, fontWeight: 500 }}>Kadria</span>{" "}
              centralise, qualifie et priorise vos demandes.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Sortie visuelle vers le dashboard : faisceau vert dégradé qui se
          déploie vers le bas après le pulse du K, jusqu'au point de jonction
          qui fait le relais avec LandingDashboardShowcase. Ancré en absolute
          sur le bas de la SECTION (pas en flux normal dans le flex du K) :
          le padding-bottom de la section (py-16/py-24) est ajouté APRÈS le
          contenu en flux, donc un trait "en flux" laissait un grand vide
          vide avant le bord de section. En absolute + bottom-0, le trait et
          le point de jonction occupent exactement ce padding et touchent le
          bord bas de la section, jointif avec le haut de
          LandingDashboardShowcase (aucun gap DOM entre les deux sections). */}
      {reduce ? (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/2 z-0 flex h-16 -translate-x-1/2 flex-col items-center justify-end sm:h-24"
        >
          <div
            className="h-14 w-px sm:h-20"
            style={{
              background: `linear-gradient(to bottom, color-mix(in oklab, ${KADRIA_GREEN} 60%, transparent), transparent)`,
            }}
          />
          <div
            className="mb-1.5 h-2 w-2 rounded-full"
            style={{
              backgroundColor: KADRIA_GREEN,
              boxShadow: `0 0 10px 3px ${LINE_GLOW}`,
            }}
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/2 z-0 flex h-16 -translate-x-1/2 flex-col items-center justify-end sm:h-24"
        >
          <motion.div
            className="h-14 w-px origin-top sm:h-20"
            style={{
              background: `linear-gradient(to bottom, color-mix(in oklab, ${KADRIA_GREEN} 65%, transparent), transparent)`,
              boxShadow: `0 0 10px 1px ${LINE_GLOW}`,
            }}
            initial={{ opacity: 0, scaleY: 0 }}
            whileInView={{ opacity: 0.6, scaleY: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: EXIT_DURATION, ease: "easeOut", delay: EXIT_DELAY }}
          />
          {/* Point de jonction : relais visuel vers le badge
              "Kadria prend le relais" de la section suivante. */}
          <motion.div
            className="relative z-10 mb-1.5 h-2 w-2 rounded-full"
            style={{
              backgroundColor: KADRIA_GREEN,
              boxShadow: `0 0 12px 3px ${LINE_GLOW}`,
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: [0.7, 1.15, 1] }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
              duration: JUNCTION_POINT_DURATION,
              ease: "easeOut",
              delay: JUNCTION_POINT_DELAY,
              times: [0, 0.7, 1],
            }}
          />
          {/* Pulse doux et continu du point pour signaler le relais actif. */}
          <motion.div
            className="pointer-events-none absolute bottom-1.5 h-2 w-2 rounded-full"
            style={{ backgroundColor: KADRIA_GREEN }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: [0, 0.5, 0] }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
              duration: 1.6,
              ease: "easeInOut",
              delay: JUNCTION_POINT_DELAY + JUNCTION_POINT_DURATION,
              repeat: Infinity,
              repeatDelay: 0.4,
            }}
          />
        </div>
      )}
    </section>
  );
}
