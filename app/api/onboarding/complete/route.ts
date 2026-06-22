import { NextResponse } from 'next/server'
import { getArtisanConfig, updateArtisanConfig } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const onboardingCompletedAt = new Date().toISOString()
    await updateArtisanConfig(session.artisanId, {
      onboarding_completed: true,
      onboarding_completed_at: onboardingCompletedAt,
    })

    const config = await getArtisanConfig(session.artisanId)
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('[ONBOARDING COMPLETE]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
