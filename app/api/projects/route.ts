import { NextResponse } from 'next/server';
import { airtableBase, TABLES } from '@/src/lib/airtable';

export async function POST(request: Request) {
  try {
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
      Attachments: input.attachments
        ? JSON.stringify(input.attachments)
        : '[]',
    });

    return NextResponse.json({
      success: true,
      recordId: record.id,
    });
  } catch (error) {
    console.error('CREATE_PROJECT_ERROR', error);

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