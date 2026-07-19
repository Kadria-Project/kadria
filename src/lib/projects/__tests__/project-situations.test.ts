import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error Node exécute directement ce fichier TypeScript avec --experimental-strip-types.
import { deriveProjectSituations, type ProjectSituationInput } from '../project-situations.ts'

const formatAmount = (amount?: number | null) => `${amount || 0} €`
const formatDate = (value?: string | null) => value || 'date inconnue'
const formatDateTime = (value?: string | null) => value || 'date inconnue'
const base: ProjectSituationInput = { project: { clientEmail: 'client@example.com', siteAddress: '12 rue des Lilas', trade: 'Électricité', budget: '1000 €', desiredTimeline: 'Ce mois-ci', photos: [] }, lifecycle: { recommendedAction: { key: 'request_deposit', title: 'Demander l’acompte', ctaLabel: 'Demander l’acompte', meta: 'Le devis est accepté.', nextAction: { confidence: 'high', description: 'Sécurisez le chantier avant la planification.' } } }, formatAmount, formatDate, formatDateTime }

test('devis accepté sans acompte : distingue les faits, la compréhension et la recommandation', () => {
  const situations = deriveProjectSituations({ ...base, latestDevis: { amount: 11400, accepted: true, accepted_at: '17 juin' } })
  assert.match(situations.action.observedFacts.join(' '), /accepté/)
  assert.match(situations.action.observedFacts.join(' '), /Aucun acompte/)
  assert.match(situations.commercial.understanding, /sécurisé financièrement/)
  assert.equal(situations.action.primaryAction?.target, 'deposit')
})

test('devis récent envoyé : la situation rassure sans demander de relance', () => {
  const situations = deriveProjectSituations({ ...base, latestDevis: { amount: 900, sent: true }, lifecycle: { recommendedAction: { key: 'monitor', title: 'Suivre le devis', ctaLabel: 'Voir le devis', meta: 'Le devis vient d’être envoyé.', nextAction: { urgency: 'none', confidence: 'high' } } } })
  assert.ok(situations.action.reassurance)
  assert.equal(situations.action.recommendation, undefined)
})

test('CTA générique : reprend le libellé métier de la recommandation', () => {
  const situations = deriveProjectSituations({ ...base, lifecycle: { recommendedAction: { title: 'Préparer le devis', ctaLabel: 'Voir le résumé', meta: 'Le dossier peut être chiffré.' } } })
  assert.equal(situations.action.primaryAction?.label, 'Préparer le devis')
})

test('action historique non reconnue : reste cohérente avec son libellé métier', () => {
  const situations = deriveProjectSituations({ ...base, lifecycle: { recommendedAction: { key: 'legacy_action', title: 'Qualifier la demande', ctaLabel: 'Voir le résumé', meta: 'Le dossier est prêt à être chiffré.' } } })
  assert.equal(situations.action.primaryAction?.label, 'Qualifier la demande')
  assert.equal(situations.action.primaryAction?.target, 'qualification')
  assert.match(situations.action.understanding, /qualifié/)
})

test('qualification incomplète : les manques sont explicites sans champ vide décoratif', () => {
  const situations = deriveProjectSituations({ ...base, project: { trade: 'Électricité' }, lifecycle: { recommendedAction: { key: 'complete_project', title: 'Compléter le dossier', ctaLabel: 'Compléter', meta: 'Des informations sont nécessaires.', nextAction: { confidence: 'low' } } } })
  assert.ok(situations.qualification.missingInformation?.includes('un moyen de joindre le client'))
  assert.match(situations.qualification.understanding, /n’est pas encore prêt/)
  assert.match(situations.qualification.importance || '', /supposant ce qui manque/)
})

