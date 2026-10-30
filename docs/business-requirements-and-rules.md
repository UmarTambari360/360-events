# Business Requirements and Rules
## 360Events Ticketing Platform

**Document version:** 0.2.0  
**Status:** Working baseline for reengineering  
**Product type:** Online event discovery, ticket sales, and event-management platform  
**Initial market:** Nigeria  
**Primary currency:** Nigerian Naira (NGN)  
**Backend direction:** Express.js, TypeScript, PostgreSQL, and Drizzle ORM  
**Frontend direction:** React, TypeScript, and Vite  

---

# 1. Purpose of This Document

This document defines the platform's business objectives, users, functional requirements, business rules, financial policies, security expectations, and compliance requirements.

It serves as the reference point for:
- Architecture and database design.
- API design and implementation.
- Frontend development.
- Business-rule validation.
- Automated testing.
- Acceptance testing.
- Future product expansion.

Implementation decisions must not contradict an approved business rule. If an implementation reveals a conflict, the rule must be reviewed and resolved explicitly rather than bypassed in code.

## 1.1 Requirement classifications

Requirements are classified as follows:

- **Confirmed:** Explicitly decided by the product owner.
- **Proposed:** A recommended default awaiting confirmation.
- **Open decision:** A business or regulatory question that must be resolved before the affected functionality is finalised.
- **Launch requirement:** A requirement that must be satisfied before the relevant functionality is made available to real users.

The purpose of these classifications is to prevent assumptions from becoming permanent business policies without approval.

---

# 2. Product Vision and Objectives

## 2.1 Vision

Build a secure, reliable, and user-friendly platform that enables event organisers to publish events, sell tickets, manage attendees, and receive payouts while allowing customers to discover events, purchase tickets, and manage their bookings.

The platform must also provide administrators with effective oversight of event listings, organisers, transactions, customer complaints, refunds, payouts, and platform operations.

## 2.2 Business model

The platform generates revenue by charging a platform fee on ticket purchases.

**Confirmed pricing policy:** The platform fee is added to the ticket subtotal. The customer pays the ticket subtotal plus the platform fee.

The platform must support configurable fee policies administered by authorised administrators.

## 2.3 Primary objectives

1. Allow customers to discover events and purchase tickets.
2. Enable organisers to apply for organiser privileges and manage approved events.
3. Support free and paid events.
4. Support multiple ticket types and limited ticket inventory.
5. Prevent overselling, duplicate payments, duplicate ticket issuance, and unauthorised financial operations.
6. Support event approval, suspension, rescheduling, and cancellation.
7. Provide transparent platform fees, refunds, and settlement policies.
8. Enable controlled organiser payouts after a configurable settlement period.
9. Provide appropriate dashboards for customers, organisers, and administrators.
10. Protect user information and comply with applicable Nigerian laws and regulations.
11. Maintain reliable financial records and an auditable history of critical operations.
12. Provide a maintainable architecture that supports future growth.

---

# 3. Stakeholders and User Roles

The platform has three primary dashboards and corresponding access-control boundaries.

## 3.1 Customer

Customers can:
- Register and authenticate.
- Manage their profiles.
- Discover published events.
- View event details and ticket availability.
- Purchase free or paid tickets.
- View their orders, tickets, and purchase history.
- Access ticket QR codes when tickets have been issued.
- View relevant payment, event-change, and refund updates.
- Request assistance or report problems.
- Request account deletion.

Customers must have an account before purchasing tickets.

### Customer registration requirements

The required registration fields are:
- Name.
- Email address.
- Password.

Phone number is optional and must not be required for ordinary customer registration or checkout unless a separately justified requirement is approved.

Email verification is strictly required before ticket purchases can be completed, as well as before password recovery and other security-sensitive activities. Customers may browse events and place items in their cart, but checkout completion requires a verified email address (via OTP or verification link).

## 3.2 Organizer

Organisers are registered users who have completed the organiser application and approval process.

They can:
- Maintain their organiser profile.
- Create event drafts.
- Configure event details, schedules, venues, and ticket types.
- Set ticket prices and inventory limits.
- Submit events for administrative approval.
- Publish approved events when permitted by the platform.
- Monitor sales and attendance.
- View orders and attendee information necessary to manage their events.
- Manage check-in.
- Request or manage permitted event changes.
- Request cancellation where applicable.
- View sales summaries, fees, refunds, and settlement information.
- View payout eligibility and payout history.
- Receive operational notifications.

Organisers must not be allowed to access another organiser's private data or perform actions outside their authorised scope.

An organiser must not be able to bypass event approval, alter verified payment records, approve their own payouts, or modify historical financial records.

## 3.3 Administrator

Administrators manage the platform and enforce its business policies.

Depending on their assigned permissions, they can:
- Review and approve or reject organiser applications.
- Review organiser identity-verification results.
- Suspend or reinstate organiser accounts.
- Review, approve, reject, or suspend events.
- Review event suspension reasons and histories.
- Configure platform fees.
- Configure payout settlement policies.
- Monitor transactions, refunds, and payouts.
- Investigate complaints and suspected fraud.
- Manage event categories and other platform settings.
- Review audit logs and operational reports.
- Manage appropriate user-support and dispute-resolution workflows.
- Apply account restrictions and other administrative controls.

Sensitive administrative actions must be protected by role-based permissions and recorded in an audit log.

Not every administrator should automatically have unrestricted access to every financial, identity, or security function.

## 3.4 Background workers and external services

The system may use background workers and external providers for:
- Payment processing.
- Payment webhook handling.
- Email delivery.
- Ticket generation.
- QR-code generation.
- Notifications.
- Refund processing.
- Payout processing.
- Data exports.
- Scheduled cleanup.
- Reconciliation and other operational tasks.

Background workers must obey the same business rules as user-facing API endpoints.

---

# 4. Core Domain Concepts

The following concepts form the foundation of the platform's business model.

| Concept | Description |
|---|---|
| User | An account belonging to a customer or another platform user. |
| Role | A permission-bearing designation, such as customer, organizer, or administrator. |
| Organizer application | A request by a user to become an organizer. |
| Organizer verification | Evidence and checks used to assess an organizer's identity and eligibility. |
| Event | An organised activity with details, a schedule, a location or online venue, and a lifecycle. |
| Event category | A classification used to organise and discover events. |
| Ticket type | A ticket option with its own price, inventory limit, and sales conditions. |
| Inventory | The number of tickets available for sale or allocated to valid reservations. |
| Order | A customer's request to purchase one or more tickets. |
| Order item | A ticket type and quantity included in an order. |
| Payment attempt | An attempt to collect payment for an order. |
| Transaction | A recorded financial operation associated with a payment or another financial event. |
| Ticket | A credential issued to a customer for an event. |
| Attendee | A person associated with an issued ticket and attendance record. |
| Check-in | The process of validating a ticket when its holder arrives. |
| Platform fee | The fee charged by the platform in addition to the ticket subtotal. |
| Refund | A reversal or return of an eligible amount to a customer. |
| Organizer payable | The amount that may become payable to an organiser after accounting for relevant deductions and adjustments. |
| Payout | A transfer of eligible funds to an organiser. |
| Ledger entry | An auditable record of a financial movement or accounting adjustment. |
| Webhook | An external event notification, such as a payment-provider notification. |
| Audit log | A record of significant actions and changes. |
| Event suspension | A temporary restriction on an event that is distinct from cancellation. |

These concepts may map to multiple database tables. Their relationships and exact database representation will be defined in the architecture and database design.

---

# 5. Authentication, Accounts, and Permissions

## 5.1 Registration and authentication

The platform must:
- Support customer registration with name, email, and password.
- Enforce email uniqueness according to a documented normalisation policy.
- Store passwords using an appropriate password-hashing algorithm.
- Support login, logout, and password recovery.
- Verify email addresses through a controlled verification process.
- Protect authentication endpoints against abuse.
- Implement secure session or token handling.
- Provide appropriate protections against account takeover.
- Revoke relevant sessions or refresh tokens after security-sensitive changes.

Authentication establishes who a user is. Authorisation determines what that user is permitted to do.

