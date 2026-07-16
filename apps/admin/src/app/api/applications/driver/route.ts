import { NextResponse } from "next/server";
import { createAnonymousSupabaseClient } from "@transport-platform/supabase";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const tenantId = form.get("tenantId");
    const fullName = form.get("fullName");
    const email = form.get("email");
    if (typeof tenantId !== "string" || typeof fullName !== "string" || typeof email !== "string") throw new Error("Tenant, name, and email are required.");
    const supabase = createAnonymousSupabaseClient();
    const phone = form.get("phone");
    const { data: applicationId, error } = await supabase.rpc("submit_driver_application", { target_tenant_id: tenantId, applicant_name: fullName, applicant_email: email, applicant_phone: typeof phone === "string" ? phone : null });
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    const paths: Record<string, string | null> = { personal: null, vehicle: null, document: null };
    for (const [field, key] of [["personalPhoto", "personal"], ["vehiclePhoto", "vehicle"], ["document", "document"]] as const) {
      const file = form.get(field);
      if (!(file instanceof File) || file.size === 0) continue;
      if (file.size > 5_000_000 || !["image/jpeg", "image/png", "application/pdf"].includes(file.type)) throw new Error("Files must be JPEG, PNG, or PDF and 5MB or smaller.");
      const path = `${tenantId}/${applicationId}/${field}-${file.name}`;
      const upload = await supabase.storage.from("driver-application-files").upload(path, file, { upsert: false });
      if (upload.error) throw upload.error;
      paths[key] = path;
    }
    const attach = await supabase.rpc("attach_driver_application_files", { target_application_id: applicationId, personal_path: paths.personal ?? null, vehicle_path: paths.vehicle ?? null, document_path_value: paths.document ?? null });
    if (attach.error) throw attach.error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to submit application." }, { status: 400 });
  }
}
