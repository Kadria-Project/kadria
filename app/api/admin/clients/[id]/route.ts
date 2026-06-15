import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUser } from '@/src/lib/airtable'
import { requireAdminSession } from '@/src/lib/auth-utils'

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
    return NextResponse.json(user)
  } catch (error) {
    console.error('[ADMIN CLIENT GET]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const ALLOWED_FIELDS: Record<string, string> = {
  plan: 'Plan',
  statut: 'Statut',
  phone: 'Phone',
  company: 'Company Name',
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  siret: 'SIRET',
  address: 'Address',
  trial_end_date: 'Trial_end_date',
  subscription_start: 'Subscription_start',
  next_billing: 'Next_billing',
  notes_admin: 'Notes_admin',
  suspended_at: 'Suspended_at',
  cancelled_at: 'Cancelled_at',
  cancellation_reason: 'Cancellation_reason',
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
    for (const [key, airtableField] of Object.entries(ALLOWED_FIELDS)) {
      if (key in body) {
        fields[airtableField] = body[key]
      }
    }

    if (body.history_entry) {
      const existing = current.notesAdmin || ''
      const entry = timestampEntry(session.email, body.history_entry)
      fields['Notes_admin'] = existing ? `${existing}\n${entry}` : entry
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    const updated = await updateUser(id, fields)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[ADMIN CLIENT PATCH]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
