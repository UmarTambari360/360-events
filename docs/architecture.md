# Target System Architecture
## 360Events Ticketing Platform

**Document version:** 0.1.0  
**Status:** Proposed architecture  
**Architecture style:** Modular monolith  
**Initial market:** Nigeria  
**Primary currency:** NGN  
**Backend:** Node.js, Express.js, TypeScript  
**Frontend:** React, TypeScript, Vite  
**Database:** PostgreSQL  
**ORM:** Drizzle ORM  
**Package manager:** pnpm  
**Background processing:** Dedicated worker process  
**Cache and coordination:** Redis, where justified  

**Related document:** `docs/business-requirements-and-rules.md`

---

# 1. Purpose

This document defines the target technical architecture for the reengineered Event Ticketing Platform.

It describes:
- The system's major components.
- Responsibilities and boundaries of backend modules.
- Data ownership.
- Database and transaction strategy.
- Authentication and authorisation.
- Ticket inventory management.
- Order and payment processing.
- Refunds and organiser payouts.
- Background processing.
- Frontend architecture.
- Security and compliance considerations.
- Testing, deployment, and operational requirements.

The architecture must support the platform's business requirements without introducing unnecessary complexity.

The goal is not to build the largest possible system. It is to build a system whose critical operations remain correct when multiple customers act simultaneously, external services fail, requests are retried, and business policies change.

## 1.1 Architectural principles

The following principles guide the design.

1. **Correctness before optimisation.** Financial and inventory operations must be correct before performance enhancements are introduced.
2. **Clear module boundaries.** Each business domain must have an identifiable responsibility and owner.
3. **PostgreSQL as the source of truth.** Persistent business state must not depend on Redis, browser state, or unverified provider notifications.
4. **Explicit business lifecycles.** Events, orders, payments, refunds, and payouts must follow defined state transitions.
5. **Transactional consistency.** Operations that must succeed together should use appropriate database transactions.
6. **Safe external integration.** Payment-provider calls, email delivery, and other external operations must account for partial failure.
7. **Idempotency.** Retried operations must not duplicate purchases, charges, refunds, payouts, or tickets.
8. **Server-side security.** All important permissions and business rules must be enforced by the backend.
9. **Privacy by design.** Collect, expose, and retain only the personal data necessary for legitimate purposes.
10. **Incremental implementation.** Build and verify one business capability at a time.
11. **Observable failures.** Failed operations must be detectable, diagnosable, and recoverable.
12. **Avoid premature distributed systems.** Begin with a modular monolith and introduce separate services only when justified by operational needs.

---

# 2. High-Level Architecture

The platform consists of four primary architectural components:

1. React web application.
2. Express API.
3. PostgreSQL database.
4. Background worker process.

Redis and external providers support specific needs but do not replace the authoritative database.

## 2.1 Logical architecture

```text
                         CUSTOMERS
                             |
                         ORGANIZERS
                             |
                      ADMINISTRATORS
                             |
                             v
                  +---------------------+
                  |                     |
                  |  React + TypeScript |
                  |     Vite Web App    |
                  |                     |
                  +----------+----------+
                             |
                         HTTPS / API
                             |
                             v
                  +---------------------+
                  |                     |
                  |     Express API     |
                  |                     |
                  |  Authentication     |
                  |  Authorisation      |
                  |  Business Rules    |
                  |  Input Validation  |
                  |  API Responses     |
                  |                     |
                  +----------+----------+
                             |
                 +-----------+-----------+
                 |                       |
                 v                       v
       +-------------------+   +-------------------+
       |                   |   |                   |
       |    PostgreSQL     |   |      Redis        |
       |                   |   |                   |
       | Authoritative     |   | Cache, rate       |
       | business records  |   | limits, temporary |
       | and transactions  |   | coordination      |
       |                   |   |                   |
       +---------+---------+   +-------------------+
                 |
                 | Durable job/event records
                 v
       +-------------------+
       |                   |
       | Background Worker |
       |                   |
       | Webhooks           |
       | Notifications      |
       | Reconciliation     |
       | Expiry and cleanup |
       | Other async work   |
       |                   |
       +---------+---------+
                 |
       +---------+-------------------------+
       |                                   |
       v                                   v
+-------------------+             +-------------------+
| Payment Provider  |             | Email Provider    |
|                   |             |                   |
| Payments          |             | Transactional     |
| Refunds            |             | notifications     |
| Payouts, if       |             |                   |
| supported         |             |                   |
+-------------------+             +-------------------+
```

This is a logical representation. It does not require every component to run on a separate physical server.

For the initial release, the web application, API, worker, database, and Redis may be deployed on separate services or combined where appropriate for the selected hosting environment.

The important distinction is between their responsibilities, not their physical locations.

## 2.2 Component responsibilities

| Component | Responsibility |
|---|---|
| React web app | User interface, navigation, forms, dashboard presentation, and API interaction. |
| Express API | Authentication, authorisation, validation, business operations, and HTTP responses. |
| PostgreSQL | Authoritative records, business constraints, transactions, and durable financial history. |
| Drizzle ORM | Typed database queries, schema definitions, and migrations. |
| Redis | Optional caching, rate limiting, and temporary coordination. |
| Background worker | Durable asynchronous processing, retries, scheduled tasks, and reconciliation. |
| Payment provider | External payment processing and supported refund or payout operations. |
| Email provider | Delivery of verification, transactional, and operational emails. |

The frontend must not be trusted to enforce financial rules, inventory limits, role permissions, or other business invariants.

---

# 3. Repository and Workspace Structure

The project should use a pnpm workspace.

The proposed structure separates deployable applications from reusable packages and project documentation.

```text
360Events/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── server.ts
│   │   │   ├── config/
│   │   │   ├── middleware/
│   │   │   ├── modules/
│   │   │   ├── infrastructure/
│   │   │   ├── jobs/
│   │   │   ├── lib/
│   │   │   └── types/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── routes/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── lib/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── styles/
│   │   ├── public/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── worker/
│       ├── src/
│       │   ├── handlers/
│       │   ├── schedulers/
│       │   ├── infrastructure/
│       │   └── index.ts
│       ├── tests/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── validators/
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── types/
│   │   ├── src/
│   │   └── package.json
│   │
│   └── config/
│       ├── eslint/
│       ├── typescript/
│       └── package.json
│
├── docs/
│   ├── architecture.md
│   ├── business-requirements-and-rules.md
│   ├── implementation-plan.md
│   ├── api-contract.md
│   ├── database-design.md
│   ├── security-and-privacy.md
│   └── deployment.md
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
├── .gitignore
├── .env.example
└── README.md
```

This is the target structure, not a requirement to create every directory immediately.

Directories should be introduced when the corresponding implementation needs them.

## 3.1 Why use a pnpm workspace?

A workspace allows the frontend, API, worker, and shared packages to be maintained in one repository while preserving clear application boundaries.

Benefits include:
- One repository for coordinated changes.
- Shared validation schemas.
- Shared API contract types.
- Consistent TypeScript and linting configuration.
- Easier local development.
- Simpler integration testing.
- Reduced duplication between applications.

Each application should declare its own dependencies.

The project must use pnpm consistently rather than mixing package managers and lockfiles.

## 3.2 Shared packages

### `packages/validators`

Contains reusable Zod schemas for data contracts that genuinely need to be shared.

Examples include:
- Registration inputs.
- Login inputs.
- Event creation payloads.
- Ticket purchase requests.
- Common query parameters.
- Shared API input validation.

Server-only rules, such as verifying inventory availability or checking organiser ownership, must remain enforced in the backend even when the frontend shares a schema.

A shared schema does not make frontend validation a security boundary.

### `packages/types`

Contains shared public types and API contracts.

Examples include:
- Public event response types.
- Order summaries.
- Ticket representations.
- Pagination metadata.
- Common API error structures.
- Role and status types exposed through the API contract.

Avoid placing the entire database schema or internal server types in this package.

The frontend should depend on the public contract, not on private database implementation details.

### `packages/config`

Contains reusable development configuration, such as:
- TypeScript configuration.
- ESLint rules.
- Formatting conventions, if adopted.