Both must be enforced by the backend.

## 5.2 Role management

A user begins with customer permissions.

A customer who wants to organise events must submit an organiser application.

**Submitting an application must not automatically grant organiser privileges.**

Only an authorised approval process may grant those privileges.

Role assignments must be enforced on the server. Hiding a button or restricting a frontend route is not sufficient protection.

## 5.3 Account deletion

Customers must be able to request account deletion.

The deletion process must:
1. Authenticate the requester.
2. Prevent unauthorised deletion.
3. Explain material consequences where appropriate.
4. Identify personal information eligible for deletion.
5. Preserve records that must lawfully be retained.
6. Revoke applicable sessions and credentials.
7. Delete or anonymise eligible information according to the retention policy.
8. Record the outcome without unnecessarily retaining the information the user asked to have removed.

Account deletion must not automatically erase legitimate financial records, invalidate required audit records, or silently remove evidence needed to resolve disputes.

Confirmed treatment of tickets and financial records upon customer account deletion (DEC-015):
- Deletion is strictly **blocked** if the user holds valid tickets for an upcoming or active event, or has unresolved disputes/refund requests.
- Once eligible, deletion executes irreversible **pseudonymisation/anonymisation**: the customer's personal data (name, email, phone number, password hash) is permanently erased or replaced with anonymous identifiers (`deleted_user_<id>`), and all active sessions are revoked.
- Historical order IDs, ticket redemption records, and financial ledger rows are preserved for the statutory 6-year retention period under tax and accounting laws, referencing only the pseudonymised user ID.

## 5.4 Access-control requirements

The platform must implement server-side authorisation for all protected operations.

Examples:
- A customer can access only their own private order and ticket information.
- An organiser can manage only events they are authorised to manage.
- An organiser cannot access another organiser's private sales or payout information.
- An organiser cannot approve their own application.
- An organiser cannot approve their own event.
- A customer cannot use administrative endpoints.
- Financial actions must be restricted to appropriately authorised roles or background services.
- Sensitive administrative actions must be auditable.

The implementation should use explicit permissions and ownership checks rather than relying exclusively on broad role labels.

---

# 6. Organizer Application and Identity Verification

## 6.1 Application process

The platform must allow a registered user to apply to become an organiser.

The application process should include:
1. Application submission.
2. Collection of the information necessary to evaluate the application.
3. Identity-verification checks.
4. Administrative review.
5. Approval, rejection, or a request for additional information.
6. Notification of the decision.
7. Role activation after approval.

The application should have a clearly defined status.

Proposed statuses:

- `draft`
- `submitted`
- `under_review`
- `additional_information_required`
- `approved`
- `rejected`
- `withdrawn`

The final status model must support the actual verification and review workflow.

## 6.2 Identity verification

The platform must implement an appropriate organiser identity-verification process (DEC-011):
- **Individual Organisers:** Require legal full name, phone number, date of birth, National Identification Number (NIN), and a Nigerian bank account (NUBAN + Bank Code) whose resolved account name matches the applicant's legal name via provider lookup API.
- **Corporate/Business Organisers:** Require registered business name, CAC Registration Number (RC/BN), Tax Identification Number (TIN), and a corporate bank account matching the registered entity name.
- **Verification Evidence:** The system prefers verifying identity attributes via trusted third-party APIs (e.g. NUBAN name-match, CAC lookup) and storing verification status tokens rather than collecting raw identity document scans. Where physical document scans (e.g., CAC certificates or ID cards) are required, they must be stored in a private, encrypted S3 bucket accessible only via short-lived administrative presigned URLs.

The platform must not collect sensitive identity documents indiscriminately.

Verification requirements must be proportionate to the platform's risks, applicable legal obligations, and the capabilities of the selected verification provider.

Where an external provider is used, the platform must evaluate its security, privacy practices, data handling, and contractual terms.

## 6.3 Verification outcomes

Approval must not be granted merely because an application form was submitted.

The platform must retain enough information to establish:
- Who reviewed the application.
- When the decision was made.
- What outcome was reached.
- Whether verification was completed, failed, or remains pending.
- Any restrictions that apply to the approved organiser.

Access to identity documents and verification evidence must be restricted.

The system stores verification results, audit timestamps, and provider references. Raw identification documents are restricted to authorized administrators and retained only for the legally mandated compliance window.

## 6.4 Suspension of an organiser

Administrators may suspend an organiser account where justified by fraud concerns, policy violations, identity issues, or other legitimate reasons.

The system must define the consequences of suspension for:
- Creating and publishing events.
- Selling tickets.
- Existing customer bookings.
- Event changes and cancellations.
- Pending refunds.
- Outstanding payouts.
- Customer support and dispute handling.

Suspension must not be implemented in a way that prevents the platform from fulfilling necessary customer-protection or financial obligations.

---

# 7. Event Management and Approval

## 7.1 Event creation

Approved organisers may create event drafts.

An event should support:
- Title.
- Description.
- Category.
- Cover image or other approved media.
- Start date and time.
- End date and time, where applicable.
- Venue or online-event details.
- Time zone.
- Ticket types.
- Ticket prices.
- Ticket inventory limits.
- Sales opening and closing times.
- Event-specific terms and instructions.
- Relevant accessibility or attendance information.

The platform must validate required fields before an event can be submitted for review.

## 7.2 Event approval

**Confirmed requirement: Every event must be approved by an administrator before it can be published.**

The event lifecycle enforces administrative review and distinct publication:

Confirmed statuses:
- `draft`: Organiser is drafting event details and ticket types.
- `pending_review`: Submitted by organiser for administrative review.
- `changes_requested`: Administrator requested revisions before approval.
- `approved`: Event approved by administrator, awaiting publication by organiser.
- `published`: Published by organiser; publicly discoverable and tickets on sale.
- `suspended`: Sales temporarily paused by administrator for review or investigation.
- `cancelled`: Event cancelled; sales stopped, tickets revoked, and refunds triggered.
- `completed`: Event concluded; eligible balances prepared for final payout release.
- `rejected`: Application or event rejected by administrator.

Approval and publication are distinct concepts (DEC-027). Approval confirms that the event satisfies platform quality and compliance checks; the organiser then explicitly triggers publication (`POST /organizer/events/:id/publish`) to launch ticket sales to the public.

The system must prevent unauthorised status changes through both the API and background jobs.

## 7.3 Event suspension

The platform allows an event to be suspended temporarily (DEC-013, DEC-014).

Suspension rules:
- **Initiator:** Strictly administrator-initiated (`POST /admin/events/:id/suspend`). An organiser needing a pause must submit a support request.
- **Mandatory Reason:** Every suspension requires a recorded, auditable reason.
- **Immediate Effect:** New ticket reservations and checkouts are immediately blocked. The event discovery page reflects the suspended state.
- **Existing Tickets & Pending Checkouts:** Existing issued tickets remain traceable. Orders already in active payment progress may complete, but new orders are blocked.
- **Reinstatement:** Only an authorised administrator can reinstate a suspended event (`POST /admin/events/:id/reinstate`).
- **Suspension Limits & Remedies (DEC-014):** If an event remains suspended for more than **14 calendar days**, or remains suspended within **48 hours of its scheduled start time**, the system triggers a critical operational alert requiring administrators to either formally reinstate the event or force-cancel it, immediately triggering customer refunds.

## 7.4 Event rescheduling and post-approval edits

Rescheduling is distinct from suspension and cancellation (DEC-005, DEC-012).

Post-approval edit rules:
- **Low-Risk Edits (No re-review required):** Organisers may directly update description text, FAQs, cover media/banners, and contact links on `approved` or `published` events.
- **High-Risk Edits (Formal review required):** Material changes—specifically changes to **event date/time (rescheduling)**, **physical venue/city**, or **ticket tier prices/capacities on active tiers**—cannot be applied directly.
- **Rescheduling Request Workflow:** The organiser submits a rescheduling request (`POST /organizer/events/:id/reschedule-request`). An administrator must approve the new date/venue before it takes effect.
- **Customer Remedies for Rescheduled Events (DEC-005):** Existing tickets remain valid for the new date by default. However, all existing ticket holders must be notified immediately and provided a **7-day refund window** (or up to 48 hours before the new event date, whichever is earlier) to claim a full ticket-price refund if they cannot attend. The platform fee is retained to cover non-recoverable payment processing charges.

