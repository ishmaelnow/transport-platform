# Tenant Internal Architecture

This specification defines how transportation business concepts are organized inside a tenant.

It is documentation only. It does not create SQL, migrations, TypeScript contracts, authentication flows, RLS policies, application screens, or transportation business code.

## Core Principle

The platform owns and manages tenants.

A tenant is an isolated transportation business workspace. All transportation business identities, workflows, and records exist inside a tenant, not at the platform level.

The platform manages:

- Tenant creation and lifecycle.
- Platform administration.
- Subscription and billing relationship.
- Provisioning.
- Platform audit.
- Platform support.
- Platform-managed tenant configuration and capabilities.

The tenant owns:

- Tenant members and administrators.
- Tenant-scoped operational identities.
- Transportation records.
- Transportation workflows.
- Tenant business configuration.
- Tenant reporting context.

## Tenant Hierarchy

```text
Platform
└── Tenant
    ├── Tenant Configuration
    ├── Tenant Membership And Administration
    ├── Enabled Capabilities
    ├── Business Modules
    │   ├── Tenant Operations
    │   ├── Driver Management
    │   ├── Rider Management
    │   ├── Dispatch
    │   ├── Fleet Management
    │   ├── Service Area Management
    │   ├── Pricing
    │   ├── Booking And Trip Management
    │   ├── Payments And Settlements
    │   ├── Support
    │   ├── Compliance
    │   └── Reporting
    └── Tenant-Owned Business Data
```

## Tenant Foundation Scope

The tenant foundation contains only the tenant-scoped primitives required before transportation modules can safely exist.

Belongs in the tenant foundation:

- Tenant record and tenant lifecycle status.
- Platform-managed tenant configuration values.
- Tenant capabilities.
- Tenant membership.
- Foundation tenant roles: `tenant_owner`, `tenant_admin`, `tenant_member`.
- Tenant role assignment.
- Tenant audit events for membership, role, support, and administrative changes.
- Tenant context contract.
- Tenant authorization foundation.
- Active tenant context.

Must wait for business modules:

- Dispatcher identity.
- Driver profile.
- Rider profile.
- Fleet manager identity.
- Accountant identity.
- Tenant support staff identity.
- Vehicles and fleets.
- Service areas.
- Pricing rules.
- Bookings and trips.
- Payment records and settlements.
- Support cases.
- Compliance records.
- Operational reports and analytics.

## Capabilities And Module Enablement

Tenant capabilities determine which platform or business modules are enabled for a tenant.

Rules:

- Capabilities are tenant-scoped.
- Capabilities are evaluated separately from user roles and permissions.
- A tenant member may have permission for an action, but the action is unavailable if the tenant capability is disabled.
- Business modules must check tenant capability before exposing workflows.
- Capability keys may exist before a module is implemented, but disabled capabilities must not imply working functionality.

Version 1 Tenant Foundation capabilities:

- `tenant.memberships`
- `tenant.roles`
- `tenant.audit`
- `app.admin`

Version 1 pilot default:

- `app.admin` enabled.
- `app.rider` and `app.driver` remain valid app capability keys from the Identity and Tenant Foundation, but they are disabled by default and are not Tenant Foundation capabilities.

Future business capability examples:

- `driver.management`
- `rider.management`
- `fleet.management`
- `dispatch.operations`
- `booking.management`
- `pricing.management`
- `payments.processing`
- `support.cases`
- `compliance.records`
- `reporting.analytics`

## Roles Versus Business Identities

Tenant roles are authorization bundles assigned to a tenant membership.

Business identities are tenant-scoped domain records that describe what a person or asset is inside the transportation company.

Examples:

- `tenant_owner` is a tenant role.
- `tenant_admin` is a tenant role.
- `DriverProfile` is a business identity owned by Driver Management.
- `RiderProfile` is a business identity owned by Rider Management.
- Dispatcher identity is a business identity owned by the future Dispatch module.
- Fleet manager identity belongs to Fleet Management.
- Accountant identity belongs to Payments, Settlements, or Finance Operations when that module is designed.
- Tenant support staff identity belongs to the future tenant Support module.

Rules:

- A role grants permission to perform actions.
- A business identity provides domain meaning and workflow eligibility.
- Do not use roles as a substitute for driver, rider, dispatcher, or staff business profiles.
- Do not store driver/rider lifecycle or operational state in tenant membership.
- A person may hold several roles and business identities inside one tenant.
- A person may hold different roles and business identities across different tenants.

