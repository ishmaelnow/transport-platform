import { NextResponse } from "next/server";
import {
  createRequestSupabaseClient,
  getBearerToken,
  validateTenantId,
} from "@/lib/tenant-admin/server";

export async function PATCH(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token)
      return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    const tenantId = validateTenantId(body.tenantId);
    if (typeof body.capabilityKey !== "string" || !body.capabilityKey.trim())
      throw new Error("Capability key is required.");
    if (typeof body.enabled !== "boolean") throw new Error("Enabled must be boolean.");
    const supabase = createRequestSupabaseClient({ accessToken: token });
    const { error } = await supabase
      .from("tenant_capabilities")
      .update({
        enabled: body.enabled,
        enabled_at: body.enabled ? new Date().toISOString() : null,
        disabled_at: body.enabled ? null : new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("capability_key", body.capabilityKey);
    if (error) return NextResponse.json({ message: error.message }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to update capability." },
      { status: 400 },
    );
  }
}

export { PATCH as POST };