## 7.5 Event cancellation

The platform enforces strict authority and orchestration for event cancellations (DEC-021).

Cancellation rules:
- **Zero Tickets Sold:** If an event has sold **0 tickets**, the organiser may cancel or archive the event directly (`POST /organizer/events/:id/cancel`).
- **Tickets Already Sold:** If tickets have already been sold, the organiser **cannot unilaterally cancel** the event. The organiser must submit an event cancellation request with a mandatory reason (`POST /organizer/events/:id/cancellation-request`).
- **Administrative Approval & Orchestration:** An administrator reviews and approves the cancellation request (`POST /admin/events/:id/cancellations/:reqId/approve`). Administrators also possess emergency direct cancellation authority (`POST /admin/events/:id/cancel`).
- **Irreversible Outcomes:**
  1. Ticket sales are immediately halted.
  2. All issued tickets for the event are revoked.
  3. Automatic refund workflows are initiated for all eligible ticket holders (ticket face value refunded, platform fee retained under confirmed policy).
  4. Organiser payout allocations for the event are frozen and reversed.
  5. Customers and the organiser receive formal notifications.

A cancelled event must not be treated as merely suspended.

The system must not mark a refund as successful until the relevant provider response or reconciliation process confirms the outcome.

---

# 8. Ticket Types and Inventory

## 8.1 Ticket types

An event may offer multiple ticket types.

Examples include:
- Regular.
- VIP.
- Early bird.
- Student.
- Group admission.
- Other organiser-defined categories permitted by platform policy.

Each ticket type may have:
- A name and description.
- A price.
- An inventory limit.
- A quantity already sold or otherwise allocated.
- Sales opening and closing times.
- Per-order purchase limits.
- Eligibility conditions, where applicable.
- A status indicating whether it is available for sale.

## 8.2 Inventory rules

The platform must maintain authoritative ticket inventory.

**Non-negotiable rule: The system must never allow more valid ticket allocations than the configured inventory permits.**

The backend must enforce inventory limits during concurrent purchases.

A frontend availability display is informative only. It cannot guarantee that a ticket remains available until the backend successfully reserves it.

The system must account for:
- Confirmed sales.
- Active reservations.
- Expired reservations.
- Cancelled orders.
- Refunded orders.
- Administrative adjustments.
- Event cancellation.

Inventory must be updated through controlled, atomic operations.

## 8.3 Reservations and late payment recovery

The platform reserves ticket inventory atomically during checkout (DEC-016, DEC-022).

Reservation and recovery rules:
- **Reservation Hold Duration (DEC-016):** An initial reservation expires after **10 minutes** if payment is not initiated.
- **Active Payment Extension:** When the customer initiates a payment transaction with the provider, the reservation is granted a **5-minute grace extension** to accommodate 3D-Secure/OTP bank delays without premature expiry.
- **Expiry Handling:** If the reservation expires without payment, a background job releases the held tickets back to available public inventory and marks the order as `expired`.
- **Late Payment Recovery (DEC-022):** If a customer payment succeeds after a reservation expired:
  1. *Inventory Still Available:* The system automatically reclaims the inventory, transitions the order to `confirmed`, and issues tickets.
  2. *Inventory Sold Out:* The system marks the order as `unfulfillable_late_payment` and automatically executes an immediate **100% full refund** (Ticket Face Value + Platform Fee) to the customer, sending an email notification.
- **Payment During Event Suspension/Cancellation:**
  - If payment succeeds on a *cancelled* event, the customer receives an automatic immediate **100% full refund**.
  - If payment succeeds on a *suspended* event, orders already pending payment are honoured and tickets issued, while new checkouts remain blocked.

PostgreSQL is the authoritative source for inventory and reservation transactions (`SELECT ... FOR UPDATE`).

## 8.4 Purchase limits

The system enforces purchase limits to prevent bot scalping and ensure fair access (DEC-017):
- **Per-Order Limit:** Configurable per ticket type, defaulting to a maximum of **10 tickets per order**.
- **Per-Customer Limit:** Enforced across orders, defaulting to a maximum of **20 tickets per customer per event**.

Validation occurs strictly on the backend across all ticket lines. Repeated submissions cannot bypass these caps.

---

# 9. Orders and Checkout

## 9.1 Customer requirements

Customers must be authenticated before purchasing tickets.

The checkout process should:
1. Validate the event, sales window, and ticket availability.
2. Provide a stateless quote preview (`POST /orders/quote`) returning subtotal, fee, and total payable in kobo.
3. Validate requested quantities against per-order and per-customer limits.
4. Reserve required ticket inventory atomically.
5. Create the order record with immutable fee and price snapshots, validating that `expectedTotalKobo` submitted by the customer matches server calculation (rejecting with `409 PRICE_CHANGED` if pricing changed).
6. Initiate payment where applicable.
7. Confirm the order only after payment verification or free-order confirmation.
8. Issue tickets with cryptographically signed credentials.

## 9.2 Order records

An order must preserve the pricing and quantity details applicable when it was created.

At minimum, the order and its related records should make it possible to determine:
- The customer.
- The event.
- The ticket types and quantities.
- The ticket subtotal.
- The applicable platform fee.
- The total amount charged or due.
- The currency.
- The payment status.
- The order status.
- Relevant timestamps.
- The associated payment attempts.
- Any refund amounts and statuses.

The system must not recalculate historical order prices using current ticket prices or current platform fee settings.

## 9.3 Free events

Free tickets must follow the same inventory and authorisation rules as paid tickets.

A free order must not be treated as a reason to bypass:
- Inventory reservation.
- Purchase limits.
- Duplicate-request protection.
- Order validation.
- Ticket issuance controls.
- Cancellation and attendance rules.

A free order is confirmed immediately with payment status `not_required` when the total payable amount is zero. Free orders strictly incur ₦0 platform fee.

The system must still maintain an auditable order record.

## 9.4 Order idempotency

The system must protect checkout against duplicate submissions and retries.

Repeating the same valid request must not accidentally create duplicate purchases, duplicate charges, or duplicate ticket issuance.

Where appropriate, the API should support idempotency keys or an equivalent reliable deduplication mechanism.

Idempotency must be enforced using durable server-side records and database constraints where applicable.

## 9.5 Decoupled order, payment, and refund lifecycles

Order status, payment attempt status, and refund outcomes are decoupled to prevent state conflicts (C-09, ADR-011):

### Confirmed order statuses (Fulfillment Lifecycle):
- `pending`: Inventory reserved; awaiting customer payment completion.
- `confirmed`: Payment verified (or free order validated); valid tickets issued.
- `completed`: Event has ended and tickets were eligible for attendance.
- `cancelled`: Customer voluntarily cancelled checkout while pending.
- `expired`: 10-minute reservation timed out without payment; inventory released.

### Confirmed payment attempt statuses (Transaction Lifecycle):
- `pending`: Attempt initiated with payment gateway.
- `processing`: Customer redirected to gateway / 3D-Secure authentication.
- `pending_verification`: Gateway response delayed or awaiting webhook confirmation.
- `successful`: Payment verified via provider webhook/API.
- `failed`: Payment declined or rejected by bank/gateway.
- `abandoned`: Customer closed checkout or timed out.
- `not_required`: Free orders (₦0 total).

### Refund tracking:
Refunds are tracked as discrete records in a separate `refunds` ledger. An order derives a computed summary field:
- `refund_status`: `none` | `partial` | `full`
- `refunded_amount_kobo`: cumulative amount refunded to date.
An order's core lifecycle remains `confirmed` or `completed` even if partially refunded, reflecting that non-refunded tickets remain valid for entry.

---

# 10. Platform Fees and Pricing

## 10.1 Fee policy

**Confirmed requirement: The platform fee is added to the ticket subtotal and paid by the customer.**

The customer must see the ticket subtotal, platform fee, and total amount payable before confirming the purchase.

