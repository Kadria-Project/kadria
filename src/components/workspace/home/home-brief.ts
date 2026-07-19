export type BriefItem = {
  id: string
  priority: 'critical' | 'high' | 'normal' | 'low'
  score: number
  primaryActionRoute: string | null
  sourceType: string | null
}

const priorityWeight: Record<BriefItem['priority'], number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

export function selectBriefSituations<T extends BriefItem>(items: T[]) {
  const unique = new Map(items.map((item) => [item.id, item]))

  return Array.from(unique.values())
    .filter((item) => Boolean(item.primaryActionRoute))
    .sort((left, right) => right.score - left.score || priorityWeight[right.priority] - priorityWeight[left.priority])
    .slice(0, 3)
}

export function briefSituationSentence(count: number) {
  if (count === 0) {
    return 'Votre activité est sous contrôle. Aucun dossier ne nécessite de décision immédiate.'
  }

  if (count === 1) {
    return 'Une situation mérite votre attention aujourd’hui. Je vous indique pourquoi et où intervenir.'
  }

  return `${count} situations méritent votre attention aujourd’hui. Je vous indique pourquoi et où intervenir.`
}

export function understandingFor(sourceType: string | null, fallback: string) {
  const understandings: Record<string, string> = {
    set_callback: 'Le suivi risque d’être oublié sans rappel défini.',
    prepare_quote: 'Le dossier présente des signaux favorables et peut être chiffré.',
    follow_up_quote: 'Le client semble encore étudier votre proposition.',
    schedule_intervention: 'Le chantier peut être préparé, mais aucun créneau n’est encore enregistré.',
    request_review: 'La relation peut être prolongée après la fin du chantier.',
    assign_responsible: 'Le dossier ne dispose pas encore d’un responsable clairement identifié.',
    inactive_project: 'L’absence d’activité enregistrée peut indiquer que le dossier se refroidit.',
    complete_information: 'Des informations manquent encore pour faire avancer le dossier sereinement.',
    risk_followup: 'Le suivi commercial indique un risque de refroidissement.',
    appointment_change_requested: 'Le créneau actuel ne répond plus à la demande du client.',
    appointment_confirmation: 'Le rendez-vous reste incertain tant que le client ne l’a pas confirmé.',
    appointment_address: 'Le déplacement ne peut pas être préparé correctement sans adresse.',
    assign_collaborator: 'Le rendez-vous ne peut pas être attribué clairement à un collaborateur.',
    planning_conflict: 'Les deux interventions ne peuvent pas être tenues aux horaires actuels.',
    travel_warning: 'Le déplacement prévu semble trop contraint pour être fiable.',
    member_overloaded: 'La charge planifiée mérite d’être rééquilibrée avant de perturber la journée.',
  }

  return understandings[sourceType || ''] || fallback
}
