# Deployment Guide (v0.1.0)

This document outlines the standard operating procedure for releasing 360Events to staging and production, fulfilling the requirements of task P1-T07.

## 1. Release Order
Every automated deployment must strictly follow this sequence:
1. **Build**: Generate Docker images and static web assets.
2. **Migrate**: Run `drizzle-kit migrate` against the database using the restricted `migrator` PostgreSQL role (which has DDL privileges).
3. **Deploy**: Update the running API and Worker containers.
4. **Verify**: Poll the `/health/ready` endpoint. If the service does not report readiness within the timeout period, the deployment pipeline aborts.

## 2. Database Role Separation
- The application runtime (API and Worker) connects using the `app_service` role. This role only has DML (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) permissions and cannot drop or alter tables.
- Migrations in CI are run using the `migrator` role.

## 3. The Expand/Contract Pattern
Because database migrations run *before* the new application code deploys, the system exists in a transitional state during every release. To ensure zero-downtime deployments:
- **Rule**: New application code must tolerate the old database schema, and old application code must tolerate the new database schema[cite: 4].
- **Expansion (Phase 1)**: Add a new column or table. (Old code ignores it, new code begins using it).
- **Contraction (Phase 2)**: Remove the old column or table in a subsequent deployment *only after* all old application instances have been terminated.

## 4. Rollback Procedure
If a deployment fails the readiness check or introduces a critical defect:
1. **Application Rollback**: Revert the container image tag to the previously known good release in the hosting provider's dashboard or CLI.
2. **Database Integrity**: Because of the Expand/Contract rule, the old application code is strictly compatible with the new database schema. Do **not** attempt to write down-migrations (rollbacks) for the database during a live incident.
3. **Investigation**: Diagnose the failure locally or via logs.
4. **Fix Forward**: Commit the fix to `main` and allow the pipeline to roll forward securely.