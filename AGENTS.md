# Repository Guidelines

## Project Structure

This is a pnpm workspace for 360Events. `apps/api` contains the Express API, database schema and migrations, and API tests. `apps/web` contains the React/Vite client and its styles. `apps/worker` contains background worker code. Shared contracts and validation live in `packages/types` and `packages/validators`; shared TypeScript settings are in `packages/config`. Root-level files configure ESLint, Vitest, and the workspace.

## Setup and Common Commands

Use Node.js 22 or newer and pnpm (the package manager is pinned in `package.json`). Run `corepack enable` and `pnpm install` to set up the workspace.

- `pnpm dev` runs app development scripts in parallel.
- `pnpm build` builds packages and applications recursively.
- `pnpm lint` runs ESLint across the repository.
- `pnpm typecheck` runs each workspace's TypeScript check.
- `pnpm test` runs Vitest across configured projects.
- `pnpm verify` runs lint, typecheck, and tests; use it before submitting changes.

## Code Style

Follow the existing TypeScript conventions: strict typing, ES module imports with `.js` extensions in server-side TypeScript, and descriptive camelCase names for values and functions. Use PascalCase for React components and types. Keep shared API contracts in `packages/types` and reusable validation schemas in `packages/validators`; apps should depend on shared workspace packages explicitly. ESLint is the style and type-aware lint authority. Avoid `any` and validate untrusted input at boundaries.

Import workspace packages by their lowercase package names (for example, `@360events/types` or `@360events/api/db`) and use only paths declared in each package's `exports`. Add a `workspace:^` dependency to the consuming app; do not use cross-app relative paths or source-file deep imports.

## Testing

Vitest is configured across `apps/*` and `packages/*`. Keep tests near their package: API tests are under `apps/api/tests`, while shared validator tests sit beside source in `packages/validators/src` (for example, `index.test.ts`). Use descriptive test names that state the behavior. No repository-wide coverage threshold is configured.

## Commits and Pull Requests

Recent history uses Conventional Commit-style subjects with optional scopes, such as `feat(api): ...` and `feat(workspace): ...`. Follow that pattern with a short imperative summary. Pull requests should explain the change and rationale, link related issues when applicable, and include relevant verification results. Add screenshots for user-visible web changes.

## Configuration and Secrets

Keep credentials and environment-specific values out of source control. Follow the API's environment configuration in `apps/api/src/config`; provide local values through an untracked environment file and document any new required variables.