Shared configuration should reduce duplication without creating unnecessary abstraction.

---

# 4. Backend Architecture

## 4.1 Architectural style

The backend should follow a modular monolith architecture.

A modular monolith is one application composed of clearly separated business modules that can be deployed together.

It provides stronger boundaries than an unstructured codebase without introducing the operational complexity of microservices.

The initial system should not split payments, events, orders, or users into independently deployed services.

These modules have tightly related business operations and benefit from sharing a transactional database.

## 4.2 Request lifecycle

An ordinary API request should follow this path:

```text
HTTP Request
     |
     v
Request ID / Logging
     |
     v
Security Middleware
     |
     v
Authentication, where required
     |
     v
Route Handler
     |
     v
Input Validation
     |
     v
Authorisation and Business Operation
     |
     v
Database Transaction, where required
     |
     v
Response Mapping
     |
     v
HTTP Response
```

The exact middleware order will depend on the operation, but validation, authentication, and authorisation must occur before protected business actions are performed.

Not every endpoint requires authentication. Public event discovery, for example, can be accessible without a session, while checkout requires an authenticated customer.

## 4.3 Module structure

Each major business domain should have its own module.

A typical module may contain:

```text
modules/
└── events/
    ├── event.routes.ts
    ├── event.controller.ts
    ├── event.service.ts
    ├── event.repository.ts
    ├── event.schema.ts
    ├── event.policy.ts
    └── event.test.ts
```

These files represent possible responsibilities, not mandatory files for every module.

### Routes

Define HTTP endpoints and connect them to middleware and handlers.

Routes should not contain substantial business logic.

### Controllers

Translate HTTP requests into application operations and format the appropriate responses.

Controllers should remain thin.

### Services

Implement business operations and coordinate domain rules.

Examples include:
- Creating an event draft.
- Submitting an event for review.
- Reserving inventory.
- Confirming an order.
- Initiating a refund.
- Calculating payout eligibility.

### Repositories

Encapsulate database access where doing so creates a useful boundary.

Avoid creating generic repository abstractions that merely duplicate Drizzle's API without adding meaningful value.

### Schemas

Validate request data and relevant data contracts.

### Policies

Represent complex authorisation or eligibility rules where a separate policy object makes them easier to test and maintain.

## 4.4 Dependency direction

Dependencies should generally point toward the business operation being performed, rather than allowing every module to call every other module arbitrarily.

For example:

```text
Routes
  |
  v
Controllers
  |
  v
Application / Domain Services
  |
  +------> Repositories
  |
  +------> External Provider Adapters
  |
  +------> Durable Job / Event Recording
```

Modules may cooperate through explicit service interfaces and well-defined operations.

Avoid circular dependencies.

A module must not directly modify another module's database tables without a deliberate ownership and transaction boundary.

---

# 5. Backend Business Modules

## 5.1 Identity and Access

**Responsibilities:**
- Registration and login.
- Email verification.
- Password recovery.
- Session or token management.
- Role assignment.
- Account status.
- Access-control policies.
- Account deletion workflows.

This module owns user identity and authentication-related records.

It must expose operations for other modules to identify the current user and enforce relevant permissions.

It must not allow a user to promote themselves by changing a request field.

## 5.2 Organizer Management

**Responsibilities:**
- Organizer applications.
- Identity-verification workflow.
- Administrative review.
- Organizer approval and rejection.
- Organizer restrictions and suspension.
- Organizer profile and business details.

This module owns organiser application and verification state.

Approval should trigger a controlled role or permission change through the identity and access system.

Sensitive verification information must have restricted access.

## 5.3 Event Management

**Responsibilities:**
- Event creation and editing.
- Categories.
- Event schedules and venues.
- Event submission.
- Administrative approval.
- Publication.
- Suspension and reinstatement.
- Rescheduling.
- Cancellation.
- Event lifecycle history.

This module owns event information and event lifecycle transitions.

It must ensure that events cannot be published without approval.

It must also coordinate with ticket inventory and order processing when events are suspended or cancelled.

## 5.4 Ticket Types and Inventory

**Responsibilities:**
- Ticket-type configuration.
- Ticket pricing and quantity limits.
- Inventory availability.
- Reservations.
- Reservation expiry.
- Inventory adjustments.
- Inventory reconciliation.

This module owns ticket inventory and reservation state.

Its critical operations must be safe under concurrent requests.

Other modules should use explicit inventory operations rather than independently calculating or changing available quantities.

## 5.5 Orders

**Responsibilities:**
- Checkout initiation.
- Order creation.
- Order items.
- Pricing snapshots.
- Order status transitions.
- Order history.
- Purchase limits.
- Idempotency.
- Order cancellation.

This module owns the order lifecycle.

It coordinates with inventory and payments without assuming that either operation has succeeded until the relevant outcome has been established.

## 5.6 Payments

**Responsibilities:**
- Payment attempts.
- Payment-provider integration.
- Payment initialisation.
- Payment verification.
- Provider webhook processing.
- Transaction references.
- Payment status transitions.
- Reconciliation.

This module owns payment-attempt records and payment-related state.

Provider-specific logic should be isolated behind an adapter so that business rules are not tightly coupled to one provider's API.

## 5.7 Tickets and Attendance

**Responsibilities:**
- Ticket issuance.
- Ticket identifiers.
- QR-code credentials.
- Ticket validity.
- Ticket revocation.
- Attendee records.
- Check-in.

This module owns ticket and check-in records.

It must not issue tickets independently of confirmed order eligibility.

## 5.8 Refunds

**Responsibilities:**
- Refund eligibility.
- Refund calculation.
- Refund approval where required.
- Refund requests.
- Provider refund operations.
- Refund state transitions.
- Ticket revocation.
- Refund reconciliation.

This module must preserve the original payment record and record refunds as separate financial operations.

It must distinguish the platform's refund decision from the payment provider's actual result.

## 5.9 Settlements and Payouts

**Responsibilities:**
- Settlement-policy configuration.
- Organiser payable calculations.
- Payout eligibility.
- Financial holds.
- Payout requests or scheduling.
- Payout execution.
- Payout status.
- Payout reconciliation.

This module owns payout records and the process used to determine whether funds may be released.

It must not treat sales totals as equivalent to available funds.

Payout eligibility must account for refunds, event status, settlement timing, risk restrictions, and the selected payment-provider arrangement.

## 5.10 Financial Ledger

**Responsibilities:**
- Recording financial effects.
- Tracking platform revenue and organiser liabilities.
- Recording refund and payout effects.
- Recording reversals and adjustments.
- Supporting reconciliation.
- Preserving financial history.

The ledger must provide enough information to reconstruct the financial effect of relevant operations.

Its design should be reviewed with appropriate accounting expertise before production use.

## 5.11 Notifications

**Responsibilities:**
- Transactional email.
- Account notifications.
- Event-change notifications.
- Payment and refund notifications.
- Payout notifications.
- Delivery status and retries.

Notification delivery must not control whether a payment, refund, or payout is considered financially successful.

A notification failure should not reverse a valid business operation.

## 5.12 Administration and Audit

**Responsibilities:**
- Administrative queries and actions.
- Event and organiser review.
- Fee configuration.
- Settlement-policy configuration.
- Complaint management.
- Audit-log access.
- Operational reports.

Administrative functionality should use the same domain operations as the rest of the application wherever possible.

An administrator must not bypass financial invariants merely because the action originates from the admin dashboard.

---

# 6. Data Architecture

## 6.1 Database selection

PostgreSQL is the authoritative database.

It is suitable for the platform because the business requires:
- Relational data integrity.
- Transactional updates.
- Foreign-key constraints.
- Unique constraints.
- Atomic inventory operations.
- Reliable financial records.
- Complex reporting queries.
- Consistent order and payment relationships.

Drizzle ORM will be used for typed database access and schema management.

Database constraints must complement application validation. Important invariants should not depend exclusively on a service remembering to perform a check.

## 6.2 Logical data domains

The database should be organised conceptually into the following domains.

