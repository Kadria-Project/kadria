'use client';

// Donnees et logique de reponses pour l'assistant demo scenarise
// (DemoKadriaAssistantWidget.tsx). Aucune donnee reelle n'est utilisee : on
// importe uniquement le dataset de demo (10 dossiers factices) depuis
// demo-data.ts, jamais duplique ici. Toutes les reponses sont pre-ecrites et
// deterministes, aucun appel reseau/OpenAI.

import type { DemoProject } from '@/src/lib/demo-data';

export type DemoAssistantPageContext = 'dashboard' | 'project' | 'settings';

export interface DemoAssistantButton {
  id: string;
  label: string;
  category?: string;
}

export interface DemoAssistantAnswer {
  text: string;
  copyMessage?: string;
  followUps: DemoAssistantButton[];
}

const client = (p: DemoProject) => `${p.clientFirstName} ${p.clientName}`.trim();

// ─────────────────────────────────────────────────────────────────────────
// Boutons de suivi generiques, reproposes apres chaque reponse pour ne
// jamais laisser de dead-end.
// ─────────────────────────────────────────────────────────────────────────
const FOLLOW_UP_GENERIC: DemoAssistantButton[] = [
  { id: 'followup_next_action', label: 'Voir l’action suivante' },
  { id: 'followup_message', label: 'Préparer un message client' },
  { id: 'followup_risks', label: 'Quels risques ?' },
  { id: 'followup_back', label: 'Revenir aux suggestions' },
];

const FOLLOW_UP_PROJECT: DemoAssistantButton[] = [
  { id: 'followup_next_action', label: 'Voir l’action suivante' },
  { id: 'followup_message', label: 'Préparer un message client' },
  { id: 'followup_other_example', label: 'Autre exemple' },
  { id: 'followup_back', label: 'Revenir aux suggestions' },
];

// ─────────────────────────────────────────────────────────────────────────
// Suggestions par page
// ─────────────────────────────────────────────────────────────────────────
const DASHBOARD_BUTTONS: DemoAssistantButton[] = [
  { id: 'dash_priority', label: 'Quels dossiers traiter en priorité ?', category: 'Savoir quoi faire' },
  { id: 'dash_relance_devis', label: 'Quels devis dois-je relancer ?', category: 'Préparer une relance' },
  { id: 'dash_acomptes', label: 'Quels acomptes sont à suivre ?', category: 'Sécuriser le chantier' },
  { id: 'dash_ca_bloque', label: 'Qu’est-ce qui bloque mon chiffre d’affaires ?', category: 'Savoir quoi faire' },
  { id: 'dash_today', label: 'Que dois-je faire aujourd’hui ?', category: 'Savoir quoi faire' },
  { id: 'comm_chaud', label: 'Pourquoi ce dossier est chaud ?', category: 'Suivi commercial' },
  { id: 'comm_risque', label: 'Quels prospects risquent de m’échapper ?', category: 'Suivi commercial' },
  { id: 'comm_rapide', label: 'Quels dossiers peuvent générer du chiffre rapidement ?', category: 'Suivi commercial' },
  { id: 'comm_bloque', label: 'Quels dossiers sont bloqués ?', category: 'Suivi commercial' },
  { id: 'agenda_prepare_rdv', label: 'Quels rendez-vous dois-je préparer ?', category: 'Agenda' },
  { id: 'agenda_creneau_urgent', label: 'Quel dossier nécessite un créneau rapidement ?', category: 'Agenda' },
  { id: 'agenda_planifier_chantier', label: 'Quels chantiers sont à planifier ?', category: 'Agenda' },
];

const SETTINGS_BUTTONS: DemoAssistantButton[] = [
  { id: 'set_profil', label: 'Que dois-je améliorer dans mon Profil métier ?', category: 'Améliorer mon paramétrage' },
  { id: 'set_qualif', label: 'Mes questions de qualification sont-elles suffisantes ?', category: 'Améliorer mon paramétrage' },
  { id: 'set_prestations', label: 'Comment mieux configurer mes prestations ?', category: 'Améliorer mon paramétrage' },
  { id: 'set_manque', label: 'Que manque-t-il pour mieux qualifier les demandes ?', category: 'Améliorer mon paramétrage' },
];

