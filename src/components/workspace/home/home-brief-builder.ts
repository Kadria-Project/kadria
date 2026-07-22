import type { RecommendationAppointmentInput, RecommendationItem, RecommendationProjectInput } from '@/src/lib/recommendations'
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

function toBriefItem(item: RecommendationItem, projects: RecommendationProjectInput[]): HomeBriefItem {
  const proof = proofFor(item)
  const project = item.entityType === 'project' ? projects.find((candidate) => candidate.id === item.entityId) : null
  return { id: item.id, title: item.title, observation: item.description, proofLevel: proof.level, proofLabel: proof.label, whyItMatters: item.reason, consequence: consequenceFor(item), recommendation: item.actionLabel, action: { label: item.actionLabel, href: item.actionRoute }, ...(project ? { context: { clientName: [project.clientFirstName, project.clientName].filter(Boolean).join(' ').trim() || 'Client à compléter', projectTitle: project.projectType || project.trade || 'Projet sans intitulé', status: project.status || 'Statut à préciser', value: project.budget || 'Valeur à préciser', timing: item.reason } } : {}) }
}

function unique(items: RecommendationItem[]) { return Array.from(new Map(items.map((item) => [item.id, item])).values()) }

export function buildHomeBrief(recommendations: RecommendationItem[], generatedAt: string, projects: RecommendationProjectInput[] = [], appointments: RecommendationAppointmentInput[] = []): HomeBrief {
  const relevant = unique(recommendations.filter((item) => item.category !== 'Configuration').sort((a, b) => b.score - a.score))
  const attention = relevant.filter((item) => item.priority === 'critical' || item.priority === 'high').slice(0, 3)
  const opportunity = relevant.find((item) => ['Commercial', 'Devis', 'Avis'].includes(item.category)) || null
  const risk = relevant.find((item) => item.priority === 'critical' || item.category === 'Planning' || item.category === 'Clients') || null
  const count = attention.length
  const now = new Date(generatedAt)
  const dayKey = (date: Date) => date.toISOString().slice(0, 10)
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const projectById = new Map(projects.map((project) => [project.id, project]))
  const agenda: HomeBrief['agenda'] = appointments.flatMap((appointment) => { if (!appointment.start) return []; const start = new Date(appointment.start); const day: 'today' | 'tomorrow' | null = dayKey(start) === dayKey(now) ? 'today' : dayKey(start) === dayKey(tomorrow) ? 'tomorrow' : null; if (!day) return []; const project = appointment.projectId ? projectById.get(appointment.projectId) : null; return [{ id: appointment.id, day, time: start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), title: appointment.title || [project?.clientFirstName, project?.clientName].filter(Boolean).join(' ') || 'Rendez-vous à préciser', context: project?.projectType || project?.trade || 'Contexte à préciser', location: appointment.location || project?.city || null }] }).slice(0, 5)
  return {
    generatedAt,
    situation: count === 0 ? 'Votre activité est sous contrôle aujourd’hui. Aucun dossier ne nécessite de décision immédiate selon les données disponibles.' : count === 1 ? 'Votre activité est globalement stable, mais un dossier mérite votre attention avant la fin de journée.' : `Votre activité est globalement stable, mais ${count} dossiers méritent votre attention avant la fin de journée.`,
    attention: attention.map((item) => toBriefItem(item, projects)), opportunity: opportunity ? toBriefItem(opportunity, projects) : null, risk: risk ? toBriefItem(risk, projects) : null,
    canWait: count === 0 ? 'Les autres dossiers ne présentent pas de signal nécessitant une décision immédiate.' : 'Les éléments non affichés ne dépassent pas le niveau de priorité de ce brief et peuvent être revus après les décisions proposées.',
    impact: { headline: count ? `Aujourd’hui, ${count} décision${count > 1 ? 's' : ''} auront le plus d’impact sur votre activité.` : 'Aujourd’hui, votre activité ne demande pas de décision urgente.', detail: count ? `${relevant.filter((item) => item.type.includes('quote')).length} devis et rendez-vous méritent une attention particulière.` : 'Vous pouvez vous concentrer sur l’avancement de vos dossiers.' },
    agenda,
    deferred: relevant.filter((item) => !attention.some((priority) => priority.id === item.id)).slice(0, 4).map((item) => toBriefItem(item, projects)),
    summary: { quoteSent: projects.filter((project) => Boolean(project.quoteSentAt)).length, quoteAccepted: projects.filter((project) => Boolean(project.acceptedAt)).length, activeProjects: projects.filter((project) => project.status !== 'Gagné' && project.status !== 'Perdu').length },
  }
}
