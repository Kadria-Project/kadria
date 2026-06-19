import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUser } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'

type Theme = 'dark' | 'light'

function toAirtableTheme(theme: Theme): string {
  return theme === 'light' ? 'Clair' : 'Sombre'
}

function fromAirtableTheme(value: string | undefined): Theme {
  return value === 'Clair' ? 'light' : 'dark'
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const user = await getUserById(session.id)
    const theme = fromAirtableTheme(user?.theme)
    return NextResponse.json({ success: true, theme })
  } catch (error) {
    console.error('[USER THEME GET]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    if (body.theme !== 'dark' && body.theme !== 'light') {
      return NextResponse.json(
        { success: false, error: 'Thème invalide' },
        { status: 400 }
      )
    }

    await updateUser(session.id, { Theme: toAirtableTheme(body.theme) })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[USER THEME PATCH]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
