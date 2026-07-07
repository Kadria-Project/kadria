import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  MessageCircle,
  Phone,
  Wallet,
  Clock,
  MapPin,
  ImageIcon,
  User,
  Heart,
  CheckCircle2,
  FolderCheck,
  ArrowRight,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Stable reduced-motion preference. `useReducedMotion()` reads
   `window.matchMedia` synchronously on the client's first render while
   always returning `null` on the server, which makes the client's
   hydration-matching render diverge from the SSR output. Gate the real
   value behind a mounted flag so server + pre-hydration client render
   agree (false), then pick up the real preference right after mount.
   Same pattern as `useStableReducedMotion()` in LandingHero.tsx.
   ───────────────────────────────────────────── */
function useStableReducedMotion() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? Boolean(prefersReduced) : false;
}

const GREEN = "oklch(0.86 0.19 145)";
const DARK_BG = "oklch(0.16 0.008 260)";
const CARD_BG = "oklch(0.215 0.008 260)";
const CARD_BG_2 = "oklch(0.245 0.008 260)";
const BORDER = "oklch(1 0 0 / 0.09)";
const BORDER_STRONG = "oklch(1 0 0 / 0.16)";
const TEXT = "oklch(0.96 0.005 90)";
const TEXT_MUTED = "oklch(0.7 0.01 260)";
const TEXT_DIM = "oklch(0.55 0.01 260)";
const ORANGE = "oklch(0.82 0.16 65)";

const COLLECTED_ITEMS = [
  { icon: <FolderCheck size={13} />, label: "Projet / Besoin" },
  { icon: <Wallet size={13} />, label: "Budget estimé" },
  { icon: <Clock size={13} />, label: "Urgence / Délai" },
  { icon: <MapPin size={13} />, label: "Localisation" },
  { icon: <ImageIcon size={13} />, label: "Photos" },
  { icon: <User size={13} />, label: "Coordonnées" },
  { icon: <Heart size={13} />, label: "Préférences client" },
];

const BENEFITS = [
  {
    title: "Informations essentielles collectées",
    body: "Budget, urgence, localisation, photos, besoin et contacts sont récupérés avant votre premier rappel.",
  },
  {
    title: "Dossier exploitable en un coup d'œil",
    body: "Vous savez immédiatement de quoi il s'agit, où intervenir et si l'opportunité mérite d'être priorisée.",
  },
  {
    title: "Prochaine action clairement identifiée",
    body: "Kadria vous indique si vous devez rappeler, chiffrer, demander une précision ou planifier une visite.",
  },
];

