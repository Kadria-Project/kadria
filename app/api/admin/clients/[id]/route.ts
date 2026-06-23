import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUser } from '@/src/lib/airtable'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { normalizePlan } from '@/src/lib/plans'
import { getMonthlyUsageSummary } from '@/src/lib/usage/quotas'
import { computeClientHealth, getClientHealthLabel } from '@/src/lib/admin/clientHealth'

function timestampEntry(adminEmail: string, text: string) {
  const date = new Date().toLocaleString('fr-FR')
  return `[${date}] (${adminEmail}) ${text}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params

  try {
    const user = await getUserById(id)
    if (!user) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    const plan = normalizePlan(user.plan)
    const usageResult = user.artisanId ? await getMonthlyUsageSummary(user.artisanId) : null
    const usage = usageResult?.success ? usageResult.data : null

    const health = computeClientHealth({
      plan,
      statut: user.statut || 'Actif',
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      usage: usage ? { projects: usage.projects, vapi: usage.vapi, devis: usage.devis } : null,
    })

    return NextResponse.json({
      ...user,
      usage,
      health: {
        status: health.status,
        label: getClientHealthLabel(health.status),
        reasons: health.reasons,
        recommendation: health.recommendation,
      },
    })
  } catch (error) {
    console.error('[ADMIN CLIENT GET]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const ALLOWED_FIELDS: Record<string, string> = {
  plan: 'plan',
  statut: 'statut',
  phone: 'phone',
  company: 'company_name',
  first_name: 'first_name',
  last_name: 'last_name',
  email: 'email',
  siret: 'siret',
  address: 'address',
  trial_end_date: 'trial_end_date',
  subscription_start: 'subscription_start',
  next_billing: 'next_billing',
  notes_admin: 'notes_admin',
  suspended_at: 'suspended_date',
  cancelled_at: 'cancelled_at',
  cancellation_reason: 'cancellation_reason',
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const current = await getUserById(id)
    if (!current) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    const fields: Record<string, unknown> = {}
    for (const [key, supabaseColumn] of Object.entries(ALLOWED_FIELDS)) {
      if (key in body) {
        fields[supabaseColumn] = body[key]
      }
    }

    if (body.history_entry) {
      const existing = current.notesAdmin || ''
      const entry = timestampEntry(session.email, body.history_entry)
      fields['notes_admin'] = existing ? `${existing}\n${entry}` : entry
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    const updated = await updateUser(id, fields)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[ADMIN CLIENT PATCH]', error)
    return NextResponse.json(
      { error: 'Erreur serveur', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
