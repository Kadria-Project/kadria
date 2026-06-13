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

  const url = `https://api.airtable.com/v0/${baseId}/${table}?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })

  const data = await res.json()
  const record = data.records?.[0]
  if (!record) return null

  return {
    id: record.id,
    artisanId: record.fields['Artisan ID'] as string,
    companyName: record.fields['Company Name'] as string,
    email: record.fields['Email'] as string,
    primaryColor: record.fields['Primary Color'] as string,
    plan: record.fields['Plan'] as string,
    active: record.fields['Active'] as boolean,
  }
}
