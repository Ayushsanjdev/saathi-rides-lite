# Verification and testing

## pnpm migration — 11 October 2026

The repository now pins pnpm 11.24.0 and uses one root `pnpm-lock.yaml`. Existing direct dependency versions were retained; mobile has its own Expo-compatible TypeScript 6.0.3 while the other workspaces retain TypeScript 7.0.2.

Verified: all workspace type checks, 33 API/shared tests, 17 mobile tests, four browser journeys, API/web production builds, Android/iOS JavaScript exports, and all 21 Expo Doctor checks. A frozen offline install also passed. The web build needed a clean generated `.next` cache after an initial sandboxed attempt.

The Docker API dependency layout was reproduced in a temporary directory with a frozen lockfile and its Argon2/Express/Mongoose/Zod imports verified. Docker itself is unavailable, so the Linux image has not been built or run. The API image uses an isolated production dependency layout to include only its runtime graph; local development remains hoisted.

The npm commands and results below are historical. Current setup commands are in [the setup guide](README.md).

For the Expo addition verified on 9 October 2026, see [mobile verification](mobile/verification.md). That record supersedes the earlier test counts and workspace dependency-audit results below.

Verified locally on 3 October 2026 with Node.js 24 on macOS. These results establish local functionality, not deployment to a public service or performance on a physical low-end Android device.

## Automated evidence

| Check | Result |
|---|---|
| `npm run typecheck` | API, web and shared contracts passed |
| `npm run build` | Express bundles and Next.js production build passed |
| `npm test` | 23 integration tests passed against an actual MongoDB replica set |
| Runtime dependency audit | No runtime vulnerabilities reported by `npm audit --omit=dev` |

The integration tests exercise real sessions, CSRF protection, role isolation, strict validation, authoritative prices, concurrent seat reservations, replayed idempotency keys, repeated cancellation, cancellation after a driver declines, manifests, trip state changes, no shows, collection replay, overlapping assignments, simultaneous trip starts, driver eligibility changes and pagination.

Tests use an isolated temporary replica set, not the demonstration database. They do not send SMS, process payments or contact actual passengers.

## Browser evidence

Connected Chrome was used for actual passenger authentication, booking with a contact number, server-confirmed booking display, cancellation, operator departure creation, driver authentication and assignment acceptance. The mobile passenger and operator screens were checked at 390px; no horizontal overflow was observed. Session persistence was checked across a server restart.

Playwright journeys are included in `tests/app.spec.ts`. The local sandbox blocked Chromium launch with a macOS MachPortRendezvous permission error. Therefore the automated browser suite is **not claimed as passing**. Run it outside this restriction using the commands in `README.md`. The full cash-collection/completion lifecycle is covered by API integration tests; the entire lifecycle has not been independently executed through every browser control.

The operator datetime control should be exercised manually on the target browser: automation against native segmented date controls can leave the previous value unchanged. Confirm the displayed time before submitting.

## Boundaries and further checks

- Docker configuration is supplied but was not executed: Docker is unavailable on this host.
- No physical Android measurements, Lighthouse performance score, load test, accessibility certification or production uptime claim is made.
- A low-severity advisory remains in tsup's nested esbuild development dependency. The advisory concerns its development server on Windows; this project uses tsup for builds. Runtime dependencies have no reported advisories at verification time. Recheck before deploying; audit results change over time.
- For a pilot, test with a real slow Android device and intermittent mobile data. Measure transferred JavaScript, memory, battery usage and p75 interaction latency. Exercise screen readers, contrast, keyboard navigation and Hindi comprehension with actual users.
- Verify backups by restoring them, run authenticated MongoDB over TLS, configure HTTPS, provision non-demo users and add edge rate limiting before handling real passengers.

## Useful regression checks

Never replace the transaction concurrency tests with mocked repository calls. Submit more requests than the vehicle has seats and assert the confirmed-seat total does not exceed capacity. Repeat a successful request with the same idempotency key; expect the same booking and no second seat decrement. Race cancellation with starting a trip; expect one valid outcome and consistent records. Try another passenger's booking and another driver's manifest; expect refusal.

Run the complete suite after changing booking predicates, assignment states, indexes, session middleware or cancellation logic. Rerun the browser journeys after changing forms, selectors or API response contracts.
