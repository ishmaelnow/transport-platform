# Tenant Foundation RLS Test Plan

This plan defines required Row Level Security test coverage for the Tenant Foundation. It does not create SQL, migrations, RLS policies, test code, fixtures, application routes, or authentication flows.

## Scope

Tables covered:

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

- Driver, rider, dispatcher, fleet, booking, trip, pricing, payment, settlement, support, compliance, and reporting tables.
- Business module RLS.
- Application UI behavior.
- Auth provider behavior beyond test identities.

## Test Identity Matrix

Minimum test actors:

1. `anonymous`
   - No Supabase Auth session.

2. `person_without_membership`
   - Authenticated.
   - Has `person_profiles` row.
   - Has no tenant membership.

3. `tenant_a_owner`
   - Authenticated.
   - Active membership in Tenant A.
   - Active `tenant_owner` role in Tenant A.

4. `tenant_a_admin`
   - Authenticated.
   - Active membership in Tenant A.
   - Active `tenant_admin` role in Tenant A.

5. `tenant_a_member`
   - Authenticated.
   - Active membership in Tenant A.
   - Active `tenant_member` role in Tenant A.

6. `tenant_a_suspended_member`
   - Authenticated.
   - Suspended membership in Tenant A.

7. `tenant_b_owner`
   - Authenticated.
   - Active membership in Tenant B.
   - Active `tenant_owner` role in Tenant B.

8. `multi_tenant_person`
   - Authenticated.
   - Active memberships in Tenant A and Tenant B.
   - Used for active tenant preference tests.

9. `platform_admin`
   - Authenticated.
   - Active `platform_admin` assignment.
   - No normal tenant membership required for platform administration tests.

10. `platform_support`
    - Authenticated.
    - Active `platform_support` assignment.
    - Must not receive direct production tenant-data access in V1.

11. `service_role`
    - Trusted server-side role for provisioning and administrative workflows.
    - Used only in tests that verify privileged setup paths.

## Fixture Tenants

Minimum tenant fixtures:

- Tenant A: `active`
- Tenant B: `active`
- Tenant C: `suspended`
- Tenant D: `provisioning`
- Tenant E: `closed`

Each active tenant should have:

- Tenant configuration.
- Foundation capabilities.
- At least one active tenant owner.
- Memberships for owner, admin, and member personas where needed.

## Global RLS Expectations

Every exposed table must prove:

- Anonymous users cannot read or mutate foundation data.
- Authenticated users cannot access tenant data without active membership or approved platform role.
- Tenant members cannot access another tenant's rows.
- Suspended memberships do not grant tenant access.
- Suspended tenants block normal tenant-member access to mutation workflows.
- Platform roles and tenant roles are separate.
- `platform_support` has no direct production tenant-data access in V1.
- Service-role operations are reserved for trusted paths and must not be represented as client permissions.

## Table-Specific Test Cases

### `person_profiles`

Read tests:

- Authenticated person can read own profile.
- Authenticated person cannot read another person's profile by default.
- Anonymous cannot read profiles.
- Platform admin can read profiles for support/provisioning paths if policy permits.

Write tests:

- Person cannot assign themselves platform roles through profile mutation.
- Person cannot update status fields directly unless an approved policy exists.
- Anonymous cannot insert/update/delete.

Negative tests:

- Profile access does not grant tenant access.
- Profile email does not grant membership.

### `tenants`

Read tests:

- Active tenant member can read their tenant.
- Tenant A member cannot read Tenant B.
- Person without membership cannot read active tenants.
- Suspended member cannot read tenant through membership policy if policy requires active membership.
- Platform admin can read tenants.

Write tests:

- Tenant member cannot create tenant.
- Tenant owner/admin cannot directly change tenant lifecycle unless explicit policy allows.
- Platform admin can manage tenant lifecycle through approved path.

Negative tests:

- Tenant role in Tenant A does not grant Tenant B access.

### `tenant_configurations`

Read tests:

- Active member can read own tenant configuration.
- Tenant A member cannot read Tenant B configuration.
- Anonymous cannot read configuration.

Write tests:

