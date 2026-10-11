# Saathi Rides mobile

An Expo app for Android and iOS, in the existing npm-workspaces monorepo. Passengers search and book scheduled e-rickshaw rides; drivers manage assignments, passenger lists, trip lifecycle and recorded cash. Operators use the web app.

## Run locally

Use Node 24 and run `npm ci` from the repository root. Mobile dependencies share the root lockfile; do not install from a separate lockfile inside this directory.

Start the service in the first terminal:

```sh
npm run dev:mobile
```

This starts the existing API and web proxy, with the web server listening on the LAN. The API stays on loopback. It reads the root `.env`, including any configured external database. To explicitly use the local persistent demo database instead:

```sh
MONGODB_URI= npm run dev:mobile
```

Copy `apps/mobile/.env.example` to `apps/mobile/.env.local`. Set the public service address for your target:

| Target                  | EXPO_PUBLIC_API_URL                    |
| ----------------------- | -------------------------------------- |
| iOS simulator           | `http://127.0.0.1:3000/api`            |
| Android emulator        | `http://10.0.2.2:3000/api`             |
| Physical Android/iPhone | `http://YOUR_COMPUTER_LAN_IP:3000/api` |
| Deployed app            | `https://YOUR_WEB_HOST/api`            |

Devices and the computer must share a reachable network. Use the web/proxy URL, including `/api`, rather than exposing Express directly. Public Expo variables are bundled into the app and must contain no secrets. Restart Metro after changing them. If no URL is set in development, the app infers the computer hostname from Metro; set it explicitly for emulators and device builds.

Start Metro in a second terminal:

```sh
npm run mobile
```

The default uses development builds. Compile and launch a development client using:

```sh
npm run mobile:ios
# or
npm run mobile:android
```

iOS needs Xcode and CocoaPods. Android needs the Android SDK, Java and an emulator/device. These commands generate ignored `ios/` or `android/` projects. Expo config and plugins remain their source of truth. SDK 57 uses React Native 0.86 and React 19.2.3. Xcode 27 scene support is enabled through Expo build properties.

For an SDK-compatible Expo Go installation, run `npx expo start --go` directly from `apps/mobile`. SDK-specific Expo Go availability varies; development builds are the default.

Local seeded accounts are `passenger@saathi.test` and `driver@saathi.test`, with password `SaathiDemo2026!` unless overridden in the root environment. Demo account details also appear in sign-in when the service explicitly advertises demo mode. Registration creates passengers; driver accounts are provisioned through the web operator interface.

## Verification

See [recorded results and remaining device checks](../../docs/mobile/verification.md).

From the repository root:

```sh
npm run typecheck
npm test
npm run test:mobile
npm run build
npm run build:mobile
npm run test:e2e
```

`build:mobile` exports the Android/iOS JavaScript bundles and assets into ignored `apps/mobile/dist`. It does not produce an APK or signed iOS binary. Browser tests use a temporary replica set, never the MongoDB configured in `.env`. Install Playwright Chromium first (`npx playwright install chromium`), or use installed Chrome with `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome npm run test:e2e`.

From `apps/mobile`, run `npx expo install --check` and `npx expo-doctor` after dependency changes. Root pins keep React and native animation peers aligned across the monorepo; avoid `--legacy-peer-deps` and do not upgrade React Native independently of Expo.

## EAS builds

`eas.json` contains development, preview and production profiles. No remote project, signing credential or build has been created by adding this app.

Once ready to link your own Expo account, run `npx eas-cli login` and `npx eas-cli init` from `apps/mobile`. Because config is TypeScript, provide the returned project ID through `EAS_PROJECT_ID` when the CLI cannot edit the configuration automatically. Choose your permanent application identifiers before distribution; the defaults are `com.saathirides.mobile` for both platforms.

Set `EXPO_PUBLIC_API_URL` to your deployed HTTPS web proxy in each selected EAS environment, then build with:

```sh
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform all
```

The development iOS profile targets the simulator. Preview Android produces an APK. Preview iOS distribution requires device registration/signing, and production store delivery requires the respective developer accounts. EAS commands do not submit builds to stores automatically.

## Authentication and retry behaviour

Native sign-in issues a random, revocable seven-day token. The API stores only its SHA-256 hash. SecureStore persists the credential and account snapshot; startup validates it through `/me`. Invalid or inactive accounts clear authentication. A temporary network failure preserves the account so the user can retry. Browser cookie and CSRF authentication continues separately.

Before submitting a booking, the app persists its exact departure, seats, phone and idempotency key under the passenger ID. An interrupted request stays unconfirmed. After restart, Book exposes the same review and retries the same payload. An unresolved request cannot be overwritten by a new reservation; after a definitive server rejection it can be discarded. Successful confirmation clears the draft and opens authoritative booking details. Drafts include contact details, are encrypted through SecureStore, and are scoped to the passenger account.

English and Hindi labels, fares and IST dates share `@saathi/core` with the web app. Domain error messages remain English, matching the existing API. Focused screens poll every 15 seconds for drivers or 30 seconds for passengers; foreground/connectivity events refresh queries. Offline mutations and automatic mutation retries are disabled.
