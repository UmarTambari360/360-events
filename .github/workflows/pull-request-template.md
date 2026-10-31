## Objective
[Describe what this PR changes and why this design was chosen. Include which acceptance criteria and invariant tags it satisfies.]

## Definition of Done (Section 7.3)
Before requesting a review, verify the following:

- [ ] Every acceptance criterion is demonstrably met.
- [ ] Tests exist for the success path, negative paths, authorisation (a different user, a different organiser, an unauthenticated caller) and, where listed, concurrency and failure.
- [ ] `pnpm verify` (lint, typecheck, unit tests, integration tests, build) is green locally and in CI.
- [ ] No `any`, and no unexplained type assertions or lint suppressions.
- [ ] Migrations are reviewed and run cleanly on an empty database and on the previous schema.
- [ ] Logs and audit records contain no passwords, tokens, secrets or unnecessary personal data.
- [ ] `docs/state-machines.md`, `docs/database-design.md` and `docs/api-contract.md` are updated if the task touched them.
- [ ] The required review level (R1, R2 or R3) has been completed.