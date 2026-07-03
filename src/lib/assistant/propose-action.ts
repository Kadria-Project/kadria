import 'server-only'
import { TABLES } from '@/src/lib/airtable'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import {
  PROJECT_STATUS_VALUES,
  WIDGET_COLOR_MODES,
  type ActionType,
  type ProjectStatusValue,
  type WidgetColorMode,
} from '@/src/lib/assistant/actions'

// Détermination déterministe (mots-clés) d'une proposition d'action à partir
// du dernier message de l'artisan. Volontairement simple et explicable,
// dans le même esprit que buildNavigationActions dans
// app/api/kadria-assistant/chat/route.ts : pas de function-calling LLM en
// V1, pour rester prévisible et éviter toute action fragile ou ambiguë.
//
// N'émet une proposition QUE si la cible est identifiable avec une
// confiance raisonnable (couleur hex valide, mode connu, projet identifié
// sans ambiguïté). En cas de doute, retourne null : l'assistant doit alors
// se contenter de répondre par du texte (éventuellement une question de
// clarification), jamais proposer une action approximative.

export interface ProposedAction {
  type: ActionType
  label: string
  summary: string
  payload: Record<string, unknown>
  requiresConfirmation: true
  oldValueHint?: string
  newValueHint?: string
  projectLabel?: string
}

interface WidgetConfigSnapshot {
  welcome_message: string | null
  primary_color: string | null
  secondary_color: string | null
  widget_color_mode: string | null
}

async function getWidgetConfigSnapshot(artisanId: string): Promise<WidgetConfigSnapshot | null> {
  const { data } = await supabaseAdmin
    .from(TABLES.artisanConfig)
    .select('welcome_message, primary_color, secondary_color, widget_color_mode')
    .eq('artisan_id', artisanId)
    .maybeSingle()
  return (data as WidgetConfigSnapshot | null) || null
}

interface ProjectMatch {
  id: string
  client_name: string | null
  status: string | null
}

// Cherche un unique projet de l'artisan dont le nom du client contient le
// terme recherché. Si 0 ou >1 résultat, retourne null (ambigu ou introuvable)
// pour ne jamais proposer une action sur la mauvaise cible.
async function findUnambiguousProject(artisanId: string, needle: string): Promise<ProjectMatch | null> {
  const trimmed = needle.trim()
  if (trimmed.length < 2) return null

  const { data, error } = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, client_name, status')
    .eq('artisan_id', artisanId)
    .ilike('client_name', `%${trimmed}%`)
    .limit(5)

  if (error || !data || data.length !== 1) return null
  return data[0] as ProjectMatch
}

