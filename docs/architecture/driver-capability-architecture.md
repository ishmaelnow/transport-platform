# Driver Capability Architecture

## Purpose

This document reverse engineers the business concepts represented by a third-party driver feature
surface. It does not reproduce that product's implementation and does not authorize implementation.
The feature list is treated as product-domain evidence only.

The central rule is:

> A feature does not belong to Driver Management merely because a driver sees or uses it.

Driver Management should own the durable driver profile and its administrative lifecycle. Identity,
vehicles, verification, compliance, dispatch, location, money, billing, and incentives remain separate
capabilities with explicit contracts.

## Existing Platform Baseline

The platform currently provides:

- Supabase authentication and person profiles;
- tenant lifecycle, membership, roles, capabilities, context, and RLS isolation;
- platform and tenant administration;
- tenant invitations and invitation acceptance;
- tenant audit events;
- Resend email delivery and delivery webhooks;
- Admin, Driver, and Rider application boundaries, although Driver and Rider business workflows are not
  implemented;
- disabled `app.driver` and `app.rider` capability keys.

It does not currently provide driver profiles, driver onboarding, verification, compliance, vehicles,
dispatch, location, wallets, billing, subscriptions, performance levels, or incentives.

## Concept Classification

### Registration and Profile

#### Allow signup through the Driver app

1. **Business purpose:** Acquire prospective drivers, create an authenticated identity, capture consent,
   associate the applicant with a tenant, and start an onboarding workflow.
2. **Existing support:** Partial. Authentication, person profiles, tenant invitations, and memberships
   exist. Public or tenant-directed driver application and onboarding do not.
3. **Owner:** **Driver Onboarding** owns the application workflow. **Platform Identity and Access** owns
   authentication and account identity. **Driver Management** receives or links the resulting driver
   profile; it should not own signup credentials.

#### Allow drivers to edit their own profile

1. **Business purpose:** Keep driver-controlled contact and operational profile information current while
   protecting administrator-controlled and verified fields.
2. **Existing support:** No driver profile exists. Person-profile and tenant authorization foundations
   exist.
3. **Owner:** **Driver Management** owns editable driver-domain fields and field-level policy. The
   **Driver App** owns the experience. **Platform Identity** owns login email, password, MFA, and other
   account-security fields.

#### Require a personal photo

1. **Business purpose:** Let operators and customers recognize the driver and provide evidence for
   onboarding or identity checks.
2. **Existing support:** No. Supabase Storage is an intended platform direction but no media workflow is
   implemented.
3. **Owner:** **Driver Onboarding** owns whether a photo is required during application. **Driver
   Verification** owns whether it is acceptable as evidence. A reusable **Media/Asset Service** owns
   storage, scanning, retention, and signed access. Driver Management may retain only the approved asset
   reference used as the profile portrait.

#### Require a vehicle photo

1. **Business purpose:** Confirm the presented vehicle, help riders identify it, and support vehicle
   inspection or compliance.
2. **Existing support:** No vehicle model or media service exists.
3. **Owner:** **Fleet and Vehicle Management** owns the vehicle and its display images. **Vehicle
   Compliance** owns evidence and approval rules. It does not belong to Driver Management, even if the
   driver uploads it.

#### Identity verification using facial recognition

1. **Business purpose:** Establish that the applicant is a real person and matches authoritative identity
   evidence; reduce impersonation and account sharing.
2. **Existing support:** No. Authentication proves control of credentials, not real-world identity.
3. **Owner:** **Driver Verification** owns the verification case, consent, result, and review workflow. A
   reusable **Verification Provider Integration** should isolate facial-recognition vendors. Biometric
   data must not be stored in Driver Management.

#### Reference document verification

1. **Business purpose:** Validate identity, licensing, work eligibility, insurance, or tenant-required
   credentials.
2. **Existing support:** No document verification capability exists.
3. **Owner:** Split by document purpose. **Driver Verification** owns identity evidence. **Driver
   Compliance** owns licenses and driver credentials. **Vehicle Compliance** owns registration,
   inspection, and vehicle insurance. A reusable **Document Evidence Service** owns secure files,
   metadata, review evidence, and retention.

