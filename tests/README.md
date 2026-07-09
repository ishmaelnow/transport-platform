# Tests

This directory contains cross-cutting test suites and shared test assets.

- `unit/` is available for platform-level unit tests that do not belong to a specific package.
- `integration/` is for tests across packages, services, databases, queues, or external adapters.
- `contract/` is for interface and compatibility tests between services and consumers.
- `e2e/` is for full workflow tests through deployed or locally composed applications.
- `fixtures/` is for shared test data that is safe to commit.

Code-local tests may also live beside the package, service, or application they verify when that keeps ownership clearer.
