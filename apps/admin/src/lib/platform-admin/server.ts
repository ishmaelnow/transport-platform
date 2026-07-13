import { validateInvitationId, validateTenantId } from "@/lib/tenant-admin/server";
import type { PlatformTenantActionPayload, TenantProvisioningPayload } from "./types";

export function validateTenantProvisioningPayload(value: unknown): TenantProvisioningPayload {
  if (!isRecord(value)) {
    throw new Error("Tenant provisioning payload is required.");
  }

  return {
    displayName: requiredText(value.displayName, "Display name"),
    legalName: requiredText(value.legalName, "Legal name"),
    defaultTimeZone: requiredText(value.defaultTimeZone, "Default time zone"),
    supportContactEmail: requiredEmail(value.supportContactEmail, "Support contact email"),
    brandingReference: optionalText(value.brandingReference),
    firstOwnerEmail: requiredEmail(value.firstOwnerEmail, "First owner email"),
    reason: requiredText(value.reason, "Provisioning reason"),
  };
}

export function createTenantSlug(displayName: string) {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function validateTenantClosePayload(value: unknown): PlatformTenantActionPayload {
  if (!isRecord(value)) {
    throw new Error("Tenant close payload is required.");
  }

  return {
    tenantId: validateTenantId(value.tenantId),
    reason: requiredText(value.reason, "Closure reason"),
  };
}

export function validateInvitationResendPayload(value: unknown): {
  tenantId: string;
  invitationId: string;
} {
  if (!isRecord(value)) {
    throw new Error("Invitation resend payload is required.");
  }

  return {
    tenantId: validateTenantId(value.tenantId),
    invitationId: validateInvitationId(value.invitationId),
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
