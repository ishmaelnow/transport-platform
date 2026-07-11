# Supabase Integration Readiness

This document defines what must be true before this repository is connected to a cloud Supabase project.

Do not implement authentication flows, database-backed product features, business tables, or cloud-specific backend code until the cloud Supabase project exists and the migration plan has been reviewed.

## Readiness Checklist

Before connecting a cloud Supabase project:

- Confirm the cloud Supabase project has been created in the intended organization.
- Confirm the project region, database version, and plan match operational expectations.
- Record the project URL and publishable client key in the appropriate environment secret store.
- Record the service role key only in server-side secret stores. Never expose it to browser bundles.
- Decide whether each deployed app has its own site URL and redirect URLs.
- Configure Supabase Auth site URL and allowed redirect URLs for admin, rider, and driver apps.
- Configure email sender settings and templates, or explicitly accept Supabase defaults for the first environment.
- Decide whether local development uses Supabase CLI locally, the cloud project, or both.
- Confirm local development can run without cloud-only secrets.
- Define migration ownership and the promotion process from local to staging to production.
- Create and review platform foundation migrations before any user signs in.
- Add RLS policies and RLS tests for all tenant-scoped foundation tables before exposing them through Supabase APIs.
- Generate TypeScript database types after migrations exist.
- Confirm backup, restore, and branch/preview environment expectations.
- Confirm production secrets are managed outside git.
- Confirm CI can validate formatting, linting, type checking, tests, and migration-related checks once migrations are introduced.

## Environment Variables

The platform should use explicit environment variables. Public variables may be read by browser code. Secret variables must only be available to trusted server-side runtimes, CI, or deployment systems.

### Shared Runtime

| Variable              | Scope            | Required | Purpose                                                          |
| --------------------- | ---------------- | -------- | ---------------------------------------------------------------- |
| `NODE_ENV`            | Server and build | Yes      | Standard runtime mode: `development`, `test`, or `production`.   |
| `NEXT_PUBLIC_APP_ENV` | Public           | Yes      | Platform environment label: `local`, `staging`, or `production`. |
| `LOG_LEVEL`           | Server           | Yes      | Structured logging level: `debug`, `info`, `warn`, or `error`.   |

### Supabase

| Variable                        | Scope                                 | Required                                                     | Purpose                                                                                                   |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public                                | Yes                                                          | Supabase project API URL for the active environment.                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public                                | Yes                                                          | Supabase publishable/anonymous client key for browser-safe access.                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server secret                         | Only for privileged server tasks                             | Supabase service role key. Use rarely, document every use, and never expose to clients.                   |
| `SUPABASE_DB_URL`               | Server/CI secret                      | Only for migration tooling that needs direct database access | Direct Postgres connection string for migrations or administrative tooling. Do not use from browser code. |
| `SUPABASE_PROJECT_REF`          | CI/deploy secret or non-secret config | When linking CLI to cloud                                    | Supabase cloud project reference.                                                                         |
| `SUPABASE_ACCESS_TOKEN`         | CI/deploy secret                      | When CI or deploy automation talks to Supabase               | Supabase CLI/API access token.                                                                            |

### Application URLs

| Variable                     | Scope  | Required                             | Purpose                                                                            |
| ---------------------------- | ------ | ------------------------------------ | ---------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ADMIN_APP_URL`  | Public | Before auth redirects are configured | Canonical admin app URL for links and Supabase redirect allow-list configuration.  |
| `NEXT_PUBLIC_RIDER_APP_URL`  | Public | Before auth redirects are configured | Canonical rider app URL for links and Supabase redirect allow-list configuration.  |
| `NEXT_PUBLIC_DRIVER_APP_URL` | Public | Before auth redirects are configured | Canonical driver app URL for links and Supabase redirect allow-list configuration. |

### Stripe

| Variable                | Scope         | Required                | Purpose                        |
| ----------------------- | ------------- | ----------------------- | ------------------------------ |
| `STRIPE_SECRET_KEY`     | Server secret | Before payment features | Stripe server API key.         |
| `STRIPE_WEBHOOK_SECRET` | Server secret | Before Stripe webhooks  | Stripe webhook signing secret. |

### Testing And Automation

| Variable              | Scope | Required                                      | Purpose                              |
| --------------------- | ----- | --------------------------------------------- | ------------------------------------ |
| `PLAYWRIGHT_BASE_URL` | Test  | For E2E tests outside default local admin URL | Base URL used by Playwright.         |
| `CI`                  | CI    | In CI                                         | Enables CI behavior in test tooling. |

Add new variables only when a feature needs them. When a variable is added, update the config package, `.env.example`, and this document in the same change.

## Local Development Configuration

Local development should default to Supabase CLI and local services:

- Supabase local API URL: `http://127.0.0.1:54321`.
- Supabase local database port: `54322`.
- Supabase Studio port: `54323`.
- Admin app URL: `http://127.0.0.1:3000`.
- Rider app URL: `http://127.0.0.1:3001`.
- Driver app URL: `http://127.0.0.1:3002`.

