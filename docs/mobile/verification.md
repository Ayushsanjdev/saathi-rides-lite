# Mobile verification

The npm commands in the historical results below predate the pnpm migration. Use the current pnpm commands in [mobile setup](../../apps/mobile/README.md). The [11 October migration checks](../testing.md) include mobile type checks, all 17 tests, Android/iOS bundle exports and 21/21 Expo Doctor checks.

Verified locally on 9 October 2026 with Node 24 on macOS.

| Check | Result |
| --- | --- |
| `npm test` | 33 API/config/shared tests passed |
| `npm run test:mobile` | 17 tests across 7 files passed |
| `npm run typecheck` | All 5 workspaces passed |
| `npm run build` | API bundles and Next.js production build passed |
| `npm run build:mobile` | Android and iOS Hermes bundles and assets exported |
| `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome npm run test:e2e` | 4 browser journeys passed against an isolated replica set |
| `npx expo install --check` in `apps/mobile` | Dependencies aligned with the Expo SDK |
| `npx expo-doctor` in `apps/mobile` | 21/21 checks passed |

The native app uses Expo 57.0.27, React Native 0.86.3 and React 19.2.3. SDK-compatible native animation and gesture dependencies are pinned in the root workspace to avoid duplicate or mismatched native modules. Both native project configurations were generated locally; generated projects are ignored and reproducible from Expo config. Xcode 27 scene support is enabled.

Regression coverage includes native login/register/logout, operator rejection, token expiry/revocation, cookie/CSRF separation, inactive drivers, delayed authentication failures across account changes, session restoration, deep-link startup, account-scoped persistent booking payloads and idempotency keys, language storage, screen rendering and raw-text container mistakes. Existing transactional booking and driver API coverage remains in place.

The final browser run also supplied deliberately different inherited service ports; the harness correctly used its isolated 3000/4000 configuration. A cold MongoDB startup initially exceeded the library's 10-second limit while initializing WiredTiger. The harness now allows 60 seconds, and the complete rerun passed. Browser journeys cover the responsive web client, not native device UI.

## Native runtime boundaries

Bundle export is not a signed APK or iOS binary. CocoaPods and the Android SDK were initially unavailable on 9 October. After installing them, an ARM64 Android debug APK and an Apple Silicon iOS simulator app compiled successfully on 10 October. These development binaries require Metro; no store-signed release was produced. The 11 October pnpm migration verified bundle exports rather than repeating native binary compilation. Expo Go installation was attempted in an iOS simulator, but UI access timed out before a verified app journey; no simulator or physical-device journey is claimed as passing.

Before distribution, run the passenger and driver journeys on both platforms, including interrupted booking retries after restart, Hindi labels, phone links, date controls, background/foreground refresh and intermittent connectivity. EAS profiles are supplied; no remote project, signing credentials, cloud build or store submission was created.

## Dependency audit

The final production dependency audit reported 62 advisories (16 moderate, 46 high, zero critical), including cascading reports through Expo/Metro tool packages. The full installation reported 66 including development dependencies. These are not 62 independent root issues. A patched `shell-quote` override removes the critical advisory found during implementation.

Remaining roots include `braces`, `node-forge`, `sprintf-js`, and older `decode-uri-component`/`uuid` required by upstream tooling. The first three had no patched latest release during verification. Forcing major versions of the latter can break CommonJS consumers and Expo tooling, so unsupported overrides were not applied. Keep the supported Expo dependency set and recheck advisories before distribution. The earlier web-only audit result in the historical testing record does not describe the expanded mobile workspace.

Docker configuration was adjusted for server workspace installation, but Docker is unavailable here and the image was not executed.
