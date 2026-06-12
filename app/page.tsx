const statusBadges = [
  { label: "Nouveau", className: "bg-zinc-800 text-zinc-200" },
  { label: "À rappeler", className: "bg-amber-500/20 text-amber-400" },
  { label: "Qualifié", className: "bg-green-500/20 text-green-400" },
  { label: "Devis envoyé", className: "bg-blue-500/20 text-blue-400" },
  { label: "Gagné", className: "bg-green-600/20 text-green-300" },
  { label: "Perdu", className: "bg-red-500/20 text-red-400" },
];

const features = [
  {
    title: "Chat IA 24/7",
    description:
      "Un assistant conversationnel qualifie chaque visiteur de votre site et collecte les informations clés de son projet.",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4-.8L3 20l1.3-3.9A8.97 8.97 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
        />
      </svg>
    ),
  },
  {
    title: "Assistant vocal",
    description:
      "Vos appels sont pris en charge automatiquement, qualifiés et résumés sans intervention humaine.",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 5a2 2 0 0 1 2-2h2.28a1 1 0 0 1 .97.757l1.06 4.24a1 1 0 0 1-.5 1.11l-1.6.8a11.04 11.04 0 0 0 5.88 5.88l.8-1.6a1 1 0 0 1 1.11-.5l4.24 1.06a1 1 0 0 1 .757.97V19a2 2 0 0 1-2 2h-1C9.163 21 3 14.837 3 7V5Z"
        />
      </svg>
    ),
  },
  {
    title: "Dossiers pré-qualifiés",
    description:
      "Chaque lead arrive dans votre tableau de bord avec un résumé IA, un score de complétude et toutes les pièces jointes.",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6M9 8h6M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-950">
      <main className="flex w-full max-w-5xl flex-1 flex-col items-center px-6 py-24 sm:px-10">
        <span className="text-xs font-semibold tracking-widest text-green-500 uppercase">
          Plateforme IA pour artisans du bâtiment
        </span>

        <h1 className="mt-4 max-w-3xl text-center text-[40px] font-bold leading-tight text-white sm:text-[56px]">
          Qualifiez vos{" "}
          <span className="text-green-500">prospects</span>
        </h1>

        <p className="mt-6 max-w-2xl text-center text-sm leading-relaxed text-zinc-400">
          Kadria déploie des assistants IA, par chat et par téléphone, qui
          échangent avec vos prospects et créent automatiquement des dossiers
          pré-qualifiés complets dans votre tableau de bord.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <a
            href="/test-create-project"
            className="rounded-md bg-green-500 px-5 py-2.5 text-center font-semibold text-black transition-colors hover:bg-green-400"
          >
            Commencer
          </a>
          <a
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-zinc-700 bg-transparent px-5 py-2.5 text-center text-white transition-colors hover:bg-zinc-800"
          >
            Documentation
          </a>
        </div>

        <section className="mt-24 w-full">
          <h2 className="text-2xl font-semibold text-white">
            Comment ça fonctionne
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:bg-zinc-800"
              >
                <div className="inline-flex rounded-lg bg-zinc-800 p-2 text-green-500">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 w-full">
          <h2 className="text-2xl font-semibold text-white">
            Suivi des leads
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Chaque prospect est suivi via un statut clair dans votre tableau
            de bord.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {statusBadges.map((badge) => (
              <span
                key={badge.label}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${badge.className}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
