import type {
  PlatformRoleAssignmentRow,
  TenantCapabilityRow,
  TenantConfigurationRow,
  TenantInvitationRow,
  TenantRow,
} from "@transport-platform/supabase";

export const platformProvisioningRoles = ["platform_owner", "platform_admin"] as const;

export type PlatformProvisioningRole = (typeof platformProvisioningRoles)[number];

export type PlatformTenantListItem = {
  tenant: TenantRow;
  configuration: TenantConfigurationRow | null;
  capabilities: TenantCapabilityRow[];
  invitations: TenantInvitationRow[];
};

export type PlatformAdminSummary = {
  roles: PlatformRoleAssignmentRow[];
  tenants: PlatformTenantListItem[];
};

export type TenantProvisioningPayload = {
  displayName: string;
  legalName: string;
  defaultTimeZone: string;
  supportContactEmail: string;
  brandingReference: string | null;
  firstOwnerEmail: string;
  reason: string;
};

export type PlatformTenantActionPayload = {
  tenantId: string;
  reason: string;
};
