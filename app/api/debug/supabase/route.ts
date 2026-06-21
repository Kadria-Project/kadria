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

const TABLE_CHECKS: Record<DebugCheckKey, string[]> = {
  users: ['Users'],
  projects: ['Projects'],
  planLimits: ['PlanLimits', 'plan_limits'],
  usageMonthly: ['UsageMonthly', 'usage_monthly'],
  usageEvents: ['UsageEvents', 'usage_events'],
  vapiCalls: ['VapiCalls', 'vapi_calls'],
}

function isAuthorized(request: NextRequest) {
  const expectedSecret = process.env.DEBUG_API_SECRET

  if (process.env.NODE_ENV === 'production') {
    if (!expectedSecret) {
      return false
    }
  }

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

async function checkAnyTable(candidates: string[]) {
  for (const table of candidates) {
    if (await checkTable(table)) {
      return true
    }
  }

  return false
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production' && !process.env.DEBUG_API_SECRET
            ? 'DEBUG_API_SECRET requis en production'
            : 'Unauthorized debug access',
        checks: {
          users: false,
        },
      },
      { status: 403 },
    )
  }

  const checks = {} as DebugChecks

  try {
    for (const [key, tables] of Object.entries(TABLE_CHECKS) as Array<[DebugCheckKey, string[]]>) {
      checks[key] = await checkAnyTable(tables)
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
