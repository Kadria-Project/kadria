import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import {
  buildDemoAccessVerifyUrl,
  generateDemoAccessToken,
  hashDemoAccessToken,
} from '@/src/lib/demo-access'

type ApprovePayload = {
  requestId?: string
  email?: string
  sendEmail?: boolean
}

function getAdminSecret() {
  return process.env.DEMO_ACCESS_ADMIN_SECRET || ''
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }

  return new Resend(apiKey)
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

export async function POST(request: Request) {
  try {
    const providedSecret = request.headers.get('x-admin-secret') || ''
    const expectedSecret = getAdminSecret()

    if (!expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'DEMO_ACCESS_ADMIN_SECRET manquant.' },
        { status: 503 },
      )
    }

    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Acces refuse.' },
        { status: 401 },
      )
    }

    const body = (await request.json().catch(() => null)) as ApprovePayload | null
    if (!body) {
      return NextResponse.json({ success: false, error: 'Requete invalide.' }, { status: 400 })
    }

    const requestId = normalizeText(body.requestId)
    const email = normalizeText(body.email).toLowerCase()

    if (!requestId && !email) {
      return NextResponse.json(
        { success: false, error: 'requestId ou email requis.' },
        { status: 400 },
      )
    }

    let query = supabaseAdmin
      .from('demo_access_requests')
      .select('id, email, first_name, last_name, company_name, status, revoked_at')
      .order('created_at', { ascending: false })
      .limit(1)

    if (requestId) {
      query = query.eq('id', requestId)
    } else {
      query = query.eq('email', email)
    }

    const { data: row, error: fetchError } = await query.maybeSingle()

    if (fetchError) {
      console.error('[DEMO ACCESS APPROVE] Fetch error:', fetchError)
      return NextResponse.json({ success: false, error: 'Erreur serveur.' }, { status: 500 })
    }

    if (!row) {
      return NextResponse.json({ success: false, error: 'Demande introuvable.' }, { status: 404 })
    }

    const rawToken = generateDemoAccessToken()
    const tokenHash = await hashDemoAccessToken(rawToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const verifyUrl = buildDemoAccessVerifyUrl(rawToken)
    const approvedBy = request.headers.get('x-admin-id') || 'manual_admin_secret'

    const { error: updateError } = await supabaseAdmin
      .from('demo_access_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        revoked_at: null,
        expires_at: expiresAt.toISOString(),
        access_token_hash: tokenHash,
        access_sent_at: new Date().toISOString(),
        approved_by: approvedBy,
      })
      .eq('id', row.id)

    if (updateError) {
      console.error('[DEMO ACCESS APPROVE] Update error:', updateError)
      return NextResponse.json({ success: false, error: 'Erreur serveur.' }, { status: 500 })
    }

    let emailed = false
    if (body.sendEmail) {
      const resend = getResendClient()
      if (resend && row.email) {
        try {
          await resend.emails.send({
            from: 'Kadria <contact@kadria.fr>',
            to: row.email,
            subject: 'Votre acces a la demo Kadria',
            html: `
              <div style="font-family:system-ui;max-width:560px;margin:0 auto;padding:32px 20px;background:#09090b;color:white;">
                <h1 style="margin:0 0 20px;">
                  <span style="color:#22c55e">K</span><span style="color:white">adria</span>
                </h1>
                <h2 style="margin:0 0 16px;font-size:20px;">Votre acces demo est pret</h2>
                <p style="margin:0 0 16px;color:#a1a1aa;line-height:1.7;">
                  Bonjour ${row.first_name || ''}, votre acces a la demonstration Kadria a ete active.
                  Cliquez sur le bouton ci-dessous pour ouvrir la demo complete.
                </p>
                <a href="${verifyUrl}" style="display:inline-block;background:#22c55e;color:black;font-weight:700;border-radius:10px;padding:14px 24px;font-size:16px;text-decoration:none;">
                  Ouvrir la demo Kadria
                </a>
                <p style="margin:16px 0 0;color:#71717a;font-size:12px;line-height:1.6;">
                  Ce lien expire le ${expiresAt.toLocaleDateString('fr-FR')} et peut etre revoque a tout moment.
                </p>
              </div>
            `,
          })
          emailed = true
        } catch (emailError) {
          console.error('[DEMO ACCESS APPROVE] Email error:', emailError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      requestId: row.id,
      status: 'approved',
      expiresAt: expiresAt.toISOString(),
      verifyUrl,
      emailed,
    })
  } catch (error) {
    console.error('[DEMO ACCESS APPROVE] Error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur.' }, { status: 500 })
  }
}
