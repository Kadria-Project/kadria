import { NextResponse } from 'next/server';
import { airtableBase, TABLES } from '@/src/lib/airtable';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const record = await airtableBase(TABLES.projects).find(id);

    return NextResponse.json({
      success: true,
      project: {
        id: record.id,
        ...record.fields,
      },
    });
  } catch (error) {
    console.error('GET_PROJECT_ERROR', error);

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