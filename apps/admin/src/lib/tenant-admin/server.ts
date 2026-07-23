import { createHash, randomBytes } from "node:crypto";
import { createAuthenticatedSupabaseClient } from "@esh-platform/supabase";
import { getAdminSupabaseEnv } from "@/lib/config";
import {
  foundationTenantRoles,
  type EditableTenantConfiguration,
  type FoundationTenantRole,
} from "./types";

export type AuthenticatedRequestContext = {
  accessToken: string;
};

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim() || null;
}

export function createRequestSupabaseClient({ accessToken }: AuthenticatedRequestContext) {
  return createAuthenticatedSupabaseClient(accessToken, getAdminSupabaseEnv());
}

export function validateTenantId(value: unknown): string {
  if (typeof value !== "string" || !isUuid(value)) {
    throw new Error("A valid tenant id is required.");
  }

  return value;
}

export function validateMembershipId(value: unknown): string {
  if (typeof value !== "string" || !isUuid(value)) {
    throw new Error("A valid membership id is required.");
  }

  return value;
}

export function validateInvitationId(value: unknown): string {
  if (typeof value !== "string" || !isUuid(value)) {
    throw new Error("A valid invitation id is required.");
  }

  return value;
}

export function validateTenantConfigurationPayload(value: unknown): EditableTenantConfiguration {
  if (!isRecord(value)) {
    throw new Error("Tenant configuration payload is required.");
  }

  return {
    display_name: requiredText(value.display_name, "Display name"),
    legal_name: requiredText(value.legal_name, "Legal name"),
    default_time_zone: requiredText(value.default_time_zone, "Default time zone"),
    support_contact_email: requiredEmail(value.support_contact_email, "Support contact email"),
    branding_reference: optionalText(value.branding_reference),
  };
}

export function validateInvitationPayload(value: unknown): {
  tenantId: string;
  email: string;
  role: FoundationTenantRole;
} {
  if (!isRecord(value)) {
    throw new Error("Invitation payload is required.");
  }

  const role = value.role;

  if (typeof role !== "string" || !foundationTenantRoles.includes(role as FoundationTenantRole)) {
    throw new Error("A valid tenant role is required.");
  }

  return {
    tenantId: validateTenantId(value.tenantId),
    email: requiredEmail(value.email, "Invitation email"),
    role: role as FoundationTenantRole,
  };
}

export function validateMembershipAction(value: unknown): {
  tenantId: string;
  membershipId: string;
  status: "suspended" | "removed";
} {
  if (!isRecord(value)) {
    throw new Error("Membership action payload is required.");
  }

  if (value.status !== "suspended" && value.status !== "removed") {
    throw new Error("Membership status must be suspended or removed.");
  }

  return {
    tenantId: validateTenantId(value.tenantId),
    membershipId: validateMembershipId(value.membershipId),
    status: value.status,
  };
}

export function createInvitationTokenHash() {
  return hashInvitationToken(randomBytes(32).toString("base64url"));
}

export function createInvitationTokenPair() {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashInvitationToken(token),
  };
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function requiredText(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function optionalText(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Optional text fields must be strings.");
  }

  return value.trim() || null;
}

function requiredEmail(value: unknown, label: string) {
  const email = requiredText(value, label);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${label} must be a valid email address.`);
  }

  return email;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
