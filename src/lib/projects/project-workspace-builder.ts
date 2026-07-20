import { validateProjectWorkspaceBrief, type ProjectWorkspaceBrief } from './project-workspace-contract'

export type ProjectWorkspaceBuilderInput = {
  now?: Date
  project: { id: string; status?: string | null; clientName?: string | null; clientFirstName?: string | null; projectType?: string | null; trade?: string | null; city?: string | null; completenessScore?: number | null; callbackDate?: string | null }
  latestQuote?: { id: string; status?: string | null; sent?: boolean | null; accepted?: boolean | null; declined?: boolean | null; sentAt?: string | null; acceptedAt?: string | null; createdAt?: string | null } | null
  nextAppointment?: { startsAt?: string | null } | null
  activity?: Array<{ label: string; occurredAt?: string; source?: string }>
  capabilities: ProjectWorkspaceBrief['capabilities']
  reservations?: string[]
}

const DAY = 86_400_000
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const titleFor = (project: ProjectWorkspaceBuilderInput['project']) => text(project.projectType) || text(project.trade) || 'Dossier à préciser'
const clientLabelFor = (project: ProjectWorkspaceBuilderInput['project']) => [text(project.clientFirstName), text(project.clientName)].filter(Boolean).join(' ') || null
const stageFor = (status: string | null | undefined) => {
  const value = text(status)
  const normalized: Record<string, string> = { 'A rappeler': 'À rappeler', Qualifie: 'Qualifié', 'Devis envoye': 'Devis envoyé', 'Devis accepte': 'Devis accepté', Gagne: 'Gagné' }
  return normalized[value] || value || 'Nouveau'
}
const daysSince = (value: string | null | undefined, now: Date) => {
  const date = value ? new Date(value).getTime() : Number.NaN
  return Number.isFinite(date) ? Math.max(0, Math.floor((now.getTime() - date) / DAY)) : null
}