Example:

| Component | Amount |
|---|---:|
| Ticket subtotal | ₦10,000 |
| Platform fee | ₦500 |
| Total payable | ₦10,500 |

This example illustrates the pricing structure only. It does not establish the actual fee rate.

## 10.2 Administrative fee configuration

Authorised administrators must be able to configure the platform fee according to business policy (DEC-001, DEC-002, DEC-003).

Confirmed fee structure:
- **Fee Model (DEC-001):** An administrator-configurable percentage fee on ticket sales (default: **5%** or 500 basis points). The database schema supports an optional fixed-fee component (`percentage_basis_points` + optional `fixed_kobo`).
- **Fee Scope (DEC-002):** Evaluated at the **order level** across the combined subtotal of all tickets in the checkout.
- **Free Orders:** Orders with a subtotal of ₦0 strictly incur **₦0 platform fee**.
- **Rounding Rules (DEC-003):** All monetary values are calculated and stored in integer kobo (`bigint`). Calculations use standard half-up rounding to the nearest kobo:
  $$\text{Fee Kobo} = \operatorname{round}\left(\frac{\text{Subtotal Kobo} \times \text{Basis Points}}{10\,000}\right)$$
- **Effective Configuration & History:** Fee settings are versioned with effective dates and audit logs tracking which administrator made the change.

## 10.3 Fee snapshots and price lock

Every order preserves an immutable snapshot of the fee configuration applied at checkout (C-12).

Changing platform fee settings never alters existing orders.

To protect customers from price surprises during checkout:
- The client fetches a pricing breakdown via `POST /orders/quote`.
- When creating the order (`POST /orders`), the client supplies the `expectedTotalKobo` displayed to the customer.
- If the server calculation differs from `expectedTotalKobo` (e.g. if an administrator updated fees during checkout), the server rejects the creation with `409 PRICE_CHANGED`, requiring customer re-confirmation.

## 10.4 Currency and precision

The authoritative platform currency is NGN.

All financial amounts are stored as exact integers in minor units (**kobo**) in PostgreSQL (`bigint`), never floats.

Floating-point arithmetic is prohibited across all monetary calculations and financial ledger entries.

---

# 11. Payments and Payment Verification

## 11.1 Payment processing and funds flow

The platform operates as the **Merchant of Record (Direct Platform Collection)** (DEC-010):
- All customer payments (ticket subtotal + platform fee) flow directly into the platform's central merchant account via an approved gateway (initially Paystack/Flutterwave).
- Provider-managed split payments / subaccounts at checkout are strictly prohibited. Funds remain in custodial trust as platform liabilities until eligible for payout.
- The platform uses the provider's standard hosted checkout and verification mechanisms rather than directly handling or storing raw payment-card credentials.
- The system must not treat a successful frontend redirect as proof of payment.

## 11.2 Payment verification

Before confirming a paid order, the backend must verify the transaction using trusted payment-provider information.

Verification must include the relevant checks for:
- Payment reference.
- Expected amount.
- Currency.
- Associated order.
- Expected transaction state.
- Payment-provider identity.
- Whether the transaction has already been processed.
- Whether the transaction remains valid for the requested operation.

The exact checks must be aligned with the selected provider's documentation.

## 11.3 Payment state consistency

The system must not mark an order as paid solely because:
- The customer reached a success page.
- The frontend reported success.
- A request supplied a payment reference without verification.
- A webhook was received but not authenticated and validated.

If a provider request times out, the system must not assume that the transaction failed or succeeded without further verification.

The payment state must be recoverable through retries, verification, and reconciliation.

## 11.4 Webhooks

Webhook processing must:
- Validate the provider's signature using the documented verification method.
- Reject or appropriately handle invalid events.
- Deduplicate repeated notifications.
- Persist sufficient information for reliable processing.
- Process state transitions safely.
- Avoid applying the same financial effect more than once.
- Retry recoverable failures.
- Record failures for investigation.
- Provide a recovery path for events that cannot be processed automatically.

A webhook must not be acknowledged as successfully processed if the platform has not safely accepted it for processing.

Where the provider expects an acknowledgement, the platform should durably record the event or place it in a reliable processing queue before returning success.

The system must also support reconciliation in case a webhook is missed or processing fails.

---

# 12. Ticket Issuance and Attendance

## 12.1 Ticket issuance

Tickets may be issued only when the associated order satisfies the required business conditions.

For paid orders, ticket issuance requires verified payment and valid inventory allocation.

For free orders, ticket issuance requires a valid confirmed order and inventory allocation.

The platform must prevent duplicate ticket issuance when payment verification, webhook handling, or background jobs are repeated.

## 12.2 Ticket identity

Each ticket must have a unique, non-guessable identifier or securely generated credential.

QR codes must not expose unnecessary customer information.

Ticket validation must occur through a trusted backend process rather than relying on information embedded in a QR code alone.

## 12.3 Check-in and attendee management

The platform allows organisers and delegated door staff to validate tickets efficiently at the gate (DEC-024, DEC-026):
- **Attendee Data Model (DEC-026):** In compliance with NDPR data minimisation, all tickets in an order default to the purchasing customer. Each ticket has a unique cryptographically signed credential and QR code. Per-ticket guest name entry is deferred to post-MVP.
- **Delegated Gate Check-in (DEC-024):** To enable ushers, bouncers, or venue staff to validate tickets without exposing the organiser's financial balances or admin tools, the organiser can generate a time-bound **Check-in Scanner PIN/Token** for the event. Gate staff log into a lightweight web scanner with this PIN to scan tickets.
- **Concurrency-Safe Validation:** Check-in transitions are atomic. Two simultaneous scans of the same ticket will result in exactly one successful check-in and one `ALREADY_REDEEMED` rejection.
- The check-in record captures the exact timestamp and operator identifier.

## 12.4 Revocation

Tickets may need to be revoked because of:
- A valid refund.
- Event cancellation.
- Fraud investigation.
- Administrative correction.
- Other approved reasons.

Revocation must be auditable and must not erase the original ticket record.

---

# 13. Refunds and Cancellation Policy

## 13.1 Confirmed organizer-cancellation policy

**When an organiser cancels an event after customers have paid, customers must receive a refund of the ticket-price component. The platform fee charged to the customer is non-refundable under the agreed business policy, subject to applicable law.**

This policy must be clearly disclosed before purchase. The checkout interface must not hide the fee or imply that the entire amount is refundable if the policy says otherwise.

## 13.2 Customer-requested refunds (DEC-004)

- **Default Policy:** Ticket purchases are **final and non-refundable** if a customer changes their mind or cannot attend.
- **Support Channel:** The platform does not provide an automated self-service refund button in the customer dashboard. Customers with exceptional circumstances (e.g. duplicate purchase, accidental order within 1 hour) may submit a support request.
- **Admin Discretion:** An administrator manually evaluates the request. If approved, the ticket price is refunded and the platform fee is retained.

## 13.3 Event rescheduling remedies (DEC-005)

When an organiser reschedules an event (date, time, or venue change):
- Existing tickets automatically transfer to the new date.
- All ticket holders are notified immediately and granted a **7-day refund window** (or up to 48 hours prior to the new event date, whichever is earlier) to claim a refund if they cannot attend the new schedule.
- Rescheduling refunds return the full ticket face value; the platform fee is retained to cover payment processing charges.

## 13.4 Technical faults and duplicate payment refunds (C-11)

For technical errors caused by system or provider anomalies (e.g., duplicate charges, payment captured after inventory expired, or failed ticket allocations):
- The customer receives an automatic **100% full refund** (Ticket Face Value + Platform Fee).
- The platform absorbs the non-recoverable payment processing cost rather than passing it to the customer.

## 13.5 Processing deadlines and operational SLAs (DEC-006)

- **Platform SLA:** All approved refunds must be submitted to the payment gateway (Paystack/Flutterwave) within **24 hours** via background jobs or admin action.
- **Bank Settlement Disclosure:** Customers are informed that bank settlement typically takes **5 to 10 business days** depending on their issuing bank.
- **Operational Stalled Alerts:** Any refund remaining unconfirmed after **72 hours** triggers an alert on the admin dashboard for operational investigation.