const PROJECT_GENERIC_BUTTONS: DemoAssistantButton[] = [
  { id: 'proj_summary', label: 'Résumer ce dossier', category: 'Comprendre ce dossier' },
  { id: 'proj_next_action', label: 'Que dois-je faire maintenant ?', category: 'Savoir quoi faire' },
  { id: 'proj_missing_info', label: 'Quelles informations manquent ?', category: 'Comprendre ce dossier' },
  { id: 'proj_prepare_message', label: 'Préparer un message client', category: 'Préparer une relance' },
  { id: 'proj_why_priority', label: 'Pourquoi ce dossier est prioritaire ?', category: 'Savoir quoi faire' },
];

// Boutons specifiques par statut (3 questions par statut, cf. brief).
const PROJECT_STATUS_BUTTONS: Record<string, DemoAssistantButton[]> = {
  'Nouveau': [
    { id: 'status_nouveau_questions', label: 'Quelles questions poser au client ?', category: 'Comprendre ce dossier' },
    { id: 'status_nouveau_urgent', label: 'Ce dossier est-il urgent ?', category: 'Savoir quoi faire' },
    { id: 'status_nouveau_qualifier', label: 'Comment qualifier rapidement ?', category: 'Savoir quoi faire' },
  ],
  'Qualifié': [
    { id: 'status_qualifie_pret', label: 'Le dossier est-il prêt pour devis ?', category: 'Comprendre ce dossier' },
    { id: 'status_qualifie_postes', label: 'Quels postes prévoir au devis ?', category: 'Savoir quoi faire' },
    { id: 'status_qualifie_risque', label: 'Quel risque commercial ?', category: 'Sécuriser le chantier' },
  ],
  'Devis envoyé': [
    { id: 'status_devis_relancer', label: 'Faut-il relancer ce devis ?', category: 'Préparer une relance' },
    { id: 'status_devis_prepare_relance', label: 'Préparer une relance', category: 'Préparer une relance' },
    { id: 'status_devis_argument', label: 'Quel argument utiliser ?', category: 'Préparer une relance' },
  ],
  'Devis accepté': [
    { id: 'status_accepte_etape', label: 'Quelle prochaine étape ?', category: 'Savoir quoi faire' },
    { id: 'status_accepte_acompte', label: 'Faut-il demander un acompte ?', category: 'Sécuriser le chantier' },
    { id: 'status_accepte_securiser', label: 'Comment sécuriser le chantier ?', category: 'Sécuriser le chantier' },
  ],
  'Acompte demandé': [
    { id: 'status_acompte_relancer', label: 'L’acompte est-il à relancer ?', category: 'Préparer une relance' },
    { id: 'status_acompte_prepare_relance', label: 'Préparer une relance acompte', category: 'Préparer une relance' },
    { id: 'status_acompte_risque', label: 'Quel risque si j’attends ?', category: 'Sécuriser le chantier' },
  ],
  'Acompte payé': [
    { id: 'status_paye_maintenant', label: 'Que faire maintenant ?', category: 'Savoir quoi faire' },
    { id: 'status_paye_planifier', label: 'Planifier le chantier', category: 'Sécuriser le chantier' },
    { id: 'status_paye_preparer_client', label: 'Préparer le client', category: 'Préparer une relance' },
  ],
  'En cours': [
    { id: 'status_encours_preparer_rdv', label: 'Que dois-je préparer avant le RDV ?', category: 'Savoir quoi faire' },
    { id: 'status_encours_confirmer', label: 'Quels points confirmer ?', category: 'Comprendre ce dossier' },
    { id: 'status_encours_message', label: 'Préparer un message client', category: 'Préparer une relance' },
  ],
  'Réalisation du projet': [
    { id: 'status_realisation_suivre', label: 'Comment suivre ce chantier ?', category: 'Sécuriser le chantier' },
    { id: 'status_realisation_dire', label: 'Que dire au client ?', category: 'Préparer une relance' },
    { id: 'status_realisation_cloturer', label: 'Quand clôturer ?', category: 'Savoir quoi faire' },
  ],
  'Perdu': [
    { id: 'status_perdu_pourquoi', label: 'Pourquoi ce dossier est perdu ?', category: 'Comprendre ce dossier' },
    { id: 'status_perdu_apprendre', label: 'Que puis-je apprendre ?', category: 'Comprendre ce dossier' },
    { id: 'status_perdu_eviter', label: 'Comment éviter ça la prochaine fois ?', category: 'Améliorer mon paramétrage' },
  ],
  'Gagné': [
    { id: 'status_gagne_action', label: 'Quelle action après chantier ?', category: 'Savoir quoi faire' },
    { id: 'status_gagne_avis', label: 'Préparer une demande d’avis', category: 'Préparer une relance' },
    { id: 'status_gagne_retenir', label: 'Que retenir de ce dossier ?', category: 'Comprendre ce dossier' },
  ],
};