function ChatAssistantCard({ reduce }: { reduce: boolean }) {
  const chips = ["Type de projet", "Localisation", "Photos", "Délai"];
  return (
    <div
      className="relative overflow-hidden rounded-xl p-5 backdrop-blur-sm"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 1px 0 0 oklch(1 0 0 / 0.04) inset, 0 20px 40px -25px oklch(0 0 0 / 0.6)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 15%, transparent)`, color: GREEN }}
          >
            <MessageCircle size={15} />
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: TEXT }}>
              Assistant chat
            </p>
            <p className="text-[11px]" style={{ color: TEXT_DIM }}>
              LM Elec ⚡ · Site web
            </p>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium"
          style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 14%, transparent)`, color: GREEN }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GREEN }} />
          En ligne
        </span>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed" style={{ color: TEXT_MUTED }}>
        Qualifie les demandes écrites depuis votre site, votre lien projet ou votre widget.
      </p>

      <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>
        <span>Étape 2 sur 4 — Besoin &amp; Projet</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "oklch(1 0 0 / 0.08)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: GREEN }}
          initial={reduce ? false : { width: "0%" }}
          whileInView={{ width: "50%" }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="max-w-[85%] rounded-lg rounded-tl-sm px-3 py-2 text-[12.5px] leading-relaxed" style={{ backgroundColor: CARD_BG_2, color: TEXT }}>
          Bonjour, je suis l&apos;assistant Kadria 👋 Pour commencer, quel type de travaux souhaitez-vous réaliser&nbsp;?
        </div>
        <div
          className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm px-3 py-2 text-[12.5px] leading-relaxed"
          style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 16%, transparent)`, color: TEXT }}
        >
          Je souhaite refaire ma salle de bain rapidement. J&apos;ai quelques photos et je suis sur Rouen.
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-full px-2 py-1 text-[10px] font-medium"
            style={{ backgroundColor: "oklch(1 0 0 / 0.06)", color: TEXT_MUTED, border: `1px solid ${BORDER}` }}
          >
            ✓ {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function VoiceAssistantCard({ reduce }: { reduce: boolean }) {
  const bars = [6, 12, 8, 16, 10, 14, 7, 11];
  return (
    <div
      className="relative overflow-hidden rounded-xl p-5 backdrop-blur-sm"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 1px 0 0 oklch(1 0 0 / 0.04) inset, 0 20px 40px -25px oklch(0 0 0 / 0.6)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 15%, transparent)`, color: GREEN }}
          >
            <Phone size={15} />
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: TEXT }}>
              Assistant vocal
            </p>
            <p className="text-[11px]" style={{ color: TEXT_DIM }}>
              LM Elec ⚡ · En appel
            </p>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium"
          style={{ backgroundColor: `color-mix(in oklab, ${ORANGE} 16%, transparent)`, color: ORANGE }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ORANGE }} />
          En direct
        </span>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed" style={{ color: TEXT_MUTED }}>
        Répond aux appels entrants et qualifie les prospects par téléphone.
      </p>

      <div
        className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5"
        style={{ backgroundColor: CARD_BG_2, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-end gap-[3px]" aria-hidden>
          {bars.map((h, i) =>
            reduce ? (
              <span key={i} className="w-[3px] rounded-full" style={{ height: h, backgroundColor: GREEN, opacity: 0.7 }} />
            ) : (
              <motion.span
                key={i}
                className="w-[3px] rounded-full"
                style={{ backgroundColor: GREEN }}
                animate={{ height: [h * 0.4, h, h * 0.5, h * 0.9, h * 0.4] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }}
              />
            ),
          )}
        </div>
        <span className="text-xs font-medium tabular-nums" style={{ color: TEXT }}>
          00:47
        </span>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: TEXT }}>
        <span style={{ color: TEXT_DIM }}>Client&nbsp;: </span>
        Bonjour, je cherche un électricien pour mettre aux normes mon tableau électrique dans un appartement. Idéalement assez rapidement.
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: GREEN }}>
          <CheckCircle2 size={13} />
          Dossier créé automatiquement
        </span>
        <span
          className="rounded-full px-2 py-1 text-[10px] font-semibold"
          style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 16%, transparent)`, color: GREEN }}
        >
          Score : 91 %
        </span>
      </div>
    </div>
  );
}

function CollectedInfoChecklist({ reduce }: { reduce: boolean }) {
  return (
    <div
      className="relative rounded-xl p-5"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>
        Informations collectées en amont
      </p>

      <ul className="mt-4 space-y-2.5">
        {COLLECTED_ITEMS.map((item, i) => (
          <motion.li
            key={item.label}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, ease: "easeOut", delay: reduce ? 0 : 0.08 * i }}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5"
            style={{ backgroundColor: "oklch(1 0 0 / 0.03)" }}
          >
            <span style={{ color: TEXT_MUTED }}>{item.icon}</span>
            <span className="flex-1 text-[12.5px]" style={{ color: TEXT }}>
              {item.label}
            </span>
            <CheckCircle2 size={14} style={{ color: GREEN }} />
          </motion.li>
        ))}
      </ul>

      <div
        className="mt-4 rounded-lg px-3 py-2.5"
        style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 8%, transparent)`, border: `1px solid color-mix(in oklab, ${GREEN} 22%, transparent)` }}
      >
        <p className="text-[12px] font-medium" style={{ color: GREEN }}>
          Kadria structure et priorise
        </p>
        <p className="mt-0.5 text-[11.5px]" style={{ color: TEXT_MUTED }}>
          Dossier prêt à traiter, sans aller-retour inutile.
        </p>
      </div>
    </div>
  );
}