## 13.6 Refund accounting

A refund must create auditable financial effects.

It must not silently delete the original transaction or rewrite the original order.

Refunds, platform fees, payment-provider charges, and organiser liabilities are balanced explicitly in the financial ledger. Affected tickets are atomically updated to `revoked`.

---

# 14. Organizer Settlement and Payouts

## 14.1 Confirmed payout policy and timing (DEC-007)

**Organizer payouts follow an administrator-configurable settlement policy relative to the event date.**

To ensure event organizers have the liquidity needed to execute their events in the Nigerian market, the system supports disbursing funds **prior to the event**:
- An authorized administrator configures the settlement milestone, specifically the **number of days before the event** when ticket proceeds become eligible for payout release (e.g. 2 to 5 days before the event start date).
- Administrators may alternatively configure a post-event milestone (e.g. 1 to 3 days after event completion) for specific high-risk organizers or events.
- The milestone is dynamic and stored in system configuration, never hardcoded.

## 14.2 Payout eligibility and risk reserves (DEC-009)

Payout eligibility is calculated authoritatively from the double-entry financial ledger:
- **Pre-Event Disbursement Cap & Reserve (DEC-009):** To balance organizer liquidity with platform protection against cancellation or abandonment, the settlement policy supports a configurable pre-event payout cap. Default policy: up to **70%–80%** of net ticket revenue is eligible for pre-event release; a **20%–30% reserve** is retained until 24–48 hours after the event successfully concludes. For vetted partners, administrators may configure a 100% pre-event release.
- **Administrative Risk Holds:** Administrators may place an explicit `risk_hold` on any organizer or event balance, halting all payout execution if disputes, unverified claims, or cancellation risks arise.
- **Minimum Payout:** A configurable threshold (default **₦2,000**) ensures small balances do not incur disproportionate bank transfer fees.

## 14.3 Administrative approval workflow (DEC-008)

Payout execution is **not fully automated** in the MVP:
1. When an event reaches its configured days-before-event milestone, the system computes the organizer's payable balance and generates a payout request in `eligible` status.
2. An authorized administrator must review the event metrics, check-in readiness, and dispute flags, and **explicitly approve** the payout request (`POST /admin/payouts/:id/approve`).
3. Upon approval, a durable background job executes the transfer via the payment provider Transfers API (Paystack/Flutterwave) directly to the organizer's verified NUBAN bank account.

## 14.4 Payout lifecycle

A payout moves through explicit states:
- `pending`: Event is active; ticket sales accumulating.
- `eligible`: Settlement milestone reached; payable calculated and awaiting admin review.
- `processing`: Admin approved; background worker initiated transfer with payment provider.
- `paid`: Provider webhook confirmed funds successfully credited to organizer NUBAN.
- `failed`: Provider transfer failed; balance returned to payable for retry or account correction.
- `cancelled`: Rejected by administrator.
- `on_hold`: Frozen by administrator under risk hold.

The platform prevents concurrent duplicate payout allocations and reconciles all provider transfer references.

## 14.5 Financial and regulatory review

Before real-money payouts are enabled, the platform owner must determine the appropriate legal and operational arrangement for receiving customer payments, retaining funds, and settling organiser proceeds.

The platform must not assume that using a payment gateway automatically authorises it to hold or manage customer funds in any manner it chooses.

The chosen funds flow must be reviewed against applicable payment-system rules, provider contracts, and any relevant licensing requirements.

Where necessary, funds should be held and transferred through appropriately authorised payment providers or financial institutions.

---

# 15. Financial Records and Reconciliation

## 15.1 Financial integrity

The platform must maintain accurate and auditable records of:
- Customer payments.
- Payment attempts.
- Platform fees.
- Refunds.
- Organiser liabilities.
- Payouts.
- Payment-provider charges, where applicable.
- Adjustments and reversals.
- Outstanding balances.

The system must not rely solely on a mutable order-status field to represent the complete financial history of a transaction.

## 15.2 Ledger principles

The platform should maintain a ledger or equivalent auditable financial record that allows it to reconstruct the financial effect of each relevant operation.

The financial model must define how it represents:
- Customer payment received.
- Platform revenue.
- Organiser payable.
- Refund liability.
- Refund completed.
- Payout initiated.
- Payout completed.
- Provider fees.
- Reversals and corrections.

The exact accounting entries must be finalised with appropriate financial and accounting advice before launch.

## 15.3 Immutable history

Historical financial events must not be silently deleted or rewritten.

Corrections must be represented by explicit adjustments, reversals, or other documented operations.

Each relevant financial record should link to its originating order, transaction, refund, payout, or other business operation.

## 15.4 Reconciliation

The platform should support scheduled reconciliation between internal records and the payment provider.

Reconciliation must identify:
- Payments missing from internal records.
- Internal payments not confirmed by the provider.
- Duplicate or inconsistent transactions.
- Refund discrepancies.
- Payout discrepancies.
- Transactions requiring manual review.

Unresolved discrepancies must be visible to authorised administrators.

---

# 16. Customer, Organizer, and Admin Dashboards

## 16.1 Customer dashboard

The customer dashboard should provide:
- Profile details.
- Account-security controls.
- Order history.
- Ticket information.
- Upcoming and past events associated with the customer's tickets.
- Payment and refund statuses.
- Relevant event-change notifications.
- Access to valid ticket QR codes.
- Support and complaint options.
- Account-deletion controls.

Customers must not see other customers' private information.

## 16.2 Organizer dashboard

The organiser dashboard should provide:
- Organiser profile and verification status.
- Event list and event statuses.
- Draft creation and event-submission tools.
- Administrative review feedback.
- Sales summaries.
- Ticket-type and inventory information.
- Order and attendee information required for event management.
- Check-in tools.
- Cancellation and rescheduling workflows.
- Refund-related information relevant to the organiser.
- Settlement eligibility and payout history.
- Important notifications and operational warnings.

Financial summaries must clearly distinguish gross ticket sales, platform fees, refunds, amounts payable, and amounts already paid.

## 16.3 Admin dashboard

The admin dashboard should provide appropriate oversight of:
- Users and account status.
- Organiser applications.
- Identity-verification results and pending reviews.
- Events awaiting approval.
- Published, suspended, cancelled, and completed events.
- Event suspension reasons and histories.
- Sales and transaction summaries.
- Refund requests and outcomes.
- Organiser payout eligibility and processing.
- Customer complaints.
- Suspicious activity and risk flags.
- Platform fee settings.
- Settlement policies.
- Audit logs.
- System health and failed background jobs, where operationally appropriate.

Administrative lists must support relevant filtering, searching, pagination, and sorting.

Sensitive information must be exposed only to authorised administrators who need it.

---

# 17. Notifications and Communication

The platform should support email and, where appropriate, in-app notifications.

Important notification events include:
- Account verification.
- Password recovery.
- Organizer application submission.
- Organizer application decision.
- Identity-verification issues.
- Event approval or rejection.
- Requests for event changes.
- Event suspension or reinstatement.
- Event rescheduling.
- Event cancellation.
- Order confirmation.
- Payment failure or verification issues.
- Ticket issuance.
- Refund status changes.
- Payout eligibility and payout results.
- Security-sensitive account changes.

Notifications must not be the sole source of truth for a transaction or event state.

A failed email must not undo a valid payment or prevent a refund from being recorded.

Notification delivery should be retryable, observable, and designed to avoid sending duplicates unnecessarily.

---

# 18. Nigerian Legal and Regulatory Compliance

## 18.1 General requirement

The platform must be designed, developed, and operated in accordance with applicable Nigerian laws, regulations, regulatory guidance, and relevant professional standards.

Compliance must be assessed according to the platform's actual business model, data processing, payment flows, customer relationships, and operational activities.

The platform owner must obtain appropriate legal, accounting, privacy, and payment-regulatory advice where necessary.

This document establishes product requirements; it does not constitute a legal opinion or guarantee compliance.

## 18.2 Personal data protection

