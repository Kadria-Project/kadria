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

function ChaosCardEl({ card: c, index: i }: { card: ChaosCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: -1 + (i % 3) }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.55,
        ease: "easeOut",
        delay: 0.08 * i,
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
          style={{ color: toneColor(c.tone) }}
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{
              backgroundColor: `color-mix(in oklab, ${toneColor(c.tone)} 15%, transparent)`,
            }}
          >
            {c.icon}
          </span>
          {c.title}
        </div>
        <span className="text-[11px]" style={{ color: TEXT_MUTED }}>
          {c.meta}
        </span>
      </div>
      <p
        className="relative z-30 mt-3 text-sm leading-relaxed"
        style={{ color: "oklch(0.92 0.005 90)" }}
      >
        {c.body}
      </p>
    </motion.div>
  );
}

// Petit segment de connecteur mobile, placé dans le flux normal (donc
// toujours exactement dans l'espace entre deux cartes, jamais superposé).
// Une hauteur fixe centre le trait avec une marge de sécurité de chaque
// côté pour ne jamais toucher les bordures des cartes adjacentes.
function MobileConnector({ reduce, delay }: { reduce: boolean | null; delay: number }) {
  const lineStyle = {
    background: `linear-gradient(to bottom, transparent, ${KADRIA_GREEN}, transparent)`,
    filter: `drop-shadow(0 0 3px color-mix(in oklab, ${KADRIA_GREEN} 55%, transparent))`,
  };

  return (
    <div
      aria-hidden
      className="relative z-0 flex h-9 items-center justify-center"
    >
      {reduce ? (
        <div className="h-5 w-px opacity-40" style={lineStyle} />
      ) : (
        <motion.div
          className="h-5 w-px origin-center opacity-40"
          style={lineStyle}
          initial={{ scaleY: 0, opacity: 0 }}
          whileInView={{ scaleY: 1, opacity: 0.4 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut", delay }}
        />
      )}
    </div>
  );
}

// Courbes décoratives cartes -> K, en coordonnées relatives (viewBox 0-100),
// mesurées via Playwright (getBoundingClientRect) sur le rendu desktop réel à
// 1440px : conteneur "relative mt-10" = {x:168, y:719.5, w:1104, h:472.25},
// cartes lg:grid-cols-3 (2 lignes), bord bas-centre de chaque carte, K
// {x:680, y:1007.75, w:80, h:80} -> bord haut-centre à (50, 61.04). Les
// anciennes coordonnées (K supposé à y92) étaient devinées et désalignées :
// le K réel se trouve bien plus haut dans le conteneur (y~61), ce qui
// faisait dépasser les traits sous le K.
// Ligne 1 (bas ~y26.15) : gauche x16.18, milieu x50, droite x83.82
// Ligne 2 (bas ~y50.87) : gauche x16.18, milieu x50, droite x83.82
// Point d'arrivée commun : bord haut du K, (50, 61.04)
const CHAOS_LINES = [
  "M16.18,26.15 C24,38 38,52 50,61.04",
  "M50,26.15 C50,38 50,50 50,61.04",
  "M83.82,26.15 C76,38 62,52 50,61.04",
  "M16.18,50.87 C26,55 40,59 50,61.04",
  "M50,50.87 C50,55 50,58 50,61.04",
  "M83.82,50.87 C74,55 60,59 50,61.04",
];

const LINE_DURATION = 0.9;
const LINE_STAGGER = 0.09;
const LINES_END = LINE_DURATION + LINE_STAGGER * (CHAOS_LINES.length - 1);
const K_PULSE_DELAY = LINES_END + 0.18;
const K_PULSE_DURATION = 1.1;
const EXIT_DELAY = K_PULSE_DELAY + K_PULSE_DURATION + 0.15;

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
            et le badge K (z-20/30). Les traits ne dépassent jamais le contenu
            des cartes grâce à cette hiérarchie de calques stricte. */}
        <div className="relative mt-10">
          {/* Traits verts reliant les cartes au K — courbes complexes, desktop
              uniquement (hidden md:block). Toujours SOUS les cartes (z-0). */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full md:block"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            fill="none"
            style={{
              filter: `drop-shadow(0 0 2px color-mix(in oklab, ${KADRIA_GREEN} 35%, transparent))`,
            }}
          >
            {CHAOS_LINES.map((d, i) =>
              reduce ? (
                <path
                  key={d}
                  d={d}
                  stroke={KADRIA_GREEN}
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  opacity={0.3}
                />
              ) : (
                <motion.path
                  key={d}
                  d={d}
                  stroke={KADRIA_GREEN}
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.35 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{
                    duration: LINE_DURATION,
                    ease: "easeOut",
                    delay: LINE_STAGGER * i,
                  }}
                />
              ),
            )}
          </svg>

          {/* Mobile (< sm) : pile de cartes en une colonne, avec un petit
              segment de connecteur inséré entre chaque paire de cartes (et un
              dernier segment vers le K), plutôt qu'un grand trait unique qui
              traversait toute la stack. Chaque segment vit dans l'espace
              normal du flex (z-0), les cartes gardent leur fond opaque et un
              z-index supérieur (z-20/30), donc aucun trait ne peut passer
              par-dessus le texte. */}
          <div className="relative z-20 flex flex-col sm:hidden">
            {CARDS.map((c, i) => (
              <div key={c.title} className="contents">
                <ChaosCardEl card={c} index={i} />
                <MobileConnector reduce={reduce} delay={0.08 * i + 0.04} />
              </div>
            ))}
          </div>

          <div className="relative z-20 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((c, i) => (
              <ChaosCardEl key={c.title} card={c} index={i} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="relative z-20 mt-4 flex flex-col items-center text-center sm:mt-12"
          >
            {/* Halo/glow derrière le K, toujours sous le badge (z-0). */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 z-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
              style={{
                background: `radial-gradient(closest-side, color-mix(in oklab, ${KADRIA_GREEN} 45%, transparent), transparent 72%)`,
              }}
            />

            {reduce ? (
              <div
                className="relative z-20 flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold"
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
                whileInView={{ scale: [1, 1, 1.06, 1] }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: K_PULSE_DURATION,
                  times: [0, 0.55, 0.75, 1],
                  ease: "easeOut",
                  delay: K_PULSE_DELAY,
                }}
                className="relative z-20 flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold"
                style={{
                  backgroundColor: KADRIA_GREEN,
                  color: "oklch(0.2 0.02 150)",
                }}
              >
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
                      `0 0 0 2px color-mix(in oklab, ${KADRIA_GREEN} 60%, transparent), 0 0 55px 6px color-mix(in oklab, ${KADRIA_GREEN} 65%, transparent)`,
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
              className="relative z-20 mt-5 max-w-xl text-base sm:text-lg"
              style={{ color: "oklch(0.94 0.005 90)" }}
            >
              <span style={{ color: KADRIA_GREEN, fontWeight: 500 }}>Kadria</span>{" "}
              centralise, qualifie et priorise vos demandes.
            </p>

            {/* Sortie visuelle vers le dashboard : faisceau vert dégradé qui
                se déploie vers le bas après le pulse du K, sans ajouter
                d'espace vertical (h-10 déjà en place). */}
            {reduce ? (
              <div
                aria-hidden
                className="relative z-0 mt-4 h-10 w-px"
                style={{
                  background: `linear-gradient(to bottom, color-mix(in oklab, ${KADRIA_GREEN} 55%, transparent), transparent)`,
                }}
              />
            ) : (
              <motion.div
                aria-hidden
                className="relative z-0 mt-4 h-10 w-px origin-top"
                style={{
                  background: `linear-gradient(to bottom, color-mix(in oklab, ${KADRIA_GREEN} 55%, transparent), transparent)`,
                }}
                initial={{ opacity: 0, scaleY: 0 }}
                whileInView={{ opacity: 0.35, scaleY: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, ease: "easeOut", delay: EXIT_DELAY }}
              />
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