const states: Array<{ name: string; input: Partial<ProjectSituationInput>; assertion: (situations: ReturnType<typeof deriveProjectSituations>) => void }> = [
  { name: 'nouveau dossier presque vide', input: { project: { clientEmail: undefined, siteAddress: undefined, trade: undefined, budget: undefined, desiredTimeline: undefined }, lifecycle: { recommendedAction: { key: 'complete_project', title: 'Compléter le dossier', ctaLabel: 'Compléter', meta: 'Des informations sont nécessaires.' } } }, assertion: (s) => assert.ok(s.qualification.missingInformation?.length) },
  { name: 'dossier suffisamment qualifié', input: {}, assertion: (s) => assert.ok(s.qualification.reassurance) },
  { name: 'dossier à rappeler', input: { lifecycle: { recommendedAction: { key: 'reply_client', title: 'Rappeler le client', ctaLabel: 'Rappeler', meta: 'Le dossier attend un retour commercial.' } } }, assertion: (s) => assert.equal(s.action.primaryAction?.target, 'activity') },
  { name: 'rendez-vous à planifier', input: {}, assertion: (s) => assert.equal(s.planning.primaryAction?.target, 'planning') },
  { name: 'rendez-vous prévu sans responsable', input: { appointment: { start: '24 juillet · 10 h 50', location: 'Rouen' } }, assertion: (s) => { assert.match(s.planning.observedFacts.join(' '), /24 juillet/); assert.match(s.planning.observedFacts.join(' '), /pas encore défini/); assert.ok(s.planning.preparation?.length); assert.ok(s.planning.risks?.length); assert.ok(s.planning.expectedOutcome) } },
  { name: 'devis brouillon', input: { latestDevis: { amount: 1200 }, lifecycle: { recommendedAction: { key: 'send_quote', title: 'Envoyer le devis', ctaLabel: 'Envoyer', meta: 'Le devis est prêt.', nextAction: { confidence: 'high' } } } }, assertion: (s) => assert.match(s.commercial.observedFacts[0], /en préparation/) },
  { name: 'devis envoyé non ouvert', input: { latestDevis: { amount: 1200, sent: true }, lifecycle: { recommendedAction: { key: 'monitor', title: 'Suivre le devis', ctaLabel: 'Voir le devis', meta: 'Le devis vient d’être envoyé.', nextAction: { urgency: 'none' } } } }, assertion: (s) => assert.ok(s.commercial.reassurance) },
  { name: 'devis ouvert sans réponse', input: { latestDevis: { amount: 1200, sent: true, opens_count: 3 }, lifecycle: { recommendedAction: { key: 'follow_up_quote', title: 'Relancer le client', ctaLabel: 'Relancer', meta: 'Aucune réponse n’est encore reçue.', nextAction: { confidence: 'medium' } } } }, assertion: (s) => { assert.match(s.commercial.observedFacts.join(' '), /3 fois/); assert.equal(s.commercial.confidence, 'medium') } },
  { name: 'dossier gagné', input: { latestDevis: { accepted: true }, project: { ...base.project, depositStatus: 'paid' }, lifecycle: { stage: 'won', recommendedAction: { key: 'monitor', title: 'Situation maîtrisée', ctaLabel: 'Voir le récapitulatif', meta: 'Le dossier est terminé.', nextAction: { urgency: 'none' } } } }, assertion: (s) => assert.ok(s.action.reassurance) },
  { name: 'dossier perdu', input: { latestDevis: { declined: true }, lifecycle: { stage: 'lost', recommendedAction: { key: 'monitor', title: 'Dossier arrêté', ctaLabel: 'Voir le motif', meta: 'Aucune action commerciale n’est recommandée.', nextAction: { urgency: 'none' } } } }, assertion: (s) => assert.match(s.commercial.possibleConsequence || '', /Aucune relance/) },
  { name: 'documents manquants sans preuve de nécessité', input: { project: { ...base.project, photos: [] }, lifecycle: { recommendedAction: { key: 'monitor', title: 'Situation maîtrisée', ctaLabel: 'Consulter', meta: 'Aucun blocage identifié.', nextAction: { urgency: 'none' } } } }, assertion: (s) => assert.ok(s.documents.reassurance) },
  { name: 'données insuffisantes pour conclure', input: { project: { clientEmail: undefined, siteAddress: undefined, trade: undefined, budget: undefined, desiredTimeline: undefined }, lifecycle: { recommendedAction: { key: 'monitor', title: 'Surveiller le dossier', ctaLabel: 'Consulter', meta: 'Les informations sont insuffisantes.', nextAction: { urgency: 'none', confidence: 'low' } } } }, assertion: (s) => assert.match(s.action.observedFacts.join(' '), /Il manque|Aucun changement/) },
]

for (const state of states) {
  test(`situation métier : ${state.name}`, () => {
    const input: ProjectSituationInput = { ...base, ...state.input, project: { ...base.project, ...state.input.project }, lifecycle: state.input.lifecycle || base.lifecycle }
    state.assertion(deriveProjectSituations(input))
  })
}
