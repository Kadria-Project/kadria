import { NextResponse } from 'next/server'
import { getAllUsers } from '@/src/lib/airtable'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { getPlanLabel } from '@/src/lib/plans'

export async function GET() {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const users = await getAllUsers()
    const artisans = users
      .filter((u) => u.role !== 'Admin')
      .map((u) => ({
        id: u.id,
        email: u.email,
        first_name: u.firstName,
        last_name: u.lastName,
        company: u.company,
        role: u.role,
        plan: getPlanLabel(u.plan),
        statut: u.statut || 'Actif',
        trial_end_date: u.trialEndDate,
        subscription_start: u.subscriptionStart,
        next_billing: u.nextBilling,
        last_login: u.lastLogin,
        created_at: u.createdAt,
        artisan_id: u.artisanId,
      }))

    return NextResponse.json(artisans)
  } catch (error) {
    console.error('[ADMIN CLIENTS]', error)
    return NextResponse.json({ error: 'Erreur serveur', detail: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
