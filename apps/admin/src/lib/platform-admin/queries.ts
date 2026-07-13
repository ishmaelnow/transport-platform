import type {
  TenantCapabilityRow,
  TenantConfigurationRow,
  TenantInvitationRow,
  TenantRow,
} from "@transport-platform/supabase";
import type { AdminSupabaseClient } from "@/lib/tenant-admin/context";
import type { PlatformAdminSummary, PlatformTenantListItem } from "./types";

export async function loadPlatformAdminSummary(
  supabase: AdminSupabaseClient,
  personId: string | null,
): Promise<PlatformAdminSummary> {
  if (!personId) {
    return { roles: [], tenants: [] };
  }

  const { data: roles, error: rolesError } = await supabase
    .from("platform_role_assignments")
    .select("*")
    .eq("person_id", personId)
    .eq("status", "active")
    .in("role_key", ["platform_owner", "platform_admin"]);

  if (rolesError) {
    throw rolesError;
  }

  if ((roles ?? []).length === 0) {
    return { roles: [], tenants: [] };
  }

  const [tenantsResult, configurationsResult, capabilitiesResult, invitationsResult] =
    await Promise.all([
      supabase.from("tenants").select("*").order("created_at", { ascending: false }),
      supabase.from("tenant_configurations").select("*"),
      supabase.from("tenant_capabilities").select("*").order("capability_key", { ascending: true }),
      supabase.from("tenant_invitations").select("*").order("created_at", { ascending: false }),
    ]);

  if (tenantsResult.error) {
    throw tenantsResult.error;
  }

  if (configurationsResult.error) {
    throw configurationsResult.error;
  }

  if (capabilitiesResult.error) {
    throw capabilitiesResult.error;
  }

  if (invitationsResult.error) {
    throw invitationsResult.error;
  }

  return {
    roles: roles ?? [],
    tenants: combineTenantRows(
      tenantsResult.data ?? [],
      configurationsResult.data ?? [],
      capabilitiesResult.data ?? [],
      invitationsResult.data ?? [],
    ),
  };
}

function combineTenantRows(
  tenants: TenantRow[],
  configurations: TenantConfigurationRow[],
  capabilities: TenantCapabilityRow[],
  invitations: TenantInvitationRow[],
): PlatformTenantListItem[] {
  const configurationsByTenant = new Map(
    configurations.map((configuration) => [configuration.tenant_id, configuration]),
  );
  const capabilitiesByTenant = groupByTenant(capabilities);
  const invitationsByTenant = groupByTenant(invitations);

  return tenants.map((tenant) => ({
    tenant,
    configuration: configurationsByTenant.get(tenant.tenant_id) ?? null,
    capabilities: capabilitiesByTenant.get(tenant.tenant_id) ?? [],
    invitations: invitationsByTenant.get(tenant.tenant_id) ?? [],
  }));
}

function groupByTenant<TRow extends { tenant_id: string }>(rows: TRow[]) {
  const grouped = new Map<string, TRow[]>();

  for (const row of rows) {
    const rowsForTenant = grouped.get(row.tenant_id) ?? [];
    rowsForTenant.push(row);
    grouped.set(row.tenant_id, rowsForTenant);
  }

  return grouped;
}
