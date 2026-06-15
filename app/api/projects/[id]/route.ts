import { NextResponse } from 'next/server';
import { airtableBase, TABLES, createEvent, getEvents, updateEvent } from '@/src/lib/airtable';
import { getSession } from '@/src/lib/auth-utils';

function mapProject(record: any) {
  const fields = record.fields;

  return {
    id: record.id,
    projectNumber: record.id.slice(-6),

    status: fields.Status ?? 'Inconnu',
    leadStatus: fields['Lead Status'] ?? '',

    clientName: fields['Client Name'] ?? '',
    clientFirstName: fields['Client First Name'] ?? '',
    clientEmail: fields['Client Email'] ?? '',
    clientPhone: fields['Client Phone'] ?? '',

    siteAddress: fields['Site Address'] ?? '',
    city: fields.City ?? '',
    postalCode: fields['Postal Code'] ?? '',

    trade: fields.Trade ?? '',
    projectType: fields['Project Type'] ?? '',
    budget: fields.Budget ?? '',
    desiredTimeline: fields['Desired Timeline'] ?? '',
    maturity: fields.Maturity ?? '',

    aiSummary: fields['AI Summary'] ?? '',
    chatHistory: fields['Chat History'] ?? '',
    tradeAnswers: fields['Trade Answers'] ?? '',

    internalNotes: fields['Artisan Notes'] ?? '',

    createdAt: fields['Created At'] ?? '',
    completenessScore: fields['Completeness Score'] ?? 0,

    contacted: fields.Contacted ?? false,
    assignedTo: fields['Assigned To'] ?? '',
    artisanId: fields['Artisan ID'] ?? '',
    source: fields.Source ?? '',

    latitude: fields.Latitude ?? null,
    longitude: fields.Longitude ?? null,

    callbackDate: fields['Callback Date'] ?? '',
    devisAmount: (fields['Devis_amount'] as number) || 0,

    photos: (() => {
      const raw = fields.Photos;
      if (!raw || !Array.isArray(raw)) return [];
      return (raw as any[]).map(attachment => ({
        url: attachment.url || '',
        thumbnailUrl: attachment.thumbnails?.large?.url ||
                      attachment.thumbnails?.small?.url ||
                      attachment.url || '',
        filename: attachment.filename || '',
        size: attachment.size || 0,
      }));
    })(),
  };
}

async function createActivityLog(
  projectId: string,
  action: string,
  description: string,
) {
  await airtableBase(TABLES.activity).create({
    'Project ID': projectId,
    Action: action,
    Description: description,
  });
}

async function getAuthorizedProject(id: string, artisanId: string) {
  let record;

  try {
    record = await airtableBase(TABLES.projects).find(id);
  } catch {
    return { status: 404 as const };
  }

  if (record.fields['Artisan ID'] !== artisanId) {
    return { status: 403 as const };
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
    const result = await getAuthorizedProject(id, session.artisanId);

    if (result.status === 404) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });
    }

    if (result.status === 403) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      project: mapProject(result.record),
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
    const authResult = await getAuthorizedProject(id, session.artisanId);

    if (authResult.status === 404) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });
    }

    if (authResult.status === 403) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    const input = await request.json();
    const fieldsToUpdate: Record<string, string | number | boolean | undefined> = {};

    if (input.status) {
      fieldsToUpdate.Status = input.status;
    }

    if (input.contacted !== undefined) {
      fieldsToUpdate.Contacted = input.contacted;
    }

    if (input.internalNotes !== undefined) {
      fieldsToUpdate['Artisan Notes'] = input.internalNotes;
    }

    if (input.callbackDate !== undefined) {
      fieldsToUpdate['Callback Date'] = input.callbackDate || undefined;
    }

    if (input.fields && typeof input.fields === 'object') {
      const safeFields = { ...input.fields };
      delete safeFields['Artisan ID'];
      delete safeFields['Artisan_id'];
      delete safeFields.ArtisanId;
      Object.assign(fieldsToUpdate, safeFields);
    }

    const record = await airtableBase(TABLES.projects).update(id, fieldsToUpdate);

    if (input.callbackDate !== undefined) {
      await createActivityLog(
        id,
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
          (e: { projectId: string; type: string }) => e.projectId === id && e.type === 'Relance',
        );

        const clientName = record.fields['Client Name'] || 'Prospect';

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
            projectId: id,
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
        id,
        'STATUS_UPDATED',
        `Statut modifié : ${input.status}`,
      );
    }

    if (input.internalNotes !== undefined) {
      await createActivityLog(
        id,
        'NOTE_UPDATED',
        'Note interne mise à jour',
      );
    }

    return NextResponse.json({
      success: true,
      project: mapProject(record),
    });
  } catch (error) {
    console.error('UPDATE_PROJECT_ERROR', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