## Tenant-Owned Record Rule

Every tenant-owned business record must belong to exactly one tenant.

Rules:

- Tenant-owned records must carry tenant ownership.
- Tenant-owned records must not be shared across tenants by default.
- Cross-tenant access must be platform-admin, support, reporting, or system automation behavior and must be explicit and audited.
- Business modules own their domain records, but they do not own tenant lifecycle or platform tenant identity.
- Tenant lifecycle affects module behavior through tenant context and capabilities.

Shared reference data may exist only when explicitly designed as platform reference data. Shared reference data must not contain tenant business state.

## Supabase Isolation Model

The platform uses one Supabase project for the platform backend.

Isolation approach:

- Tenant-owned tables will be shared tables with a tenant ownership column when implemented.
- RLS will be the primary enforcement layer for tenant-scoped data exposed through Supabase.
- RLS policies must be tied to tenant membership, explicit permissions, tenant capabilities where needed, or audited platform administration access.
- Service-role access must remain server-only, rare, justified, and audited.
- Every tenant-owned record must be designed so tenant isolation can be tested.

This document does not create tables or RLS policies.

## Major Tenant-Owned Concepts

### Tenant Configuration

Purpose:

- Stores platform-managed tenant configuration required to operate the tenant workspace.

Owning module:

- Tenant Foundation.

Tenant ownership rule:

- Configuration belongs to exactly one tenant.

Key relationships:

- Belongs to `Tenant`.
- Influences enabled applications, tenant display, timezone, support contact, and activation readiness.

Lifecycle:

- Created during tenant provisioning.
- Required before activation.
- Updated by tenant administrators or authorized platform administrators.
- Retained while tenant exists.

Classification:

- Configuration.

Must not be mixed into it:

- Driver preferences.
- Rider preferences.
- Service area rules owned by Service Area Management.
- Pricing rules.
- Dispatch operating rules.
- Payment settings owned by Payments.

### Tenant Capabilities

Purpose:

- Defines which platform and business modules a tenant may use.

Owning module:

- Tenant Foundation.

Tenant ownership rule:

- Capabilities belong to exactly one tenant.

Key relationships:

- Belongs to `Tenant`.
- Gates app surfaces and future business modules.
- Evaluated with roles and permissions during authorization.

Lifecycle:

- Assigned during provisioning.
- Enabled or disabled by platform administration or entitlement workflow.
- Retained for audit when changed.

Classification:

- Configuration.

Must not be mixed into it:

- User permissions.
- Domain workflow status.
- Billing invoices.
- Business record lifecycle state.

### Tenant Membership

Purpose:

- Connects an authenticated person to a tenant and allows tenant-scoped access when active.

Owning module:

- Tenant Foundation.

Tenant ownership rule:

- Each membership belongs to exactly one tenant and one person.

Key relationships:

- Belongs to `Tenant`.
- References `PersonProfile`.
- Receives tenant role assignments.
- May later be linked to business identities such as `DriverProfile` or `RiderProfile`.

Lifecycle:

- Invited.
- Active.
- Suspended.
- Removed.
- Expired.

Classification:

- Tenant access relationship.

Must not be mixed into it:

- Driver lifecycle.
- Rider lifecycle.
- Dispatcher workload.
- Employment details.
- Vehicle assignment.
- Payment responsibility.

### Tenant Administration

Purpose:

- Allows tenant owners and tenant administrators to manage foundation-level tenant access and settings.

Owning module:

- Tenant Foundation.

Tenant ownership rule:

- Administration authority is scoped to exactly one tenant through tenant role assignment.

Key relationships:

- Uses `TenantMembership`.
- Uses `TenantRole`.
- Manages tenant invitations, memberships, and tenant-managed settings.

Lifecycle:

- Role assigned.
- Role active.
- Role revoked or expired.

Classification:

- Role and authorization.

Must not be mixed into it:

- Platform administration.
- Driver qualification.
- Dispatch authority unless a later module maps permissions explicitly.
- Payment settlement authority unless Payments defines it.

### Tenant Audit

Purpose:

- Records security-relevant tenant actions, administrative changes, support access, and lifecycle changes.

Owning module:

- Tenant Foundation for foundation events.
- Future business modules for module-specific audit events.
- Audit/Compliance module may later aggregate or enforce audit policy.

Tenant ownership rule:

- Tenant audit records belong to exactly one tenant when the action is tenant-scoped.

Key relationships:

- References tenant.
- References actor.
- References membership or platform support access where applicable.
- May reference business records when modules exist.

Lifecycle:

- Appended when an auditable event occurs.
- Retained for the approved retention period.
- Never updated as normal business state.

Classification:

- Business record and audit evidence.

Must not be mixed into it:

- Mutable workflow state.
- Full sensitive payloads.
- Secrets.
- Payment processor secrets.

### Staff Operational Identity

Purpose:

- Represents tenant staff only when a future module needs a general staff identity that does not belong to a more specific business module.

Owning module:

- Future Tenant Operations module, if a generic staff identity remains necessary after domain modules are designed.

Tenant ownership rule:

- Staff operational identity belongs to exactly one tenant.

Key relationships:

- References tenant.
- References tenant membership/person.
- May connect to general tenant operations responsibilities that are not owned by Dispatch, Fleet Management, Payments, Settlements, Finance Operations, or Support.

Lifecycle:

- Created.
- Active.
- Suspended.
- Deactivated.
- Removed or archived.

Classification:

- Business identity.

Must not be mixed into it:

- Platform staff authority.
- Tenant owner/admin foundation roles.
- Driver eligibility.
- Rider service preferences.
- Dispatcher identity.
- Fleet manager identity.
- Accountant identity.
- Tenant support staff identity.
- Payment ledger state.

### Dispatcher Identity

Purpose:

- Represents a tenant-scoped person eligible to perform dispatch operations.

Owning module:

- Future Dispatch module.

Tenant ownership rule:

- Dispatcher identity belongs to exactly one tenant.

Key relationships:

- References tenant.
- References tenant membership/person.
- Interacts with bookings, trips, drivers, vehicles, service areas, and support cases.

Lifecycle:

- Created.
- Active.
- Suspended.
- Deactivated.

Classification:

- Business identity.

Must not be mixed into it:

- Tenant admin role.
- Platform support role.
- Tenant Foundation.
- Tenant Operations generic staff identity.
- Driver profile.
- Booking source-of-truth data.

### DriverProfile

Purpose:

- Represents a tenant-scoped driver and the driver's operational eligibility.

Owning module:

- Driver Management.

Tenant ownership rule:

- Each `DriverProfile` belongs to exactly one tenant.

Key relationships:

- References tenant.
- May reference tenant membership/person when the driver can sign in.
- May relate to vehicle assignments, dispatch assignments, compliance records, and trip activity.

Lifecycle:

- Draft or invited.
- Onboarding.
- Active.
- Suspended.
- Inactive.
- Archived.

Classification:

- Business identity.

Must not be mixed into it:

- Supabase Auth credential identity.
- Tenant membership.
- Tenant owner/admin role.
- Vehicle record.
- Trip record.
- Payment ledger.

### RiderProfile

Purpose:

- Represents a tenant-scoped rider/customer/passenger identity.

Owning module:

- Rider Management.

Tenant ownership rule:

- Each `RiderProfile` belongs to exactly one tenant.

Key relationships:

- References tenant.
- May reference tenant membership/person when the rider can sign in.
- May relate to bookings, trips, saved locations, accessibility needs, account relationships, and support cases.

Lifecycle:

- Created.
- Active.
- Suspended.
- Inactive.
- Archived.

Classification:

- Business identity.

Must not be mixed into it:

- Tenant membership.
- Driver profile.
- Payment transaction record.
- Booking source-of-truth state.
- Platform person profile beyond linkage.

### Vehicle

Purpose:

- Represents a tenant-owned or tenant-managed vehicle used for transportation services.

Owning module:

- Fleet Management.

Tenant ownership rule:

- Each vehicle belongs to exactly one tenant.

Key relationships:

- References tenant.
- May relate to fleet grouping, driver assignment, maintenance, compliance records, dispatch assignments, and trips.

Lifecycle:

- Draft.
- Active.
- Out of service.
- Retired.
- Archived.

Classification:

- Business record.

Must not be mixed into it:

- Driver identity.
- Trip lifecycle state.
- Payment state.
- Tenant settings.

### Fleet

Purpose:

- Groups vehicles for tenant operations, reporting, policy, or dispatch planning.

Owning module:

- Fleet Management.

Tenant ownership rule:

- Each fleet belongs to exactly one tenant.

Key relationships:

- References tenant.
- Contains or groups vehicles.
- May relate to service areas, operating policies, and reporting.

Lifecycle:

- Created.
- Active.
- Inactive.
- Archived.

Classification:

- Configuration and business record.

Must not be mixed into it:

- Tenant lifecycle.
- Vehicle maintenance records.
- Driver identity.
- Pricing rules unless explicitly linked by Pricing.

### Service Area

Purpose:

- Defines geographic or operational boundaries where a tenant provides service.

Owning module:

- Service Area Management.

Tenant ownership rule:

- Each service area belongs to exactly one tenant.

Key relationships:

- References tenant.
- May relate to pricing, bookings, dispatch, fleets, drivers, and compliance rules.

Lifecycle:

- Draft.
- Active.
- Suspended.
- Retired.

Classification:

- Configuration.

Must not be mixed into it:

- Tenant status.
- Trip status.
- Driver availability.
- Payment rules except through explicit Pricing relationships.

### Pricing

Purpose:

- Defines tenant-specific pricing rules, quotes, charges, adjustments, and commercial policy.

Owning module:

- Pricing.

Tenant ownership rule:

- Pricing rules and price records belong to exactly one tenant.

Key relationships:

- References tenant.
- May relate to service areas, rider/account relationships, bookings, trips, payments, and promotions.

Lifecycle:

- Draft.
- Active.
- Superseded.
- Retired.

Classification:

- Configuration and business record.

Must not be mixed into it:

- Payment processor transaction state.
- Booking lifecycle.
- Tenant subscription billing.
- Driver compensation unless a compensation module owns that relationship.

### Booking

Purpose:

- Represents a tenant-owned transportation service request before and during fulfillment planning.

Owning module:

- Booking and Trip Management.

Tenant ownership rule:

- Each booking belongs to exactly one tenant.

Key relationships:

- References tenant.
- May reference rider profile, service area, price quote, dispatcher, driver, vehicle, trip, payment responsibility, and support cases.

Lifecycle:

- Draft.
- Requested.
- Confirmed.
- Waitlisted.
- Cancelled.
- Converted to trip.
- Closed.

Classification:

- Workflow and business record.

Must not be mixed into it:

- Rider source-of-truth profile.
- Driver source-of-truth profile.
- Vehicle source-of-truth record.
- Payment settlement ledger.
- Tenant membership.

### Trip

Purpose:

- Represents the execution of a transportation service.

Owning module:

- Booking and Trip Management or Dispatch, depending on later module boundary decision.

Tenant ownership rule:

- Each trip belongs to exactly one tenant.

Key relationships:

- References tenant.
- May reference booking, rider profile, driver profile, vehicle, dispatch assignment, price, payment, support, and compliance records.

Lifecycle:

- Planned.
- Assigned.
- En route.
- Arrived.
- In progress.
- Completed.
- Cancelled.
- No-show.
- Exception.

Classification:

- Workflow and business record.

Must not be mixed into it:

- Driver eligibility.
- Vehicle maintenance source-of-truth.
- Payment settlement source-of-truth.
- Tenant configuration.

### Dispatch Assignment

Purpose:

- Represents the operational decision assigning driver, vehicle, and plan to a booking or trip.

Owning module:

- Dispatch.

Tenant ownership rule:

- Each dispatch assignment belongs to exactly one tenant.

Key relationships:

- References tenant.
- References booking or trip.
- References driver profile.
- References vehicle.
- May reference dispatcher identity and service area.

Lifecycle:

- Proposed.
- Offered.
- Accepted.
- Rejected.
- Reassigned.
- Cancelled.
- Completed.

Classification:

- Workflow and business record.

Must not be mixed into it:

- Booking source-of-truth request data.
- Driver profile eligibility data.
- Vehicle maintenance data.
- Payment settlement data.

### Payment

Purpose:

- Represents tenant-scoped money movement, payment authorization, capture, refund, and account balance records.

Owning module:

- Payments and Settlements.

Tenant ownership rule:

- Each payment record belongs to exactly one tenant.

Key relationships:

- References tenant.
- May reference booking, trip, rider/account, pricing record, settlement, refund, and external payment provider references.

Lifecycle:

- Pending.
- Authorized.
- Captured.
- Failed.
- Refunded.
- Disputed.
- Settled.
- Voided.

Classification:

- Business record and workflow.

Must not be mixed into it:

- Platform subscription billing.
- Tenant lifecycle.
- Raw payment secrets.
- Driver profile.
- Booking request data beyond references.

