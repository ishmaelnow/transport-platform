import { NextResponse } from "next/server";
import { getAdminServerConfig } from "@/lib/config";
import { sendTenantInvitationEmail } from "@/lib/invitations/email";
import { validateInvitationResendPayload } from "@/lib/platform-admin/server";
import {
  createInvitationTokenPair,
  createRequestSupabaseClient,
  getBearerToken,
} from "@/lib/tenant-admin/server";

export async function POST(request: Request) {
  try {
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
    }

    const payload = validateInvitationResendPayload((await request.json()) as unknown);
    const config = getAdminServerConfig();
    const supabase = createRequestSupabaseClient({ accessToken });
    const { data: invitation, error: invitationError } = await supabase
      .from("tenant_invitations")
      .select("invitation_id, tenant_id, email, intended_role, status, expires_at")
      .eq("invitation_id", payload.invitationId)
      .eq("tenant_id", payload.tenantId)
      .single();

    if (invitationError) {
      return NextResponse.json({ message: invitationError.message }, { status: 404 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { message: "Only pending invitations can be resent." },
        { status: 409 },
      );
    }

    if (new Date(invitation.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { message: "Expired invitations cannot be resent." },
        { status: 409 },
      );
    }

    const { data: configuration } = await supabase
      .from("tenant_configurations")
      .select("display_name")
      .eq("tenant_id", invitation.tenant_id)
      .maybeSingle();
    const tenantDisplayName = configuration?.display_name ?? "your transportation workspace";
    const invitationToken = createInvitationTokenPair();
    const attemptedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("tenant_invitations")
      .update({
        invitation_token_hash: invitationToken.tokenHash,
        email_delivery_status: "pending",
        email_delivery_attempted_at: attemptedAt,
        email_delivered_at: null,
        email_delivery_error: null,
      })
      .eq("invitation_id", invitation.invitation_id)
      .eq("tenant_id", invitation.tenant_id);

    if (updateError) {
      return NextResponse.json({ message: updateError.message }, { status: 403 });
    }

    try {
      await sendTenantInvitationEmail(config, {
        toEmail: invitation.email,
        tenantDisplayName,
        intendedRole: invitation.intended_role,
        token: invitationToken.token,
      });
    } catch (deliveryError) {
      const message =
        deliveryError instanceof Error
          ? deliveryError.message
          : "Invitation email delivery failed.";

      await supabase
        .from("tenant_invitations")
        .update({
          email_delivery_status: "failed",
          email_delivery_attempted_at: attemptedAt,
          email_delivery_error: message,
        })
        .eq("invitation_id", invitation.invitation_id)
        .eq("tenant_id", invitation.tenant_id);

      return NextResponse.json({ message }, { status: 502 });
    }

    const deliveredAt = new Date().toISOString();

    await supabase
      .from("tenant_invitations")
      .update({
        email_delivery_status: "sent",
        email_delivery_attempted_at: attemptedAt,
        email_delivered_at: deliveredAt,
        email_delivery_error: null,
      })
      .eq("invitation_id", invitation.invitation_id)
      .eq("tenant_id", invitation.tenant_id);

    return NextResponse.json({ ok: true, message: "Invitation email resent." });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to resend invitation." },
      { status: 400 },
    );
  }
}
