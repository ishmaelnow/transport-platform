import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminServerConfig } from "@/lib/config";
import { sendTenantInvitationEmail } from "@/lib/invitations/email";
import { createTenantSlug, validateTenantProvisioningPayload } from "@/lib/platform-admin/server";
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

    const payload = validateTenantProvisioningPayload((await request.json()) as unknown);
    const tenantSlug = createTenantSlug(payload.displayName);

    if (!tenantSlug) {
      return NextResponse.json(
        { message: "Display name must produce a valid tenant slug." },
        { status: 400 },
      );
    }

    const config = getAdminServerConfig();
    const supabase = createRequestSupabaseClient({ accessToken });
    const invitationToken = createInvitationTokenPair();
    const { data, error } = await supabase.rpc("provision_tenant_with_owner_invitation_v2", {
      tenant_slug: tenantSlug,
      tenant_display_name: payload.displayName,
      tenant_legal_name: payload.legalName,
      tenant_default_time_zone: payload.defaultTimeZone,
      tenant_support_contact_email: payload.supportContactEmail,
      tenant_branding_reference: payload.brandingReference ?? "",
      owner_email: payload.firstOwnerEmail,
      invitation_token_hash: invitationToken.tokenHash,
      correlation_id: randomUUID(),
      reason: payload.reason,
    });

    if (error) {
      const status = error.message.includes("already exists") ? 409 : 403;

      return NextResponse.json({ message: error.message }, { status });
    }

    const provisioned = data?.[0];

    if (!provisioned) {
      return NextResponse.json(
        { message: "Tenant provisioning did not return an invitation." },
        { status: 500 },
      );
    }

    try {
      await sendTenantInvitationEmail(config, {
        toEmail: payload.firstOwnerEmail,
        tenantDisplayName: payload.displayName,
        intendedRole: "tenant_owner",
        token: invitationToken.token,
      });

      await supabase
        .from("tenant_invitations")
        .update({
          email_delivery_status: "sent",
          email_delivery_attempted_at: new Date().toISOString(),
          email_delivered_at: new Date().toISOString(),
          email_delivery_error: null,
        })
        .eq("invitation_id", provisioned.provisioned_invitation_id);
    } catch (deliveryError) {
      const message =
        deliveryError instanceof Error
          ? deliveryError.message
          : "Invitation email delivery failed.";

      await supabase
        .from("tenant_invitations")
        .update({
          email_delivery_status: "failed",
          email_delivery_attempted_at: new Date().toISOString(),
          email_delivery_error: message,
        })
        .eq("invitation_id", provisioned.provisioned_invitation_id);

      return NextResponse.json({
        ok: true,
        message: `Tenant was provisioned, but invitation email delivery failed. Use Resend when email configuration is fixed. ${message}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to provision tenant." },
      { status: 400 },
    );
  }
}