export function getDemoAssistantSuggestions(
  pageContext: DemoAssistantPageContext,
  project?: DemoProject,
): DemoAssistantButton[] {
  if (pageContext === 'settings') return SETTINGS_BUTTONS;
  if (pageContext === 'project' && project) {
    const statusButtons = PROJECT_STATUS_BUTTONS[project.status] || [];
    return [...PROJECT_GENERIC_BUTTONS, ...statusButtons];
  }
  return DASHBOARD_BUTTONS;
}

// ─────────────────────────────────────────────────────────────────────────
// Reponses pre-ecrites
// ─────────────────────────────────────────────────────────────────────────
interface AnswerContext {
  project?: DemoProject;
  projects: DemoProject[];
}

function findByStatus(projects: DemoProject[], status: string): DemoProject[] {
  return projects.filter((p) => p.status === status);
}

function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'montant non renseigné';
  return `${n.toLocaleString('fr-FR')} €`;
}

function dashboardAnswer(questionId: string, projects: DemoProject[]): DemoAssistantAnswer | undefined {
  switch (questionId) {
    case 'dash_priority': {
      const devisEnvoye = findByStatus(projects, 'Devis envoyé')[0];
      const acompteDemande = findByStatus(projects, 'Acompte demandé')[0];
      const nouveau = findByStatus(projects, 'Nouveau')[0];
      const lines: string[] = [];
      if (devisEnvoye) lines.push(`${client(devisEnvoye)} (${devisEnvoye.projectType}) : devis envoyé, à relancer aujourd’hui.`);
      if (acompteDemande) lines.push(`${client(acompteDemande)} (${acompteDemande.projectType}) : acompte demandé non réglé, chantier pas encore sécurisé.`);
      if (nouveau) lines.push(`${client(nouveau)} (${nouveau.projectType}) : nouveau dossier ${nouveau.maturity === 'Urgent' ? 'urgent' : ''} à qualifier rapidement.`);
      return {
        text: `3 dossiers à traiter en priorité aujourd’hui.\n- ${lines.join('\n- ')}`,
        followUps: [
          { id: 'dash_relance_devis', label: 'Quels devis dois-je relancer ?' },
          { id: 'dash_acomptes', label: 'Quels acomptes sont à suivre ?' },
          ...FOLLOW_UP_GENERIC,
        ],
      };
    }
    case 'dash_relance_devis': {
      const toFollow = findByStatus(projects, 'Devis envoyé');
      if (toFollow.length === 0) {
        return { text: 'Aucun devis en attente de relance pour le moment.', followUps: FOLLOW_UP_GENERIC };
      }
      const list = toFollow.map((p) => `${client(p)} — devis de ${money(p.devisAmount)}, envoyé le ${new Date(p.quote?.sentAt || p.createdAt).toLocaleDateString('fr-FR')}.`);
      return {
        text: `${toFollow.length} devis à relancer.\n- ${list.join('\n- ')}\nAction recommandée : relancer par téléphone en rappelant le bénéfice principal (sécurité, conformité, esthétique selon le dossier).`,
        followUps: [
          { id: 'status_devis_prepare_relance', label: 'Préparer une relance' },
          ...FOLLOW_UP_GENERIC,
        ],
      };
    }
    case 'dash_acomptes': {
      const demandes = findByStatus(projects, 'Acompte demandé');
      const payes = findByStatus(projects, 'Acompte payé');
      const lines: string[] = [];
      if (demandes.length) lines.push(`${demandes.length} acompte(s) demandé(s) non réglé(s) : ${demandes.map(client).join(', ')}. À relancer si le délai dépasse une semaine.`);
      if (payes.length) lines.push(`${payes.length} acompte(s) réglé(s) récemment : ${payes.map(client).join(', ')}. Chantier sécurisé, à planifier.`);
      if (!lines.length) lines.push('Aucun acompte en attente actuellement.');
      return { text: lines.join('\n'), followUps: FOLLOW_UP_GENERIC };
    }
    case 'dash_ca_bloque': {
      const bloques = [...findByStatus(projects, 'Devis envoyé'), ...findByStatus(projects, 'Acompte demandé')];
      return {
        text: `Le chiffre d’affaires en attente est bloqué sur ${bloques.length} dossier(s) : ${bloques.map((p) => `${client(p)} (${p.status})`).join(', ')}.\nCe qui bloque : décision client en attente sur les devis envoyés, paiement en attente sur les acomptes demandés.\nAction recommandée : relancer chacun individuellement plutôt que d’attendre un retour spontané.`,
        followUps: FOLLOW_UP_GENERIC,
      };
    }
    case 'dash_today': {
      const late = projects.find((p) => p.followUp?.status === 'late') || projects.find((p) => p.followUp?.status === 'today');
      if (!late) return { text: 'Aucune action urgente identifiée aujourd’hui, vous pouvez avancer sur vos dossiers en cours.', followUps: FOLLOW_UP_GENERIC };
      return {
        text: `Priorité du jour : ${client(late)} (${late.status}).\nRaison : ${late.followUp?.reason || 'action de suivi à réaliser'}.\nAction recommandée : contacter le client par ${late.followUp?.channel === 'email' ? 'e-mail' : 'téléphone'} dès aujourd’hui.`,
        followUps: FOLLOW_UP_GENERIC,
      };
    }
    case 'comm_chaud': {
      const hot = findByStatus(projects, 'Devis envoyé')[0] || findByStatus(projects, 'Acompte demandé')[0];
      if (!hot) return { text: 'Aucun dossier particulièrement chaud actuellement.', followUps: FOLLOW_UP_GENERIC };
      return {
        text: `${client(hot)} (${hot.projectType}) est un dossier chaud : ${hot.status === 'Devis envoyé' ? 'le devis a été consulté plusieurs fois sans engagement, le client est intéressé mais hésite.' : 'le devis est accepté et l’acompte demandé, il ne manque qu’une confirmation de paiement pour sécuriser le chantier.'}\nAction recommandée : le recontacter en priorité avant que l’intérêt ne retombe.`,
        followUps: FOLLOW_UP_GENERIC,
      };
    }
    case 'comm_risque': {
      const late = projects.filter((p) => p.followUp?.status === 'late' || p.followUp?.status === 'today');
      if (!late.length) return { text: 'Aucun prospect ne semble risquer de vous échapper pour le moment.', followUps: FOLLOW_UP_GENERIC };
      return {
        text: `Prospects à risque : ${late.map((p) => client(p)).join(', ')}.\nCe sont des dossiers avec une relance en retard ou due aujourd’hui : plus l’attente se prolonge, plus le client risque de se tourner vers un concurrent.\nAction recommandée : les recontacter dans la journée.`,
        followUps: FOLLOW_UP_GENERIC,
      };
    }
    case 'comm_rapide': {
      const quick = projects.filter((p) => p.status === 'Devis accepté' || p.status === 'Acompte payé');
      if (!quick.length) return { text: 'Aucun dossier prêt à générer du chiffre rapidement pour le moment.', followUps: FOLLOW_UP_GENERIC };
      return {
        text: `Dossiers pouvant générer du chiffre rapidement : ${quick.map((p) => `${client(p)} (${money(p.devisAmount)})`).join(', ')}.\nCe sont des devis déjà acceptés : il ne reste qu’à sécuriser l’acompte et planifier le chantier.`,
        followUps: FOLLOW_UP_GENERIC,
      };
    }
    case 'comm_bloque': {
      const stuck = findByStatus(projects, 'Acompte demandé');
      if (!stuck.length) return { text: 'Aucun dossier ne semble bloqué actuellement.', followUps: FOLLOW_UP_GENERIC };
      return {
        text: `Dossiers bloqués : ${stuck.map(client).join(', ')}.\nRaison : acompte demandé mais non réglé, le chantier ne peut pas être planifié tant que le paiement n’est pas confirmé.\nAction recommandée : relancer poliment avec un rappel du créneau réservé.`,
        followUps: FOLLOW_UP_GENERIC,
      };
    }
    case 'agenda_prepare_rdv': {
      const withAppointment = projects.filter((p) => p.appointment?.start);
      const next = withAppointment.sort((a, b) => new Date(a.appointment!.start).getTime() - new Date(b.appointment!.start).getTime())[0];
      if (!next) return { text: 'Aucun rendez-vous à préparer actuellement.', followUps: FOLLOW_UP_GENERIC };
      return {
        text: `Prochain rendez-vous à préparer : ${client(next)} (${next.projectType}), le ${new Date(next.appointment!.start).toLocaleDateString('fr-FR')}.\nÀ préparer : relire le dossier, vérifier les informations manquantes et prévoir le matériel nécessaire.`,
        followUps: FOLLOW_UP_GENERIC,
      };
    }
    case 'agenda_creneau_urgent': {
      const urgent = projects.find((p) => p.status === 'Nouveau' && p.maturity === 'Urgent');
      if (!urgent) return { text: 'Aucun dossier ne nécessite un créneau en urgence pour le moment.', followUps: FOLLOW_UP_GENERIC };
      return {
        text: `${client(urgent)} (${urgent.projectType}) nécessite un créneau rapidement : dossier signalé urgent, sans intervention planifiée.\nAction recommandée : rappeler dans la journée pour proposer un créneau.`,
        followUps: FOLLOW_UP_GENERIC,
      };
    }
    case 'agenda_planifier_chantier': {
      const toPlan = projects.filter((p) => p.status === 'Acompte payé' || p.status === 'Devis accepté');
      if (!toPlan.length) return { text: 'Aucun chantier à planifier pour le moment.', followUps: FOLLOW_UP_GENERIC };
      return {
        text: `Chantiers à planifier : ${toPlan.map(client).join(', ')}.\nCe sont des dossiers avec devis accepté ou acompte réglé : la prochaine étape est de fixer une date d’intervention avec le client.`,
        followUps: FOLLOW_UP_GENERIC,
      };
    }
    default:
      return undefined;
  }
}

