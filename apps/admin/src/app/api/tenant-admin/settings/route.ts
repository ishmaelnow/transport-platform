import { NextResponse } from "next/server";
import {
  createRequestSupabaseClient,
  getBearerToken,
  validateTenantConfigurationPayload,
  validateTenantId,
} from "@/lib/tenant-admin/server";

export async function PATCH(request: Request) {
  try {
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
    }

    const body = (await request.json()) as unknown;

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const tenantId = validateTenantId((body as { tenantId?: unknown }).tenantId);
    const configuration = validateTenantConfigurationPayload(
      (body as { configuration?: unknown }).configuration,
    );
    const supabase = createRequestSupabaseClient({ accessToken });
    const { error } = await supabase
      .from("tenant_configurations")
      .update(configuration)
      .eq("tenant_id", tenantId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to update tenant settings." },
      { status: 400 },
    );
  }
}
