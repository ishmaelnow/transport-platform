# Tenant Foundation Migration Plan

This plan converts the approved Tenant Foundation database design into an implementation sequence. It is not SQL and does not create migrations, tables, functions, triggers, seed data, or RLS policies.

## Scope

Version 1 Tenant Foundation includes:

- `person_profiles`
- `tenants`
- `tenant_configurations`
- `tenant_capabilities`
- `tenant_memberships`
- `tenant_invitations`
- `platform_role_assignments`
- `tenant_role_assignments`
- `tenant_audit_events`
- `active_tenant_preferences`

Out of scope:

- Driver, rider, dispatcher, fleet, booking, trip, pricing, payment, settlement, support case, compliance, and reporting business tables.
- Custom roles.
- Dynamic permission management.
- SSO, account linking, SCIM, domain enrollment, and enterprise tenancy.
- Authentication UI.
- API routes.
- Application screens.

## Migration Ordering

### 1. Foundation Extensions And Helpers

Purpose:

- Establish database capabilities needed by foundation tables.
- Prepare reusable timestamp, ID, and audit-support conventions.

Planned work:

- Confirm UUID generation support.
- Define status value strategy using check constraints or database enum types.
- Define common timestamp conventions.
- Define immutable audit guard strategy for later RLS/policy implementation.

Notes:

- Prefer simple check constraints for V1 unless enum operational tradeoffs are explicitly accepted.
- Do not create business-domain enum values.

### 2. Person Profiles

Purpose:

- Create the neutral shared person profile table that links Supabase Auth users to tenant memberships and audit references.

Planned table:

- `person_profiles`

Key design decisions:

- `person_id` primary key.
- `auth_user_id` unique and references Supabase Auth user identity conceptually.
- `primary_email` and `normalized_email` should be represented separately if email uniqueness is enforced.
- `normalized_email` should be unique for V1.
- `status` supports `invited`, `active`, `suspended`, `deactivated`, `deleted`.
- Soft-delete/anonymization fields exist, but automated deletion is not part of V1.

Indexes:

- `auth_user_id`
- `normalized_email`
- `status`

RLS dependency:

- Person self-access will be needed before auth-facing application flows are exposed.

### 3. Tenants

Purpose:

- Create the SaaS customer workspace record.

Planned table:

- `tenants`

Key design decisions:

- `tenant_id` primary key.
- `status` supports `provisioning`, `active`, `suspended`, `closing`, `closed`, `deleted`.
- Lifecycle timestamp columns capture activation, suspension, closure, and deletion/anonymization timing.
- No transportation fields.

Indexes:

- `status`
- `created_at`

RLS dependency:

- Tenant read access depends on active membership.
- Tenant lifecycle mutation is platform-admin controlled.

### 4. Tenant Configuration

Purpose:

- Store platform-managed tenant configuration required for activation and safe display.

Planned table:

- `tenant_configurations`

Key design decisions:

- `tenant_id` is the primary key and foreign key to `tenants`.
- Required fields: `legal_name`, `display_name`, `default_time_zone`, `support_contact_email`.
- Optional field: `branding_reference`.
- No service area, pricing, payment, dispatch, driver, or rider settings.

Indexes:

- Primary key on `tenant_id`.
- Optional search/display index on normalized display name later, not required for V1.

RLS dependency:

- Tenant members may read display-safe configuration.
- Tenant owner/admin update requires tenant role checks.

### 5. Tenant Capabilities

Purpose:

- Store per-tenant capability enablement.

Planned table:

- `tenant_capabilities`

Key design decisions:

- Composite primary key: `(tenant_id, capability_key)`.
- Initial keys:
  - `tenant.memberships`
  - `tenant.roles`
  - `tenant.audit`
  - `app.admin`
  - `app.rider`
  - `app.driver`
- Default enabled:
  - `tenant.memberships`
  - `tenant.roles`
  - `tenant.audit`
  - `app.admin`
- Default disabled:
  - `app.rider`
  - `app.driver`
- Capability keys are code constants; rows represent per-tenant state.

Indexes:

- `(tenant_id, enabled)`
- `capability_key`

RLS dependency:

- Tenant members can read capabilities for their active tenant.
- Platform admins manage capability state in V1.

### 6. Tenant Memberships

Purpose:

- Connect one person to one tenant.

Planned table:

- `tenant_memberships`

Key design decisions:

- `membership_id` primary key.
- `tenant_id` foreign key to `tenants`.
- `person_id` foreign key to `person_profiles`.
- Unique `(tenant_id, person_id)` for V1.
- `status` supports `invited`, `active`, `suspended`, `removed`, `expired`.
- Membership is not a driver/rider/dispatcher profile.

Indexes:

- `(person_id, status)`
- `(tenant_id, status)`
- `(tenant_id, person_id)`
- `(membership_id, tenant_id)`

RLS dependency:

- Active membership is the core tenant-access predicate for tenant-scoped foundation data.

### 7. Tenant Invitations

Purpose:

- Track tenant invitation workflows, including first tenant owner invitation.

Planned table:

- `tenant_invitations`

Key design decisions:

- `invitation_id` primary key.
- `tenant_id` foreign key to `tenants`.
- `email` and `normalized_email`.
- Single `intended_role` for V1.
- `status` supports `pending`, `accepted`, `cancelled`, `expired`.
- `accepted_by_person_id` references `person_profiles`.
- Unique pending invitation per `(tenant_id, normalized_email)`.

Indexes:

- `(tenant_id, status)`
- `(normalized_email, status)`
- `expires_at`

RLS dependency:

- Tenant owner/admin may manage tenant invitations after tenant activation.
- Platform admin may create first-owner invitation during provisioning.

