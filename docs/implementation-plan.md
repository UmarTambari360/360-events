# Implementation Plan
## 360Events — Event Ticketing Platform Reengineering

| | |
|---|---|
| **Document version** | 0.1.0 |
| **Status** | Proposed — for owner review before Phase 0 begins |
| **Prepared** | 28 October 2026 |
| **Primary sources** | `docs/business-requirements-and-rules.md` v0.2.0 (**BR**) and `docs/architecture.md` v0.1.0 (**ARCH**) |
| **Purpose** | Turn BR and ARCH into an ordered, verifiable execution plan |
| **Not in scope** | Application code, schema definitions and API specifications. These are produced task by task, under this plan. |

---

# 1. How to Use This Plan

## 1.1 Authority and precedence

- BR decides **what** the platform must do. ARCH decides **how** it is structured. This plan decides **in what order** and **how we know each step is done**.
- This plan never overrides BR or ARCH. Where the two documents conflict, are silent, or are ambiguous, the issue is listed in [Section 3](#3-conflicts-gaps-and-ambiguities-in-the-source-documents) with a proposed resolution. A proposed resolution is **not** a decision until the owner accepts it and it is recorded in `docs/decision-register.md`.
- Where this plan departs from ARCH's suggested implementation order (ARCH §24), the departure is labelled **Departure** in Section 3 and needs explicit owner approval.

## 1.2 Conventions

| Convention | Meaning |
|---|---|
| **Task ID** | `P{phase}-T{nn}`, for example `P6-T02`. IDs are stable. If a task is split, use `P6-T02a`, `P6-T02b`. |
| **MVP** | In scope for the first release (BR §23.1). |
| **MVP-conditional** | In MVP, but cannot be finished until a named open decision is resolved. It may be built against a *provisional default* in development and staging only. It cannot reach production until the decision is recorded. |
| **Launch gate** | Must be satisfied before real money moves. All launch gates are consolidated in Phase 11. |
| **Size** | **S** ≤ half a day, **M** 1–2 days, **L** 3–5 days of focused work including tests. A task larger than L must be split before it starts. |
| **Review level** | **R1** author review plus green CI. **R2** line-by-line human review of code *and* tests before merge (money, inventory, security, concurrency). **R3** R2 plus sign-off from an external expert (accountant, lawyer or security reviewer) on the named artefact. |
| **Invariant tags** | Tests that protect a BR §22 invariant carry `[INV-nn]` in their name. Section 9.3 maps every invariant to the tasks that enforce and test it. |
| **Naming** | Code, database, API paths and file names use US `organizer`, matching ARCH §14. Prose may use either spelling. |
| **Tooling** | TypeScript (strict) and **pnpm only**. Never `npm` or `npx` for installs, and no second lockfile. |

## 1.3 Task card fields

Every task below has these fields. A task is not ready to start unless all of them can be filled in.

- **Depends on**: hard prerequisites that must be *done*, not merely started.
- **Needs decision**: decision IDs that must be resolved, or recorded as a provisional default, before starting.
- **Objective**: one sentence stating the outcome.
- **Scope / Out of scope**: the boundary the AI assistant and reviewer must respect.
- **Acceptance criteria**: observable and testable statements.
- **Testing**: the tests that must exist, with the negative, authorisation and concurrency cases named.

---

# 2. Planning Principles

1. **Order by dependency, then by risk.** Foundations, identity, events, inventory, payments, refunds and payouts, in that order. Each layer is safe to build on only after the layer below has been verified.
2. **Vertical, verifiable slices.** Each phase ends with something observable: an endpoint, a job, a screen, a passing concurrency test. Nothing is "done" because code exists.
3. **Correctness before convenience.** Money, inventory, authentication and authorisation tasks carry R2 or R3 review and must have tests written (or at least listed) before the implementation.
4. **Decisions are late-bound, but never skipped.** We build against provisional defaults in development. Nothing reaches production until the owner records the decision.
5. **No silent invention.** If implementing a task needs a business rule that BR does not state, the work stops and the question is added to the decision register.
6. **Small tasks.** One task is one branch, one reviewable diff and one session of AI-assisted work.
7. **Backend enforces, frontend presents.** Every frontend slice follows a backend contract that has already been tested (ARCH §15.2).
8. **The legacy system stays untouched** until the new platform is independently functional and verified (Section 11).

---

# 3. Conflicts, Gaps, and Ambiguities in the Source Documents (Resolved)

These items were identified across BR, ARCH, and IMPL, reviewed in detail, and agreed upon with the project owner. All items are now formally resolved and form the working system baseline.

| ID | Type | Finding | Confirmed Resolution | Status |
|---|---|---|---|---|
| C-01 | Departure | ARCH §24 scheduled the worker and outbox late, but email verification and reservation expiry need durable background work early. | Build shared core services (jobs, outbox, audit, idempotency, email, security rate limiting) in **Phase 2**, before identity and events. | **Resolved** |
| C-02 | Departure | ARCH §9.3 records ledger effects at payment confirmation, but ARCH §24 scheduled ledger in Stage 7. | Build a **minimal double-entry ledger** in `P7-T02` atomically with payment capture. Complete in `P8-T07`. Certified accountant review before Phase 9 payouts. | **Resolved** |
| C-03 | Departure | Audit logging was listed under Administration, but role and privilege changes require it from day one. | Build audit logging in `P2-T03`, before any administrative or role operations exist. | **Resolved** |
| C-04 | Gap | Browser session model was unresolved in ARCH §16.2. | Implement server-side sessions: opaque tokens stored hashed (`SHA-256`) in PostgreSQL, delivered via `HttpOnly`, `Secure`, `SameSite=Lax` cookies under `.360events.ng` (ADR-018, ADR-019). | **Resolved** |
| C-05 | Gap | BR §7.2 separates approval from publication; ARCH §14.2 had no publish endpoint. | Added `POST /api/v1/organizer/events/:id/publish`. Approval (`approved`) and publication (`published`) are separate transitions (DEC-027). | **Resolved** |
| C-06 | Ambiguity | BR §21.2 left post-approval edit rules open. | Low-risk edits (descriptions, FAQs, banners) permitted directly. High-risk edits (date/time, venue/city, tier prices/capacities on active tickets) force a formal rescheduling review (DEC-012). | **Resolved** |
| C-07 | Ambiguity | BR §3.2/7.5 require cancellation approval; ARCH §14.2 exposed direct organizer cancellation. | Organiser may cancel directly only if **0 tickets sold**. If tickets sold, organiser submits cancellation request requiring admin approval to trigger customer refunds (DEC-021). Admin retains emergency direct cancel authority. | **Resolved** |
| C-08 | Ambiguity | Suspension initiator and long-term remedies were open. | Strictly administrator-initiated (`POST /admin/events/:id/suspend`) with mandatory reason (DEC-013). Prolonged suspension >14 days or within 48h of start triggers alert for mandatory reinstatement or forced cancellation/refunds (DEC-014). | **Resolved** |
| C-09 | Conflict | BR §9.5 mixed refund states into order status and omitted `expired`/`failed`. Payment states conflicted. | Decouple entities (ADR-011): Order status (`pending`, `confirmed`, `completed`, `cancelled`, `expired`); Payment attempt status (`pending`, `processing`, `successful`, `failed`, `pending_verification`, `abandoned`); separate `refunds` ledger with derived order summary (`refund_status: none/partial/full`). | **Resolved** |
| C-10 | Gap | ARCH §7.5 warned about payment success arriving after reservation expiry or event disruption. | Bounded 5-min extension while in payment. Late payment reclaims inventory if available; if sold out, marks `unfulfillable_late_payment` and automatically executes **100% full refund** (DEC-022). Payments on cancelled events refunded 100%. | **Resolved** |
| C-11 | Ambiguity | BR §13.4 fee retention rule on refunds was ambiguous across different scenarios. | Fee retained on organizer cancellations, customer support refunds, and rescheduling. 100% full refund (ticket + fee, absorbed by platform) on duplicate payments, late payments, and system faults. Free tickets incur ₦0 fee. | **Resolved** |
| C-12 | Gap | BR §9.1/§22 require price breakdown before purchase; ARCH §14.2 lacked quote endpoint and price protection. | Add stateless `POST /api/v1/orders/quote`. Order creation accepts `expectedTotalKobo` shown to user; server rejects with `409 PRICE_CHANGED` if prices/fees shifted. | **Resolved** |
| C-13 | Ambiguity | BR §12.3 mentioned check-in staff, but BR §23.2 deferred organizer team permissions. | MVP check-in is supported for the primary organiser and delegated gate ushers via a lightweight, time-bound **Check-in Scanner PIN/token** per event (`POST /checkin/scan`) (DEC-024). Full team hierarchy is post-MVP. | **Resolved** |
| C-14 | Gap | BR §3.3/§19.3 required restricted admin permissions and stronger authentication; ARCH lacked both. | Implement granular permissions (`events:approve`, `finance:payout:approve`, `users:manage`) and mandatory **TOTP MFA** + password re-entry for high-risk actions (`P4-T04`). | **Resolved** |
| C-15 | Gap | ARCH had no object-storage component for banners and KYC documents. | Partitioned S3 storage (ADR-022): public S3 bucket for event banners/media; encrypted private S3 bucket with short-lived presigned URLs for organizer KYC evidence. | **Resolved** |
| C-16 | Ambiguity | In-app notifications vs email. | MVP is transactional email + status in web dashboards. In-app notification inbox is deferred to post-MVP. | **Resolved** |
| C-17 | Gap | BR §16.3/§23.1 required complaint handling; ARCH had no endpoints. | Add minimal support-case capability in `P10-T01` (`POST /api/v1/support/complaints`, `GET /api/v1/admin/complaints`). | **Resolved** |
| C-18 | Gap | ARCH §14.2 omitted critical operational endpoints. | Complete API surface added to ARCH §14.2 (quotes, ticket types, publish, reschedule, cancellation requests, gate PIN, support cases, deletion). | **Resolved** |
| C-19 | Ambiguity | Redis necessity in MVP. | **Omit Redis from MVP** (ADR-020). PostgreSQL handles sessions, inventory locking, and transactional outbox. Revisit post-MVP if clustering requires caching. | **Resolved** |
| C-20 | Conflict risk | Platform funds flow and settlement model was open (DEC-010). | **Merchant of Record (Direct Platform Collection)** confirmed. All payments flow into platform gateway account. Payouts disbursed via Transfers API. Provider split payments prohibited. | **Resolved** |
| C-21 | Gap | Legacy data migration vs clean cutover. | **No legacy data migration in MVP** (DEC-025). Parallel operation: legacy runs existing events to completion; new platform launches with clean database and strict invariants. | **Resolved** |
| C-22 | Ambiguity | Email verification recommended vs required before checkout. | Verified email is **strictly required** before ticket checkout can be completed (DEC-023). | **Resolved** |
| C-23 | Departure | Deployment configuration scheduled late in ARCH §24. | Deploy empty application skeletons to staging in `P1-T07`. Production hardening in `P11-T06`. | **Resolved** |
| C-24 | Departure | ARCH §24 scheduled frontend in Stage 9; BR required dashboards in MVP. | Build a **frontend slice** at the end of each backend phase against the frozen API contract. Phase 10 completes accessibility and polish. | **Resolved** |
| C-25 | Ambiguity | Account deletion vs active tickets and statutory retention. | Deletion blocked if active upcoming tickets exist. Once eligible, personal data is permanently anonymized, while financial transaction and ledger rows are preserved for statutory 6-year period (DEC-015). | **Resolved** |
| C-26 | Ambiguity | Attendee personal data collection per ticket. | All tickets default to purchaser's name under NDPR data minimisation (DEC-026). Each ticket receives a unique cryptographically signed credential. Per-guest name entry is post-MVP. | **Resolved** |
| C-27 | Ambiguity | Working project name. | "360Events" confirmed as working project name across documentation and repository. | **Resolved** |

---

# 4. Decisions That Must Be Finalised (Decided Baseline)

## 4.1 Business decisions register

All business decisions (DEC-001 through DEC-027) have been formally agreed upon and locked as the system baseline.

| ID | Decision | Agreed Position (Decided Baseline) |
|---|---|---|
| DEC-001 / 002 / 003 | Fee calculation, scope & rounding | Admin-configurable percentage fee (default 5% / 500 basis points) on order ticket subtotal, rounded half-up to nearest kobo (`bigint`). Free tickets strictly incur ₦0 fee. Snapshotted immutably on order creation. |
| DEC-004 | Customer-requested refunds | Purchases are final and non-refundable by default. No automated self-service refund. Discretionary cases handled manually via admin support; if approved, ticket face value refunded, platform fee retained. |
| DEC-005 | Refunds for rescheduled events | Existing tickets transfer to new date; ticket holders granted a 7-day refund window (or up to 48h before event) to request a ticket-price refund; platform fee retained. |
| DEC-006 | Refund deadlines & SLAs | 24-hour internal platform submission SLA; 5–10 business days bank settlement notice; automated alerts flag stalled refunds after 72 hours. |
| DEC-007 | Settlement period and milestone | Dynamic admin-configurable milestone relative to event start date (e.g. 2–5 days before the event to provide organizer production liquidity, or post-event if configured). |
| DEC-008 | Payout workflow and approval | Manual, administrator-approved payouts in MVP. Eligible requests are calculated and require explicit admin review before transfer execution via Transfers API. |
| DEC-009 | Payout reserve and risk rules | Configurable pre-event disbursement cap (default: up to 70%–80% released pre-event; 20%–30% reserve held until 24–48h post-event). Minimum payout ₦2,000. Manual admin risk holds. |
| DEC-010 | Payment-provider funds flow | Merchant of Record (Direct Platform Collection). All checkout payments flow into the platform gateway account (Paystack/Flutterwave). No checkout split payments. Payouts via Transfers API. |
| DEC-011 | Organizer verification requirements | Individuals: NIN, DOB, phone, and NUBAN bank account with matching legal name. Businesses: CAC RC/BN, TIN, and matching corporate bank account. Verified via lookup APIs; documents stored in private encrypted S3. |
| DEC-012 | Re-review rules for post-approval edits | Low-risk edits (descriptions, FAQs, banners) permitted directly. High-risk edits (dates, venue/city, tier prices/capacities on active tiers) force formal admin rescheduling review. |
| DEC-013 | Event suspension rules | Admin-initiated only with mandatory justification reason. Ticket sales and reservations halted immediately. Reinstated only by administrator. |
| DEC-014 | Remedies after prolonged suspension | If an event remains suspended for >14 calendar days or within 48h of scheduled start time, alerts trigger mandatory resolution or forced cancellation and refunds. |
| DEC-015 | Account-deletion treatment of tickets & records | Deletion is blocked if user holds valid tickets to upcoming events. Once eligible, personal data is permanently anonymized, while financial transaction and ledger rows are retained under anonymous IDs for statutory 6-year period. |
| DEC-016 | Ticket reservation duration | 10-minute reservation hold, with a 5-minute grace buffer upon initiating payment gateway redirect. Released to public pool on expiry. |
| DEC-017 | Purchase limits | Default maximum of 10 tickets per order, and a global cap of 20 tickets per customer per event. |
| DEC-018 | Complaint handling and targets | In-app support case submission and administrative tracking with status progression (`open`, `investigating`, `resolved`, `closed`). |
| DEC-019 | Tax and accounting obligations | Double-entry financial journal (`debits equal credits`) tracking clearing, fees, liabilities, and payouts. Minimal ledger built in Phase 7; reviewed by certified accountant before Phase 9. |
| DEC-020 | Legal and regulatory compliance | Full alignment with NDPA/NDPR (privacy), FCCPA (consumer pricing disclosures & remedies), and CBN/fintech regulations. |
| DEC-021 | Event cancellation authority | Organiser may cancel directly only if 0 tickets sold. If tickets have been sold, organiser submits cancellation request requiring admin approval to trigger customer refunds. Admin retains emergency direct cancel authority. |
| DEC-022 | Late payment & disruption recovery | If payment succeeds after reservation expiry: reclaim inventory if available; if sold out, flag order as `unfulfillable_late_payment` and automatically execute a 100% full refund (ticket + fee). Payments on cancelled events refunded 100%. |
| DEC-023 | Verified email required before purchase | Mandatory customer email verification (OTP or verification link) before ticket checkout can be completed. |
| DEC-024 | Gate check-in roles in MVP | Primary organiser check-in, plus event-specific time-bound Check-in Scanner PIN/token for ushers and gate staff. Full multi-tier team management deferred to post-MVP. |
| DEC-025 | Legacy cutover model | Clean cutover with parallel operation. Legacy platform runs existing scheduled events to completion; no dirty legacy data migration into the new database. |
| DEC-026 | Attendee data per ticket | Under NDPR data minimisation, all tickets in an order default to the purchaser's name. Each ticket has a unique signed QR credential. Per-guest name customization deferred to post-MVP. |
| DEC-027 | Publication trigger | Decoupled from approval. Admin approval sets status to `approved`; organiser explicitly triggers publication via `POST /api/v1/organizer/events/:id/publish` to launch ticket sales. |

## 4.2 Technical decisions (ADR Register)

ARCH's baseline ADR-001 through ADR-017 and new decisions ADR-018 through ADR-030 are formally accepted:

| ADR | Decision | Confirmed Architecture | Status |
|---|---|---|---|
| ADR-018 | Authentication and session model | Server-side sessions: opaque tokens stored **hashed (SHA-256)** in PostgreSQL and transmitted via `HttpOnly`, `Secure`, `SameSite=Lax` cookies. Instant revocation; no bearer tokens in `localStorage`. | **Accepted** |
| ADR-019 | Deployment topology and domains | Web and API under one registrable domain (`app.360events.ng` and `api.360events.ng` sharing `.360events.ng`) ensuring native same-site cookie behaviour. Separate worker service; managed PostgreSQL. | **Accepted** |
| ADR-020 | Redis and rate-limiting store | **Omit Redis from MVP**. In-process limits plus PostgreSQL-backed counters for auth endpoints. PostgreSQL handles sessions, reservations, and outbox tables. | **Accepted** |
| ADR-021 | Job runner & Outbox | PostgreSQL-backed transactional outbox table committing atomically with business entities. Durable worker consumes jobs using `FOR UPDATE SKIP LOCKED`. | **Accepted** |
| ADR-022 | Object storage architecture | S3-compatible storage partitioned into **public media** (event banners) and **private encrypted KYC storage** accessible only via short-lived administrative presigned URLs. | **Accepted** |
| ADR-023 | Identifiers | UUIDv7 primary keys (time-ordered) for all database rows. Non-sequential, human-readable alphanumeric order reference numbers for customers. | **Accepted** |
| ADR-024 | Money representation | `bigint` kobo in PostgreSQL. TypeScript `Money` primitive with safe-integer checks and half-up rounding. Floats strictly prohibited. | **Accepted** |
| ADR-025 | Test stack | Vitest, supertest, real PostgreSQL container for transaction and concurrency tests, and Playwright for end-to-end browser tests. Mocked databases prohibited for concurrency tests. | **Accepted** |
| ADR-026 | Ticket credential scheme | Cryptographic credential derived as `HMAC(server_key, ticket_id ‖ version)` verified against database; instant revocation upon refund or cancellation. | **Accepted** |
| ADR-027 | Financial ledger model | Append-only double-entry journal with strict "debits equal credits" database invariant. Minimal ledger built in `P7-T02` with payment capture; R3 accountant review before Phase 9. | **Accepted** |
| ADR-028 | API conventions | Uniform error envelope (ARCH §14.3), cursor pagination, `Idempotency-Key` header, UTC ISO-8601 timestamps, integer kobo pricing. | **Accepted** |
| ADR-029 | Runtime versions | Active LTS Node.js (Node 22 LTS or newer active release) and pnpm 9+. | **Accepted** |
| ADR-030 | Email provider & sending domain | Dedicated transactional email provider with verified SPF, DKIM, and DMARC DNS records. Reviewed under NDPR as data processor. | **Accepted** |

## 4.3 Prerequisites

**Accounts and access (start in Phase 0, because several have lead times):**
- Payment provider: test-mode account now, and start the business verification needed for live mode. Confirm which capabilities are enabled (refunds, transfers or payouts, splits). *Long lead time.*
- Email provider, sending-domain DNS access and a staging mailbox.
- Source hosting with branch protection, a CI runner, error-monitoring workspace, and staging and production hosting accounts.
- Object storage (only once ADR-022 is accepted).

**People (engage early; none block Phase 1):**
- Nigerian counsel for data protection, consumer protection and payment regulation.
- An accountant for the ledger, tax and funds-flow questions.
- A security reviewer for `P11-T01`.

**Local tooling:** Active LTS Node.js, pnpm through Corepack, Docker with Compose, a PostgreSQL major version used identically in local, CI, staging and production, Git, and a mail-catcher for development.

---

# 5. Phase Overview

| Phase | Name | ARCH stage | Delivers | Proceed to the next phase only when |
|---|---|---|---|---|
| 0 | Decisions, prerequisites and legacy protection | — | ADRs, decision register, state machines, design baselines, legacy frozen | Foundational ADRs accepted; legacy tagged and isolated |
| 1 | Foundation | 1 | Workspace, API, worker and web skeletons, DB and migrations, CI, staging | `pnpm verify` green in CI; skeleton deployed to staging |
| 2 | Shared core services | *(new)* | Money, state machines, audit, jobs and outbox, idempotency, email, security middleware, authorisation framework | Core services pass their concurrency and failure tests |
| 3 | Identity and access | 2 | Registration, login, sessions, verification, recovery, roles | Server-side permissions enforced; identity test suite green |
| 4 | Organizer onboarding and admin foundation | 3 | Applications, admin review, role activation, admin MFA | No path to organizer privileges without approval |
| 5 | Events and ticket types | 4 | Drafts, ticket types, review, publication, suspension, cancellation transitions | Only approved, eligible events are publishable |
| 6 | Inventory, pricing and orders | 5 | Fee engine, atomic reservations, order snapshots, free checkout, expiry | Concurrency suite proves no overselling and no duplicate orders |
| 7 | Payments, tickets and check-in | 6 | Provider adapter, webhooks, verification, minimal ledger, tickets, check-in | Correct under retries, duplicates and injected failures |
| 8 | Refunds, cancellation consequences and reconciliation | 7 | Refund engine, execution, revocation, cancellation orchestration, reconciliation | Refunds cannot exceed eligibility and recover from partial failure |
| 9 | Settlement and payouts | 8 | Policies, payable calculation, holds, allocations, payouts | A payable balance cannot be paid twice; outcomes reconcile |
| 10 | Support, compliance features and UI completion | 9 | Complaints, deletion and data requests, retention, notifications, legal text | All MVP features present and verified end to end |
| 11 | Production readiness, pilot and cutover | 10 | Security review, load tests, backups, monitoring, pilot, cutover | All launch gates signed off |

## 5.1 Dependency structure

```text
P0 ──► P1 ──► P2 ──► P3 ──► P4 ──► P5 ──► P6 ──► P7 ──► P8 ──► P9 ──► P10 ──► P11
│                                          ▲      ▲      ▲      ▲
└── P0-T06: counsel, provider, accountant ─┴──────┴──────┴──────┘
          DEC-010 (funds flow) must be recorded before P7-T01

Each phase ends with a frontend slice. It starts only after that phase's API
contract is frozen and may overlap with the next phase's backend work.
```

**Critical path:** `P1-T01 → P1-T02 → P2-T04 → P3-T02 → P4-T03 → P5-T04 → P6-T02 → P6-T04 → P7-T05 → P8-T03 → P9-T06`.

**Parallel track (not on the code critical path, but able to block it):** DEC-010, the provider's live-mode approval, counsel and accountant input. Start these in Phase 0 and review their status at every phase checkpoint.

**Work-in-progress rule:** one active backend task at a time. Frontend slices and compliance work may run beside it.

---

# 6. MVP Scope Versus Later Enhancements

| Capability | MVP | Phase | Note |
|---|---|---|---|
| Registration, login, email verification, password recovery | Yes | 3 | |
| Customer profile and account-deletion *request* | Yes | 3 | Full deletion in Phase 10 |
| Organizer application, review, approval | Yes | 4 | Manual review; automated ID verification is later |
| Admin permissions, MFA, audit log | Yes | 2, 4 | Launch gate |
| Event drafts, ticket types, review, publication | Yes | 5 | |
| Suspension, reinstatement, cancellation, rescheduling | Yes | 5, 8 | Remedies depend on DEC-005, DEC-014 |
| Free and paid checkout, reservations, limits | Yes | 6, 7 | |
| Configurable platform fee with snapshots | Yes | 6 | Fee values await DEC-001 to DEC-003 |
| Payment initiation, webhooks, verification | Yes | 7 | Paystack first, behind an adapter |
| Tickets, QR validation, check-in | Yes | 7 | Organiser check-in & gate scanner PIN (DEC-024) |
| Refunds on organizer cancellation | Yes | 8 | Fee-retention rule confirmed (DEC-004 to DEC-006) |
| Customer-requested refunds | Conditional | 8 | Needs admin support review (DEC-004) |
| Ledger and reconciliation | Yes | 7, 8 | Minimal ledger in P7, accountant review |
| Settlement policy, payouts | Yes | 9 | Confirmed baseline (DEC-007 to DEC-010) |
| Complaints and support cases | Yes | 10 | Minimal support tracking |
| Retention, deletion, data-subject requests | Yes | 10 | Irreversible anonymisation (DEC-015) |
| Email notifications | Yes | 2, 10 | Transactional email |
| Dashboards (customer, organizer, admin) | Yes | each phase, 10 | |
| Redis, in-app notifications, advanced multi-tier team permissions, per-ticket attendee names | **No** | — | Deferred post-MVP (ADR-020, DEC-024, DEC-026) |
| Promotions, referrals, multiple currencies, tax engine, multiple providers, fraud scoring, mobile apps, analytics | **No** | — | BR §23.2 |

Deferring a feature must never weaken security, correctness or compliance (BR §23.2).

---

# 7. Working Agreement for AI-Assisted Development

## 7.1 Task protocol

1. **One task per session and per branch** (`p6-t02-atomic-reservation`). The task card is the entire scope.
2. **Give the assistant** the task card, the relevant sections of BR and ARCH, the relevant state machine from `docs/state-machines.md`, and the existing files it will touch. Do not ask it to "read everything".
3. **Tests first for R2 and R3 tasks.** The assistant proposes the test list, with expected outcomes written down, and the owner approves that list *before* any implementation.
4. **The assistant may not** invent business rules, add dependencies, change files outside the task's scope, use `any`, bypass the validation or authorisation layers, or install packages with anything other than pnpm. If it needs any of these, it stops and asks.
5. **Every PR describes** what changed, why this design was chosen, and which acceptance criteria and invariant tags it satisfies. The "why" paragraph is the learning record for this project.

## 7.2 Definition of Ready

- Dependencies are done and merged.
- Required decisions are resolved, or a provisional default is recorded.
- Acceptance criteria are testable and the test list exists.
- Size is S, M or L. Anything larger is split first.

## 7.3 Definition of Done

- Every acceptance criterion is demonstrably met.
- Tests exist for the success path, negative paths, authorisation (a different user, a different organiser, an unauthenticated caller) and, where listed, concurrency and failure.
- `pnpm verify` (lint, typecheck, unit tests, integration tests, build) is green locally and in CI.
- No `any`, and no unexplained type assertions or lint suppressions.
- Migrations are reviewed and run cleanly on an empty database and on the previous schema.
- Logs and audit records contain no passwords, tokens, secrets or unnecessary personal data.
- `docs/state-machines.md`, `docs/database-design.md` and `docs/api-contract.md` are updated if the task touched them.
- The required review level (R1, R2 or R3) has been completed.

## 7.4 Stop-the-line triggers

Stop and escalate to the owner, rather than working around the problem, when:
- A required business rule is missing or two documents disagree.
- A test reveals overselling, a duplicate financial effect or an authorisation bypass.
- A provider's actual behaviour differs from the assumption in the task (for example, it lacks idempotency keys).
- A task is growing past L.

## 7.5 Phase checkpoint ritual

At the end of every phase:
1. Walk the phase exit checklist item by item.
2. Run the full test suite, including the concurrency suites, repeatedly. See Section 8.3.
3. Update the decision register and design documents.
4. Tag the repository `phase-N-complete`.
5. Record a short retrospective: what slowed us down, and which tasks were mis-sized.
6. Make an explicit go or no-go decision for the next phase.

---

# 8. Testing Strategy

## 8.1 Layers

| Layer | Purpose | Notes |
|---|---|---|
| Unit | Pure logic: money, fees, refunds, payable calculation, state transitions, policies | No provider calls and no network |
| Integration | Services against a real PostgreSQL: transactions, constraints, locking, idempotency, outbox | Mocks are insufficient for database concurrency (ARCH §19.2) |
| Contract | Provider adapter against the provider sandbox and the fake provider | Run on demand and nightly, not on every commit |
| Concurrency | Parallel callers against the same rows | Section 8.3 |
| Failure-path | Timeouts, crashes, duplicate delivery, partial success | A fake provider with fault injection |
| Security and authorisation | Every protected route, with an allowed role and with each disallowed role | Section 8.4 |
| End-to-end | The four journeys in ARCH §19.5, plus free checkout | Playwright against staging-like infrastructure |

## 8.2 Conventions

- Integration tests use committed data in an isolated database or schema. Concurrency tests cannot run inside a rolled-back test transaction.
- Time-dependent logic uses an injectable clock. Expiry, settlement and token tests never sleep for real time.
- Expected outcomes are **written before** the test is implemented (ARCH §19.3).
- Money tests use fixed golden vectors approved by the owner. Property-style tests check invariants such as "refunds never exceed paid".

## 8.3 Concurrency test pattern

1. Seed the exact scenario (for example, one ticket remaining).
2. Start N callers through separate database connections, released together.
3. Assert the **invariant**, not the order: exactly one success, all others receive the defined business error, and the database totals reconcile.
4. Re-assert from the database, not from the API response.
5. Repeat the scenario at least 20 times in a single run. A phase checkpoint requires the concurrency suite to pass repeatedly without flakiness. A flaky concurrency test is a bug in the code under test until proven otherwise.

## 8.4 Authorisation test matrix

The route registry from `P2-T08` is used to generate one test per protected route per role (anonymous, customer, unapproved applicant, organizer who owns the resource, organizer who does not, admin without the permission, admin with the permission). A route that is not registered with an explicit access policy fails the build.

## 8.5 Invariant traceability

Every BR §22 invariant has at least one test tagged `[INV-nn]` in the task that enforces it. Section 9.3 is the map, and the phase checkpoint confirms the tests exist and pass.

---

# 9. Compliance, Security, and Traceability

## 9.1 Nigerian regulatory and compliance workstream

This is a **parallel track**, not a phase. BR §18 states the platform owner is responsible for determining which obligations apply. The system's job is to *support* compliance with records, access controls, configurable policies and audit trails. Nothing here is legal advice. Counsel confirms applicability and wording.

| Obligation (BR reference) | What the system and process must provide | Tasks | Gate |
|---|---|---|---|
| Data minimisation (§18.2) | Registration limited to name, email and password, with phone optional. Proportionate organizer verification. No speculative data collection. | `P3-T01`, `P4-T01`, `P4-T02` | Review each new data field in its PR |
| Lawful basis, privacy notice, purpose limitation (§18.2) | Data inventory and a lawful-basis mapping per data category. Privacy notice that matches real behaviour. | `P0-T06`, `P10-T06` | Counsel review |
| Security of processing (§18.2, §18.5) | Controls in Section 9.2. Security review and testing. | Phases 1–9, `P11-T01` | Launch gate |
| Data-subject rights, deletion, retention (§5.3, §18.2) | Access and export, rectification, erasure with legal-retention exceptions, retention schedule and cleanup jobs. | `P3-T06`, `P10-T03`, `P10-T04` | DEC-015, counsel review |
| Third-party processors and cross-border handling (§18.2) | Processor register (hosting, database, email, payment provider, monitoring, storage). Contract and data-handling review. Counsel to assess any implications of processors or hosting located outside Nigeria. | `P0-T06`, `P11-T02` | Launch gate |
| Breach handling (§18.2) | Documented breach-response procedure with an assigned owner, and logs and audit data sufficient to investigate. Statutory notification deadlines to be confirmed by counsel. | `P11-T08` | Launch gate |
| Registration, audit and DPO obligations (§18.2) | Assessment of whether the platform is a data controller or processor of major importance, and of any registration, audit, reporting or DPO duty. Re-assess as the platform grows. | `P0-T06`, `P11-T02` | Launch gate |
| Price transparency and no hidden charges (§18.3) | Subtotal, fee and total shown before purchase. Same calculation for quote and order. | `P6-T01`, `P6-T04`, `P6-T09` | Phase 6 exit |
| Accessible cancellation and refund terms (§18.3, §13.1) | Terms and refund policy shown before purchase. Fee non-refundability disclosed prominently. | `P10-T06` | Counsel review |
| Legal enforceability of fee retention after organizer cancellation (§13.1, §18.3) | Refund policy engine driven by configuration so a legal change does not require a rewrite. | `P8-T01` | Counsel review (R3) |
| Complaints and records (§18.3) | Complaint capture, status, outcome history and retention. | `P10-T01` | DEC-018 |
| Payments and financial regulation, funds flow (§14.5, §18.4) | A recorded funds-flow decision, licensed providers only, reconciliation and fraud controls. | `P0-T06`, `P8-T08`, `P9-T07` | **DEC-010 before `P7-T01`** |
| Tax and accounting records (§18.4, DEC-019) | Ledger and records reviewed by an accountant. Reports exportable. | `P7-T02`, `P8-T07` | Accountant review (R3) |
| Terms, policies and agreements (§18.6) | Versioned documents with recorded acceptance. Policies must not promise features that do not exist. | `P10-T06` | Counsel review |
| Cybersecurity expectations (§18.5) | Rate limiting, validation, dependency updates, secrets handling, monitoring, incident process. | Phases 1–2, `P11-T01`, `P11-T04` | Launch gate |

## 9.2 Security and privacy controls: where each is introduced

| Control | Introduced | Re-verified |
|---|---|---|
| Fail-fast environment validation, no secret logging | `P1-T03` | `P11-T06` |
| PII-safe structured logging | `P1-T03` | Every PR (checklist), `P11-T01` |
| Database roles with least privilege | `P1-T02` (design), `P1-T07` (staging) | `P11-T06` |
| Immutable audit log | `P2-T03` | `P11-T01` |
| Security headers, CORS, body limits, rate limiting | `P2-T07` | `P11-T01` |
| Deny-by-default authorisation and route registry | `P2-T08` | Every phase exit |
| Password hashing, enumeration-safe responses | `P3-T01` | `P3-T07` |
| Session security and CSRF defences | `P3-T02` | `P3-T07`, `P11-T01` |
| Admin MFA and step-up confirmation | `P4-T04` | `P11-T01` |
| Webhook signature verification on the raw body | `P7-T04` | `P7-T10` |
| Non-forgeable, privacy-preserving ticket credentials | `P7-T07` | `P7-T08`, `P11-T01` |
| Encryption of stored payout-destination details | `P9-T03` | `P11-T01` |
| Dependency and secret scanning in CI | `P1-T04` | Continuous |
| Backups with tested restoration | `P1-T07` (enabled), `P11-T05` (drilled) | Periodic |

## 9.3 Invariant traceability (BR §22)

| INV | Invariant (short) | Enforced in | Primary tests in |
|---|---|---|---|
| 01 | Unapproved event not publicly purchasable | `P5-T04`, `P5-T05`, `P6-T03` | `P5-T05`, `P6-T03` |
| 02 | Suspended or cancelled event takes no new purchases | `P5-T06`, `P6-T03`, `P7-T03` | `P6-T03`, `P7-T03`, `P8-T05` |
| 03 | Authentication before purchase | `P2-T08`, `P3-T02`, `P6-T04` | `P6-T04` |
| 04 | Only approved users reach organizer functionality | `P2-T08`, `P4-T03` | `P4-T03`, `P5-T02` |
| 05 | No cross-organizer access | `P2-T08`, `P5-T02`, `P5-T03` | Authorisation matrix, `P7-T08`, `P9-T08` |
| 06 | Inventory never oversold | `P6-T02`, `P6-T06` | `P6-T02`, `P6-T06`, `P6-T08`, `P7-T05` |
| 07 | Free events do not bypass validation | `P6-T03`, `P6-T05` | `P6-T05` |
| 08 | Payment success verified with trusted provider data | `P7-T05` | `P7-T05`, `P7-T10` |
| 09 | Frontend redirect is not proof of payment | `P7-T06` | `P7-T06` |
| 10 | Repeated requests create no duplicate financial effect | `P2-T05`, `P6-T04`, `P7-T03`, `P7-T05`, `P8-T02`, `P8-T03`, `P9-T05`, `P9-T06` | Each of those tasks |
| 11 | No duplicate ticket issuance | `P7-T07` | `P7-T07` |
| 12 | No double first-time check-in | `P7-T08` | `P7-T08` |
| 13 | Pricing and fee snapshot preserved | `P6-T01`, `P6-T04` | `P6-T04` |
| 14 | Financial history not rewritten | `P2-T03`, `P7-T02`, `P8-T07` | `P7-T02`, `P8-T07` |
| 15 | Refund never exceeds refundable amount | `P8-T01`, `P8-T02` | `P8-T02` |
| 16 | Refund approval distinct from execution | `P8-T02`, `P8-T03` | `P8-T03` |
| 17 | Payouts follow configured settlement policy | `P9-T01`, `P9-T04` | `P9-T04` |
| 18 | Payable never paid twice | `P9-T04`, `P9-T05`, `P9-T06` | `P9-T05`, `P9-T06` |
| 19 | Fees and total shown before purchase | `P6-T04`, `P6-T09` | `P6-T04`, `P11-T07` |
| 20 | No organizer privileges from submission alone | `P3-T05`, `P4-T01`, `P4-T03` | `P4-T03` |
| 21 | Admin actions permissioned and audited | `P2-T03`, `P2-T08`, `P4-T04` | Authorisation matrix, `P4-T04` |
| 22 | Account deletion respects retention | `P3-T06`, `P10-T03` | `P10-T03` |
| 23 | Sensitive identity and payment data protected | `P4-T02`, `P9-T03`, `P11-T01` | `P4-T02`, `P9-T03` |
| 24 | Mandatory law outranks business policy | `P0-T06`, `P8-T01`, `P11-T02` | Checklist sign-off |
| 25 | Redis, frontend and provider callbacks never override the database | `P6-T02`, `P7-T04`, `P7-T05` | `P7-T04`, `P7-T05` |

---

# 10. Detailed Phase Plans

Task-card format is described in Section 1.3. Sizes and review levels are in each task's header line.

---

## Phase 0 — Decisions, Prerequisites, and Legacy Protection

**Goal.** Record the decisions that Phases 1–3 depend on, specify the lifecycles, protect the legacy system, and start the long-lead external work. No application code is written.

**Why first.** Changing a decision on paper costs minutes. Changing it after a schema and an API exist costs days. The long-lead items (provider approval, counsel) also run in the background while we build.

**Entry criteria.** BR and ARCH are available in the new repository under `docs/`.

#### P0-T01 — Legacy inventory and isolation
`MVP (preparation)` · Size M · Review R1 · **Depends on:** none

**Objective.** Record what the legacy system does and holds, and ensure that building the new platform cannot affect it.

**Scope.**
- Tag the legacy repository at its current production commit.
- Write `docs/legacy-inventory.md`: user-facing features, data stores and approximate volumes, third-party integrations, configuration *names* (never values), deployment targets and known defects.
- Mark each legacy behaviour **preserve**, **change** or **drop**. This list becomes the parity checklist in `P11-T09`.
- Create the new codebase as a **separate repository**, with separate databases, credentials, provider keys (test mode), email sender and storage.
- Limit legacy changes to critical production fixes, each recorded in the inventory.

**Out of scope.** Any change to legacy code, schema or infrastructure. Copying production personal data into new development or test environments (ARCH §20.2).

**Acceptance criteria.**
- The legacy tag exists, and the inventory is reviewed by the owner.
- A credential audit confirms the new repository and environments contain no legacy secrets or connection strings.
- Every legacy behaviour is marked preserve, change or drop.

**Testing.** Checklist verification only. The credential audit is repeated at every phase checkpoint.

#### P0-T02 — Foundational technical decisions (ADR batch A)
`MVP (preparation)` · Size M · Review R1 · **Depends on:** `P0-T01`

**Objective.** Accept the ADRs that Phases 1–3 cannot start without.

**Scope.**
- Write `docs/adr/` records for ADR-018 (auth and sessions), ADR-019 (topology and domains), ADR-020 (Redis and rate limiting), ADR-023 (identifiers), ADR-024 (money), ADR-025 (test stack), ADR-028 (API conventions), ADR-029 (runtime versions) and ADR-030 (email provider).
- ADR-021 (job runner) is scheduled as a spike inside `P2-T04`. ADR-022, ADR-026 and ADR-027 are decided at their tasks.
- Each ADR states context, options considered, the decision, consequences and a **revisit trigger**.
- ADR-018 and ADR-019 must include the cookie analysis: whether web and API share a registrable domain, cookie attributes, CSRF approach and local-development parity.

**Out of scope.** Implementing anything.

**Acceptance criteria.**
- Each ADR is accepted by the owner, names what it unblocks, and links to the BR and ARCH sections it satisfies.
- A domain and DNS plan exists for staging and production.
- Node and pnpm versions are chosen and recorded (ADR-029).

**Testing.** Not applicable.

#### P0-T03 — Decision register
`MVP (preparation)` · Size S · Review R1 · **Depends on:** `P0-T02`

**Objective.** Make every open decision visible, owned and tied to the task it blocks.

**Scope.** Create `docs/decision-register.md` containing DEC-001 to DEC-027 with owner, status (`open`, `provisional`, `decided`), blocking tasks, provisional default and date. Define the change process: a decision that affects existing orders, balances or customer rights changes only through an explicit, auditable rule (BR §25).

**Acceptance criteria.**
- All 27 decisions are listed with a status.
- The owner has committed target phases for DEC-010 (before Phase 7) and DEC-011 (before Phase 4).

**Testing.** Not applicable.

#### P0-T04 — State-machine specification
`MVP (preparation)` · Size M · Review R2 · **Depends on:** `P0-T03`

**Objective.** Define every business lifecycle precisely enough to implement and test.

**Scope.** Write `docs/state-machines.md` for: organizer application, event, ticket type, reservation, order, payment attempt, refund, ticket, payout, payable allocation, cancellation run, and job or outbox record. For each: states, allowed transitions, the actor or system trigger, side effects, terminal states, and the database guard that enforces it. Resolve C-09 (order status separated from refund summary, `pending_verification`, `expired`).

**Acceptance criteria.**
- Every BR §21 transition is present, or explicitly dropped with a reason.
- Every transition names its actor and guard.
- A list of **illegal transitions** exists for each machine. These become tests.
- A table-top walkthrough is recorded for: cancellation during checkout, late payment after expiry, concurrent double refund, and a payout timeout.

**Testing.** The walkthrough records the expected outcome of each scenario *before* any code exists. It is reused as test specifications.

#### P0-T05 — Design baselines
`MVP (preparation)` · Size M · Review R2 · **Depends on:** `P0-T02`, `P0-T04`

**Objective.** Fix the conventions that every later schema and endpoint will follow.

**Scope.**
- `docs/database-design.md`: naming, identifiers, `timestamptz` in UTC, money columns, audit columns, constraint conventions, soft-delete versus anonymisation policy, the expand/contract migration rule, and an entity list per domain for Phases 1–6 only. Financial tables are deferred until the accounting review.
- `docs/api-contract.md`: envelope, error-code registry (seeded with `INSUFFICIENT_INVENTORY`, `PRICE_CHANGED`, `INVALID_TRANSITION`, `IDEMPOTENCY_KEY_REUSED` and others), pagination, idempotency header, auth model, and an endpoint inventory including the C-18 additions.
- `docs/security-and-privacy.md` skeleton: data classification (public, internal, personal, sensitive, secret), logging rules, and a retention table to be filled during `P0-T06`.

**Acceptance criteria.** Documents exist and are consistent with the accepted ADRs. The endpoint inventory covers every BR §3 user capability, or marks it as deferred.

**Testing.** Not applicable.

#### P0-T06 — Compliance, provider and expert engagement
`MVP (preparation, parallel track)` · Size M (calendar-long) · Review R1 · **Depends on:** none

**Objective.** Start the work with external lead times so it never blocks the code.

**Scope.**
- Counsel: send a question list derived from BR §18 (Nigeria Data Protection Act 2023 and Commission directives, applicability as a major-importance controller or processor, DPO, lawful basis, processor and cross-border implications, consumer-protection review of fee non-refundability, payment-regulation and funds-flow questions).
- Accountant: tax treatment of the platform fee and ticket proceeds, ledger review and record-keeping.
- Provider: create the sandbox, start live-mode verification and write `docs/provider-capabilities.md`. It must answer: idempotency semantics for initialisation, refunds and transfers; whether a reference can be re-used on re-initialisation; webhook signature scheme and retry behaviour; refund and transfer availability and settlement timing; treatment of provider fees on refunds; and rate limits.
- Write a **DEC-010 options brief**: collect-and-hold, provider split or subaccount, and provider-managed settlement, each compared against BR §14.
- Begin the data inventory and processor register, and name an owner for breach response.

**Acceptance criteria.**
- Question lists are sent, with responses tracked in the decision register.
- `docs/provider-capabilities.md` answers every assumption marked "per provider" in later tasks, or lists it as unverified.
- The DEC-010 brief is delivered to the owner.

**Testing.** Not applicable.

**Phase 0 exit criteria.**
- [ ] ADR-018, 019, 020, 023, 024, 025, 028, 029 and 030 accepted.
- [ ] Decision register complete. DEC-010 and DEC-011 have committed resolution dates.
- [ ] `docs/state-machines.md` approved. Design baselines written.
- [ ] Legacy tagged and inventoried. Credential audit passed.
- [ ] Counsel, accountant and provider engagements have started.

---

## Phase 1 — Foundation

**Goal.** A runnable pnpm workspace with strict TypeScript, a migration workflow, a CI quality gate and an empty skeleton deployed to staging.

**Why here.** Every later task relies on `pnpm verify` being trustworthy. Deploying an empty skeleton now means deployment problems are discovered while they are cheap and unrelated to business logic.

**Entry criteria.** Phase 0 exit checklist complete.

#### P1-T01 — Workspace, TypeScript and lint baseline
`MVP` · Size M · Review R1 · **Depends on:** `P0-T02`

**Objective.** A pnpm workspace in which `any` and mixed package managers are build failures.

**Scope.**
- Root `package.json` with a pinned `packageManager` and `engines`, `pnpm-workspace.yaml`, `.nvmrc`, `.gitignore`, an empty `.env.example`, and a README with setup steps.
- A guard that rejects `npm` and `yarn` installs.
- `packages/config`: shared strict `tsconfig` (strict mode plus `noUncheckedIndexedAccess`, `noImplicitOverride` and fallthrough checks) and an ESLint configuration that errors on `@typescript-eslint/no-explicit-any`, floating promises and misused promises.
- Create only the directories needed now: `apps/api` and `packages/config`.

**Out of scope.** Application code, other apps, shared packages.

**Acceptance criteria.**
- A clean `pnpm install` yields a single `pnpm-lock.yaml`.
- `pnpm -r typecheck` and `pnpm lint` pass on the skeleton.
- A fixture proves that an added `any` fails lint.
- Running `npm install` is rejected.

**Testing.** Lint-rule fixture. A CI check that no other lockfile exists.

#### P1-T02 — Database, Drizzle, migrations and test harness
`MVP` · Size M · Review R2 · **Depends on:** `P1-T01` · **Needs:** ADR-023

**Objective.** A reproducible database workflow and a test harness able to prove concurrency behaviour.

**Scope.**
- `docker-compose.yml` with PostgreSQL at the same major version as production.
- Drizzle configuration, a connection module (pool limits and timeouts, graceful close), and `db:generate`, `db:migrate` and drift-check scripts.
- A first migration containing only the extensions or helpers required.
- A test harness: an isolated database per test run, migrations applied, truncation between tests, and a helper that opens several **independent connections** for concurrency tests.
- A design note for separate migration and application database roles (applied in `P1-T07`).

**Out of scope.** Business tables.

**Acceptance criteria.**
- From a fresh clone, one documented command sequence yields a migrated database.
- Migrations apply cleanly from empty.
- The drift check fails when the schema changes without a migration.
- A harness self-test shows two connections contending for a row lock.

**Testing.** Migration-from-empty test. Harness self-test. A deliberately failing migration leaves the database in a known, documented state.

#### P1-T03 — API skeleton
`MVP` · Size M · Review R1 · **Depends on:** `P1-T01`, `P1-T02`

**Objective.** A bootable API with configuration, logging, errors, health checks and graceful shutdown, and no business routes.

**Scope.**
- Separate `app.ts` (factory, testable) and `server.ts` (listens).
- Zod-validated environment that fails at startup and names the missing variable without printing values.
- Structured logging carrying a request ID, with a redaction list (passwords, tokens, cookies, authorisation headers, secrets).
- A central error handler producing the ARCH §14.3 error shape and hiding internals in production.
- `/health/live` and `/health/ready` (database check) exposing no internal detail.
- Graceful shutdown: stop accepting, drain, close the pool.

**Acceptance criteria.**
- A missing variable stops startup with a clear message.
- Production error responses contain no stack trace.
- A canary secret placed in a request never appears in logs.
- Readiness fails when the database is unreachable.
- `SIGTERM` drains in-flight requests and exits cleanly.

**Testing.** supertest for health, 404 and error shape. Log-redaction test. Shutdown test.

#### P1-T04 — Quality gate and CI
`MVP` · Size M · Review R1 · **Depends on:** `P1-T02`, `P1-T03` · **Needs:** ADR-025

**Objective.** No change reaches `main` without passing lint, typecheck, tests and build.

**Scope.**
- Vitest projects (unit and integration), supertest, and a `pnpm verify` script.
- A CI workflow with a PostgreSQL service, cached pnpm store, `--frozen-lockfile`, migration-from-empty and drift checks, a dependency audit report and secret scanning.
- Branch protection with required checks, a PR template containing the Definition of Done (Section 7.3), and automated dependency-update proposals.

**Acceptance criteria.**
- A PR cannot merge with a red check.
- CI fails when the lockfile is out of date.
- Secret scanning catches a planted dummy key on a throwaway branch.

**Testing.** Negative probes of the pipeline itself.

#### P1-T05 — Worker and web skeletons
`MVP` · Size M · Review R1 · **Depends on:** `P1-T03`

**Objective.** The remaining two applications exist, start and stop cleanly, and do nothing else.

**Scope.**
- Worker: entry point, validated configuration, structured logging, a status report that distinguishes *alive* from *processing* (ARCH §20.4; it reports "no handlers registered" for now), and graceful shutdown.
- Web: Vite, React and strict TypeScript, Tailwind, React Router, a TanStack Query provider, a typed API client that parses the shared error shape, and one page showing API readiness.
- Add shadcn/ui components only when a screen needs them, rather than installing the whole library.

**Acceptance criteria.**
- `pnpm dev` starts API, worker and web.
- The web page reflects API readiness.
- The worker exits cleanly on `SIGTERM`.
- The web build has no `any`.

**Testing.** Smoke tests. API-client error-parsing unit tests. A component test for the readiness page.

#### P1-T06 — Shared packages and contract round trip
`MVP` · Size S · Review R1 · **Depends on:** `P1-T01`, `P1-T05`

**Objective.** One definition of a contract is consumed by both API and web.

**Scope.** `packages/validators` (Zod, input shapes only) and `packages/types` (public response types). Define the error envelope and pagination metadata once and use them in both apps. Add a lint rule forbidding packages from importing apps, and keeping database types out of `packages/types`.

**Acceptance criteria.**
- A change to a shared schema produces a type error in both consumers.
- Boundary lint rules pass.

**Testing.** Schema parse tests and a type-level test.

#### P1-T07 — Staging environment and deployment pipeline
`MVP` · Size L · Review R2 · **Depends on:** `P1-T04`, `P1-T05` · **Needs:** ADR-019

**Objective.** Every merge to `main` can deploy the three skeleton apps to a real staging environment, with migrations and rollback understood.

**Why now (plain explanation).** A deployment has several moving parts: building an image, running database migrations, starting the new code, checking it is healthy, and undoing the release if it is not. Rehearsing this with an empty app means that when something breaks later, you know it is your feature, not your pipeline.

**Scope.**
- Staging hosting for API, worker and web; managed PostgreSQL with automated backups enabled; domain and TLS according to ADR-019.
- Dockerfiles for API and worker: multi-stage, non-root user, a pinned Node base image, and **a pinned pnpm version activated through Corepack** (never `latest`). The pnpm major must be compatible with the chosen Node version (ADR-029).
- Secrets held in the hosting platform's secret store and never in the repository or image layers.
- Release steps in this order: build, **run migrations as a separate step**, deploy API and worker, wait for readiness, and abort on failure. Document the rollback procedure and the expand/contract rule (new code must tolerate the old schema, and old code the new schema, during the release).
- Staging uses provider test-mode keys only.
- Application and migration database roles are separate, and the application role has no DDL rights.
- Write `docs/deployment.md` v0 as step-by-step instructions.

**Out of scope.** Production environment (`P11-T06`), monitoring dashboards (`P11-T04`).

**Acceptance criteria.**
- A merge to `main` deploys all three apps to staging.
- A failed readiness check aborts the release.
- A deliberately broken release is rolled back successfully (rehearsed once and recorded).
- No secrets appear in the repository or image layers (verified by scanning).
- The containers run as non-root.

**Testing.** Deployment rehearsal log. Image scan. Check that health endpoints expose no internal detail from outside.

**Phase 1 exit criteria.**
- [ ] `pnpm verify` green locally and in CI. The branch is protected.
- [ ] Migrations apply from empty. The drift check works.
- [ ] API, worker and web start and stop cleanly.
- [ ] Skeleton deployed to staging. Rollback rehearsed.
- [ ] `any` and non-pnpm installs demonstrably fail the build.

---

## Phase 2 — Shared Core Services

**Goal.** Build, once and correctly, the infrastructure that later phases share: money, state transitions, audit, durable jobs and the outbox, idempotency, email, security middleware and the authorisation framework.

**Why here (a departure from ARCH §24).** Identity needs email and audit from its first task. Reservation expiry needs the worker. Payment application needs idempotency and the outbox. Building them *after* the features that depend on them means retrofitting, which is where subtle bugs enter. This phase is where the architecture's idempotency and durability principles are implemented once.

**Entry criteria.** Phase 1 exit checklist complete.

#### P2-T01 — Money and rounding primitives
`MVP` · Size M · Review R2 · **Depends on:** `P1-T04` · **Needs:** ADR-024

**Objective.** A `Money` type in which floating-point arithmetic cannot occur.

**Scope.**
- A `Money` value in integer kobo with currency NGN, constructors that reject non-integers, add, subtract, compare and multiply by an integer.
- Percentage calculation by integer arithmetic with an explicit `RoundingMode` (half-up by default, others available for DEC-003).
- An `allocate` helper that splits an amount so the parts sum exactly to the total.
- Conversion to and from API integers and database `bigint`, with safe-integer guards.
- A lint rule forbidding floating-point arithmetic and `Math.round` in financial modules.

**Out of scope.** Fee policy and any tables.

**Acceptance criteria.**
- No operation can yield a non-integer or an unsafe integer.
- `allocate` always sums to the input.
- The BR §10.1 example (₦10,000 plus ₦500 gives ₦10,500) is a passing golden test.

**Testing.** Golden vectors approved by the owner. Property tests: sums are preserved, rounding is monotonic, and results are never negative where forbidden. A table-driven test per rounding mode.

#### P2-T02 — State-transition utility and history
`MVP` · Size M · Review R2 · **Depends on:** `P0-T04`, `P1-T02`

**Objective.** One tested mechanism for lifecycle changes, so no module invents its own.

**Scope.**
- A typed transition-table helper and `assertCanTransition`.
- A conditional-update helper (`UPDATE … WHERE id = ? AND status = ? RETURNING …`) that tells the caller whether *this* call won the transition.
- An append-only status-history pattern written in the same transaction.
- An `INVALID_TRANSITION` error.

**Acceptance criteria.**
- Illegal transitions are rejected.
- When two callers attempt the same transition at once, exactly one wins and the other receives a deterministic "already transitioned" outcome.
- History rows commit or roll back with the change.

**Testing.** Unit tests of the tables. Concurrency test on a fixture table (supports `[INV-10]`).

#### P2-T03 — Audit log
`MVP` · Size M · Review R2 · **Depends on:** `P1-T02`

**Objective.** A durable record of significant actions that cannot be edited by the application.

**Scope.**
- An append-only `audit_events` table: actor type and ID (user, system or worker), action, entity, outcome, request ID, allow-listed metadata and a timestamp.
- `recordAudit(tx, …)` *requires* a transaction handle so the record commits with the action.
- Database-level protection: the application role may insert and select only.
- A metadata allow-list per action, rejecting passwords, tokens and excess personal data.

**Out of scope.** Read APIs and screens (`P10-T02`).

**Acceptance criteria.**
- An audit row commits and rolls back with its business transaction.
- `UPDATE` and `DELETE` fail at the database level.
- Forbidden metadata keys are rejected.

**Testing.** `[INV-14]` `[INV-21]` immutability test. Rollback test. Forbidden-key test.

#### P2-T04 — Durable jobs and transactional outbox
`MVP` · Size L · Review R2 · **Depends on:** `P1-T02`, `P1-T05`, `P2-T02` · **Needs:** ADR-021

**Objective.** Background work that survives crashes, retries safely and is inspectable.

**Scope.**
- A timeboxed spike comparing a maintained PostgreSQL-backed job library with an in-house implementation. The result is recorded as ADR-021. The `outbox_events` table remains in-house.
- Tables for outbox events and jobs: type, payload, unique dedupe key, `run_at`, attempts, maximum attempts, status, lock owner, lease expiry, last error and completion time.
- `enqueue(tx, …)` requires a transaction handle.
- The worker loop claims work with `FOR UPDATE SKIP LOCKED`, reclaims work after a lease expires, retries with exponential backoff and jitter, and moves exhausted work to a `failed` dead-letter state.
- A typed handler registry, and a documented rule that handlers must be idempotent.
- A job is never marked complete before its handler succeeds.
- A single-flight scheduler for recurring jobs.
- Metrics and logs for backlog and failures, and a read-only inspection query.
- Graceful shutdown that finishes or releases the current job.

**Out of scope.** Any business handler.

**Acceptance criteria.**
- An enqueue rolls back with its transaction.
- Two workers never run the same job concurrently.
- A job held by a crashed worker is reclaimed after the lease expires.
- An exhausted job lands in the dead-letter state and is inspectable.
- A recurring job does not fire twice when two workers run.

**Testing.** Concurrency: N workers and M jobs, each job executed exactly once. Crash test: kill the process mid-handler. Backoff timing with an injected clock. Dedupe-key collision. Shutdown test.

#### P2-T05 — Idempotency framework
`MVP` · Size M · Review R2 · **Depends on:** `P1-T02`

**Objective.** One mechanism that makes a repeated request safe.

**Scope.**
- An `idempotency_keys` table: scope (operation and actor), key, request hash, status (`in_progress` or `completed`), result reference and expiry.
- A `withIdempotency` wrapper and an Express helper that reads the `Idempotency-Key` header.
- Behaviour: the same key and payload returns the stored result. The same key with a different payload is rejected with `IDEMPOTENCY_KEY_REUSED`. A concurrent duplicate waits or receives a defined in-progress response.
- Uniqueness enforced by the database, not by an application check (ARCH §8.5).
- A defined recovery for a crash that leaves a key `in_progress`.

**Acceptance criteria.** All three behaviours hold. Stored results contain no secrets. Expired keys are removable by a cleanup hook.

**Testing.** Concurrency: 20 parallel requests with one key execute the operation exactly once and every caller sees the same outcome. Payload-mismatch test. Crash-recovery test.

#### P2-T06 — Email adapter and notification pipeline
`MVP` · Size L · Review R2 · **Depends on:** `P2-T04` · **Needs:** ADR-030

**Objective.** Reliable, deduplicated email delivery that can never roll back a business operation.

**Scope.**
- An `EmailProvider` interface with a development adapter (mail catcher) and the chosen production adapter.
- `notifications` and `notification_attempts` tables, with a dedupe key per (event, recipient, type).
- Typed templates (plain text and HTML), with links built from configuration.
- Sending happens only in the worker, triggered by an outbox or job record.
- A guard so that non-production environments can email only allow-listed addresses.

**Acceptance criteria.**
- One enqueue produces one email, even if the job runs twice.
- A provider outage leads to retries, then dead-letter, with the business operation unaffected.
- Staging cannot email arbitrary addresses.
- Logs hold no tokens or full message bodies.

**Testing.** Duplicate-enqueue test. Provider-failure injection. Template snapshot tests. Log-redaction test.

#### P2-T07 — Security middleware and rate limiting
`MVP` · Size M · Review R2 · **Depends on:** `P1-T03` · **Needs:** ADR-020

**Objective.** Secure HTTP defaults, validated input and abuse limits before any endpoint exists.

**Scope.**
- Security headers, a configured CORS allow-list, JSON body size limits, and support for a raw-body route (needed by webhooks).
- A Zod validation helper producing typed input and a `VALIDATION_ERROR` response.
- Correct client-IP handling behind a trusted proxy.
- A rate-limit abstraction with named policies (authentication, password reset, checkout and others) and the store chosen in ADR-020.
- A standard `429` with `Retry-After`.

**Acceptance criteria.**
- Oversized bodies and disallowed origins are rejected.
- A spoofed `X-Forwarded-For` does not evade limits unless it arrives from a trusted proxy.
- Validation errors never echo secrets.

**Testing.** Header snapshot test. CORS tests. Rate-limit tests with an injected clock. Spoofed-header test.

#### P2-T08 — Authorisation framework
`MVP` · Size L · Review R2 · **Depends on:** `P2-T03`, `P2-T07`

**Objective.** Deny-by-default access control that makes an unprotected route impossible to ship.

**Scope.**
- Permission constants and a role-to-permission map, `requireAuth`, `requirePermission` and ownership-policy helpers.
- A route registry in which each route declares `public`, `authenticated` or a specific permission. Starting the app with an unregistered route fails.
- A documented convention for when a forbidden resource returns `404` instead of `403`.
- The authorisation-matrix test generator (Section 8.4), exercised on sample routes with a stub identity.

**Out of scope.** Real users and sessions (Phase 3).

**Acceptance criteria.**
- An unregistered route fails startup and the test suite.
- The matrix generator produces tests for the sample routes.
- The `404` versus `403` convention is documented and tested.

**Testing.** Deny-by-default test. Matrix test on sample routes. Policy unit tests. Supports `[INV-04]` `[INV-05]` `[INV-21]`.

**Phase 2 exit criteria.**
- [ ] Job, idempotency and transition concurrency suites pass 20 consecutive repetitions.
- [ ] Audit immutability proven at the database level.
- [ ] Money golden vectors approved by the owner.
- [ ] Email works end to end in staging through the worker, and the non-production guard is verified.
- [ ] The authorisation registry rejects an unregistered route.
- [ ] Staging redeployed with the worker running a no-op recurring job.
- [ ] `docs/database-design.md` and `docs/api-contract.md` updated.

---

## Phase 3 — Identity and Access

**Goal.** Customers can register, verify their email, log in and out, recover their password and manage a profile, and every protected operation is authorised on the server.

**Why here.** Every later feature needs to know *who* is acting and *what they may do*. Getting this wrong is the most expensive mistake to fix later, so it is built and attacked with tests before any business feature exists.

**Entry criteria.** Phase 2 exit checklist complete. ADR-018 and ADR-019 accepted.

#### P3-T01 — Users, registration and password hashing
`MVP` · Size M · Review R2 · **Depends on:** `P2-T03`, `P2-T05`, `P2-T07`

**Objective.** A customer can register with name, email and password, with email uniqueness and password storage done correctly.

**Scope.**
- `users` table. Fields: name, email (original and normalised), password hash, optional phone, status and timestamps.
- A **documented email-normalisation policy** (case folding and whitespace, enforced by a unique index on the normalised value).
- Password hashing with argon2id, with parameters chosen by benchmark on the staging hardware and recorded in the ADR.
- A password policy that prefers length over composition rules.
- `POST /api/v1/auth/register` with validation, rate limiting and **enumeration-safe responses** (an existing email must not be distinguishable by response or timing).
- Record acceptance of a terms and privacy version (content is added in `P10-T06`).
- Phone is optional and is never required (BR §3.1).

**Out of scope.** Sessions, verification email delivery, roles.

**Acceptance criteria.**
- Duplicate emails that differ only by case or whitespace are rejected, enforced by the database and not only the service.
- Raw passwords never appear in logs, audit records or responses.
- Registering an existing email returns the same shape as a new one.

**Testing.** Normalisation table tests. Unique-index test. Concurrency: parallel registrations of one email produce exactly one user. Enumeration-timing sanity test. Log canary test.

#### P3-T02 — Sessions and CSRF protection
`MVP` · Size L · Review R2 · **Depends on:** `P3-T01`, `P2-T08` · **Needs:** ADR-018, ADR-019

**Objective.** Secure login and logout with revocable sessions.

**Scope.** (Shown for the recommended model in ADR-018. Adapt to the accepted ADR.)
- `sessions` table holding a **hash** of an opaque random token (at least 128 bits of entropy), user, created, last-seen, idle and absolute expiry, and revocation time.
- Cookie flags: `HttpOnly`, `Secure`, an appropriate `SameSite`, and a host-scoped name.
- Token rotation on login (preventing session fixation), logout, "log out everywhere", and idle and absolute timeouts.
- CSRF defence for cookie-authenticated state-changing requests: origin checking plus a token.
- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- Replace the Phase 2 stub identity with real sessions in the authorisation framework.

**Acceptance criteria.**
- A revoked or expired session is rejected immediately.
- A state-changing request from a disallowed origin or without a CSRF token is rejected.
- Session identifiers are never stored in plain text.
- Authentication state changes cause a new session identifier.

**Testing.** Fixation test. Expiry tests with an injected clock. Cross-origin mutation test. Revocation test. The authorisation matrix now runs with real sessions.

#### P3-T03 — Email verification and account status
`MVP` · Size M · Review R2 · **Depends on:** `P3-T02`, `P2-T06`

**Objective.** Email ownership is verified through single-use expiring tokens, and account status gates access.

**Scope.**
- Verification tokens stored hashed, expiring, single-use and invalidated when superseded.
- `POST /auth/verify-email` and a rate-limited resend.
- Account status values (`active`, `suspended`, `pending_deletion`) enforced at login and on every request.
- A `requireVerifiedEmail` policy (used by checkout, DEC-023).

**Acceptance criteria.**
- An expired, reused or tampered token fails with a generic message.
- A suspended account cannot authenticate, and its existing sessions stop working.
- Resend is rate limited.

**Testing.** Token lifecycle tests with an injected clock. Concurrency: two simultaneous uses of one token succeed once. Status-gating tests.

#### P3-T04 — Password recovery and security-sensitive changes
`MVP` · Size M · Review R2 · **Depends on:** `P3-T03`

**Objective.** Password reset and password or email change that cannot be abused for account takeover.

**Scope.**
- `POST /auth/forgot-password` (always the same response) and `POST /auth/reset-password`, with hashed, short-lived, single-use tokens.
- Revoke **all** sessions after a reset or password change.
- Authenticated password change requiring the current password.
- Email change requiring verification of the new address and a security notification to the old one.
- Security-sensitive changes are audited.

**Acceptance criteria.**
- A reset invalidates every existing session and every other outstanding reset token.
- Responses do not reveal whether an email exists.
- A notification is sent to the account's previous address on credential changes.

**Testing.** Token reuse and expiry. Session-revocation test. Enumeration test. Rate-limit tests. Audit assertions.

#### P3-T05 — Roles, permissions, profile and admin bootstrap
`MVP` · Size M · Review R2 · **Depends on:** `P3-T02`, `P2-T08`

**Objective.** Users start as customers and can never promote themselves.

**Scope.**
- A role-grant table (customer by default). The only code paths that write grants are the approval workflow (Phase 4) and the bootstrap command.
- `GET /auth/me` returns roles and permissions the *server* computed.
- `PATCH /me` profile update through an allow-listed schema, so `role`, `status` and similar fields cannot be mass-assigned.
- A command-line bootstrap to create the first administrator out of band. There is no public endpoint for it.

**Acceptance criteria.**
- No API request body can change a role, status or permission.
- The bootstrap command is the only way to create the first admin, and is audited.

**Testing.** `[INV-20]` Mass-assignment test sending `role: "admin"` on every writable endpoint. Bootstrap test. `/auth/me` shape test.

#### P3-T06 — Account-deletion foundation
`MVP` · Size S · Review R2 · **Depends on:** `P3-T04`, `P2-T04`

**Objective.** Capture a deletion request safely. Defer the actual erasure until the rules exist (C-25).

**Scope.**
- A deletion-request record, re-authentication, a confirmation step and a status change to `pending_deletion`.
- Session and credential revocation.
- An inventory of every table that will hold user-linked personal data, appended to `docs/security-and-privacy.md` as each table is created.

**Out of scope.** Erasure and anonymisation (`P10-T03`, after DEC-015).

**Acceptance criteria.** Only the account owner can request deletion. The request revokes all sessions. The request can be cancelled within a defined window if policy allows.

**Testing.** `[INV-22]` Authorisation tests (another user cannot request deletion). Revocation test.

#### P3-T07 — Identity security test suite
`MVP` · Size M · Review R2 · **Depends on:** `P3-T01` to `P3-T06`

**Objective.** An adversarial pass over the whole identity surface before anything else builds on it.

**Scope.** Test-only task. Cases: login throttling and per-account backoff, credential-stuffing patterns, timing equalisation for unknown users, session fixation, token replay, CSRF on every mutating route, mass assignment, IDOR attempts on profile endpoints, and header and cookie flag checks.

**Acceptance criteria.** Every case has a named test. Any failure is fixed in the originating task's code, with a regression test.

**Testing.** This task *is* testing. Review: R2 including a read-through of all identity code.

#### P3-T08 — Frontend slice: authentication and profile
`MVP` · Size M · Review R1 · **Depends on:** `P3-T07`, `P1-T06`

**Objective.** Register, log in, verify, recover and edit a profile through the UI.

**Scope.** Auth screens and forms (React Hook Form with the shared Zod schemas), route guards (for experience only), authentication-aware API client with CSRF handling and safe retry rules, profile page, account-deletion request screen. Clear, non-leaking error messages.

**Acceptance criteria.** The flows work against staging. Guards redirect unauthenticated users, and removing a guard in the browser still leaves the API enforcing access.

**Testing.** Component tests for forms. Playwright: register, verify through the mail catcher, log in, log out.

**Phase 3 exit criteria.**
- [ ] The authorisation matrix passes with real sessions for every registered route.
- [ ] `P3-T07` suite green. No known unresolved finding.
- [ ] Mass-assignment test proves no self-promotion.
- [ ] Passwords hashed, sessions hashed, tokens hashed, and verified by test.
- [ ] Staging demo: register, verify, log in, reset password, request deletion.

---

## Phase 4 — Organizer Onboarding and Admin Foundation

**Goal.** A user can apply to become an organizer. Only an authorised admin decision, and nothing else, grants organizer privileges.

**Why here.** Events (Phase 5) need an organizer concept, and the admin foundation (permissions, MFA, review queues) is reused by every later admin function.

**Entry criteria.** Phase 3 exit checklist complete. DEC-011 recorded, or the provisional default accepted for development.

#### P4-T01 — Organizer application model and submission
`MVP` · Size M · Review R2 · **Depends on:** `P3-T05`, `P0-T04` · **Needs:** DEC-011

**Objective.** A user can create, submit and withdraw one organizer application.

**Scope.**
- `organizer_applications` with the state machine from `docs/state-machines.md` and a status-history table.
- **At most one active application per user**, enforced by a partial unique index.
- Collect only the fields DEC-011 justifies. Each field has a purpose recorded in the data inventory.
- `POST /organizer-applications`, `GET /organizer-applications/me`, withdrawal.
- Submitting grants **no** privileges.

**Acceptance criteria.**
- Concurrent submissions by one user produce one active application.
- A submitted application gives the applicant no access to organizer routes.
- Only the applicant can read or withdraw their own application.

**Testing.** `[INV-20]` Concurrency on the one-active rule. Authorisation matrix. Transition tests including illegal ones.

#### P4-T02 — Verification evidence handling
`MVP-conditional (DEC-011)` · Size M · Review R3 · **Depends on:** `P4-T01` · **Needs:** DEC-011, ADR-022

**Objective.** Handle any required verification evidence in a way that protects it, or confirm none is needed.

**Scope.**
- If DEC-011 requires no documents: store **verification results and provider references only** (BR §6.3) and close the task with that finding.
- If documents are required: private storage that is separate from public media, file-type and size validation, malware scanning where warranted, metadata removal where appropriate, short-lived access URLs, access limited to a named admin permission, and every access audited.
- A retention period for the evidence is recorded.

**Acceptance criteria.**
- No identity document is ever reachable through a public URL.
- Access is logged and permission-gated, and applicants cannot download other people's evidence.
- Evidence is excluded from logs and from API responses by default.

**Testing.** `[INV-23]` Access-control matrix. Expired-URL test. Upload validation negative tests (wrong type, oversized, double extension). R3: security-reviewer sign-off on the storage design.

#### P4-T03 — Admin review, approval and role activation
`MVP` · Size L · Review R2 · **Depends on:** `P4-T01`, `P2-T03`, `P2-T06`

**Objective.** An administrator can approve, reject or request more information, and approval atomically activates the organizer role.

**Scope.**
- Admin queue endpoints and `approve`, `reject` and `request-information` actions.
- **Approval, role grant, organizer profile creation and audit commit in one transaction.** The notification is enqueued via the outbox in the same transaction.
- A reviewer cannot be the applicant (BR §5.4).
- Store the reviewer, time, outcome and any restrictions (BR §6.3).

**Acceptance criteria.**
- A user obtains the organizer role *only* through a recorded approval.
- Two admins deciding at once produce one decision.
- An admin cannot approve their own application.
- Applicants are notified of the outcome.

**Testing.** `[INV-04]` `[INV-20]` Self-approval test. Concurrent-decision test. Transaction-atomicity test (a failure after the role grant rolls back the approval). Organizer routes return `403` or `404` before approval and succeed after it.

#### P4-T04 — Admin permissions, MFA and step-up confirmation
`MVP · Launch gate` · Size L · Review R3 · **Depends on:** `P4-T03`, `P3-T05`

**Objective.** Admin power is granular, strongly authenticated and auditable (BR §3.3, §19.3).

**Scope.**
- Permission-based admin roles. Suggested starting set: *organizer reviewer*, *event reviewer*, *finance operator*, *finance approver*, *support* and *super admin*. The owner confirms the set.
- TOTP-based MFA enrolment and enforcement for every admin account, with recovery codes.
- A **step-up confirmation** mechanism (recent re-authentication) that sensitive actions can require. The first consumers are fee and settlement configuration, manual payouts and adjustments.
- Admin account management: list users, suspend and restore.

**Acceptance criteria.**
- An admin without a permission is refused, even on a route reachable from the admin dashboard.
- Admins cannot use the system without completing MFA.
- Step-up expires after a configured time and is verified on the server.

**Testing.** `[INV-21]` Matrix of admin sub-roles against every admin route. MFA brute-force and replay tests. Step-up expiry test. R3: security-reviewer sign-off.

#### P4-T05 — Organizer restriction and suspension
`MVP` · Size M · Review R2 · **Depends on:** `P4-T03`

**Objective.** Administrators can restrict or suspend an organizer without breaking customer protections (BR §6.4).

**Scope.**
- Organizer status and restriction flags, an admin action with a mandatory reason, and audit.
- A policy function (`canCreateEvents`, `canPublish`, `canSell`) that later phases consume.
- Document, in `docs/state-machines.md`, the consequence for existing bookings, pending refunds and payouts. Behaviour is implemented in `P8` and `P9`, and a suspension must never block refunds owed to customers.

**Acceptance criteria.** A suspended organizer cannot create or publish events. The policy functions are the single point consulted by later modules.

**Testing.** Policy unit tests. Matrix tests. A test that suspension does not hide the organizer's existing orders from admins.

#### P4-T06 — Frontend slice: organizer application and admin review
`MVP` · Size M · Review R1 · **Depends on:** `P4-T04`

**Objective.** The application journey and the admin review queue are usable.

**Scope.** Application form and status page, organizer dashboard shell (guarded), admin shell with filtering, search and pagination of the review queue, MFA enrolment screens, step-up prompt component.

**Acceptance criteria.** The Organizer-onboarding journey from ARCH §19.5 steps 1–4 works on staging.

**Testing.** Playwright for apply, approve, access organizer shell.

**Phase 4 exit criteria.**
- [ ] No path to the organizer role other than an approved application (tested across every route).
- [ ] Admin MFA enforced. Admin permission matrix green.
- [ ] Evidence-handling decision recorded and implemented, or documented as not required.
- [ ] Audit records exist for every decision.
- [ ] Phase 3 and Phase 2 suites still green.

---

## Phase 5 — Events and Ticket Types

**Goal.** Approved organizers create events with ticket types. Administrators review, approve and the organizer publishes. Suspension, reinstatement, cancellation and rescheduling are recorded as controlled transitions. Public visitors can discover published events.

**Why here.** Inventory, orders and payments all hang off an event and its ticket types, and the event lifecycle decides whether a purchase is even allowed.

**Entry criteria.** Phase 4 exit checklist complete. DEC-012, DEC-013, DEC-021 and DEC-027 recorded, or provisional defaults accepted.

#### P5-T01 — Categories, event schema and lifecycle history
`MVP` · Size M · Review R2 · **Depends on:** `P4-T03`, `P2-T02`

**Objective.** The event data model, with the state machine enforced in the database.

**Scope.**
- Tables for categories, events (title, description, category, organizer, venue or online details, IANA time zone, UTC start and end, sales window, terms, status, row version) and event status history.
- Check constraints (end after start, valid status).
- Category management by admin.

**Acceptance criteria.** Times are stored in UTC with the time zone retained for display. Invalid statuses are rejected by the database.

**Testing.** Constraint tests. Time-zone round-trip tests.

#### P5-T02 — Event drafts and ownership
`MVP` · Size M · Review R2 · **Depends on:** `P5-T01`, `P4-T05` · **Needs:** DEC-012

**Objective.** An organizer can create and edit only their own drafts, safely.

**Scope.**
- `POST /organizer/events`, `PATCH /organizer/events/:id` with ownership policy, allow-listed input and an **optimistic-concurrency version** check so two editors cannot silently overwrite each other.
- Edit rules by status. Edits to an approved or published event follow the DEC-012 material-change rule (re-review, or a recorded schedule-change request in `P5-T07`).
- Respect the organizer restriction policy from `P4-T05`.

**Acceptance criteria.**
- An organizer can never read or write another organizer's draft. Unauthorised access is indistinguishable from not found.
- A stale version is rejected with a clear conflict error.
- A material edit on an approved event moves it back to review per DEC-012.

**Testing.** `[INV-05]` IDOR matrix. Version-conflict test. Material-edit tests.

#### P5-T03 — Ticket types
`MVP` · Size M · Review R2 · **Depends on:** `P5-T02`

**Objective.** Ticket types with price, capacity, limits and sales windows that protect later inventory rules.

**Scope.**
- Ticket-type CRUD for the owning organizer: name, description, price in kobo (zero allowed for free), `quantity_total`, per-order minimum and maximum, sales window and availability status.
- Check constraints: price at least zero, quantity at least zero, minimum at most maximum.
- Editing rules once sales exist: capacity cannot drop below what is already sold or reserved, and a price change affects future orders only (existing orders keep their snapshot).

**Out of scope.** Reserved and sold counters (`P6-T02`).

**Acceptance criteria.** Constraints exist in the database. Ownership is enforced. Price edits never touch existing orders (verified once orders exist, in `P6-T04`).

**Testing.** Constraint tests. Ownership matrix. Boundary tests for limits.

#### P5-T04 — Submission and administrative approval
`MVP` · Size M · Review R2 · **Depends on:** `P5-T03`, `P4-T04`

**Objective.** Events cannot be published without admin approval (invariant 01).

**Scope.**
- `POST /organizer/events/:id/submit` with completeness validation (BR §7.1), and admin `approve`, `reject` and `request-changes` actions.
- Approver must differ from the event's owner, even if the same person holds both roles (BR §5.4).
- Transitions use the shared utility, history and audit, with notification through the outbox.

**Acceptance criteria.**
- Incomplete events cannot be submitted, and the response lists what is missing.
- An organizer cannot approve their own event, including through an admin account that also owns the event.
- Concurrent admin decisions yield one outcome.

**Testing.** `[INV-01]` `[INV-21]` Self-approval tests. Concurrency test. Illegal-transition tests.

#### P5-T05 — Publication and public discovery
`MVP` · Size L · Review R2 · **Depends on:** `P5-T04` · **Needs:** DEC-027

**Objective.** Only approved events can be published, and only published, eligible events are publicly visible.

**Scope.**
- `POST /organizer/events/:id/publish` (the endpoint missing from ARCH, C-05).
- Public `GET /events` with filtering, search, sorting and pagination, and `GET /events/:id`. Responses include price breakdown inputs and *informational* availability.
- Public responses never include private organizer or customer data.
- Cache with standard HTTP caching headers only. No Redis.
- Events are excluded when unpublished, suspended, cancelled or completed (as the product rules decide).

**Acceptance criteria.**
- An unapproved event cannot be published through the API, a job or a direct status update.
- Public endpoints return only approved fields.
- Pagination metadata comes from the real query.

**Testing.** `[INV-01]` Publication-guard test through every route that can change status. Public-field allow-list test. Pagination tests.

#### P5-T06 — Suspension, reinstatement, cancellation transitions and completion
`MVP` · Size L · Review R2 · **Depends on:** `P5-T05` · **Needs:** DEC-013, DEC-021

**Objective.** Distinct, auditable suspension and cancellation transitions that expose a durable event for later phases.

**Scope.**
- Admin `suspend` (mandatory reason) and `reinstate`. Cancellation request and approval per DEC-021.
- Suspension and cancellation **block new purchases** through a single eligibility policy used by checkout, payment initiation and ticket issuance.
- Cancellation writes an outbox event (`event.cancelled`) in the same transaction. Consumers (refunds, tickets, notifications) arrive in Phase 8.
- A scheduled job moves finished events to `completed`.
- Visible suspension reason and history for admins.

**Out of scope.** Refund and notification consequences (`P8-T05`, `P10-T05`).

**Acceptance criteria.**
- Suspension is not cancellation, and the two have distinct states and data.
- A cancelled event cannot be reinstated.
- The purchase-eligibility policy is the only place that decides whether an event can sell.

**Testing.** `[INV-02]` Transition tests. Concurrency: simultaneous suspend and cancel. Atomicity: the outbox row exists if and only if the status change committed.

#### P5-T07 — Rescheduling requests
`MVP` · Size M · Review R2 · **Depends on:** `P5-T06` · **Needs:** DEC-012, DEC-005

**Objective.** A date or venue change is a recorded, approved change and never a silent edit (BR §7.4).

**Scope.**
- A schedule-change request records previous and proposed values and the reason. The organizer submits, an admin approves, and the event is updated with full history.
- The outbox emits `event.rescheduled` so notification consumers can be added.
- Customer remedies (refund or alternative) are **not** implemented until DEC-005 is decided. Until then, admins handle affected customers as support cases.

**Acceptance criteria.** Approved changes keep the original schedule in history. The event page shows the current schedule only.

**Testing.** Transition and history tests. Authorisation matrix. Atomicity of event update and outbox row.

#### P5-T08 — Event media
`MVP` · Size M · Review R2 · **Depends on:** `P5-T02` · **Needs:** ADR-022

**Objective.** Cover images can be uploaded safely. This task may land late in the phase without blocking others.

**Scope.** Upload validation (type, size, dimensions), re-encoding to strip metadata, storage in the *public media* area, and URL generation. Strict separation from any private evidence area.

**Acceptance criteria.** Invalid files are rejected. Only the owning organizer can attach media to an event.

**Testing.** Upload negative tests. Ownership test.

#### P5-T09 — Frontend slice: event management and discovery
`MVP` · Size L · Review R1 · **Depends on:** `P5-T05`

**Objective.** The organizer and admin event journeys, and public discovery, work in the browser.

**Scope.** Organizer event and ticket-type editor, submit and publish actions, status and review feedback display, admin approval queue and event detail, public listing with filters and pagination, event detail page.

**Acceptance criteria.** ARCH §19.5 *Organizer onboarding* steps 5–7 work end to end on staging.

**Testing.** Playwright end to end. Component tests for the editor validation.

**Phase 5 exit criteria.**
- [ ] No route, job or direct update can publish an unapproved event (tested).
- [ ] Suspended and cancelled events fail the purchase-eligibility policy.
- [ ] Cross-organizer access matrix green on every organizer route.
- [ ] The decision register records DEC-012, DEC-013, DEC-021 and DEC-027.
- [ ] **DEC-010 (funds flow) is decided or has a firm date before Phase 7 begins.**
- [ ] Earlier suites green. Staging walkthrough of the full organizer journey recorded.

---

## Phase 6 — Inventory, Pricing, and Orders

**Goal.** Customers can create orders that atomically reserve inventory, carry an immutable pricing snapshot and are safe against retries. Free orders complete the full path. Expired reservations are released exactly once.

**Why here.** Inventory is the platform's most important correctness boundary (ARCH §7). It is built and proven under concurrency *before* real money is attached, so payment bugs can never be confused with inventory bugs.

**Entry criteria.** Phase 5 exit checklist complete. DEC-016, DEC-017, DEC-023 and DEC-001 to DEC-003 recorded, or provisional defaults accepted for development.

**How inventory works (plain explanation).** Each ticket type holds three numbers: *total*, *reserved* (held for customers who are still checking out) and *sold*. The rule is always `reserved + sold ≤ total`. To reserve tickets, one SQL statement atomically increases `reserved` only if enough remain. PostgreSQL makes concurrent statements on the same row take turns, so two customers can never both take the last ticket. We also keep a database `CHECK` constraint as a second line of defence.

#### P6-T01 — Fee configuration and calculation
`MVP-conditional (DEC-001 to 003)` · Size M · Review R3 · **Depends on:** `P2-T01`, `P4-T04`

**Objective.** An effective-dated, versioned platform-fee configuration and a pure calculation function.

**Scope.**
- A `fee_configs` table: method parameters (percentage, fixed amount, minimum and maximum as DEC-001 decides), rounding mode, scope, effective-from, active flag, creator and version. Rows are never updated in place.
- Admin endpoints to create and activate a configuration, requiring step-up and writing an audit record.
- A pure `calculateFee(subtotal, config)` returning fee, total and the exact parameters used.
- A quote-time rule that the same function is used for display and for order creation.

**Out of scope.** Order creation (`P6-T04`).

**Acceptance criteria.**
- Calculation matches owner-approved golden vectors, including small amounts and rounding boundaries.
- Changing the fee creates a new version, and never alters old ones.
- Production activation is impossible until the decision register records DEC-001 to DEC-003.

**Testing.** `[INV-13]` Golden-vector table. Property tests: total equals subtotal plus fee, fee is never negative, and zero subtotal gives zero fee (provisional). Version-immutability test. Step-up and permission matrix. R3: the owner signs the vectors, and counsel confirms the disclosure approach.

#### P6-T02 — Inventory model and atomic reservation
`MVP` · Size L · Review R2 · **Depends on:** `P5-T03`, `P2-T02` · **Needs:** DEC-016

**Objective.** A reservation primitive that cannot oversell.

**Scope.**
- Add `quantity_reserved` and `quantity_sold` to ticket types with checks: both at least zero and `reserved + sold ≤ total`.
- `reservations` and `reservation_items` with states (`active`, `committed`, `expired`, `released`) and `expires_at` set from the **database clock**.
- Operations used by other modules only through this interface: `reserve`, `commit` (reserved to sold), `release`.
- `reserve` uses one conditional update per ticket type (`… SET reserved = reserved + :n WHERE total − reserved − sold ≥ :n`). When it affects zero rows, it fails with `INSUFFICIENT_INVENTORY` and rolls back the entire transaction.
- Multi-line reservations lock ticket types in a **sorted order** to avoid deadlocks.
- Reservation duration comes from configuration.

**Out of scope.** Orders, pricing, expiry job.

**Acceptance criteria.**
- With one ticket left and N concurrent buyers, exactly one succeeds.
- A reservation that fails on any line leaves no partial hold.
- The database rejects any write that would break `reserved + sold ≤ total`, even if the service is bypassed.
- `commit` and `release` are each applicable once per reservation.

**Testing.** `[INV-06]` Concurrency: last-ticket race with N parallel callers, repeated 20 times. Multi-line deadlock test with opposite line orders. Constraint bypass test (direct SQL). Double-`commit` and double-`release` tests. Rollback test.

#### P6-T03 — Purchase validation and limits
`MVP` · Size M · Review R2 · **Depends on:** `P6-T02`, `P5-T06`, `P3-T03` · **Needs:** DEC-017, DEC-023

**Objective.** One validation function that decides whether a requested basket is allowed.

**Scope.**
- **Merge repeated order lines for the same ticket type** before applying limits (BR §8.4).
- Validate event eligibility (through the single purchase-eligibility policy), ticket-type status and sales window, per-order minimum and maximum, a per-customer cumulative cap per event across orders, and verified email.
- The cumulative cap is made concurrency-safe with a per-customer-per-event transaction lock (or an equivalent counter row), and the chosen approach is recorded.
- Free tickets are validated by the same code.

**Acceptance criteria.**
- Splitting a quantity across repeated lines cannot exceed any limit.
- Two simultaneous orders by one customer cannot jointly exceed the per-customer cap.
- Suspended, cancelled, unapproved and unpublished events are rejected.

**Testing.** `[INV-01]` `[INV-02]` `[INV-07]` Eligibility matrix. Repeated-line bypass test. Concurrency test on the cumulative cap. Unverified-email test.

#### P6-T04 — Quote and order creation with pricing snapshot
`MVP` · Size L · Review R3 · **Depends on:** `P6-T01`, `P6-T03`, `P2-T05`

**Objective.** An idempotent, atomic order creation that stores everything needed to explain the price forever.

**Scope.**
- `POST /orders/quote` (stateless, same calculation) returning subtotal, platform fee, total and the refund-policy summary.
- `POST /orders` requiring an `Idempotency-Key` and the `expectedTotal` the customer saw. A mismatch returns `PRICE_CHANGED` and creates nothing.
- One transaction: validate, reserve, create the order, order items and **pricing snapshot** (quantities, unit prices, subtotal, fee, total, currency, fee-config version, rounding mode), record the reservation expiry and write an audit or outbox record as needed.
- Orders start `pending`. Payment status is `not_required` when total is zero and `pending` otherwise.
- A human-readable order number separate from the primary key.
- Snapshot rows have no update path in the application, and a database guard prevents edits.

**Out of scope.** Payment, confirmation of paid orders.

**Acceptance criteria.**
- Replaying the same request returns the same order and reserves nothing extra.
- Sending the same key with a different basket fails with `IDEMPOTENCY_KEY_REUSED`.
- Changing ticket prices or the fee afterwards leaves existing orders unchanged.
- An authenticated customer is required.
- No order exists without its reservation, and no reservation without its order.

**Testing.** `[INV-03]` `[INV-10]` `[INV-13]` `[INV-19]` Concurrency: 20 parallel identical requests give one order. Price-change-between-quote-and-order test. Snapshot-immutability test after fee and price changes. Atomicity: force a failure after the reserve step and verify nothing remains. R3: owner review of the snapshot fields against BR §9.2 and §10.3.

#### P6-T05 — Free-order confirmation
`MVP` · Size M · Review R2 · **Depends on:** `P6-T04`

**Objective.** Free orders follow the same inventory and validation path, and confirm without a provider.

**Scope.**
- When total is zero, confirm in the same transaction as creation: reservation committed (reserved to sold), order `confirmed`, payment status `not_required`, and an `order.confirmed` outbox event.
- Ticket issuance itself is delivered in `P7-T07`. Until then the outcome under test is the confirmed order and the outbox row.

**Acceptance criteria.** Free orders are subject to the same limits and inventory as paid ones. A free order consumes inventory exactly once. An auditable order record exists.

**Testing.** `[INV-06]` `[INV-07]` Free-ticket last-ticket race. Limit-bypass attempts via free orders. Idempotent replay.

#### P6-T06 — Reservation expiry
`MVP` · Size L · Review R2 · **Depends on:** `P6-T02`, `P6-T04`, `P2-T04`

**Objective.** Abandoned reservations return their inventory exactly once, and correctness never depends on the worker being on time.

**Scope.**
- A recurring worker job that finds active reservations whose `expires_at` has passed and releases each with a conditional transition (`WHERE status = 'active' AND expires_at <= now()`), returning inventory and moving the order to `expired`.
- **Lazy enforcement:** any attempt to pay, confirm or extend an expired reservation fails based on the stored timestamp, whether or not the job has run.
- A bounded extension API, used when a payment attempt starts (DEC-022).
- Batching and safe re-runs.

**Acceptance criteria.**
- Running the job twice, or on two workers, releases each reservation once.
- A reservation committed by a confirmed order is never released.
- With the worker stopped, an expired reservation still cannot be confirmed.

**Testing.** `[INV-06]` Race between expiry and commit (exactly one wins and inventory is correct either way). Double-run test. Worker-down test with an injected clock. Reconciliation counters equal reservation sums after chaos.

#### P6-T07 — Order reads and pending-order cancellation
`MVP` · Size M · Review R2 · **Depends on:** `P6-T04`, `P6-T06`

**Objective.** Customers can see their own orders and cancel a pending one.

**Scope.** `GET /orders/me` (paginated), `GET /orders/:id` with ownership policy, and `POST /orders/:id/cancel` for `pending` orders, which releases the reservation using the same release primitive.

**Acceptance criteria.** A customer can never read another customer's order. Cancelling twice is safe. A cancelled order's inventory is released once.

**Testing.** `[INV-05]` Customer IDOR matrix. Idempotent cancel. Race between cancel and expiry.

#### P6-T08 — Inventory reconciliation check
`MVP` · Size S · Review R2 · **Depends on:** `P6-T06`

**Objective.** Detect any drift between counters and the records that justify them.

**Scope.** A scheduled job that compares each ticket type's `reserved` and `sold` against active reservation and confirmed-ticket-or-order sums and records discrepancies. It alerts and never auto-corrects.

**Acceptance criteria.** Injected drift is detected and reported. Healthy data produces no findings.

**Testing.** Drift-injection test.

#### P6-T09 — Frontend slice: checkout and orders
`MVP` · Size M · Review R1 · **Depends on:** `P6-T07`

**Objective.** A customer can review a quote, place an order and see their orders.

**Scope.** Ticket selection, a breakdown showing ticket subtotal, platform fee and total, the refund-policy summary (final text arrives in `P10-T06`), a reservation countdown driven by server time, an idempotency key generated per checkout attempt and reused on retry, clear `INSUFFICIENT_INVENTORY` and `PRICE_CHANGED` handling, and an order history list. The client never retries a non-idempotent request without the key.

**Acceptance criteria.** Free-ticket checkout works on staging end to end up to a confirmed order. The breakdown is shown before confirmation.

**Testing.** Playwright for the free-order flow. Component tests for error states.

**Phase 6 exit criteria.**
- [ ] Concurrency suite (last ticket, multi-line, repeated order requests, expiry versus commit, cumulative cap) passes 20 consecutive times.
- [ ] Database constraints alone prevent `reserved + sold > total`.
- [ ] Snapshots are demonstrably unaffected by later price or fee changes.
- [ ] Free-order path confirms and records an outbox event.
- [ ] Owner has signed the fee golden vectors and the snapshot fields.
- [ ] **DEC-010 recorded** (a hard gate for `P7-T01`).

---

## Phase 7 — Payments, Tickets, and Check-in

**Goal.** A paid order is confirmed only after trusted verification of a payment. Tickets are issued exactly once. Check-in is concurrency-safe. Everything survives duplicates, timeouts and crashes.

**Why here.** This is where external systems enter. Inventory is already proven, so failures here can be investigated without doubt about the foundation.

**Entry criteria.** Phase 6 exit checklist complete. DEC-010 and DEC-022 recorded (or provisional defaults for DEC-022), and `docs/provider-capabilities.md` available.

**Provider-call rule (plain explanation).** The database cannot undo a call to the provider, and the provider cannot join our transaction. So for every external call we follow the same four beats: **(1)** record our intent and commit, **(2)** make the call, **(3)** record the result, and **(4)** if the result is unknown (a timeout), treat it as *unknown*, check with the provider later and never simply try again.

#### P7-T01 — Provider adapter, fake provider and fault injection
`MVP` · Size L · Review R2 · **Depends on:** `P2-T04`, `P0-T06` · **Needs:** DEC-010

**Objective.** The business logic talks to an interface, and tests can make that interface misbehave.

**Scope.**
- A typed `PaymentProvider` interface: initialise a transaction, verify by reference, and (extended in Phase 8 and 9) refund and transfer.
- A Paystack implementation of initialise and verify, with explicit timeouts, and **no blind retries** of non-idempotent calls.
- An in-memory **fake provider** with fault injection: timeouts, delayed success, duplicate webhooks, wrong amount, wrong currency and out-of-order events.
- Contract tests runnable against the provider sandbox.
- Secrets read only through validated configuration.

**Acceptance criteria.**
- Business modules import the interface and never the Paystack implementation.
- Every injected fault is selectable in a test.
- Sandbox contract tests pass for initialise and verify.

**Testing.** Adapter unit tests with recorded fixtures. Sandbox contract tests (on demand and nightly). Import-boundary lint rule.

#### P7-T02 — Ledger foundation (provisional)
`MVP` · Size L · Review R3 · **Depends on:** `P2-T01`, `P2-T03` · **Needs:** ADR-027, DEC-019

**Objective.** An append-only financial record in place before the first payment is applied (C-02).

**Scope.**
- Accounts and journal entries with the invariant that each journal's debits equal its credits.
- Entry types needed now: customer payment received, platform fee revenue, organizer payable. Each entry links to its originating order and payment attempt.
- A **uniqueness constraint** on (source, source ID, entry type) so one business event can post only once.
- No update or delete path. Corrections are reversing entries (completed in `P8-T07`).
- The model sits behind a small interface so the accountant's review can change it without touching callers.

**Out of scope.** Refund, payout and provider-fee entries.

**Acceptance criteria.**
- An unbalanced journal is rejected by the database or a deferred constraint.
- Posting the same source twice is a no-op or a defined error, never a duplicate.
- Updates and deletes fail.

**Testing.** `[INV-14]` Balance invariant test. Duplicate-post test. Immutability test. R3: the accountant reviews the account structure before Phase 9, and a provisional label remains until then.

#### P7-T03 — Payment attempts and initiation
`MVP` · Size L · Review R3 · **Depends on:** `P7-T01`, `P6-T06`, `P2-T05` · **Needs:** DEC-010, DEC-022

**Objective.** Start a payment for a pending order without ever risking a double charge.

**Scope.**
- `payment_attempts` table with a platform-generated **unique reference**, amount and currency copied from the order snapshot, status and provider identifiers.
- `POST /orders/:id/payment-attempts` (idempotent). Follows the four beats: lock the order and re-check eligibility (order pending, reservation active, event purchasable), create the attempt and commit, call the provider, record the result.
- A **timeout** moves the attempt to `pending_verification` and enqueues a verification job. It never starts a second charge.
- A bounded reservation extension when an attempt starts (DEC-022).
- A cap on attempts per order and rules for when a new attempt is permitted.
- Confirm from `docs/provider-capabilities.md` whether re-initialising with the same reference is safe, and implement accordingly.

**Acceptance criteria.**
- The amount and currency always come from the order snapshot, never from the request.
- Concurrent initiation requests for one order create one active attempt.
- No database transaction stays open during the provider call.
- A suspended or cancelled event refuses new attempts.

**Testing.** `[INV-02]` `[INV-10]` Concurrency: parallel initiation on one order. Timeout test (unknown outcome, no second charge, verification job queued). Expired-reservation test. Amount-tampering test (client-supplied amount ignored). Ownership test.

#### P7-T04 — Webhook ingestion
`MVP` · Size M · Review R3 · **Depends on:** `P7-T01`, `P2-T07`, `P2-T04`

**Objective.** Safely accept provider notifications and defer their processing.

**Scope.**
- `POST /webhooks/paystack` using the **raw request body** and the provider's documented signature scheme.
- `provider_events` table with a unique constraint on provider and event identifier (or a derived key), receipt time, status, attempts and last error.
- Persist, then acknowledge, then process in the worker (ARCH §10.1). Invalid signatures are rejected, are never persisted as trusted and are logged without payload secrets.
- The endpoint stays lightweight and exempt from user rate limits, but protected by signature checks and body-size limits.

**Out of scope.** Applying payment outcomes (`P7-T05`).

**Acceptance criteria.**
- A webhook is acknowledged only after it is durably stored.
- A duplicate delivery stores one row.
- A modified body fails signature verification.
- Malformed events are recorded for investigation and do not crash the endpoint.

**Testing.** `[INV-25]` Signature tests (valid, invalid, body-tampered, missing). Duplicate-delivery test. Persist-failure test (the endpoint must not acknowledge). Large and malformed payload tests.

#### P7-T05 — Payment verification and application
`MVP` · Size L · Review R3 · **Depends on:** `P7-T02`, `P7-T03`, `P7-T04`, `P6-T05` · **Needs:** DEC-022

**Objective.** Turn a trusted provider result into exactly one set of business effects.

**Scope.**
- A worker handler (also callable by the on-demand verification in `P7-T06`) that **asks the provider to verify** the transaction rather than trusting the webhook payload alone.
- Checks: reference, amount equals the snapshot total, currency, order association, expected provider status, not already applied (ARCH §8.4).
- One transaction applies the outcome: a conditional transition of the attempt (`WHERE status IN (pending, processing, pending_verification)`), order confirmation with reservation commit, ledger entries, and an `order.confirmed` outbox event. The conditional update is what makes concurrent duplicates harmless.
- Defined outcomes for exceptions, per DEC-022: a mismatched amount or currency moves the attempt to a needs-review state and alerts, and **never confirms**. A success after expiry attempts to re-claim inventory and otherwise queues a full refund. A success for a suspended or cancelled event follows the DEC-022 rule.
- Failed payments update the attempt only.

**Acceptance criteria.**
- Webhook, on-demand verification and a retry of both, arriving simultaneously, produce exactly one order confirmation, one set of ledger entries and one outbox event.
- A paid order never confirms without a verified match.
- A late success never oversells.

**Testing.** `[INV-06]` `[INV-08]` `[INV-10]` `[INV-25]` Concurrency: two webhooks plus a manual verify for one attempt. Amount-mismatch and currency-mismatch tests. Late-success tests (inventory available, inventory gone). Worker crash mid-apply (full rollback, safe retry). Replay after completion. Forged-reference test.

#### P7-T06 — Payment status and return flow
`MVP` · Size M · Review R2 · **Depends on:** `P7-T05`

**Objective.** The customer's return from the provider is a *hint to check*, never proof.

**Scope.** `GET /orders/:id/payment-status` with ownership policy. When the customer returns, the API triggers a rate-limited, idempotent verification through the same path as the webhook. The response reflects stored state only.

**Acceptance criteria.** Supplying a reference or success flag in a request cannot confirm an order. Repeated polling does not create extra effects.

**Testing.** `[INV-09]` Forged-redirect test. Rate-limit test. Ownership test.

#### P7-T07 — Ticket issuance and ticket reads
`MVP` · Size L · Review R3 · **Depends on:** `P7-T05`, `P6-T05` · **Needs:** ADR-026, DEC-026

**Objective.** Issue each entitled ticket exactly once, with an unguessable credential.

**Scope.**
- A worker handler on `order.confirmed` that creates one ticket per purchased unit. A **unique constraint on (order item, sequence)** makes a second run harmless.
- Credential per ADR-026: derived by HMAC, verified against the database, carrying no personal data, with a version for rotation.
- Issuance re-checks eligibility: the order is confirmed and the event is not cancelled (BR §7.5).
- Attendee is the purchaser unless DEC-026 changes this.
- `GET /tickets/me`, `GET /tickets/:id` with ownership policy. QR images are rendered client-side from the credential.
- A ticket-issued notification via the outbox.

**Acceptance criteria.**
- Running the handler twice, or on two workers, yields the same tickets.
- No ticket is issued for an unconfirmed order or a cancelled event.
- Credentials cannot be derived from ticket IDs without the server key.

**Testing.** `[INV-11]` Concurrency: two workers on one order. Re-run test. Cancelled-event test. Credential forgery test. Ownership matrix. Key-rotation test.

#### P7-T08 — Check-in
`MVP` · Size M · Review R2 · **Depends on:** `P7-T07` · **Needs:** DEC-024

**Objective.** Validate tickets at the door, with exactly one first-time success per ticket.

**Scope.**
- `POST /organizer/events/:id/check-in` accepting a credential. Verify the signature, then the ticket, event match and status. The check-in itself is a single conditional update (`… WHERE status = 'valid' AND checked_in_at IS NULL RETURNING …`).
- Distinct outcomes: `valid`, `invalid`, `revoked`, `already_used` (with the earlier check-in time) and `wrong_event`.
- Record the operator and time. Only the owning organizer (or staff, if DEC-024 changes this) may check in.

**Acceptance criteria.**
- Simultaneous scans of one ticket yield one success.
- A ticket for another event, a forged code and a revoked ticket are each rejected with the correct outcome.
- QR content contains no personal information.

**Testing.** `[INV-05]` `[INV-12]` Concurrency: N parallel scans. Wrong-organizer test. Forged and malformed credential tests.

#### P7-T09 — Payment and webhook operational visibility
`MVP` · Size M · Review R2 · **Depends on:** `P7-T05`, `P2-T04`

**Objective.** Failures in the payment path can be found and replayed safely (ARCH §10.3).

**Scope.** Admin read endpoints for failed or stuck webhook events, payment attempts awaiting resolution, needs-review items and dead-letter jobs, with permission-gated, audited **safe reprocess** actions that re-enter the normal idempotent path. Metrics for the ARCH §21.2 payment items.

**Acceptance criteria.** An admin can find any stuck payment and re-run it without creating a second effect.

**Testing.** Reprocess-twice test. Permission matrix.

#### P7-T10 — Purchase end-to-end and failure-injection suite
`MVP` · Size L · Review R2 · **Depends on:** `P7-T05` to `P7-T09`

**Objective.** Prove the whole purchase pipeline against every failure the architecture lists (ARCH §19.4).

**Scope.** Using the fake provider: provider timeout then success, success then timeout on our side, duplicate webhooks, worker crash after the provider call, email outage, reservation expiry during payment, payment success after expiry, mismatched amounts, and out-of-order events. Plus the Playwright *Customer purchase* journey (ARCH §19.5) using the provider sandbox on staging.

**Acceptance criteria.** Every scenario ends in a defined, consistent state: no double charge, no oversell, no lost payment and no duplicate ticket. The expected state per scenario is written before the test.

**Testing.** This task is testing. All outcomes also reconcile in the ledger.

#### P7-T11 — Frontend slice: payment, tickets and check-in
`MVP` · Size L · Review R1 · **Depends on:** `P7-T10`

**Objective.** Customers pay and receive tickets, and organizers check people in.

**Scope.** Payment redirect and return page that polls the *server's* status with clear pending, failed and uncertain states. Orders and tickets pages with QR display. Organizer check-in screen with unambiguous outcome display. Order-confirmation email content.

**Acceptance criteria.** A sandbox purchase completes on staging, and tickets appear only after verified payment.

**Testing.** Playwright for the paid flow and the check-in flow.

**Phase 7 exit criteria.**
- [ ] `P7-T10` failure-injection suite green. Concurrency suites pass 20 consecutive times.
- [ ] Webhook signature, duplicate and persist-first behaviour proven.
- [ ] One verified payment yields one confirmation, one ledger posting and one ticket set, under parallel attack.
- [ ] A staged sandbox purchase end to end, including check-in.
- [ ] Ledger marked **provisional** and booked for accountant review.
- [ ] `docs/provider-capabilities.md` updated with every observed deviation from assumption.

---

## Phase 8 — Refunds, Cancellation Consequences, and Reconciliation

**Goal.** Refunds are calculated by a policy engine, executed safely against the provider, recoverable after partial failure and fully auditable. Event cancellation triggers tracked, restartable consequences. Internal records can be reconciled against the provider.

**Why here.** Refunds reuse everything proven in Phase 7 (adapter, outbox, idempotency, ledger) and are the first place the platform *sends* money out, so they are built before payouts.

**Entry criteria.** Phase 7 exit checklist complete. DEC-010 recorded. Counsel's review of the fee-retention rule has been requested (the engine is configurable, so the task may proceed while the answer is pending).

#### P8-T01 — Refund policy engine
`MVP` · Size L · Review R3 · **Depends on:** `P6-T04`, `P7-T05`, `P2-T01`

**Objective.** A pure, configurable function that states how much may be refunded and why.

**Scope.**
- Inputs: the order's pricing snapshot, successful payments, previous refunds, the scenario and the legal-override configuration.
- Scenarios implemented now: **organizer cancellation** (ticket subtotal refundable, platform fee retained, BR §13.1–13.2), **duplicate payment**, **failed or incomplete capture** and **late payment that cannot be fulfilled** (all full refunds). Customer-requested and rescheduling scenarios exist as stubs that refuse until DEC-004 and DEC-005 are decided.
- The fee-retention behaviour is a **configuration flag** so a legal ruling that the fee must be refunded is a configuration change.
- Output includes the amount, the components and the reason code, and never exceeds the unrefunded paid amount.

**Acceptance criteria.**
- The BR §13.2 example (₦10,000 subtotal and ₦500 fee gives ₦10,000 refund) is a golden test.
- The result never exceeds what was paid minus what was already refunded.
- Partial cancellations are handled.

**Testing.** `[INV-15]` `[INV-24]` Golden vectors. Property tests (sum of refunds never exceeds paid). Scenario table tests. R3: counsel reviews the fee-retention rule, and the result is recorded.

#### P8-T02 — Refund records, eligibility and concurrency control
`MVP` · Size L · Review R3 · **Depends on:** `P8-T01`, `P2-T05`, `P2-T02`

**Objective.** A durable refund record, and an eligibility check that holds under concurrency.

**Scope.**
- `refunds` table with the lifecycle from `docs/state-machines.md` (`requested`, `approved`, `processing`, `succeeded`, `failed`, `rejected`), a unique idempotency key, the calculated amount and components, reason, authoriser, provider reference and timestamps.
- Eligibility and amount calculation run **inside a transaction that locks the order's payment row**, so two concurrent refund requests cannot jointly exceed the refundable amount.
- System-initiated refunds (event cancellation, failed late payments) are auto-approved by policy and recorded as such. Manual refunds require an admin permission and step-up.
- The decision (`approved`) is distinct from the movement of money (`succeeded`).

**Acceptance criteria.**
- Concurrent requests for the same order never exceed the refundable amount.
- A repeated request with the same key returns the same refund.
- Admin manual refunds require the permission and are audited.

**Testing.** `[INV-10]` `[INV-15]` `[INV-16]` Concurrency: parallel refund requests totalling more than refundable. Idempotent replay. Illegal-transition tests. Permission matrix.

#### P8-T03 — Refund execution against the provider
`MVP` · Size L · Review R3 · **Depends on:** `P8-T02`, `P7-T01`, `P7-T02` · **Needs:** DEC-010, DEC-006

**Objective.** Execute a refund once, and recover when the outcome is unknown.

**Scope.**
- Extend the adapter with refund and refund-verify, using the provider's idempotency features where `docs/provider-capabilities.md` confirms they exist. Otherwise rely on durable attempt records and verification before any retry (ARCH §11.2).
- Worker handler following the four beats: persist the attempt and commit, call the provider, record the result and verify any unknown result before retrying.
- On confirmed success, **one transaction** marks the refund `succeeded`, updates the order's refund summary, posts the ledger entries and enqueues ticket revocation and the customer notification.
- Refund deadline alert thresholds are configurable (DEC-006).
- A refund is never marked `succeeded` before provider confirmation or reconciliation (BR §7.5).

**Acceptance criteria.**
- A timeout leaves the refund `processing`, and a later verification resolves it without a second refund.
- A crash after provider success is repaired by verification or reconciliation without a duplicate refund.
- Duplicate jobs produce one provider refund.

**Testing.** `[INV-10]` `[INV-16]` Fault-injection suite: provider timeout, success then crash before local update, duplicate job, provider failure then safe retry, provider without idempotency support. Ledger-balance assertion after each.

#### P8-T04 — Ticket revocation
`MVP` · Size M · Review R2 · **Depends on:** `P8-T03`, `P7-T08`

**Objective.** Revoke tickets as an auditable status change that preserves history (BR §12.4).

**Scope.** A revocation operation with reasons (refund, event cancellation, fraud, administrative correction), applied in the same transaction as the refund success where possible and repaired by reconciliation otherwise. Revoked tickets fail check-in with a `revoked` outcome. Whether a refunded ticket returns inventory is governed by an explicit rule recorded in the state machines (not applicable for cancelled events).

**Acceptance criteria.** A revoked ticket cannot check in. The original ticket row is retained. Revocation is audited.

**Testing.** Check-in rejection test. Idempotent revocation. Reconciliation-repair test (refund succeeded, ticket still valid).

#### P8-T05 — Event-cancellation orchestration
`MVP` · Size L · Review R3 · **Depends on:** `P8-T03`, `P8-T04`, `P5-T06`, `P2-T04`

**Objective.** Turn an `event.cancelled` event into tracked, restartable consequences (ARCH §13.2–13.3).

**Scope.**
- A `cancellation_runs` table recording status, counts and failures per step.
- Steps, each idempotent and resumable: block sales (already done by the event state), expire pending orders and reservations, identify confirmed orders, create refunds through the engine (free orders only revoke tickets), revoke tickets, enqueue customer notifications, update organizer payable inputs.
- **Processing in batches**, so a large event does not run as a single huge transaction.
- A payment that completes **after** cancellation is handled according to DEC-022 and refunded.
- Admin view of progress and failures.

**Out of scope.** The notification templates (`P10-T05`).

**Acceptance criteria.**
- Re-running the orchestration, or resuming after a crash, never creates a second refund.
- Every affected order ends with a defined outcome and a visible status.
- The event module never writes directly to payment, refund, ticket or payout tables.

**Testing.** `[INV-02]` `[INV-10]` Cancellation during active checkout. Resume-after-crash test. Large-event batch test. Payment-after-cancellation test. Free-order cancellation test. The ARCH §19.5 *Event cancellation* journey.

#### P8-T06 — Customer refund requests
`MVP-conditional (DEC-004)` · Size M · Review R3 · **Depends on:** `P8-T02` · **Needs:** DEC-004

**Objective.** Support customer-requested refunds if, and exactly as, the business policy allows.

**Scope.** `POST /orders/:id/refund-requests` and `GET /refunds/me`. Until DEC-004 is decided, requests are accepted only as support cases (`P10-T01`) and cannot create refunds. Once decided, the policy is added to the engine as configuration with tests.

**Acceptance criteria.** No refund can be created for a scenario the owner has not approved.

**Testing.** Ownership matrix. Policy-table tests for each approved scenario.

#### P8-T07 — Ledger completion, adjustments and financial history
`MVP` · Size L · Review R3 · **Depends on:** `P7-T02`, `P8-T03`, `P4-T04` · **Needs:** DEC-019

**Objective.** The ledger can explain every financial event, and corrections are explicit.

**Scope.**
- Entry types for refund liability, refund completed, provider fees (where known) and reversals.
- A permission-gated, step-up-protected **adjustment** operation that always writes reversing and replacement entries and an audit record, with a required reason.
- Read APIs: customer financial history for their own orders, organizer financial history for their own events, and admin financial views.
- Reports needed by the accountant.

**Acceptance criteria.**
- For any order the ledger reconstructs payment, fee, refund and net organizer position.
- No entry can be edited or deleted. Corrections appear as new entries.
- Organizers see only their own data.

**Testing.** `[INV-14]` Balance and immutability tests. Reconstruction test across scenarios (paid, partially refunded, cancelled). Authorisation matrix. R3: the accountant signs off the entry catalogue.

#### P8-T08 — Payment and refund reconciliation
`MVP` · Size L · Review R3 · **Depends on:** `P8-T03`, `P7-T05`

**Objective.** Find and safely repair differences between our records and the provider's (BR §15.4).

**Scope.**
- A scheduled job that compares the provider's transaction and refund lists with internal records over a window and writes findings: missing in our records, unconfirmed by the provider, amount mismatches, duplicates and refund discrepancies.
- Safe repair for known-safe classes only (for example a missing webhook is repaired by running the normal verification path). Anything else becomes a visible **discrepancy** for manual review.
- Admin discrepancy view with status and resolution notes, and an alert on unresolved items.

**Acceptance criteria.** Injected divergences of each class are detected. Auto-repair only ever uses the normal idempotent path. Nothing is silently rewritten.

**Testing.** Fault-injection test per discrepancy class. Idempotent re-run. Permission matrix.

#### P8-T09 — Frontend slice: refunds, cancellation and finance monitor
`MVP` · Size M · Review R1 · **Depends on:** `P8-T08`

**Objective.** Customers, organizers and admins can see refund and cancellation state.

**Scope.** Refund status on customer orders, organizer cancellation request flow and refund summaries, admin cancellation-run progress, refund monitor and discrepancy list.

**Acceptance criteria.** Requested, processing, succeeded and failed refunds are visually distinct (BR §13.3).

**Testing.** Playwright for the cancellation journey.

**Phase 8 exit criteria.**
- [ ] Concurrent refund requests cannot exceed the refundable amount (repeated 20 times).
- [ ] Refund fault-injection suite green, including success-then-crash.
- [ ] Cancelling an event with many orders completes, resumes after a crash and never double-refunds.
- [ ] Reconciliation finds each injected discrepancy class.
- [ ] Accountant has reviewed the ledger entry catalogue. Counsel has responded on the fee-retention rule, or the engine ships with the conservative configuration and the open item is on the launch checklist.
- [ ] **Re-plan checkpoint:** confirm DEC-010 still matches the Phase 9 design below.

---

## Phase 9 — Settlement and Payouts

**Goal.** Organizers are paid only what is payable, only when the configured policy allows, and never twice. Every outcome reconciles with the provider.

**Why here.** Payouts depend on the ledger, refunds and event status, all of which now exist. It is also the highest-risk phase, so it comes last among backend phases.

**Entry criteria.** Phase 8 exit checklist complete. DEC-007, DEC-008, DEC-009 and DEC-010 recorded. The accountant has reviewed the ledger model and the funds flow has legal approval.

> **Re-plan note.** This phase assumes the platform calculates organizer payables and instructs the provider to transfer them. If DEC-010 selects provider-managed settlement or split payments, tasks `P9-T04` to `P9-T06` shrink to *monitoring and reconciling the provider's settlements and applying holds through provider features*. Rewrite this phase before starting it.

#### P9-T01 — Settlement policy configuration
`MVP-conditional (DEC-007)` · Size M · Review R3 · **Depends on:** `P4-T04`, `P8-T07` · **Needs:** DEC-007

**Objective.** Settlement rules live in versioned, audited configuration and never in code (BR §14.1, §14.3).

**Scope.**
- `settlement_policies`: event milestone, waiting period, minimum payout, hold rules, permitted methods and restrictions, effective dates and version.
- Admin endpoints requiring finance permission and step-up, with audit.
- A defined and tested rule for balances that accrued under an earlier policy (no silent recalculation, BR §14.3).
- Each payout later records the policy version that governed it.

**Acceptance criteria.** Policy changes create new versions. Existing accrued balances are handled by the documented rule. No period is hardcoded.

**Testing.** `[INV-17]` Effective-dating tests with an injected clock. Policy-change-after-accrual test. Permission matrix.

#### P9-T02 — Organizer payable calculation
`MVP` · Size L · Review R3 · **Depends on:** `P9-T01`, `P8-T07`, `P2-T01`

**Objective.** A documented, testable calculation of what an organizer is owed, derived from the ledger.

**Scope.**
- Payable derived from verified payments, less platform fees, less processed refunds, less pending refunds and disputes, less holds, less already paid or allocated amounts.
- A breakdown the organizer can read: gross ticket sales, platform fees, refunds, payable, on hold, and paid (BR §14.2, §16.2).
- The calculation is a pure function with a SQL read model, and the two are tested against each other.

**Acceptance criteria.**
- Sales totals are never presented as withdrawable funds.
- A refund after accrual reduces the payable correctly.
- A cancelled event's payable is recalculated.

**Testing.** Scenario table (paid, partly refunded, cancelled, refund pending, held). Reconciliation of the function against the ledger in every scenario. Organizer-isolation matrix.

#### P9-T03 — Payout destinations
`MVP` · Size M · Review R3 · **Depends on:** `P4-T03`, `P2-T08`

**Objective.** Collect and protect the organizer's payout details.

**Scope.**
- Add and change a payout destination, with ownership verification through the provider (for example, an account-name lookup) where available.
- Encrypt stored account details at rest, with key management per the secrets plan. Mask them in every response and log.
- Changing a destination triggers a notification and a cooling-off hold on payouts.
- Access is organizer-owner and permission-gated admins only, and audited.

**Acceptance criteria.** Details are never returned unmasked, never logged, and a change cannot be used to redirect an already-approved payout.

**Testing.** `[INV-23]` Encryption-at-rest test. Masking test. Change-then-payout hold test. Authorisation matrix.

#### P9-T04 — Eligibility, holds and allocations
`MVP` · Size L · Review R3 · **Depends on:** `P9-T02`, `P9-T03` · **Needs:** DEC-009

**Objective.** Decide what is eligible, and reserve it so it can be used once.

**Scope.**
- A scheduled evaluation marks payable amounts eligible according to the policy and event milestone.
- Holds (manual, dispute, risk, event suspended or cancelled) with reason, creator and release.
- `payable_allocations`: each eligible payable line can belong to **at most one payout**, enforced by a unique constraint and conditional update.
- Creating a payout allocates in the same transaction that creates the payout record.

**Acceptance criteria.**
- The same payable line cannot be allocated to two payouts, even concurrently.
- A hold blocks allocation. Releasing a hold is audited.
- Eligibility uses the policy version in force at the time.

**Testing.** `[INV-17]` `[INV-18]` Concurrency: two payout creations competing for one balance, exactly one wins. Hold tests. Clock-injected eligibility edge cases.

#### P9-T05 — Payout request and approval
`MVP-conditional (DEC-008)` · Size M · Review R3 · **Depends on:** `P9-T04`, `P4-T04` · **Needs:** DEC-008

**Objective.** Separate initiating from approving, per the chosen payout model.

**Scope.**
- Payout creation (organizer request or scheduled, per DEC-008) and admin approval for manual or exceptional payouts. **The approver differs from the requester**, with step-up (ARCH §12.5).
- A payout lifecycle from `docs/state-machines.md` (`pending`, `eligible`, `on_hold`, `processing`, `paid`, `failed`, `cancelled`).
- Cancellation of an unprocessed payout releases its allocation exactly once.

**Acceptance criteria.**
- Nobody can approve their own payout.
- Approval, allocation and the outbox job commit together.
- A cancelled payout frees its balance once.

**Testing.** `[INV-10]` `[INV-18]` Self-approval test. Double-approval race. Double-cancel test. Permission matrix.

#### P9-T06 — Payout execution
`MVP` · Size L · Review R3 · **Depends on:** `P9-T05`, `P7-T01`, `P8-T08`

**Objective.** Send a payout once, and recover when the outcome is unknown (ARCH §12.4).

**Scope.**
- Extend the adapter with transfer and transfer-verify, using a unique platform-generated reference and the provider's idempotency features where confirmed.
- Worker handler following the four beats. A timeout leaves the payout `processing`. It is **never resubmitted before verification**.
- Handle provider transfer webhooks with the same signature and persist-first rules as payments.
- On confirmed success, one transaction marks the payout `paid` and posts ledger entries. On confirmed failure, the allocation is released exactly once or the payout is held for review, according to the lifecycle.
- Notifications through the outbox.

**Acceptance criteria.**
- Duplicate jobs cause one transfer.
- A timeout followed by provider success resolves to a single `paid` payout.
- A crash after the provider call is repaired without a second transfer.

**Testing.** `[INV-10]` `[INV-18]` Fault-injection: timeout then success, success then crash, duplicate job, provider rejection, reversal after success. Concurrency: two workers on one payout. Ledger-balance assertion.

#### P9-T07 — Payout reconciliation and safety controls
`MVP` · Size M · Review R3 · **Depends on:** `P9-T06`

**Objective.** Detect payout discrepancies and provide emergency brakes.

**Scope.**
- Reconciliation of provider transfers against payouts, with discrepancy handling consistent with `P8-T08`.
- A **payout kill switch** (pause all payouts), a configurable per-payout and daily ceiling, and alerting on failures or unresolved discrepancies.

**Acceptance criteria.** Pausing stops new transfers immediately while leaving in-flight verification running. Ceilings are enforced server-side.

**Testing.** Kill-switch test. Ceiling tests. Injected discrepancy detection.

#### P9-T08 — Financial dashboards and frontend slice
`MVP` · Size L · Review R2 · **Depends on:** `P9-T07`

**Objective.** Organizers and admins can see balances and payouts clearly.

**Scope.** Organizer settlement and payout screens showing the breakdown from `P9-T02` with statuses, admin payout queue with approval and holds, and finance summaries. Clear distinction of gross sales, fees, refunds, payable and paid (BR §16.2).

**Acceptance criteria.** Organizers see only their own financial data (matrix). Held, eligible and paid amounts are distinct on screen.

**Testing.** Cross-organizer matrix. Playwright for approval.

#### P9-T09 — Payout end-to-end rehearsal
`MVP` · Size M · Review R3 · **Depends on:** `P9-T08`

**Objective.** Rehearse the full ARCH §19.5 *Organizer payout* journey.

**Scope.** Automated run on the fake provider, then a sandbox rehearsal, then (only after legal and accountant approval) a supervised live rehearsal with a very small real amount to an owner-controlled account.

**Acceptance criteria.** Every step produces the expected ledger and reconciliation state.

**Testing.** End-to-end suite plus documented rehearsal log.

**Phase 9 exit criteria.**
- [ ] Two concurrent payouts for one balance: exactly one succeeds (20 repetitions).
- [ ] Payout fault-injection suite green.
- [ ] Reconciliation detects injected discrepancies. Kill switch tested.
- [ ] Accountant has signed off the ledger and payable calculation.
- [ ] Funds flow and payout terms have legal approval recorded in the decision register.

---

## Phase 10 — Support, Compliance Features, and UI Completion

**Goal.** Complete the remaining MVP features that carry legal and customer-protection weight, and finish and harden the user interface.

**Why here.** These features depend on data and states that now exist (orders, tickets, refunds, payouts). Several also depend on legal text and decisions that take time to obtain.

**Entry criteria.** Phase 9 exit checklist complete. DEC-015 and DEC-018 recorded, or provisional defaults accepted. Legal documents in draft from counsel.

#### P10-T01 — Complaints and support cases
`MVP` · Size M · Review R2 · **Depends on:** `P8-T06`, `P4-T04` · **Needs:** DEC-018

**Objective.** Customers and organizers can report problems, and admins can resolve them with a record (BR §16, §18.3).

**Scope.** A support-case model linked optionally to an order or event, with status, assignment, internal notes, outcome and history. Customer and organizer submission and tracking. Admin triage with filtering and pagination. Case outcomes can trigger *existing* audited operations (such as an admin refund) and never bypass them. Fields for a target response time exist, but no timers are enforced until DEC-018 decides.

**Acceptance criteria.** Users see only their own cases. Admin actions are permissioned and audited. Case records are retained per the retention schedule.

**Testing.** Ownership matrix. Admin permission matrix. History immutability test.

#### P10-T02 — Admin oversight views
`MVP` · Size M · Review R2 · **Depends on:** `P7-T09`, `P8-T08`, `P9-T07`

**Objective.** One place to see what needs attention (BR §16.3).

**Scope.** Audit-log search and filtering (read-only, permission-gated, access itself audited), failed and dead-letter jobs, webhook failures, reconciliation discrepancies, held payouts, cancellation runs, and users and account status.

**Acceptance criteria.** Every list supports filtering, search, sorting and pagination. Sensitive records are visible only to the admin permission that needs them.

**Testing.** Permission matrix. Pagination tests. Audit-of-audit-access test.

#### P10-T03 — Account deletion and data-subject requests
`MVP-conditional (DEC-015)` · Size L · Review R3 · **Depends on:** `P3-T06`, `P8-T07`, `P2-T04` · **Needs:** DEC-015

**Objective.** Honour deletion and access requests while keeping records the law requires (BR §5.3, §18.2).

**Scope.**
- A worker-driven deletion process that anonymises personal data and **retains financial and audit records** with the minimum identifiers the retention schedule justifies, under restricted access.
- Rules from DEC-015 for upcoming tickets, active disputes and organizer obligations (deletion refused or deferred where required).
- A personal-data export (access and portability) delivered securely and expiring.
- Rectification through the profile.
- The deletion outcome is recorded without retaining what the user asked to remove.

**Acceptance criteria.**
- After deletion the user cannot authenticate and their personal fields are removed or anonymised everywhere in the inventory from `P3-T06`.
- Ledger, order and audit records stay intact and consistent (no broken references).
- Exports contain only that user's data.

**Testing.** `[INV-22]` Anonymisation completeness test driven by the data inventory. Referential-integrity test after deletion. Export isolation test. Blocked-deletion cases. R3: counsel reviews the retention exceptions.

#### P10-T04 — Retention and cleanup jobs
`MVP` · Size M · Review R2 · **Depends on:** `P10-T03`, `P2-T04`

**Objective.** Data is removed when the documented retention period ends.

**Scope.** Scheduled jobs for expired tokens, sessions and idempotency keys, minimisation of old webhook payloads, log and notification-body retention, and other items in the retention schedule. Each job is idempotent and reports counts.

**Acceptance criteria.** Each category in the retention schedule has a job and a test. No job deletes financial or audit records that must be kept.

**Testing.** `[INV-22]` Clock-injected retention tests. Protected-record test.

#### P10-T05 — Notification completeness
`MVP` · Size M · Review R2 · **Depends on:** `P8-T05`, `P5-T07`, `P2-T06`

**Objective.** Every notification listed in BR §17 is sent once, from the outbox, and failures are visible.

**Scope.** Templates and triggers for event suspension, reinstatement, rescheduling and cancellation (to ticket holders, batched), order, ticket, refund and payout events, organizer decisions and security-sensitive changes. Dedupe keys prevent repeats. Delivery failures appear in the admin oversight view.

**Acceptance criteria.** Each trigger has a test. A cancellation notifying thousands of customers is batched, resumable and never duplicated.

**Testing.** Dedupe tests. Batch-resume test. Provider-outage test.

#### P10-T06 — Legal documents, disclosures and acceptance records
`MVP · Launch gate` · Size M · Review R3 · **Depends on:** `P3-T01`, `P6-T09`

**Objective.** The product shows and records the policies that govern it, and they match what the system does (BR §18.6).

**Scope.** Versioned terms, privacy notice, refund and cancellation policy, organizer agreement and payout and settlement terms. Display at registration, checkout and organizer approval, with recorded acceptance of a specific version. Checkout shows the fee, the total and the refund-policy summary, including that the fee is non-refundable on organizer cancellation *if* counsel confirms that policy.

**Acceptance criteria.**
- Acceptance is stored per user and per document version.
- No policy text claims a feature the system lacks (a checklist is reviewed by counsel).

**Testing.** `[INV-19]` Acceptance-record tests. A checkout disclosure test. R3: counsel signs off the final texts.

#### P10-T07 — Frontend completion and accessibility
`MVP` · Size L · Review R1 · **Depends on:** `P10-T06`

**Objective.** All three dashboards are complete, consistent and usable on mobile and desktop (BR §16, ARCH §15.2).

**Scope.** Remaining dashboard views, loading, empty and error states, filtering, sorting and pagination on every list, responsive layouts, keyboard and screen-reader basics, consistent error mapping from the shared contract, and a review that no screen treats cached data or a redirect as truth.

**Acceptance criteria.** All routes in the API contract that the BR requires for the three dashboards have a screen. An accessibility check passes on core flows.

**Testing.** Playwright across roles. Automated accessibility checks on key pages.

**Phase 10 exit criteria.**
- [ ] Every BR §23.1 capability has a verified implementation.
- [ ] Deletion and export verified against the data inventory.
- [ ] Notification matrix complete.
- [ ] Legal texts are final drafts reviewed by counsel (or listed on the launch checklist with an owner).

---

## Phase 11 — Production Readiness, Pilot, and Cutover

**Goal.** Demonstrate that the platform is secure, observable, recoverable, lawful to operate and equivalent to the legacy system, then move users over without risking the legacy system until it is proven.

**Why last.** These tasks verify the whole system and depend on all of it. They are also the formal **launch gates**: no real money moves until each is signed off.

**Entry criteria.** Phase 10 exit checklist complete.

#### P11-T01 — Threat model and security review
`Launch gate` · Size L · Review R3 · **Depends on:** Phase 10

**Objective.** Independent assurance on the security-critical surfaces.

**Scope.** A written threat model for authentication and sessions, checkout and payment, webhooks, refunds, payouts, admin, file handling and personal data. A full authorisation-matrix verification across every route. Dependency audit and secret scan. A penetration test or structured security review by a reviewer other than the author, covering OWASP-style web and API risks. Secrets rotation test.

**Acceptance criteria.** No unresolved critical or high finding. Each accepted lower-severity risk has an owner and a date.

**Testing.** The review itself, with regression tests added for every finding.

#### P11-T02 — Regulatory and legal launch checklist
`Launch gate` · Size M · Review R3 · **Depends on:** `P0-T06`, `P10-T06`

**Objective.** Evidence that the legal and regulatory obligations in BR §18 have been assessed and met.

**Scope.** A signed checklist containing: data-protection assessment and any registration, audit or DPO decision; processor agreements and the cross-border position; consumer-protection review of pricing, refunds and the fee rule; the funds-flow and payment-regulation approval (DEC-010); tax and accounting advice (DEC-019); published policies; the complaint procedure; and the provider's live-mode approval.

**Acceptance criteria.** Each item has a named approver, a date and a link to the evidence. The decision register shows DEC-001 to DEC-027 as `decided`.

**Testing.** Not applicable. This is a sign-off task.

#### P11-T03 — Load and concurrency testing
`Launch gate` · Size L · Review R2 · **Depends on:** Phase 10

**Objective.** Show that the system stays correct and responsive under realistic and peak demand.

**Scope.** Define targets with the owner (concurrent buyers on a small inventory, public browsing load, webhook bursts). Run load tests against staging with a production-like database. Tune pool sizes, add indexes justified by query plans, and recheck reservation and order throughput. Re-run every concurrency suite at scale.

**Acceptance criteria.** Zero oversells and zero duplicate effects at peak. Latency and error-rate targets are met. Results and tuning are recorded.

**Testing.** Load scripts kept in the repository. Post-run invariant checks (inventory and ledger reconcile).

#### P11-T04 — Observability and alerting
`Launch gate` · Size M · Review R2 · **Depends on:** `P7-T09`, `P8-T08`, `P9-T07`

**Objective.** Failures in money-moving paths are noticed quickly.

**Scope.** Error monitoring, structured-log aggregation and dashboards for the ARCH §21.2 metrics (API errors and latency, database health, worker backlog and failures, webhook failures, orders awaiting payment resolution, expired reservations, refund and payout failures, reconciliation discrepancies, email failures). Alerts with owners and thresholds, health checks that distinguish alive from healthy, and a documented on-call approach appropriate to the team size.

**Acceptance criteria.** Each injected failure in a staging drill raises the expected alert. No alert or dashboard displays secrets or unnecessary personal data.

**Testing.** Alert drills.

#### P11-T05 — Backups and restoration
`Launch gate` · Size M · Review R2 · **Depends on:** `P1-T07`

**Objective.** Prove that the data can be recovered.

**Why it matters (plain explanation).** A backup you have never restored is only a hope. The drill below turns hope into evidence and also measures how long recovery actually takes.

**Scope.** Confirm automated backups (and point-in-time recovery if available), restrict backup access, restore into a separate environment, run the invariant and reconciliation checks against the restored data, and time the whole procedure. Record recovery objectives. Document migration-failure recovery and the response to data corruption.

**Acceptance criteria.** A timed restoration drill passes. Recovery objectives are approved by the owner. The restore procedure is written so someone else can follow it.

**Testing.** The drill, repeated on a schedule.

#### P11-T06 — Production deployment hardening
`Launch gate` · Size L · Review R3 · **Depends on:** `P1-T07`, `P11-T01`

**Objective.** A production environment built from the rehearsed staging pipeline.

**Scope.** Hosting chosen on resource limits, persistence, region and backups (a free tier is not assumed suitable for financial operations, ARCH §20.1). Production secrets in the secret store, with rotation. Separate migration and application database roles. TLS, HSTS and the cookie-domain configuration from ADR-019. Production provider keys held apart from staging. Release pipeline with migration step, readiness gate, rollback and the expand/contract rule. Verified graceful shutdown for API and worker under load. Production data never copied to lower environments.

**Acceptance criteria.** A production release and a rollback are rehearsed before launch. No staging credential works in production, and vice versa.

**Testing.** Release and rollback rehearsal. Shutdown-under-load test. Credential-isolation check.

#### P11-T07 — End-to-end suite and user acceptance
`Launch gate` · Size L · Review R2 · **Depends on:** `P11-T03`, `P11-T04`

**Objective.** The four ARCH §19.5 journeys, plus free checkout, pass on production-like infrastructure and are accepted by the owner.

**Scope.** Automated journeys (customer purchase, organizer onboarding, event cancellation, organizer payout) with provider sandbox. A scripted UAT checklist covering every BR §24 acceptance criterion, executed by the owner and at least one non-developer.

**Acceptance criteria.** Every BR §24 criterion is ticked with evidence. The invariant-tag report shows at least one passing test for each of INV-01 to INV-25.

**Testing.** The suite and the traceability report.

#### P11-T08 — Operational runbooks
`Launch gate` · Size M · Review R2 · **Depends on:** `P11-T04`

**Objective.** Someone other than the author can run and recover the platform.

**Scope.** Runbooks for: a stuck payment, failed webhooks, dead-letter jobs, refund discrepancy, payout hold and failure, reconciliation discrepancy, inventory discrepancy, kill-switch use, secrets rotation, restore from backup, failed migration, personal-data breach (with the owner, escalation path and counsel contact), and legal or provider-contact escalation.

**Acceptance criteria.** Each runbook is exercised once in staging and corrected where the exercise exposed gaps.

**Testing.** Walk-through drills.

#### P11-T09 — Pilot, parity verification and cutover
`Launch gate` · Size L · Review R3 · **Depends on:** `P11-T01` to `P11-T07`, `P11-T08` · **Needs:** DEC-025

**Objective.** Move from the legacy system to the new platform in controlled steps, preserving the legacy system until the new one is proven (Section 11).

**Scope.**
- A parity check against the preserve and change lists from `P0-T01`.
- A **controlled pilot**: a small number of approved organizers and events, with real but limited money, daily reconciliation and a named person watching the dashboards.
- A cutover plan per DEC-025, with go and no-go criteria, a communication plan and a rollback plan.
- Legacy remains available (read-only or running for existing events) for an agreed stabilisation period.

**Acceptance criteria.** Pilot completes with zero unreconciled discrepancies, zero oversells and no unresolved critical defect. The owner signs the go decision.

**Testing.** Pilot monitoring log, daily reconciliation reports and a rollback rehearsal.

**Phase 11 exit criteria (launch checklist).**
- [ ] P11-T01 to P11-T09 complete.
- [ ] Every launch gate signed with approver, date and evidence.
- [ ] Pilot complete and the go decision recorded.
- [ ] Legacy preserved and decommission criteria defined (Section 11).

---

# 11. Preserving the Existing Project and Cutover

## 11.1 Rules

1. **Separate repository, infrastructure and credentials** from day one (`P0-T01`). Nothing in the new system can write to legacy data.
2. **No production personal data** is copied into development or testing (ARCH §20.2). Any data needed for parity checks is synthetic or anonymised.
3. **Legacy changes are limited to critical fixes**, each recorded in `docs/legacy-inventory.md`.
4. The legacy system's database and backups are retained until the decommission criteria below are met, and then retained or destroyed according to the retention policy.

## 11.2 When is the new implementation "independently functional and verified"?

All of the following are true:
- Every phase exit checklist (0–10) is complete and signed.
- The new platform runs with **no runtime dependency** on the legacy system, its database or its credentials.
- `P11-T01` to `P11-T07` and `P11-T08` are complete, and every launch gate is signed.
- The parity checklist shows each legacy behaviour marked *preserve* is present, and each *change* or *drop* was a recorded decision.
- The pilot (`P11-T09`) has run cleanly.

## 11.3 Confirmed cutover model (DEC-025)

1. **Parallel operation.** New events are created on the new platform. Events already on sale in the legacy system run to completion there, so no existing customer's ticket or refund path changes.
2. **No bulk data migration** in the MVP (C-21). If the owner later wants historical data, it is a separate project with its own privacy assessment.
3. **Per-event cutover** only when the owner approves, and never in the days before an event.
4. **Rollback plan** at every step: because legacy is untouched, rolling back means pointing new events back to it.

## 11.4 Decommission criteria

Retire the legacy system only when all of these hold:
- No legacy event is still on sale or awaiting settlement or refunds.
- The new platform has run for an agreed stabilisation period with clean daily reconciliation.
- Legacy records the owner must keep are exported and stored under the retention policy.
- The owner records the decommission decision.

---

# 12. Risk Register

| Risk | Impact | Early warning | Mitigation | Phase |
|---|---|---|---|---|
| DEC-010 (funds flow) changes from Merchant of Record | Rework of Phases 7 to 9 | Provider contract restrictions | Merchant of Record confirmed. Verify sandbox capabilities early in Phase 0. Adapter isolates the provider. | 0–7 |
| Provider lacks an assumed capability (idempotency keys, refunds, transfers) | Designs in Phases 7–9 fail | `provider-capabilities.md` gaps | Verify in sandbox early. Adapter isolates the provider. Fall back to durable attempts and verify-before-retry | 0, 7 |
| Provider live-mode approval delayed | Launch delay | No response within weeks | Start in `P0-T06`. Track at each checkpoint | 0–11 |
| Counsel or accountant unavailable | Launch gates blocked | Unanswered question lists | Engage in Phase 0. Make fee rule and ledger configurable | 0–11 |
| Cross-site cookies break authentication | Auth redesign | Login works locally but not on staging | ADR-019 domain plan, tested in `P1-T07` | 1, 3 |
| Subtle concurrency bug in AI-generated code | Overselling or double payment | Flaky concurrency tests | Tests-first for R2 and R3 tasks, repeated runs, human review, database constraints as a second defence | 2–9 |
| Ledger model wrong | Incorrect balances | Accountant objections | Provisional label, interface isolation, R3 review before payouts | 7–9 |
| Scope creep from deferred features | Delay and complexity | New items without a decision record | Section 14 backlog, MVP matrix and change control through the decision register | All |
| Task sizes underestimated | Schedule slip | Tasks exceeding L | Split before starting, retrospective at each checkpoint | All |
| Personal data in logs or audit | Privacy breach | Canary tests failing | Redaction tests, metadata allow-list, review checklist | 1–11 |
| Reservation duration poorly chosen | Lost sales or oversold-feel | High expiry or abandonment rate | Configurable value, pilot monitoring | 6, 11 |
| Email deliverability (verification, tickets) | Customers locked out | Bounces and spam placement | SPF, DKIM and DMARC at setup, delivery monitoring, resend path | 2, 11 |
| Hosting unsuitable for financial workloads | Data loss or downtime | Free-tier limits hit | Hosting evaluation in ADR-019 and `P11-T06`, backup drill | 1, 11 |
| Legacy and new platform diverge in behaviour | Customer confusion | Parity checklist gaps | Inventory in `P0-T01`, parity check in `P11-T09` | 0, 11 |
| Legal change to fee retention | Refund policy rework | Counsel advice | Configurable engine, disclosure texts versioned | 8, 10 |
| Single point of knowledge | Hard to recover | Undocumented decisions | ADRs, runbooks and PR "why" notes | All |

---

# 13. Documentation Deliverables

| Document | Created | Updated by |
|---|---|---|
| `docs/legacy-inventory.md` | `P0-T01` | Phase checkpoints, `P11-T09` |
| `docs/adr/*` | `P0-T02` | Whenever a decision is made |
| `docs/decision-register.md` | `P0-T03` | Every decision |
| `docs/state-machines.md` | `P0-T04` | Any task that changes a lifecycle |
| `docs/database-design.md` | `P0-T05` | Every schema task |
| `docs/api-contract.md` | `P0-T05` | Every endpoint task |
| `docs/security-and-privacy.md` | `P0-T05` | Every task adding personal data |
| `docs/provider-capabilities.md` | `P0-T06` | Phase 7 to 9 |
| `docs/deployment.md` | `P1-T07` | `P11-T06` |
| `docs/runbooks/*` | `P11-T08` | Incident reviews |

---

# 14. Deferred Enhancements (Post-MVP)

Deferred from BR §23.2, and from the decisions above. Each needs its own business decision before work starts.

- Advanced analytics and organizer reports beyond the MVP summaries.
- Promotional campaigns, discount codes and referral programmes.
- Multiple currencies and complex tax calculation.
- Organizer teams, advanced organizer permissions and **check-in staff roles** (DEC-024).
- Multiple payment providers.
- Advanced fraud scoring.
- Automated identity-verification integrations.
- Customer segmentation.
- Mobile applications.
- Sophisticated settlement and reserve models.
- Redis-backed caching and distributed rate limiting (ADR-020), when measurements justify it.
- An in-app notification inbox (C-16).
- Per-ticket attendee details (DEC-026).
- Scheduled publication (DEC-027).

---

# 15. Recommended First Implementation Task

## `P1-T01` — Workspace, TypeScript and lint baseline

**Start with it**, after a short Phase 0 pre-step: record ADR-029 (Node and pnpm versions) and ADR-025 (test stack) and tag the legacy repository (`P0-T01`, first half). On the same day, **send the `P0-T06` questions** to counsel, the accountant and the payment provider, because their answers are the slowest things in this plan.

**Why this task first.**

1. **Everything depends on it, and it carries no business risk.** It involves no money, no personal data and no business rules, so it is the safest place to learn how the AI-assisted workflow in Section 7 actually feels.
2. **It makes the plan's guardrails real.** Strict TypeScript, a lint rule that fails the build on `any`, and a guard that rejects non-pnpm installs turn your standing preferences into machine-enforced rules, so no later task can quietly break them.
3. **It creates the `pnpm verify` habit.** Every acceptance criterion in this document ends with a green verification run. That command has to exist, and be trusted, before the first task that matters.
4. **It lets the slow external work run in parallel.** While the workspace is built, counsel, the accountant and the provider can answer the questions that will otherwise block Phases 7 to 9.
5. **It is small and reversible.** If a tooling choice proves wrong, changing it now costs an afternoon. After the database and APIs exist, it costs days.

**Done when:** a clean clone installs with one command, a single lockfile exists, `pnpm lint` and `pnpm -r typecheck` pass, a planted `any` fails lint, and `npm install` is refused.

**Next, in order:** `P1-T02` (database and test harness), then `P1-T03` (API skeleton), then `P1-T04` (CI), which together give every later task a place to run and a gate to pass.