function settingsAnswer(questionId: string): DemoAssistantAnswer | undefined {
  switch (questionId) {
    case 'set_profil':
      return {
        text: 'Votre Profil métier est globalement complet mais peut être affiné.\n- Les prestations secondaires sont bien renseignées.\n- Les zones prioritaires et exclues sont définies.\n- Les tarifs horaires et de diagnostic sont à jour.\nAction recommandée : vérifiez que les marques préférées et évitées reflètent bien vos habitudes actuelles pour affiner les devis générés automatiquement.',
        followUps: FOLLOW_UP_GENERIC,
      };
    case 'set_qualif':
      return {
        text: 'Vos questions de qualification couvrent l’essentiel (budget, délai, description).\n- Elles pourraient être complétées par une question sur l’accès au chantier.\n- Une question sur l’urgence perçue par le client aiderait à mieux prioriser.\nAction recommandée : ajoutez 1 à 2 questions ciblées dans votre configuration de qualification.',
        followUps: FOLLOW_UP_GENERIC,
      };
    case 'set_prestations':
      return {
        text: 'Votre catalogue de prestations est actif avec plusieurs prestations en ligne.\n- La plupart ont un prix de départ clair.\n- Une prestation est désactivée (rénovation électrique complète) : à réactiver si vous la proposez encore.\nAction recommandée : vérifiez que chaque prestation active a un prix ou une mention "sur devis" à jour.',
        followUps: FOLLOW_UP_GENERIC,
      };
    case 'set_manque':
      return {
        text: 'Pour mieux qualifier les demandes entrantes, il manque surtout des précisions systématiques sur :\n- Le budget exact du client (souvent flou en entrée).\n- La disponibilité pour une visite technique.\n- Les photos du besoin (pas toujours fournies).\nAction recommandée : rendez ces 3 champs plus visibles dans votre widget de prise de contact.',
        followUps: FOLLOW_UP_GENERIC,
      };
    default:
      return undefined;
  }
}

