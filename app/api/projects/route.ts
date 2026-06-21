import { NextResponse } from 'next/server';
import { TABLES, getArtisanConfig, getUserByArtisanIdentifier } from '@/src/lib/airtable';
import { getSession } from '@/src/lib/auth-utils';
import { getMonthlyProjectLimit } from '@/src/lib/plans';
import { mapSupabaseProject, toSupabaseProjectInsert } from '@/src/lib/supabase/mapping';
import { supabaseAdmin } from '@/src/lib/supabase/server';

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

    const artisanUser = await getUserByArtisanIdentifier(artisanId);
    const monthlyLimit = getMonthlyProjectLimit(artisanUser?.plan);
    if (monthlyLimit !== null) {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

      const { count, error } = await supabaseAdmin
        .from(TABLES.projects)
        .select('id', { count: 'exact', head: true })
        .eq('artisan_id', artisanId)
        .gte('created_at', monthStart)
        .lt('created_at', nextMonthStart);

      if (error) {
        throw error;
      }

      if ((count || 0) >= monthlyLimit) {
        return NextResponse.json(
          {
            success: false,
            error: 'Limite mensuelle atteinte',
            requiredPlan: 'performance',
          },
          { status: 403 },
        );
      }
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
