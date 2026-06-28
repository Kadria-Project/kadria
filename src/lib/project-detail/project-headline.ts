// Mots-cles trop generiques pour servir seuls de H1 projet : ils decrivent une
// categorie d'intervention, pas le sujet reel du chantier. Quand un titre
// direct se reduit a l'un de ces mots (+ articles/prepositions), on cherche un
// sujet plus precis dans les autres champs avant de l'utiliser.
export const GENERIC_HEADLINE_WORDS = new Set([
  'installation', 'depannage', 'renovation', 'remplacement',
  'reparation', 'entretien', 'projet', 'demande', 'travaux', 'autre',
]);

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeHeadlineText(value: string) {
  return stripAccents(value.toLowerCase()).replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isGenericHeadline(value: string) {
  const normalized = normalizeHeadlineText(value);
  if (!normalized) return true;
  const stopwords = new Set(['de', 'du', 'des', 'd', 'le', 'la', 'les', 'un', 'une', 'pour', 'sur', 'a', 'et']);
  const words = normalized.split(' ').filter(Boolean);
  return words.every((word) => GENERIC_HEADLINE_WORDS.has(word) || stopwords.has(word));
}

const HEADLINE_FILLER_WORDS = new Set(['urgent', 'urgente', 'pour', 'un', 'une']);
const HEADLINE_STOP_PATTERN = /(?:\bavec\b|\bbudget\b|\bd[ée]lai\b|\bzone\b|\bacc[èe]s\b|\bphoto\b|\bsvp\b|\bmerci\b|[.,;!?])/i;
export const HEADLINE_ANCHORS: Array<{ regex: RegExp; label: string }> = [
  { regex: /recherche\s+de\s+fuite/i, label: 'Recherche de fuite' },
  { regex: /installation/i, label: 'Installation' },
  { regex: /d[ée]pannage/i, label: 'Dépannage' },
  { regex: /remplacement/i, label: 'Remplacement' },
  { regex: /r[ée]paration/i, label: 'Réparation' },
  { regex: /r[ée]novation/i, label: 'Rénovation' },
  { regex: /entretien/i, label: 'Entretien' },
];

// Extraction par regles simples (sans IA, sans dependance externe) : repere un
// mot-cle d'intervention dans un texte deja charge (synthese IA, description...)
// et capture l'objet qui le suit, en retirant les mots de remplissage ("urgent
// pour un") pour obtenir un sujet de chantier lisible.
export function extractPreciseHeadline(sources: Array<string | undefined | null>): string | undefined {
  for (const source of sources) {
    if (!source || typeof source !== 'string') continue;
    for (const anchor of HEADLINE_ANCHORS) {
      const match = source.match(anchor.regex);
      if (!match || match.index === undefined) continue;
      if (anchor.label === 'Recherche de fuite') return anchor.label;

      const rest = source.slice(match.index + match[0].length);
      const stopMatch = rest.search(HEADLINE_STOP_PATTERN);
      const segment = stopMatch >= 0 ? rest.slice(0, stopMatch) : rest;
      const words = segment.trim().split(/\s+/).filter(Boolean);

      let start = 0;
      while (start < words.length && HEADLINE_FILLER_WORDS.has(words[start].toLowerCase())) start++;
      const remainder = words.slice(start, start + 8).join(' ').trim();
      if (remainder.length === 0) continue;
      return `${anchor.label} ${remainder}`.trim();
    }
  }
  return undefined;
}

export const TRADE_DOMAIN_LABEL: Record<string, string> = {
  plombier: 'plomberie', plomberie: 'plomberie',
  electricien: 'électricité', electricite: 'électricité',
  chauffagiste: 'chauffage', chauffage: 'chauffage',
  menuisier: 'menuiserie', menuiserie: 'menuiserie',
  peintre: 'peinture', peinture: 'peinture',
  macon: 'maçonnerie', maconnerie: 'maçonnerie',
  couvreur: 'couverture', couverture: 'couverture',
  serrurier: 'serrurerie', serrurerie: 'serrurerie',
  jardinier: 'jardinage', paysagiste: 'jardinage',
  carreleur: 'carrelage', carrelage: 'carrelage',
  vitrier: 'vitrerie', vitrerie: 'vitrerie',
  renovation: 'rénovation',
};

export function getFallbackHeadline(trade?: string | null) {
  if (!trade) return 'Projet à qualifier';
  const domain = TRADE_DOMAIN_LABEL[stripAccents(trade.toLowerCase()).trim()];
  if (domain) return `Projet de ${domain}`;
  return `Projet (${trade})`;
}

export function getProjectHeadline(project: any) {
  const directTitle = [
    project?.projectTitle,
    project?.projectType,
    project?.service,
    project?.need,
    project?.besoin,
    project?.title,
  ].find((value) => typeof value === 'string' && value.trim().length > 0);

  if (directTitle && !isGenericHeadline(directTitle)) return directTitle;

  const precise = extractPreciseHeadline([
    project?.aiSummary,
    project?.description,
    project?.projectDescription,
    project?.summary,
    directTitle,
  ]);
  if (precise) return precise;

  if (project?.trade && project?.city) return `${project.trade} - ${project.city}`;
  return getFallbackHeadline(project?.trade);
}
