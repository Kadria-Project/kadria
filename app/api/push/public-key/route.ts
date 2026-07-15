import { NextResponse } from 'next/server'
export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  return key ? NextResponse.json({ success: true, publicKey: key }) : NextResponse.json({ success: false, error: 'Notifications indisponibles.' }, { status: 503 })
}
