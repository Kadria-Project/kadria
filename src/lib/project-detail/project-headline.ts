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

// Source de verite unique pour le titre de projet affiche cote emails
// (devis, relances manuelles/admin). Reutilise getProjectHeadline (deja la
// reference pour la fiche projet et la page devis publique) afin que le
// meme projet porte le meme intitule partout. Contrairement a
// getProjectHeadline (pense pour un H1 de fiche projet, avec un fallback
// "Projet a qualifier"/"Projet de <metier>"), ce wrapper est destine a des
// phrases d'email ("Projet : ...", "... pour <titre>.") : si aucun intitule
// precis n'a pu etre determine, on retombe sur un fallback generique neutre
// plutot que d'injecter un texte pense pour un H1.
export function getProjectDisplayTitle(project: any, fallback: string = 'votre projet'): string {
  // Ordre de priorite : 1) colonne persistee project_title (Projects),
  // 2) headline deja calcule par Kadria (getProjectHeadline, qui retombe
  // lui-meme sur ai_summary/project_type/trade), 3) `fallback` fourni par
  // l'appelant (typiquement devis.objet), 4) fallback neutre generique.
  // Ne jamais throw sur un champ manquant, ne jamais renvoyer
  // "[object Object]", toujours une string non vide.
  const trimmedFallback = (typeof fallback === 'string' && fallback.trim()) || 'votre projet';

  const storedTitle = typeof project?.projectTitle === 'string' ? project.projectTitle.trim() : '';
  if (storedTitle && !isGenericHeadline(storedTitle)) return storedTitle;

  let headline: unknown;
  try {
    headline = getProjectHeadline(project);
  } catch {
    headline = undefined;
  }

  if (typeof headline === 'string') {
    const trimmed = headline.trim();
    if (trimmed && trimmed !== 'Projet à qualifier') return trimmed;
  }

  // Le headline generique n'a rien apporte de plus precis que le titre
  // stocke (meme s'il etait juge trop court) : on le garde plutot que de
  // sauter directement au fallback neutre.
  if (storedTitle) return storedTitle;

  return trimmedFallback;
}

// Resout le titre a persister dans Projects.project_title au moment de la
// creation du dossier (assistant web, Vapi, creation manuelle...). Toujours
// appele une seule fois par point de creation pour eviter de dupliquer la
// logique de resolution. Retourne toujours une chaine non vide.
//
// Ordre de priorite :
// 1) Titre deja genere par Kadria/l'IA si fourni explicitement a la creation
// 2) Headline deja calcule par getProjectHeadline / equivalent
// 3) ai_summary court et exploitable
// 4) Sujet/nom de projet fourni par le client (projectType)
// 5) Combinaison metier + besoin principal ("{type projet} — {element}")
// 6) Fallback : "Nouvelle demande {metier}" ou "Projet client"
export function resolveProjectTitleForStorage(input: {
  aiGeneratedTitle?: string | null
  headline?: string | null
  aiSummary?: string | null
  projectType?: string | null
  trade?: string | null
}): string {
  const aiGeneratedTitle = typeof input.aiGeneratedTitle === 'string' ? input.aiGeneratedTitle.trim() : '';
  if (aiGeneratedTitle && !isGenericHeadline(aiGeneratedTitle)) return aiGeneratedTitle;

  const headline = typeof input.headline === 'string' ? input.headline.trim() : '';
  if (headline && !isGenericHeadline(headline) && headline !== 'Projet à qualifier') return headline;

  const aiSummary = typeof input.aiSummary === 'string' ? input.aiSummary.trim() : '';
  if (aiSummary) {
    const precise = extractPreciseHeadline([aiSummary]);
    if (precise) return precise;
    // Resume court et exploitable (une phrase courte) : on le garde tel quel.
    if (aiSummary.length <= 120 && !aiSummary.includes('\n')) return aiSummary;
  }

  const projectType = typeof input.projectType === 'string' ? input.projectType.trim() : '';
  if (projectType && !isGenericHeadline(projectType)) return projectType;

  const trade = typeof input.trade === 'string' ? input.trade.trim() : '';
  if (projectType && trade) return `${projectType} — ${trade}`;
  if (trade) return `Nouvelle demande ${trade}`;
  if (projectType) return projectType;
  if (aiGeneratedTitle) return aiGeneratedTitle;
  if (headline) return headline;

  return 'Projet client';
}
