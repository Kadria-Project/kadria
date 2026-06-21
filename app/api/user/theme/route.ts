import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { getSession } from '@/src/lib/auth-utils'

type Theme = 'dark' | 'light'

function normalizeTheme(value: string | null | undefined): Theme {
  return value === 'light' ? 'light' : 'dark'
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.artisanId) {
      return NextResponse.json({ success: true, theme: 'dark' })
    }

    const { data, error } = await supabaseAdmin
      .from('Users')
      .select('theme')
      .eq('artisan_id', session.artisanId)
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    const theme = normalizeTheme(data?.theme as string | undefined)
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
  let artisanId: string | undefined
  try {
    const session = await getSession()
    artisanId = session?.artisanId
    if (!session?.artisanId) {
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

    const { error } = await supabaseAdmin
      .from('Users')
      .update({ theme: body.theme })
      .eq('artisan_id', session.artisanId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[USER THEME PATCH] artisanId:', artisanId, '— error:', message)
    return NextResponse.json(
      { success: false, error: `Échec de la sauvegarde du thème (colonne Supabase "theme" sur Users) : ${message}` },
      { status: 500 }
    )
  }
}
