import type { AdminServerConfig } from "@/lib/config";

export type InvitationEmailInput = {
  toEmail: string;
  tenantDisplayName: string;
  intendedRole: string;
  token: string;
};

export async function sendTenantInvitationEmail(
  config: AdminServerConfig,
  input: InvitationEmailInput,
) {
  const invitationUrl = buildInvitationUrl(config.invitations.baseUrl, input.token);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resend.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.invitations.fromEmail,
      to: input.toEmail,
      subject: `Invitation to ${input.tenantDisplayName}`,
      text: [
        `You have been invited to ${input.tenantDisplayName} as ${input.intendedRole}.`,
        "",
        "Open this link to accept the invitation:",
        invitationUrl,
        "",
        "This invitation link expires based on the invitation policy configured by the platform.",
      ].join("\n"),
      html: [
        `<p>You have been invited to <strong>${escapeHtml(input.tenantDisplayName)}</strong> as <strong>${escapeHtml(input.intendedRole)}</strong>.</p>`,
        `<p><a href="${escapeHtml(invitationUrl)}">Accept invitation</a></p>`,
        "<p>This invitation link expires based on the invitation policy configured by the platform.</p>",
      ].join(""),
    }),
  });

  if (!response.ok) {
    const message = await readResendError(response);
    throw new Error(`Resend invitation email delivery failed: ${message}`);
  }
}

export function buildInvitationUrl(baseUrl: string, token: string) {
  const url = new URL("/invite/accept", baseUrl);
  url.searchParams.set("token", token);

  return url.toString();
}

async function readResendError(response: Response) {
  const fallback = `${response.status} ${response.statusText}`.trim();

  try {
    const payload = (await response.json()) as { message?: string; error?: string };

    return payload.message ?? payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
