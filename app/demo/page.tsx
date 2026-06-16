'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MapPin,
  MessageCircle,
} from 'lucide-react';
import { DarkNav } from '@/src/components/DarkNav';
import { useScrollReveal, ANIMATION_STYLES } from '@/src/components/KadriaPages';
import ChatWidgetInline from '@/src/components/chat/ChatWidgetInline';

const DEMO_STEPS = [
  {
    number: '01',
    title: 'Prospect',
    subtitle: 'Le visiteur pose sa demande',
    icon: MessageCircle,
  },
  {
    number: '02',
    title: 'Qualification',
    subtitle: 'Kadria structure le dossier',
    icon: ClipboardCheck,
  },
  {
    number: '03',
    title: 'Artisan',
    subtitle: 'Le dossier arrive dans le dashboard',
    icon: LayoutDashboard,
  },
  {
    number: '04',
    title: 'Dashboard',
    subtitle: 'Le commercial priorise',
    icon: LayoutDashboard,
  },
  {
    number: '05',
    title: 'Devis',
    subtitle: 'Le chantier devient chiffrable',
    icon: FileText,
  },
] as const;

const DASHBOARD_ITEMS = [
  {
    id: 'DOS-2026-018',
    title: 'Renovation salle de bain',
    client: 'Marie Leroy',
    score: '92',
    status: 'Nouveau',
    budget: '8 000 - 12 000 EUR',
    action: 'Appeler aujourd hui',
    highlight: true,
  },
  {
    id: 'DOS-2026-017',
    title: 'Terrasse bois',
    client: 'Nicolas Martin',
    score: '84',
    status: 'Qualifie',
    budget: '6 500 EUR',
    action: 'Verifier les photos',
    highlight: false,
  },
  {
    id: 'DOS-2026-014',
    title: 'Cloture jardin',
    client: 'Sophie Bernard',
    score: '71',
    status: 'A estimer',
    budget: '3 200 EUR',
    action: 'Planifier un rappel',
    highlight: false,
  },
] as const;

