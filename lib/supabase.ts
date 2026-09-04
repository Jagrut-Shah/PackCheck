import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// For browser/client-side
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side (use service role key for admin operations)
export const supabaseAdmin = typeof window === 'undefined' && supabaseServiceRoleKey
  ? createClient(supabaseUrl!, supabaseServiceRoleKey)
  : null as any 