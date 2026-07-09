import type { PlatformEvent } from "@transport-platform/events";

export type WorkflowName = string;

export type WorkflowContext = {
  correlationId: string;
  tenantId?: string;
  actorId?: string;
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
