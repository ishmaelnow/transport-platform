import { driverStatuses, type DriverProfileInput, type DriverStatusInput } from "./types";

export function validateDriverProfileInput(value: unknown): DriverProfileInput {
  const record = requireRecord(value);
  return {
    driverNumber: requiredText(record.driverNumber, "Driver number"),
    displayName: requiredText(record.displayName, "Display name"),
    email: optionalEmail(record.email),
    phone: optionalText(record.phone),
    personId: optionalUuid(record.personId, "Person"),
    onboardingDate: optionalDate(record.onboardingDate),
  };
}

export function validateDriverStatusInput(value: unknown): DriverStatusInput {
  const record = requireRecord(value);
  const status = record.status;
  if (
    typeof status !== "string" ||
    !driverStatuses.includes(status as DriverStatusInput["status"])
  ) {
    throw new Error("A valid driver status is required.");
  }
  const reason = optionalText(record.reason);
  if (["suspended", "inactive", "archived"].includes(status) && !reason) {
    throw new Error(`A reason is required when a driver becomes ${status}.`);
  }
  return { status: status as DriverStatusInput["status"], reason };
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Driver payload is required.");
  return value as Record<string, unknown>;
}
function requiredText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  const text = value.trim();
  if (label === "Driver number" && !/^[A-Za-z0-9][A-Za-z0-9_-]{1,31}$/.test(text)) {
    throw new Error("Driver number must be 2-32 characters using letters, numbers, hyphens, or underscores.");
  }
  return text;
}
function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function optionalEmail(value: unknown) {
  const email = optionalText(value);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Driver email must be valid.");
  return email?.toLowerCase() ?? null;
}
function optionalUuid(value: unknown, label: string) {
  const uuid = optionalText(value);
  if (
    uuid &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
  )
    throw new Error(`${label} must be a valid id.`);
  return uuid;
}
function optionalDate(value: unknown) {
  const date = optionalText(value);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error("Onboarding date must use YYYY-MM-DD.");
  return date;
}
