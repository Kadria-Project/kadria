import { NextResponse } from 'next/server'
import { getAllUsers } from '@/src/lib/airtable'
import { requireAdminSession } from '@/src/lib/auth-utils'

export async function GET() {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const users = await getAllUsers()
    const artisans = users
      .filter((u) => u.role === 'Artisan')
      .map((u) => ({
        id: u.id,
        email: u.email,
        first_name: u.firstName,
        last_name: u.lastName,
        company: u.company,
        role: u.role,
        plan: u.plan,
        statut: u.statut,
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
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
