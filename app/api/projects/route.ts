import { NextResponse } from 'next/server';
import { TABLES, getArtisanConfig } from '@/src/lib/airtable';
import { getSession } from '@/src/lib/auth-utils';
import { mapSupabaseProject, toSupabaseProjectInsert } from '@/src/lib/supabase/mapping';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import { canCreateProject, recordProjectCreatedUsage } from '@/src/lib/usage/quotas';

const FALLBACK_ARTISAN_ID = 'Artisan_demo';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 },
      );
    }

    const artisanId = session.artisanId;

    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const trade = searchParams.get('trade');
    const search = searchParams.get('search')?.toLowerCase();

    const { data, error } = await supabaseAdmin
      .from(TABLES.projects)
      .select('*')
      .eq('artisan_id', artisanId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    let projects = (data || []).map(mapSupabaseProject);

    if (status) {
      projects = projects.filter((project) => project.status === status);
    }

    if (trade) {
      projects = projects.filter((project) => project.trade === trade);
    }

    if (search) {
      projects = projects.filter((project) => {
        const searchable = [
          project.projectNumber,
          project.clientName,
          project.clientFirstName,
          project.clientEmail,
          project.clientPhone,
          project.city,
          project.trade,
          project.projectType,
          project.budget,
          project.aiSummary,
        ]
          .join(' ')
          .toLowerCase();

        return searchable.includes(search);
      });
    }

    return NextResponse.json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error('GET_PROJECTS_ERROR', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json();

    const isDemoMode = input.demoMode === true || request.headers.get('X-Demo-Mode') === 'true';
    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        recordId: `demo_${Math.random().toString(36).slice(2, 10)}`,
        demo: true,
      });
    }

    const artisanId =
      typeof input.artisanId === 'string' && input.artisanId.trim()
        ? input.artisanId.trim()
        : FALLBACK_ARTISAN_ID;

    if (!artisanId || artisanId.length > 100) {
      return NextResponse.json(
        { success: false, error: 'artisanId invalide' },
        { status: 400 },
      );
    }

    const requiredStrings = ['clientName', 'clientPhone', 'clientEmail', 'siteAddress'];
    const missingField = requiredStrings.find((field) => typeof input[field] !== 'string' || !input[field].trim());
    if (missingField) {
      return NextResponse.json(
        { success: false, error: 'Payload invalide' },
        { status: 400 },
      );
    }

    // Défense en profondeur, limitée aux dossiers issus du chatbot : empêche
    // la création d'un projet dont le budget et/ou le délai n'ont jamais été
    // traités (renseignés ou explicitement déclarés "À définir"), même si le
    // verrou côté /api/chat a été contourné. Ne s'applique pas à la création
    // manuelle par l'artisan, qui n'envoie pas source: 'chat-widget'.
    const isChatProject = input.source === 'chat-widget';
    const hasHandledValue = (value: unknown) => typeof value === 'string' && value.trim() !== '';
    if (isChatProject && !hasHandledValue(input.budget)) {
      return NextResponse.json(
        { success: false, error: 'Budget requis ou explicitement à définir.' },
        { status: 400 },
      );
    }
    if (isChatProject && !hasHandledValue(input.desiredTimeline)) {
      return NextResponse.json(
        { success: false, error: 'Délai souhaité requis ou explicitement à définir.' },
        { status: 400 },
      );
    }

    if (typeof input.chatHistory === 'string' && input.chatHistory.length > 50000) {
      return NextResponse.json(
        { success: false, error: 'Historique trop long' },
        { status: 400 },
      );
    }

    if (input.photos && (!Array.isArray(input.photos) || input.photos.length > 5)) {
      return NextResponse.json(
        { success: false, error: 'Photos invalides' },
        { status: 400 },
      );
    }

    const config = await getArtisanConfig(artisanId);
    if (!config || !config.active) {
      return NextResponse.json(
        { success: false, error: 'Artisan introuvable' },
        { status: 404 },
      );
    }

    const quotaCheck = await canCreateProject(artisanId);
    if (!quotaCheck.success) {
      console.error('[PROJECT_QUOTA] Unable to verify quota:', quotaCheck.error || 'unknown error');
      return NextResponse.json(
        {
          success: false,
          error: 'Vérification quota impossible',
          code: 'PROJECT_QUOTA_CHECK_FAILED',
        },
        { status: 503 },
      );
    }

    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quota projets mensuel atteint',
          code: 'PROJECT_QUOTA_EXCEEDED',
          quota: {
            plan: quotaCheck.plan,
            periodMonth: quotaCheck.periodMonth,
            limit: quotaCheck.limit,
            used: quotaCheck.used,
            remaining: quotaCheck.remaining,
          },
        },
        { status: 403 },
      );
    }

    const payload = toSupabaseProjectInsert({
      ...input,
      artisanId,
    });

    const { data: record, error } = await supabaseAdmin
      .from(TABLES.projects)
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    const usageResult = await recordProjectCreatedUsage({
      artisanId,
      projectId: record.id,
      source: typeof input.source === 'string' ? input.source : 'web',
    });

    if (!usageResult.success) {
      console.error('[PROJECT_QUOTA] Project created but usage tracking failed:', usageResult.error || 'unknown error');
    }

    return NextResponse.json({
      success: true,
      recordId: record.id,
    });
  } catch (error) {
    console.error('CREATE_PROJECT_ERROR', error instanceof Error ? error.message : String(error));

    const airtableError = error as { message?: string; error?: string; statusCode?: number };

    return NextResponse.json(
      {
        success: false,
        error: airtableError.message ?? airtableError.error ?? 'Erreur serveur',
      },
      { status: 500 },
    );
  }
}
