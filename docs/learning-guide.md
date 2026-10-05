# How the app works, end to end

This guide connects the code to backend concepts. Start with one booking, then follow the other modules.

## 1. What runs on your computer

`npm run dev` runs `scripts/local.ts`. It starts a real MongoDB process with persistent files, waits for a replica-set primary, connects Mongoose, creates indexes, adds demo users/routes and starts two app processes:

- Next.js on port 3000 renders the browser experience.
- Express on port 4000 handles API requests and business rules.

A replica set is required because the booking operation writes more than one document transactionally. The local runner uses a single member for convenience, not production high availability. Integration tests run another isolated real replica set with fresh temporary data.

## 2. What the browser receives

Next.js serves HTML, CSS and JavaScript. `app/layout.tsx` defines document metadata and shared CSS. `app/page.tsx` renders the working app.

`components/app.tsx` creates a QueryClient, language context, authenticated-user query and role navigation. A user sees only the relevant working surface, but hiding a button is not security. Express independently checks every request.

Components render values from API responses. They do not connect to the database. JSX such as `money(departure.farePaise)` transforms an API value into a rupee label; it does not authorise a price.

## 3. What happens when you sign in

The API client first fetches `/api/auth/csrf`. The server creates a random session token and sets a session-ID cookie. The browser stores that cookie automatically; JavaScript cannot read it because it is HttpOnly.

The login form sends email/password plus the CSRF header. The browser supplies Origin. Express checks Origin and token before attempting login. The controller parses the request with Zod, finds the user, verifies the Argon2id password hash and regenerates the session.

A regenerated session prevents an attacker from arranging a known anonymous session ID and having it remain valid after the victim signs in. The server stores user ID and a new token, and the browser receives a new session cookie.

On subsequent requests, Express loads session data from MongoDB, loads the current user and stores a safe actor DTO in `res.locals`. Current activation and role are checked server-side. Logout destroys the stored session and clears the cookie.

Argon2id is password hashing, not reversible encryption. The database stores a hash and its parameters; it cannot retrieve the original password. Passwords must never appear in audit logs or response DTOs.

## 4. Follow the booking button

Read these files in order:

1. `apps/web/components/rider.tsx`
2. `apps/web/lib/api.ts`
3. `apps/web/app/api/[...path]/route.ts`
4. `apps/api/src/app.ts`
5. `packages/contracts/src/index.ts`
6. `apps/api/src/booking.ts`
7. `apps/api/src/models.ts`
8. `apps/api/src/serializers.ts`

The passenger opens a review dialog, chooses seats and enters a mobile contact. The frontend creates a UUID for this attempt. Clicking Confirm sends:

```json
{
  "departureId": "a-valid-24-character-object-id",
  "seats": 2,
  "contactPhone": "9000000099",
  "idempotencyKey": "a-unique-key-for-this-attempt"
}
```

The UUID is an idempotency key. If a network failure hides the result after the server committed, submitting the same request can retrieve the existing booking. It must not reserve another two seats.

The Next.js proxy forwards the request to the configured API. It does not make the booking itself. Express checks the session and passenger role. Zod rejects bad identifiers, seat counts, phone numbers and extra fields such as a client-supplied fare.

The controller calls `createBooking`. This service starts a MongoDB transaction, checks whether the key already exists and conditionally updates the departure:

```ts
{
  _id: departureId,
  status: 'scheduled',
  assignment: { $in: ['pending', 'accepted'] },
  driverId: { $exists: true, $ne: null },
  departureAt: { $gt: new Date() },
  availableSeats: { $gte: seats }
}
```

All conditions must hold at the update. A read followed by an unconditional write would not be safe: two passengers could both read one remaining seat. Here only a valid atomic update reserves capacity.

The service inserts the booking using the departure's fare, inserts an audit event and commits. The response is serialized without exposing password hashes or database internals.

Only after receiving the committed response does the browser show Booking confirmed, navigate to My rides and invalidate cached seat availability. A timeout produces a retryable error, not a fabricated success.

## 5. Why both atomic updates and transactions are needed

The atomic departure update prevents two operations from changing the same last seats incorrectly. The transaction connects that update to the booking insert. Without the transaction, an insert failure could reduce capacity without creating a booking. Without the conditional update, a transaction alone could still contain incorrect domain logic.

A unique database index on `(passengerId, idempotencyKey)` is the final duplicate safeguard. Application checks are useful but two concurrent requests can both pass a preliminary existence check. The index and conflict retries settle that race.

The same idea applies to cancellation: booking state and seat restoration change together, and an already cancelled booking returns without restoring again.

## 6. Why a driver scheduling guard exists

