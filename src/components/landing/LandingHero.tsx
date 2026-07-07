/**
 * LandingHero.tsx — Hero isolé Kadria (version validée Lovable)
 *
 * Dépendances :
 *  - react
 *  - motion            (framer-motion / motion — si non installé : `npm i motion` OU adapte les imports vers "framer-motion")
 *  - lucide-react
 *  - tailwindcss       (v3 ou v4, aucune classe custom projet requise)
 *
 * ⚠️ Aucune classe "bg-kadria / text-kadria / border-border-strong / bg-surface / grid-noise"
 *    n'est utilisée ici. Le vert de marque et le fond dark sont inlinés via style={{...}}
 *    pour rester 100% portable dans ton repo sans toucher à ta config Tailwind.
 *
 * Intégration :
 *  1. Copie ce fichier dans ton projet (ex: src/components/landing/LandingHero.tsx).
 *  2. Dans ton fichier de landing actuel, remplace UNIQUEMENT le composant Hero
 *     existant par <LandingHero />. Ne touche à rien d'autre.
 *  3. Si ton Nav/Header est un composant séparé rendu au-dessus du Hero,
 *     LAISSE-LE tel quel — ce Hero ne contient PAS le header.
 *     (Passe `withScrollIndicator={false}` si tu veux masquer la flèche.)
 *  4. Adapte les `href="#cta"` vers tes vraies routes/ancres si besoin.
 */

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
// Si ton projet utilise framer-motion à la place :
// import { motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown } from "lucide-react";

/* ─────────────────────────────────────────────
   Stable reduced-motion preference.
   `useReducedMotion()` reads `window.matchMedia` synchronously on the
   client's first render (not gated by `useEffect`), while it always
   returns `null` on the server. For visitors/browsers with
   `prefers-reduced-motion` set (common in headless/CI browsers), this
   makes the client's hydration-matching render diverge from the SSR
   output ("Hydration failed"). Gate the real value behind a mounted
   flag so both the server render and the client's pre-hydration render
   agree (false), then pick up the real preference right after mount.
   ───────────────────────────────────────────── */
function useStableReducedMotion() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? prefersReduced : false;
}

const highlightedText = "à des dossiers prêts à vendre.";
const HIGHLIGHT_CHAR_COUNT = highlightedText.length; // 31
const HIGHLIGHT_START_DELAY = 0.25; // s, après l'apparition de la 1re ligne
const HIGHLIGHT_STAGGER = 0.042; // s par caractère -> ~1.3s pour 31 caractères
const HIGHLIGHT_CHAR_DURATION = 0.32; // s, durée d'apparition de chaque caractère
const HIGHLIGHT_TOTAL_DURATION =
  HIGHLIGHT_STAGGER * (HIGHLIGHT_CHAR_COUNT - 1) + HIGHLIGHT_CHAR_DURATION; // ≈ 1.58s
const UNDERLINE_DELAY = HIGHLIGHT_START_DELAY + HIGHLIGHT_TOTAL_DURATION;
const UNDERLINE_DURATION = 0.5; // s

const KADRIA_GREEN = "oklch(0.86 0.19 145)";
const KADRIA_GREEN_SOFT = "color-mix(in oklab, oklch(0.86 0.19 145) 16%, transparent)";
const KADRIA_GREEN_BORDER = "color-mix(in oklab, oklch(0.86 0.19 145) 50%, transparent)";
const KADRIA_GREEN_BG = "color-mix(in oklab, oklch(0.86 0.19 145) 6%, transparent)";
const BG_DARK = "oklch(0.16 0.01 250)";

type Props = {
  withScrollIndicator?: boolean;
  /** Ancre CTA principale */
  primaryHref?: string;
  /** Ancre CTA secondaire */
  secondaryHref?: string;
};

