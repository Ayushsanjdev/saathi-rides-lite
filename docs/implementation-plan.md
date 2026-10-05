# Saathi Rides Implementation Plan

> Use superpowers:executing-plans task-by-task. The user has instructed us to build the complete approved app without another design checkpoint. Execution method: native implementation in this session.

**Goal:** A working mobile-first scheduled ride service, real MongoDB persistence, complete role workflows, and teaching documentation.

**Architecture:** Next.js same-origin proxy to an Express modular monolith, shared Zod contracts, MongoDB transactions. Persistent local MongoDB replica set for a one-command preview; external replica set supported.

**Tech stack:** TypeScript, Next.js, Express, MongoDB/Mongoose, Tailwind, shadcn/ui, Vitest, Playwright.

**Spec:** `docs/design.md`.

## Global constraints

- All documentation is in `docs/`, per the user's instruction.
- Mobile first; ≥44px primary touch targets; English/Hindi dictionaries; Asia/Kolkata display.
- Real sessions and permissions; authoritative fares and booking states belong to the API.
- No optimistic confirmed bookings, fake payment processing, or unrestricted role switching.
- Replica-set transactions; bounded lists; UTC timestamps; integer paise.
- No paid accounts provisioned or public deployment claimed without evidence.

## Review focus

1. Repeated or concurrent seat requests cannot oversell or insert duplicate bookings.
2. Cancellation, trip-start, and collection retries cannot corrupt counts or money.
3. Session or role manipulation cannot reveal another person's records.
4. Concurrent overlapping driver assignments must serialise safely.
5. Small screens, network errors, and pending actions remain usable and clearly labelled.

## Task 1 — contracts, database, and authenticated API

Files: `packages/contracts/src/index.ts`, `apps/api/src/{models,db,auth,app}.ts`, `apps/api/tests/api.test.ts`, `scripts/{local,seed}.ts`.

Interface: `createApp(config: AppConfig): Express`; `connectDatabase(uri: string): Promise<void>`; schemas expose validated request types; users expose `id,name,email,role` only.

- [x] Write failing integration cases: unauthenticated `/api/me` is 401; registration creates passenger only; login regenerates session; mutation without CSRF is 403; another role's resources are 403.
- [x] Run `npm test`, establish expected failing status assertions against an initial health-only app.
- [x] Implement sessions, CSRF, passwords, validation, database indexes and provisioning.
- [x] Run `npm test` and `npm run typecheck`.

Example acceptance assertion:
```ts
expect((await request(app).get('/api/me')).status).toBe(401);
```

## Task 2 — transactional booking and trip operations

Files: `apps/api/src/{booking,operations,seed}.ts`, extend `apps/api/tests/api.test.ts`.

Interface: booking service consumes authenticated passenger, departure id, seat count and key; driver operations consume current assignment and state; operator assignment locks the driver schedule inside its transaction.

- [x] Write tests for concurrent requests for four seats, idempotency mismatch, double cancellation, start/cancel cutoff, private manifests, cancelled departures, invalid object IDs, collection replay, driver scheduling overlap.
- [x] Observe failing API assertions before implementing each feature group.
- [x] Add conditional seat writes and multi-record transactions; driver schedule guard; departure lifecycle; operator CRUD, reports and audit.
- [x] Run the complete integration suite against an actual MongoDB replica set.

Example concurrency assertion:
```ts
expect(results.filter(r => r.status === 201)).toHaveLength(4);
expect(await Booking.countDocuments({departureId})).toBe(4);
```

## Task 3 — mobile-first working app

Files: `apps/web/app/{layout,page,globals.css}`, `apps/web/components/{app,auth,rider,driver,operator,ui/*}`, `apps/web/lib/{api,i18n,utils}.ts`, `tests/app.spec.ts`.

Interfaces: shared contracts and API response types; `api<T>(path, options): Promise<T>` attaches session CSRF tokens; TanStack Query handles visible-screen polling and invalidation.

- [x] Write browser journeys for sign-in, rider booking/cancellation, operator schedule creation and driver acceptance; driver completion is covered at the API layer.
- [x] Run tests against initial shell and observe missing workflow failures.
- [x] Install shadcn primitives, apply tokens, build forms, confirmation dialogs, role navigation and reporting.
- [x] Verify errors, empty/loading states, Hindi labels, 390px layout, keyboard access and browser journeys.

Example browser acceptance:
```ts
await page.getByRole('button', { name: 'Confirm booking' }).click();
await expect(page.getByText('Booking confirmed')).toBeVisible();
```

## Task 4 — operations, learning, and final verification

Files: `docs/{README,architecture,learning-guide,api,deployment,testing,design-system}.md`, `Dockerfile`, `compose.yaml`, `.env.example`.

- [x] Add complete setup and demo credentials, API examples, transaction walkthrough, architecture/entity diagrams, security/scaling tradeoffs and deployment instructions.
- [x] Production-build both processes; run typechecking and the full API suite.
- [ ] Run the Playwright browser suite outside the host sandbox (Chromium launch is blocked here).
- [x] Inspect real mobile/desktop screenshots and fix usability or security defects with regression tests.
- [x] Record concrete evidence and limitations; open the working local app and link documentation.

## Execution rulings

- New isolated project folder, no existing Git repo or main branch to protect; no extra worktree is required.
- User's explicit instruction to build everything is permission to continue through planning and implementation; do not ask them to reauthorise this reversible local work.
- Docker is absent, so use a persistent local replica-set runner for the preview. Production/external DB support remains part of delivery.

## Final evidence and exceptions

Type checks, production builds and all 23 MongoDB integration tests passed. Browser interactions were verified in connected Chrome. Playwright source is delivered, but launching its Chromium was blocked by this host sandbox; the browser-suite execution checkbox above is qualified by this exception. Docker packaging was not run because Docker is absent. See `testing.md` for exact evidence, screenshots and remaining pilot integrations.
