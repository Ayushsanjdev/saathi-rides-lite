# Saathi Rides

A scheduled e-rickshaw booking app for passengers, drivers, and local operators. Passengers reserve shared seats from named pickup points, drivers manage assigned trips and cash collections, and operators maintain routes and timetables. Includes a responsive web app and an Expo app for Android and iOS.

This is a portfolio demonstration; it does not dispatch real transport.

## Quick start

Requires **Node.js 24** and **pnpm 11.24.0**, as pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://127.0.0.1:3000**. Use this hostname consistently for browser sessions and CSRF origin checks.

Without a configured `MONGODB_URI`, the runner downloads MongoDB 8.0.17 on first use, starts a persistent local replica set on port 27018, seeds demo accounts and rides, and starts the API on 4000 and web app on 3000. Internet is needed for the initial download. Bookings, sessions, and the generated session secret persist under `.data/`. Stop with Ctrl+C.

The runner reads the root `.env`. If it already specifies `MONGODB_URI`, that database is used instead. To explicitly select the local demo database:

```sh
MONGODB_URI= pnpm dev
```

No Docker or external service account is required for local development. For an external MongoDB replica set, copy `.env.example` to `.env` and follow the [deployment guide](docs/deployment.md#external-mongodb-development).

## Demo accounts

The local demo seed uses the following accounts with password **`SaathiDemo2026!`**, unless `DEMO_PASSWORD` is overridden:

| Role | Email |
| --- | --- |
| Passenger | `passenger@saathi.test` |
| Driver — Ramesh Kumar | `driver@saathi.test` |
| Driver — Sunita Devi | `driver2@saathi.test` |
| Driver — Imran Ali | `driver3@saathi.test` |
| Operator | `operator@saathi.test` |

Demo mode exposes role buttons in the sign-in dialog. Existing seeded passwords are preserved across restarts; changing `DEMO_PASSWORD` only affects newly created accounts. These public accounts belong in isolated demo databases.

Try a passenger booking and cancellation, then sign in as a driver to view passengers, start a trip, record cash, and complete it. Use the operator account to create a departure and test driver assignment acceptance. See the [complete walkthrough](docs/getting-started.md#walk-through-the-complete-app) for the sequence and timing rules.

## Features

- Passenger registration, sign-in, seat booking, fare review, contact details, booking history, and cancellation.
- Transactional seat reservations and idempotency keys to prevent overselling and duplicate bookings after retries.
- Driver assignment acceptance/decline, passenger lists, trip lifecycle, cash records, and no-show marking.
- Web operator tools for stops, routes, driver provisioning, timetables, assignments, reports, and audit records.
- English/Hindi interfaces, rupee formatting, IST display, and persistent Light, Dark, and System appearance preferences.
- Native passenger and driver workflows with secure token storage and recovery of interrupted booking requests.

## Mobile development

Start the API and LAN-accessible web proxy, then start Metro in a second terminal:

```sh
# Terminal 1
pnpm dev:mobile

# Terminal 2
pnpm mobile
```

Configure `EXPO_PUBLIC_API_URL` using [apps/mobile/.env.example](apps/mobile/.env.example). Development builds are the default; use `pnpm mobile:ios` or `pnpm mobile:android` with the required native toolchain. Operators use the web app.

See the [mobile README](apps/mobile/README.md) for simulator/device URLs, native tooling, authentication behavior, and EAS builds.

## Repository layout

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js 16 / React 19 web UI and API proxy; Tailwind 4, shadcn/ui, TanStack Query |
| `apps/api` | Express 5 API, Mongoose models, sessions, booking and operations rules |
| `apps/mobile` | Expo Android/iOS app for passengers and drivers |
| `packages/contracts` | Shared Zod schemas and DTOs |
| `packages/core` | Shared transport client, translations, fare and IST formatting |
| `scripts` | Local runner, demo seeding, and isolated browser-test runner |
| `tests/e2e` | Playwright browser journeys |
| `docs` | Current guides, `assets/` screenshots, and `archive/` historical plans |

This is a pnpm workspace with one root lockfile. Install from the repository root; add app dependencies with `pnpm --filter @saathi/web add <package>` (or the appropriate workspace).

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the API and web app with local or configured MongoDB |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm test` | Run API and shared-package tests |
| `pnpm test:mobile` | Run mobile tests |
| `pnpm test:e2e` | Run browser journeys with an isolated temporary replica set |
| `pnpm build` | Build the API and web app |
| `pnpm build:mobile` | Export Android/iOS JavaScript bundles and assets; no signed binary |
| `pnpm start` | Start built API and web services with supplied environment variables |
| `pnpm provision:operator` | Create an operator using provisioning environment variables |

Browser tests require Chromium. Install it with `pnpm exec playwright install chromium`, or use installed Chrome with `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome pnpm test:e2e`. See [testing](docs/testing.md) and [mobile verification](docs/mobile/verification.md) for recorded results and remaining checks.

## Documentation

- [Detailed setup and app walkthrough](docs/getting-started.md)
- [Learning guide](docs/learning-guide.md) and [architecture](docs/architecture.md)
- [API reference](docs/api.md) and [design system](docs/design-system.md)
- [Deployment, Docker, and operator provisioning](docs/deployment.md)
- [Mobile setup and builds](apps/mobile/README.md)
- [Feasibility and pilot considerations](docs/feasibility.md)

Phone OTP, password recovery, electronic payments, live GPS tracking, and push notifications are not integrated. Cash collection is recorded by drivers. A real service also needs verified drivers and vehicles, operating approvals, insurance, and staffed support. Keep `.env`, `.data/`, and real credentials private.
