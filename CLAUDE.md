# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

req-kit is a self-hosted API testing tool (Postman-like). Chinese-language UI and code comments. Pure HTML + Vanilla JS frontend, Hono backend proxy, SQLite persistence, zero external frontend dependencies.

## Commands

```sh
bun install          # Install dependencies
bun run dev          # Start dev server with hot reload (http://localhost:3000)
bun test             # Run all unit + integration tests
bun test tests/unit/             # Run only unit tests
bun test tests/integration/      # Run only integration tests
bun test tests/unit/proxy.test.ts  # Run a single test file
bun run test:e2e     # Run Playwright E2E tests (auto-starts/stops test server via globalSetup)
bun run test:e2e:ui  # Run E2E tests with Playwright UI mode
bun run build        # Build CSS (lightningcss) + JS (bun bundler) to src/public/dist/
```

No linter or formatter is configured.

## Architecture

### Backend (Bun + Hono)

Entry point: `src/index.ts` — creates a single `Database` instance, instantiates all services, registers route modules, then serves static files.

**Layering**: Routes → Services → Database. Each service encapsulates SQL queries. Routes are thin wrappers that delegate to services.

- `src/db/` — `Database` class wraps `bun:sqlite` with `query<T>`, `queryOne<T>`, `run` helpers. Schema in `schema.sql` uses `CREATE TABLE IF NOT EXISTS`. WAL mode, foreign keys enabled.
- `src/services/` — Business logic. `ProxyService` handles HTTP forwarding (regular + SSE stream). `ScriptService` executes user scripts in a `node:vm` sandbox. `EnvService` does `{{variable}}` template replacement. `injectAuth()` (pure function) adds Bearer/Basic/API Key.
- `src/routes/proxy.ts` — The proxy route orchestrates the full request pipeline: template replacement → script execution → auth injection → proxy forward → history recording.

### Frontend (Vanilla JS)

No build step. Static files served from `src/public/`.

- `js/store.js` — Event-driven state manager (`on`/`off`/`emit`/`setState`). Global `store` object used by all components.
- `js/app.js` — Entry point; wires up keyboard shortcuts (Ctrl+Enter to send, Escape to close modals).
- `js/components/` — UI components, each self-contained.
- `js/api.js` — Fetch wrapper for backend API endpoints.

### Database

SQLite via `bun:sqlite`. Tables: `environments`, `env_variables`, `collections` (nested via `parent_id`), `saved_requests`, `history`, `global_variables`, `collection_variables`. All cascade deletes are handled by foreign key constraints.

## Key Patterns

- Route factories accept service instances via function args (e.g., `createProxyRoutes(proxyService, historyService, ...)`). No DI framework.
- Integration tests create real `Bun.serve` instances on port 0 and test against them — no mocks.
- Unit tests use `Database(':memory:')` with `beforeEach` migration.
- E2E tests use Playwright with `globalSetup`/`globalTeardown` to manage a test server on port 3999. The test DB (`test.db`) is created/destroyed automatically — no manual setup needed. Config in `playwright.config.ts` (60s timeout, 2 retries, headless).
- The proxy pipeline in `routes/proxy.ts` processes: env template replacement → pre-request script → auth injection → proxy send → history record. Order matters.
- Frontend has no framework — components subscribe to `store` events and manipulate DOM directly.
