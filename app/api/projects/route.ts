import { NextResponse } from 'next/server';
import { TABLES, getArtisanConfig } from '@/src/lib/airtable';
import { getSession } from '@/src/lib/auth-utils';
import { sendClientProjectConfirmationEmailBestEffort } from '@/src/lib/email/client-project-confirmation';
import {
  getAssignedAppointmentProjectIds,
  listAssignableProjectResponsibles,
  listProjectResponsiblesByTenant,
  projectResponsibilityColumnExists,
  resolveDefaultProjectResponsible,
} from '@/src/lib/project-responsibility';
import { mapSupabaseProject, toSupabaseProjectInsert } from '@/src/lib/supabase/mapping';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import { checkPermission } from '@/src/lib/team/access';
import { attachTenantIdToPayload, getCurrentTenantContext, resolveTenantIdentity, tableHasColumn } from '@/src/lib/tenant-context';
import { canCreateProject, recordProjectCreatedUsage } from '@/src/lib/usage/quotas';
import { getClientActivitySummaries } from '@/src/lib/client-events';
import { createProjectNotification } from '@/src/lib/notifications';
import { createProjectWithCanonicalClient } from '@/src/lib/clients/project-client-dual-write';
import { randomUUID } from 'crypto';

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
    const tenantContext = await getCurrentTenantContext();
    const supportsTenantId = await tableHasColumn(TABLES.projects, 'tenant_id');
    const supportsResponsibleUser = await projectResponsibilityColumnExists();
    const canReadAllProjects = checkPermission(tenantContext, 'projects.read_all');
    const canReadAssignedProjects = checkPermission(tenantContext, 'projects.read_assigned');
    const canAssignProjects = checkPermission(tenantContext, 'projects.assign');
    const canReassignProjects = checkPermission(tenantContext, 'projects.reassign');

    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const trade = searchParams.get('trade');
    const search = searchParams.get('search')?.toLowerCase();
    const responsible = searchParams.get('responsible');

    let query = supabaseAdmin
      .from(TABLES.projects)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (supportsTenantId && tenantContext?.tenantId) {
      query = query.eq('tenant_id', tenantContext.tenantId);
    } else {
      query = query.eq('artisan_id', artisanId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    let projects = (data || []).map(mapSupabaseProject);

    if (supportsResponsibleUser && tenantContext?.tenantId) {
      const responsibilityMap = await listProjectResponsiblesByTenant(tenantContext.tenantId);
      projects = projects.map((project) => ({
        ...project,
        responsibleUser: project.responsibleUserId ? responsibilityMap.get(project.responsibleUserId) || null : null,
      }));
    }

    if (tenantContext?.tenantId && !canReadAllProjects && !canReadAssignedProjects) {
      projects = [];
    } else if (tenantContext?.tenantId && !canReadAllProjects && canReadAssignedProjects) {
      const appointmentProjectIds = await getAssignedAppointmentProjectIds(tenantContext.tenantId, tenantContext.userId);
      projects = projects.filter((project) =>
        project.responsibleUserId === tenantContext.userId || appointmentProjectIds.has(project.id),
      );
    }

    // Colonne "Activité" du suivi commercial (nouveautés client) : une seule
    // requête groupée sur ProjectClientEvents pour tous les projets affichés
    // plutôt qu'un N+1. Tolérant si la table n'existe pas encore (renvoie
    // simplement une map vide, cf. src/lib/client-events.ts).
    if (projects.length) {
      const lastSeenAtByProjectId = new Map(
        projects.map((project) => [project.id, project.clientActivityLastSeenAt] as const),
      );
      const summaries = await getClientActivitySummaries(
        projects.map((project) => project.id),
        lastSeenAtByProjectId,
      );
      projects = projects.map((project) => {
        const summary = summaries.get(project.id);
        return {
          ...project,
          clientActivity: {
            unreadCount: summary?.unreadCount ?? 0,
            lastEventType: summary?.lastEventType ?? null,
            lastEventAt: summary?.lastEventAt ?? null,
          },
        };
      });
    }

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
          [project.responsibleUser?.firstName, project.responsibleUser?.lastName].filter(Boolean).join(' '),
          project.responsibleUser?.jobTitle,
        ]
          .join(' ')
          .toLowerCase();

        return searchable.includes(search);
      });
    }

    if (responsible && tenantContext?.tenantId && supportsResponsibleUser) {
      if (responsible === 'me') {
        projects = projects.filter((project) => project.responsibleUserId === tenantContext.userId);
      } else if (responsible === 'unassigned') {
        projects = projects.filter((project) => !project.responsibleUserId);
      } else {
        projects = projects.filter((project) => project.responsibleUserId === responsible);
      }
    }

    const availableResponsibles = tenantContext?.tenantId
      ? await listAssignableProjectResponsibles(tenantContext.tenantId)
      : [];

    return NextResponse.json({
      success: true,
      count: projects.length,
      projects,
      viewerContext: {
        currentUserId: tenantContext?.userId || null,
        canReadAllProjects,
        canReadAssignedProjects,
        canAssignProjects,
        canReassignProjects,
      },
      availableResponsibles,
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

    // Si une session artisan authentifiee existe (creation depuis le dashboard,
    // ex. "Nouveau dossier" mobile), l'artisan_id vient TOUJOURS de la session
    // et ne peut jamais etre force par le front-end — evite qu'un artisan cree
    // un dossier pour un autre. Sans session (ex. widget public /projet), on
    // conserve le comportement existant base sur l'artisanId transmis.
    const session = await getSession();
    const artisanId = session?.artisanId
      ? session.artisanId
      : typeof input.artisanId === 'string' && input.artisanId.trim()
        ? input.artisanId.trim()
        : FALLBACK_ARTISAN_ID;

    if (!artisanId || artisanId.length > 100) {
      return NextResponse.json(
        { success: false, error: 'artisanId invalide' },
        { status: 400 },
      );
    }

    // clientName et siteAddress restent toujours obligatoires. clientPhone et
    // clientEmail restent individuellement optionnels (ex. prospect capté
    // rapidement sans email) mais au moins un moyen de contact est requis
    // pour garder le dossier exploitable.
    const requiredStrings = ['clientName', 'siteAddress'];
    const missingField = requiredStrings.find((field) => typeof input[field] !== 'string' || !input[field].trim());
    const hasPhone = typeof input.clientPhone === 'string' && input.clientPhone.trim().length > 0;
    const hasEmail = typeof input.clientEmail === 'string' && input.clientEmail.trim().length > 0;
    if (missingField || (!hasPhone && !hasEmail)) {
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
      tenantId: null,
    });
    const tenantContext = session ? await getCurrentTenantContext() : null;
    const supportsResponsibleUser = await projectResponsibilityColumnExists();
    const tenantIdentity = session
      ? tenantContext && tenantContext.legacyArtisanId === artisanId
        ? { tenantId: tenantContext.tenantId, legacyArtisanId: tenantContext.legacyArtisanId }
        : await resolveTenantIdentity({ artisanId })
      : await resolveTenantIdentity({ artisanId })

    const assignmentContext = supportsResponsibleUser && tenantIdentity?.tenantId
      ? await resolveDefaultProjectResponsible(
          tenantIdentity.tenantId,
          session && tenantContext?.membership.status === 'active' ? tenantContext.userId : null,
        )
      : null;

    const responsibleAssignment =
      supportsResponsibleUser && tenantIdentity?.tenantId && assignmentContext
        ? {
            responsible_user_id: assignmentContext.userId,
            responsible_assigned_at: new Date().toISOString(),
            responsible_assigned_by:
              session && tenantContext?.membership.status === 'active'
                ? tenantContext.userId
                : assignmentContext.userId,
          }
        : {};

    const safePayload = await attachTenantIdToPayload(
      TABLES.projects,
      {
        ...payload,
        ...(tenantIdentity?.tenantId ? { tenant_id: tenantIdentity.tenantId } : {}),
        ...responsibleAssignment,
      },
      {
        tenantId: tenantIdentity?.tenantId || null,
        artisanId,
      },
    )

    if (!tenantIdentity?.tenantId) {
      throw new Error('Tenant requis pour créer un dossier.');
    }

    const requestId = typeof input.requestId === 'string' && input.requestId.trim()
      ? input.requestId.trim().slice(0, 160)
      : randomUUID();
    const creation = await createProjectWithCanonicalClient({
      tenantId: tenantIdentity.tenantId,
      artisanId,
      requestId,
      source: typeof input.source === 'string' ? input.source : 'web',
      projectPayload: safePayload,
      client: {
        firstName: typeof input.clientFirstName === 'string' ? input.clientFirstName : null,
        lastName: typeof input.clientName === 'string' ? input.clientName : null,
        email: typeof input.clientEmail === 'string' ? input.clientEmail : null,
        phone: typeof input.clientPhone === 'string' ? input.clientPhone : null,
        city: typeof input.city === 'string' ? input.city : null,
        postalCode: typeof input.postalCode === 'string' ? input.postalCode : null,
        acquisitionSource: typeof input.source === 'string' ? input.source : 'web',
      },
    });
    const record = { id: creation.projectId };

    const usageResult = !creation.idempotent ? await recordProjectCreatedUsage({
      artisanId,
      projectId: record.id,
      source: typeof input.source === 'string' ? input.source : 'web',
    }) : { success: true };

    if (!usageResult.success) {
      console.error('[PROJECT_QUOTA] Project created but usage tracking failed:', usageResult.error || 'unknown error');
    }

    // Notification artisan (centre de notifications, best-effort) : ne doit
    // jamais faire échouer la création du projet.
    const clientLabel = typeof input.clientName === 'string' && input.clientName.trim()
      ? input.clientName.trim()
      : 'Un prospect';
    if (!creation.idempotent) await createProjectNotification(
      { id: record.id, artisanId },
      'new_project',
      {
        title: 'Nouveau dossier',
        message: `${clientLabel} vient d'être créé.`,
        priority: 'high',
      },
    );

    // Email de confirmation client (best-effort) : ne doit jamais faire
    // echouer la creation du projet, ni etre attendu de facon bloquante.
    if (!creation.idempotent) await sendClientProjectConfirmationEmailBestEffort({
      projectId: record.id,
      artisanId,
      clientEmail: String(input.clientEmail || ''),
      clientFirstName: typeof input.clientFirstName === 'string' ? input.clientFirstName : undefined,
      projectType: typeof input.projectType === 'string' ? input.projectType : undefined,
      aiSummary: typeof input.aiSummary === 'string' ? input.aiSummary : undefined,
      city: typeof input.city === 'string' ? input.city : undefined,
      siteAddress: typeof input.siteAddress === 'string' ? input.siteAddress : undefined,
      budget: typeof input.budget === 'string' ? input.budget : undefined,
      desiredTimeline: typeof input.desiredTimeline === 'string' ? input.desiredTimeline : undefined,
      clientPhone: typeof input.clientPhone === 'string' ? input.clientPhone : undefined,
      photosCount: Array.isArray(input.photos) ? input.photos.length : undefined,
    });

    return NextResponse.json({
      success: true,
      recordId: record.id,
      clientId: creation.clientId,
      clientResolutionOutcome: creation.clientResolutionOutcome,
      clientResolutionWarning: creation.clientResolutionWarning,
      idempotent: creation.idempotent,
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
