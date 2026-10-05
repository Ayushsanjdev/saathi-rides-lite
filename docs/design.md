# Saathi Rides — full-stack project design

Status: approved by the user's instruction to build; implemented. See `testing.md` for verified behavior and remaining limits.

## Purpose and scope

Build a working, mobile-first scheduled e-rickshaw booking application for a village cluster and nearby town. The project should be useful as a pilot and as a portfolio project, and teach the owner frontend, backend, database, security, system design, testing, and deployment.

The user requested inexpensive-phone performance, minimal UI, end-to-end implementation and explanation, and a stack including Next.js, Node.js, Tailwind, shadcn/ui, and MongoDB. Scheduled shared transport is the starting assumption, following the preceding feasibility discussion. This version does not promise instant doorstep dispatch.

A complete software deliverable means functional rider, driver, and operator workflows backed by real durable data and a tested API. It does not mean transport licences, insurance, actual drivers, payment-provider accounts, or a staffed safety service have been provisioned.

## Product workflows

### Passenger

- Register and sign in with email and password. Email is chosen for a self-contained portfolio build; phone OTP remains a later provider integration.
- Choose pickup landmark, destination, date, and seat count.
- See available scheduled departures, published per-seat fare, available capacity, and pickup time.
- Book seats and receive a server-confirmed reference.
- View booking status and assigned driver details; cancel before departure under the stated policy.
- View booking history. Initiate a phone call to the configured support number or driver when appropriate.
- Pay the driver directly in cash. The app records a driver-confirmed cash collection, not electronic payment settlement.

### Driver

- Sign in to an operator-provisioned account.
- View assigned departures and confirmed passenger manifest.
- Accept or decline an assignment before its departure; a decline returns it to the operator for reassignment.
- Start an accepted trip and complete a started trip.
- Record cash collected for individual bookings; only collected fares appear in cash collection totals.
- View completed trips and collection history.

### Operator

- Manage named stops, routes, per-seat fares, verified drivers, and vehicle capacity.
- Create dated departures and assign available drivers without overlapping scheduled windows.
- View bookings and trip states, reassign declined trips, and cancel departures before they start.
- Manage driver activation. Driver/vehicle verification is an operator record, not a claim of external background checking.
- See completed trips, passenger counts, cancellations, and recorded collections calculated from database records.
- Consult an audit log of operational changes.

Public registration always creates a passenger. Drivers and operators cannot obtain privileged access by submitting a role field.

## Design system

Use shadcn/ui components built on accessible primitives with Tailwind tokens. Give the app a distinct deep-blue and bright-green identity, high-contrast surfaces, restrained borders, and clear typography. Avoid decorative maps, photography, and animations on the working surfaces.

Shared tokens cover colour, spacing, typography, corner radius, focus rings, and status semantics. Reuse Button, Input, Select, Dialog, AlertDialog, Tabs, Table, Badge, Sheet, Skeleton, and toast primitives where appropriate. Booking and driver actions have prominent touch targets of at least 44 CSS pixels.

Passenger mobile navigation: Book, My rides, Account. Driver navigation: Today, History, Account. Operator layout uses a compact sidebar on desktop and a sheet on mobile. Operator tables adapt to cards or deliberate scroll regions on narrow screens.

English and Hindi interface dictionaries cover user-facing labels and booking feedback. Route and landmark names support local-script text. Dates, rupee amounts, and operational times are displayed consistently using Asia/Kolkata. Language selection is a device-local preference.

Each workflow includes loading, empty, validation-error, network-error, and success states. A request waiting for the server is never displayed as a confirmed booking. Controls remain keyboard-accessible, screen-reader-labelled, and readable at increased text size.

## Stack and repository layout

- npm workspaces and TypeScript throughout.
- `apps/web`: Next.js App Router, Tailwind CSS, shadcn/ui, and TanStack Query for server state in interactive screens.
- `apps/api`: Node.js with Express, Zod request validation, Mongoose, and session-based authentication.
- `packages/contracts`: shared request/response schemas and types; no database models shipped to the browser.
- `docs`: setup, API reference, architecture, learning guide, operations, and deployment instructions.
- MongoDB replica set for development and MongoDB Atlas or another appropriately configured replica set for hosted environments.
- Docker Compose for the local database; documented Node commands for the web app and API.
- Vitest for meaningful domain/API checks and Playwright for end-to-end browser flows.

