import { motion } from "motion/react";
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

export default function LandingChaosSection() {
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

        <div className="relative mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 24, rotate: -1 + (i % 3) }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.55,
                ease: "easeOut",
                delay: 0.08 * i,
              }}
              className="group relative rounded-xl p-5 backdrop-blur-sm"
              style={{
                backgroundColor: CARD_BG,
                border: `1px solid ${BORDER}`,
                boxShadow:
                  "0 1px 0 0 oklch(1 0 0 / 0.04) inset, 0 20px 40px -25px oklch(0 0 0 / 0.6)",
              }}
            >
              <div className="flex items-center justify-between">
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
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "oklch(0.92 0.005 90)" }}>
                {c.body}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="relative mt-12 flex flex-col items-center text-center"
        >
          {/* Traits verts subtils reliant la grille de cartes au badge K.
              Positionnés en absolute au-dessus du badge, dans l'espace déjà
              existant (mt-12) : pas de hauteur additionnelle. Masqués sur
              mobile (hidden md:block) car peu lisibles / fragiles en petit écran. */}
          <svg
            aria-hidden
            className="pointer-events-none absolute -top-12 left-1/2 hidden h-12 w-[560px] -translate-x-1/2 md:block"
            viewBox="0 0 560 48"
            fill="none"
          >
            <path d="M40 0 C 120 20, 220 34, 280 44" stroke={KADRIA_GREEN} strokeWidth="1" opacity="0.22" />
            <path d="M180 0 C 220 16, 250 30, 280 44" stroke={KADRIA_GREEN} strokeWidth="1" opacity="0.3" />
            <path d="M280 0 L 280 44" stroke={KADRIA_GREEN} strokeWidth="1" opacity="0.35" />
            <path d="M380 0 C 340 16, 310 30, 280 44" stroke={KADRIA_GREEN} strokeWidth="1" opacity="0.3" />
            <path d="M520 0 C 440 20, 340 34, 280 44" stroke={KADRIA_GREEN} strokeWidth="1" opacity="0.22" />
          </svg>

          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold"
            style={{
              backgroundColor: KADRIA_GREEN,
              color: "oklch(0.2 0.02 150)",
              boxShadow: `0 0 0 1px color-mix(in oklab, ${KADRIA_GREEN} 30%, transparent), 0 20px 60px -20px color-mix(in oklab, ${KADRIA_GREEN} 50%, transparent)`,
            }}
          >
            K
          </div>
          <p
            className="mt-5 max-w-xl text-base sm:text-lg"
            style={{ color: "oklch(0.94 0.005 90)" }}
          >
            <span style={{ color: KADRIA_GREEN, fontWeight: 500 }}>Kadria</span>{" "}
            centralise, qualifie et priorise vos demandes.
          </p>

          {/* Lien visuel vers la section dashboard suivante : faisceau vert
              dégradé vers transparent, discret, sans ajouter d'espace vertical
              significatif (h-10 seulement). */}
          <div
            aria-hidden
            className="mt-4 h-10 w-px"
            style={{
              background: `linear-gradient(to bottom, color-mix(in oklab, ${KADRIA_GREEN} 55%, transparent), transparent)`,
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}
