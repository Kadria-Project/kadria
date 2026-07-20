import type { RecommendationItem } from '@/src/lib/recommendations'
import type { HomeBrief, HomeBriefItem, HomeBriefLevel } from './home-contract'

function proofFor(item: RecommendationItem): { level: HomeBriefLevel; label: string } {
  if (item.type === 'inactive_project') return { level: 'low', label: 'Signal à vérifier' }
  if (item.priority === 'critical' || item.priority === 'high') return { level: 'high', label: 'Fait confirmé' }
  return { level: 'medium', label: 'À confirmer' }
}

function consequenceFor(item: RecommendationItem) {
  if (item.type.includes('quote') || item.type.includes('follow')) return 'Une opportunité commerciale peut se refroidir si elle reste sans suite.'
  if (item.category === 'Planning') return 'La journée terrain peut devenir plus difficile à tenir.'
  return 'Le dossier risque de demander davantage de temps plus tard.'
}

function toBriefItem(item: RecommendationItem): HomeBriefItem {
  const proof = proofFor(item)
  return { id: item.id, title: item.title, observation: item.description, proofLevel: proof.level, proofLabel: proof.label, whyItMatters: item.reason, consequence: consequenceFor(item), recommendation: item.actionLabel, action: { label: item.actionLabel, href: item.actionRoute } }
}

function unique(items: RecommendationItem[]) { return Array.from(new Map(items.map((item) => [item.id, item])).values()) }

export function buildHomeBrief(recommendations: RecommendationItem[], generatedAt: string): HomeBrief {
  const relevant = unique(recommendations.filter((item) => item.category !== 'Configuration').sort((a, b) => b.score - a.score))
  const attention = relevant.filter((item) => item.priority === 'critical' || item.priority === 'high').slice(0, 3)
  const opportunity = relevant.find((item) => ['Commercial', 'Devis', 'Avis'].includes(item.category)) || null
  const risk = relevant.find((item) => item.priority === 'critical' || item.category === 'Planning' || item.category === 'Clients') || null
  const count = attention.length
  return {
    generatedAt,
    situation: count === 0 ? 'Votre activité est sous contrôle aujourd’hui. Aucun dossier ne nécessite de décision immédiate selon les données disponibles.' : count === 1 ? 'Votre activité est globalement stable, mais un dossier mérite votre attention avant la fin de journée.' : `Votre activité est globalement stable, mais ${count} dossiers méritent votre attention avant la fin de journée.`,
    attention: attention.map(toBriefItem), opportunity: opportunity ? toBriefItem(opportunity) : null, risk: risk ? toBriefItem(risk) : null,
    canWait: count === 0 ? 'Les autres dossiers ne présentent pas de signal nécessitant une décision immédiate.' : 'Les éléments non affichés ne dépassent pas le niveau de priorité de ce brief et peuvent être revus après les décisions proposées.',
  }
}