The platform must assess and comply with the **Nigeria Data Protection Act, 2023**, and applicable requirements and directives issued by the Nigeria Data Protection Commission.

Requirements include:
- Collecting only information necessary for specified, legitimate purposes.
- Establishing a lawful basis for personal-data processing.
- Providing an accessible privacy notice.
- Explaining how data is collected, used, stored, shared, and retained.
- Implementing appropriate technical and organisational security measures.
- Supporting applicable data-subject rights.
- Defining data-retention and deletion policies.
- Controlling access to personal information.
- Assessing third-party processors and data-sharing arrangements.
- Establishing a process for handling personal-data breaches.
- Assessing applicable registration, audit, reporting, and data-protection-officer obligations.

The platform must evaluate its obligations as it grows, particularly if it meets applicable criteria for a data controller or processor of major importance.

### Data minimisation

The customer registration model must remain limited to name, email, and password, with phone number optional, unless a specific and justified requirement is approved.

Identity verification for organisers must be proportionate to the purpose and risk.

Sensitive information must not be collected merely because it may be useful in the future.

### Privacy by design

Privacy and security requirements must be considered during architecture and feature design, not added only after implementation.

Examples include:
- Restricting access to identity documents.
- Avoiding unnecessary personal information in logs.
- Preventing QR codes from exposing private customer data.
- Using appropriate encryption and secret management.
- Limiting personal data sent to analytics and notification services.
- Reviewing third-party data processing.
- Providing mechanisms for applicable privacy requests.

### Account deletion and retention

Account deletion must follow the platform's retention policy and applicable law.

Information eligible for deletion must be removed or anonymised as appropriate. Records that must lawfully be retained for financial reporting, legal obligations, fraud prevention, or dispute resolution may need to be preserved under appropriate access restrictions.

## 18.3 Consumer protection and fair trading

The platform must assess and comply with applicable consumer-protection obligations, including those under the **Federal Competition and Consumer Protection Act, 2018**, and relevant rules or guidance.

Requirements include:
- Displaying ticket prices, platform fees, and total payable amounts before purchase.
- Providing accurate and non-misleading event information.
- Clearly identifying relevant organiser and platform responsibilities.
- Making cancellation, rescheduling, and refund terms accessible before purchase.
- Avoiding hidden charges and deceptive pricing.
- Providing a process for reporting problems and resolving complaints.
- Maintaining appropriate records of complaints and outcomes.
- Communicating material event changes to affected customers.
- Applying refund and cancellation policies consistently, subject to mandatory legal requirements.

The agreed policy that the platform fee is non-refundable following organiser cancellation must be reviewed for legal enforceability before launch. If applicable law requires a different result, the legally required outcome takes precedence.

## 18.4 Payments and financial regulation

Before enabling real-money transactions and organiser payouts, the platform owner must assess applicable requirements relating to:
- Payment processing.
- Merchant and payment-provider arrangements.
- Holding and settlement of funds.
- Refunds and reversals.
- Payment-provider terms.
- Fraud prevention.
- Financial records and reconciliation.
- Applicable tax and reporting obligations.

The system must use appropriately authorised providers for regulated payment activities.

The platform must not assume that its use of a third-party payment gateway automatically resolves every regulatory question relating to its own business model.

The precise legal requirements depend on how customer funds are received, where they are held, who controls them, and how organisers are paid.

## 18.5 Cybersecurity and operational controls

The platform must implement reasonable security controls appropriate to the nature and risk of the service.

These should include:
- Secure authentication and authorisation.
- Password hashing.
- Appropriate session and token protections.
- Rate limiting and abuse prevention.
- Input validation.
- Protection against common web and API vulnerabilities.
- Secure handling of application secrets.
- Dependency management and security updates.
- Database access controls.
- Backups and recovery procedures.
- Monitoring and incident response.
- Audit trails for sensitive operations.
- A process for addressing security vulnerabilities.

Applicable cybersecurity obligations must be identified according to the platform's activities and relationships with relevant providers.

## 18.6 Terms, policies, and legal documents

Before launch, the platform should have professionally reviewed versions of:
- Terms of service.
- Privacy notice.
- Customer refund and cancellation policy.
- Organizer agreement.
- Event listing and conduct policy.
- Prohibited-content and prohibited-event policy.
- Payout and settlement terms.
- Complaint and dispute-resolution procedure.
- Relevant data-retention and security policies.

The documents must reflect the platform's actual behaviour. A policy must not promise a feature or protection the system does not implement.

## 18.7 Compliance ownership

The platform owner is responsible for determining which requirements apply and assigning responsibility for compliance activities.

The system should support compliance through appropriate records, access controls, configurable policies, audit logs, and reporting.

Legal and regulatory requirements must be reviewed periodically and whenever the platform materially changes its business model, payment flow, data processing, or geographic reach.

---

# 19. Security, Abuse Prevention, and Auditability

## 19.1 General security

The system must protect against:
- Unauthorised access.
- Privilege escalation.
- Account takeover.
- Automated abuse.
- Duplicate transactions.
- Ticket fraud.
- Inventory manipulation.
- Unauthorised refunds.
- Payout manipulation.
- Exposure of private customer or organiser information.

Security checks must be implemented at the backend and supported by appropriate database constraints.

## 19.2 Audit logging

The system must record significant actions, including:
- Role changes.
- Organizer application decisions.
- Identity-verification decisions.
- Event approval and rejection.
- Event suspension and reinstatement.
- Event cancellation and rescheduling.
- Platform fee changes.
- Settlement-policy changes.
- Refund decisions and processing.
- Payout initiation and completion.
- Sensitive administrative actions.
- Security-related account changes.

Audit records should include the actor, action, relevant entity, timestamp, outcome, and other necessary context.

Audit logs must not unnecessarily include passwords, authentication tokens, payment credentials, or excessive personal data.

## 19.3 Administrative accountability and MFA

Sensitive administrative operations require granular server-side permissions and multi-factor authentication (C-14):
- **Granular Permissions:** Monolithic `is_admin` flags are prohibited. Access is partitioned into discrete permissions (`events:approve`, `finance:payout:approve`, `finance:refund:process`, `users:manage`, `config:fees:write`).
- **Mandatory TOTP MFA:** High-risk actions—including approving organizer payouts, suspending events, issuing exceptional refunds, and modifying fee or settlement configurations—strictly require **TOTP Multi-Factor Authentication (Authenticator App)** and password re-entry.
- **Audit Logging:** Every administrative action generates an immutable audit record containing the administrator's ID, IP address, user-agent, timestamp, previous state, and justification reason.

---

# 20. Reliability and Operational Requirements

## 20.1 Error handling

The API must return consistent and meaningful errors without exposing sensitive internal details.

Expected business failures—such as unavailable inventory, an unapproved event, an expired reservation, or an ineligible payout—must be handled explicitly.

Unexpected errors must be logged and investigated without exposing stack traces or secrets to customers.

## 20.2 Database consistency

PostgreSQL must remain the authoritative source for persistent business records.

The system should use transactions and appropriate constraints for operations that must succeed or fail together.

Examples include:
- Reserving inventory.
- Confirming an order.
- Recording verified payment outcomes.
- Issuing tickets.
- Processing refunds.
- Creating payout records.
- Applying financial adjustments.

External provider calls cannot generally be made atomic with a database transaction. The architecture must therefore account for partial failures, retries, and reconciliation.

## 20.3 Background jobs

Background jobs must be designed for safe retries.

A job that runs twice must not accidentally:
- Issue duplicate tickets.
- Refund a customer twice.
- Pay an organiser twice.
- Apply a platform fee twice.
- Send repeated critical notifications without control.

Failed jobs must be observable and recoverable.

## 20.4 Monitoring and backups

The deployment must provide:
- Application and worker logs.
- Health checks.
- Error monitoring.
- Database backups.
- A documented restoration procedure.
- Monitoring for failed payment, refund, and payout processing.
- A process for investigating unresolved financial discrepancies.

Backups must be protected from unauthorised access and tested through restoration exercises.

---

# 21. Proposed State Machines

The following are initial models. Their final transitions must be documented and tested during implementation.

