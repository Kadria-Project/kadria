import { NextResponse } from 'next/server';
import { TABLES } from '@/src/lib/airtable';
import { authorizeProjectAccess } from '@/src/lib/project-responsibility';
import { mapSupabaseActivity } from '@/src/lib/supabase/mapping';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import { PermissionError } from '@/src/lib/team/access';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authResult = await authorizeProjectAccess({
      projectId: id,
      allowAppointmentAccess: true,
      select: 'id',
    });

    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLES.activity)
      .select('*')
      .eq('project_id', authResult.projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const activities = (data || []).map((row, index) => mapSupabaseActivity(row, index));

    return NextResponse.json({
      success: true,
      activities,
    });
  } catch (error) {
    const permissionError = error as PermissionError;
    if (permissionError?.status) {
      return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status });
    }

    console.error('GET_PROJECT_ACTIVITY_ERROR', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authResult = await authorizeProjectAccess({
      projectId: id,
      requiredPermission: 'projects.update',
      allowAppointmentAccess: true,
      select: 'id',
    });

    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });
    }

    const body = await request.json();
    const action = String(body.action || '').trim();
    const description = String(body.description || '').trim();

    if (!action || !description) {
      return NextResponse.json(
        { success: false, error: 'action et description sont requis' },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.from(TABLES.activity).insert({
      project_id: authResult.projectId,
      action,
      description,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const permissionError = error as PermissionError;
    if (permissionError?.status) {
      return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status });
    }

    console.error('CREATE_PROJECT_ACTIVITY_ERROR', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