Local `.env` files must not be committed. Developers should copy `.env.example`, fill local Supabase values from `supabase status`, and keep cloud secrets out of local files unless a task specifically requires cloud access.

Local development should support this flow once migrations exist:

1. Start Supabase locally with `pnpm supabase:start`.
2. Apply committed migrations to the local database.
3. Generate database types with `pnpm supabase:types`.
4. Run the relevant app with `pnpm dev:admin`, `pnpm dev:rider`, or `pnpm dev:driver`.
5. Run validation with `pnpm validate`.

Until foundation migrations exist, local Supabase remains configured but should not be used for product workflows.

## Production Configuration

Production should use managed Supabase and deployment-platform secrets:

- Store public Supabase values as public deployment environment variables.
- Store service role, database URL, Supabase access token, Stripe keys, and webhook secrets as server-only secrets.
- Configure each deployed app URL in the Supabase Auth allowed redirect list before enabling sign-in.
- Promote migrations through environments in order: local, staging, production.
- Generate and commit database types with schema changes.
- Run RLS and integration tests before exposing tenant-scoped data to clients.

Production code must not depend on local Supabase ports, local seed data, or uncommitted database state.

## Required Migrations Before First Sign-In

The first sign-in should happen only after platform foundation migrations exist. These migrations should not include transportation business tables.

Recommended migration order:

1. `platform_extensions`
   - Enable required Postgres extensions such as UUID generation support, if not already available.
   - Keep this migration limited to database capabilities required by platform tables.

2. `platform_tenants`
   - Create the tenant table and lifecycle status needed for SaaS isolation.
   - Include tenant identifiers, stable slugs or references if needed, lifecycle state, timestamps, and integrity constraints.

3. `platform_user_profiles`
   - Create the platform user profile table linked to Supabase Auth users.
   - Store only platform profile metadata needed before business features exist.

4. `platform_tenant_memberships`
   - Create tenant membership records that connect authenticated users to tenants.
   - Include membership status and timestamps.
   - Add uniqueness constraints that prevent duplicate active memberships for the same tenant/user pair.

5. `platform_roles_permissions`
   - Create the minimum role and permission structure needed for tenant-scoped authorization.
   - Keep the initial permission set platform-level only. Do not add transportation workflow permissions yet.

6. `platform_audit_log`
   - Create append-only audit records for security-sensitive platform actions.
   - Include tenant ID, actor ID, action/event name, correlation ID, timestamp, and safe metadata.

7. `platform_rls_policies`
   - Enable RLS on all tenant-scoped foundation tables.
   - Add policies for tenant members, platform administrators if defined, and service-role exceptions only where justified.

8. `platform_auth_triggers_or_hooks`
   - Add only the database triggers or Supabase Auth hooks needed to safely create or link platform profile records.
   - Keep behavior minimal and auditable.

9. `platform_seed_reference_data`
   - Seed only safe platform reference data required for local development or initial roles.
   - Do not seed real tenants, real users, production credentials, or transportation business data.

10. `platform_rls_tests`

- Add tests proving tenant members cannot read or mutate another tenant's foundation records.
- Cover unauthenticated access and users without required roles.

These migrations should be designed and reviewed before backend implementation starts. They should land with generated database types and tests.

## Explicit Non-Goals For This Phase

- Do not build sign-in, sign-up, session, or tenant selection UI.
- Do not create business tables for riders, drivers, vehicles, bookings, dispatch, payments, or trips.
- Do not write server actions or route handlers that mutate Supabase data.
- Do not add Supabase Auth callbacks or triggers until the migration design is approved.
- Do not connect CI or production deployments to a cloud Supabase project until the project exists.
