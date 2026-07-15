import { NextResponse } from "next/server";
import {
  createRequestSupabaseClient,
  getBearerToken,
  validateTenantId,
} from "@/lib/tenant-admin/server";
import { validateDriverStatusInput } from "@/lib/driver-management/server";

export async function PATCH(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token)
      return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    const tenantId = validateTenantId(body.tenantId);
    const driverProfileId = validateTenantId(body.driverProfileId);
    const input = validateDriverStatusInput(body);
    const supabase = createRequestSupabaseClient({ accessToken: token });
    const { data: person, error: personError } = await supabase.rpc("current_person_id");
    if (personError || !person) throw new Error("An active person profile is required.");
    const { error } = await supabase
      .from("driver_profiles")
      .update({
        status: input.status,
        status_reason: input.reason,
        updated_by_person_id: person,
      })
      .eq("tenant_id", tenantId)
      .eq("driver_profile_id", driverProfileId);
    if (error) return NextResponse.json({ message: error.message }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to change driver status." },
      { status: 400 },
    );
  }
}
