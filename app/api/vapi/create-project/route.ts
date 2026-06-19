import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // ── Sécurité : clé secrète partagée ──
    const secret = request.headers.get('x-vapi-secret')
    if (secret !== process.env.VAPI_SHARED_SECRET) {
      console.warn('[VAPI] Unauthorized attempt — invalid or missing secret')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('[VAPI] Incoming call payload — callId:', body.callId,
      'artisanId:', body.artisanId || 'Artisan_demo')

    // ── Validation légère + valeurs par défaut ──
    const clientName = String(body.clientName || '')
    const city = String(body.city || '')
    const trade = String(body.trade || '')
    const budget = String(body.budget || '')
    const desiredTimeline = String(body.desiredTimeline || '')
    const aiSummary = String(body.aiSummary || '')
    const projectDetails = String(body.projectDetails || '')
    const artisanId = String(body.artisanId || 'Artisan_demo')
    const callId = String(body.callId || '')

    let completenessScore = Number(body.completenessScore)
    if (isNaN(completenessScore)) completenessScore = 0
    completenessScore = Math.max(0, Math.min(100, completenessScore))

    // ── Création Airtable ──
    const apiKey = process.env.AIRTABLE_API_KEY
    const baseId = process.env.AIRTABLE_BASE_ID

    const fields: Record<string, unknown> = {
      'Client Name': clientName,
      'City': city,
      'Trade': trade,
      'Budget': budget,
      'Desired Timeline': desiredTimeline,
      'AI Summary': aiSummary,
      'Chat History': projectDetails,
      'Completeness Score': completenessScore,
      'Artisan ID': artisanId,
      'Call ID': callId,
      'Status': 'Nouveau',
      'Source': 'voice',
    }

    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/Projects`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    )

    const result = await res.json()

    if (!res.ok) {
      console.error('[VAPI] Airtable error:', res.status, JSON.stringify(result))
      // Retry sans le champ Source si Airtable le rejette (champ inexistant)
      if (JSON.stringify(result).includes('Source')) {
        delete fields['Source']
        const retryRes = await fetch(
          `https://api.airtable.com/v0/${baseId}/Projects`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields }),
          }
        )
        const retryResult = await retryRes.json()
        if (retryRes.ok) {
          console.log('[VAPI] Project created (retry without Source) — recordId:', retryResult.id)
          return NextResponse.json({
            success: true,
            projectId: retryResult.id,
            callId,
          })
        }
      }
      return NextResponse.json(
        { success: false, error: 'Airtable creation failed', details: result },
        { status: 500 }
      )
    }

    console.log('[VAPI] Project created — recordId:', result.id,
      'callId:', callId)

    return NextResponse.json({
      success: true,
      projectId: result.id,
      callId,
    })
  } catch (error) {
    console.error('[VAPI] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
