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

    aiSummary: fields['AI Summary'] ?? '',
    chatHistory: fields['Chat History'] ?? '',
    tradeAnswers: fields['Trade Answers'] ?? '',

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const trade = searchParams.get('trade');
    const search = searchParams.get('search')?.toLowerCase();

    const records = await airtableBase(TABLES.projects)
      .select({
        maxRecords: 100,
        sort: [{ field: 'Created At', direction: 'desc' }],
      })
      .firstPage();

    let projects = records.map(mapProject);

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
    console.error('GET_PROJECTS_ERROR', error);

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

export async function POST(request: Request) {
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_PROJECTS_TABLE;

    console.log('[AIRTABLE DEBUG] apiKey present:', !!apiKey);
    console.log('[AIRTABLE DEBUG] apiKey prefix:', apiKey?.slice(0, 10));
    console.log('[AIRTABLE DEBUG] baseId:', baseId);
    console.log('[AIRTABLE DEBUG] tableName:', tableName);

    const input = await request.json();

    const postalNum = input.postalCode
      ? Number.parseInt(input.postalCode, 10)
      : undefined;

    const latNum = input.latitude
      ? Number.parseFloat(input.latitude)
      : undefined;

    const lonNum = input.longitude
      ? Number.parseFloat(input.longitude)
      : undefined;

    const record = await airtableBase(TABLES.projects).create({
      'Client Name': input.clientName ?? '',
      'Client First Name': input.clientFirstName ?? '',
      'Client Phone': input.clientPhone ?? '',
      'Client Email': input.clientEmail ?? '',
      'Site Address': input.siteAddress ?? '',
      City: input.city ?? '',
      'Postal Code': Number.isNaN(postalNum) ? undefined : postalNum,
      Latitude: Number.isNaN(latNum) ? undefined : latNum,
      Longitude: Number.isNaN(lonNum) ? undefined : lonNum,
      Trade: input.trade ?? 'Autre',
      'Project Type': input.projectType ?? '',
      Budget: input.budget ?? '',
      'Desired Timeline': input.desiredTimeline ?? '',
      Maturity: input.maturity ?? '',
      'AI Summary': input.aiSummary ?? '',
      'Chat History': input.chatHistory ?? input.projectDetails ?? '',
      'Trade Answers': input.tradeAnswers
        ? JSON.stringify(input.tradeAnswers)
        : '',
      'Completeness Score': input.completenessScore ?? 0,
      Status: 'Nouveau',
      'Lead Status': 'Nouveau',
      Contacted: false,
      'Artisan ID': input.artisanId ?? 'Artisan_demo',
      Source: input.source ?? 'web',
      'Call ID': input.callId ?? '',
      'Assigned To': input.assignedTo ?? '',
      Photos: (input.photos || []).map((p: { url: string } | string) => ({
        url: typeof p === 'string' ? p : p.url
      })),
    });

    return NextResponse.json({
      success: true,
      recordId: record.id,
    });
  } catch (error) {
    console.error('CREATE_PROJECT_ERROR', JSON.stringify(error, Object.getOwnPropertyNames(error)));

    const airtableError = error as { message?: string; error?: string; statusCode?: number };

    return NextResponse.json(
      {
        success: false,
        error:
          airtableError.message ??
          airtableError.error ??
          (error instanceof Error ? error.message : JSON.stringify(error, null, 2)),
      },
      { status: 500 },
    );
  }
}