### Application Settings

#### Customer App: Show drivers on a map

1. **Business purpose:** Give customers confidence about supply or arrival and visualize nearby or assigned
   drivers.
2. **Existing support:** No realtime location or customer map workflow exists.
3. **Owner:** **Realtime Location** owns position ingestion and freshness. **Dispatch** owns which drivers
   are eligible or assigned. **Location Privacy Policy** owns precision, anonymity, and exposure timing.
   **Customer App Configuration** controls presentation. Driver Management owns none of the location data.

#### Driver App: Show customer name

1. **Business purpose:** Help the driver identify and serve the correct customer.
2. **Existing support:** No booking, trip, or customer context exists.
3. **Owner:** **Booking/Trip Management** owns the customer relationship for a job. **Privacy Policy**
   decides when and how much identity is disclosed. **Driver App Configuration** controls presentation.

#### Driver App: Show customer rating

1. **Business purpose:** Give drivers a trust or risk signal before or during service.
2. **Existing support:** No reputation system exists.
3. **Owner:** **Reputation and Trust** owns ratings, aggregation, moderation, and visibility. **Dispatch** may
   consume the signal only through policy. **Driver App Configuration** controls display.

#### Driver App: Heatmap

1. **Business purpose:** Show areas of predicted or current demand so drivers can reposition.
2. **Existing support:** No demand, location, or dispatch analytics exists.
3. **Owner:** **Demand Intelligence** owns aggregation and prediction. **Dispatch** supplies demand and
   supply signals. **Realtime Location** supplies privacy-safe supply data. The Driver app only renders the
   resulting tiles or zones.

#### Driver App: Driving Home

1. **Business purpose:** Match a driver with work that moves them toward a chosen destination near the end
   of a shift.
2. **Existing support:** No dispatch or routing capability exists.
3. **Owner:** **Dispatch Optimization** owns matching constraints. A **Driver Work Preferences** component
   owns destination, schedule, and opt-in state. A routing provider integration calculates direction and
   travel cost. It is not a Driver Management profile field.

#### Driver App: Show other drivers

1. **Business purpose:** Provide supply awareness, coordination, or social proof; it can also create safety,
   privacy, and gaming risks.
2. **Existing support:** No.
3. **Owner:** **Realtime Location** and **Location Privacy Policy** own the data and permitted precision.
   **Driver App Configuration** owns whether it is shown. Dispatch may expose aggregated supply instead of
   identifiable drivers.

#### Driver App: Instant order radius

1. **Business purpose:** Limit which immediately available jobs are offered based on pickup distance,
   service quality, and marketplace efficiency.
2. **Existing support:** No.
3. **Owner:** **Dispatch Matching Policy** owns the radius and eligibility calculation. **Service Area** and
   routing contracts provide geographic constraints. Driver App Configuration may expose a permitted
   preference, but it does not own matching behavior.

### Driver Balance

#### Driver-to-driver transfers

1. **Business purpose:** Move stored value between driver accounts for operational settlement, assistance,
   or marketplace liquidity.
2. **Existing support:** No wallet, ledger, or payments capability exists.
3. **Owner:** **Driver Wallet** owns the driver-facing account. A reusable, double-entry **Ledger Service**
   owns balances and transfers. **Payments Risk/Compliance** owns limits, sanctions, fraud, and reversals.
   Driver Management must never store a balance column.

#### Minimum balance before accepting jobs

1. **Business purpose:** Enforce prepaid commissions, deposits, debt limits, or financial eligibility before
   a driver can receive work.
2. **Existing support:** No.
3. **Owner:** **Driver Financial Eligibility Policy** evaluates Wallet/Ledger state. **Dispatch** enforces the
   result when offering or accepting a job. Driver Management may expose a general eligibility summary but
   does not calculate balance rules.

#### Currency

