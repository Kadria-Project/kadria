import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from '@/src/lib/airtable'
import { authorizeProjectAccess } from '@/src/lib/project-responsibility'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { PermissionError } from '@/src/lib/team/access'

const stages = ['Nouveau', 'À rappeler', 'Qualifié', 'Devis envoyé', 'Gagné', 'Perdu'] as const
type Stage = (typeof stages)[number]
type Command = { action: 'move'; targetStage: Stage } | { action: 'mark_won' } | { action: 'mark_lost' }
const nextStages: Record<Stage, Stage[]> = { Nouveau: ['À rappeler', 'Qualifié', 'Perdu'], 'À rappeler': ['Qualifié', 'Perdu'], Qualifié: ['Devis envoyé', 'Perdu'], 'Devis envoyé': ['Gagné', 'Perdu'], Gagné: [], Perdu: [] }

export function parsePipelineCommand(value: unknown): Command {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Commande pipeline invalide.')
  const input = value as Record<string, unknown>
  if (input.action === 'mark_won' && Object.keys(input).length === 1) return { action: 'mark_won' }
  if (input.action === 'mark_lost' && Object.keys(input).length === 1) return { action: 'mark_lost' }
  if (input.action === 'move' && Object.keys(input).length === 2 && typeof input.targetStage === 'string' && stages.includes(input.targetStage as Stage) && input.targetStage !== 'Gagné' && input.targetStage !== 'Perdu') return { action: 'move', targetStage: input.targetStage as Stage }
  throw new Error('Commande pipeline invalide.')
}

export function pipelineForStatus(status: unknown) { const current = stages.includes(status as Stage) ? status as Stage : 'Nouveau'; return { currentStage: current, commercialStatus: current, outcome: current === 'Gagné' ? 'won' as const : current === 'Perdu' ? 'lost' as const : null, allowedTransitions: nextStages[current], primaryAction: nextStages[current][0] ? { action: 'move' as const, targetStage: nextStages[current][0] } : null } }
async function accessFor(id: string, manage = false) { return authorizeProjectAccess({ projectId: id, select: 'id, status', ...(manage ? { requiredPermission: 'projects.manage_pipeline' as const } : {}), allowAppointmentAccess: true }) }

export const dynamic = 'force-dynamic'
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; const access = await accessFor(id); if (!access) return NextResponse.json({ success: false, error: 'Projet introuvable.' }, { status: 404 }); const project = access.project as { status?: string | null }; const { data, error } = await supabaseAdmin.from(TABLES.devis).select('id, devis_number, statut').eq('project_id', access.projectId).order('created_at', { ascending: false }).limit(1); if (error) throw error; const quote = data?.[0] ? { id: String(data[0].id), number: data[0].devis_number ? String(data[0].devis_number) : null, status: data[0].statut ? String(data[0].statut) : null } : null; return NextResponse.json({ success: true, pipeline: { ...pipelineForStatus(project.status), quote } }) } catch (error) { const permission = error as PermissionError; return permission?.status ? NextResponse.json({ success: false, error: permission.message }, { status: permission.status }) : NextResponse.json({ success: false, error: 'Pipeline indisponible.' }, { status: 500 }) } }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const command = parsePipelineCommand(await request.json().catch(() => null)); const { id } = await params; const access = await accessFor(id, true); if (!access) return NextResponse.json({ success: false, error: 'Projet introuvable.' }, { status: 404 }); const current = pipelineForStatus((access.project as { status?: string | null }).status).currentStage; const target = command.action === 'mark_won' ? 'Gagné' : command.action === 'mark_lost' ? 'Perdu' : command.targetStage; if (target === current) return NextResponse.json({ success: true, pipeline: pipelineForStatus(current), idempotent: true }); if (!nextStages[current].includes(target)) return NextResponse.json({ success: false, error: 'Transition commerciale interdite.' }, { status: 409 }); const { error } = await supabaseAdmin.from(TABLES.projects).update({ status: target, contacted: true }).eq('id', access.projectId); if (error) throw error; await supabaseAdmin.from(TABLES.activity).insert({ project_id: access.projectId, action: target === 'Gagné' ? 'PROJECT_WON' : target === 'Perdu' ? 'PROJECT_LOST' : 'PIPELINE_STATUS_UPDATED', description: `Étape commerciale : ${target}`, created_at: new Date().toISOString() }); return NextResponse.json({ success: true, pipeline: pipelineForStatus(target), refresh: ['brief', 'commercial', 'history'] }) } catch (error) { const permission = error as PermissionError; if (permission?.status) return NextResponse.json({ success: false, error: permission.message }, { status: permission.status }); const message = error instanceof Error ? error.message : 'Erreur serveur.'; return NextResponse.json({ success: false, error: message }, { status: message.includes('invalide') ? 400 : 500 }) } }
