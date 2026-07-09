import type { ActorId, TenantId } from "@transport-platform/auth";

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
  correlationId?: string;
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
