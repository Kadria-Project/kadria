import { NextResponse } from 'next/server'
import { PermissionError, readProjectWorkspaceSection } from '@/src/lib/projects/project-workspace-section-reads'
export const dynamic = 'force-dynamic'
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; const data = await readProjectWorkspaceSection('commercial', id); return data ? NextResponse.json({ success: true, data }) : NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 }) } catch (error) { return error instanceof PermissionError ? NextResponse.json({ success: false, error: error.message }, { status: error.status }) : NextResponse.json({ success: false, error: 'Données commerciales indisponibles' }, { status: 500 }) } }