// Extrait un nom de dossier/client depuis une phrase du type
// "... dossier Dupont ..." ou "... client Dupont ...".
function extractProjectNameHint(text: string): string | null {
  const match = /(?:dossier|client|projet)\s+(?:de\s+)?([a-zàâäéèêëïîôöùûüç' -]{2,40})/i.exec(text)
  if (!match) return null
  // Coupe au premier connecteur de ponctuation/mot de liaison courant.
  return match[1].split(/[:.,]| pour | avec | qui | que /i)[0].trim()
}

function extractQuotedOrTrailingText(text: string): string | null {
  const quoted = /["«]([^"»]{3,300})["»]/.exec(text)
  if (quoted) return quoted[1].trim()

  const afterDire = /(?:pour dire que|pour dire|qui dit|disant que)\s+(.+)$/i.exec(text)
  if (afterDire) return afterDire[1].trim().replace(/[."]+$/, '')

  return null
}

function parseRelativeOrFrenchDate(text: string): string | null {
  const now = new Date()
  const lower = text.toLowerCase()

  if (/après-demain|apres-demain/.test(lower)) {
    const d = new Date(now)
    d.setDate(d.getDate() + 2)
    return d.toISOString().slice(0, 10)
  }
  if (/demain/.test(lower)) {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }

  const isoMatch = /(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (isoMatch) return isoMatch[0]

  const frMatch = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text)
  if (frMatch) {
    const [, d, m, y] = frMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return null
}

export async function buildProposedAction(userMessage: string, artisanId: string): Promise<ProposedAction | null> {
  const text = userMessage.trim()
  const lower = text.toLowerCase()

  // 1. Widget : texte d'accueil
  if (/(texte|message)\s+d['e ]?accueil/i.test(text) && /(change|changer|modifie|modifier|remplace|remplacer|mets|mettre)/i.test(lower)) {
    const newText = extractQuotedOrTrailingText(text)
    if (newText && newText.length > 0 && newText.length <= 300) {
      const widget = await getWidgetConfigSnapshot(artisanId)
      return {
        type: 'update_widget_welcome_text',
        label: "Modifier le texte d'accueil du widget",
        summary: `Remplacer le texte d'accueil actuel par : « ${newText} »`,
        payload: { newValue: newText },
        requiresConfirmation: true,
        oldValueHint: widget?.welcome_message || '(aucun texte configuré)',
        newValueHint: newText,
      }
    }
    return null
  }

  // 2. Widget : mode visuel
  if (/(widget|assistant|couleur|th[eè]me|mode)/i.test(lower) && /(sombre|premium|immersi|sobre|sobriet[ée])/i.test(lower)) {
    let target: WidgetColorMode | null = null
    if (/premium/.test(lower) || (/sombre/.test(lower) && /premium/.test(lower))) target = 'premium_dark'
    else if (/immersi/.test(lower)) target = 'immersive'
    else if (/sobre|sobriet[ée]/.test(lower)) target = 'sobriety'

    if (target && (WIDGET_COLOR_MODES as readonly string[]).includes(target)) {
      const widget = await getWidgetConfigSnapshot(artisanId)
      const current = widget?.widget_color_mode || 'sobriety'
      if (current === target) return null
      return {
        type: 'update_widget_color_mode',
        label: 'Modifier le mode visuel du widget',
        summary: `Passer le mode visuel du widget de « ${current} » à « ${target} »`,
        payload: { newValue: target },
        requiresConfirmation: true,
        oldValueHint: current,
        newValueHint: target,
      }
    }
  }

  // 3. Widget : couleur principale / secondaire (nécessite un code hex explicite)
  const hexMatch = /#[0-9a-fA-F]{6}\b/.exec(text)
  if (hexMatch && /(couleur|widget)/i.test(lower)) {
    const isSecondary = /secondaire/i.test(lower)
    const widget = await getWidgetConfigSnapshot(artisanId)
    if (isSecondary) {
      return {
        type: 'update_widget_secondary_color',
        label: 'Modifier la couleur secondaire du widget',
        summary: `Remplacer la couleur secondaire par ${hexMatch[0]}`,
        payload: { newValue: hexMatch[0] },
        requiresConfirmation: true,
        oldValueHint: widget?.secondary_color || '#18181b',
        newValueHint: hexMatch[0],
      }
    }
    return {
      type: 'update_widget_primary_color',
      label: 'Modifier la couleur principale du widget',
      summary: `Remplacer la couleur principale par ${hexMatch[0]}`,
      payload: { newValue: hexMatch[0] },
      requiresConfirmation: true,
      oldValueHint: widget?.primary_color || '#22c55e',
      newValueHint: hexMatch[0],
    }
  }

  // 4. Projet : note interne
  if (/\b(ajoute|ajouter|note)\b/i.test(lower) && /note/i.test(lower)) {
    const nameHint = extractProjectNameHint(text)
    if (nameHint) {
      const project = await findUnambiguousProject(artisanId, nameHint)
      if (project) {
        const noteMatch = /:\s*(.+)$/.exec(text)
        const noteText = noteMatch ? noteMatch[1].trim() : null
        if (noteText && noteText.length > 0 && noteText.length <= 2000) {
          return {
            type: 'add_project_note',
            label: 'Ajouter une note interne au dossier',
            summary: `Ajouter la note suivante au dossier ${project.client_name || nameHint} : « ${noteText} »`,
            payload: { projectId: project.id, note: noteText },
            requiresConfirmation: true,
            projectLabel: project.client_name || nameHint,
            newValueHint: noteText,
          }
        }
      }
    }
    return null
  }

  // 5. Projet : changement de statut
  if (/(statut|status)/i.test(lower) && /(dossier|projet|client)/i.test(lower)) {
    const nameHint = extractProjectNameHint(text)
    const statusMatch = (PROJECT_STATUS_VALUES as readonly string[]).find((s) => lower.includes(s.toLowerCase()))
    if (nameHint && statusMatch) {
      const project = await findUnambiguousProject(artisanId, nameHint)
      if (project) {
        return {
          type: 'update_project_status',
          label: 'Modifier le statut du dossier',
          summary: `Passer le dossier ${project.client_name || nameHint} du statut « ${project.status || 'Nouveau'} » à « ${statusMatch} »`,
          payload: { projectId: project.id, newStatus: statusMatch as ProjectStatusValue },
          requiresConfirmation: true,
          projectLabel: project.client_name || nameHint,
          oldValueHint: project.status || 'Nouveau',
          newValueHint: statusMatch,
        }
      }
    }
    return null
  }

  // 6. Projet : relance (création)
  if (/(relance|relancer|rappel)/i.test(lower) && !/annule|désactive|desactive|supprime/i.test(lower)) {
    const nameHint = extractProjectNameHint(text)
    const date = parseRelativeOrFrenchDate(text)
    if (nameHint && date) {
      const project = await findUnambiguousProject(artisanId, nameHint)
      if (project) {
        return {
          type: 'create_project_followup',
          label: 'Programmer une relance sur le dossier',
          summary: `Programmer une relance sur le dossier ${project.client_name || nameHint} pour le ${date}`,
          payload: { projectId: project.id, date },
          requiresConfirmation: true,
          projectLabel: project.client_name || nameHint,
          newValueHint: date,
        }
      }
    }
    return null
  }

  // 7. Projet : désactivation de relance
  if (/(relance|rappel)/i.test(lower) && /annule|désactive|desactive|supprime/i.test(lower)) {
    const nameHint = extractProjectNameHint(text)
    if (nameHint) {
      const project = await findUnambiguousProject(artisanId, nameHint)
      if (project) {
        return {
          type: 'disable_project_followup',
          label: 'Désactiver la relance du dossier',
          summary: `Désactiver la relance programmée sur le dossier ${project.client_name || nameHint}`,
          payload: { projectId: project.id },
          requiresConfirmation: true,
          projectLabel: project.client_name || nameHint,
        }
      }
    }
    return null
  }

  return null
}