### Settlement

Purpose:

- Represents reconciliation, payout, or financial settlement for tenant operations.

Owning module:

- Payments and Settlements.

Tenant ownership rule:

- Each settlement belongs to exactly one tenant.

Key relationships:

- References tenant.
- References payments, trips, accounts, drivers, or external providers when applicable.

Lifecycle:

- Draft.
- Pending.
- Approved.
- Paid.
- Failed.
- Reconciled.
- Disputed.

Classification:

- Business record and workflow.

Must not be mixed into it:

- Platform subscription invoices.
- Trip execution state.
- Pricing rule definitions.
- Driver profile source-of-truth data.

### Support Case

Purpose:

- Represents tenant-scoped support, complaint, issue, or service recovery work.

Owning module:

- Support.

Tenant ownership rule:

- Each support case belongs to exactly one tenant.

Key relationships:

- References tenant.
- May reference rider, driver, booking, trip, payment, vehicle, dispatcher, support staff, or compliance records.

Lifecycle:

- Open.
- In review.
- Waiting.
- Escalated.
- Resolved.
- Closed.

Classification:

- Workflow and business record.

Must not be mixed into it:

- Platform support access audit.
- Compliance source-of-truth findings unless Compliance owns them.
- Payment ledger state.
- Tenant lifecycle state.

### Compliance Record

Purpose:

- Represents tenant-scoped evidence, obligations, incidents, checks, or compliance status.

Owning module:

- Compliance.

Tenant ownership rule:

- Each compliance record belongs to exactly one tenant.

Key relationships:

- References tenant.
- May reference driver, vehicle, trip, incident, support case, document, or audit record.

Lifecycle:

- Draft.
- Active.
- Under review.
- Cleared.
- Failed.
- Expired.
- Archived.

Classification:

- Business record and audit/compliance evidence.

Must not be mixed into it:

- General tenant settings.
- Driver profile source-of-truth except through references.
- Vehicle source-of-truth except through references.
- Mutable support case discussion.

### Reporting

Purpose:

- Provides tenant-scoped operational, financial, compliance, and performance views.

Owning module:

- Reporting.

Tenant ownership rule:

- Reports are tenant-scoped unless explicitly designed for platform administration.

Key relationships:

- Reads tenant-owned records from business modules through explicit reporting contracts.
- May aggregate bookings, trips, payments, drivers, riders, vehicles, support, compliance, and audit facts.

Lifecycle:

- Defined.
- Generated.
- Viewed.
- Exported.
- Archived when applicable.

Classification:

- Reporting view or derived business record.

Must not be mixed into it:

- Source-of-truth workflow state.
- Authorization policy.
- Cross-tenant platform analytics without explicit platform authorization.

## Module Implementation Order

First implementation module:

1. Tenant Foundation.

Reason:

- Tenant Operations depends on tenants, memberships, roles, capabilities, tenant context, authorization, and audit.
- Tenant Foundation creates the isolation and authorization contract every later tenant business module needs.
- Tenant Foundation must work before operational staff identities or transportation workflows are introduced.

Tenant Foundation owns:

- Tenant creation and lifecycle.
- Tenant configuration.
- Tenant capabilities.
- Tenant memberships.
- Tenant owner and tenant admin roles.
- Active tenant context.
- Tenant authorization foundation.
- Tenant audit foundation.

Deferred until after Tenant Foundation:

- Tenant Operations.
- Driver Management.
- Rider Management.
- Fleet Management.
- Dispatch.
- Booking and Trip Management.
- Payments and Settlements.
- Support.
- Compliance.
- Reporting.

## Unresolved Business Decisions

- Which module owns trip lifecycle if Booking and Dispatch are implemented separately?
- Which module owns service area rules if pricing and dispatch both depend on them?
- Which payment provider and settlement model should be assumed when Payments is designed?
- Which reports are required before business modules reach production?

## Implementation Guardrails

- Do not create transportation business records in the tenant foundation.
- Do not model driver or rider profiles as tenant roles.
- Do not introduce `DispatcherProfile` during Tenant Foundation.
- Do not create generic operational identities prematurely.
- Do not add transportation permissions until the owning module is designed.
- Do not expose tenant-owned data before RLS policies and RLS tests exist.
- Do not use service-role access as a substitute for tenant authorization.
- Do not allow cross-tenant access without explicit platform authority and immutable audit evidence.