Suppose two operators simultaneously assign one driver to overlapping trips. Both can query and find no overlap. The query itself does not lock the absence of a result.

Each assignment therefore first increments that driver's `scheduleVersion` within its transaction. Simultaneous writes to this record create a conflict; one transaction retries and then sees the other's new departure. The overlap check becomes reliable.

Starting a trip uses the same guard and also rejects any other in-progress trip. An estimated arrival time does not prove the earlier trip has finished.

## 7. Frontend state versus backend state

Use React state for immediate interface choices: selected date, seat count, language and open dialog. Use TanStack Query for server data: departures, bookings, manifests and operational totals.

After a successful mutation, invalidation says, “this cached server view may be stale; fetch its current value.” It is not a database operation. A frontend optimistic update would make the screen faster but requires careful rollback. This app deliberately waits for authoritative booking confirmation.

Read retries are allowed; automatic mutation retries are disabled. Booking retries are safe only with the preserved key. UI buttons disable while the request is running to reduce accidental duplicates, but server invariants still handle concurrent clients.

## 8. Validation, authentication, authorisation

These solve different problems:

- Validation: is `seats` an integer from 1 to 4, and is the identifier well formed?
- Authentication: which signed-in user sent the request?
- Authorisation: may that user read or change this specific booking/trip?

A valid ID does not imply permission. A passenger fetching another passenger's booking receives 404 rather than private data. A passenger requesting an operator endpoint receives 403. Public registration cannot assign a privileged role.

## 9. HTTP errors

200 means a successful read or repeat of an existing result. 201 means creation. 400 means invalid input. 401 means login is needed. 403 means insufficient permission or a rejected CSRF check. 404 means the resource is unavailable to this actor. 409 means a domain conflict, such as unavailable seats or an overlapping schedule. 429 means throttling. 502 means the web proxy could not reach the API.

Errors use a structured envelope:

```json
{"error":{"code":"CONFLICT","message":"These seats are no longer available. Choose another departure."}}
```

Do not rely on text matching for business logic. Codes are stable identifiers; messages can later be translated. Stack traces belong in controlled server logs, not passenger responses.

## 10. Database models, DTOs and indexes

A Mongoose schema describes stored data. A DTO describes data exposed over HTTP. They are separate because storage can contain internal fields, and different actors need different visibility.

A departure DTO returned publicly includes the driver name and vehicle, but not the private driver phone. A passenger's own confirmed booking includes contact information needed for the journey. Manifests are protected.

Indexes improve specific lookup patterns and enforce uniqueness. More indexes are not always better: each index consumes storage and work on writes. Check query plans and realistic data before adding speculative indexes.

The current bounded serializers make per-row joins. This is simple to read for a learning project but can become an N+1 query bottleneck. A later improvement is a batched `$in` lookup or aggregation `$lookup`, keeping the same DTO contract.

## 11. Testing strategy

The API suite uses real sessions, requests, documents and replica-set transactions. Concurrent tests launch eight requests for four seats and assert four creations, four capacity conflicts and exactly four bookings. Other cases verify retry identity, cancellation replay, role/ownership boundaries, overlapping assignments, active-trip guards, pagination and no-show/cash consistency.

Playwright test definitions interact with the browser, not just service functions. A restricted macOS shell may prevent launching Chromium; use the connected browser for manual journey verification and run Playwright on an unrestricted machine/CI. The testing document distinguishes executed evidence from test definitions.

## 12. Deployment and what changes

Development can use a local database. Production uses persistent services, TLS, authenticated MongoDB, a secret manager, backups, a provisioned operator and network-restricted API access.

The Next.js proxy reads `API_INTERNAL_URL` at runtime, so the same web build can point to another backend without embedding a private hostname in client JavaScript. Express receives `MONGODB_URI`, `SESSION_SECRET`, `APP_ORIGIN` and proxy settings. Secrets must never have a `NEXT_PUBLIC_` prefix.

A health endpoint says the process is alive. Readiness says it can reach its database. On shutdown, the server stops accepting connections and closes sessions/database clients. The local runner stops its MongoDB child without deleting persistent files.

## 13. What to explore next as a backend learner

- Add password recovery through a real provider, with expiring one-use tokens.
- Add API request IDs and structured redacted logs.
- Batch serializers and inspect MongoDB explain plans.
- Add an outbox for reliable booking notifications.
- Add a shared rate limiter once multiple API processes are needed.
- Build a native Android client against the same contract.
- Implement the same booking service in PostgreSQL and compare constraints, row locks and query design.

Keep each addition behind a clear requirement and a regression test. A stronger portfolio explains its boundaries and tradeoffs rather than claiming every production feature exists.
