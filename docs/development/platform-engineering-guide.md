# Platform Engineering Guide

This guide defines how engineering is performed in this repository.

It is not a coding tutorial and it is not a system architecture document. It is the working handbook for engineers and AI coding agents who contribute to the platform. Read this before writing code, changing structure, introducing dependencies, or adding new capabilities.

The goal is consistency. Six months or six years from now, the codebase should still be predictable, modular, secure, and easy to extend.

## 1. Engineering Philosophy

Engineering decisions in this repository should reduce future complexity.

Follow these principles:

- Simplicity over cleverness. Prefer clear, boring solutions that are easy to understand and operate.
- Business-first thinking. Technical work exists to support real business workflows, not isolated implementation ideas.
- Platform before product. Shared foundations such as authentication, tenant isolation, configuration, logging, payments, and data access must be reliable before product features depend on them.
- Documentation before implementation. Significant changes should explain purpose, boundaries, tradeoffs, and future implications before code spreads across the repository.
- Reusable solutions before duplication. If the same problem appears in multiple places, solve it once behind a clear shared boundary.
- Small, focused modules. Modules should do one job and expose a narrow public API.
- Explicit is better than implicit. Prefer clear types, named workflows, named events, explicit dependencies, and visible configuration.
- Every architectural decision should reduce future complexity. Do not introduce abstraction, infrastructure, or dependencies unless they make future work safer or simpler.

Avoid:

- Building transportation features before the platform foundation supports them.
- Hiding business rules in UI components.
- Adding frameworks or services because they are familiar rather than necessary.
- Creating generic utility packages without a real repeated need.
- Relying on conventions that are not documented or enforced.

## 2. Repository Organization

The repository is a modular monorepo. Each top-level directory has a specific responsibility.

### `apps/`

Deployable user-facing applications.

Belongs here:

- Next.js applications.
- UI composition, routing, layouts, and pages.
- Application-specific server actions and route handlers.
- App-level state and presentation logic.

Does not belong here:

- Shared business workflows.
- Database schema definitions.
- Reusable platform clients.
- Stripe or Supabase logic that is needed by multiple apps.

### `packages/`

Shared internal TypeScript packages.

Belongs here:

- Platform primitives.
- Reusable clients and helpers.
- Shared types.
- Cross-application utilities with clear ownership.
- Event and workflow definitions.

Does not belong here:

- One-off app code.
- UI pages or routes.
- Business logic that has not proven it needs to be shared.
- Unbounded `utils` collections.

### `services/`

Independently deployable backend services, if and when they become necessary.

At this stage, the platform starts with Supabase and Next.js server-side capabilities. Do not add a service runtime unless there is a concrete operational need that cannot be handled cleanly by Supabase, Next.js route handlers, server actions, or Edge Functions.

Belongs here in the future:

- Long-running workers.
- Dedicated integration services.
- Backend runtimes with independent scaling or deployment needs.
- Internal APIs that justify a separate service boundary.

Does not belong here:

- Code that exists only because a framework was preferred.
- Logic that can live safely in a shared package or Next.js server boundary.

### `supabase/`

Supabase project configuration and database source of truth.

Belongs here:

- Supabase CLI configuration.
- Database migrations.
- Seed data safe for local development.
- Row Level Security policies.
- Database functions and triggers.
- Edge Functions when they are the right runtime.
- Generated database type workflow documentation or outputs.

Does not belong here:

- UI code.
- App-specific presentation logic.
- Business workflows that are better represented in shared TypeScript packages.
- Secrets.

### `docs/`

Living documentation.

Belongs here:

- Architecture records.
- Development standards.
- Operations guidance.
- Feature design notes.
- Workflow documentation.
- Decision records.

Does not belong here:

- Stale plans that no longer reflect the code.
- Marketing copy.
- Implementation details that should be enforced by tests or code.

### `tests/`

Cross-cutting tests and shared test assets.

Belongs here:

- End-to-end tests.
- Integration tests across apps, packages, Supabase, and Stripe boundaries.
- RLS policy tests.
- Shared fixtures.
- Contract tests.

Does not belong here:

- Tests tightly coupled to a package when colocating them with that package is clearer.
- Manual testing notes as a substitute for executable coverage.

### `config/`

Versioned, non-secret configuration templates and defaults.

Belongs here:

- Environment templates.
- Safe defaults.
- Configuration documentation.
- Non-secret examples.

Does not belong here:

- Secrets.
- Tenant data.
- Production credentials.
- Local machine-specific state.

