'use client';

import { useMemo } from 'react';
import { formatCurrency, type Project } from '@/src/lib/dashboard/project-presentation';
import { normalizeValueSource } from '@/src/lib/dashboard/value-source';

const cardBase: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '14px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text-2)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '10px',
};

type StatEntry = {
  key: string;
  label: string;
  value: string;
  visible: boolean;
};

function StatGrid({ entries }: { entries: StatEntry[] }) {
  const visible = entries.filter((e) => e.visible);
  if (visible.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      {visible.map((entry) => (
        <div key={entry.key} style={{ ...cardBase, padding: '10px 12px' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)' }}>{entry.value}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>{entry.label}</div>
        </div>
      ))}
    </div>
  );
}

export interface MobileValueReportViewProps {
  projects: Project[];
  topOpportunities: Project[];
  hotLeads: Project[];
  valueCaEnCours: number;
  valueCaGagne: number;
  valueDevisEnvoyesCount: number;
  valueDevisAcceptesCount: number;
  valueTauxConversion: number | null;
  qualifiedValueCount: number;
  preparedQuotesValueCount: number;
  handledFollowUpsValueCount: number;
  estimatedHoursSaved: number;
  estimatedRemMinutesSaved: number;
}

export default function MobileValueReportView({
  projects,
  topOpportunities,
  hotLeads,
  valueCaEnCours,
  valueCaGagne,
  valueDevisEnvoyesCount,
  valueDevisAcceptesCount,
  valueTauxConversion,
  qualifiedValueCount,
  preparedQuotesValueCount,
  handledFollowUpsValueCount,
  estimatedHoursSaved,
  estimatedRemMinutesSaved,
}: MobileValueReportViewProps) {
  const dossiersCreesCount = projects.length;

  // CA gagné / panier moyen : seulement si honnêtement dérivable (dossiers
  // réellement "Gagné", montant réel devisAmount/budget). Pas d'invention.
  const wonProjects = useMemo(() => projects.filter((p) => p.status === 'Gagné'), [projects]);
  const hasCaGagne = valueCaGagne > 0 || wonProjects.length > 0;
  const panierMoyen = wonProjects.length > 0 ? valueCaGagne / wonProjects.length : null;

  // Origine des dossiers : Chat / Site / Téléphone / Autres, dérivée de
  // normalizeValueSource() — même logique que le filtre Source du cockpit.
  const sourceBreakdown = useMemo(() => {
    let chat = 0;
    let site = 0;
    let telephone = 0;
    let autres = 0;
    projects.forEach((p) => {
      const normalized = normalizeValueSource(p.source);
      const raw = (p.source || '').toLowerCase();
      if (normalized === 'voice') telephone += 1;
      else if (normalized === 'web') {
        if (raw.includes('chat')) chat += 1;
        else site += 1;
      } else {
        autres += 1;
      }
    });
    return { chat, site, telephone, autres };
  }, [projects]);

  const demandesWeb = sourceBreakdown.chat + sourceBreakdown.site;
  const demandesVocales = sourceBreakdown.telephone;
  const appelsPris = sourceBreakdown.telephone;

  // Performance commerciale : statuts réels du pipeline (cf. STATUS_OPTIONS /
  // getDevisStatus dans MobileDevisView.tsx) — pas de statut inventé.
  const devisAcceptesCount = useMemo(
    () => projects.filter((p) => p.status === 'Gagné' || Boolean(p.acceptedAt)).length,
    [projects],
  );
  const devisRefusesCount = useMemo(() => projects.filter((p) => p.status === 'Perdu').length, [projects]);
  const relancesEffectueesCount = useMemo(() => projects.filter((p) => p.lastFollowUpAt).length, [projects]);
  const dossiersGagnesCount = useMemo(() => projects.filter((p) => p.status === 'Gagné').length, [projects]);
  const dossiersPerdusCount = useMemo(() => projects.filter((p) => p.status === 'Perdu').length, [projects]);

  const overviewStats: StatEntry[] = [
    { key: 'dossiers', label: 'Dossiers créés', value: String(dossiersCreesCount), visible: true },
    { key: 'devis', label: 'Devis envoyés', value: String(valueDevisEnvoyesCount), visible: true },
    { key: 'gagnes', label: 'Chantiers gagnés', value: String(valueDevisAcceptesCount), visible: true },
    {
      key: 'conversion',
      label: 'Taux de conversion',
      value: valueTauxConversion !== null ? `${valueTauxConversion.toFixed(1)}%` : '—',
      visible: valueTauxConversion !== null,
    },
  ];

  const revenueStats: StatEntry[] = [
    { key: 'ca-potentiel', label: 'CA potentiel', value: formatCurrency(valueCaEnCours), visible: true },
    { key: 'ca-gagne', label: 'CA gagné', value: formatCurrency(valueCaGagne), visible: hasCaGagne },
    {
      key: 'panier-moyen',
      label: 'Panier moyen',
      value: panierMoyen !== null ? formatCurrency(panierMoyen) : '—',
      visible: panierMoyen !== null,
    },
  ];

  const opportunityStats: StatEntry[] = [
    { key: 'appels', label: 'Appels pris', value: String(appelsPris), visible: true },
    { key: 'prospects', label: 'Prospects qualifiés', value: String(topOpportunities.length), visible: true },
    { key: 'demandes-web', label: 'Demandes web', value: String(demandesWeb), visible: true },
    { key: 'demandes-vocales', label: 'Demandes vocales', value: String(demandesVocales), visible: true },
  ];

  const sourceStats: StatEntry[] = [
    { key: 'chat', label: 'Chat', value: String(sourceBreakdown.chat), visible: sourceBreakdown.chat > 0 },
    { key: 'site', label: 'Site', value: String(sourceBreakdown.site), visible: sourceBreakdown.site > 0 },
    { key: 'telephone', label: 'Téléphone', value: String(sourceBreakdown.telephone), visible: sourceBreakdown.telephone > 0 },
    { key: 'autres', label: 'Autres', value: String(sourceBreakdown.autres), visible: sourceBreakdown.autres > 0 },
  ];

  const commercialStats: StatEntry[] = [
    { key: 'acceptes', label: 'Devis acceptés', value: String(devisAcceptesCount), visible: true },
    { key: 'refuses', label: 'Devis refusés', value: String(devisRefusesCount), visible: true },
    { key: 'relances', label: 'Relances effectuées', value: String(relancesEffectueesCount), visible: true },
    { key: 'gagnes2', label: 'Dossiers gagnés', value: String(dossiersGagnesCount), visible: true },
    { key: 'perdus', label: 'Dossiers perdus', value: String(dossiersPerdusCount), visible: true },
  ];

  const summaryLines: string[] = [
    `${dossiersCreesCount} dossiers créés`,
    `${valueDevisEnvoyesCount} devis envoyés`,
    `${topOpportunities.length} prospects qualifiés`,
    `${estimatedHoursSaved} heures économisées`,
  ];
  if (hasCaGagne) {
    summaryLines.push(`${formatCurrency(valueCaGagne)} de chiffre d'affaires gagné`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '76px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>⭐ Valeur générée</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '4px 0 0' }}>
          ROI, conversions et temps gagné
        </p>
      </div>

      <div>
        <div style={sectionTitle}>Vue d&apos;ensemble</div>
        <StatGrid entries={overviewStats} />
      </div>

      {revenueStats.some((s) => s.visible) && (
        <div>
          <div style={sectionTitle}>Chiffre d&apos;affaires</div>
          <StatGrid entries={revenueStats} />
        </div>
      )}

      <div>
        <div style={sectionTitle}>Temps économisé</div>
        <div style={cardBase}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)' }}>
            {estimatedHoursSaved} heure{estimatedHoursSaved > 1 ? 's' : ''} économisée{estimatedHoursSaved > 1 ? 's' : ''}
            {estimatedRemMinutesSaved > 0 ? ` ${estimatedRemMinutesSaved} min` : ''}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
            Temps que vous avez pu consacrer à vos chantiers.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px', fontSize: '12px', color: 'var(--text-3)' }}>
            <p style={{ margin: 0 }}>Qualification automatique : {qualifiedValueCount * 8} min ({qualifiedValueCount} dossier(s))</p>
            <p style={{ margin: 0 }}>Devis préparés : {preparedQuotesValueCount * 5} min ({preparedQuotesValueCount} devis)</p>
            <p style={{ margin: 0 }}>Relances suivies : {handledFollowUpsValueCount * 5} min ({handledFollowUpsValueCount} relance(s))</p>
          </div>
        </div>
      </div>

      <div>
        <div style={sectionTitle}>Opportunités récupérées</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <StatGrid entries={opportunityStats} />
          {sourceStats.some((s) => s.visible) && (
            <>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>Origine des dossiers</div>
              <StatGrid entries={sourceStats} />
            </>
          )}
        </div>
      </div>

      <div>
        <div style={sectionTitle}>Performance commerciale</div>
        <StatGrid entries={commercialStats} />
      </div>

      <div>
        <div style={sectionTitle}>Résumé Kadria</div>
        <div style={{ ...cardBase, background: 'var(--bg-hover)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {summaryLines.map((line) => (
              <div key={line} style={{ fontSize: '14px', color: 'var(--text-1)', fontWeight: 600 }}>
                ✔ {line}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '14px', fontStyle: 'italic' }}>
            Chaque demande mérite une réponse. Chaque réponse mérite un chantier.
          </div>
        </div>
      </div>
    </div>
  );
}
