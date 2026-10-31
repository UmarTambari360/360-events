# Database Role Design Note

In accordance with P1-T02, the production environment will strictly separate DDL (schema migrations) from DML (application data access) to ensure least privilege.

## 1. Migration Role (`migrator`)
- **Purpose:** Executes `drizzle-kit migrate`.
- **Permissions:** `CREATE`, `ALTER`, `DROP` on tables, indexes, constraints, and sequences within the `public` schema.
- **Access:** Only injected into the ephemeral deployment pipeline runner. Never exposed to the running application services.

## 2. Application Role (`app_service`)
- **Purpose:** Used by the Express API and Background Worker.
- **Permissions:** `SELECT`, `INSERT`, `UPDATE`, `DELETE` on all tables in the `public` schema. 
- **Restrictions:** 
  - Strictly **DENIED** `DROP`, `ALTER`, and `TRUNCATE` permissions.
  - Cannot modify the Drizzle migration tracking tables.
  - Required to enforce the immutability of the `audit_events` and financial ledger tables at the Postgres role level in Phase 2 and 7[cite: 4].