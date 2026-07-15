import type { SupabaseAuthSession } from "@transport-platform/supabase";
import type { MutationResult } from "@/lib/tenant-admin/types";
import type { TenantProvisioningPayload } from "./types";

export async function provisionTenant(
  session: SupabaseAuthSession,
  payload: TenantProvisioningPayload,
): Promise<MutationResult> {
  const response = await fetch("/api/platform-admin/tenants", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    return {
      ok: false,
      message: body?.message ?? "Tenant provisioning was rejected.",
    };
  }

  return body?.message ? { ok: true, message: body.message } : { ok: true };
}

export async function resendTenantInvitation(
  session: SupabaseAuthSession,
  tenantId: string,
  invitationId: string,
): Promise<MutationResult> {
  return postPlatformMutation(session, "/api/platform-admin/invitations/resend", {
    tenantId,
    invitationId,
  });
}

export async function closeProvisioningTenant(
  session: SupabaseAuthSession,
  tenantId: string,
  reason: string,
): Promise<MutationResult> {
  return postPlatformMutation(session, "/api/platform-admin/tenants/close", {
    tenantId,
    reason,
  });
}

export async function setTenantCapability(
  session: SupabaseAuthSession,
  tenantId: string,
  capabilityKey: string,
  enabled: boolean,
): Promise<MutationResult> {
  return postPlatformMutation(session, "/api/platform-admin/capabilities", {
    tenantId,
    capabilityKey,
    enabled,
  });
}

async function postPlatformMutation(
  session: SupabaseAuthSession,
  path: string,
  payload: unknown,
): Promise<MutationResult> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    return {
      ok: false,
      message: body?.message ?? "Platform administration action was rejected.",
    };
  }

  return body?.message ? { ok: true, message: body.message } : { ok: true };
}
