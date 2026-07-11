import { asCorrelationId, type CorrelationId } from "@transport-platform/auth";

export function createTestCorrelationId(prefix = "test"): CorrelationId {
  return asCorrelationId(`${prefix}-${crypto.randomUUID()}`);
}
