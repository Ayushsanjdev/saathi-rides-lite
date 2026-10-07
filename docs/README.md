# Saathi Rides

A mobile-first, full-stack scheduled e-rickshaw booking project. Passengers reserve shared seats from named pickup points; drivers manage trips; operators manage the local timetable. The demonstration does not dispatch real transport.

## Start here

Requires Node.js 24 and npm. From the project root:

```bash
npm ci
npm run dev
```

Open **http://127.0.0.1:3000**. Use this hostname consistently because session cookies and CSRF origin checks are tied to it.

The default development runner downloads MongoDB 8.0.17 once, runs a real single-node replica set on port 27018, seeds demonstration data, starts Express on 4000, and starts Next.js on 3000. Database files and a generated session secret remain in `.data/`; restarting preserves bookings and sessions. The first download requires internet. Stop with Ctrl+C. Development uses Webpack with polling to work reliably in restricted filesystem environments; production uses Turbopack.

No Docker, Atlas account, SMS account, map token, or payment account is required for this local path. `.data/` contains personal records and must not be committed or shared. The local database is not an authenticated production deployment.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Passenger | passenger@saathi.test | SaathiDemo2026! |
| Driver | driver@saathi.test | SaathiDemo2026! |
| Second driver | driver2@saathi.test | SaathiDemo2026! |
| Third driver | driver3@saathi.test | SaathiDemo2026! |
| Operator | operator@saathi.test | SaathiDemo2026! |

The sign-in dialog offers one-click sign-in for all five accounts through real authentication. These public credentials are for isolated demo databases. Custom `DEMO_PASSWORD` affects newly created local seed users; it does not silently overwrite existing passwords.

For the hosted portfolio preview, set `HOSTED_DEMO=true`. The API switches to a separate `saathi_demo` database on the configured MongoDB cluster, seeds these accounts and sample stops/routes/drivers, and replenishes missing upcoming rides over eight days on startup. Production HTTPS and secure cookies remain enabled. The existing application database is preserved. Demo bookings and operator changes affect the shared demo database; no real transport is dispatched. Dropdown and date changes refresh rides automatically, and passenger counts update total fares.

## Walk through the complete app

1. Sign in as **operator**. Inspect routes and drivers. Create a departure for 5–10 minutes from now, choose a route, four seats, and Ramesh Kumar. All timetable input is India Standard Time.
2. Sign out. Sign in as **driver**. Accept the pending assignment.
3. Sign out. Sign in as **passenger**. Choose the same route and date. Book one or two seats, enter a contact mobile number, and confirm. Observe the booking reference, exact fare, and cash-payment label.
4. To test cancellation, cancel before departure and observe returned capacity. Otherwise keep the booking.
5. Sign in as **driver**, start the trip (available within 15 minutes of departure), open the passenger list, call the contact if necessary, record cash, and complete the trip. No-show marking is available after start and creates no financial penalty.
6. Sign in as **passenger** and inspect history. Sign in as **operator** and inspect recorded collections, counts, and activity.

Use separate browser profiles to keep different roles signed in simultaneously. Signing out is necessary to change accounts in one profile.

## What is implemented

- Real registration and persistent sessions; passenger-only public registration.
- Mobile booking, fare review, contact snapshot, booking history and cancellation.
- Conditional seat updates and MongoDB transactions preventing overselling.
- Idempotency keys preventing duplicate bookings after retries.
- Driver assignment acceptance/decline, manifests, cash records, no shows and trip lifecycle.
- Operator stop/route creation and editing, driver provisioning/eligibility, timetable creation, assignment, cancellation, aggregate reporting and audit records.
- Paginated passenger history and filtered paginated driver/operator trip lists.
- English/Hindi interface text, rupee formatting, UTC storage and IST display.
- Error/loading/empty states, network feedback, accessible shadcn dialogs and controls.
- Production builds, database integration tests, browser test definitions, Docker packaging and deployment instructions.

## Stack and code map

| Location | Responsibility |
|---|---|
| `apps/web/app` | Next.js page, layout, tokens and runtime API proxy |
| `apps/web/components` | Passenger, driver, operator and shared UI |
| `apps/web/components/ui` | Generated shadcn/ui component source |
| `apps/web/lib` | API client, formatting, translations, class helpers |
| `apps/api/src/app.ts` | Express middleware and HTTP controllers |
| `apps/api/src/booking.ts` | Transactional booking and cancellation rules |
| `apps/api/src/operations.ts` | Scheduling, assignment, trip and collection rules |
| `apps/api/src/models.ts` | Mongoose schemas and indexes |
| `packages/contracts` | Shared Zod schemas and DTOs |
| `scripts/local.ts` | Persistent local database and app runner |
| `apps/api/tests` | Tests against a real replica set |
| `tests` | Playwright browser journeys |

Frontend: Next.js 16, React 19, Tailwind 4, shadcn/ui/Radix, TanStack Query. Backend: Node.js 24, Express 5, Mongoose 9, MongoDB, Argon2id, express-session and connect-mongo. Exact resolved versions are pinned in the lockfile.

## Commands

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Browser tests need a Chromium installation. To keep downloads in the project:

```bash
PLAYWRIGHT_BROWSERS_PATH=.cache/playwright npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=.cache/playwright npm run test:e2e
```

See [testing](testing.md) for sandbox limitations and recorded evidence. Docker/production instructions are in [deployment](deployment.md).

## Documentation path

Read [learning-guide](learning-guide.md) first to understand a request end to end. Continue with [architecture](architecture.md), [API reference](api.md), [design system](design-system.md), [deployment](deployment.md), and [testing](testing.md). Read [feasibility](feasibility.md) for advantages, flaws, pilot economics and alternative app ideas. The approved brief is [design](design.md); the build sequence is [implementation-plan](implementation-plan.md).

## Practical boundaries

This is working scheduled-ride software and a portfolio project. Phone OTP, password recovery, electronic payment settlement, GPS tracking, push notifications, public hosted infrastructure and staffed support are not integrated. Email/password and direct cash payment make the demonstration self-contained. A native Android app could reuse the backend, but this deliverable is a responsive web app.

An actual transport pilot needs state-specific operating approvals, driver/vehicle checks, insurance, suitable roads, fair fares and staffed incident handling. Default contact numbers and vehicle registrations are fictitious. Do not use demo accounts or an unauthenticated local MongoDB for real passengers.