### `tooling/`

Developer automation.

Belongs here:

- Scripts.
- Generators.
- Templates.
- Repository maintenance tooling.

Does not belong here:

- Application runtime code.
- Business logic.
- One-off scripts that should be discarded after use.

## 3. Ownership Rules

Code should live where its owner is obvious.

- UI belongs in `apps/`.
- Shared logic belongs in `packages/`.
- Supabase owns authentication, Postgres, storage, realtime, database migrations, RLS policies, and database functions.
- Stripe owns payment processing, billing, payment methods, connected accounts, transfers, payouts, invoices, and payment webhooks.
- Next.js owns web application composition, route handling, server rendering, and app-specific server actions.
- Business workflows should never be embedded inside UI components.
- Business events should be defined explicitly, not inferred from incidental table updates or UI actions.
- Database access rules belong in Supabase RLS whenever data is exposed through Supabase APIs.
- Secrets belong in environment-specific secret stores, never in committed files.

Use these placement rules:

- Presentational component: `apps/<app>/...`
- App-specific page or route: `apps/<app>/...`
- App-specific server action: `apps/<app>/...`
- Reusable Supabase client helper: `packages/platform/supabase`
- Environment validation: `packages/platform/config`
- Auth/session/tenant types: `packages/platform/auth`
- Event definitions: `packages/platform/events`
- Workflow definitions and orchestration helpers: `packages/platform/workflows`
- Stripe client wrapper and webhook helpers: `packages/platform/stripe`
- Logging and correlation helpers: `packages/platform/logger`
- Migrations and RLS: `supabase/`
- Cross-boundary tests: `tests/`

When ownership is unclear, do not create a new abstraction immediately. Start with the narrowest correct owner, document the reason, and extract only when reuse is real.

## 4. Code Organization

Consistency matters more than personal style.

### Folder Structure

Use folders to communicate ownership and boundaries. A folder should represent a cohesive module, not a loose topic.

Preferred shape:

```text
module-name/
  src/
    index.ts
    public-api.ts
    internal-helper.ts
  test/
    module-name.test.ts
  package.json
  tsconfig.json
```

Applications may follow framework conventions, but framework structure must not override platform ownership rules.

### File Naming

- Use kebab-case for file and folder names.
- Use PascalCase for React component names.
- Use camelCase for functions and variables.
- Use PascalCase for event names, workflow names, classes, and exported types.
- Use `.server.ts` for modules that must only run server-side when that distinction matters.
- Use `.client.tsx` or `"use client"` only for components that require client behavior.

### Module Naming

Package names should describe ownership and purpose:

- `@transport-platform/config`
- `@transport-platform/auth`
- `@transport-platform/supabase`
- `@transport-platform/events`
- `@transport-platform/workflows`
- `@transport-platform/stripe`
- `@transport-platform/logger`

Avoid vague names:

- `common`
- `shared`
- `helpers`
- `misc`
- `utils`

### Imports

- Prefer package imports over deep relative imports across module boundaries.
- Relative imports are acceptable inside a module.
- Do not import from another package's internal files.
- Avoid circular dependencies.
- Server-only modules must not be imported into client components.

### Exports

- Export a narrow public API from each package.
- Keep internal helpers internal.
- Do not export implementation details just to make tests easier.
- Prefer named exports.

### Barrel Files

Use barrel files only at package or module boundaries where they clarify the public API.

Avoid nested barrel files that obscure dependency direction or make tree-shaking unpredictable.

### Utilities

Do not create generic utility dumps. A utility should belong to a domain or platform concern:

- Date formatting for UI belongs near UI unless reused.
- Tenant context helpers belong in auth or Supabase packages.
- Event serialization belongs in events.
- Stripe webhook verification belongs in Stripe.

### Shared Libraries

Create shared libraries when:

- Multiple modules need the same behavior.
- The behavior has a stable ownership boundary.
- The package can expose a small public API.
- Moving the code reduces duplication without hiding important business meaning.

Do not create shared libraries for speculative future reuse.

## 5. Business Events

The platform uses an event-first philosophy.

Every important business action should be represented as an explicit event. Events make workflows visible, auditable, testable, and easier to integrate with future systems.

Examples:

- `DriverApproved`
- `RideRequested`
- `RideAccepted`
- `RideStarted`
- `RideCompleted`
- `PaymentCaptured`

Introduce an event when:

- A meaningful business state change occurs.
- Another workflow may need to react to the action.
- The action should be audited.
- The action crosses a boundary between modules.
- The action may later drive notifications, billing, realtime updates, analytics, or support workflows.

Do not introduce an event for:

- Pure UI state changes.
- Internal helper function calls.
- Temporary implementation details.
- Database writes that have no business meaning.

Event naming rules:

- Use past-tense PascalCase.
- Name the business fact that occurred, not the command that attempted it.
- Prefer `PaymentCaptured` over `CapturePayment`.
- Prefer `RideAccepted` over `AcceptRideClicked`.
- Events should be specific enough to be useful but not tied to UI wording.

Event payloads should:

- Include stable identifiers.
- Include tenant context when applicable.
- Include the actor when applicable.
- Avoid leaking secrets or sensitive payment details.
- Be versionable when externally consumed.

## 6. Business Workflows

The platform is built around workflows rather than isolated functions.

A workflow coordinates multiple business events, data changes, validations, policies, and external integrations to complete a business outcome.

Examples:

- Driver Onboarding
- Ride Booking
- Ride Completion
- Payment Settlement
- Refund
- Support Case Resolution

Workflow guidance:

- Name workflows explicitly.
- Document the purpose and expected outcome.
- Identify the events produced by the workflow.
- Identify external systems involved, such as Supabase or Stripe.
- Keep workflow orchestration out of UI components.
- Keep workflow state transitions clear and testable.
- Prefer small workflow modules over large procedural scripts.

Workflows may involve:

- Supabase Auth identity.
- RLS-protected database writes.
- Stripe payment state.
- Realtime notifications.
- Storage objects.
- Audit records.
- Edge Functions or server actions.

UI components may initiate workflows, but they must not own the workflow rules.

## 7. Supabase Guidelines

Supabase is the core backend platform unless a future architectural decision explicitly changes that.

### Authentication

Use Supabase Auth for user identity.

Use it for:

- Sign-in and sign-out.
- Session management.
- OAuth and passwordless flows.
- MFA and enterprise SSO when required.
- User identity that maps into RLS policies.

Do not build custom authentication unless a formal architecture decision replaces Supabase Auth.

### Postgres

Supabase Postgres is the system of record.

Use Postgres for:

- Durable business data.
- Tenant membership and access relationships.
- Transactional state.
- Audit-relevant records.
- Workflow state.

Database design expectations:

- Use explicit primary keys.
- Use foreign keys for integrity.
- Use constraints for invariants the database can enforce.
- Index intentionally.
- Avoid storing derived state unless it improves correctness or performance and is documented.

### Row Level Security

RLS is the primary authorization enforcement layer for data exposed through Supabase.

Expectations:

- Enable RLS on exposed tables.
- Write policies before exposing data to clients.
- Treat RLS tests as required for tenant-scoped data.
- Never rely only on UI checks for authorization.
- Service-role access must be rare, server-side, and documented.

RLS policies should be simple, readable, and tied to tenant membership or explicit permissions.

### Storage

Use Supabase Storage for future documents, images, and file assets.

Expectations:

- Buckets should have clear ownership and access rules.
- Private files should remain private by default.
- Access should be controlled through policies or signed URLs.
- Do not store sensitive documents in public buckets.
- Store file metadata in Postgres when workflow state depends on it.

### Realtime

Use Supabase Realtime for live operational updates where it improves the product experience.

Appropriate uses:

- Operational dashboards.
- Status changes.
- Assignment updates.
- Notifications.
- Collaborative views.

Avoid:

- Subscribing to every table by default.
- Sending sensitive data over broad channels.
- Using realtime as a substitute for durable workflow state.

### Edge Functions

Use Supabase Edge Functions only when they are the right runtime.

Good fits:

- Supabase-adjacent server-side logic.
- Webhooks that should run close to Supabase.
- Auth hooks.
- Scheduled or event-triggered platform tasks.
- Lightweight integration endpoints.

Poor fits:

- Large application backends.
- Complex long-running jobs.
- Logic that belongs in a Next.js server action or route handler.
- Code that requires a dedicated service runtime.

### Migrations

Supabase migrations are the source of truth for schema, policies, database functions, and triggers.

Migration expectations:

- Migrations must be reviewable.
- RLS policy changes must be included with related schema changes.
- Destructive migrations require explicit documentation and rollback thinking.
- Seed data must be safe for local development.
- Never make production-only manual schema changes without committing the migration.

### Generated Types

Generate TypeScript database types from Supabase.

Expectations:

- Application code should use generated types where practical.
- Generated types should not be hand-edited.
- Schema changes and type updates should land together.
- Shared packages should expose stable wrappers when raw generated types are too low-level.

## 8. Next.js Guidelines

Next.js is the primary web application framework.

### Server Components

Use Server Components by default.

Appropriate for:

- Data loading.
- Auth-aware rendering.
- Layouts.
- Pages that do not need browser-only APIs.
- Reducing client-side JavaScript.

Server Components should not contain browser event handlers or client-only state.

### Client Components

Use Client Components only when client behavior is required.

Appropriate for:

- Forms with rich interactivity.
- Local UI state.
- Browser APIs.
- Realtime subscriptions.
- Drag-and-drop or map interactions.

Keep Client Components small. Move data access and workflow rules to server-side boundaries.

### Server Actions

Use Server Actions for app-specific mutations triggered by UI flows.

Appropriate for:

- Form submissions.
- Validated mutations.
- Calls that need server-side Supabase or Stripe access.
- App-local orchestration that does not justify an Edge Function.

Server Actions must validate inputs and must not bypass RLS without a documented reason.

### Route Handlers

Use Route Handlers for HTTP endpoints.

Appropriate for:

- Webhooks.
- Third-party callbacks.
- API endpoints consumed outside React forms.
- File or stream responses.
- Health checks.

Webhook handlers must verify signatures where supported, especially for Stripe.

## 9. Shared Packages

Shared packages define stable platform boundaries.

Expected platform packages:

### `platform/config`

Owns environment variable parsing, validation, and safe defaults.

Use when:

- Reading runtime configuration.
- Validating required environment variables.
- Sharing config schemas across apps or functions.

### `platform/auth`

Owns auth-related types and helpers.

Use when:

- Representing users, sessions, tenant membership, roles, and permissions.
- Sharing auth context between apps and server code.

### `platform/supabase`

Owns Supabase client creation and Supabase-specific helper functions.

Use when:

- Creating browser clients.
- Creating server clients.
- Handling typed Supabase access patterns.
- Centralizing Supabase configuration.

### `platform/events`

Owns business event names, event envelopes, payload conventions, and serialization helpers.

Use when:

- Defining important business actions.
- Emitting or consuming events.
- Sharing event contracts.

### `platform/workflows`

Owns shared workflow types, workflow state conventions, and reusable orchestration helpers.

Use when:

- A business process spans multiple events or systems.
- Workflow logic needs to be reused or tested independently.

### `platform/stripe`

Owns Stripe client creation, webhook verification helpers, and payment-related shared types.

Use when:

- Calling Stripe from server-side code.
- Verifying Stripe webhooks.
- Mapping Stripe state into platform events.

### `platform/logger`

Owns logging, correlation IDs, request context, and structured log conventions.

Use when:

- Emitting internal diagnostics.
- Tracing request or workflow execution.
- Connecting logs to audit records.

Create a new shared package only when:

- The ownership boundary is clear.
- At least two modules need the behavior.
- The public API can stay small.
- The package reduces duplication or prevents inconsistent platform behavior.

## 10. Error Handling

Errors should be useful, safe, and observable.

### User-Facing Errors

User-facing errors should:

- Be clear and actionable.
- Avoid exposing internal implementation details.
- Avoid leaking tenant data, secrets, SQL details, or payment processor internals.
- Use consistent wording for common failure modes.

### Internal Errors

Internal errors should:

- Preserve diagnostic context.
- Include correlation IDs.
- Include tenant and actor identifiers when safe.
- Distinguish validation failures, authorization failures, external service failures, and unexpected failures.

### Logging

Logs should be structured.

Include:

- Correlation ID.
- Request ID when available.
- Tenant ID when applicable.
- Actor ID when applicable.
- Workflow name when applicable.
- Event name when applicable.

Do not log:

- Access tokens.
- Refresh tokens.
- API keys.
- Passwords.
- Full payment card data.
- Sensitive documents.

### Correlation IDs

Every request or workflow should be traceable with a correlation ID.

Pass correlation IDs through:

- Next.js route handlers.
- Server actions.
- Edge Functions.
- Logs.
- Audit events.
- External integration calls where practical.

### Audit Events

Audit events are required for security-sensitive or business-critical actions.

Examples:

- Permission changes.
- Tenant membership changes.
- Payment state changes.
- Sensitive document access.
- Administrative overrides.
- RLS bypass through service-role code.

## 11. Security Principles

Security is a platform concern, not an afterthought.

