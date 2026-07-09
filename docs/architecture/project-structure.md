# Project Structure

The repository uses a modular monorepo layout to support multiple applications, backend services, shared packages, and operational assets without coupling them together prematurely.

## Top-Level Boundaries

### `apps/`

Deployable user-facing entry points. Applications compose platform capabilities for specific user experiences but should avoid owning business rules or shared platform policy.

### `services/`

Backend runtime units. Services own operational behavior and expose stable interfaces to applications or other services.

The `services/platform/` group is reserved for SaaS platform services. The `services/business/` group is reserved for transportation workflow services.

### `packages/`

Internal shared libraries. Packages contain reusable primitives such as tenant context, configuration, observability, authorization helpers, integration contracts, and common UI foundations.

The `packages/platform/` group is reserved for cross-cutting SaaS foundations. The `packages/business/` group is reserved for reusable transportation domain modules once real business capabilities exist.

### `infra/`

Infrastructure-as-code. This layer describes durable cloud and platform resources.

Subdirectories are provided for common infrastructure approaches, including Terraform, Docker, and Kubernetes. These folders establish ownership without committing the project to a provider or runtime yet.

### `deploy/`

Release and deployment configuration. This layer describes how built artifacts are promoted into runtime environments.

Environment overlays are grouped under `deploy/environments/`.

### `config/`

Committed non-secret configuration. This layer keeps environment defaults and templates visible without mixing them with secrets.

Environment configuration templates are grouped under `config/environments/`.

### `docs/`

Living documentation, including architecture, development process, operations, and decision records.

### `tooling/`

Developer automation. Scripts, generators, and templates should live here instead of being scattered across applications and services.

### `tests/`

Cross-cutting test suites and shared fixtures. Unit tests that are tightly coupled to a package or service may live beside that code later, but platform-level integration, contract, and end-to-end tests belong here.

## Multi-Tenancy Direction

Tenant isolation should be treated as a platform primitive, not as incidental feature logic. Future tenant context, authorization, audit, billing, data access, and observability code should be introduced behind explicit contracts before product modules rely on them.

## Business Module Direction

Transportation-specific capabilities should be added as clearly owned modules only when implementation begins. Avoid placing business workflows in global utility packages. Shared code should be extracted after a real cross-boundary need exists.
