import { NextResponse } from "next/server";
import { getAdminServerConfig } from "@/lib/config";
import { hashRawInvitationToken } from "@/lib/invitations/server";
import { createRequestSupabaseClient, getBearerToken } from "@/lib/tenant-admin/server";

export async function POST(request: Request) {
  try {
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json({ status: "authentication_required" }, { status: 401 });
    }

    const body = (await request.json()) as { token?: unknown };
    const tokenHash = hashRawInvitationToken(body.token);
    const config = getAdminServerConfig();
    const supabase = createRequestSupabaseClient({ accessToken });
    const { data, error } = await supabase.rpc("accept_tenant_invitation", {
      token_hash: tokenHash,
    });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    const result = data?.[0] ?? { status: "invalid_token" };

    return NextResponse.json({
      ...result,
      redirect_to: config.redirects.tenantAdminBaseUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to accept invitation." },
      { status: 400 },
    );
  }
}
