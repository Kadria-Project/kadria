// Source unique pour la génération/récupération du token opaque du portail
// client (Projects.client_portal_token) et la construction de l'URL publique
// correspondante (/client/projet/[token]). Toute route ou service qui a
// besoin du lien du portail client doit passer par ces helpers plutôt que de
// réimplémenter sa propre logique de token (même convention que
// sms_completion_token).

import { randomBytes } from 'crypto'
import { TABLES } from '@/src/lib/airtable'
import { getBaseUrl } from '@/src/lib/base-url'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export function buildClientPortalUrl(token: string): string {
  return `${getBaseUrl()}/client/projet/${token}`
}

// Génère paresseusement (si besoin) et renvoie le token opaque du portail
// client pour un projet donné. artisanId sert uniquement de garde-fou pour
// s'assurer qu'on ne touche que les projets de l'artisan attendu (jamais
// exposé dans l'URL publique, qui ne contient que le token).
export async function ensureClientPortalToken(
  projectId: string,
  artisanId: string,
): Promise<string | null> {
  if (!projectId || !artisanId) return null

  try {
    const { data: project, error } = await supabaseAdmin
      .from(TABLES.projects)
      .select('id, client_portal_token')
      .eq('id', projectId)
      .eq('artisan_id', artisanId)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!project) return null

    let token = project.client_portal_token as string | null
    if (token) return token

    token = randomBytes(24).toString('hex')
    const { error: updateError } = await supabaseAdmin
      .from(TABLES.projects)
      .update({ client_portal_token: token })
      .eq('id', project.id)
      .eq('artisan_id', artisanId)

    if (updateError) throw updateError

    return token
  } catch (e) {
    console.error('[CLIENT-PORTAL] ensureClientPortalToken failed:', e instanceof Error ? e.message : String(e))
    return null
  }
}

// Combine ensureClientPortalToken + buildClientPortalUrl. Retourne null si
// le token n'a pas pu être généré/récupéré (jamais d'erreur bloquante pour
// l'appelant, qui doit dégrader proprement - ex : envoyer l'email sans CTA).
export async function getClientPortalUrl(
  projectId: string,
  artisanId: string,
): Promise<string | null> {
  const token = await ensureClientPortalToken(projectId, artisanId)
  if (!token) return null
  return buildClientPortalUrl(token)
}