### 8. Platform Role Assignments

Purpose:

- Assign SaaS-company operational authority.

Planned table:

- `platform_role_assignments`

Key design decisions:

- `assignment_id` primary key.
- `person_id` references `person_profiles`.
- `role_key` supports:
  - `platform_owner`
  - `platform_admin`
  - `platform_support`
  - `service_principal`
- `status` supports `pending`, `active`, `revoked`, `expired`.
- One active assignment per `(person_id, role_key)`.
- Service-principal representation remains an implementation detail to finalize during SQL generation; simplest V1 is to represent service principals through controlled `person_profiles`-like records only if required.

Indexes:

- `(person_id, status)`
- `(role_key, status)`

RLS dependency:

- Platform role assignment data is not tenant-readable.
- Platform owner/admin manage it.

### 9. Tenant Role Assignments

Purpose:

- Assign tenant foundation roles to memberships.

Planned table:

- `tenant_role_assignments`

Key design decisions:

- `assignment_id` primary key.
- `tenant_id` foreign key to `tenants`.
- `membership_id` foreign key to `tenant_memberships`.
- `role_key` supports:
  - `tenant_owner`
  - `tenant_admin`
  - `tenant_member`
- `status` supports `pending`, `active`, `revoked`, `expired`.
- One active assignment per `(membership_id, role_key)`.
- Final tenant owner protection requires transactional enforcement.

Indexes:

- `(tenant_id, role_key, status)`
- `(membership_id, status)`
- `(tenant_id, membership_id)`

RLS dependency:

- Tenant owner/admin can manage tenant role assignment within their tenant.
- Members may read own effective roles.

### 10. Tenant Audit Events

Purpose:

- Store immutable audit evidence for Tenant Foundation activity.

Planned table:

- `tenant_audit_events`

Key design decisions:

- `audit_event_id` primary key.
- `tenant_id` nullable only for platform-scoped events.
- Required fields include `event_name`, actor fields, `reason`, `correlation_id`, `resource_type`, `resource_id`, and `occurred_at`.
- Metadata is allowed only for safe, minimal, structured context that does not fit normalized columns.
- Append-only after insert.

Indexes:

- `(tenant_id, occurred_at)`
- `(actor_id, occurred_at)`
- `(resource_type, resource_id)`
- `correlation_id`
- `event_name`

RLS dependency:

- Tenant owners/admins may read tenant audit events when `tenant.audit` is enabled and role checks allow.
- Writes should happen through trusted server/database paths.

### 11. Active Tenant Preferences

Purpose:

- Persist a person's last selected tenant for multi-tenant users.

Planned table:

- `active_tenant_preferences`

Key design decisions:

- `person_id` primary key.
- `tenant_id` references `tenants`.
- Preference is not authorization.
- Every request must still validate tenant status, membership status, roles, and capabilities.

Indexes:

- Primary key on `person_id`.
- `(tenant_id, person_id)`.

RLS dependency:

- Person can read/update own preference only to a tenant where they have active membership.

## Post-Table Constraints And Guards

### Final Tenant Owner Guard

Required behavior:

- Do not revoke, expire, suspend, or remove the final active `tenant_owner` for an active tenant.
- Do not activate a tenant unless it has at least one active `tenant_owner`.

Implementation plan:

- Use transactional database enforcement during migration implementation.
- Cover both role assignment changes and membership status changes.
- Add tests before exposing tenant membership or role mutation to clients.

### Tenant Activation Guard

Required behavior:

- Tenant may become `active` only when:
  - required configuration exists,
  - default foundation capabilities exist,
  - at least one active `tenant_owner` membership and role assignment exists.

Implementation plan:

- Enforce with transactional validation in the activation workflow.
- Add database guard if activation can be performed directly through database mutation paths.

### Audit Append-Only Guard

Required behavior:

- `tenant_audit_events` is append-only.

Implementation plan:

- Prevent normal updates/deletes.
- Service-role repair should require explicit administrative process outside normal application flows.

## Seed / Reference Data Plan

Permissions:

- Do not create permission reference tables in V1.
- Keep permission keys as code constants.

Roles:

- Do not create role definition tables in V1.
- Constrain role values in assignment tables.

Capabilities:

- Store tenant capability rows because enablement is tenant-specific.
- Capability keys are code constants.
- Seed or insert default capabilities during tenant provisioning.

Initial platform bootstrap:

- Platform owner/admin bootstrap must be handled carefully outside general tenant workflows.
- Do not seed real users, tenants, or production credentials.

## Migration Verification Checklist

Before SQL is approved, verify the migration plan includes:

- All approved tables.
- No transportation business tables.
- No generic business entity tables.
- No custom role tables.
- No dynamic permission tables.
- Required unique constraints.
- Required lifecycle fields.
- Required tenant ownership fields.
- Required audit timestamps.
- RLS enabled on exposed public tables.
- Append-only audit protection.
- Final tenant owner guard.
- RLS tests for cross-tenant isolation.

## Recommended Migration File Breakdown

When SQL is approved later, prefer small ordered migrations:

1. `platform_foundation_extensions_and_types`
2. `tenant_foundation_person_profiles`
3. `tenant_foundation_tenants_and_configuration`
4. `tenant_foundation_capabilities`
5. `tenant_foundation_memberships_and_invitations`
6. `tenant_foundation_roles`
7. `tenant_foundation_audit_events`
8. `tenant_foundation_active_tenant_preferences`
9. `tenant_foundation_guards`
10. `tenant_foundation_rls_policies`
11. `tenant_foundation_rls_tests`

These names are planning labels only, not migration files.