Use currently supported stable package versions, verified against official documentation at implementation time. This is a widely used stack selected to match the user's learning goals, not a claim that every component is the single most demanded technology.

MongoDB meets the requested learning goal. Booking data is relational enough that PostgreSQL would also be a strong choice; this design demonstrates explicit MongoDB transactions, indexes, references, and consistency rules instead of treating a document database as an unstructured store.

## Architecture and request lifecycle

Browser → Next.js same-origin `/api` proxy → Express middleware → route controller → domain service → MongoDB repository.

Next.js owns rendering and navigation. Express owns authentication, authorisation, validation, booking rules, trip transitions, and database access. The browser never connects directly to MongoDB and never calculates an authoritative fare or grants permissions.

The production web and API processes are independently deployable Node services. The proxy targets a configured internal API URL; it does not accept arbitrary client-supplied destinations. Cookies remain associated with the public app origin.

The backend starts as a modular monolith. Do not add microservices, Kafka, Redis, live GPS, or machine-learning dispatch without a concrete need. Trip and manifest screens use modest polling while visible, with error backoff. A later event channel can replace polling without moving domain rules into the browser.

## Data model and consistency

- User: email, password hash, role, active state, timestamps.
- DriverProfile: user reference, display name, contact details, operator verification state, vehicle details and permitted seat capacity.
- Stop: name, locality, active state.
- Route: pickup and destination stop references, fare in integer paise, active state.
- Departure: route reference, route/fare snapshot, departure and estimated end timestamps, driver reference, capacity, available seats, assignment state, lifecycle state, version.
- Booking: passenger reference, departure reference, passenger/contact snapshot, seat count, fare snapshot, total paise, booking reference, idempotency key, lifecycle state, cash collection state and actor/time.
- Session: server-side session data with TTL expiry.
- AuditEvent: actor, action, entity reference, safe change summary, timestamp.

Store UTC instants and display local time. Store currency as integer paise to avoid floating-point rounding. Fare and route snapshots preserve historical records after configuration edits. Validate references and active status explicitly.

Indexes include unique normalised email, unique booking reference, unique passenger/idempotency-key pair, route/departure-time lookup, driver/time lookup, passenger booking history, session expiry, and audit entity/time lookup.

Booking transaction:

1. Authenticate and validate route parameters, seat count, and idempotency key.
2. Look up an existing booking for the same passenger/key; return it for an identical replay and reject mismatched payload reuse.
3. Atomically decrement available seats only if the departure is open, before cutoff, and has sufficient capacity.
4. Insert the booking and an audit event within the same transaction.
5. Commit and return the confirmed booking. Handle concurrent transaction conflicts with bounded retries.

Cancellation transaction checks booking ownership and current state, marks it cancelled, restores seats exactly once, and writes an audit event. Departures cannot start concurrently with accepting a late booking; both operations must enforce the departure-state invariant. Cancelling a departure atomically closes it and updates affected confirmed bookings.

Driver scheduling uses a per-driver transactional scheduling guard to serialise assignment changes before checking interval overlap. A query alone is insufficient because simultaneous assignments could both observe an empty interval.

## State transitions

Departure lifecycle: scheduled → in progress → completed; scheduled → cancelled.

Assignment: unassigned → pending acceptance → accepted or declined. A declined assignment can be reassigned by an operator. Only the currently assigned driver can accept and start an eligible trip. The operator cannot silently replace the driver after a trip starts.

Booking lifecycle: confirmed → completed, passenger-cancelled, or departure-cancelled. Completion derives from the trip lifecycle and is applied consistently. Cash collection remains a separate state so completion is not confused with payment.

Cancellation cutoff is the earlier of actual trip start or scheduled departure time. No-show handling is visible in the manifest and does not automatically create debt or penalties. Rescheduling after confirmed bookings is out of scope; cancel and create a replacement departure.

## API surface

- Authentication: register, login, logout, current user, CSRF token.
- Public reference data: active stops and routes.
- Passenger: search departures; create, list, read, and cancel own bookings.
- Driver: assigned trips, trip manifest, accept/decline assignment, start/complete trip, record cash collection.
- Operator: driver activation and provisioning, stop/route management, departure creation/assignment/cancellation, operational reporting and audit log.
- Health: liveness and readiness; readiness checks database connectivity without exposing credentials.

Use a consistent JSON error envelope with an error code, safe message, and optional field validation details. Distinguish unauthenticated, forbidden, not found, invalid input, capacity conflict, and temporary service failure. Paginate history and operator lists and bound query sizes.