1. **Business purpose:** Define the denomination used for balances, fees, transfers, and settlement.
2. **Existing support:** No money model exists.
3. **Owner:** A reusable **Money and Currency Foundation** defines ISO currency and amount semantics.
   **Wallet/Billing** chooses account currency under tenant and market policy. Currency must not be a loose
   Driver Management setting.

### Document Expiration Policy

#### First warning

1. **Business purpose:** Give a driver enough advance notice to renew a credential without interrupting work.
2. **Existing support:** Email sending exists, but compliance schedules and notification orchestration do
   not.
3. **Owner:** **Driver Compliance** owns the first-warning milestone. A reusable **Notification
   Service** owns delivery channels, templates, preferences, and delivery status.

#### Second warning

1. **Business purpose:** Escalate an unresolved expiry risk to the driver and appropriate operators as the
   enforcement date approaches.
2. **Existing support:** Email delivery exists, but escalation schedules and compliance recipients do not.
3. **Owner:** **Driver Compliance** owns escalation timing and recipients. The reusable **Notification
   Service** delivers the message.

#### Automatic deactivation

1. **Business purpose:** Stop legally or operationally ineligible drivers from receiving work after required
   credentials expire.
2. **Existing support:** No driver eligibility or dispatch gate exists.
3. **Owner:** **Driver Compliance** produces an eligibility decision. **Dispatch** enforces ineligibility.
   Driver Management retains the profile and its administrative lifecycle; compliance expiry should not
   delete the driver or silently rewrite unrelated profile state.

#### Notifications

1. **Business purpose:** Deliver expiry, warning, deactivation, and remediation messages to drivers and
   operators.
2. **Existing support:** Partial. Resend email infrastructure and delivery webhooks exist for invitations.
3. **Owner:** A reusable **Notification Service** owns delivery. Driver Compliance emits notification
   intents containing policy context.

#### Reactivation

1. **Business purpose:** Restore job eligibility after valid replacement evidence is approved.
2. **Existing support:** No.
3. **Owner:** **Driver Compliance** owns remediation and re-evaluation. **Dispatch** consumes the restored
   eligibility. Driver Management may separately require an administrator to restore an administratively
   suspended profile.

### Driver Subscription Plan

#### Subscription name

1. **Business purpose:** Give a commercial package a stable identity for display, assignment, and reporting.
2. **Existing support:** No subscription catalog exists.
3. **Owner:** **Driver Billing Catalog**.

#### Billing period

1. **Business purpose:** Define the recurring entitlement and invoicing cadence.
2. **Existing support:** Stripe is only a package boundary; no driver billing workflow exists.
3. **Owner:** **Driver Billing** composes a reusable **Billing/Subscription Service**.

#### Subscription fee

1. **Business purpose:** Define the recurring price charged for the plan.
2. **Existing support:** No driver pricing or billing workflow exists.
3. **Owner:** **Pricing** owns the amount and effective version; **Driver Billing** charges it.

#### Included rides

1. **Business purpose:** Bundle a usage allowance into a subscription period.
2. **Existing support:** No trip or usage metering exists.
3. **Owner:** **Usage Metering** counts eligible completed trips. Driver Billing applies the allowance.
   **Trip Management** remains the source of completed-trip facts.

#### Per-order fees

1. **Business purpose:** Charge a driver or operator based on completed marketplace transactions.
2. **Existing support:** No.
3. **Owner:** **Pricing** defines the fee rule; **Billing** invoices it; **Trip/Order Management** emits usage.

#### Transaction fees

1. **Business purpose:** Recover payment-processing or marketplace transaction costs.
2. **Existing support:** No.
3. **Owner:** **Payments Pricing** calculates payment-related fees; Billing presents and settles them.

#### Wallet fees

1. **Business purpose:** Price wallet funding, withdrawal, transfer, or maintenance operations.
2. **Existing support:** No.
3. **Owner:** **Wallet Pricing** and **Driver Billing**, backed by the reusable Ledger Service.

#### Apple Pay fees