function DossierCard({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: "easeOut", delay: reduce ? 0 : 0.35 }}
      className="relative overflow-hidden rounded-xl p-5 backdrop-blur-sm"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid color-mix(in oklab, ${GREEN} 30%, transparent)`,
        boxShadow: `0 0 0 1px color-mix(in oklab, ${GREEN} 10%, transparent), 0 0 60px -20px color-mix(in oklab, ${GREEN} 35%, transparent), 0 20px 40px -25px oklch(0 0 0 / 0.6)`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: TEXT }}>
            Dossier prêt à traiter
          </p>
          <p className="text-[11px]" style={{ color: TEXT_DIM }}>
            Fiche projet · #LM-2481
          </p>
        </div>
        <motion.span
          className="rounded-full px-2 py-1 text-[10px] font-semibold"
          style={{ backgroundColor: `color-mix(in oklab, ${ORANGE} 18%, transparent)`, color: ORANGE }}
          initial={reduce ? false : { opacity: 0 }}
          whileInView={
            reduce
              ? { opacity: 1 }
              : { opacity: 1, boxShadow: ["0 0 0 0 transparent", `0 0 14px 2px color-mix(in oklab, ${ORANGE} 55%, transparent)`, "0 0 0 0 transparent"] }
          }
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1.6, ease: "easeOut", delay: reduce ? 0 : 0.6 }}
        >
          Prospect chaud
        </motion.span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12px]">
        <div>
          <dt style={{ color: TEXT_DIM }}>Projet</dt>
          <dd style={{ color: TEXT }}>Rénovation salle de bain</dd>
        </div>
        <div>
          <dt style={{ color: TEXT_DIM }}>Localisation</dt>
          <dd style={{ color: TEXT }}>Rouen (76)</dd>
        </div>
        <div>
          <dt style={{ color: TEXT_DIM }}>Budget estimé</dt>
          <dd style={{ color: TEXT }}>4 500 €</dd>
        </div>
        <div>
          <dt style={{ color: TEXT_DIM }}>Urgence</dt>
          <dd style={{ color: TEXT }}>Élevée</dd>
        </div>
        <div>
          <dt style={{ color: TEXT_DIM }}>Délai souhaité</dt>
          <dd style={{ color: TEXT }}>Rapidement</dd>
        </div>
        <div>
          <dt style={{ color: TEXT_DIM }}>Photos</dt>
          <dd style={{ color: TEXT }}>3 ajoutées</dd>
        </div>
      </dl>

      <div className="mt-3 flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-9 w-12 rounded-md"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${GREEN} ${14 + i * 4}%, transparent), oklch(1 0 0 / 0.04))`,
              border: `1px solid ${BORDER}`,
            }}
          />
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px]" style={{ color: TEXT_DIM }}>
          <span>Complétude</span>
          <span style={{ color: TEXT }}>86 %</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "oklch(1 0 0 / 0.08)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: GREEN }}
            initial={reduce ? false : { width: "0%" }}
            whileInView={{ width: "86%" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, ease: "easeOut", delay: reduce ? 0 : 0.5 }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
            style={{ border: `2px solid ${GREEN}`, color: GREEN }}
          >
            88
          </div>
          <div>
            <p className="text-[11px]" style={{ color: TEXT_DIM }}>
              Score commercial
            </p>
            <p className="text-[12px] font-medium" style={{ color: TEXT }}>
              88/100
            </p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors"
          style={{ border: `1px solid ${BORDER_STRONG}`, color: TEXT_MUTED }}
        >
          Voir le dossier
        </button>
      </div>

      <div
        className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 10%, transparent)` }}
      >
        <ArrowRight size={13} style={{ color: GREEN, flexShrink: 0 }} />
        <p className="text-[11px] leading-snug" style={{ color: TEXT }}>
          Action recommandée : <span style={{ color: GREEN, fontWeight: 600 }}>Rappeler aujourd&apos;hui</span>
        </p>
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
        Toutes les informations essentielles sont déjà collectées. Vous pouvez chiffrer, planifier ou rappeler sans perdre de temps.
      </p>
    </motion.div>
  );
}

export default function RequestTransformationSection() {
  const reduce = useStableReducedMotion();

  const fadeUp = reduce
    ? { initial: false, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.6, ease: "easeOut" as const },
      };

  return (
    <section
      style={{ backgroundColor: DARK_BG, color: TEXT }}
      className="relative overflow-hidden py-16 sm:py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.05) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(closest-side, color-mix(in oklab, ${GREEN} 16%, transparent), transparent 70%)`,
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{
              color: GREEN,
              backgroundColor: `color-mix(in oklab, ${GREEN} 12%, transparent)`,
              border: `1px solid color-mix(in oklab, ${GREEN} 30%, transparent)`,
            }}
          >
            Demande transformée
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-[-0.02em] sm:text-4xl md:text-5xl">
            Chaque demande devient un{" "}
            <span style={{ color: GREEN }}>dossier clair, complet et exploitable.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg" style={{ color: TEXT_MUTED }}>
            Qu&apos;elle arrive par chat ou par téléphone, Kadria collecte les informations essentielles en
            amont pour créer un dossier projet prêt à traiter, sans repartir de zéro.
          </p>
        </motion.div>

        {/* ── Desktop : 3 zones côte à côte ── */}
        <div className="mt-12 hidden gap-6 lg:grid lg:grid-cols-[1fr_0.85fr_1fr] lg:items-start">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="space-y-5"
          >
            <ChatAssistantCard reduce={reduce} />
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, ease: "easeOut", delay: reduce ? 0 : 0.15 }}
            >
              <VoiceAssistantCard reduce={reduce} />
            </motion.div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: "easeOut", delay: reduce ? 0 : 0.2 }}
            className="lg:mt-8"
          >
            <CollectedInfoChecklist reduce={reduce} />
          </motion.div>

          <DossierCard reduce={reduce} />
        </div>

        {/* ── Mobile / tablette : version dédiée empilée ── */}
        <div className="mt-10 flex flex-col gap-5 lg:hidden">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <ChatAssistantCard reduce={reduce} />
          </motion.div>

          <div aria-hidden className="mx-auto h-6 w-px" style={{ background: `linear-gradient(to bottom, transparent, color-mix(in oklab, ${GREEN} 55%, transparent))` }} />

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: reduce ? 0 : 0.1 }}
          >
            <VoiceAssistantCard reduce={reduce} />
          </motion.div>

          <div aria-hidden className="mx-auto h-6 w-px" style={{ background: `linear-gradient(to bottom, color-mix(in oklab, ${GREEN} 55%, transparent), color-mix(in oklab, ${GREEN} 55%, transparent))` }} />

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: reduce ? 0 : 0.15 }}
          >
            <CollectedInfoChecklist reduce={reduce} />
          </motion.div>

          <div aria-hidden className="mx-auto h-6 w-px" style={{ background: `linear-gradient(to bottom, color-mix(in oklab, ${GREEN} 55%, transparent), transparent)` }} />

          <DossierCard reduce={reduce} />
        </div>

        {/* ── Bénéfices clés ── */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: reduce ? 0 : 0.1 * i }}
              className="rounded-xl p-5"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `color-mix(in oklab, ${GREEN} 15%, transparent)`, color: GREEN }}
              >
                <CheckCircle2 size={15} />
              </span>
              <p className="mt-3 text-sm font-semibold" style={{ color: TEXT }}>
                {b.title}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
                {b.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
