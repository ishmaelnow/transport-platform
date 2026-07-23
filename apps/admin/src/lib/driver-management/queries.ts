import type { DriverProfileRow } from "@esh-platform/supabase";
import type { AdminSupabaseClient } from "@/lib/tenant-admin/context";

export async function loadDriverProfiles(supabase: AdminSupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("driver_profiles")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DriverProfileRow[];
}
