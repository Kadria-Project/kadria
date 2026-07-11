import { NextResponse } from 'next/server';
import { TABLES, createEvent, getEvents, updateEvent } from '@/src/lib/airtable';
import {
  authorizeProjectAccess,
  listAssignableProjectResponsibles,
  listProjectResponsiblesByTenant,
  projectResponsibilityColumnExists,
} from '@/src/lib/project-responsibility';
import { mapSupabaseProject, toSupabaseProjectUpdate } from '@/src/lib/supabase/mapping';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import { checkPermission, PermissionError } from '@/src/lib/team/access';

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await authorizeProjectAccess({
      projectId: id,
      select: '*',
      allowAppointmentAccess: true,
    });

    if (!result) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });
    }

    let project = mapSupabaseProject(result.project);
    const supportsResponsibleUser = await projectResponsibilityColumnExists();
    const canAssignProjects = checkPermission(result.tenantContext, 'projects.assign');
    const canReassignProjects = checkPermission(result.tenantContext, 'projects.reassign');
    const canUpdateProject = checkPermission(result.tenantContext, 'projects.update');
    const availableResponsibles = result.tenantContext?.tenantId
      ? await listAssignableProjectResponsibles(result.tenantContext.tenantId)
      : [];

    if (supportsResponsibleUser && result.tenantContext?.tenantId) {
      const responsibilityMap = await listProjectResponsiblesByTenant(result.tenantContext.tenantId);
      project = {
        ...project,
        responsibleUser: project.responsibleUserId ? responsibilityMap.get(project.responsibleUserId) || null : null,
      };
    }

    return NextResponse.json({
      success: true,
      project,
      viewerContext: {
        currentUserId: result.tenantContext?.userId || null,
        canAssignProjects,
        canReassignProjects,
        canUpdateProject,
      },
      availableResponsibles,
    });
  } catch (error) {
    const permissionError = error as PermissionError;
    if (permissionError?.status) {
      return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status });
    }

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
    const { id } = await params;
    const authResult = await authorizeProjectAccess({
      projectId: id,
      select: '*',
      requiredPermission: 'projects.update',
      allowAppointmentAccess: true,
    });

    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });
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

    const targetId = authResult.projectId;
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
        const existingEvents = await getEvents(authResult.session.artisanId);
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
            artisanId: authResult.session.artisanId,
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
    const permissionError = error as PermissionError;
    if (permissionError?.status) {
      return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status });
    }

    console.error('UPDATE_PROJECT_ERROR', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
