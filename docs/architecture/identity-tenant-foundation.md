# Identity And Tenant Foundation

This specification is the authoritative platform model for tenants, authentication, tenant membership, tenant-scoped roles, business identities, authorization context, and tenant isolation.

It is a design document only. It does not create SQL, migrations, authentication flows, RLS policies, TypeScript contracts, application screens, or transportation features.

## Core Model

The primary platform-level business entity is the tenant.

A tenant is a transportation company or operating organization that subscribes to and uses the SaaS platform. The SaaS platform manages tenant lifecycle, subscription, support, audit, platform administration, and platform-level configuration. Transportation operations happen inside tenants.

Supabase Auth authenticates a person. Authentication alone grants no tenant access. A person gains tenant access through a tenant membership or another explicitly defined tenant relationship. Ordinary tenant users are not modeled as platform-level users with broad authority. They are authenticated people with tenant-scoped memberships, roles, permissions, and business identities.

## Approved Principles

- The SaaS platform manages tenants as customer entities.
- Platform staff roles exist only to operate the SaaS company itself.
- Tenant owner and tenant admin are tenant-level roles, not platform roles.
- Dispatchers, drivers, riders, fleet managers, accountants, and tenant support staff are tenant-scoped identities or roles.
- All transportation operations and records are tenant-scoped.
- Every tenant-owned business record must belong to exactly one tenant.
- Supabase Auth authenticates people but does not authorize tenant access by itself.
- A neutral shared identity/profile may exist only to connect authentication, memberships, audit references, and historical records.
- A person may have different roles or business identities in different tenants.
- RLS remains the expected primary database enforcement layer for tenant-scoped data exposed through Supabase.
- Service-role access is server-only, rare, explicitly justified, and audited.

## Platform Level

### Tenant

A tenant is the platform customer boundary for a transportation company or operating organization.

Platform-owned tenant responsibilities:

- Tenant creation and onboarding.
- Tenant lifecycle and status.
- Subscription and entitlement relationship.
- Platform support relationship.
- Platform audit and compliance evidence.
- Platform-managed tenant configuration values and capabilities.

Rules:

- A tenant is not a user account.
- A tenant may have many authenticated people connected to it through tenant memberships.
- A tenant may later own many transportation records such as drivers, riders, vehicles, bookings, trips, payments, and support cases.
- Tenant identity remains stable across display-name, branding, ownership, and subscription changes.
- Tenant state gates tenant-scoped operations.

Canonical concept name: `Tenant`.

### Platform Staff

Platform staff are people or service principals that operate the SaaS platform itself. They are not tenant users unless they also hold an explicit tenant membership or audited support access grant.

Canonical platform roles for Version 1:

- `platform_owner`: ultimate operational authority for the SaaS platform.
- `platform_admin`: manages tenant lifecycle, platform configuration, and operational support.
- `platform_support`: assists tenants through constrained audited support workflows.
- `service_principal`: trusted non-human server-side actor for automation.

Rules:

- Platform roles do not grant normal tenant business access.
- Platform staff access to tenant data must be explicit and audited.
- Platform staff must not be modeled as tenant owners unless a tenant membership grants that role.
- Platform authority and tenant authority are separate.
- In Version 1, only `platform_owner` and `platform_admin` may access production tenant data.
- In Version 1, `platform_support` may assist with support workflows but does not receive direct production tenant-data access.

## Tenant Level

### Tenant Users

A tenant user is a person acting within a specific tenant through an active tenant membership or explicitly defined tenant relationship.

Examples:

- Tenant owner.
- Tenant admin.
- Dispatcher.
- Driver.
- Rider.
- Fleet manager.
- Accountant.
- Support staff.

Rules:

- Tenant users are tenant-scoped.
- The same person may be a tenant owner in one tenant, a driver in another, and a rider in a third.
- Tenant roles and tenant business identities must be evaluated in the selected tenant context.
- Tenant users do not receive platform authority unless they also hold platform staff roles.

### Tenant Business Identities

Tenant business identities are domain-specific records that describe what a person is inside a transportation company.

Examples:

- Driver profile.
- Rider profile.
- Dispatcher staff profile.
- Fleet manager profile.
- Accountant profile.
- Tenant support staff profile.

Rules:

- Business identities belong inside the tenant domain.
- Driver and rider profiles are not part of the platform identity foundation.
- `DriverProfile` belongs to the future Driver Management module.
- `RiderProfile` belongs to the future Rider Management module.
- Dispatcher and other operational identities belong to the relevant tenant business modules.
- Staff operational identities may be introduced with the first operations module.
- A tenant membership may allow access to an application before a business module creates a driver or rider profile, but business workflows must require the relevant business identity when needed.

## Authentication And Shared Identity

### Supabase Authentication Identity

Supabase Auth authenticates a person and manages credential lifecycle.

Responsibilities:

- Sign-in and sign-out.
- Session management.
- Email, passwordless, OAuth, MFA, SSO, or other supported credential methods when enabled.
- Provider-specific credential identifiers.

Rules:

- Authentication identity is not tenant membership.
- Authentication identity is not a driver, rider, dispatcher, or tenant admin.
- Authentication success does not grant tenant access.
- Tenant access is resolved only after authentication through tenant membership or another explicit tenant relationship.
- Business modules must not depend directly on Supabase provider-specific identifiers.

Canonical concept name: `AuthenticationIdentity`.

### Shared Person Profile

A shared person profile is a neutral bridge record used only where the platform needs a stable person reference across authentication, tenant memberships, audit records, and historical relationships.

This concept intentionally avoids naming ordinary people as platform users.

Allowed responsibilities:

- Link one authenticated person to memberships.
- Store minimal cross-tenant contact/display metadata.
- Provide stable historical actor references.
- Support audit and support workflows.

Allowed data:

- Display name.
- Primary email or contact reference.
- Locale and timezone preference.
- Person lifecycle status.

Not allowed:

- Driver profile state.
- Rider profile state.
- Dispatcher profile state.
- Tenant ownership by itself.
- Platform staff authority by itself.
- Transportation workflow state.

Rules:

- Shared person profile exists only to connect authentication and tenant-scoped relationships.
- It does not grant platform or tenant authority.
- It should remain minimal to avoid mixing tenant business data into platform identity.
- A person may have zero, one, or many tenant memberships.

Canonical concept name: `PersonProfile`.

## Tenant Lifecycle, Status, Settings, And Capabilities

### Tenant Lifecycle

Lifecycle states:

- `provisioning`: tenant is being created or configured; normal business operations are not available.
- `active`: tenant can use enabled platform and business capabilities.
- `suspended`: tenant is blocked from normal operations; approved support, audit, or compliance access may remain.
- `closing`: tenant closure is in progress; new business activity is blocked.
- `closed`: tenant is no longer operating on the platform; records remain according to retention requirements.
- `deleted`: tenant records are removed or anonymized according to approved retention policy.

Rules:

- Tenant creation starts in `provisioning`.
- Tenant activation requires required settings and at least one active tenant owner membership.
- Tenant suspension blocks new tenant-scoped business activity.
- Tenant closure starts operational wind-down and blocks new business activity.
- Tenant deletion requires explicit retention and compliance approval.

Canonical status field concept: `tenant_status`.

### Tenant Settings

Tenant settings are platform-managed tenant configuration values.

Examples:

- Display name.
- Legal name.
- Default timezone.
- Support contact references.
- Branding references.

Version 1 activation requires:

- Legal name.
- Display name.
- Default timezone.
- Support contact email.
- At least one active `tenant_owner` membership.
- Explicitly enabled app capabilities.

Rules:

- Tenant settings do not own transportation workflow data.
- Tenant settings must remain separate from future business module configuration unless a module explicitly owns that setting.

Canonical concept name: `TenantSetting`.

### Tenant Capabilities

Tenant capabilities describe what the tenant is entitled or enabled to use.

Version 1 capability examples:

- `platform.memberships`
- `platform.roles`
- `platform.audit`
- `app.admin`
- `app.rider`
- `app.driver`

Version 1 pilot tenant defaults:

- `app.admin` is enabled by default.
- `app.rider` and `app.driver` remain valid capability keys but are disabled by default until their business modules are implemented and enabled.

Rules:

- Capabilities are evaluated independently from user roles.
- A tenant user may have permission to perform an action that the tenant is not entitled to use.
- Transportation capabilities must not be added until the relevant business module is designed.

Canonical concept name: `TenantCapability`.

## Membership Model

### Tenant Membership

Tenant membership connects an authenticated person, through the shared person profile, to exactly one tenant. It is the normal access bridge between a person and a transportation company using the platform.

