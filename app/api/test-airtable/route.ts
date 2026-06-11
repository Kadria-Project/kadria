import { NextResponse } from 'next/server';
import { airtableBase, TABLES } from '@/src/lib/airtable';

export async function GET() {
  try {
    const records = await airtableBase(TABLES.projects)
      .select({ maxRecords: 3 })
      .firstPage();

    return NextResponse.json({
      success: true,
      count: records.length,
      records: records.map((record) => ({
        id: record.id,
        fields: record.fields,
      })),
    });
  } catch (error) {
    console.error('AIRTABLE_TEST_ERROR', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : JSON.stringify(error, null, 2),
      },
      { status: 500 }
    );
  }
}