- Tenant owner can update allowed configuration fields.
- Tenant admin can update allowed configuration fields if approved.
- Tenant member cannot update configuration.
- Tenant member cannot update `tenant_id`.

Negative tests:

- Configuration cannot be used to store service area, pricing, payment, driver, or rider data.

### `tenant_capabilities`

Read tests:

- Active tenant members can read capabilities for their tenant.
- Tenant A members cannot read Tenant B capabilities.

Write tests:

- Tenant owner/admin cannot enable capabilities in V1 unless explicitly approved.
- Platform admin can enable/disable capabilities.
- Platform support cannot directly enable production capabilities in V1.

Negative tests:

- Disabled `app.rider` and `app.driver` capabilities remain readable but do not imply workflow access.

### `tenant_memberships`

Read tests:

- Person can read own memberships.
- Tenant owner/admin can read memberships in their tenant.
- Tenant member can read own membership but not necessarily all tenant memberships unless policy allows.
- Tenant A owner cannot read Tenant B memberships.

Write tests:

- Tenant owner/admin can invite or manage memberships in own tenant if `tenant.memberships` is enabled.
- Tenant member cannot create memberships.
- Suspended member cannot manage memberships.
- Person without membership cannot create membership.

Negative tests:

- Cannot remove or suspend final active tenant owner.
- Removed membership no longer grants tenant access.
- Expired membership no longer grants tenant access.

### `tenant_invitations`

Read tests:

- Tenant owner/admin can read invitations in their tenant.
- Tenant member cannot read all invitations unless policy explicitly allows.
- Invitee may read/accept invitation only through safe invitation acceptance flow.
- Tenant A admin cannot read Tenant B invitations.

Write tests:

- Platform admin can create first owner invitation for provisioning tenant.
- Tenant owner/admin can create tenant invitations after activation.
- Tenant member cannot create invitations.
- Anonymous cannot create or accept directly without authentication.

Negative tests:

- Cannot create duplicate pending invitation for same tenant and normalized email.
- Expired/cancelled invitation cannot be accepted.

### `platform_role_assignments`

Read tests:

- Platform owner/admin can read platform role assignments.
- Ordinary tenant users cannot read platform role assignments.
- Tenant owner cannot read platform role assignments merely by tenant authority.

Write tests:

- Platform owner/admin can assign/revoke according to policy.
- Tenant roles cannot assign platform roles.
- Users cannot self-assign platform roles.

Negative tests:

- `platform_support` does not imply tenant-data read access.

### `tenant_role_assignments`

Read tests:

- Person can read own tenant role assignments.
- Tenant owner/admin can read tenant role assignments in their tenant.
- Tenant A owner/admin cannot read Tenant B assignments.

Write tests:

- Tenant owner can assign/revoke tenant roles in own tenant.
- Tenant admin can assign limited roles if approved by policy.
- Tenant member cannot assign roles.
- Platform admin can repair assignments through audited path.

Negative tests:

- Cannot revoke/expire the final active `tenant_owner` for an active tenant.
- Cannot assign driver/rider/dispatcher/fleet/accountant roles because they are out of scope.

### `tenant_audit_events`

Read tests:

- Tenant owner/admin can read audit events for their tenant when `tenant.audit` is enabled.
- Tenant member cannot read audit events unless policy explicitly allows.
- Tenant A owner cannot read Tenant B audit events.
- Platform admin can read tenant audit through approved access.

Write tests:

- Normal authenticated users cannot insert audit events directly unless using approved database/server path.
- Audit events cannot be updated.
- Audit events cannot be deleted.

Negative tests:

- Audit metadata cannot expose secrets in fixtures.
- Platform support direct tenant-data access remains denied in V1.

### `active_tenant_preferences`

Read tests:

- Person can read own active tenant preference.
- Person cannot read another person's preference.

Write tests:

- Person can set preference only to a tenant where they have active membership.
- Person cannot set preference to Tenant B without active membership.
- Suspended membership cannot be selected.
- Removed/expired membership cannot be selected.

Negative tests:

- Active tenant preference alone does not grant access to tenant rows.

