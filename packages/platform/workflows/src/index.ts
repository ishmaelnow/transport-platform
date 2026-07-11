import type { ActorId, CorrelationId, TenantId } from "@transport-platform/auth";
import type { PlatformEvent } from "@transport-platform/events";

export type WorkflowName = string;

export type WorkflowContext = {
  correlationId: CorrelationId;
  tenantId?: TenantId;
  actorId?: ActorId;
};

export type WorkflowResult<TEvent extends PlatformEvent<string, Record<string, unknown>>> = {
  workflowName: WorkflowName;
  events: TEvent[];
};

export function createWorkflowResult<TEvent extends PlatformEvent<string, Record<string, unknown>>>(
  workflowName: WorkflowName,
  events: TEvent[],
): WorkflowResult<TEvent> {
  return {
    workflowName,
    events,
  };
}
