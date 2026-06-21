import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function createSupabaseError() {
  return new Error('Missing Supabase server environment variables')
}

export function getSupabaseAdmin() {
  if (client) {
    return client
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseSecretKey) {
    throw createSupabaseError()
  }

  client = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return client
}

export const supabaseAdmin = new Proxy(
  {},
  {
    get(_target, prop, receiver) {
      return Reflect.get(getSupabaseAdmin(), prop, receiver)
    },
  },
) as SupabaseClient