Relationship:

- One person may have many tenant memberships.
- One tenant may have many memberships.
- One membership belongs to exactly one person and exactly one tenant.

Rules:

- A person may belong to multiple tenants.
- A person may hold different tenant roles in different tenants.
- Authentication alone does not create membership.
- Membership alone does not grant all actions; role and permission evaluation still applies.
- Tenant context must be selected explicitly when a person has more than one active membership.

Canonical concept name: `TenantMembership`.

### Membership Status

Lifecycle states:

- `invited`: a membership invitation exists but is not active.
- `active`: the person may act within the tenant according to assigned roles, permissions, capabilities, and business identity.
- `suspended`: tenant access is temporarily blocked.
- `removed`: tenant access has ended.
- `expired`: the invitation or temporary membership is no longer valid.

Rules:

- Invited memberships cannot perform tenant actions.
- Suspended memberships cannot perform tenant actions.
- Removed memberships should not be silently reactivated.
- Membership history remains available for audit.
- Tenant suspension blocks active memberships.
- Person deactivation blocks all memberships.

Canonical status field concept: `membership_status`.

### Invitation Rules

Version 1 uses email-only tenant invitations.

Rules:

- Invitations are tenant-scoped.
- Invitations identify the intended email and intended tenant role.
- Invitations expire.
- Invitation acceptance requires Supabase Auth authentication.
- Invitation acceptance resolves or creates the shared person profile as needed.
- The first tenant owner is created through an explicit invitation issued by an authorized platform administrator.
- First owner invitation acceptance creates or resolves the `PersonProfile`, creates the tenant membership, and assigns `tenant_owner`.
- Accepting an invitation activates membership only if the tenant is eligible to accept members and the invitation is valid.
- Invitation creation, acceptance, cancellation, and expiration are audit-relevant.

### Removal Rules

Rules:

- Removing a member revokes tenant access but preserves historical audit and business references.
- Removing the final active tenant owner is not allowed unless ownership is transferred, the tenant is closing, or a controlled platform recovery process applies.
- Tenant role assignments attached to removed memberships become ineffective.
- Future business records referencing the person remain historically valid.

## Roles, Permissions, And Authorization

### Platform Roles

Platform roles operate the SaaS company. They do not represent tenant business authority.

Version 1 platform roles:

- `platform_owner`
- `platform_admin`
- `platform_support`
- `service_principal`

Deferred platform roles:

- `platform_auditor`
- Dedicated compliance reviewer roles.
- Approval-specific support roles.

### Tenant Roles

Tenant roles operate a transportation company inside one tenant.

Version 1 tenant roles:

- `tenant_owner`: owns tenant administration and critical tenant decisions.
- `tenant_admin`: manages tenant configuration, invitations, memberships, and tenant-level access.
- `tenant_member`: baseline active membership with minimal access.

Deferred tenant roles:

- `dispatcher`
- `driver`
- `rider`
- `fleet_manager`
- `accountant`
- `tenant_support_staff`
- `tenant_auditor`

These deferred roles are tenant-level concepts, but they should be introduced by the relevant business or operational module instead of being overloaded into the foundation prematurely.

### Roles, Permissions, And Capabilities

Role:

- A named bundle of permissions assigned at platform scope or tenant scope.

Permission:

- An action-level authorization primitive.

Capability:

- A tenant entitlement or enabled feature.

Differences:

- Roles answer: "What access bundle does this actor have?"
- Permissions answer: "May this actor perform this action?"
- Capabilities answer: "May this tenant use this platform or app capability?"

Version 1 decision:

- Permissions are defined as code constants and may be mirrored as read-only database reference data only where RLS or audit checks need stable names.
- Dynamic permission management is deferred.

Rules:

- Platform roles are scoped to platform administration.
- Tenant roles are scoped to one tenant membership.
- Capabilities are scoped to a tenant.
- Business modules should request authorization decisions instead of duplicating role expansion logic.

### Authorization Decision Model

Authorization is a decision result produced from authenticated actor, principal context, tenant context, requested action, and resource scope.

Inputs:

- Authenticated actor.
- Principal context.
- Tenant context when tenant-scoped.
- Requested action.
- Resource type.
- Resource tenant ownership.
- Relevant platform roles.
- Relevant tenant roles and permissions.
- Relevant tenant capabilities.