1. **Business purpose:** Apply or disclose costs specifically attributable to the Apple Pay payment method.
2. **Existing support:** No.
3. **Owner:** **Payments** owns methods and processor facts. **Payments Pricing** owns fee policy. Driver
   Billing consumes the calculated charge. Apple Pay is a payment-method adapter, not a Driver Management
   field.

#### Payment-method fees

1. **Business purpose:** Price costs or commercial policy by card, bank, cash, wallet, or other payment
   method without hard-coding individual brands.
2. **Existing support:** No.
3. **Owner:** **Payments Pricing** owns method-based rules; Payments supplies method facts and Billing
   consumes calculated fees.

### Driver Levels

#### Automatic promotions

1. **Business purpose:** Advance qualified drivers automatically and consistently without manual review.
2. **Existing support:** No performance fact or rules engine exists.
3. **Owner:** **Driver Performance and Incentives** owns promotion evaluation and emits level changes.

#### Performance levels

1. **Business purpose:** Segment drivers into understandable tiers based on versioned performance policy.
2. **Existing support:** No.
3. **Owner:** **Driver Performance and Incentives** owns level definitions and consumes facts from Trips,
   Reputation, Compliance, and possibly Support.

#### Reward system

1. **Business purpose:** Grant benefits for specific achievements or desired behavior.
2. **Existing support:** No.
3. **Owner:** **Driver Incentives** owns reward campaigns, earning, expiry, and redemption.

#### Loyalty program

1. **Business purpose:** Improve long-term retention through sustained status, recognition, or accumulated
   value rather than one-off rewards.
2. **Existing support:** No.
3. **Owner:** **Driver Incentives** owns the transportation program. A reusable **Loyalty Service** may own
   generic tier, accrual, and benefit primitives.

#### Criteria

1. **Business purpose:** Define transparent, versioned conditions for qualification or promotion.
2. **Existing support:** No.
3. **Owner:** **Driver Performance and Incentives** owns transportation-specific criteria. A reusable rule
   evaluator may execute them, but source modules continue to own their facts.

#### Benefits

1. **Business purpose:** Grant tangible outcomes such as priority dispatch, reduced fees, bonuses, support,
   or recognition.
2. **Existing support:** No.
3. **Owner:** **Driver Incentives** owns benefit grants. The module providing a benefit owns enforcement:
   Dispatch enforces priority, Pricing applies discounts, Wallet posts bonuses, and Support applies service
   tiers.

#### Automatic plan transitions

1. **Business purpose:** Move a driver between commercial plans after qualification or level changes.
2. **Existing support:** No.
3. **Owner:** **Driver Billing** owns subscription changes. Driver Incentives emits a qualified transition
   request or event; it must not directly mutate billing records.

## Capability Map

| Capability                   | Primary responsibility                                            | Key consumers                               |
| ---------------------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| Platform Identity and Access | Credentials, person identity, sessions, tenant access             | All applications                            |
| Driver Management            | Durable driver profile, person linkage, administrative lifecycle  | Onboarding, Compliance, Dispatch            |
| Driver Onboarding            | Application, consent, onboarding steps, completion                | Driver App, Verification                    |
| Driver Verification          | Identity proofing and evidence decisions                          | Onboarding, Compliance                      |
| Driver Compliance            | Credential rules, expiry, remediation, operational eligibility    | Dispatch, Notifications                     |
| Fleet and Vehicle Management | Vehicles, ownership/management, vehicle images                    | Dispatch, Driver App                        |
| Vehicle Compliance           | Registration, insurance, inspection evidence                      | Dispatch, Fleet                             |
| Driver App Configuration     | Tenant presentation and permitted driver preferences              | Driver App                                  |
| Realtime Location            | Location ingestion, freshness, privacy-safe projections           | Dispatch, maps, analytics                   |
| Dispatch                     | Availability, matching, offer/acceptance, eligibility enforcement | Driver and Customer apps                    |
| Demand Intelligence          | Heatmaps and demand forecasts                                     | Driver App, Dispatch                        |
| Reputation and Trust         | Ratings, aggregates, moderation, visibility                       | Dispatch, Driver App                        |
| Driver Wallet                | Driver-facing financial accounts and operations                   | Driver App, Billing                         |
| Ledger                       | Authoritative money movements and balances                        | Wallet, Payments, Billing                   |
| Driver Billing               | Plans, assignment, invoices, subscription lifecycle               | Admin, Driver App                           |
| Pricing                      | Fee and charge calculation                                        | Billing, Payments, Trips                    |
| Usage Metering               | Period usage and allowances                                       | Billing, Incentives                         |
| Driver Incentives            | Levels, criteria, benefits, loyalty                               | Dispatch, Pricing, Wallet                   |
| Notifications                | Channel delivery, templates, preferences, delivery results        | Onboarding, Compliance, Billing             |
| Media/Document Evidence      | Secure assets, metadata, retention, access                        | Onboarding, Verification, Compliance, Fleet |