function projectGenericAnswer(questionId: string, project: DemoProject): DemoAssistantAnswer | undefined {
  const c = client(project);
  switch (questionId) {
    case 'proj_summary':
      return {
        text: `Dossier ${project.projectNumber} — ${c}, ${project.projectType}.\nStatut : ${project.status}. Budget : ${project.budget || 'non renseigné'}.\n${project.aiSummary}`,
        followUps: FOLLOW_UP_PROJECT,
      };
    case 'proj_next_action':
      return { text: nextActionText(project), followUps: FOLLOW_UP_PROJECT };
    case 'proj_missing_info': {
      const score = project.completenessScore ?? 0;
      const missing: string[] = [];
      if (!project.budget || project.budget.toLowerCase().includes('non renseign')) missing.push('budget précis');
      if (!project.photos?.length) missing.push('photos du chantier');
      if (!project.appointment?.start) missing.push('rendez-vous technique');
      return {
        text: `Complétude du dossier : ${score} %.${missing.length ? `\nInformations manquantes : ${missing.join(', ')}.` : '\nLe dossier est complet, aucune information critique ne manque.'}\nAction recommandée : ${missing.length ? 'compléter ces éléments avant d’avancer.' : 'vous pouvez avancer sereinement sur ce dossier.'}`,
        followUps: FOLLOW_UP_PROJECT,
      };
    }
    case 'proj_prepare_message':
      return buildMessageAnswer(project);
    case 'proj_why_priority':
      return { text: whyPriorityText(project), followUps: FOLLOW_UP_PROJECT };
    default:
      return undefined;
  }
}

