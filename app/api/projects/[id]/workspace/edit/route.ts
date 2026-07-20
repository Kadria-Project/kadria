import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { PermissionError } from '@/src/lib/team/access'

export const dynamic = 'force-dynamic'

const editableKeys = ['projectType', 'trade', 'city', 'clientFirstName', 'clientName', 'clientPhone', 'clientEmail', 'siteAddress'] as const
type EditableKey = (typeof editableKeys)[number]
type EditInput = Partial<Record<EditableKey, string>>
const columnByKey: Record<EditableKey, string> = { projectType: 'project_type', trade: 'trade', city: 'city', clientFirstName: 'client_first_name', clientName: 'client_name', clientPhone: 'client_phone', clientEmail: 'client_email', siteAddress: 'site_address' }
const validationMessages = new Set(['Payload invalide.', 'Champ non autorisé.', 'Valeur invalide.', 'E-mail invalide.', 'Aucune modification.'])

export function parseProjectEditInput(value: unknown): EditInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Payload invalide.')
  const input = value as Record<string, unknown>
  if (Object.keys(input).some((key) => !editableKeys.includes(key as EditableKey))) throw new Error('Champ non autorisé.')
  const result: EditInput = {}
  for (const key of editableKeys) {
    if (input[key] === undefined) continue
    if (typeof input[key] !== 'string' || input[key].trim().length > 300) throw new Error('Valeur invalide.')
    result[key] = input[key].trim()
  }
  if (result.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.clientEmail)) throw new Error('E-mail invalide.')
  return result
}

function responseForError(error: unknown) {
  const permission = error as PermissionError
  if (permission?.status) return NextResponse.json({ success: false, error: permission.message }, { status: permission.status })
  const message = error instanceof Error ? error.message : 'Erreur serveur.'
  const validationError = validationMessages.has(message)
  return NextResponse.json({ success: false, error: validationError ? message : 'Erreur serveur.' }, { status: validationError ? 400 : 500 })
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const access = await authorizeProjectAccess({ projectId: id, requiredPermission: 'projects.update', allowAppointmentAccess: true, select: 'id, project_type, trade, city, client_first_name, client_name, client_phone, client_email, site_address' })
    if (!access) return NextResponse.json({ success: false, error: 'Projet introuvable.' }, { status: 404 })
    const project = access.project as Record<string, unknown>
    return NextResponse.json({ success: true, edit: Object.fromEntries(editableKeys.map((key) => [key, typeof project[columnByKey[key]] === 'string' ? project[columnByKey[key]] : ''])) })
  } catch (error) { return responseForError(error) }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const input = parseProjectEditInput(await request.json().catch(() => null))
    const access = await authorizeProjectAccess({ projectId: id, requiredPermission: 'projects.update', allowAppointmentAccess: true, select: 'id' })
    if (!access) return NextResponse.json({ success: false, error: 'Projet introuvable.' }, { status: 404 })
    const fields = Object.fromEntries(Object.entries(input).map(([key, value]) => [columnByKey[key as EditableKey], value]))
    if (!Object.keys(fields).length) throw new Error('Aucune modification.')
    const { error } = await supabaseAdmin.from(TABLES.projects).update(fields).eq('id', access.projectId)
    if (error) throw error
    await supabaseAdmin.from(TABLES.activity).insert({ project_id: access.projectId, action: 'PROJECT_UPDATED', description: 'Informations du dossier mises à jour.', created_at: new Date().toISOString() })
    return NextResponse.json({ success: true, refresh: ['brief', 'client', 'history'] })
  } catch (error) { return responseForError(error) }
}
