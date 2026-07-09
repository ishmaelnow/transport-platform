export function createTestCorrelationId(prefix = "test") {
  return `${prefix}-${crypto.randomUUID()}`;
}
