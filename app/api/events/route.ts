import { NextRequest, NextResponse } from 'next/server'
import { getEvents, createEvent } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    const events = await getEvents(session.artisanId)
    return NextResponse.json({ success: true, events })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    const body = await request.json()
    const result = await createEvent({
      ...body,
      artisanId: session.artisanId,
    })
    return NextResponse.json({ success: true, event: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
