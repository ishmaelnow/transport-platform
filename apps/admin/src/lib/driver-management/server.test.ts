import { describe, expect, it } from "vitest";
import { validateDriverProfileInput, validateDriverStatusInput } from "./server";

describe("driver management validation", () => {
  it("normalizes a driver profile payload", () => {
    expect(validateDriverProfileInput({
      driverNumber: " D-001 ", displayName: " Ada Driver ", email: "ADA@EXAMPLE.COM",
      phone: " 555-0100 ", onboardingDate: "2026-07-15",
    })).toEqual({
      driverNumber: "D-001", displayName: "Ada Driver", email: "ada@example.com",
      phone: "555-0100", personId: null, onboardingDate: "2026-07-15",
    });
  });

  it("requires reasons for restrictive lifecycle states", () => {
    expect(() => validateDriverStatusInput({ status: "suspended" })).toThrow(/reason is required/);
    expect(validateDriverStatusInput({ status: "active" })).toEqual({ status: "active", reason: null });
  });

  it("rejects human names as driver numbers", () => {
    expect(() => validateDriverProfileInput({ driverNumber: "First Driver", displayName: "Joe Blo" }))
      .toThrow(/Driver number must be/);
  });
});
