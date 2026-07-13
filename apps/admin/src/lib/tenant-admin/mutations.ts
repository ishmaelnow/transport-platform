import type { SupabaseAuthSession } from "@transport-platform/supabase";
import type { EditableTenantConfiguration, FoundationTenantRole, MutationResult } from "./types";

export async function updateTenantSettings(
  session: SupabaseAuthSession,
  tenantId: string,
  configuration: EditableTenantConfiguration,
): Promise<MutationResult> {
  return sendMutation("/api/tenant-admin/settings", session, {
    method: "PATCH",
    body: {
      tenantId,
      configuration,
    },
  });
}

export async function createTenantInvitation(
  session: SupabaseAuthSession,
  tenantId: string,
  email: string,
  role: FoundationTenantRole,
): Promise<MutationResult> {
  return sendMutation("/api/tenant-admin/invitations", session, {
    method: "POST",
    body: {
      tenantId,
      email,
      role,
    },
  });
}

export async function cancelTenantInvitation(
  session: SupabaseAuthSession,
  tenantId: string,
  invitationId: string,
): Promise<MutationResult> {
  return sendMutation("/api/tenant-admin/invitations", session, {
    method: "PATCH",
    body: {
      tenantId,
      invitationId,
    },
  });
}

export async function updateTenantMembershipStatus(
  session: SupabaseAuthSession,
  tenantId: string,
  membershipId: string,
  status: "suspended" | "removed",
): Promise<MutationResult> {
  return sendMutation("/api/tenant-admin/memberships", session, {
    method: "PATCH",
    body: {
      tenantId,
      membershipId,
      status,
    },
  });
}

async function sendMutation(
  path: string,
  session: SupabaseAuthSession,
  options: {
    method: "PATCH" | "POST";
    body: unknown;
  },
): Promise<MutationResult> {
  const response = await fetch(path, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options.body),
  });
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    return {
      ok: false,
      message: payload?.message ?? "The request was rejected.",
    };
  }

  return { ok: true };
}