## Cross-Tenant Isolation Tests

Required scenarios:

- Tenant A owner cannot read Tenant B configuration.
- Tenant A admin cannot invite users into Tenant B.
- Tenant A member cannot read Tenant B capabilities.
- Tenant A owner cannot assign Tenant B roles.
- Tenant A owner cannot read Tenant B audit events.
- Multi-tenant person can access Tenant A only when request context selects Tenant A and can access Tenant B only when request context selects Tenant B.
- Active tenant preference for Tenant A does not allow implicit access to Tenant B.

## Tenant Lifecycle Tests

Required scenarios:

- `provisioning` tenant allows first-owner invitation by platform admin.
- `provisioning` tenant does not allow normal member workflows.
- `active` tenant allows membership/role operations when capabilities and roles permit.
- `suspended` tenant blocks normal tenant mutations.
- `closed` tenant blocks normal tenant mutations.
- `deleted` tenant is not accessible through normal tenant-member policies.

## Capability Tests

Required scenarios:

- `tenant.memberships = false` blocks tenant membership management workflows.
- `tenant.roles = false` blocks tenant role management workflows.
- `tenant.audit = false` blocks tenant audit viewing for tenant users.
- `app.admin = false` blocks admin app access checks.
- `app.rider = false` remains disabled by default.
- `app.driver = false` remains disabled by default.

## Final Tenant Owner Tests

Required scenarios:

- Cannot revoke final active `tenant_owner`.
- Cannot expire final active `tenant_owner`.
- Cannot suspend membership of final active `tenant_owner` while tenant is active.
- Cannot remove membership of final active `tenant_owner` while tenant is active.
- Can transfer ownership by adding a second owner, then revoking the first owner.
- Can remove final owner only when tenant is closing/closed if approved by lifecycle guard.

## First Tenant Owner Invitation Tests

Required scenarios:

- Platform admin can create provisioning tenant.
- Platform admin can create first-owner invitation.
- Invitation acceptance creates/resolves `PersonProfile`.
- Invitation acceptance creates active `TenantMembership`.
- Invitation acceptance creates active `tenant_owner` assignment.
- Invitation acceptance appends audit events.
- Tenant can activate only after first active tenant owner exists.
- Duplicate pending first-owner invitation is rejected unless previous invitation is cancelled/expired.

## Permission And Role Boundary Tests

Required scenarios:

- Tenant roles do not grant platform role permissions.
- Platform support does not grant direct production tenant-data access.
- Platform admin access to tenant data is audited.
- `tenant_member` cannot manage memberships or roles.
- `tenant_admin` cannot mutate platform role assignments.
- No driver/rider/dispatcher/fleet/accountant role keys are accepted in foundation role assignment tables.

## Test Data Safety Rules

- Use synthetic tenants.
- Use synthetic emails.
- Do not use production Supabase project for destructive RLS tests.
- Do not seed real tenants or real users.
- Do not store secrets in fixtures.
- Use deterministic fixture identifiers where possible.

## Recommended Test File Organization

When tests are implemented later:

```text
tests/integration/tenant-foundation/
  person-profiles.rls.test.ts
  tenants.rls.test.ts
  tenant-configurations.rls.test.ts
  tenant-capabilities.rls.test.ts
  tenant-memberships.rls.test.ts
  tenant-invitations.rls.test.ts
  platform-role-assignments.rls.test.ts
  tenant-role-assignments.rls.test.ts
  tenant-audit-events.rls.test.ts
  active-tenant-preferences.rls.test.ts
  cross-tenant-isolation.rls.test.ts
  first-owner-invitation.rls.test.ts
```

This is a planning layout only. No test files are created by this document.

## Pass Criteria

The Tenant Foundation is not ready for application exposure until:

- All anonymous access denial tests pass.
- All cross-tenant denial tests pass.
- All active membership allow tests pass.
- Suspended/removed/expired membership denial tests pass.
- Platform role and tenant role separation tests pass.
- Final tenant owner protection tests pass.
- Audit append-only tests pass.
- Active tenant preference tests prove preference is not authorization.
