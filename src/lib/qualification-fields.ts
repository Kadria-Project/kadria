// Modèle structuré des questions de qualification (référentiel métier).
//
// Remplace progressivement `qualification_questions: string[]` par une liste
// de champs typés (`QualificationField[]`), permettant au Mode Expert et,
// plus tard, au chat de savoir non seulement QUOI demander mais aussi
// COMMENT l'afficher/le saisir (texte, nombre, oui/non, date, choix, photo,
// téléphone, email, adresse, montant). Aucune IA : uniquement du modèle
// métier déclaré par l'artisan.
//
// Migration douce : `qualification_questions` n'est jamais supprimé. Tant
// que `qualification_fields` est vide pour une prestation, tout le code
// existant continue de fonctionner sur `qualification_questions`.

export type QualificationFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'photo'
  | 'phone'
  | 'email'
  | 'address'
  | 'currency'

export interface QualificationField {
  id: string
  label: string
  type: QualificationFieldType
  required: boolean
  order: number
  placeholder?: string | null
  helpText?: string | null
  unit?: string | null
  options?: string[] | null
  category?: string | null
  defaultValue?: string | number | boolean | string[] | null
}

const QUALIFICATION_FIELD_TYPES: QualificationFieldType[] = [
  'text', 'number', 'boolean', 'date', 'select', 'multiselect', 'photo', 'phone', 'email', 'address', 'currency',
]

export function isQualificationFieldType(value: unknown): value is QualificationFieldType {
  return typeof value === 'string' && (QUALIFICATION_FIELD_TYPES as string[]).includes(value)
}

export function isQualificationFieldArray(v: unknown): v is QualificationField[] {
  return Array.isArray(v) && v.every((item) => {
    if (!item || typeof item !== 'object') return false
    const f = item as Record<string, unknown>
    if (typeof f.id !== 'string' || typeof f.label !== 'string') return false
    if (!isQualificationFieldType(f.type)) return false
    if (typeof f.required !== 'boolean') return false
    if (typeof f.order !== 'number') return false
    if (f.placeholder !== undefined && f.placeholder !== null && typeof f.placeholder !== 'string') return false
    if (f.helpText !== undefined && f.helpText !== null && typeof f.helpText !== 'string') return false
    if (f.unit !== undefined && f.unit !== null && typeof f.unit !== 'string') return false
    if (f.category !== undefined && f.category !== null && typeof f.category !== 'string') return false
    if (f.options !== undefined && f.options !== null && !(Array.isArray(f.options) && f.options.every((o) => typeof o === 'string'))) return false
    return true
  })
}

function normalizeForLookup(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Croisement simple (lookup texte, pas une heuristique de scoring) entre un
 * champ de qualification structuré et les réponses déjà saisies sur le
 * projet (`tradeAnswers`). Cherche d'abord par `id` (clé exacte), puis par
 * correspondance texte sur le `label`, pour rester compatible avec
 * l'ancienne logique basée sur `qualification_questions`.
 */
export function isQualificationFieldAnswered(field: QualificationField, tradeAnswers: unknown): boolean {
  if (!tradeAnswers || typeof tradeAnswers !== 'object') return false
  const entries = Object.entries(tradeAnswers as Record<string, unknown>)

  const byId = entries.find(([key, value]) => key === field.id && value !== null && value !== undefined && value !== '')
  if (byId) return true

  const normalizedLabel = normalizeForLookup(field.label)
  return entries.some(([key, value]) => {
    if (value === null || value === undefined || value === '') return false
    const normalizedKey = normalizeForLookup(key)
    return (
      normalizedKey.length > 0 &&
      (normalizedLabel.includes(normalizedKey) || normalizedKey.includes(normalizedLabel))
    )
  })
}

export interface QualificationFieldsStatus {
  expectedQualificationFields: QualificationField[]
  completedQualificationFields: QualificationField[]
  remainingQualificationFields: QualificationField[]
}

/**
 * Préparation pour le chat (non branchée ici) : sépare les champs attendus
 * en complétés/restants, sans rien recalculer d'autre que la même logique
 * de croisement déjà utilisée pour l'affichage Mode Expert.
 */
export function computeQualificationFieldsStatus(
  fields: QualificationField[],
  tradeAnswers: unknown
): QualificationFieldsStatus {
  const sorted = fields.slice().sort((a, b) => a.order - b.order)
  const completed = sorted.filter((f) => isQualificationFieldAnswered(f, tradeAnswers))
  const remaining = sorted.filter((f) => !isQualificationFieldAnswered(f, tradeAnswers))
  return {
    expectedQualificationFields: sorted,
    completedQualificationFields: completed,
    remainingQualificationFields: remaining,
  }
}
