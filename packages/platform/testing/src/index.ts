import { asCorrelationId, type CorrelationId } from "@esh-platform/auth";

export function createTestCorrelationId(prefix = "test"): CorrelationId {
  return asCorrelationId(`${prefix}-${crypto.randomUUID()}`);
}
