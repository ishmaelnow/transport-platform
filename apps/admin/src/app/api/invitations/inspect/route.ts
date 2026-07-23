import { NextResponse } from "next/server";
import { createAnonymousSupabaseClient } from "@esh-platform/supabase";
import { getAdminSupabaseEnv } from "@/lib/config";
import { hashRawInvitationToken } from "@/lib/invitations/server";
import { createRequestSupabaseClient, getBearerToken } from "@/lib/tenant-admin/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown };
    const tokenHash = hashRawInvitationToken(body.token);
    const accessToken = getBearerToken(request);
    const supabase = accessToken
      ? createRequestSupabaseClient({ accessToken })
      : createAnonymousSupabaseClient(getAdminSupabaseEnv());
    const { data, error } = await supabase.rpc("inspect_tenant_invitation_token", {
      token_hash: tokenHash,
    });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ status: data?.[0]?.status ?? "invalid_token" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to inspect invitation." },
      { status: 400 },
    );
  }
}
