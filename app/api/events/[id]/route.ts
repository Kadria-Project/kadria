import { NextRequest, NextResponse } from 'next/server'
import { airtableBase, updateEvent, deleteEvent } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'

async function getAuthorizedEvent(id: string, artisanId: string) {
  let record

  try {
    record = await airtableBase('Events').find(id)
  } catch {
    return { status: 404 as const }
  }

  if (record.fields['Artisan ID'] !== artisanId) {
    return { status: 403 as const }
  }

  return { status: 200 as const, record }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const event = await getAuthorizedEvent(id, session.artisanId)
    if (event.status === 404) {
      return NextResponse.json({ success: false, error: 'Événement introuvable' }, { status: 404 })
    }
    if (event.status === 403) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    delete body['Artisan ID']

    const result = await updateEvent(id, body)
    return NextResponse.json({ success: true, event: result })
  } catch (error) {
    console.error('[EVENT PATCH]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const event = await getAuthorizedEvent(id, session.artisanId)
    if (event.status === 404) {
      return NextResponse.json({ success: false, error: 'Événement introuvable' }, { status: 404 })
    }
    if (event.status === 403) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    await deleteEvent(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[EVENT DELETE]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
