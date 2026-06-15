import { NextResponse } from 'next/server'
import { airtableBase, TABLES } from '@/src/lib/airtable'
import { requireAdminSession } from '@/src/lib/auth-utils'

export async function GET() {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const records = await airtableBase(TABLES.emailLogs)
      .select({
        maxRecords: 20,
        sort: [{ field: 'Sent_at', direction: 'desc' }],
      })
      .firstPage()

    const logs = records.map((record) => ({
      id: record.id,
      to: record.fields['To'] as string || '',
      subject: record.fields['Subject'] as string || '',
      sent_at: record.fields['Sent_at'] as string || '',
      status: record.fields['Status'] as string || '',
      resend_id: record.fields['Resend_id'] as string || '',
      admin_email: record.fields['Admin_email'] as string || '',
    }))

    return NextResponse.json(logs)
  } catch (error) {
    console.error('[ADMIN EMAIL LOGS]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