Follow these rules:

- Use least privilege by default.
- Enforce tenant isolation through Supabase RLS.
- Validate inputs server-side.
- Keep secrets out of git.
- Use secure defaults.
- Prefer private access over public access.
- Treat service-role keys as highly privileged.
- Never expose service-role keys to the browser.
- Verify webhook signatures.
- Avoid storing sensitive payment data; let Stripe own it.
- Avoid storing secrets in Postgres unless explicitly designed and protected.
- Sanitize and validate user-provided content.
- Keep authorization checks close to the data boundary.

Tenant isolation expectations:

- Every tenant-owned table must have a clear tenant access model.
- RLS policies must be tested.
- Cross-tenant access must be explicit, rare, and audited.
- Admin behavior must still be constrained and observable.

## 12. Testing Strategy

Code is not complete until the relevant behavior is tested.

### Unit Tests

Use unit tests for:

- Pure functions.
- Validation logic.
- Event serialization.
- Workflow state transitions.
- Config parsing.
- Stripe mapping helpers.

Unit tests should be fast and deterministic.

### Integration Tests

Use integration tests for:

- Supabase client behavior.
- Database interactions.
- Server actions.
- Route handlers.
- Stripe webhook handling.
- Multi-package behavior.

Integration tests should verify real boundaries, not mock everything important away.

### RLS Policy Tests

RLS policy tests are required for tenant-scoped data.

Test:

- A tenant member can access allowed records.
- A tenant member cannot access another tenant's records.
- Unauthenticated users cannot access protected records.
- Users without required permissions are denied.
- Service-role usage is covered where applicable.

### End-to-End Tests

Use end-to-end tests for critical user workflows.

E2E tests should cover:

- Authentication flows.
- Core workflow paths.
- Permission-sensitive UI behavior.
- Payment handoffs when introduced.
- Realtime behavior when introduced.

Before code is considered complete, ask:

- Is the business rule tested?
- Is tenant isolation tested?
- Are failure paths tested?
- Are external integrations verified at the boundary?
- Are docs updated for significant behavior?

## 13. Documentation Standards

Documentation should evolve with the platform.

Every significant feature should document:

- Purpose.
- Business workflow.
- Important events.
- Design decisions.
- Future considerations.

Write documentation when:

- A new workflow is introduced.
- A new event is introduced.
- A new package is created.
- A security rule changes.
- A database access pattern changes.
- A tradeoff affects future development.

Do not let documentation become decorative. If docs no longer describe the code, update or remove them.

## 14. AI Engineering Guidelines

AI coding agents are expected to follow the same rules as human engineers.

Before coding, AI agents must:

- Understand the existing architecture.
- Read relevant documentation.
- Inspect existing packages before creating new ones.
- Identify the correct ownership boundary.
- Reuse existing platform packages and conventions.

While coding, AI agents must:

- Avoid duplicate implementations.
- Keep changes scoped.
- Prefer simple, explicit code.
- Explain architectural decisions when they affect boundaries.
- Avoid unnecessary dependencies.
- Avoid speculative abstractions.
- Preserve tenant isolation and security rules.
- Avoid bypassing Supabase RLS unless explicitly documented and justified.
- Never place business workflows inside UI components.

Before finishing, AI agents must:

- Run relevant checks when available.
- Report any checks that could not be run.
- Mention documentation changes.
- Call out unresolved risks or assumptions.

AI agents must never bypass documented platform rules for speed.

## 15. Engineering Checklist

Before opening a pull request, mentally complete this checklist:

- Does this change belong in the module where it was implemented?
- Is there an existing reusable solution that should be used instead?
- Did this introduce duplicate logic?
- Should this be a shared package, or is local ownership better?
- Does this introduce or change a business event?
- Does this participate in a named workflow?
- Are business rules kept out of UI components?
- Does Supabase RLS enforce the required tenant isolation?
- Are service-role operations necessary, documented, and audited?
- Are inputs validated server-side?
- Are secrets handled correctly?
- Are user-facing errors safe and useful?
- Are logs structured and free of sensitive data?
- Are correlation IDs preserved where relevant?
- Are unit tests sufficient for pure logic?
- Are integration tests sufficient for boundaries?
- Are RLS policy tests included for tenant-scoped data?
- Are end-to-end tests needed for the workflow?
- Is documentation required for this change?
- Does this increase or decrease long-term complexity?
- Would a new engineer understand why this was built this way?

If the answer to the complexity question is "increase," the change needs a clear justification.