Outputs:

- Whether the action is allowed.
- Denial or grant reason.
- Optional constraints such as read-only, own-record-only, tenant-owner-required, or support-session-only.

Canonical denial reasons:

- `unauthenticated`
- `person_inactive`
- `missing_tenant`
- `tenant_suspended`
- `not_tenant_member`
- `membership_inactive`
- `forbidden`
- `capability_disabled`
- `cross_tenant_denied`
- `business_identity_required`
- `service_role_required`

Rules:

- Authentication failure returns `unauthenticated`.
- Missing tenant context for tenant-scoped actions returns `missing_tenant`.
- Missing membership or inactive membership returns `not_tenant_member` or `membership_inactive`.
- Missing permission returns `forbidden`.
- Disabled tenant capability returns `capability_disabled`.
- Suspended tenant returns `tenant_suspended`.
- Missing driver, rider, dispatcher, or other domain profile returns `business_identity_required` when a future module requires it.
- Business modules may apply domain rules after platform authorization succeeds.

Canonical concept name: `AuthorizationDecision`.

### Cross-Tenant Access

Rules:

- Normal tenant users cannot access other tenants.
- Cross-tenant access is reserved for platform administration, audited support, audit, reporting, or system automation.
- Cross-tenant access must be explicit, rare, constrained, and audited.
- Production tenant-data access in Version 1 is limited to `platform_owner` and `platform_admin`.
- Every production tenant-data access must include actor, tenant, reason, timestamp, and correlation identifier in an immutable audit record.
- `platform_support` does not receive direct production tenant-data access in Version 1.
- Tenant owner approval and time-bounded support sessions are deferred for Version 1.

## Entity Relationships

### Authentication Identity To Person Profile

Relationship:

- `AuthenticationIdentity` authenticates through Supabase Auth.
- `AuthenticationIdentity` resolves to one `PersonProfile` in Version 1.

Rules:

- One Supabase Auth identity maps to exactly one shared person profile in Version 1.
- Multiple authentication identities for one person profile are deferred.
- One authentication identity mapping to multiple person profiles is not allowed.

Ownership:

- Supabase Auth owns credential identity.
- Platform identity foundation owns minimal shared person profile and access linkage.

### Person Profile To Tenant Membership

Relationship:

- One `PersonProfile` may have many `TenantMembership` records.
- One `TenantMembership` links one person to one tenant.
- Membership provides tenant context only when active.

Ownership:

- Platform access foundation owns tenant memberships and tenant-level role assignment.

### Tenant To Business-Owned Data

Relationship:

- One tenant owns many future business records.
- Every tenant-owned transportation record must belong to exactly one tenant.

Ownership:

- Tenant foundation owns tenant lifecycle, tenant status, tenant settings, tenant capabilities, membership, and foundation access relationships.
- Future transportation modules own driver profiles, rider profiles, vehicles, bookings, trips, payments, support cases, and module-specific workflow rules.

Rules:

- Transportation records must not be stored in shared identity/profile records.
- Business modules must use tenant context before accessing tenant-owned data.
- Tenant suspension or closure affects business module behavior through platform contracts.

## Context Contracts

These contracts are conceptual. Existing TypeScript stubs may be revised later to align with this document, but this phase does not modify code.

### AuthenticatedActor

Represents the authenticated party from the request.

Conceptual fields:

- `actor_id`: stable request actor identifier.
- `actor_type`: `person`, `service_principal`, or `platform_system`.
- `auth_identity_id`: Supabase Auth identity reference when applicable.
- `email`: optional authenticated email claim.

Rules:

- Authenticated actor proves identity only.
- It does not imply platform staff authority or tenant access.

### PrincipalContext

Represents the platform-resolved actor.

Conceptual fields:

- `actor`: authenticated actor.
- `person_id`: shared person profile identifier when the actor is a person.
- `person_status`: shared person lifecycle status.
- `platform_roles`: active platform staff roles, if any.
- `is_service_role`: whether the request uses privileged server-side authority.

Rules:

- Principal context is required before authorization.
- Most authenticated people have no platform roles.
- Service-role principal context must be server-only and audited when it touches tenant data.

### TenantContext

Represents the selected tenant scope for a request.

Conceptual fields:

- `tenant_id`: selected tenant.
- `tenant_status`: tenant lifecycle status.
- `membership_id`: membership used for the request when a person acts as a tenant user.
- `membership_status`: membership lifecycle status.
- `tenant_roles`: active tenant-level roles.
- `tenant_capabilities`: relevant tenant capabilities.
- `business_identities`: relevant tenant-scoped business identities when loaded by future modules.

Rules:

- Tenant context is required for tenant-owned data.
- Tenant context must not be inferred only from authentication.
- Tenant context must be validated at server and data boundaries.
- If a person has one active tenant membership, the app may select it by default.
- If a person has multiple active memberships, the app must require explicit tenant selection and persist the last selected tenant as a preference.

### AuthorizationDecision

Represents the result of evaluating whether an action is allowed.

Conceptual fields:

- `allowed`: boolean.
- `reason`: machine-readable grant or denial reason.
- `constraints`: optional list of constraints.
- `evaluated_permissions`: optional list of permissions considered.
- `evaluated_capabilities`: optional list of tenant capabilities considered.

Rules:

- Authorization decisions should be auditable when security-sensitive.
- Business modules should request decisions rather than duplicating role logic.

## Multi-Tenant Isolation

### RLS Expectations

RLS is expected to be the primary database enforcement layer for tenant-scoped data exposed through Supabase.

Expectations:

- Tenant-scoped tables must have clear tenant ownership.
- RLS policies must be written before exposing tenant-scoped data to clients.
- RLS policies should be tied to tenant membership, explicit permission checks, or approved platform administration access.
- RLS tests are required for tenant-scoped data.
- UI checks are not sufficient authorization.

This document does not create RLS policies.

### Tenant-Scoped Ownership

Rules:

- Tenant-owned records must carry tenant ownership.
- Cross-tenant joins and reports require explicit platform authorization.
- Background jobs and integrations must carry tenant context when operating on tenant data.
- Events, logs, and audit records should include tenant and actor identifiers when applicable and safe.

### Service-Role Boundaries

Rules:

- Service-role keys are never exposed to browser or mobile clients.
- Service-role access is used only in trusted server-side code.
- Service-role use must be documented and minimized.
- Service-role operations touching tenant data must include actor, tenant, reason, and correlation context where applicable.
- Service-role access must not become a shortcut around authorization design.

### Audited Platform Administration Access

Rules:

- Platform administrators do not automatically become tenant members.
- Platform administration access must be represented as platform-level authority plus an audited support or admin action.
- Support access should be time-bounded later where practical, but Version 1 requires only explicit audited support actions.
- Tenant data access by platform staff must leave an audit trail.
- In Version 1, production tenant-data access is limited to `platform_owner` and `platform_admin`.
- Every production tenant-data access must include actor, tenant, reason, timestamp, and correlation identifier in an immutable audit record.

## Lifecycle Rules

### Person Activation And Deactivation

Person states:

- `invited`: a tenant invitation exists but the person has not completed activation.
- `active`: person may authenticate and use active tenant memberships.
- `suspended`: person is temporarily blocked from platform access.
- `deactivated`: person is no longer allowed to act.
- `deleted`: person data is removed or anonymized according to retention policy.

Version 1 decision:

- Create the shared person profile when a valid tenant invitation is accepted or when an administrator provisions a person.
- Do not create shared person profiles for arbitrary first sign-in without an invitation or admin action.

Rules:

- Activation requires a valid authentication identity and shared person profile.
- Suspension blocks all tenant membership use.
- Deactivation preserves audit and historical business references.
- People are soft-deactivated rather than immediately deleted.
- Personal data should be anonymized or deleted after the applicable retention period when no legal requirement remains.

### Tenant Creation, Suspension, And Closure

Rules:

- Tenant creation starts in `provisioning`.
- Tenant activation requires required settings and at least one active tenant owner.
- Suspension blocks new tenant-scoped business activity and normal member access.
- Closure blocks new business activity and starts operational wind-down.
- Closed tenants remain retained until deletion or anonymization is approved.
- Tenants are closed or soft-deactivated rather than immediately deleted.

### Membership Invitation, Activation, Suspension, And Removal

Rules:

- Invitation creates a pending tenant access relationship.
- Activation requires a valid invitation or approved administrative membership creation.
- Suspension temporarily blocks tenant access without deleting history.
- Removal permanently ends membership access.
- Removing a member revokes effective tenant role assignments.
- Removed memberships remain retained for audit until the applicable retention period expires.

