import { NextResponse } from "next/server";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.tenantId !== "string" || typeof body.fullName !== "string" || typeof body.email !== "string") throw new Error("Tenant, name, and email are required.");
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.rpc("submit_driver_application", { target_tenant_id: body.tenantId, applicant_name: body.fullName, applicant_email: body.email, applicant_phone: typeof body.phone === "string" ? body.phone : null });
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to submit application." }, { status: 400 });
  }
}
