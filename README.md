# ESH Platform

ESH Platform is a generic, modular foundation for building and operating multi-tenant SaaS products. Transportation is the first business capability implemented in the repository, not a constraint on the platform's identity or future use.

The project is organized as a modular monorepo. The structure separates deployable applications, backend services, shared packages, infrastructure, documentation, developer tooling, tests, deployment assets, and environment configuration.

The repository currently includes shared identity, tenancy, configuration, observability, payments, data-access, and workflow foundations, plus initial transportation capabilities. New business capabilities should use the same boundaries without coupling the shared platform layer to a particular industry.

## Repository Structure

```text
apps/          Deployable user-facing applications.
services/      Independently deployable backend services.
packages/      Shared internal libraries and platform building blocks.
infra/         Infrastructure-as-code and cloud resource definitions.
deploy/        Deployment manifests, release configuration, and environment overlays.
config/        Versioned, non-secret configuration templates and defaults.
docs/          Architecture, decisions, development, and operations documentation.
tooling/       Developer automation, generators, templates, and scripts.
tests/         Cross-cutting test suites and shared test assets.
```

## Architectural Principles

- Multi-tenancy is a platform concern and must be designed into shared foundations before feature work begins.
- Business capabilities should grow in isolated modules instead of spreading through shared infrastructure.
- Platform concerns and business-domain concerns, including transportation, should remain visibly separated.
- Shared packages must contain reusable platform primitives, not product-specific workflows.
- Applications should depend on services and packages through stable contracts.
- Infrastructure, deployment, and runtime configuration should be explicit and reviewable.
- Documentation and architectural decisions should live with the code.

## Current Scope

The current implementation establishes the platform foundation and the first transportation workflows. Future product modules may target transportation or other industries while preserving the platform/business separation described above.

## Development and deployment

See `docs/development/environment-variables.md` for the complete environment-variable inventory and `deploy/vercel.md` for the three-project Vercel setup.