export default function LandingHero({
  withScrollIndicator = true,
  primaryHref = "#cta",
  secondaryHref = "#cta",
}: Props) {
  const shouldReduce = useStableReducedMotion();

  return (
    <section
      className="relative isolate overflow-hidden text-white"
      style={{ background: BG_DARK }}
    >
      {/* Grille / texture discrète */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 55%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 55%, transparent 85%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-fit max-w-[1440px] flex-col items-center justify-center px-6 pt-16 pb-12 text-center md:pt-[68px] md:pb-16 lg:min-h-screen">
        {/* Halo vert */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[900px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(closest-side, ${KADRIA_GREEN_SOFT}, transparent)`,
          }}
        />

        {/* Badge */}
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-medium"
          style={{
            color: KADRIA_GREEN,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: KADRIA_GREEN_BORDER,
            background: KADRIA_GREEN_BG,
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: KADRIA_GREEN }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: KADRIA_GREEN }}
            />
          </span>
          Assistant commercial 24/7
        </motion.span>

        {/* Titre */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.05, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-5 max-w-5xl text-balance text-[38px] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[56px] md:text-[72px] lg:text-[80px]"
        >
          Passez du chaos commercial
          <br />
          <span className="relative inline-block" style={{ color: KADRIA_GREEN }}>
            {shouldReduce ? (
              <span aria-label={highlightedText}>{highlightedText}</span>
            ) : (
              <motion.span
                aria-label={highlightedText}
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      delayChildren: HIGHLIGHT_START_DELAY,
                      staggerChildren: HIGHLIGHT_STAGGER,
                    },
                  },
                }}
              >
                {highlightedText.split("").map((char, i) => (
                  <motion.span
                    key={i}
                    aria-hidden="true"
                    style={{ display: "inline-block" }}
                    variants={{
                      hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
                      visible: {
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                        transition: { duration: HIGHLIGHT_CHAR_DURATION },
                      },
                    }}
                  >
                    {char === " " ? " " : char}
                  </motion.span>
                ))}
              </motion.span>
            )}
            <svg
              viewBox="0 0 500 14"
              className="absolute -bottom-2.5 left-0 h-2.5 w-full md:-bottom-3 md:h-3"
              preserveAspectRatio="none"
              aria-hidden
            >
              <motion.path
                d="M4 10 Q 125 2, 250 7 T 496 6"
                stroke={KADRIA_GREEN}
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                initial={shouldReduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={
                  shouldReduce
                    ? { duration: 0 }
                    : {
                        delay: UNDERLINE_DELAY,
                        duration: UNDERLINE_DURATION,
                        ease: "easeInOut",
                      }
                }
              />
            </svg>
          </span>
        </motion.h1>

        {/* Sous-texte */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-7 max-w-2xl text-balance text-[16px] leading-relaxed text-white/70 md:text-[19px]"
        >
          Appels, messages, formulaires, photos et devis à relancer : Kadria remet
          de l'ordre dans votre activité commerciale et vous aide à prioriser les
          bonnes opportunités.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          className="mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-2.5 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:gap-3"
        >
          <a
            href={primaryHref}
            className="group inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-[15px] font-semibold transition hover:brightness-110"
            style={{ background: KADRIA_GREEN, color: "#0b1a10" }}
          >
            Essayer gratuitement
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </a>
          <a
            href={secondaryHref}
            className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-transparent px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/5"
          >
            Demander une démo
          </a>
        </motion.div>

        {/* Garanties */}
        <motion.ul
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-7 flex flex-col items-center gap-1.5 text-[13px] text-white/85 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-2 sm:text-[14px]"
        >
          {[
            "Essai gratuit 7 jours",
            "Mise en service en moins de 10 minutes",
            "Pensé pour les artisans",
          ].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check
                className="h-4 w-4"
                strokeWidth={3}
                style={{ color: KADRIA_GREEN }}
              />
              <span>{t}</span>
            </li>
          ))}
        </motion.ul>

        {/* Scroll indicator */}
        {withScrollIndicator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-9 flex flex-col items-center gap-2"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: KADRIA_GREEN_BORDER,
                background: KADRIA_GREEN_BG,
              }}
            >
              <ChevronDown
                className="h-4 w-4 animate-bounce"
                style={{ color: KADRIA_GREEN }}
              />
            </span>
          </motion.div>
        )}
      </div>
    </section>
  );
}
