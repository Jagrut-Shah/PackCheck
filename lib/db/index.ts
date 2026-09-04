/**
 * PackCheck AI - Database Access Module
 * Owner: Vijay (Backend)
 * Purpose: PostgreSQL / Supabase client connections and query abstractions.
 * Note: Database queries should NEVER be made directly from client UI components.
 */

export interface DatabaseClient {
  isConfigured: boolean;
}

export function getDatabaseClient(): DatabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return {
    isConfigured: Boolean(supabaseUrl && !supabaseUrl.includes("your-project")),
  };
}
