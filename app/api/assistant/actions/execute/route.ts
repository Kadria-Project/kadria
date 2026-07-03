import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import {
  isKnownActionType,
  validateActionPayload,
  executeAction,
  logAssistantAction,
} from '@/src/lib/assistant/actions'

// SEULE route autorisée à écrire en base pour une action proposée par
// l'Assistant Kadria. Aucune autre route/lot ne doit exécuter d'action
// "assistant-originated". Un clic explicite "Appliquer" côté artisan est
// requis avant tout appel à cette route (voir KadriaAssistantWidget.tsx).
//
// Sécurité multi-tenant : artisan_id n'est JAMAIS accepté depuis le client,
// il est systématiquement dérivé de la session serveur. Chaque exécuteur
// vérifie explicitement la propriété de la ressource ciblée avant écriture.

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !session.artisanId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    let body: { type?: unknown; payload?: unknown; summary?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Corps de requête invalide' }, { status: 400 })
    }

    const type = body?.type
    const payload = body?.payload
    const summary = typeof body?.summary === 'string' ? body.summary.slice(0, 500) : null

    if (!isKnownActionType(type)) {
      return NextResponse.json({ success: false, error: 'Type d\'action non autorisé' }, { status: 400 })
    }

    const validation = validateActionPayload(type, payload)
    if (!validation.valid) {
      await logAssistantAction({
        artisanId: session.artisanId,
        userId: session.id,
        actionType: type,
        status: 'failed',
        summary,
        payload,
        errorMessage: validation.error || 'Payload invalide',
      })
      return NextResponse.json({ success: false, error: validation.error || 'Payload invalide' }, { status: 400 })
    }

    const result = await executeAction(type, payload as Record<string, unknown>, {
      artisanId: session.artisanId,
      userId: session.id,
    })

    if (!result.success) {
      await logAssistantAction({
        artisanId: session.artisanId,
        userId: session.id,
        actionType: type,
        status: 'failed',
        targetType: result.targetType,
        targetId: result.targetId,
        summary,
        payload,
        errorMessage: result.error || 'Échec de l\'exécution',
      })
      return NextResponse.json({ success: false, error: result.error || 'Échec de l\'exécution de l\'action' }, { status: 400 })
    }

    await logAssistantAction({
      artisanId: session.artisanId,
      userId: session.id,
      actionType: type,
      status: 'executed',
      targetType: result.targetType,
      targetId: result.targetId,
      summary,
      oldValue: result.oldValue,
      newValue: result.newValue,
      payload,
    })

    return NextResponse.json({
      success: true,
      oldValue: result.oldValue,
      newValue: result.newValue,
    })
  } catch (error) {
    console.error('[ASSISTANT-ACTIONS-EXECUTE] error', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Une erreur est survenue. Merci de réessayer plus tard.' }, { status: 500 })
  }
}