function nextActionText(project: DemoProject): string {
  const c = client(project);
  switch (project.status) {
    case 'Nouveau':
      return `Prochaine étape : rappeler ${c} rapidement pour qualifier le besoin et proposer un créneau.`;
    case 'Qualifié':
      return `Prochaine étape : préparer et envoyer le devis à ${c} pendant que le dossier est chaud.`;
    case 'Devis envoyé':
      return `Prochaine étape : relancer ${c}, le devis a été consulté sans validation.`;
    case 'Devis accepté':
      return `Prochaine étape : demander l’acompte à ${c} pour sécuriser la commande et planifier le chantier.`;
    case 'Acompte demandé':
      return `Prochaine étape : relancer ${c} pour le paiement de l’acompte, le créneau n’est pas encore garanti.`;
    case 'Acompte payé':
      return `Prochaine étape : planifier une date d’intervention avec ${c}, le dossier est sécurisé.`;
    case 'En cours':
      return `Prochaine étape : confirmer les derniers détails avec ${c} avant le rendez-vous technique.`;
    case 'Réalisation du projet':
      return `Prochaine étape : suivre le bon déroulement du chantier de ${c} et préparer la clôture.`;
    case 'Perdu':
      return `Ce dossier est clôturé : aucune action supplémentaire recommandée pour ${c}.`;
    case 'Gagné':
      return `Prochaine étape : demander un avis client à ${c} pour capitaliser sur cette réussite.`;
    default:
      return `Suivez l’avancement du dossier ${c} et tenez le client informé des prochaines étapes.`;
  }
}

function whyPriorityText(project: DemoProject): string {
  const c = client(project);
  switch (project.status) {
    case 'Nouveau':
      return `Ce dossier est prioritaire parce qu’il vient d’arriver et que ${project.maturity === 'Urgent' ? 'le client signale une situation urgente' : 'un premier contact rapide augmente les chances de le qualifier'}.\nÀ faire :\n- Rappeler ${c} rapidement.\n- Qualifier précisément le besoin et le budget.\n- Proposer un créneau d’intervention.`;
    case 'Devis envoyé':
      return `Ce dossier est prioritaire parce que le devis est déjà envoyé et que ${c} a manifesté de l’intérêt.\nÀ faire :\n- Relancer aujourd’hui.\n- Rappeler le bénéfice clé du projet.\n- Proposer un créneau d’intervention.`;
    case 'Acompte demandé':
      return `Ce dossier est prioritaire parce que le devis est accepté mais l’acompte n’est pas encore réglé : le chantier n’est pas sécurisé.\nÀ faire :\n- Relancer ${c} pour le paiement.\n- Rappeler que le créneau est réservé sous condition de règlement.`;
    default:
      return `Ce dossier mérite votre attention parce qu’il est au statut "${project.status}", qui appelle une action précise avant de passer au suivant.\nOuvrez la fiche pour voir le détail de l’action recommandée.`;
  }
}

function buildMessageAnswer(project: DemoProject): DemoAssistantAnswer {
  const c = project.clientFirstName;
  let message = '';
  switch (project.status) {
    case 'Devis envoyé':
      message = `Bonjour ${c}, je me permets de revenir vers vous concernant le devis pour ${project.projectType.toLowerCase()}. Je peux vous réserver un créneau cette semaine si vous souhaitez avancer.`;
      break;
    case 'Acompte demandé':
      message = `Bonjour ${c}, je reviens vers vous concernant l’acompte pour votre projet. Le créneau est réservé, n’hésitez pas si vous avez besoin d’aide pour finaliser le règlement en ligne.`;
      break;
    case 'Nouveau':
      message = `Bonjour ${c}, merci pour votre message. Pouvez-vous me préciser votre disponibilité et votre budget approximatif afin que je puisse vous proposer un créneau rapidement ?`;
      break;
    case 'Gagné':
      message = `Bonjour ${c}, ravi que l’intervention se soit bien passée ! Si vous êtes satisfait, un avis Google nous aiderait beaucoup, merci d’avance.`;
      break;
    default:
      message = `Bonjour ${c}, je reviens vers vous au sujet de votre dossier ${project.projectType.toLowerCase()}. N’hésitez pas à me tenir informé de vos disponibilités.`;
  }
  return {
    text: `Message prêt à copier :\n${message}`,
    copyMessage: message,
    followUps: FOLLOW_UP_PROJECT,
  };
}

