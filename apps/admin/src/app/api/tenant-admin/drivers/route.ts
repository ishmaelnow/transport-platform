import { NextResponse } from "next/server";
import {
  createRequestSupabaseClient,
  getBearerToken,
  validateTenantId,
} from "@/lib/tenant-admin/server";
import { validateDriverProfileInput } from "@/lib/driver-management/server";

async function actor(request: Request) {
  const token = getBearerToken(request);
  if (!token) throw new Error("Authentication is required.");
  const supabase = createRequestSupabaseClient({ accessToken: token });
  const { data: person, error } = await supabase.rpc("current_person_id");
  if (error || !person) throw new Error("An active person profile is required.");
  return { supabase, personId: person };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const tenantId = validateTenantId(body.tenantId);
    const input = validateDriverProfileInput(body);
    const { supabase, personId } = await actor(request);
    const { error } = await supabase.from("driver_profiles").insert({
      tenant_id: tenantId,
      person_id: input.personId,
      driver_number: input.driverNumber,
      display_name: input.displayName,
      email: input.email,
      phone: input.phone,
      onboarding_date: input.onboardingDate,
      created_by_person_id: personId,
      updated_by_person_id: personId,
    });
    if (error) return NextResponse.json({ message: error.message }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to create driver." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const tenantId = validateTenantId(body.tenantId);
    const driverProfileId = validateTenantId(body.driverProfileId);
    const input = validateDriverProfileInput(body);
    const { supabase, personId } = await actor(request);
    const { error } = await supabase
      .from("driver_profiles")
      .update({
        person_id: input.personId,
        driver_number: input.driverNumber,
        display_name: input.displayName,
        email: input.email,
        phone: input.phone,
        onboarding_date: input.onboardingDate,
        updated_by_person_id: personId,
      })
      .eq("tenant_id", tenantId)
      .eq("driver_profile_id", driverProfileId);
    if (error) return NextResponse.json({ message: error.message }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to update driver." },
      { status: 400 },
    );
  }
}
