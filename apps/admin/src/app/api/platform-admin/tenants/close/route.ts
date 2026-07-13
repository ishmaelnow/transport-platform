import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { validateTenantClosePayload } from "@/lib/platform-admin/server";
import { createRequestSupabaseClient, getBearerToken } from "@/lib/tenant-admin/server";

export async function POST(request: Request) {
  try {
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
    }

    const payload = validateTenantClosePayload((await request.json()) as unknown);
    const supabase = createRequestSupabaseClient({ accessToken });
    const { error } = await supabase.rpc("close_provisioning_tenant", {
      target_tenant_id: payload.tenantId,
      reason: payload.reason,
      correlation_id: randomUUID(),
    });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ ok: true, message: "Provisioning tenant closed." });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to close provisioning tenant." },
      { status: 400 },
    );
  }
}