## Dependency Graph

```text
Tenant Foundation + Identity + Audit + Capability Governance + Events
        │
        ├── Media/Document Evidence
        ├── Notifications
        ├── Money/Currency + Ledger
        └── Driver Management
                │
                ├── Driver Onboarding ──> Driver Verification
                │                              │
                │                              └──> Driver Compliance ──> Dispatch eligibility
                │
                ├── Fleet/Vehicle Management ──> Vehicle Compliance ──> Dispatch eligibility
                │
                └── Driver App Configuration

Realtime Location + Service Areas + Routing ──> Dispatch ──> Trips/Orders
                                                  │              │
Reputation/Trust ─────────────────────────────────┘              ├──> Usage Metering
                                                                 ├──> Pricing/Billing
Payments ──> Ledger ──> Driver Wallet ────────────────────────────┘

Trips + Reputation + Compliance + Support facts
        └──> Driver Performance/Incentives
                    ├──> Dispatch benefits
                    ├──> Pricing/Wallet benefits
                    └──> Billing plan-transition request
```

Dependencies should be contracts or events, not cross-module table mutation.

## Foundational Modules

These should exist before dependent transportation workflows:

1. Tenant Foundation, Identity and Access, RLS, capabilities, and audit — largely present.
2. Event contracts and idempotent event handling.
3. Notification Service generalized from invitation email delivery.
4. Media and Document Evidence Service.
5. Money and Currency types plus an immutable Ledger foundation before balances or billing.
6. Consent, privacy, retention, and provider-integration boundaries for verification and location.

Driver Management is foundational within the transportation domain, but it is not a general platform
foundation.

## Modules That Can Be Built Independently

- Driver Management can be built after Tenant Foundation without Dispatch or Wallet.
- Fleet and Vehicle Management can be built alongside Driver Management.
- Media/Document Evidence and Notifications can be built as platform services independently.
- Reputation can define contracts independently, although useful scores require trip/customer facts.
- Driver App Configuration can define typed settings independently, but settings for absent capabilities
  must remain disabled.
- Money/Currency and Ledger can be built independently of driver billing.

The following cannot deliver meaningful behavior independently:

- Heatmaps require demand and location facts.
- Driving Home and instant radius require Dispatch, routing, and availability.
- Balance gating requires Wallet/Ledger plus Dispatch enforcement.
- Included rides require completed Trip facts and Usage Metering.
- Levels require performance facts and benefit-provider integrations.

## Recommended Implementation Order

1. **Capability governance and event contracts:** safely enable modules per tenant and publish stable facts.
2. **Driver Management V1:** profile, optional person linkage, administrative lifecycle, tenant RLS, audit.
3. **Media/Document Evidence and Notification foundations:** reusable infrastructure needed by onboarding and
   compliance.
4. **Driver Onboarding:** tenant invitation/application flow, consent, profile completion, self-service.
5. **Driver Verification and Driver Compliance:** evidence review, expiry policy, eligibility decisions.
6. **Fleet/Vehicle Management and Vehicle Compliance:** vehicle identity and required evidence.
7. **Realtime Location, Service Areas, Routing, and privacy contracts.**
8. **Dispatch and Trip/Order core:** availability, matching, offers, assignment, lifecycle.
9. **Reputation and Driver/Customer app disclosure configuration.**
10. **Money/Currency, Ledger, Payments, and Driver Wallet.**
11. **Pricing, Usage Metering, Driver Billing, and subscriptions.**
12. **Demand Intelligence, Driver Performance, levels, loyalty, and incentives.**

