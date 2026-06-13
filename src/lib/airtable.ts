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

export async function getEvents(artisanId: string) {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID

  const url = `https://api.airtable.com/v0/${baseId}/Events?filterByFormula=${encodeURIComponent(`{ArtisanId}="${artisanId}"`)}&sort[0][field]=Date&sort[0][direction]=asc`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  const data = await res.json()
  return (data.records || []).map((r: any) => ({
    id: r.id,
    title: r.fields.Title as string,
    date: r.fields.Date as string,
    type: r.fields.Type as string,
    projectId: r.fields.ProjectId as string,
    artisanId: r.fields.ArtisanId as string,
    status: r.fields.Status as string,
    notes: r.fields.Notes as string,
  }))
}

export async function createEvent(data: {
  title: string
  date: string
  type: string
  projectId?: string
  artisanId: string
  notes?: string
}) {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/Events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        Title: data.title,
        Date: data.date,
        Type: data.type,
        ProjectId: data.projectId || '',
        ArtisanId: data.artisanId,
        Status: 'Prévu',
        Notes: data.notes || '',
      },
    }),
  })
  const result = await res.json()
  return result
}

export async function updateEvent(id: string, fields: Record<string, unknown>) {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/Events/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  })
  return res.json()
}

export async function deleteEvent(id: string) {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/Events/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  return res.json()
}

export async function getArtisanByArtisanId(artisanId: string) {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  const table = process.env.AIRTABLE_USERS_TABLE || 'Users'

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?filterByFormula=${encodeURIComponent(`{Artisan ID}="${artisanId}"`)}&maxRecords=1`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })

  const data = await res.json()
  const record = data.records?.[0]
  if (!record) return null

  return {
    id: record.id,
    artisanId: (record.fields['Artisan ID'] || '') as string,
    companyName: (record.fields['Company Name'] || '') as string,
    primaryColor: (record.fields['Primary Color'] || '#22c55e') as string,
    plan: (record.fields['Plan'] || '') as string,
    active: record.fields['Active'] !== false,
  }
}

export async function getArtisanConfig(artisanId: string) {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID

  const url = `https://api.airtable.com/v0/${baseId}/Artisan_config?filterByFormula=${encodeURIComponent(`{Artisan ID}="${artisanId}"`)}&maxRecords=1`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  const data = await res.json()
  const record = data.records?.[0]

  console.log('[ARTISAN_CONFIG] artisanId:', artisanId)
  console.log('[ARTISAN_CONFIG] records found:', data.records?.length)

  if (!record) return null

  return {
    id: record.id,
    artisanId: record.fields['Artisan ID'] as string || '',
    companyName: record.fields['Company Name'] as string || '',
    primaryTrade: record.fields['Primary Trade'] as string || '',
    phone: record.fields['Phone'] as string || '',
    email: record.fields['Email'] as string || '',
    address: record.fields['Address'] as string || '',
    hours: record.fields['Hours'] as string || '',
    logoUrl: record.fields['Logo URL'] as string || '',
    welcomeName: record.fields['Welcome Name'] as string || '',
    welcomeMessage: record.fields['Welcome Message'] as string || '',
    primaryColor: record.fields['Primary Color'] as string || '#22c55e',
    secondaryColor: record.fields['Secondary Color'] as string || '#18181b',
    qualificationFlow: record.fields['Qualification Flow'] as string || '',
    websiteUrl: record.fields['Website URL'] as string || '',
    active: record.fields['Active'] === true ||
            record.fields['Active'] === 'True' ||
            record.fields['Active'] === 'true',
    aiInstructions: record.fields['AI Instructions'] as string || '',
    trades: record.fields['Trades'] as string || '',
  }
}

export async function updateArtisanConfig(
  recordId: string,
  fields: Record<string, unknown>
) {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID

  console.log('[ARTISAN_CONFIG] Updating record:', recordId, 'fields:', Object.keys(fields))

  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/Artisan_config/${recordId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  )
  const result = await res.json()
  console.log('[ARTISAN_CONFIG] Update result:', result.id ? 'success' : result)
  return result
}

export async function createCommercialLead(data: {
  nom: string
  prenom: string
  societe: string
  trade: string
  offer: string
  answers: string
  email?: string
  phone?: string
  preferredSlot?: string
  demand?: string
  teamSize?: string
  website?: string
}) {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID

  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/Commercial`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          'Nom': data.nom,
          'Prénom': data.prenom,
          'Societe': data.societe,
          'Trade': data.trade,
          'Offer': data.offer,
          'Answers': data.answers,
          'Email': data.email || '',
          'Phone': data.phone || '',
          'Preferred Slot': data.preferredSlot || '',
        },
      }),
    }
  )
  const result = await res.json()
  console.log('[COMMERCIAL] Lead created:', result.id || result)
  return result
}
