import { NextResponse } from 'next/server';
import { airtableBase, TABLES } from '@/src/lib/airtable';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const records = await airtableBase(TABLES.activity)
      .select({
        filterByFormula: `{Project ID} = '${id}'`,
        sort: [{ field: 'Created At', direction: 'desc' }],
        maxRecords: 50,
      })
      .firstPage();

    const activities = records.map((record) => ({
      id: record.id,
      projectId: record.fields['Project ID'] ?? '',
      action: record.fields.Action ?? '',
      description: record.fields.Description ?? '',
      createdAt: record.fields['Created At'] ?? '',
    }));

    return NextResponse.json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error('GET_PROJECT_ACTIVITY_ERROR', error);

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