# HTTP API

Base URL in the browser: `/api`. Direct local Express URL: `http://127.0.0.1:4000/api`. The web proxy is the normal public entry point.

All JSON mutations require cookies, `Origin` matching `APP_ORIGIN`, and `X-CSRF-Token`. The token is obtained from `GET /auth/csrf`; login/registration return a replacement after session regeneration. Mutation payloads use strict schemas. Pagination defaults to page 1, 30 items and is bounded to 100 items per page.

## Public and authentication

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Process liveness |
| GET | `/ready` | Database readiness |
| GET | `/config` | Configured support phone; demo helpers only in explicit non-production demo mode |
| GET | `/auth/csrf` | Create/read session-bound token |
| POST | `/auth/register` | Passenger registration: name, email, password, optional phone |
| POST | `/auth/login` | Email/password login |
| POST | `/auth/logout` | Destroy session |
| GET | `/me` | Authenticated safe user profile |
| GET | `/stops` | Active named stops |
| GET | `/routes` | Active routes with active endpoints and per-seat fare |
| GET | `/departures?from=ID&to=ID&date=YYYY-MM-DD` | Future bookable departures, maximum 100, date interpreted in IST |

Passwords have a 10-character minimum and 128-character maximum. Registration rejects a role field. A phone, when present, is a 10-digit Indian mobile number. Registration is not phone-number verification.

## Passenger

| Method | Path | Payload / result |
|---|---|---|
| POST | `/bookings` | `{departureId,seats,contactPhone,idempotencyKey}`; booking DTO |
| GET | `/bookings?page=1&limit=30` | Own bookings, newest first, hasMore |
| GET | `/bookings/:id` | Own booking only |
| POST | `/bookings/:id/cancel` | Cancel own unpaid future booking; `{}` |

A new booking returns 201; an identical replay returns 200 with the same booking. A key reused with different departure/seats/contact returns 409. The server computes `totalPaise`; submitted price fields are rejected. Contact details are a snapshot for this booking.

## Driver

| Method | Path | Description |
|---|---|---|
| GET | `/driver/overview` | Aggregate recorded collections, completed count, profile and bounded trip sample |
| GET | `/driver/trips?history=false&page=1&limit=30` | Paginated scheduled/in-progress work; oldest first |
| GET | `/driver/trips?history=true&page=1&limit=30` | Completed/cancelled history; newest first |
| GET | `/driver/trips/:id/manifest` | Assigned departure and passenger manifest only |
| POST | `/driver/trips/:id/accept` | Accept pending future assignment |
| POST | `/driver/trips/:id/decline` | Decline pending future assignment |
| POST | `/driver/trips/:id/start` | Accepted trip, within 15 minutes before departure, no other active trip |
| POST | `/driver/trips/:id/complete` | Complete in-progress trip and confirmed bookings |
| POST | `/driver/bookings/:id/collect` | Record cash once on own started/completed trip |
| POST | `/driver/bookings/:id/no-show` | Mark absent unpaid passenger on own in-progress trip; no penalty |

Lifecycle and collection mutations use `{}` bodies. Collection and no-show replays are idempotent; accept/start/complete have state preconditions and may return 409 when repeated. Do not retry all POST requests blindly.

## Operator

| Method | Path | Description |
|---|---|---|
| GET | `/operator/overview` | Aggregate counters plus bounded configuration/recent booking/audit samples |
| GET | `/operator/departures?history=false&page=1&limit=30` | Paginated active timetable |
| GET | `/operator/departures?history=true&page=1&limit=30` | Paginated terminal timetable |
| POST | `/operator/stops` | `{name,locality,active}` |
| PATCH | `/operator/stops/:id` | Same stop shape |
| POST | `/operator/routes` | `{fromStopId,toStopId,farePaise,active}` |
| PATCH | `/operator/routes/:id` | Same route shape; historical fares stay unchanged |
| POST | `/operator/departures` | `{routeId,departureAt,durationMinutes,capacity,driverId?}` |
| POST | `/operator/departures/:id/assign` | `{driverId}` with capacity/eligibility/overlap checks |
| POST | `/operator/departures/:id/cancel` | `{}`; cancels confirmed bookings atomically |
| POST | `/operator/drivers` | `{name,email,password,phone,vehicle,capacity,verified}` |
| PATCH | `/operator/drivers/:userId` | `{active,verified}`; protects ongoing/upcoming assignments |

Seat capacity is 1–4 for this project; the operator must use the vehicle's actual authorised capacity. Duration is 10–180 minutes. Fare is 100–100000 paise. A created departure without an assigned driver stays out of passenger search until assignment. Scheduling stores UTC instants; `departureAt` must be an ISO datetime with a timezone.

Operators cannot be created through this API. Use the documented administrative CLI.

## Local request example

Use only demonstration credentials against your local database:

```bash
curl -s -c work.cookies http://127.0.0.1:3000/api/auth/csrf
```

Copy the returned token, then:

```bash
curl -s -b work.cookies -c work.cookies \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://127.0.0.1:3000' \
  -H 'X-CSRF-Token: COPY_RETURNED_TOKEN' \
  -d '{"email":"passenger@saathi.test","password":"SaathiDemo2026!"}' \
  http://127.0.0.1:3000/api/auth/login
```

Login returns a new token. Use that token for booking mutations. Query routes and departures to obtain real IDs; do not reuse placeholder IDs from documentation. Protect and delete the cookie file after testing.

## Error contract

```json
{"error":{"code":"CONFLICT","message":"This driver already has a trip during that time."}}
```

400 invalid input; 401 missing session/credentials; 403 role or CSRF rejection; 404 unavailable/other-owner resource; 409 domain conflict; 413 oversized request; 429 login throttle; 500 unexpected API error; 502 proxy cannot reach the API. Private data and stack traces are not returned in errors.
