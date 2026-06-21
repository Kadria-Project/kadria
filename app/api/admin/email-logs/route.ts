import { NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { requireAdminSession } from '@/src/lib/auth-utils'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export async function GET() {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.emailLogs)
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(20)

    if (error) {
      throw error
    }

    const logs = (data || []).map((record) => ({
      id: String(record.id || ''),
      to: String(record.to || ''),
      subject: String(record.subject || ''),
      sent_at: String(record.sent_at || ''),
      status: String(record.status || ''),
      resend_id: String(record.resend_id || ''),
      admin_email: String(record.admin_email || ''),
    }))

    return NextResponse.json(logs)
  } catch (error) {
    console.error('[ADMIN EMAIL LOGS]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
