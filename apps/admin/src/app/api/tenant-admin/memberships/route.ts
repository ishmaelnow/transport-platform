import { NextResponse } from "next/server";
import {
  createRequestSupabaseClient,
  getBearerToken,
  validateMembershipAction,
} from "@/lib/tenant-admin/server";

export async function PATCH(request: Request) {
  try {
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
    }

    const action = validateMembershipAction((await request.json()) as unknown);
    const supabase = createRequestSupabaseClient({ accessToken });
    const timestamp = new Date().toISOString();
    const update =
      action.status === "suspended"
        ? { status: action.status, suspended_at: timestamp }
        : { status: action.status, removed_at: timestamp };
    const { error } = await supabase
      .from("tenant_memberships")
      .update(update)
      .eq("tenant_id", action.tenantId)
      .eq("membership_id", action.membershipId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to update membership." },
      { status: 400 },
    );
  }
}