### Role Assignment And Revocation

Role assignment states:

- `pending`: assignment awaits activation or approval.
- `active`: assignment is effective.
- `revoked`: assignment is no longer effective.
- `expired`: assignment ended automatically.

Rules:

- Role assignments must have scope: platform or tenant.
- Tenant role assignments must be tied to tenant membership.
- Role assignment and revocation are audit-relevant.
- Privileged roles should support future approval or time-bound rules.

## Naming Conventions

Canonical entities:

- `AuthenticationIdentity`: Supabase Auth credential identity.
- `PersonProfile`: minimal shared profile connecting authentication, memberships, and history.
- `Tenant`: transportation company or operating organization using the SaaS platform.
- `TenantMembership`: person-to-tenant access relationship.
- `PlatformRole`: SaaS company operational role.
- `TenantRole`: tenant-scoped access role.
- `Permission`: action-level authorization primitive.
- `TenantCapability`: tenant entitlement or enabled feature.
- `BusinessIdentity`: tenant-scoped domain identity such as driver, rider, or dispatcher.
- `PrincipalContext`: platform-resolved actor context.
- `TenantContext`: selected tenant access context.
- `AuthorizationDecision`: evaluated access result.

Canonical identifiers:

- `auth_identity_id`
- `person_id`
- `tenant_id`
- `membership_id`
- `role_id`
- `permission_id`
- `capability_key`
- `actor_id`
- `correlation_id`

Role naming:

- Use lowercase snake case.
- Platform roles start with `platform_`.
- Tenant foundation roles start with `tenant_`.
- Business roles should use business terms only when the owning module is designed, such as `dispatcher`, `driver`, or `fleet_manager`.

Permission naming:

- Use dot-separated action names.
- Pattern: `<scope>.<resource>.<action>`.
- Examples:
  - `platform.tenant.create`
  - `platform.tenant.suspend`
  - `tenant.membership.invite`
  - `tenant.membership.remove`
  - `tenant.role.assign`
  - `tenant.audit.read`

Capability naming:

- Use dot-separated capability keys.
- Pattern: `<area>.<capability>`.
- Examples:
  - `platform.memberships`
  - `platform.roles`
  - `platform.audit`
  - `app.admin`
  - `app.rider`
  - `app.driver`

Status naming:

- Use lowercase snake case.
- Prefer lifecycle words over UI labels.
- Do not encode business workflow state in person, membership, or tenant status.

Event naming:

- Use PascalCase past-tense facts.
- Examples:
  - `PersonProfileActivated`
  - `PersonProfileDeactivated`
  - `TenantCreated`
  - `TenantSuspended`
  - `TenantClosed`
  - `TenantMembershipInvited`
  - `TenantMembershipActivated`
  - `TenantMembershipRemoved`
  - `RoleAssigned`
  - `RoleRevoked`

## Version 1 Decision Table

