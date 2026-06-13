import Airtable from 'airtable';

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey) {
  throw new Error('Missing AIRTABLE_API_KEY');
}

if (!baseId) {
  throw new Error('Missing AIRTABLE_BASE_ID');
}

export const airtableBase = new Airtable({ apiKey }).base(baseId);

export const TABLES = {
  projects: process.env.AIRTABLE_PROJECTS_TABLE || 'Projects',
  users: process.env.AIRTABLE_USERS_TABLE || 'Users',
  artisanConfig: process.env.AIRTABLE_ARTISAN_CONFIG_TABLE || 'Artisan_config',
  activity: 'Activity',

} as const;

export async function getArtisanByEmail(email: string) {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  const table = process.env.AIRTABLE_USERS_TABLE || 'Users'

  // Essaie plusieurs variantes du nom du champ email
  const filters = [
    `{Email}="${email}"`,
    `{email}="${email}"`,
    `{E-mail}="${email}"`,
    `{Mail}="${email}"`,
  ]

  for (const filter of filters) {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?filterByFormula=${encodeURIComponent(filter)}&maxRecords=1`

    console.log('[AIRTABLE] Trying filter:', filter)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })

    const data = await res.json()
    console.log('[AIRTABLE] Records found:', data.records?.length, 'for filter:', filter)

    if (data.records?.length > 0) {
      const record = data.records[0]
      console.log('[AIRTABLE] Fields available:', JSON.stringify(Object.keys(record.fields)))

      return {
        id: record.id,
        artisanId: (record.fields['Artisan ID'] ||
                    record.fields['artisanId'] ||
                    record.fields['ArtisanId'] || '') as string,
        companyName: (record.fields['Company Name'] ||
                      record.fields['companyName'] || '') as string,
        email: email,
        primaryColor: (record.fields['Primary Color'] ||
                       record.fields['primaryColor'] || '#22c55e') as string,
        plan: (record.fields['Plan'] || '') as string,
        active: record.fields['Active'] !== false,
      }
    }
  }

  console.log('[AIRTABLE] Email not found in any field variant:', email)
  return null
}