function projectStatusAnswer(questionId: string, project: DemoProject): DemoAssistantAnswer | undefined {
  const c = client(project);
  switch (questionId) {
    // Nouveau
    case 'status_nouveau_questions':
      return { text: `Pour qualifier ce dossier, demandez à ${c} :\n- Le budget approximatif disponible.\n- La disponibilité pour une visite ou une intervention.\n- La localisation précise et l’accès au logement.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_nouveau_urgent':
      return { text: `${project.maturity === 'Urgent' ? `Oui, ce dossier est signalé urgent (${project.desiredTimeline}).` : 'Ce dossier ne semble pas critique dans l’immédiat.'}\nAction recommandée : rappeler ${c} rapidement pour confirmer l’ampleur du besoin.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_nouveau_qualifier':
      return { text: `Pour qualifier rapidement : appelez ${c} plutôt que d’attendre un échange écrit, confirmez le budget et l’urgence en 2-3 questions, puis proposez un créneau immédiatement.`, followUps: FOLLOW_UP_PROJECT };
    // Qualifié
    case 'status_qualifie_pret':
      return { text: `Oui, le dossier de ${c} est complet (complétude ${project.completenessScore ?? 'N/A'} %) : budget, délai et contraintes sont connus. Vous pouvez préparer le devis.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_qualifie_postes':
      return { text: `Pour ce type de projet (${project.projectType}), prévoyez au devis : la dépose/préparation, la fourniture du matériel principal, la pose/installation, et les finitions ou essais de conformité.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_qualifie_risque':
      return { text: `Le principal risque commercial est de laisser refroidir un dossier bien qualifié : plus le devis tarde, plus le client risque de comparer avec un concurrent. Envoyez le devis rapidement.`, followUps: FOLLOW_UP_PROJECT };
    // Devis envoyé
    case 'status_devis_relancer':
      return { text: `Oui : ${c} a consulté le devis sans encore valider. Une relance courte aujourd’hui est recommandée pour ne pas perdre l’élan.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_devis_prepare_relance':
      return buildMessageAnswer(project);
    case 'status_devis_argument':
      return { text: `Argument à utiliser avec ${c} : rappelez le bénéfice principal du projet (sécurité, conformité, confort selon le cas) et proposez un créneau concret pour lever l’hésitation.`, followUps: FOLLOW_UP_PROJECT };
    // Devis accepté
    case 'status_accepte_etape':
      return { text: `Prochaine étape pour ${c} : demander l’acompte, puis planifier la visite ou l’intervention.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_accepte_acompte':
      return { text: `Oui, demandez un acompte à ${c} dès maintenant pour sécuriser la commande et réserver le créneau de chantier.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_accepte_securiser':
      return { text: `Pour sécuriser le chantier de ${c} : demandez l’acompte, confirmez sa disponibilité, et verrouillez une date d’intervention par écrit.`, followUps: FOLLOW_UP_PROJECT };
    // Acompte demandé
    case 'status_acompte_relancer':
      return { text: `Oui : l’acompte demandé à ${c} n’est pas encore réglé. Le chantier n’est pas sécurisé tant que le paiement n’est pas confirmé.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_acompte_prepare_relance':
      return buildMessageAnswer(project);
    case 'status_acompte_risque':
      return { text: `Si vous attendez, le créneau réservé pour ${c} pourrait être remis en question et le chantier retardé. Une relance rapide et polie limite ce risque.`, followUps: FOLLOW_UP_PROJECT };
    // Acompte payé
    case 'status_paye_maintenant':
      return { text: `L’acompte de ${c} est réglé : planifiez maintenant l’intervention et préparez le matériel nécessaire.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_paye_planifier':
      return { text: `Proposez à ${c} 2-3 créneaux d’intervention et confirmez la date par écrit pour éviter tout malentendu.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_paye_preparer_client':
      return buildMessageAnswer(project);
    // En cours
    case 'status_encours_preparer_rdv':
      return { text: `Avant le rendez-vous avec ${c}, relisez le dossier et vérifiez les points signalés récemment (accès, contraintes techniques particulières).`, followUps: FOLLOW_UP_PROJECT };
    case 'status_encours_confirmer':
      return { text: `À confirmer avec ${c} : les dimensions/surfaces exactes, les choix de finition, l’accès au logement, et les zones à protéger pendant l’intervention.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_encours_message':
      return buildMessageAnswer(project);
    // Réalisation
    case 'status_realisation_suivre':
      return { text: `Suivez le chantier de ${c} en vérifiant l’accès à chaque étape et en documentant l’avancement par des photos.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_realisation_dire':
      return { text: `Tenez ${c} informé de l’avancement à chaque étape clé, cela rassure et prépare une bonne clôture de dossier.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_realisation_cloturer':
      return { text: `Clôturez le dossier de ${c} une fois les travaux terminés, validés par le client et les photos finales prises.`, followUps: FOLLOW_UP_PROJECT };
    // Perdu
    case 'status_perdu_pourquoi':
      return { text: `Ce dossier est perdu : ${project.quote?.declineReason || 'le client a décliné le devis'}.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_perdu_apprendre':
      return { text: `À retenir : le budget du client n’était pas suffisamment cadré avant l’envoi du devis. Une meilleure qualification en amont aurait pu éviter la déception.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_perdu_eviter':
      return { text: `Pour éviter ce cas à l’avenir : demandez une fourchette de budget claire dès le premier contact, et proposez une alternative moins coûteuse si le budget semble limité.`, followUps: FOLLOW_UP_PROJECT };
    // Gagné
    case 'status_gagne_action':
      return { text: `Après ce chantier réussi pour ${c} : demandez un avis client pendant que la satisfaction est encore fraîche.`, followUps: FOLLOW_UP_PROJECT };
    case 'status_gagne_avis':
      return buildMessageAnswer(project);
    case 'status_gagne_retenir':
      return { text: `Ce dossier est un bon exemple : besoin clair, devis accepté rapidement, intervention réussie. À reproduire sur des dossiers similaires.`, followUps: FOLLOW_UP_PROJECT };
    default:
      return undefined;
  }
}

const FALLBACK_ANSWER: DemoAssistantAnswer = {
  text: 'Je n’ai pas de réponse préconfigurée pour cette question dans cette démonstration. En production, l’assistant peut répondre librement sur vos propres dossiers.',
  followUps: FOLLOW_UP_GENERIC,
};

export function getDemoAssistantAnswer(questionId: string, ctx: AnswerContext): DemoAssistantAnswer {
  if (questionId === 'followup_next_action' && ctx.project) {
    return { text: nextActionText(ctx.project), followUps: FOLLOW_UP_PROJECT };
  }
  if (questionId === 'followup_message' && ctx.project) {
    return buildMessageAnswer(ctx.project);
  }
  if (questionId === 'followup_message' && !ctx.project) {
    return {
      text: 'Ouvrez un dossier pour préparer un message client contextualisé.',
      followUps: FOLLOW_UP_GENERIC,
    };
  }
  if (questionId === 'followup_risks') {
    if (ctx.project) return { text: whyPriorityText(ctx.project), followUps: FOLLOW_UP_PROJECT };
    return dashboardAnswer('dash_ca_bloque', ctx.projects) || FALLBACK_ANSWER;
  }
  if (questionId === 'followup_other_example' && ctx.project) {
    const other = ctx.projects.find((p) => p.status === ctx.project!.status && p.id !== ctx.project!.id) || ctx.projects.find((p) => p.id !== ctx.project!.id);
    if (other) {
      return {
        text: `Autre exemple similaire : ${client(other)} (${other.projectType}, statut ${other.status}). ${other.aiSummary}`,
        followUps: FOLLOW_UP_PROJECT,
      };
    }
  }
  if (questionId === 'followup_back') {
    return {
      text: 'Voici les suggestions disponibles pour cette page.',
      followUps: [],
    };
  }

  if (ctx.project) {
    const generic = projectGenericAnswer(questionId, ctx.project);
    if (generic) return generic;
    const statusSpecific = projectStatusAnswer(questionId, ctx.project);
    if (statusSpecific) return statusSpecific;
  }

  const dashboard = dashboardAnswer(questionId, ctx.projects);
  if (dashboard) return dashboard;

  const settings = settingsAnswer(questionId);
  if (settings) return settings;

  return FALLBACK_ANSWER;
}