| Domain | Representative entities |
|---|---|
| Identity | Users, sessions or refresh tokens, verification records |
| Organizer management | Organizer profiles, applications, verification cases |
| Events | Events, categories, event lifecycle history |
| Ticket configuration | Ticket types, pricing configuration |
| Inventory | Inventory records, reservations |
| Orders | Orders, order items, idempotency records |
| Payments | Payment attempts, provider events, transactions |
| Tickets | Tickets, attendees, check-ins |
| Refunds | Refund requests, refund transactions |
| Finance | Ledger entries, organizer payable records |
| Payouts | Payouts, payout attempts |
| Notifications | Notification records, delivery attempts |
| Audit | Administrative audit events |
| Infrastructure | Durable jobs, outbox records, reconciliation records |

These are logical groupings, not a requirement to create one PostgreSQL schema per domain.

The initial implementation can use one database and a consistent naming convention.

## 6.3 Data ownership

Each domain should have clear ownership of its records.

Examples:
- Identity owns user authentication and account status.
- Event management owns event status and event details.
- Inventory owns reservations and authoritative ticket availability.
- Orders owns order items and order-level pricing snapshots.
- Payments owns payment attempts and verification state.
- Refunds owns refund requests and refund execution state.
- Settlements and payouts owns payout eligibility and payout records.
- The financial ledger records financial effects.

When one module needs another module's information, it should use an explicit interface or a deliberate query boundary.

Cross-module database transactions are acceptable when necessary for correctness, but they must be designed intentionally rather than emerging from unrestricted table access.

## 6.4 Data integrity

Use:
- Primary keys.
- Foreign keys.
- Unique constraints.
- Check constraints where appropriate.
- Appropriate indexes.
- Transactions.
- Atomic conditional updates.
- Explicit state-transition validation.

Examples of important constraints include:
- Unique user email under the chosen normalisation policy.
- Unique payment-provider reference where required.
- Unique ticket credential.
- Unique provider event identifier for webhook deduplication.
- Unique idempotency key within its appropriate scope.
- Valid non-negative inventory values.
- Valid monetary amounts.
- Preventing duplicate ticket issuance for the same order item or entitlement.

The exact constraints depend on the final schema.

## 6.5 Money representation

Money must be represented using integer minor units, such as kobo, wherever applicable.

For example:

```text
₦10,500.00 = 1,050,000 kobo
```

The application must not use binary floating-point arithmetic for authoritative financial calculations.

Pricing rules must define:
- The unit of each amount.
- Rounding behaviour.
- Fee calculation.
- Currency.
- The relationship between ticket subtotal, platform fee, and total payable.

Database column types and API representations must follow the same conventions.

## 6.6 Pricing snapshots

An order must retain the price and platform-fee configuration used when it was created.

At minimum, the pricing record must make it possible to reconstruct:
- Ticket quantities.
- Unit prices.
- Ticket subtotal.
- Platform fee.
- Total payable.
- Currency.
- Relevant fee configuration or version.
- Applicable rounding rules.

Current ticket prices or platform settings must not overwrite historical order pricing.

## 6.7 Migrations

Database changes must be managed through version-controlled Drizzle migrations.

Requirements:
- Migrations must be reproducible.
- Schema changes must be reviewed.
- Production migrations must not depend on manually editing the database.
- Destructive changes must be planned carefully.
- Large data migrations must account for locking and downtime.
- Migration failures must have a documented recovery strategy.

Application code and database migrations must be deployed in a compatible order.

---

# 7. Inventory and Reservation Architecture

Inventory is one of the most important correctness boundaries in the system.

## 7.1 Authoritative inventory

PostgreSQL must determine whether ticket inventory can be allocated.

Redis may accelerate availability displays or coordinate temporary work, but it must not be the only authority for whether a purchase is valid.

The displayed number of available tickets may become stale. The backend must revalidate availability during checkout.

## 7.2 Recommended inventory model

The database design should distinguish:
- Configured inventory capacity.
- Confirmed ticket allocations.
- Active reservations.
- Released or expired reservations.
- Adjustments and other permitted inventory changes.

Available inventory can be calculated from the authoritative state or maintained through carefully controlled transactional updates.

The selected approach must avoid double-counting confirmed orders and reservations.

## 7.3 Reservation transaction

A reservation should be created through an atomic operation.

Conceptually:

```text
BEGIN TRANSACTION

1. Validate event and ticket-type eligibility.
2. Validate requested quantities.
3. Atomically claim the available inventory.
4. Create the reservation.
5. Create the order and order items.
6. Record the reservation expiry.
7. Commit.

COMMIT
```

The actual implementation may use conditional updates, row-level locking, or another suitable PostgreSQL concurrency mechanism.

The transaction must fail if the requested inventory is unavailable.

The system must not create an active order reservation when the inventory allocation has failed.

## 7.4 Reservation expiry

Reservations expire after an administrator-configured duration (DEC-016):
- **Base Duration:** Initial checkout reservations expire after **10 minutes** if payment is not initiated.
- **Payment Grace Extension:** When a customer proceeds to checkout and initiates a transaction with the payment gateway, the reservation receives a **5-minute grace extension** to accommodate banking OTP/3D-Secure authentication without premature expiry.
- **Safe Inventory Release:** A background worker runs periodically to expire timed-out reservations, safely returning reserved tickets to the public inventory pool exactly once via atomic PostgreSQL updates.

## 7.5 Payment timing and late-payment recovery

Payment initiation involves external provider requests and cannot be assumed to succeed immediately.

The architecture enforces explicit recovery protocols for delayed payments (DEC-022):
- **Inventory Still Available:** If a customer's payment succeeds after the reservation expired, and inventory for that ticket tier is still available, the system automatically reclaims the tickets, marks the order as `confirmed`, and issues the tickets.
- **Inventory Sold Out:** If tickets sold out before the late payment confirmed, the system marks the order as `unfulfillable_late_payment` and automatically executes an immediate **100% full refund** (Ticket Face Value + Platform Fee) via the provider API.
- **Payment during Event Cancellation or Suspension:**
  - If payment confirms on a *cancelled* event, the customer receives an automatic immediate **100% full refund**.
  - If payment confirms on a *suspended* event, existing orders in progress are honoured and tickets issued, while new checkouts remain blocked.

---

# 8. Order and Payment Architecture

## 8.1 Separate order, payment, and refund state

Order state, payment attempt state, and refund outcomes are decoupled into discrete entities (ADR-011, C-09):

- **Order Entity (Fulfillment Lifecycle):** Tracks the customer's purchase intent and ticket validity (`pending` $\rightarrow$ `confirmed` $\rightarrow$ `completed`, with terminal failure states `cancelled` or `expired`). An order derives an aggregate `refund_status: none | partial | full` and `refunded_amount_kobo`.
- **Payment Attempt Entity (Transaction Lifecycle):** Tracks discrete collection attempts with the gateway (`pending` $\rightarrow$ `processing` $\rightarrow$ `successful`, or `failed` / `abandoned` / `pending_verification`). One order may have multiple payment attempts if an earlier attempt is declined before the reservation window lapses.
- **Refund Entity:** Separate immutable records documenting refund requests, approvals, provider transaction references, and completion status.

## 8.2 Quote preview and price locks

To satisfy consumer protection requirements and prevent race-condition pricing surprises (C-12):
1. The frontend fetches a quote breakdown via `POST /api/v1/orders/quote` returning `{ subtotalKobo, feeKobo, totalKobo }`.
2. When submitting `POST /api/v1/orders`, the frontend includes the `expectedTotalKobo` shown to the user.
3. If server-side recalculation differs from `expectedTotalKobo` (e.g., fee configuration updated while customer was on the page), the order is rejected with `409 PRICE_CHANGED`, requiring explicit customer re-approval.

## 8.3 Payment initiation flow

A typical paid checkout flow is:

```text
Customer
   |
   v
React Checkout (Fetches Quote /api/v1/orders/quote)
   |
   v
Express API (POST /api/v1/orders with expectedTotalKobo)
   |
   v
Validate Customer Email Verification, Event Status, and Purchase Limits
   |
   v
Atomically Reserve Inventory and Create Order (10 min hold)
   |
   v
Create Payment Attempt & Extend Reservation (+5 min grace)
   |
   v
Initiate Payment with Provider (Direct Platform Collection)
   |
   v
Return Payment URL / Instructions
   |
   v
Customer Completes Payment on Gateway
   |
   v
Provider Webhook Ingestion (/api/v1/webhooks/paystack)
   |
   v
Durable Webhook Dedup & Transactional Outbox Processing
   |
   v
Verify Provider Signature, Amount, and Order Match
   |
   v
Atomic Confirmation Transaction:
   - Mark Payment Attempt 'successful'
   - Mark Order 'confirmed'
   - Issue Tickets with Signed Credentials
   - Post Double-Entry Ledger Entries (Debit Clearing, Credit Fee, Credit Payable)
   |
   v
Async Worker Delivers Ticket Email with QR Code
```

The flow guarantees that external network delays never compromise database consistency.

## 8.3 External calls and database transactions

A database transaction must not remain open while waiting unnecessarily for a payment-provider network call.

Instead:
1. Persist the relevant local intent.
2. Commit the database transaction.
3. Perform the external operation.
4. Record the result.
5. Reconcile any uncertain outcome.

If the provider request times out, the platform must treat the result as uncertain until it can verify the transaction.

It must not automatically create a second charge merely because the first request did not return a response.

## 8.4 Payment verification

Before treating a payment as successful, the backend must validate the trusted provider result against the expected order and payment attempt.

Checks should include:
- Reference.
- Amount.
- Currency.
- Transaction association.
- Expected state.
- Provider identity and verification result.
- Whether the payment has already been applied.

The frontend's success redirect is not proof of payment.

## 8.5 Idempotent payment handling

Payment processing must tolerate:
- Duplicate webhook deliveries.
- Repeated verification requests.
- Concurrent verification requests.
- Worker retries.
- Provider timeouts.
- Application restarts.

A payment must produce its business effects only once.

Use durable uniqueness constraints and transactional state transitions to protect against concurrent processing.

An application-level check such as `if (alreadyProcessed) return` is insufficient on its own if two requests can pass the check simultaneously.

---

# 9. Durable Background Processing

## 9.1 Why a worker is needed

Some operations should not block an ordinary HTTP request or depend on the customer remaining connected.

Examples include:
- Sending email.
- Processing persisted webhook events.
- Expiring reservations.
- Issuing tickets after confirmed payment.
- Processing refunds.
- Processing payouts.
- Reconciling provider transactions.
- Sending reminders.
- Generating exports.

These operations should run through a durable background-processing mechanism.

## 9.2 Recommended initial approach

Start with PostgreSQL-backed durable job and event records.

This reduces infrastructure requirements and provides a clear way to coordinate database changes with asynchronous work.

Redis may be used by a chosen job library if useful, but any business-critical event that must survive process failure must have a durable source of truth.

## 9.3 Transactional outbox

Use the transactional outbox pattern for business operations that must reliably trigger background work.

For example, when a payment is confirmed:

```text
BEGIN TRANSACTION

1. Record verified payment outcome.
2. Apply the valid payment state transition.
3. Record the financial effect.
4. Record an outbox event for order confirmation
   or ticket issuance.

COMMIT
```

A worker subsequently reads the outbox event and processes it.

The outbox record and the business-state change are committed together, preventing the common failure where a database update succeeds but the application crashes before scheduling the corresponding job.

## 9.4 Job processing requirements

Workers must support:
- Safe retries.
- Idempotent handlers.
- Failure logging.
- Retry limits.
- Dead-letter or failed-job handling.
- Operational inspection.
- Recovery of interrupted work.

An outbox or job record must not be marked complete before the relevant operation has reached the required success point.

## 9.5 At-least-once delivery

Background jobs and webhook processing should be designed on the assumption that an event may be delivered more than once.

Exactly-once execution across independent systems cannot generally be guaranteed simply by using a queue.

The practical objective is to achieve effectively-once business outcomes through idempotency, durable records, uniqueness constraints, and reconciliation.

---

# 10. Webhook Architecture

Payment-provider webhooks require special handling because they influence financial state.

## 10.1 Recommended flow

```text
Payment Provider
       |
       v
Webhook Endpoint
       |
       v
Validate Signature
       |
       v
Validate Basic Event Structure
       |
       v
Persist Event Durably
       |
       v
Acknowledge Accepted Event
       |
       v
Background Worker
       |
       v
Deduplicate and Verify
       |
       v
Apply Valid State Transition
       |
       v
Record Financial Effects
       |
       v
Schedule Subsequent Work
```

The webhook endpoint should remain lightweight.

It should validate the request and safely persist the event before acknowledging acceptance, following the provider's documented requirements.

## 10.2 Webhook deduplication

The system should retain:
- Provider event identifier, where available.
- Event type.
- Relevant transaction reference.
- Receipt time.
- Processing status.
- Attempt count.
- Last error.
- Processing completion time.

Unique constraints should prevent the same provider event from being applied repeatedly.

Different webhook events may refer to the same transaction, so provider-event deduplication must be combined with transaction-level idempotency.

## 10.3 Recovery

The platform must support:
- Retrying transient processing failures.
- Inspecting permanently failed events.
- Reprocessing events safely.
- Verifying transaction state independently.
- Reconciling provider transactions where notifications are missing.

An invalid signature must not be treated as a trusted payment notification.

---

# 11. Refund and Financial Architecture

## 11.1 Refund workflow

A refund involves both local business state and an external financial operation.

The workflow should:
1. Identify the relevant order and payment.
2. Validate refund eligibility.
3. Calculate the permitted refund amount.
4. Create a durable refund record.
5. Authorise the refund if required.
6. Initiate the provider refund.
7. Record the provider result.
8. Apply the appropriate financial and order-state changes.
9. Revoke tickets when required.
10. Notify the customer.
11. Reconcile uncertain outcomes.

The precise sequence of these steps must be defined so that the platform does not lose track of an external refund when the application fails.

## 11.2 Refund idempotency

Each refund operation must have a durable identity.

The system must prevent:
- Duplicate refund requests being processed as separate financial operations accidentally.
- Retrying a provider call in a way that creates a second refund.
- Recording a refund as complete before confirmation.
- Refunding more than the permitted amount across concurrent requests.

Where the provider supports idempotency keys, use them according to its documented semantics.

Where it does not, the integration must use durable attempt records and transaction verification to manage uncertain outcomes safely.

## 11.3 Financial ledger

Financial state must be auditable.

The architecture should maintain financial entries that allow the platform to explain the relationship between:
- Customer payments.
- Ticket sales.
- Platform revenue.
- Organiser liabilities.
- Refunds.
- Provider charges.
- Payouts.
- Adjustments.

The exact accounting model must be defined with appropriate financial expertise.

A ledger entry should not be silently overwritten to make a discrepancy disappear. Corrections should be represented through explicit adjustments or reversals.

## 11.4 Refunds and ticket revocation

Refunds and ticket validity must remain consistent.

Where a successful refund requires ticket revocation, the relevant database state changes should be applied transactionally when possible.

If the provider confirms a refund but the local application fails before updating ticket status, reconciliation must identify and repair the discrepancy.

---

# 12. Settlement and Payout Architecture

## 12.1 Payout eligibility

Payout eligibility must be calculated from authoritative financial and business records.

It must not be calculated solely by subtracting the platform fee from a dashboard sales total.

Relevant inputs include:
- Verified customer payments.
- Ticket subtotal and platform-fee records.
- Refunds.
- Pending financial obligations.
- Event status.
- Configured settlement timing.
- Risk holds.
- Provider settlement status.
- Other approved adjustments.

The calculation must be documented and testable.

## 12.2 Settlement-policy configuration

Administrators configure settlement rules dynamically through system settings (DEC-007, DEC-009):
- **Settlement Milestone (DEC-007):** Payouts are not locked strictly until post-event. Administrators can configure eligibility relative to the event date—specifically **X days before the event start date** (default: 2–5 days prior) to provide organizers with operational liquidity for event execution in the Nigerian market. Alternatively, post-event timing (1–3 days post-event) can be assigned to high-risk events.
- **Pre-Event Reserve Policy (DEC-009):** To balance organizer liquidity with platform refund guarantees, the settlement policy supports a configurable pre-event disbursement cap. Recommended default: up to **70%–80%** released pre-event, with a **20%–30% reserve** retained until 24–48 hours post-event.
- **Minimum Payout:** Configurable threshold (default ₦2,000).
- **Administrative Risk Holds:** Ability to freeze payable balances on specific organizers or events under investigation.

