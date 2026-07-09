export type ActorId = string;
export type TenantId = string;

export type AuthenticatedActor = {
  id: ActorId;
  email?: string;
};

export type TenantContext = {
  tenantId: TenantId;
  actor: AuthenticatedActor;
};

export type AuthorizationDecision =
  | { allowed: true }
  | { allowed: false; reason: "unauthenticated" | "forbidden" | "missing-tenant" };