export function buildProjectWorkspaceBrief(input: ProjectWorkspaceBuilderInput): ProjectWorkspaceBrief {
  const now = input.now || new Date()
  const reservations = [...(input.reservations || [])]
  const project = input.project
  const quote = input.latestQuote || null
  const completeness = Number(project.completenessScore)
  const missingQualification = !Number.isFinite(completeness) || completeness < 60
  const normalizedStatus = stageFor(project.status)
  const dataQuality: ProjectWorkspaceBrief['dataQuality'] = { level: 'complete', reservations }
  const base = {
    generatedAt: now.toISOString(),
    dataQuality,
    project: { id: project.id, title: titleFor(project), stage: normalizedStatus, clientLabel: clientLabelFor(project), trade: text(project.trade) || null, city: text(project.city) || null },
    capabilities: input.capabilities,
  }

  let decision: ProjectWorkspaceBrief['decision']
  if (!project.id || (!text(project.projectType) && !text(project.trade) && !clientLabelFor(project))) {
    reservations.push('Les informations minimales du dossier ne suffisent pas à établir une lecture fiable.')
    decision = {
      observedFacts: [{ label: 'Les éléments essentiels du dossier sont encore peu renseignés.', source: 'Dossier' }],
      understanding: 'Kadria ne peut pas déterminer de prochaine étape sûre avec les informations disponibles.',
      evidenceLevel: 'weak',
      uncertainty: 'Le besoin, le contact ou le contexte du dossier restent à confirmer.',
      ...(input.capabilities.canEditProject ? { recommendation: 'Compléter les informations essentielles du dossier.', why: 'Une action plus engageante reposerait sur des hypothèses.', primaryAction: { id: 'complete_project', label: 'Compléter le dossier', destination: `/dashboard-v2/projet/${project.id}?focus=qualification` } } : {}),
    }
    base.dataQuality.level = 'insufficient'
  } else if (missingQualification) {
    decision = {
      observedFacts: [{ label: 'Des informations de qualification utiles au dossier restent à confirmer.', source: 'Dossier' }],
      understanding: 'Le dossier ne fournit pas encore une base suffisamment solide pour engager la suite sans réserve.',
      evidenceLevel: 'moderate',
      uncertainty: 'Les informations manquantes peuvent modifier la préparation commerciale ou technique.',
      ...(input.capabilities.canEditProject ? { recommendation: 'Compléter les informations nécessaires avant de poursuivre.', why: 'Cela évite de faire avancer le dossier sur une hypothèse.', primaryAction: { id: 'complete_project', label: 'Compléter le dossier', destination: `/dashboard-v2/projet/${project.id}?focus=qualification` } } : {}),
    }
  } else if (quote?.accepted || quote?.acceptedAt) {
    decision = {
      observedFacts: [{ label: 'Un devis est enregistré comme accepté.', occurredAt: quote.acceptedAt || undefined, source: 'Devis' }],
      understanding: input.nextAppointment?.startsAt ? 'La décision commerciale est confirmée et un prochain engagement est déjà enregistré.' : 'La décision commerciale est confirmée ; le prochain engagement reste à organiser.',
      evidenceLevel: 'strong',
      ...(input.nextAppointment?.startsAt ? {} : { uncertainty: 'Aucun prochain rendez-vous n’est enregistré dans les informations consultées.' }),
      ...(input.nextAppointment?.startsAt || !input.capabilities.canPlanAppointment ? {} : { recommendation: 'Préparer le prochain engagement du dossier.', why: 'La décision commerciale est confirmée, mais aucune étape planifiée ne permet encore de poursuivre.', primaryAction: { id: 'plan_appointment', label: 'Planifier le prochain engagement', destination: `/dashboard-v2/projet/${project.id}?focus=planning` } }),
    }
  } else if (quote && (quote.sent || text(quote.status).toLowerCase().startsWith('envoy') || quote.sentAt)) {
    const sentDays = daysSince(quote.sentAt || quote.createdAt, now)
    const stale = sentDays !== null && sentDays >= 7
    decision = {
      observedFacts: [
        { label: 'Un devis est enregistré comme envoyé.', occurredAt: quote.sentAt || quote.createdAt || undefined, source: 'Devis' },
        { label: 'Aucune acceptation du devis n’est enregistrée.', source: 'Devis' },
      ],
      understanding: stale ? 'Le client pourrait attendre une relance.' : 'Le dossier attend une décision client qui n’est pas encore enregistrée.',
      evidenceLevel: stale ? 'moderate' : 'weak',
      uncertainty: 'L’absence de réponse enregistrée ne permet pas de conclure à un refus ou à une intention client.',
      ...(stale && input.capabilities.canManageQuote ? { recommendation: 'Préparer une relance adaptée au dossier.', why: `Le devis est envoyé depuis ${sentDays} jour${sentDays > 1 ? 's' : ''} sans décision enregistrée ; la raison de ce silence reste inconnue.`, primaryAction: { id: 'follow_up_quote', label: 'Préparer la relance', destination: `/dashboard-v2/projet/${project.id}?focus=quote_followup` } } : {}),
    }
  } else if (input.nextAppointment?.startsAt) {
    decision = {
      observedFacts: [{ label: 'Un prochain rendez-vous est enregistré.', occurredAt: input.nextAppointment.startsAt, source: 'Rendez-vous' }],
      understanding: 'Le dossier possède un prochain engagement concret avant la prochaine décision.',
      evidenceLevel: 'strong',
      recommendation: 'Préparer les éléments à confirmer pendant ce rendez-vous.',
      why: 'Le prochain engagement est l’élément déterminant connu pour faire progresser le dossier.',
      primaryAction: { id: 'view_appointment', label: 'Voir le prochain engagement', destination: `/dashboard-v2/projet/${project.id}?focus=planning` },
    }
  } else {
    const facts = input.activity?.slice(0, 3) || []
    decision = {
      observedFacts: facts.length ? facts : [{ label: 'Aucun fait déterminant récent n’est disponible pour ce dossier.', source: 'Dossier' }],
      understanding: normalizedStatus === 'À rappeler' || text(project.callbackDate) ? 'Le dossier attend une reprise de contact ou sa confirmation.' : 'Les informations disponibles ne permettent pas de recommander une action forte.',
      evidenceLevel: facts.length ? 'moderate' : 'weak',
      uncertainty: facts.length ? 'Les éléments disponibles ne décrivent pas encore la prochaine décision client.' : 'Un fait récent, une qualification ou un engagement manque pour conclure.',
      ...(input.capabilities.canEditProject ? { recommendation: 'Vérifier les informations utiles avant de choisir la suite.', why: 'Kadria ne propose pas d’action plus engageante sans élément déterminant.', primaryAction: { id: 'review_project', label: 'Vérifier le dossier', destination: `/dashboard-v2/projet/${project.id}?focus=qualification` } } : {}),
    }
  }

  if (base.dataQuality.level !== 'insufficient' && reservations.length) base.dataQuality.level = 'partial'
  return validateProjectWorkspaceBrief({ ...base, decision })
}
