import { NextResponse } from 'next/server';
import { airtableBase, TABLES } from '@/src/lib/airtable';

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const record = await airtableBase(TABLES.projects).find(id);

    return NextResponse.json({
      success: true,
      project: mapProject(record),
    });
  } catch (error) {
    console.error('GET_PROJECT_DETAIL_ERROR', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : JSON.stringify(error, null, 2),
      },
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

if (input.callbackDate !== undefined) {
  await createActivityLog(
    id,
    'CALLBACK_DATE_UPDATED',
    input.callbackDate
      ? `Date de rappel définie : ${input.callbackDate}`
      : 'Date de rappel supprimée',
  );
}

    if (input.fields && typeof input.fields === 'object') {
      Object.assign(fieldsToUpdate, input.fields);
    }

    const record = await airtableBase(TABLES.projects).update(id, fieldsToUpdate);

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
    console.error('UPDATE_PROJECT_ERROR', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : JSON.stringify(error, null, 2),
      },
      { status: 500 },
    );
  }
}