## 21.1 Organizer application

`draft → submitted → under_review → approved`

Alternative transitions may include:

- `under_review → additional_information_required`
- `additional_information_required → under_review`
- `under_review → rejected`
- `draft → withdrawn`
- `submitted → withdrawn`, if permitted by policy

Only an authorised administrative decision may grant organiser privileges.

## 21.2 Event

Confirmed lifecycle:

`draft → pending_review → approved → published → completed`

Other supported transitions include:
- `pending_review → changes_requested`
- `changes_requested → pending_review`
- `pending_review → rejected`
- `published → suspended`
- `suspended → published` (after authorised reinstatement)
- `published → cancelled` (requires admin approval if tickets sold; direct if 0 sales)
- `suspended → cancelled`

Approval and publication are decoupled (DEC-027). Publication is triggered by the organiser via `POST /organizer/events/:id/publish`. Material changes to date/time, venue, or active ticket prices require a formal rescheduling review (DEC-012).

## 21.3 Order

Confirmed order fulfillment lifecycle (C-09, ADR-011):

$$\text{pending} \xrightarrow{\text{payment verified}} \text{confirmed} \xrightarrow{\text{event concludes}} \text{completed}$$

Terminal checkout outcomes:
- `pending → cancelled` (customer cancelled pending checkout)
- `pending → expired` (10-minute reservation timed out without payment)

Refund status is decoupled into a dedicated `refunds` table. The order entity derives an aggregate summary:
- `refund_status`: `none` | `partial` | `full`
- `refunded_amount_kobo`: cumulative kobo amount refunded.
An order remains `confirmed` or `completed` even if partially refunded, preserving valid entry for unrefunded tickets.

## 21.4 Payment attempt

Confirmed payment attempt lifecycle (C-09):

$$\text{pending} \rightarrow \text{processing} \rightarrow \text{successful}$$

Alternative outcomes:
- `processing → failed`
- `processing → abandoned` (checkout closed or customer timed out)
- `processing → pending_verification` (awaiting asynchronous webhook or gateway status query)
- `pending_verification → successful` or `failed`

For free orders (₦0 subtotal), payment status is `not_required`. Payment records are immutable attempts to collect funds; refunds are not stored as payment statuses.

## 21.5 Refund

Confirmed refund lifecycle:

`requested → approved → processing → succeeded`

Alternative outcomes:
- `requested → rejected`
- `processing → failed`
- `failed → processing` (safe retry with provider idempotency key)

A refund request record represents the internal authorization; `succeeded` requires provider webhook or API confirmation.

## 21.6 Payout

Confirmed payout lifecycle (DEC-007, DEC-008):

`pending → eligible → processing → paid`

Alternative outcomes:
- `pending → on_hold` (administrative risk hold applied)
- `eligible → on_hold`
- `eligible → cancelled` (rejected by administrator)
- `processing → failed`
- `failed → processing` (safe retry after account correction)

Payout transitions from `eligible` to `processing` strictly require explicit administrator approval. Transfers are disbursed via payment provider Transfers API to verified NUBAN accounts.

---

# 22. Non-Negotiable Business Invariants

The following rules must be preserved across the API, database, background workers, and frontend.

1. An unapproved event must not be publicly purchasable.
2. A suspended or cancelled event must not accept new ticket purchases.
3. A customer must be authenticated before purchasing tickets.
4. Only approved users may access organiser functionality.
5. An organiser must not be able to manage another organiser's private resources without explicit authorisation.
6. Inventory must never be oversold.
7. Free events must not bypass inventory and order validation.
8. Payment success must be verified through trusted provider information.
9. A frontend redirect must not establish payment success by itself.
10. Repeated requests must not create duplicate financial effects.
11. A ticket must not be issued more than once for the same valid entitlement.
12. A ticket must not be successfully checked in more than once as a first-time check-in.
13. Existing orders must preserve the applicable pricing and fee snapshot.
14. Historical financial records must not be silently rewritten or deleted.
15. Refunds must not exceed the applicable refundable amount.
16. The system must distinguish refund approval from successful refund execution.
17. Payouts must follow the configured settlement policy.
18. A payable balance must not be paid twice.
19. Customers must be shown the applicable fees and total payable amount before purchase.
20. Organiser privileges must not be granted merely because an application was submitted.
21. Administrative actions must be subject to permissions and appropriate audit logging.
22. Account deletion must respect applicable legal retention obligations.
23. Sensitive identity and payment information must be appropriately protected.
24. Mandatory legal requirements take precedence over conflicting business policies.
25. Redis, frontend state, and payment-provider callbacks must not independently override authoritative database business records.

---

# 23. MVP Scope

The first release should focus on a reliable end-to-end ticketing workflow.

## 23.1 Included in the initial scope

### Identity and roles
- Customer registration and login.
- Email verification and password recovery.
- Customer dashboard.
- Organizer application.
- Organizer verification and approval.
- Role-based backend access control.
- Admin dashboard and permissions.

### Events
- Event draft creation.
- Ticket types and inventory.
- Event submission for review.
- Mandatory administrative event approval.
- Event publication.
- Event suspension and reinstatement.
- Event cancellation.
- Customer notifications for material event changes.

### Ticket sales
- Public discovery of published events.
- Mandatory customer login for checkout.
- Free and paid orders.
- Inventory reservations.
- Configurable platform fees.
- Payment initiation and verification.
- Ticket issuance.
- QR-code validation and check-in.

### Financial operations
- Order and transaction records.
- Platform-fee snapshots.
- Refund workflows.
- Configurable settlement policies.
- Payout eligibility and status tracking.
- Basic financial reconciliation.
- Auditable financial history.

### Compliance and operations
- Privacy notice and terms integration.
- Data-retention and account-deletion workflows.
- Secure access controls.
- Audit logs.
- Error monitoring and backups.
- Complaint reporting and handling.
- Required legal and payment-provider reviews before real-money launch.

## 23.2 Deferred or expandable functionality

The following can be introduced after the core workflow is reliable:
- Advanced analytics.
- Promotional campaigns and discount codes.
- Referral programmes.
- Multiple currencies.
- Complex tax calculations.
- Advanced organiser teams and permissions.
- Multiple payment providers.
- Advanced fraud scoring.
- Automated identity-verification integrations.
- Advanced customer segmentation.
- Mobile applications.
- Sophisticated settlement and reserve models.

Deferring these features must not weaken the security, correctness, or compliance of the initial release.

---

# 24. Acceptance Criteria

The platform is not ready for a production launch until the applicable requirements below have been satisfied.

## 24.1 Identity and permissions

- Customers can register with the required fields.
- Customers must authenticate before checkout.
- Users cannot access another customer's private orders or tickets.
- An organiser applicant cannot use organiser functionality before approval.
- Organisers cannot bypass administrative event approval.
- Administrative permissions are enforced by the backend.
- Account deletion follows the documented retention policy.

## 24.2 Events and inventory

- An event cannot be published without the required approval.
- Suspended and cancelled events cannot accept new purchases.
- Suspension reasons and histories are visible to authorised administrators.
- Concurrent purchases cannot exceed inventory.
- Repeated ticket-type entries cannot bypass purchase limits.
- Expired reservations are released safely.
- Free and paid orders both respect inventory limits.

## 24.3 Payments and tickets

- Paid orders cannot be confirmed without verified payment.
- Payment references and amounts are checked against trusted provider information.
- Duplicate webhook deliveries do not duplicate financial effects.
- Network failures can be recovered through verification and reconciliation.
- Tickets are issued only when the order qualifies.
- Repeated background jobs do not issue duplicate tickets.
- Check-in prevents duplicate successful scans.

## 24.4 Fees, refunds, and payouts

- Customers see the ticket subtotal, platform fee, and total payable amount.
- Every order retains the fee calculation applicable at checkout.
- Fee changes do not silently recalculate existing orders.
- Refund calculations follow the applicable policy and law.
- Refund requests and completed refunds are distinguishable.
- Payout eligibility follows the configured settlement policy.
- A payable balance cannot be paid twice.
- Financial records can be reconciled against provider records.
- Exceptional financial adjustments are auditable.

