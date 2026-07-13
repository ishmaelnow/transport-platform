import { NextResponse } from "next/server";
import { createAnonymousSupabaseClient } from "@transport-platform/supabase";
import { getAdminServerConfig, getAdminSupabaseEnv } from "@/lib/config";
import { hashRawInvitationToken } from "@/lib/invitations/server";
import { normalizeEmail } from "@/lib/tenant-admin/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; token?: unknown };

    if (typeof body.email !== "string" || body.email.trim().length === 0) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    const email = body.email.trim();
    const tokenHash = hashRawInvitationToken(body.token);
    const config = getAdminServerConfig();
    const supabase = createAnonymousSupabaseClient(getAdminSupabaseEnv(config));
    const { data, error } = await supabase.rpc("inspect_tenant_invitation_token", {
      token_hash: tokenHash,
    });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    const invitation = data?.[0];

    if (!invitation || invitation.status !== "pending") {
      return NextResponse.json({ status: invitation?.status ?? "invalid_token" }, { status: 400 });
    }

    if (normalizeEmail(email) !== normalizeEmail(invitation.invitation_email ?? "")) {
      return NextResponse.json({ status: "email_mismatch" }, { status: 403 });
    }

    const redirectTo = new URL("/auth/reset-password", config.invitations.baseUrl);
    redirectTo.searchParams.set("token", body.token as string);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo.toString(),
    });

    if (resetError) {
      return NextResponse.json({ message: resetError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to request password reset." },
      { status: 400 },
    );
  }
}
