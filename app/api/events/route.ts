import { NextRequest, NextResponse } from 'next/server'
import { getEvents, createEvent } from '@/src/lib/airtable'
import { requireFeatureAccess } from '@/src/lib/auth-utils'

export async function GET() {
  try {
    const access = await requireFeatureAccess('calendar')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const events = await getEvents(access.session.artisanId)
    return NextResponse.json({ success: true, events })
  } catch (error) {
    console.error('[EVENTS GET]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireFeatureAccess('calendar')
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const body = await request.json()
    const result = await createEvent({
      ...body,
      artisanId: access.session.artisanId,
    })

    return NextResponse.json({ success: true, event: result })
  } catch (error) {
    console.error('[EVENTS POST]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
