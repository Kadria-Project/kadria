import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { TABLES } from '@/src/lib/airtable'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY')
  }
  return new Resend(apiKey)
}

async function logEmail(params: {
  to: string
  subject: string
  body: string
  status: 'sent' | 'error'
  resendId: string
  adminEmail: string
}) {
  const { error } = await supabaseAdmin.from(TABLES.emailLogs).insert({
    to_email: params.to,
    subject: params.subject,
    body: params.body,
    sent_at: new Date().toISOString(),
    status: params.status,
    resend_id: params.resendId,
    admin_email: params.adminEmail,
  })

  if (error) {
    console.error('[ADMIN EMAIL] Failed to log email:', JSON.stringify(error, null, 2))
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const resend = getResendClient()
    const { to, subject, body, client_name } = await request.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const { data, error } = await resend.emails.send({
      from: 'Kadria <contact@kadria.fr>',
      to,
      subject,
      html: `
        <div style="font-family:system-ui;max-width:500px;margin:0 auto;padding:40px 20px;background:#09090b;color:white;">
          <h1 style="margin:0 0 24px;">
            <span style="color:#22c55e">K</span><span style="color:white">adria</span>
          </h1>
          <p style="color:#a1a1aa;line-height:1.6;margin:0 0 24px;">
            Bonjour ${client_name || ''},
          </p>
          <div style="color:#e4e4e7;line-height:1.6;margin:0 0 24px;white-space:pre-wrap;">${body}</div>
          <p style="color:#52525b;font-size:12px;margin:24px 0 0;line-height:1.6;">
            Kadria — contact@kadria.fr
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[ADMIN EMAIL] Resend error:', error)
      await logEmail({ to, subject, body, status: 'error', resendId: '', adminEmail: session.email })
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }

    await logEmail({ to, subject, body, status: 'sent', resendId: data?.id || '', adminEmail: session.email })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN EMAIL]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
