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