This order prioritizes operational truth and safety before financial and optimization features.

## Transportation-Specific Modules

These concepts should remain explicitly transportation-specific:

- Driver Management and driver operational lifecycle;
- Driver Onboarding policy and driver-specific application steps;
- driver and vehicle compliance rule sets;
- Fleet and Vehicle Management;
- service areas, driver availability, matching, dispatch, and trip lifecycle;
- Driving Home and instant-order radius;
- driver performance criteria based on trips, acceptance, safety, and service;
- transportation-specific pricing, included rides, and driver commercial packages.

Keeping these modules transportation-specific prevents platform foundations from becoming a disguised
ride-hailing monolith.

## Reusable Platform Services

These should be designed for reuse by marketplaces, tutoring platforms, and other tenant applications:

- Identity and Access, tenant context, capabilities, RLS helpers, and audit;
- Notification delivery and webhook tracking;
- Media/Asset and Document Evidence storage;
- verification-provider adapters and generic verification cases;
- consent, privacy, and retention policy primitives;
- realtime presence/location infrastructure, while exposure policy remains product-specific;
- Money/Currency and immutable Ledger;
- Payments provider integrations;
- subscription billing, usage metering, and generic pricing primitives;
- generic Reputation primitives, with product-specific subjects and criteria;
- generic Incentives/Loyalty rules and benefit grants;
- event delivery, idempotency, scheduling, and workflow orchestration.

Reusable does not mean generic database tables shared by every product. Each service needs a stable contract
and product-specific adapters.

## Critique of the Observed Design

The observed feature surface appears convenient for operators because many controls are grouped under a
single Driver area. A settings screen, however, does not prove that the underlying system is modular.
Without access to its internal architecture, any critique of implementation separation is necessarily an
inference from the product surface.

Conceptually, the surface couples several unrelated responsibilities:

- Auth signup, self-service profile editing, identity proofing, and compliance evidence are presented as one
  registration concern.
- A driver profile is visually mixed with vehicle evidence even though drivers and vehicles have different
  lifecycles and cardinality.
- Customer disclosure, heatmaps, other-driver visibility, routing preferences, and matching radius are
  grouped as app settings even though they depend on Privacy, Realtime Location, Demand, and Dispatch.
- Wallet transfers, dispatch eligibility, and currency are grouped as balance settings even though they
  require Ledger, Risk, Money, and Dispatch contracts.
- A single subscription-plan surface mixes recurring billing, usage allowances, marketplace pricing, payment
  processing fees, and wallet pricing.
- Levels combine performance measurement, loyalty, benefits, dispatch priority, pricing discounts, and
  billing-plan transitions.

That organization risks a large Driver module becoming the owner of anything involving a driver. Such a
module would accumulate sensitive identity data, vehicle data, operational state, location, financial
balances, pricing, and incentives. It would be difficult to test, authorize, change, or reuse.

Our architecture should allow a unified Driver administration experience while keeping ownership separate:

```text
One cohesive UI
    ├── Driver Management API
    ├── Verification/Compliance API
    ├── Fleet API
    ├── Dispatch/Location API
    ├── Wallet/Billing API
    └── Incentives API
```

The UI composes capabilities; it does not determine domain ownership. Modules exchange identifiers,
decisions, and events rather than writing each other's tables. This supports future products cleanly:

- a marketplace seller can reuse onboarding, verification, wallet, billing, and incentives without a driver;
- a tutor can reuse identity, document verification, availability, reputation, billing, and notifications
  without vehicles or dispatch;
- a field-service worker can reuse profiles, compliance, location, scheduling, and wallet services with a
  different operational workflow.

The enduring abstraction is not `driver`. It is a set of bounded capabilities composed around a
transportation-specific driver experience.
