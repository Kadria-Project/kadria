import { NextResponse } from 'next/server';
import { TABLES } from '@/src/lib/airtable';
import { getSession } from '@/src/lib/auth-utils';
import { mapSupabaseActivity } from '@/src/lib/supabase/mapping';
import { supabaseAdmin } from '@/src/lib/supabase/server';

async function getAuthorizedProjectId(id: string, artisanId: string) {
  const direct = await supabaseAdmin
    .from(TABLES.projects)
    .select('id, artisan_id')
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (direct.error) {
    throw direct.error;
  }

  let record = direct.data;

  if (!record) {
    const legacy = await supabaseAdmin
      .from(TABLES.projects)
      .select('id, artisan_id')
      .eq('record_id', id)
      .limit(1)
      .maybeSingle();

    if (legacy.error) {
      throw legacy.error;
    }

    record = legacy.data;
  }

  if (!record) {
    return { status: 404 as const };
  }

  if (record.artisan_id !== artisanId) {
    return { status: 403 as const };
  }

  return { status: 200 as const, projectId: record.id as string };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const authResult = await getAuthorizedProjectId(id, session.artisanId);

    if (authResult.status === 404) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });
    }

    if (authResult.status === 403) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const authResult = await getAuthorizedProjectId(id, session.artisanId);

    if (authResult.status === 404) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });
    }

    if (authResult.status === 403) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
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
    console.error('CREATE_PROJECT_ACTIVITY_ERROR', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