## 12.3 Payout workflow and approval (DEC-008)

In the MVP, payouts are **not fully automated**:

```text
Verified Ticket Sales
      |
      v
Calculate Organizer Payable (Double-Entry Ledger)
      |
      v
Evaluate Settlement Eligibility (Days-Before Milestone Reached)
      |
      v
Apply Pre-Event Disbursement Cap (e.g. 70-80%) & Hold Reserve
      |
      v
Generate Payout Request in 'eligible' Status
      |
      v
Mandatory Admin Review & Explicit Approval (/api/v1/admin/payouts/:id/approve)
      |
      v
Background Job Executes Transfer via Provider API (Paystack Transfers to NUBAN)
      |
      v
Provider Webhook Confirms Success / Failure
      |
      v
Post Ledger Completion & Reconcile Financial Records
```

The system prevents concurrent double-allocations and ensures all payouts are auditable.

## 12.4 Uncertain payout outcomes

If a payout request times out, the platform must not immediately submit a new transfer without checking whether the original request succeeded.

The payout enters `processing` or `pending_verification` until provider webhooks or verification queries establish the final transfer state.

Provider idempotency keys are mandatory for all transfer requests.

## 12.5 Financial separation of responsibilities

Payouts require dual controls: system-computed eligibility, explicit administrative approval, and decoupled asynchronous transfer execution via durable background workers.

---

# 13. Event Cancellation and Suspension Architecture

Event suspension and cancellation have fundamentally different consequences and must remain distinct in the data model.

## 13.1 Suspension (DEC-013, DEC-014)

Suspension temporarily pauses sales while an event is under investigation or schedule adjustment:
- **Initiator:** Strictly administrator-initiated (`POST /api/v1/admin/events/:id/suspend`). An organiser must request suspension via support.
- **Mandatory Reason:** A clear, auditable reason is recorded on every suspension.
- **Immediate Controls:** Ticket reservations and new checkouts are immediately blocked. The discovery catalog reflects the suspended state. Orders in active payment progress are honoured; new checkouts are rejected.
- **Reinstatement:** Only an administrator can reinstate a suspended event (`POST /api/v1/admin/events/:id/reinstate`).
- **Prolonged Suspension SLA (DEC-014):** If an event remains suspended for more than **14 calendar days**, or remains suspended within **48 hours of its scheduled start time**, an operational alert triggers requiring administrators to either formally reinstate the event or force-cancel it and issue full refunds.

## 13.2 Cancellation and authority (DEC-021)

Cancellation is a terminal, irreversible outcome triggering mass customer refunds:
- **Zero Sales:** If an event has sold **0 tickets**, the organiser may cancel or archive it directly (`POST /api/v1/organizer/events/:id/cancel`).
- **Tickets Already Sold:** If tickets have already been sold, the organiser **cannot unilaterally cancel**. The organiser must submit a cancellation request (`POST /api/v1/organizer/events/:id/cancellation-request`).
- **Administrative Approval:** An administrator must review and approve the cancellation (`POST /api/v1/admin/events/:id/cancellations/:reqId/approve`), which then initiates background ticket revocation and customer refund workflows. Administrators also possess emergency direct cancellation capability (`POST /api/v1/admin/events/:id/cancel`).

## 13.3 Coordination

Event cancellation touches several modules.

The event module should not independently rewrite payment, refund, ticket, and payout tables.

Instead, cancellation should produce a durable business event or invoke an explicit application operation that coordinates the required actions.

For example:

```text
Event Cancelled
      |
      +----> Block New Sales
      |
      +----> Identify Affected Orders
      |
      +----> Determine Refund Eligibility
      |
      +----> Schedule Refund Operations
      |
      +----> Revoke Tickets When Appropriate
      |
      +----> Recalculate Payout Eligibility
      |
      +----> Notify Affected Customers
      |
      +----> Record Audit History
```

These downstream operations may take time to complete.

The system must track progress and failures rather than assuming all work completed when the event status changed.

---

# 14. API Architecture

## 14.1 API style

The initial backend should expose a versioned REST API.

A version prefix such as `/api/v1` should be used to provide a clear contract for the frontend.

The API should use:
- Appropriate HTTP methods.
- Consistent resource naming.
- Consistent response formats.
- Standard HTTP status codes.
- Validated request bodies and query parameters.
- Explicit authentication and authorisation.
- Pagination for collection endpoints.
- Structured error responses.

## 14.2 Confirmed API endpoints (C-18)

Confirmed endpoints across system domains:

