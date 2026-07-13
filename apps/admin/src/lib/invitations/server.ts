import { hashInvitationToken } from "@/lib/tenant-admin/server";

export function requireInvitationToken(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Invitation token is required.");
  }

  return value.trim();
}

export function hashRawInvitationToken(value: unknown) {
  return hashInvitationToken(requireInvitationToken(value));
}
