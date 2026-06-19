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
  let userId: string | undefined
  try {
    const session = await getSession()
    userId = session?.id
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

    const airtableTheme = toAirtableTheme(body.theme)
    await updateUser(session.id, { Theme: airtableTheme })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[USER THEME PATCH] userId:', userId, '— error:', message)
    return NextResponse.json(
      { success: false, error: `Échec de la sauvegarde du thème (champ Airtable "Theme" sur Users) : ${message}` },
      { status: 500 }
    )
  }
}
