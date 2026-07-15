import type { DriverProfileRow } from "@transport-platform/supabase";

export const driverStatuses = [
  "draft",
  "onboarding",
  "active",
  "suspended",
  "inactive",
  "archived",
] as const;
export type DriverStatus = (typeof driverStatuses)[number];
export type DriverProfile = Omit<DriverProfileRow, "status"> & { status: DriverStatus };
export type DriverProfileInput = {
  driverNumber: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  personId: string | null;
  onboardingDate: string | null;
};
export type DriverStatusInput = { status: DriverStatus; reason: string | null };