export default function DemoPage() {
  useScrollReveal();

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white">
      <style>{ANIMATION_STYLES}</style>

      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(34,197,94,0.05)_0%,transparent_60%)]" />

      <DarkNav />

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-[100px]">
        <section className="kr-reveal kr-visible pb-12 text-center">
          <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
            Demo guidee
          </span>
          <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-bold leading-[0.95] tracking-tight md:text-6xl">
            Testez Kadria comme un prospect
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-zinc-400">
            En moins de 90 secondes, suivez le parcours complet d&apos;une demande :
            conversation, qualification, dossier, dashboard et devis.
          </p>
        </section>

        <section className="kr-reveal border-t border-zinc-800 py-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {DEMO_STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-4 transition-colors hover:border-green-500/20"
                  style={{ transitionDelay: `${index * 70}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/[0.08] text-green-500">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-500">
                        {step.number}
                      </p>
                      <p className="text-base font-semibold text-white">{step.title}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{step.subtitle}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 border-t border-zinc-800 py-12 lg:grid-cols-[1fr_1fr]">
          <div className="kr-reveal overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-900/80">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-800/40 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
                  Etape 1
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  Testez le vrai assistant cote prospect
                </p>
              </div>
              <span className="rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold text-green-500">
                Assistant reel
              </span>
            </div>
            <div className="border-b border-zinc-800 bg-zinc-800/30 px-5 py-3">
              <p className="text-sm font-medium text-white">
                Ici, vous pouvez vraiment parler avec l&apos;assistant comme un prospect ou un client.
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Ce n&apos;est pas une capture: testez les questions, les reponses et le parcours de qualification en direct.
              </p>
            </div>
            <div className="p-5">
              <ChatWidgetInline artisanId="Artisan_demo" />
            </div>
          </div>

          <div className="kr-reveal space-y-6">
            <div className="rounded-[24px] border border-zinc-800 bg-zinc-900/70 p-6 lg:min-h-[820px]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
                    Etape 2
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Le dossier se cree automatiquement
                  </h2>
                </div>
                <span className="rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold text-green-500">
                  Qualifie
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/90">
                <div className="flex flex-col gap-4 border-b border-zinc-800 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">Analyse Kadria</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Le dossier est structure et priorise des le premier echange.
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-sm font-semibold text-green-500">
                    Prospect chaud - Score 92
                  </span>
                </div>

                <div className="grid border-b border-zinc-800 sm:grid-cols-2 xl:grid-cols-4">
                  <SignalCell
                    title="Budget coherent"
                    value="8 000 - 12 000 EUR"
                    status="ok"
                  />
                  <SignalCell title="Delai realiste" value="Sous 1 mois" status="ok" />
                  <SignalCell title="Contact verifie" value="Telephone + email" status="ok" />
                  <SignalCell title="Photos jointes" value="3 photos recues" status="ok" />
                </div>

                <div className="border-b border-zinc-800 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
                    Resume du projet
                  </p>
                  <div className="mt-4 space-y-3">
                    <LargeInfoRow label="Le projet" value="Renovation salle de bain - appartement 78m2" />
                    <LargeInfoRow label="L enjeu" value="8 000 - 12 000 EUR - Sous 1 mois" />
                    <LargeInfoRow label="Priorite" value="Prospect chaud" accent />
                    <LargeInfoRow label="Zone" value="Lyon 3e et alentours" />
                  </div>
                </div>

                <div className="border-b border-zinc-800 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
                    Synthese IA
                  </p>
                  <p className="mt-4 text-base leading-8 text-zinc-200">
                    Projet pret a etre rappele rapidement. Besoin clair, budget coherent avec la
                    prestation, delai court et cliente disponible pour transmettre les derniers
                    details avant chiffrage.
                  </p>
                </div>

                <div className="bg-green-500/[0.06] px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
                    Recommandation Kadria
                  </p>
                  <p className="mt-3 text-base leading-7 text-zinc-100">
                    Contactez ce prospect sous 24h pour proposer une visite technique. Toutes les
                    informations utiles sont deja centralisees pour preparer le devis.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="kr-reveal border-t border-zinc-800 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
                Etape 3
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-5xl">
                Cote artisan : tout arrive dans votre dashboard
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-zinc-400">
                Chaque demande qualifiee est automatiquement centralisee, priorisee et prete a etre
                traitee.
              </p>
            </div>

            <div className="mt-8 overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-900/75 shadow-[0_0_0_1px_rgba(34,197,94,0.04)]">
              <div className="border-b border-zinc-800 bg-zinc-800/35 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Dashboard Kadria</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Les demandes qualifiees apparaissent aussitot cote artisan.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold text-green-500">
                      3 nouveaux dossiers
                    </span>
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                      1 a rappeler
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="border-b border-zinc-800 p-4 lg:border-b-0 lg:border-r">
                  <div className="space-y-3">
                    {DASHBOARD_ITEMS.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 transition-colors ${
                          item.highlight
                            ? 'border-green-500/25 bg-green-500/[0.06]'
                            : 'border-zinc-800 bg-zinc-950/70'
                        }`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-white">{item.title}</p>
                              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                                {item.id}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-zinc-400">{item.client}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-green-500/[0.12] px-3 py-1 text-xs font-semibold text-green-500">
                              Score {item.score}
                            </span>
                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                              {item.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <DashboardMeta label="Budget estime" value={item.budget} />
                          <DashboardMeta label="Action recommandee" value={item.action} />
                          <DashboardMeta
                            label="Priorite"
                            value={item.highlight ? 'A rappeler' : 'A planifier'}
                            accent={item.highlight}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-950/80 p-4">
                  <div className="rounded-[24px] border border-zinc-800 bg-zinc-900/75 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-500">
                          Dossier selectionne
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          Renovation salle de bain
                        </p>
                      </div>
                      <span className="rounded-full bg-green-500/[0.12] px-3 py-1 text-sm font-semibold text-green-500">
                        A rappeler
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      <PreviewRow label="Client" value="Marie Leroy" />
                      <PreviewRow label="Statut du projet" value="Pret a etre chiffre" />
                      <PreviewRow label="Budget estime" value="8 000 - 12 000 EUR" />
                      <PreviewRow label="Delai souhaite" value="Sous 1 mois" />
                      <PreviewRow label="Prochaine action" value="Rappel prioritaire" />
                    </div>

                    <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Ce que voit l artisan
                      </p>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        Le prospect a deja ete qualifie, les informations sont centralisees et
                        Kadria indique clairement quoi traiter en premier avant de creer le devis.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/demo-dashboard"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-green-500/30 bg-green-500/[0.08] px-5 py-3 text-sm font-semibold text-white transition-all duration-150 hover:scale-[1.02] hover:border-green-500/50 hover:bg-green-500/[0.12]"
              >
                Voir le dashboard complet <ArrowRight size={16} className="text-green-500" />
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 border-t border-zinc-800 py-12 lg:grid-cols-2">
          <div className="kr-reveal rounded-[24px] border border-zinc-800 bg-zinc-900/70 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
                  Etape 4
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Le dashboard aide a prioriser
                </h2>
              </div>
              <LayoutDashboard size={18} className="text-green-500" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <PipelineColumn
                title="Nouveau"
                amount="3"
                items={['Salle de bain - Lyon', 'Cloture - Rouen']}
              />
              <PipelineColumn
                title="Qualifie"
                amount="2"
                accent
                items={['Terrasse - Nantes', 'Electricite - Paris']}
              />
              <PipelineColumn title="Devis" amount="1" items={['Cuisine - Bordeaux']} />
            </div>

            <p className="mt-5 text-sm leading-6 text-zinc-400">
              Le commercial voit immediatement quoi rappeler, quoi chiffrer et quelles
              opportunites traiter en priorite.
            </p>
          </div>

          <div className="kr-reveal rounded-[24px] border border-zinc-800 bg-zinc-900/70 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
                  Etape 5
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Le devis est pret a etre envoye
                </h2>
              </div>
              <FileText size={18} className="text-green-500" />
            </div>

            <div className="mt-5 rounded-[22px] border border-zinc-800 bg-zinc-950/80 p-5">
              <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <p className="text-lg font-semibold text-white">DEV-2026-001</p>
                  <p className="mt-1 text-sm text-zinc-400">Objet : renovation salle de bain</p>
                </div>
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                  PDF
                </span>
              </div>

              <div className="space-y-3 py-4">
                <PreviewRow label="Client" value="Marie Leroy" />
                <PreviewRow
                  label="Localisation"
                  value="Lyon 3e"
                  icon={<MapPin size={14} className="text-zinc-500" />}
                />
                <PreviewRow label="Montant estime" value="9 840 EUR TTC" />
                <PreviewRow label="Validite" value="90 jours" />
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Contenu du devis
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Prestations, montant, PDF genere et pret a etre envoye au client depuis
                  Kadria.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="kr-reveal border-t border-zinc-800 py-12">
          <div className="mx-auto max-w-3xl rounded-[28px] border border-zinc-800 bg-zinc-900/80 px-6 py-8 text-center md:px-10">
            <SectionBadge text="Fin du parcours" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
              Passez du prospect au devis sans perdre le fil
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Reservez une demo pour voir comment Kadria peut s&apos;adapter a votre activite,
              ou testez la plateforme gratuitement.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/demo-request"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-green-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition-transform duration-150 hover:scale-[1.02]"
              >
                Reserver une demo <ArrowRight size={16} />
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-green-500/30 hover:bg-white/[0.03]"
              >
                Essai gratuit
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-400">
          (c) 2025 Kadria -{' '}
          <Link href="/" className="text-zinc-400 transition-colors duration-150 hover:text-white">
            Retour a l&apos;accueil
          </Link>
        </footer>
      </main>
    </div>
  );
}

function SectionBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
      {text}
    </span>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function SignalCell({
  title,
  value,
  status,
}: {
  title: string;
  value: string;
  status: 'ok' | 'warning';
}) {
  return (
    <div className="border-b border-zinc-800 px-5 py-4 sm:border-r sm:last:border-r-0 xl:border-b-0">
      <p className={`text-sm font-semibold ${status === 'ok' ? 'text-white' : 'text-amber-300'}`}>
        {status === 'ok' ? '✓' : '!'} {title}
      </p>
      <p className="mt-2 text-sm text-zinc-400">{value}</p>
    </div>
  );
}

function LargeInfoRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr] sm:items-start">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`text-base font-medium ${accent ? 'text-green-500' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function PipelineColumn({
  title,
  amount,
  items,
  accent = false,
}: {
  title: string;
  amount: string;
  items: string[];
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent ? 'border-green-500/30 bg-green-500/[0.05]' : 'border-zinc-800 bg-zinc-950/80'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-sm font-semibold ${accent ? 'text-green-500' : 'text-white'}`}>
          {title}
        </p>
        <span className="text-xs text-zinc-500">{amount}</span>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-300"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardMeta({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className={`mt-2 text-sm font-medium ${accent ? 'text-green-500' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
