import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'

type DebugCheckKey =
  | 'users'
  | 'projects'
  | 'planLimits'
  | 'usageMonthly'
  | 'usageEvents'
  | 'vapiCalls'

type DebugChecks = Record<DebugCheckKey, boolean>

const TABLE_CHECKS: Record<DebugCheckKey, string> = {
  users: 'Users',
  projects: 'Projects',
  planLimits: 'plan_limits',
  usageMonthly: 'usage_monthly',
  usageEvents: 'usage_events',
  vapiCalls: 'vapi_calls',
}

function isAuthorized(request: NextRequest) {
  const expectedSecret = process.env.DEBUG_API_SECRET
  if (!expectedSecret) {
    return true
  }

  const providedSecret =
    request.headers.get('x-debug-secret') ||
    request.nextUrl.searchParams.get('secret')

  return providedSecret === expectedSecret
}

async function checkTable(table: string) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  return !error
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized debug access',
        checks: {
          users: false,
        },
      },
      { status: 401 },
    )
  }

  const checks = {} as DebugChecks

  try {
    for (const [key, table] of Object.entries(TABLE_CHECKS) as Array<[DebugCheckKey, string]>) {
      checks[key] = await checkTable(table)
    }

    const failingChecks = Object.entries(checks)
      .filter(([, ok]) => !ok)
      .map(([key]) => key)

    if (failingChecks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          supabase: 'connected',
          error: `Tables indisponibles ou introuvables : ${failingChecks.join(', ')}`,
          checks,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      supabase: 'connected',
      checks,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur Supabase inconnue',
        checks,
      },
      { status: 500 },
    )
  }
}