| Topic                          | Version 1 decision                                                                                                                                                                                                                                                                                                                                                             | Tradeoff                                                                                                            | Deferred                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Tenant as platform customer    | Tenant is the central platform-level business entity.                                                                                                                                                                                                                                                                                                                          | Keeps SaaS/customer model clear and prevents ordinary users from becoming platform-level entities.                  | Tenant hierarchy and reseller/account grouping.                                                                 |
| Shared person profile creation | Create `PersonProfile` on valid invitation acceptance or admin provisioning. Do not create profiles for arbitrary first sign-in.                                                                                                                                                                                                                                               | Prevents orphan identities and keeps tenant access intentional.                                                     | Self-serve signup and public onboarding.                                                                        |
| Auth identity mapping          | One Supabase Auth identity maps to exactly one `PersonProfile`.                                                                                                                                                                                                                                                                                                                | Simple and auditable.                                                                                               | Multiple auth identities per person, account linking, account merge.                                            |
| Platform roles                 | Use `platform_owner`, `platform_admin`, `platform_support`, `service_principal`.                                                                                                                                                                                                                                                                                               | Covers SaaS operations without unused role complexity.                                                              | `platform_auditor`, compliance-specific roles.                                                                  |
| Tenant roles                   | Use `tenant_owner`, `tenant_admin`, `tenant_member`.                                                                                                                                                                                                                                                                                                                           | Keeps the foundation small and avoids pre-building transportation roles.                                            | Dispatcher, driver, rider, fleet manager, accountant, tenant support staff, tenant auditor.                     |
| First tenant owner             | The first tenant owner is created through an explicit invitation issued by an authorized platform administrator. Invitation acceptance creates or resolves the `PersonProfile`, tenant membership, and `tenant_owner` assignment.                                                                                                                                              | Keeps tenant creation controlled and creates a clear accountable owner before activation.                           | Self-serve tenant signup and multi-owner onboarding.                                                            |
| Tenant activation settings     | Require legal name, display name, default timezone, support contact email, at least one active `tenant_owner`, and explicit app capabilities.                                                                                                                                                                                                                                  | Minimal data needed to operate, audit, and display tenant context safely.                                           | Branding, billing contact, service areas, operating policies.                                                   |
| Pilot tenant surface           | V1 pilot tenants receive `app.admin` by default. `app.rider` and `app.driver` remain valid capability keys but are disabled by default.                                                                                                                                                                                                                                        | Avoids implying rider or driver workflows exist before their modules are implemented.                               | Rider and driver app enablement after business modules exist.                                                   |
| Production support access      | Only `platform_owner` and `platform_admin` may access production tenant data in V1. Every access requires actor, tenant, reason, timestamp, and correlation ID in an immutable audit record. `platform_support` has no direct production tenant-data access.                                                                                                                   | Keeps production access narrow while preserving supportability and auditability.                                    | Direct platform support access, tenant approval, internal approval, just-in-time sessions, time-bounded access. |
| Initial tenant capabilities    | Use `platform.memberships`, `platform.roles`, `platform.audit`, `app.admin`, `app.rider`, `app.driver`; enable only `app.admin` by default for V1 pilot tenants.                                                                                                                                                                                                               | Defines stable app capability keys without enabling unfinished business surfaces.                                   | Transportation module capabilities and subscription usage limits.                                               |
| Invitations                    | Email-only tenant invitations.                                                                                                                                                                                                                                                                                                                                                 | Simple and compatible with Supabase Auth.                                                                           | SSO, domain enrollment, SCIM, bulk import.                                                                      |
| Business identities            | Tenant owner, tenant admin, and tenant member remain foundation tenant roles. Staff operational identities may be introduced with the first operations module. `DriverProfile` belongs to Driver Management. `RiderProfile` belongs to Rider Management. Dispatcher and other operational identities belong to relevant tenant business modules.                               | Keeps the identity foundation clean and prevents transportation domain records from leaking into platform identity. | Driver, rider, dispatcher, fleet, accounting, and support business modules.                                     |
| Retention                      | Retain audit records and legally significant business records for seven years by default. Longer retention requires legal hold, regulatory obligation, or unresolved dispute. Users, memberships, and tenants are soft-deactivated or closed rather than immediately deleted. Personal data should be anonymized or deleted after retention when no legal requirement remains. | Gives a concrete production default without making indefinite retention the norm.                                   | Automated deletion, anonymization workflows, legal hold tooling.                                                |
| Permissions                    | Define permissions as code constants; optionally mirror as read-only reference data where RLS or audit needs stable names.                                                                                                                                                                                                                                                     | Simple and testable; avoids dynamic authorization complexity.                                                       | Dynamic permissions, custom roles, tenant-configurable permissions.                                             |
| Active tenant selection        | Auto-select only when one active membership exists; require explicit selection when multiple exist; persist last selected tenant preference.                                                                                                                                                                                                                                   | Preserves tenant correctness with reasonable UX.                                                                    | Advanced tenant switcher UX and platform cross-tenant views.                                                    |

## Unresolved Business Decisions

- What subscription states are required before billing is implemented?
- What legal or regulatory requirements may require retention longer than seven years for specific tenants or records?
- Which transportation operations module should be implemented first after the foundation is complete?
- What exact approval path is required before enabling `app.rider` or `app.driver` for a pilot tenant?

## Implementation Guardrails

- Do not create business tables before the identity and tenant foundation is approved.
- Do not expose tenant-owned data before RLS policies and RLS tests exist.
- Do not implement authentication UI until profile, membership, and tenant selection behavior is approved.
- Do not use service-role access in application code.
- Do not add transportation-specific roles, permissions, or capabilities until the relevant business module is designed.
