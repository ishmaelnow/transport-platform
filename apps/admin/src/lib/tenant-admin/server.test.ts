import { describe, expect, it } from "vitest";
import {
  createInvitationTokenPair,
  hashInvitationToken,
  normalizeEmail,
  validateInvitationPayload,
  validateMembershipAction,
  validateTenantConfigurationPayload,
} from "./server";

describe("tenant admin server validation", () => {
  it("normalizes invitation email input", () => {
    expect(normalizeEmail(" Owner@Example.TEST ")).toBe("owner@example.test");
  });

  it("creates raw invitation tokens separately from stored hashes", () => {
    const invitationToken = createInvitationTokenPair();

    expect(invitationToken.token).not.toBe(invitationToken.tokenHash);
    expect(hashInvitationToken(invitationToken.token)).toBe(invitationToken.tokenHash);
  });

  it("accepts one approved foundation invitation role", () => {
    expect(
      validateInvitationPayload({
        tenantId: "30000000-0000-4000-8000-000000000001",
        email: "admin@example.test",
        role: "tenant_admin",
      }),
    ).toEqual({
      tenantId: "30000000-0000-4000-8000-000000000001",
      email: "admin@example.test",
      role: "tenant_admin",
    });
  });

  it("rejects transportation business roles in tenant foundation invitations", () => {
    expect(() =>
      validateInvitationPayload({
        tenantId: "30000000-0000-4000-8000-000000000001",
        email: "driver@example.test",
        role: "driver",
      }),
    ).toThrow("valid tenant role");
  });

  it("validates editable tenant settings", () => {
    expect(
      validateTenantConfigurationPayload({
        display_name: "Tenant",
        legal_name: "Tenant LLC",
        default_time_zone: "America/Chicago",
        support_contact_email: "support@example.test",
        branding_reference: "",
      }),
    ).toEqual({
      display_name: "Tenant",
      legal_name: "Tenant LLC",
      default_time_zone: "America/Chicago",
      support_contact_email: "support@example.test",
      branding_reference: null,
    });
  });

  it("restricts membership mutation statuses to foundation lifecycle actions", () => {
    expect(
      validateMembershipAction({
        tenantId: "30000000-0000-4000-8000-000000000001",
        membershipId: "40000000-0000-4000-8000-000000000001",
        status: "suspended",
      }),
    ).toEqual({
      tenantId: "30000000-0000-4000-8000-000000000001",
      membershipId: "40000000-0000-4000-8000-000000000001",
      status: "suspended",
    });
  });
});
