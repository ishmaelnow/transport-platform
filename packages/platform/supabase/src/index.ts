import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@transport-platform/config";
import type { Database } from "./database.types";

export type { Database, Json } from "./database.types";

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getPublicSupabaseConfig();

  return createClient<Database>(url, anonKey);
}

export function createServiceSupabaseClient(source: NodeJS.ProcessEnv = process.env) {
  const { url } = getPublicSupabaseConfig(source);
  const serviceRoleKey = source.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service Supabase access.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}