### Authentication and account privacy

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
POST   /api/v1/auth/me/delete-request
```

### Organizer applications

```text
POST   /api/v1/organizer-applications
GET    /api/v1/organizer-applications/me
GET    /api/v1/admin/organizer-applications
POST   /api/v1/admin/organizer-applications/:id/approve
POST   /api/v1/admin/organizer-applications/:id/reject
```

### Events and ticket types

```text
GET    /api/v1/events
GET    /api/v1/events/:id
POST   /api/v1/organizer/events
PATCH  /api/v1/organizer/events/:id
POST   /api/v1/organizer/events/:id/submit
POST   /api/v1/organizer/events/:id/publish
POST   /api/v1/organizer/events/:id/ticket-types
PATCH  /api/v1/organizer/ticket-types/:id
POST   /api/v1/organizer/events/:id/reschedule-request
POST   /api/v1/admin/events/:id/reschedule/:reqId/approve
POST   /api/v1/organizer/events/:id/cancellation-request
POST   /api/v1/admin/events/:id/cancellations/:reqId/approve
POST   /api/v1/admin/events/:id/approve
POST   /api/v1/admin/events/:id/reject
POST   /api/v1/admin/events/:id/suspend
POST   /api/v1/admin/events/:id/reinstate
POST   /api/v1/admin/events/:id/cancel
POST   /api/v1/organizer/events/:id/cancel
```

### Orders and checkout

```text
POST   /api/v1/orders/quote
POST   /api/v1/orders
GET    /api/v1/orders/me
GET    /api/v1/orders/:id
POST   /api/v1/orders/:id/cancel
```

### Payments

```text
POST   /api/v1/orders/:id/payment-attempts
GET    /api/v1/orders/:id/payment-status
POST   /api/v1/webhooks/paystack
```

### Tickets and check-in

```text
GET    /api/v1/tickets/me
GET    /api/v1/tickets/:id
POST   /api/v1/organizer/events/:id/checkin-keys
POST   /api/v1/checkin/scan
```

### Refunds, settlements, and payouts

```text
POST   /api/v1/orders/:id/refund-requests
GET    /api/v1/refunds/me
GET    /api/v1/organizer/payouts/eligible-balance
GET    /api/v1/organizer/payouts
GET    /api/v1/admin/payouts
POST   /api/v1/admin/payouts/:id/approve
```

### Support and complaints

```text
POST   /api/v1/support/complaints
GET    /api/v1/admin/complaints
PATCH  /api/v1/admin/complaints/:id
```

These endpoints are illustrative, not a final API specification.

The final API must define request schemas, response shapes, permissions, state transitions, error cases, and idempotency requirements.

## 14.3 API error format

Errors should follow a consistent structure.

For example:

```json
{
  "error": {
    "code": "INSUFFICIENT_INVENTORY",
    "message": "The requested ticket quantity is no longer available.",
    "requestId": "request-id"
  }
}
```

The example illustrates the response shape only.

Error messages must not expose sensitive internal details.

## 14.4 Pagination

Collection endpoints should use consistent pagination.

Responses should provide enough information for the frontend to display:
- Items.
- Current page or cursor.
- Page size.
- Total count where appropriate and affordable to calculate.
- Whether additional results exist.

Pagination metadata must be derived from the actual query and must not use placeholder totals.

---

# 15. Frontend Architecture

## 15.1 Technology direction

The frontend will use:
- React.
- TypeScript.
- Vite.
- React Router.
- TanStack Query for server-state management.
- React Hook Form.
- Zod.
- Tailwind CSS.
- shadcn/ui where appropriate.
- A shared, typed API client.

This stack is a proposed baseline and can be adjusted if a clear technical reason emerges.

## 15.2 Frontend responsibilities

The frontend is responsible for:
- Displaying events.
- Managing navigation.
- Rendering dashboards.
- Collecting and validating user input.
- Communicating with the API.
- Displaying loading, success, and error states.
- Presenting payment and refund status.
- Displaying valid tickets and QR codes.
- Providing a usable experience on mobile and desktop.

The frontend must not:
- Decide whether a payment is valid.
- Independently calculate authoritative organiser balances.
- Determine whether inventory can be allocated.
- Grant organiser or administrator privileges.
- Bypass event approval.
- Treat a successful redirect as proof of payment.

## 15.3 Feature-oriented structure

Organise the frontend around business features.

For example:

```text
src/
├── app/
│   ├── router.tsx
│   ├── providers.tsx
│   └── layouts/
│
├── routes/
│   ├── public/
│   ├── customer/
│   ├── organizer/
│   └── admin/
│
├── features/
│   ├── auth/
│   ├── events/
│   ├── organizer-applications/
│   ├── checkout/
│   ├── orders/
│   ├── tickets/
│   ├── refunds/
│   ├── payouts/
│   └── admin/
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
│
├── lib/
│   ├── api-client.ts
│   ├── errors.ts
│   └── formatters.ts
│
├── hooks/
├── stores/
└── styles/
```

Avoid building one enormous component or placing all API calls and business behaviour in a single global file.

## 15.4 Server state and local state

Use TanStack Query for data retrieved from the API, including:
- Events.
- Orders.
- Tickets.
- Dashboard summaries.
- Refund statuses.
- Payout records.

Use local React state or a small state-management library for transient UI state when needed.

Do not duplicate the entire backend database state in a global client store.

Cached data may become stale. Critical operations must always be validated by the server.

## 15.5 Authentication and route guards

The frontend should provide appropriate route guards for user experience.

For example, unauthenticated users should be redirected away from customer dashboards, and users without organiser permissions should not see organiser tools.

These guards do not replace backend authorisation.

Every protected API operation must independently validate the current user's identity and permissions.

## 15.6 API client

The frontend should use a central API client that handles:
- Base URL configuration.
- Credentials or authentication headers.
- Request and response types.
- Error parsing.
- Request identifiers where useful.
- Consistent handling of authentication failures.
- Safe retry behaviour for appropriate requests.

The client must not automatically retry non-idempotent financial operations without an idempotency strategy.

---

# 16. Authentication and Session Security

The final authentication design must be selected before implementing the full identity module.

The options should be evaluated against the chosen deployment topology and frontend requirements.

## 16.1 Confirmed browser session model (ADR-018, ADR-019)

The platform implements **server-side sessions** backed by PostgreSQL:
- **Cookie Attributes:** Session tokens are delivered in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie named `__Host-session` (or domain-scoped `__session`).
- **Database Storage:** Raw session tokens are never stored in plaintext. The database stores `SHA-256(token)`, user ID, creation IP, user-agent, and expiration timestamp.
- **Topology Alignment (ADR-019):** Web and API run under the same registrable domain (e.g., `app.360events.ng` and `api.360events.ng` sharing cookie domain `.360events.ng`), ensuring cookies are natively same-site without third-party cookie blocking.
- **Revocation:** Logging out, changing passwords, or administrator suspension immediately deletes or invalidates the database session row, terminating access instantly across all devices.
- Bearer tokens in `localStorage` are strictly prohibited to prevent XSS credential theft.

## 16.2 Authentication and MFA requirements

The implementation enforces:
- Passwords hashed using Argon2id or bcrypt with appropriate cost factors.
- Email verification required before ticket checkout can be completed (DEC-023).
- Expiring, single-use tokens for password recovery and email verification.
- Rate limiting on sensitive endpoints (login, forgot-password, checkout) using PostgreSQL counters.
- **Mandatory TOTP MFA (C-14):** Administrators must configure TOTP MFA (Authenticator App) for elevated privileges (payout approval, event suspension, fee changes).

---

# 17. Security and Privacy Architecture

## 17.1 Security boundaries

The system has several trust boundaries:
- Browser to API.
- API to database.
- API and worker to payment provider.
- API and worker to email provider.
- Administrator interfaces to sensitive operations.
- Organiser interfaces to customer and financial information.

Each boundary must be evaluated for authentication, authorisation, data validation, and failure behaviour.

## 17.2 Secrets management

Production secrets must not be committed to source control.

Secrets include:
- Database credentials.
- Authentication secrets.
- Payment-provider secret keys.
- Webhook verification secrets.
- Email-provider credentials.
- Encryption keys.
- Other service credentials.

Use environment variables or an appropriate secret-management system.

The application must validate required environment configuration at startup and fail clearly when mandatory configuration is missing.

Do not log secret values.

## 17.3 Personal information

Access to customer and organiser information must follow the principle of least privilege.

Examples:
- Organisers should receive only the attendee information necessary for their events.
- Identity documents should not be publicly accessible.
- QR codes should not expose unnecessary personal details.
- Logs should avoid passwords, tokens, and excessive personal information.
- Admin access to sensitive records should be restricted and auditable.

## 17.4 Privacy and retention

The architecture must support:
- Data minimisation.
- Purpose-limited processing.
- Documented retention periods.
- Account deletion and eligible data erasure.
- Legal retention exceptions.
- Restricted access to retained information.
- Secure handling of data exports.
- Applicable data-subject requests.
- Personal-data breach investigation and response.

Before production, the platform owner must assess the applicable Nigerian data-protection obligations and implement the required operational controls.

## 17.5 File uploads and object storage (ADR-022)

Uploads are partitioned into two strict security tiers:
- **Public Media Area:** Event cover banners and promotional images stored in a public S3 bucket, served over CDN with content-type validation and image resizing.
- **Private KYC Storage:** Organizer identity verification documents (e.g. CAC filings, ID scans) stored in an encrypted private S3 bucket. Access is restricted exclusively to authorized administrators via short-lived presigned URLs (15-minute expiry). Identity documents are never accessible to public internet traffic.

---

# 18. Redis Usage Policy (ADR-020)

**Confirmed Architectural Baseline: Redis is omitted from the initial MVP.**

Rationale and operational policy:
- PostgreSQL natively satisfies all transactional requirements for the MVP, including ACID transactions, atomic inventory reservations (`SELECT ... FOR UPDATE`), server session lookups, and transactional outbox job queuing (`FOR UPDATE SKIP LOCKED`).
- Eliminating Redis from the initial MVP removes unnecessary infrastructure complexity, hosting costs, and network failure modes without sacrificing correctness or performance at expected launch volumes.
- Rate limiting is handled in-process with database-backed counters for security-sensitive authentication endpoints.
- If high-throughput public event catalog caching or multi-instance clustering metrics justify it in the future, Redis can be introduced purely as an ephemeral cache (never authoritative for inventory or financial balances).

---

# 19. Testing Architecture

Testing is part of the implementation, not a final optional stage.

## 19.1 Unit tests

Test isolated business logic such as:
- Fee calculations.
- Refund calculations.
- State-transition rules.
- Payout eligibility.
- Input validation.
- Authorisation policies.
- Inventory calculations.

Unit tests should not require real payment-provider calls.

## 19.2 Integration tests

Test the interaction between application services and infrastructure.

Examples include:
- Database transactions.
- Unique constraints.
- Inventory reservation.
- Order creation.
- Payment-state updates.
- Webhook deduplication.
- Refund persistence.
- Payout record creation.
- Account ownership checks.

Use a test database that behaves sufficiently like the production database.

Mocks alone are insufficient for validating PostgreSQL concurrency and constraint behaviour.

## 19.3 Concurrency tests

The system must explicitly test simultaneous operations.

Examples:
- Multiple customers attempting to buy the last ticket.
- Two payment notifications processing the same transaction.
- Two workers attempting to issue the same ticket.
- Concurrent refund requests against the same payment.
- Two payout requests attempting to allocate the same payable balance.
- Simultaneous check-ins for the same ticket.

The expected outcome must be defined before writing the test.

## 19.4 Failure-path tests

Test failures such as:
- Payment-provider timeout.
- Webhook delivery more than once.
- Worker crash after an external operation.
- Database failure during a business operation.
- Email-provider outage.
- Expired inventory reservation.
- Payment success after an uncertain checkout outcome.
- Refund success at the provider followed by local persistence failure.
- Payout timeout with an uncertain provider result.

The system should preserve enough state to recover safely.

## 19.5 End-to-end tests

Important end-to-end flows include:

**Customer purchase**
1. Register and verify an account.
2. Discover an approved event.
3. Select tickets.
4. Complete checkout.
5. Verify payment.
6. Receive tickets.
7. View the order in the customer dashboard.

**Organizer onboarding**
1. Submit an organiser application.
2. Complete the required verification steps.
3. Receive administrative approval.
4. Access organiser functionality.
5. Create an event.
6. Submit the event for approval.
7. Publish the approved event.

**Event cancellation**
1. Cancel an eligible event.
2. Identify affected orders.
3. Calculate permitted refunds.
4. Process refunds.
5. Update ticket validity.
6. Notify customers.
7. Update financial records.

**Organizer payout**
1. Record successful ticket sales.
2. Calculate organiser payable.
3. Evaluate settlement eligibility.
4. Apply required holds.
5. Process a payout.
6. Verify the provider result.
7. Reconcile the financial records.

---

# 20. Deployment Architecture

## 20.1 Initial deployment and runtime (ADR-029)

The initial deployment prioritises simplicity, reliability, operational correctness, and minimal cost:

- **Runtime Baseline (ADR-029):** Active LTS Node.js (Node 22 LTS or newer active release) and pnpm 9+.
- React application hosted on a static web host or edge frontend platform.
- Express API deployed as a Node.js service.
- Background worker deployed as an independent Node.js process consuming outbox jobs.
- Managed PostgreSQL with automated daily backups and point-in-time recovery.
- External payment (Paystack/Flutterwave) and transactional email providers.
- Redis is omitted from the initial MVP deployment (ADR-020).

## 20.2 Environment separation

Maintain separate configurations for:
- Local development.
- Automated testing.
- Staging, where available.
- Production.

Each environment must use the correct database and provider credentials.

Production customer data must not be copied into development or testing environments without an appropriate lawful basis and protective measures.

## 20.3 Database and migrations

Production database migrations must be executed through a controlled deployment process.

The deployment must ensure that:
- Required configuration exists.
- Database connectivity is available.
- Migrations have been applied.
- The application and schema are compatible.
- Health checks report the actual service state.
- Failed deployments can be investigated and recovered.

## 20.4 Health checks

The API and worker should expose or report operational health.

Health checks should distinguish:
- Process liveness.
- Application readiness.
- Critical dependency availability.

A worker that is alive but unable to process jobs must not be reported as fully healthy without qualification.

Health endpoints must not expose secrets or detailed internal infrastructure information publicly.

## 20.5 Graceful shutdown

The API and worker must handle termination safely.

They should:
- Stop accepting new work where appropriate.
- Allow in-progress operations to complete within configured limits.
- Avoid marking unfinished jobs as successful.
- Close database and Redis connections cleanly.
- Leave durable work recoverable.

## 20.6 Backups and recovery

The production environment must have:
- Automated database backups.
- Appropriate backup access controls.
- A documented restoration procedure.
- Periodic restoration testing.
- A defined approach to recovery after data loss or corruption.

Backup frequency and recovery objectives must be established before the platform processes meaningful real-money transactions.

---

# 21. Observability and Operations

## 21.1 Structured logging

Logs should contain useful operational context, such as:
- Request ID.
- Operation name.
- Relevant entity identifier.
- Outcome.
- Error category.
- Duration.
- Retry count where applicable.

Logs must not expose passwords, authentication tokens, payment secrets, or unnecessary personal information.

## 21.2 Critical metrics

The platform should monitor:
- API error rates and latency.
- Database connection health.
- Worker backlog and failure rate.
- Payment initialisation and verification outcomes.
- Webhook processing failures.
- Orders awaiting payment resolution.
- Expired reservations.
- Refund failures.
- Payout failures.
- Reconciliation discrepancies.
- Email delivery failures.

Financial operations need stronger operational visibility than ordinary read-only endpoints.

## 21.3 Audit versus application logs

Application logs help diagnose technical behaviour.

Audit records provide a durable account of significant business and administrative actions.

They serve different purposes and should not be treated as interchangeable.

Audit records must have appropriate retention and access controls.

---

# 22. Architectural Decisions (ADR Register)

The following architectural decisions define the project baseline across all phases.

| ID | Decision | Rationale | Status |
|---|---|---|---|
| ADR-001 | Use a modular monolith | Reduces operational complexity while preserving clear module boundaries. | Accepted |
| ADR-002 | Use Express.js and TypeScript for the API | Fits the intended backend direction and existing experience. | Accepted |
| ADR-003 | Use React, TypeScript, and Vite for the web application | Separates UI from API and enables rapid frontend iteration. | Accepted |
| ADR-004 | Use PostgreSQL as authoritative data store | Provides ACID transactional consistency and relational integrity. | Accepted |
| ADR-005 | Use Drizzle ORM with version-controlled migrations | Provides typed database access and explicit schema evolution. | Accepted |
| ADR-006 | Use a pnpm workspace | Enables shared packages (`packages/types`, `packages/validators`, `packages/config`). | Accepted |
| ADR-007 | Keep Redis non-authoritative | Prevents cache failures from compromising financial or inventory truth. | Accepted |
| ADR-008 | Use durable background processing | Enables safe retries and recovery for asynchronous tasks. | Accepted |
| ADR-009 | Use a transactional outbox for asynchronous events | Prevents loss of critical background work during database transactions. | Accepted |
| ADR-010 | Use REST for the initial API | Provides a straightforward and well-understood frontend/backend contract. | Accepted |
| ADR-011 | Separate order, payment attempt, and refund state | Makes business lifecycles and recovery behaviour explicit and conflict-free. | Accepted |
| ADR-012 | Preserve immutable pricing snapshots and financial history | Supports accurate refunds, reconciliation, and auditability. | Accepted |
| ADR-013 | Use idempotent business operations | Protects against duplicate requests, retries, and concurrent processing. | Accepted |
| ADR-014 | Implement server-side authorisation | Prevents client-side controls from being treated as security boundaries. | Accepted |
| ADR-015 | Verify organiser identity before granting organiser privileges | Supports platform trust, KYC, and risk management. | Accepted |
| ADR-016 | Require administrative approval before event publication | Enforces platform quality control and consumer protection. | Accepted |
| ADR-017 | Configure settlement policy dynamically rather than hardcoding timing | Allows the platform to adapt risk rules and disbursement timing. | Accepted |
| ADR-018 | Server-side sessions with hashed tokens in PostgreSQL | Transmitted via `HttpOnly`, `Secure`, `SameSite=Lax` cookies; instant revocation. | Accepted |
| ADR-019 | Single registrable domain deployment topology | Web and API under `.360events.ng` to ensure native first-party cookie behaviour. | Accepted |
| ADR-020 | Omit Redis from MVP | PostgreSQL satisfies all locking, outbox queuing, and session needs. | Accepted |
| ADR-021 | PostgreSQL-backed worker with transactional outbox | In-house outbox table committing atomically with business operations. | Accepted |
| ADR-022 | Partitioned object storage architecture | Public S3 for event banners; private encrypted S3 with presigned URLs for KYC. | Accepted |
| ADR-023 | UUIDv7 primary keys and human-readable order numbers | Time-ordered UUIDs prevent sequential enumeration while preserving indexing efficiency. | Accepted |
| ADR-024 | Money representation as integer kobo | `bigint` in PostgreSQL; TypeScript `Money` type with half-up rounding. Floats prohibited. | Accepted |
| ADR-025 | Testing stack | Vitest, supertest, real PostgreSQL container for concurrency tests, and Playwright for E2E. | Accepted |
| ADR-026 | Cryptographically signed ticket credentials | Derived HMAC credential verified against database; revocable by status. | Accepted |
| ADR-027 | Double-entry financial ledger foundation | Append-only journal with strict "debits equal credits" invariant, built in Phase 7. | Accepted |
| ADR-028 | API conventions | Uniform error envelope, pagination, `Idempotency-Key` header, UTC ISO-8601 timestamps. | Accepted |
| ADR-029 | Runtime version baseline | Active LTS Node.js (Node 22 LTS or newer active release) and pnpm 9+. | Accepted |
| ADR-030 | Transactional email provider & domain auth | Configured SPF, DKIM, and DMARC on dedicated sending domain. | Accepted |

---

# 23. Major Technical Risks and Mitigations

| Risk | Consequence | Architectural mitigation |
|---|---|---|
| Concurrent inventory allocation | Overselling | Atomic PostgreSQL operations and concurrency tests |
| Duplicate payment notifications | Duplicate business effects | Durable webhook records, uniqueness constraints, and idempotency |
| Payment timeout | Uncertain transaction state | Persisted payment attempts, provider verification, and reconciliation |
| Lost background work | Missing tickets, notifications, or financial updates | Transactional outbox and durable jobs |
| Duplicate refunds | Financial loss | Refund records, idempotency, and concurrency-safe eligibility checks |
| Duplicate payouts | Financial loss | Reserved payable allocations, unique payout references, and reconciliation |
| Event cancellation during checkout | Invalid purchases or inconsistent customer outcomes | Explicit lifecycle rules and transaction coordination |
| Redis outage | Incorrect inventory decisions | PostgreSQL authority and safe failure behaviour |
| Unauthorised organiser access | Privacy breach or business abuse | Server-side ownership checks and permission policies |
| Administrator misuse | Fraud or unauthorised changes | Least privilege, audit logs, and approval controls |
| Personal-data exposure | Privacy harm and legal risk | Data minimisation, access control, retention, and incident response |
| Unreliable settlement calculations | Incorrect organiser balances | Defined accounting model and reconciliation |
| Unreviewed fee-policy changes | Incorrect historical pricing | Immutable order snapshots and effective-dated configuration |
| Provider confirms an operation but local update fails | Divergent financial state | Durable attempts, outbox processing, and reconciliation |

---

# 24. Phased Implementation Roadmap (Reconciled with Implementation Plan)

The architecture is implemented in strictly ordered phases where foundational services precede their consumers:

## Phase 0: Decisions and Baselines
- Resolve open architectural and business decisions (DEC-001 to DEC-027, ADR-018 to ADR-030).
- Establish decision register, state-machine specifications, and API contract baselines.

## Phase 1: Project Foundation
- Establish pnpm workspace, Node 22 LTS baseline, TypeScript, and ESLint configurations.
- Configure PostgreSQL connection, Drizzle ORM, schema migrations, and Vitest test harness.
- Create Express API, background worker, and React/Vite application skeletons.
- Configure CI quality gate and automated deployment pipeline to staging.

## Phase 2: Shared Core Services
- Implement integer kobo Money primitive and half-up rounding functions (floats prohibited).
- Implement transactional outbox table and PostgreSQL-backed durable worker (`FOR UPDATE SKIP LOCKED`).
- Implement immutable audit log framework and idempotency middleware.
- Implement transactional email adapter (SMTP/SES) with local mail-catcher.
- Implement rate limiting middleware and authentication security defenses.

## Phase 3: Identity and Access Control
- Implement user registration with password hashing (Argon2id/bcrypt).
- Implement server-side session management with hashed tokens in `HttpOnly`, `Secure` cookies.
- Implement mandatory customer email verification before checkout (DEC-023).
- Implement password recovery, session revocation, and account deletion foundation.
- Implement granular permission framework and administrator bootstrap.

## Phase 4: Organizer Onboarding and Admin Foundation
- Implement organizer application submission (individual NIN/DOB/phone; business CAC/TIN).
- Implement verification evidence handling with private S3 encrypted storage.
- Implement administrative application review, approval, rejection, and role activation.
- Implement mandatory TOTP MFA and password re-entry for administrative accounts (C-14).
- Implement organizer suspension controls.

## Phase 5: Events and Ticket Types
- Implement event categories and draft lifecycle (`draft` $\rightarrow$ `pending_review`).
- Implement ticket types, pricing, and sales opening/closing windows.
- Implement administrative review and approval (`pending_review` $\rightarrow$ `approved`).
- Implement explicit organizer publication endpoint (`POST /organizer/events/:id/publish`).
- Implement rescheduling request workflow and customer remedies (7-day refund window).
- Implement event suspension governance (admin-only, 14-day/48h SLA) and 0-sales cancellation.

## Phase 6: Inventory, Pricing, and Orders
- Implement administrator-configurable platform fee engine (default 5% of order subtotal).
- Implement stateless pricing quote endpoint (`POST /orders/quote`) and `expectedTotalKobo` price-guard.
- Implement atomic ticket reservations (`SELECT ... FOR UPDATE`) with 10-minute expiry and 5-minute active payment extension.
- Implement purchase limits (max 10/order, max 20/customer/event).
- Implement order creation with immutable pricing snapshots and free-order instant confirmation.
- Implement background reservation expiry worker and inventory reclaim.

## Phase 7: Payments, Tickets, and Gate Check-in
- Implement payment gateway adapter (Merchant of Record / Direct Platform Collection; Paystack/Flutterwave).
- Implement minimal double-entry financial ledger foundation with strict debit=credit balancing.
- Implement payment initiation, hosted checkout redirect, and payment attempt tracking.
- Implement secure webhook signature verification, deduplication, and outbox event publishing.
- Implement payment verification and atomic order confirmation.
- Implement ticket issuance with cryptographically signed credentials and HMAC QR codes.
- Implement gate check-in scanner endpoint and delegated event-specific Check-in Scanner PINs.

## Phase 8: Refunds and Cancellation Orchestration
- Implement refund policy engine (organizer cancellation, discretionary customer requests, rescheduling, system faults).
- Implement gateway refund integration with idempotency.
- Implement atomic ticket revocation upon refund.
- Implement event-cancellation orchestration (mass ticket revocation, refund scheduling, payable freezing).
- Implement ledger completion and automated financial reconciliation.

## Phase 9: Settlement and Payouts
- Implement dynamic settlement policy engine (milestone X days before event, pre-event release cap, 20-30% retention reserve).
- Implement organizer payable calculation from ledger balances.
- Implement organizer verified NUBAN bank account management.
- Implement payout eligibility evaluation, risk holds, and mandatory administrative approval workflow.
- Implement provider transfer execution via Transfers API and settlement reconciliation.

## Phase 10: Complaints, Compliance Features, and UI Completion
- Implement customer support complaints and administrative dispute tracking.
- Implement NDPR account deletion cleanup: irreversible personal data anonymisation while preserving financial ledger rows.
- Implement legal terms, fee disclosures, consumer remedy notices, and privacy policy.
- Complete responsive frontend dashboards for Customer, Organizer, and Admin with full accessibility (a11y).

## Phase 11: Production Readiness, Pilot, and Cutover
- Execute comprehensive threat modeling and security audit.
- Conduct high-concurrency reservation load testing and failure-injection tests.
- Verify automated database backups and point-in-time restoration.
- Execute parallel clean cutover: legacy system runs existing events to completion; new events launched exclusively on re-engineered platform.

---

# 25. Final Architecture Principle

The platform should be designed around explicit ownership of data and business operations.

The API must enforce the rules. PostgreSQL must preserve authoritative business state. Background workers must make asynchronous operations recoverable. The frontend must present the system's state without being trusted to establish financial or inventory truth.

Redis, external services, and deployment infrastructure should support these responsibilities rather than undermine them.

**The defining architectural requirement is that every critical operation must have a clear owner, a durable record, an explicit success condition, and a safe recovery path.**

This architecture is the proposed technical baseline for the Event Ticketing Platform. Database schemas, API contracts, authentication details, financial accounting rules, and deployment choices should be finalised through focused design decisions before the relevant implementation stages.
