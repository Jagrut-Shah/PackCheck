import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// For browser/client-side
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side: use service role key when available; fall back to anon client (not null)
// IMPORTANT: Service role bypasses Row Level Security — never expose to the browser
export const supabaseAdmin =
  typeof window === 'undefined' && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false },
      })
    : supabase