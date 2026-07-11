import { NextResponse } from 'next/server';
import { TABLES, createEvent, getEvents, updateEvent } from '@/src/lib/airtable';
import { getSession } from '@/src/lib/auth-utils';
import {
  getAssignedAppointmentProjectIds,
  listAssignableProjectResponsibles,
  listProjectResponsiblesByTenant,
  projectResponsibilityColumnExists,
} from '@/src/lib/project-responsibility';
import { mapSupabaseProject, toSupabaseProjectUpdate } from '@/src/lib/supabase/mapping';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import { checkPermission, requirePermission } from '@/src/lib/team/access';
import { type TenantContext, getCurrentTenantContext, tableHasColumn } from '@/src/lib/tenant-context';

async function createActivityLog(
  projectId: string,
  action: string,
  description: string,
) {
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({
    project_id: projectId,
    action,
    description,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[ACTIVITY] Insert FULL error:', JSON.stringify(error, null, 2));
  }
}

async function getAuthorizedProject(
  id: string,
  artisanId: string,
  tenantContext: TenantContext | null,
) {
  const tenantId = tenantContext?.tenantId;
  const supportsTenantId = tenantId ? await tableHasColumn(TABLES.projects, 'tenant_id') : false;
  const direct = await supabaseAdmin
    .from(TABLES.projects)
    .select('*')
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
      .select('*')
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

  if (supportsTenantId && record.tenant_id) {
    if (String(record.tenant_id) !== tenantId) {
      return { status: 404 as const };
    }
  } else if (record.artisan_id !== artisanId) {
    return { status: 404 as const };
  }

  if (tenantContext?.tenantId) {
    const canReadAll = checkPermission(tenantContext, 'projects.read_all');
    const canReadAssigned = checkPermission(tenantContext, 'projects.read_assigned');

    if (!canReadAll) {
      if (!canReadAssigned) {
        return { status: 403 as const };
      }

      const responsibleUserId = typeof record.responsible_user_id === 'string' ? record.responsible_user_id : null;
      if (responsibleUserId !== tenantContext.userId) {
        const appointmentProjectIds = await getAssignedAppointmentProjectIds(tenantContext.tenantId, tenantContext.userId);
        if (!appointmentProjectIds.has(String(record.id))) {
          return { status: 404 as const };
        }
      }
    }
  }

  return { status: 200 as const, record };
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
    const tenantContext = await getCurrentTenantContext();
    const result = await getAuthorizedProject(id, session.artisanId, tenantContext);

    if (result.status === 404) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });
    }

    if (result.status === 403) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    let project = mapSupabaseProject(result.record);
    const supportsResponsibleUser = await projectResponsibilityColumnExists();
    const canAssignProjects = checkPermission(tenantContext, 'projects.assign');
    const canReassignProjects = checkPermission(tenantContext, 'projects.reassign');
    const canUpdateProject = checkPermission(tenantContext, 'projects.update');
    const availableResponsibles = tenantContext?.tenantId
      ? await listAssignableProjectResponsibles(tenantContext.tenantId)
      : [];

    if (supportsResponsibleUser && tenantContext?.tenantId) {
      const responsibilityMap = await listProjectResponsiblesByTenant(tenantContext.tenantId);
      project = {
        ...project,
        responsibleUser: project.responsibleUserId ? responsibilityMap.get(project.responsibleUserId) || null : null,
      };
    }

    return NextResponse.json({
      success: true,
      project,
      viewerContext: {
        currentUserId: tenantContext?.userId || null,
        canAssignProjects,
        canReassignProjects,
        canUpdateProject,
      },
      availableResponsibles,
    });
  } catch (error) {
    console.error('GET_PROJECT_DETAIL_ERROR', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const tenantContext = await getCurrentTenantContext();
    if (tenantContext) {
      requirePermission(tenantContext, 'projects.update');
    }
    const authResult = await getAuthorizedProject(id, session.artisanId, tenantContext);

    if (authResult.status === 404) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });
    }

    if (authResult.status === 403) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    const input = await request.json();
    const fieldsToUpdate: Record<string, unknown> = {};

    if (input.status) {
      fieldsToUpdate.status = input.status;
    }

    if (input.contacted !== undefined) {
      fieldsToUpdate.contacted = input.contacted;
    }

    if (input.internalNotes !== undefined) {
      fieldsToUpdate.artisan_notes = input.internalNotes;
    }

    if (input.callbackDate !== undefined) {
      fieldsToUpdate.callback_date = input.callbackDate || null;
    }

    if (input.leadStatus !== undefined) {
      fieldsToUpdate.lead_status = input.leadStatus;
    }

    if (input.fields && typeof input.fields === 'object') {
      const safeFields = { ...input.fields } as Record<string, unknown>;
      delete safeFields['Artisan ID'];
      Object.assign(fieldsToUpdate, toSupabaseProjectUpdate(safeFields));
    }

    const targetId = authResult.record.id as string;
    const { data: record, error } = await supabaseAdmin
      .from(TABLES.projects)
      .update(fieldsToUpdate)
      .eq('id', targetId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    if (input.callbackDate !== undefined) {
      await createActivityLog(
        targetId,
        'CALLBACK_DATE_UPDATED',
        input.callbackDate
          ? `Date de rappel définie : ${input.callbackDate}`
          : 'Date de rappel supprimée',
      );
    }

    if (input.callbackDate) {
      try {
        const existingEvents = await getEvents(session.artisanId);
        const existingRelance = existingEvents.find(
          (e: { projectId: string; type: string }) => e.projectId === targetId && e.type === 'Relance',
        );

        const clientName = record.client_name || 'Prospect';

        if (existingRelance) {
          await updateEvent(existingRelance.id, {
            Date: input.callbackDate,
            Title: `Relance — ${clientName}`,
          });
        } else {
          await createEvent({
            title: `Relance — ${clientName}`,
            date: input.callbackDate,
            type: 'Relance',
            projectId: targetId,
            artisanId: session.artisanId,
            notes: 'Relance programmée depuis le dossier projet',
          });
        }
      } catch (eventError) {
        console.error('[EVENTS] Failed to sync relance:', eventError instanceof Error ? eventError.message : String(eventError));
      }
    }

    if (input.status) {
      await createActivityLog(
        targetId,
        'STATUS_UPDATED',
        `Statut modifié : ${input.status}`,
      );
    }

    if (input.internalNotes !== undefined) {
      await createActivityLog(
        targetId,
        'NOTE_UPDATED',
        'Note interne mise à jour',
      );
    }

    if (input.leadStatus === 'archived') {
      await createActivityLog(
        targetId,
        'PROJECT_ARCHIVED',
        `Dossier archivé le ${new Date().toLocaleDateString('fr-FR')}`,
      );
    }

    return NextResponse.json({
      success: true,
      project: mapSupabaseProject(record),
    });
  } catch (error) {
    console.error('UPDATE_PROJECT_ERROR', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
