# Deployment and operations

## Local preview without Docker

Run `npm ci` then `npm run dev`. The database persists under `.data/mongo` and runs on 27018. There is no automatic wipe. To start a fresh demonstration, stop the runner and move `.data` to a backup directory yourself; do not delete data you need. The seed preserves existing users/bookings and adds a fresh rolling timetable only when no future scheduled departure remains.

## External MongoDB development

1. Copy `.env.example` to `.env`.
2. Set a replica-set `MONGODB_URI`, a random `SESSION_SECRET` of at least 32 characters, and `APP_ORIGIN=http://127.0.0.1:3000`.
3. For an isolated demo database, set `ALLOW_DEMO_SEED=true` and your own `DEMO_PASSWORD`, then run `npm run seed`.
4. Start `npm run dev`. With `MONGODB_URI` configured, this uses that database and does not launch the local MongoDB child.

`npm run dev:external` starts the separate API and Next development commands; inject the environment into both processes. The normal `npm run dev` runner reads the root `.env` and handles propagation for you.

## Production configuration

Use Node 24-compatible hosting for both services and an authenticated MongoDB replica set, such as Atlas. Serverless/static-only hosting alone cannot run this Express process. A Vercel deployment can host the Next application while a separate Node service hosts the API.

| Variable | API | Web | Meaning |
|---|---|---|---|
| `MONGODB_URI` | yes | no | Authenticated replica-set URI |
| `SESSION_SECRET` | yes | no | Random private signing secret, ≥32 characters |
| `APP_ORIGIN` | yes | yes | Exact public HTTPS origin, no trailing slash |
| `API_INTERNAL_URL` | no | yes | Private API service origin; read at runtime |
| `NODE_ENV` | production | production | Enables Secure cookies and disables demo seed |
| `API_PORT` | usually 4000 | no | API listener |
| `TRUST_PROXY` | 1 for the single trusted Next proxy | no | Express proxy trust depth |
| `SUPPORT_PHONE` | optional | no | Actual staffed support number |

`SESSION_SECRET`, database credentials and operator passwords are server secrets. Never prefix them with `NEXT_PUBLIC_`. Keep API ingress private or explicitly restricted to your frontend/proxy; otherwise the proxy-trust assumption is not valid. Place an edge limiter at the public login endpoint because the built-in process-local API limiter sees the web proxy's network address.

Build and start:

```bash
npm ci
npm run build
npm run start
```

The environment must be injected into both commands/processes. `npm run start` launches Express and `next start`; the Next config produces standalone output as well for container use. The server-side API proxy reads its upstream at runtime, avoiding a backend address baked into the frontend build.

## Provision the first operator

For a public preview, optionally set `DEMO_SIGN_IN=true` to show **Try demo** in the sign-in dialog. Each click creates a separate passenger account and signs it in without publishing a password. The endpoint requires CSRF protection and is rate-limited. These accounts use the same routes and booking system as other passengers; enable this only when demo bookings are appropriate. It does not seed routes or grant driver/operator access, and does not require `DEMO_MODE` or `ALLOW_DEMO_SEED`.

Set `OPERATOR_NAME`, `OPERATOR_EMAIL`, `OPERATOR_PASSWORD` (minimum 12 characters) and `MONGODB_URI` through the hosting secret/environment interface. Run:

```bash
npm run provision:operator
```

For a built API container, use:

```bash
node apps/api/dist/provision-operator.js
```

The command creates an operator with a hashed password; it does not print the password. Duplicate emails fail rather than overwriting an existing account. Remove provisioning-only credentials from the running service environment afterward. Operators can then create stops, routes and driver accounts through the app. Production must not seed public demo accounts.

## Docker demonstration

The included Compose setup is a local container demonstration with an unauthenticated MongoDB bound to localhost. It is not the recommended public deployment.

Set `SESSION_SECRET` in a root `.env`, then:

```bash
docker compose up --build -d
```

Compose initialises the replica set, waits for the API database connection and starts the web service. Open `http://127.0.0.1:3000`. It starts with an empty database. Supply `OPERATOR_NAME`, `OPERATOR_EMAIL`, `OPERATOR_PASSWORD` to a one-off administrative container:

```bash
docker compose run --rm \
  -e OPERATOR_NAME -e OPERATOR_EMAIL -e OPERATOR_PASSWORD \
  api node apps/api/dist/provision-operator.js
```

These variables must already be set in your shell; do not put real passwords in committed files. Then sign in and configure the service. MongoDB uses the named `mongo-data` volume. `docker compose down` keeps this volume; adding `-v` deletes it and is destructive.

The Dockerfile builds on Linux so Argon2 native modules match the target. API and web run as the unprivileged Node user. Next standalone output includes its traced runtime dependencies; public and static assets are copied separately. Docker wasn't installed in the build environment, so the container build/run requires verification on a Docker-capable machine.

## Health and backups

- `/api/health`: process alive.
- `/api/ready`: connected to database.
- Monitor request failures, booking conflicts, login failures, response latency, transaction retry rates and database capacity.
- Configure managed database backups and test restoring into a separate environment.
- Use a stable session secret across replicas/restarts; rotating it invalidates existing sessions.
- Keep only required booking/contact records, restrict staff access and define a retention policy before real operation.
- Logs currently use safe error messages without request bodies/passwords. Add structured request IDs and central logging for an operated service.

## Launch boundaries

No hosting account was provisioned and no public URL is claimed. Actual transport rollout also requires local legal/operational verification, insurance, safe capacity, incident response and accurate support contact details. Online payments, OTP, password reset, notification delivery and live tracking require separate integrations. The app explicitly records cash instead of claiming payment-gateway settlement.