## Security

- Argon2id password hashes and persistent server-side sessions; no plaintext passwords or JWTs in localStorage.
- HttpOnly cookies, Secure in production, SameSite policy, session regeneration on login, and server-side logout invalidation.
- Origin checks and session-bound CSRF protection for state-changing requests.
- Server-side role and resource-ownership checks on every protected endpoint.
- Login and registration throttling; document process-local limiter limitations when scaling to multiple API instances.
- Zod allowlists to prevent role escalation, arbitrary field updates, and MongoDB operator injection.
- Appropriate security headers, safe logging, environment validation, bounded body sizes, and no secrets in source control.
- Driver manifests and contact details are private to authorised actors.
- Audit operational changes without storing passwords, tokens, or unnecessary personal information.

Demo accounts are explicitly identified as demonstration data. Seed credentials come from environment configuration, and the demo seed cannot run accidentally against a production database. Screens use real auth rather than an unrestricted role-switcher.

## Performance and degraded connectivity

Build around forms and lists; avoid an always-running map SDK. Use a system font and lean icon imports. Keep most static content server-rendered and limit client bundles to working controls. Lazy-load nonessential operator views.

Cache reference data with bounded freshness. Persist only preferences in browser storage. Do not persist private manifests or sessions in an offline cache. Show network state and offer safe retries; use idempotency to prevent duplicate bookings.

Define and measure a performance budget using the finished build. Report mobile bundle sizes and browser checks honestly; actual inexpensive Android device performance requires testing on physical devices and cannot be established from a desktop alone.

## Verification

- Production builds and TypeScript validation for both applications.
- Integration tests against a real MongoDB replica set for simultaneous seat requests, duplicate submissions, cancellation retries, scheduling overlap, and allowed/disallowed lifecycle changes.
- Authorisation checks for passenger access to another person's booking, driver access to another driver's manifest, and attempts to obtain operator privileges.
- Browser flows for registration/login, departure search, booking, cancellation, driver acceptance/start/completion, and operator creation/assignment.
- Mobile-width layout, keyboard interaction, visible focus, empty and error states.
- Seeded demonstration state, with reports calculated from records rather than hardcoded dashboard numbers.

Document any check that cannot run in the available environment instead of claiming it passed.

## Deployment and operations

Provide Dockerfiles, Compose, `.env.example`, database initialisation instructions, seed commands, and an end-to-end deployment guide for a Node-compatible host and MongoDB replica set. Document TLS, proxy trust configuration, cookie settings, backups, indexes, health checks, and secret management.

A public deployment depends on available hosting/database access and account authorisation. Do not fabricate a public URL or treat deployment instructions as a successful deployment. Costs and any paid provisioning require a concrete service choice.

For real transport operation, state-specific licensing, insurance, safe vehicle capacity, driver verification, privacy obligations, and staffed support must be resolved independently of the software build.

## Learning deliverables

Include an annotated request walkthrough: booking-button click → browser request → session/CSRF validation → domain rules → atomic transaction → response → refreshed UI.

Explain frontend/server boundaries, HTTP, cookies, middleware, schemas, indexes, transactions, concurrency, idempotency, state machines, error handling, testing, deployment, logs, and scaling. Include API examples using a safe local environment and a diagram of the services and entities.

Document why this architecture was selected, what would change with PostgreSQL, when a shared rate limiter or event channel becomes useful, and which parts a native Android app could reuse. Keep developer explanations in documentation; keep passenger and driver screens simple.

## Acceptance criteria

The owner can follow documented setup steps, seed demonstration data, log in separately as passenger/driver/operator, complete a booking and trip through the browser, restart services without losing records, and inspect the implementation and learning guide. Concurrent bookings cannot oversell a departure, cancellation cannot restore seats twice, and users cannot access another role's protected resources.

The UI is usable on mobile and desktop and applies a coherent design system. Test/build evidence and unresolved limitations are included in the handoff. The result is a complete scheduled-ride software project with a clear boundary between tested functionality and external operating requirements.

## Implementation stages after design approval

1. Write and review the implementation plan and execution method.
2. Establish the workspace, shared contracts, database, authentication, and design tokens.
3. Deliver the passenger booking flow and transactional booking backend.
4. Deliver driver and operator workflows with authorised transitions.
5. Verify concurrency, security boundaries, browser journeys, and mobile layouts.
6. Finish teaching documentation, local preview, and deployable packaging; deploy if suitable authorised access exists.
