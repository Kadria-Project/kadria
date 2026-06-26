import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getCalendarIntegration, getValidAccessToken } from '@/src/lib/google-calendar'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { TABLES } from '@/src/lib/airtable'
import { computeFreeSlots, type BusyInterval } from '@/src/lib/appointment-slots'
import { fetchBusyIntervals } from '@/src/lib/google-calendar-busy'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId requis' }, { status: 400 })
    }

    const date = request.nextUrl.searchParams.get('date')
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: 'date invalide' }, { status: 400 })
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from(TABLES.projects)
      .select('id, artisan_id')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError) {
      console.error('[APPOINTMENTS AVAILABILITY] Erreur lecture projet:', projectError.message)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    if (!project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 })
    }

    if (project.artisan_id !== session.artisanId) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    const { row, tableMissing } = await getCalendarIntegration(session.artisanId)
    if (tableMissing || !row || !row.is_connected) {
      return NextResponse.json({ success: true, connected: false, slots: [] })
    }

    const accessToken = await getValidAccessToken(row)
    if (!accessToken) {
      return NextResponse.json({ success: true, connected: false, slots: [] })
    }

    const now = new Date()

    // Fenêtre large (14 jours calendaires) pour couvrir 7 jours ouvrés même
    // en présence de week-ends ; élargie si une date précise plus lointaine
    // est demandée, pour que les événements de ce jour soient bien inclus.
    let windowDays = 14
    if (date) {
      const requestedMs = new Date(`${date}T00:00:00Z`).getTime()
      const daysAhead = Math.ceil((requestedMs - now.getTime()) / (24 * 60 * 60 * 1000)) + 2
      windowDays = Math.max(windowDays, daysAhead)
    }

    let busyIntervals: BusyInterval[]
    try {
      busyIntervals = await fetchBusyIntervals(accessToken, now, windowDays)
    } catch {
      return NextResponse.json({ success: false, error: 'Synchronisation Google impossible' }, { status: 502 })
    }

    const slots = date
      ? computeFreeSlots(busyIntervals, { now, maxSlots: 8, forDate: date })
      : computeFreeSlots(busyIntervals, { now, maxSlots: 3, maxBusinessDays: 7 })

    return NextResponse.json({ success: true, connected: true, slots })
  } catch (error) {
    console.error('[APPOINTMENTS AVAILABILITY]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
