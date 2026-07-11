import type { ActorId, AuditContext, CorrelationId, TenantId } from "@transport-platform/auth";

export type PlatformEventName = string;

export type PlatformEvent<
  TName extends PlatformEventName,
  TPayload extends Record<string, unknown>,
> = {
  id: string;
  name: TName;
  occurredAt: string;
  payload: TPayload;
  actorId?: ActorId;
  tenantId?: TenantId;
  correlationId?: CorrelationId;
  auditContext?: AuditContext;
};

export function createPlatformEvent<
  TName extends PlatformEventName,
  TPayload extends Record<string, unknown>,
>(
  input: Omit<PlatformEvent<TName, TPayload>, "occurredAt"> & { occurredAt?: string },
): PlatformEvent<TName, TPayload> {
  return {
    ...input,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
}

export type AuditCompatiblePlatformEvent<
  TName extends PlatformEventName,
  TPayload extends Record<string, unknown>,
> = PlatformEvent<TName, TPayload> & {
  auditContext: AuditContext;
};

export type AuditEvent<
  TName extends PlatformEventName = PlatformEventName,
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> = {
  eventName: TName;
  context: AuditContext;
  metadata?: TMetadata;
};