## 24.5 Compliance and operations

- Applicable privacy and consumer-protection requirements have been reviewed.
- Relevant legal terms and customer policies are available.
- Payment and payout arrangements have been reviewed before real-money launch.
- Sensitive personal information is protected by appropriate access controls.
- Data-retention and breach-response procedures are documented.
- Backups and restoration procedures have been tested.
- Critical business workflows have automated tests.
- Failed payment, refund, payout, and background-job operations can be investigated.

---

# 25. Resolved Business Decisions Register

The following decisions have been reviewed, agreed upon, and formally recorded as the project baseline.

| ID | Decision | Status | Agreed Position |
|---|---|---|---|
| DEC-001 | Platform fee calculation | **Decided** | Admin-configurable percentage fee on ticket sales (default: 5% / 500 basis points). Schema supports optional fixed-kobo component. |
| DEC-002 | Fee scope & free events | **Decided** | Evaluated at order level across ticket subtotal. Free tickets/orders (₦0 subtotal) strictly incur ₦0 platform fee. |
| DEC-003 | Fee rounding | **Decided** | Integer kobo precision (`bigint`), standard half-up rounding. Snapshotted immutably on order creation. |
| DEC-004 | Customer-requested refunds | **Decided** | Purchases are final and non-refundable by default. No automated self-service refund. Discretionary cases handled manually via admin support; if approved, ticket face value refunded, platform fee retained. |
| DEC-005 | Rescheduled event refunds | **Decided** | Existing tickets transfer to new date; ticket holders granted a 7-day refund window (or up to 48h before event) to request a ticket-price refund; platform fee retained. |
| DEC-006 | Refund processing deadlines | **Decided** | 24-hour internal platform submission SLA; 5–10 business days bank settlement notice; automated alerts flag stalled refunds after 72 hours. |
| DEC-007 | Settlement period & milestone | **Decided** | Dynamic admin-configurable milestone relative to event start date (e.g. 2–5 days before the event to provide organizer production liquidity, or post-event if configured). |
| DEC-008 | Payout workflow & approval | **Decided** | Manual, administrator-approved payouts in MVP. Eligible requests are calculated and require explicit admin review before transfer execution. |
| DEC-009 | Payout reserve & risk rules | **Decided** | Configurable pre-event disbursement cap (default: up to 70%–80% released pre-event; 20%–30% reserve held until 24–48h post-event). Minimum payout ₦2,000. Manual admin risk holds. |
| DEC-010 | Payment-provider funds flow | **Decided** | Merchant of Record (Direct Platform Collection). All checkout payments flow into the platform gateway account (Paystack/Flutterwave). No checkout split payments. Payouts via Transfers API. |
| DEC-011 | Organizer verification | **Decided** | Individuals: NIN, DOB, phone, and NUBAN bank account with matching legal name. Businesses: CAC RC/BN, TIN, and matching corporate bank account. Verified via lookup APIs; documents stored in private encrypted S3. |
| DEC-012 | Post-approval edits & re-review | **Decided** | Low-risk edits (descriptions, FAQs, banners) permitted directly. High-risk edits (dates, venue/city, tier prices/capacities on active tiers) force formal admin rescheduling review. |
| DEC-013 | Event suspension | **Decided** | Admin-initiated only with mandatory justification reason. Ticket sales and reservations halted immediately. Reinstated only by administrator. |
| DEC-014 | Remedies after suspension | **Decided** | If an event remains suspended for >14 calendar days or within 48h of scheduled start time, alerts trigger mandatory resolution or forced cancellation and refunds. |
| DEC-015 | Customer account deletion | **Decided** | Deletion is blocked if user holds valid tickets to upcoming events. Once eligible, personal data is permanently anonymized, while financial transaction and ledger rows are retained under anonymous IDs for statutory 6-year period. |
| DEC-016 | Ticket reservation duration | **Decided** | 10-minute reservation hold, with a 5-minute grace buffer upon initiating payment gateway redirect. Released to public pool on expiry. |
| DEC-017 | Purchase limits | **Decided** | Default maximum of 10 tickets per order, and a global cap of 20 tickets per customer per event. |
| DEC-018 | Complaint handling | **Decided** | In-app support case submission and administrative tracking with status progression (`open`, `investigating`, `resolved`, `closed`). |
| DEC-019 | Tax and accounting obligations | **Decided** | Double-entry financial journal (`debits equal credits`) tracking clearing, fees, liabilities, and payouts. Provisional ledger reviewed by certified accountant before Phase 9. |
| DEC-020 | Legal & regulatory compliance | **Decided** | Full alignment with NDPA/NDPR (privacy), FCCPA (consumer pricing disclosures & remedies), and CBN/fintech regulations. |
| DEC-021 | Event cancellation authority | **Decided** | Organiser may cancel directly only if 0 tickets sold. If tickets have been sold, organiser submits cancellation request requiring admin approval to trigger customer refunds. Admin retains emergency direct cancel authority. |
| DEC-022 | Late payment recovery | **Decided** | If payment succeeds after reservation expiry: reclaim inventory if available; if sold out, flag order as `unfulfillable_late_payment` and automatically execute a 100% full refund (ticket + fee). Payments on cancelled events refunded 100%. |
| DEC-023 | Email verification requirement | **Decided** | Mandatory customer email verification (OTP or verification link) before ticket checkout can be completed. |
| DEC-024 | Gate check-in roles | **Decided** | Primary organiser check-in, plus event-specific time-bound Check-in Scanner PIN/token for ushers and gate staff. Full multi-tier team management deferred to post-MVP. |
| DEC-025 | Legacy cutover model | **Decided** | Clean cutover with parallel operation. Legacy platform runs existing scheduled events to completion; no dirty legacy data migration into the new database. |
| DEC-026 | Per-ticket attendee data | **Decided** | Under NDPR data minimisation, all tickets in an order default to the purchaser's name. Each ticket has a unique signed QR credential. Per-guest name customization deferred to post-MVP. |
| DEC-027 | Publication trigger | **Decided** | Decoupled from approval. Admin approval sets status to `approved`; organiser explicitly triggers publication via `POST /organizer/events/:id/publish` to launch ticket sales. |

Any change to these decided policies that affects existing orders, financial balances, or customer rights must be handled through explicit, auditable rules.

---

# 26. Implementation Principles

The business requirements must guide implementation without forcing premature architectural complexity.

The recommended approach is a modular monolith with clear boundaries between identity, events, ticket inventory, orders, payments, tickets, refunds, payouts, notifications, and administration.

Implementation should follow these principles:

1. Define the business rules before implementing the relevant feature.
2. Use PostgreSQL as the authoritative source for persistent business state.
3. Use database transactions and constraints for critical invariants.
4. Treat external provider calls as operations that can fail independently.
5. Design payment, refund, and payout operations for idempotency and reconciliation.
6. Represent important business lifecycles explicitly.
7. Validate inputs at API boundaries.
8. Separate business logic from route handlers and presentation logic.
9. Test failure scenarios and concurrency, not only successful flows.
10. Review security and privacy implications before introducing new data collection.
11. Record significant administrative and financial decisions.
12. Keep technical implementation choices separate from business-policy decisions.

## 26.1 Required implementation documentation

Before or during the relevant implementation stages, maintain:
- Target architecture.
- Database and entity relationship design.
- API contract.
- Business-state transition definitions.
- Financial calculation and accounting rules.
- Data-retention and privacy design.
- Security and authorisation model.
- Test strategy.
- Deployment and recovery documentation.

---

# 27. Final Business Principle

The platform must be trustworthy for customers, organisers, and its operator.

Its success depends not only on attractive interfaces and convenient features, but also on the correctness of ticket inventory, payment verification, fee calculations, refunds, payouts, permissions, and customer communications.

**When a financial, inventory, security, or customer-rights decision is uncertain, the system must fail safely, preserve the evidence, and provide a recoverable path rather than silently assuming success.**

This document is the working business baseline for the Event Ticketing Platform reengineering project. It should be updated as open decisions are resolved and validated against the final architecture before production deployment.
