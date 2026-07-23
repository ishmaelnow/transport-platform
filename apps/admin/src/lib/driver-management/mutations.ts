import type { SupabaseAuthSession } from "@esh-platform/supabase";
import type { DriverProfileInput, DriverStatusInput } from "./types";

export async function createDriver(
  session: SupabaseAuthSession,
  tenantId: string,
  input: DriverProfileInput,
) {
  return send("/api/tenant-admin/drivers", session, { tenantId, ...input });
}

export async function updateDriver(
  session: SupabaseAuthSession,
  tenantId: string,
  driverProfileId: string,
  input: DriverProfileInput,
) {
  return send(
    "/api/tenant-admin/drivers",
    session,
    {
      tenantId,
      driverProfileId,
      ...input,
    },
    "PATCH",
  );
}

export async function transitionDriver(
  session: SupabaseAuthSession,
  tenantId: string,
  driverProfileId: string,
  input: DriverStatusInput,
) {
  return send(
    "/api/tenant-admin/drivers/status",
    session,
    {
      tenantId,
      driverProfileId,
      ...input,
    },
    "PATCH",
  );
}

async function send(
  path: string,
  session: SupabaseAuthSession,
  body: unknown,
  method: "POST" | "PATCH" = "POST",
) {
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return response.ok
    ? { ok: true as const }
    : { ok: false as const, message: payload?.message ?? "The request was rejected." };
}
