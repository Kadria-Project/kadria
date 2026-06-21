import { NextRequest, NextResponse } from 'next/server'
import { getEventById, updateEvent, deleteEvent } from '@/src/lib/airtable'
import { requireFeatureAccess } from '@/src/lib/auth-utils'

async function getAuthorizedEvent(id: string, artisanId: string) {
  const event = await getEventById(id)

  if (!event) {
    return { status: 404 as const }
  }

  if (event.artisanId !== artisanId) {
    return { status: 403 as const }
  }

  return { status: 200 as const, event }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireFeatureAccess('calendar')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const { id } = await params
    const result = await getAuthorizedEvent(id, access.session.artisanId)
    if (result.status === 404) {
      return NextResponse.json({ success: false, error: 'Evenement introuvable' }, { status: 404 })
    }
    if (result.status === 403) {
      return NextResponse.json({ success: false, error: 'Acces non autorise' }, { status: 403 })
    }

    return NextResponse.json({ success: true, event: result.event })
  } catch (error) {
    console.error('[EVENT GET]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireFeatureAccess('calendar')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const { id } = await params
    const result = await getAuthorizedEvent(id, access.session.artisanId)
    if (result.status === 404) {
      return NextResponse.json({ success: false, error: 'Evenement introuvable' }, { status: 404 })
    }
    if (result.status === 403) {
      return NextResponse.json({ success: false, error: 'Acces non autorise' }, { status: 403 })
    }

    const body = await request.json()
    delete body['Artisan ID']
    delete body.artisanId
    delete body.artisan_id

    const updated = await updateEvent(id, body)
    return NextResponse.json({ success: true, event: updated })
  } catch (error) {
    console.error('[EVENT PATCH]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireFeatureAccess('calendar')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const { id } = await params
    const result = await getAuthorizedEvent(id, access.session.artisanId)
    if (result.status === 404) {
      return NextResponse.json({ success: false, error: 'Evenement introuvable' }, { status: 404 })
    }
    if (result.status === 403) {
      return NextResponse.json({ success: false, error: 'Acces non autorise' }, { status: 403 })
    }

    await deleteEvent(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[EVENT DELETE]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
