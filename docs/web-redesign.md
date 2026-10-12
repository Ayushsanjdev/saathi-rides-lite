# Saathi web redesign

Updated direction: compact workspace with white, charcoal and blue, across rider, driver and operator web screens. Native mobile is excluded.

## Implementation

- Blue actions, white and soft gray surfaces, charcoal text, 24–28px headings, 14px body text and aligned ride rows. A 184px sidebar, horizontal search toolbar and shared statistics strip replace oversized cards and the illustration panel. System fonts keep the design independent of downloaded assets.
- Preserve the current role workspace through Help, search fields and history selections through navigation, and scroll position per screen. Reset private state when the authenticated account changes. Preserve a guest's selected departure through passenger sign-in.
- Shared query factories drive screens and prefetching. Reference data stays fresh for five minutes; live data retains its existing refresh intervals. Load driver/operator code only when those roles authenticate.
- Open shells and dialogs without waiting for requests. Retain matching cached data on refresh failure, show errors with retry, and never use another search's results as a placeholder. Mutations remain server confirmed.
- Browser tests use an isolated MongoDB and ports 3100/4100 with their own Next.js output directory, avoiding the user's running development server.

## Verification record

Baseline production webpack build: passed. Static chunks total 1208 KiB on disk (all routes/runtime, uncompressed; not initial downloaded JavaScript).

Default Turbopack build encountered an environment restriction on spawning a worker that binds a local port. Verification uses the supported webpack build.

Final verification:

- `pnpm typecheck`: passed across web, API, contracts, core and native mobile.
- `pnpm test`: all 34 API/core tests passed during the preceding demo-configuration fix; this compact-layout revision changes only web presentation and documentation.
- API build passed; `SAATHI_NEXT_DIST_DIR=.next-verify pnpm --filter @saathi/web exec next build --webpack` passed for the final web source.
- Verified all 19 browser scenarios with installed Chrome against the isolated database. The full compact-layout run passed 18; theme persistence encountered a development-server JSON/reload error during the overlapping build and passed on an isolated rerun after the build finished. Persistent demo access through registration, Help and signed-in sessions passed.
- Generated and inspected responsive screenshots for rider, driver and operator at 360/768/1440px in English/Hindi and light/dark themes. No horizontal overflow or browser runtime errors in these checks. Dialog focus return, reduced motion, pending manifests, account isolation, guest booking through sign-in, and duplicate rider/operator requests are covered.
- Independent code review found operator double-click submissions could race the pending render. A regression reproduced two POSTs; the shared synchronous mutation guard addresses this across the web actions. Follow-up review found no blocker.

## Measurements

| Measurement | Before | After |
|---|---:|---:|
| JavaScript referenced by prerendered page HTML, raw | 848,458 bytes | 836,473 bytes |
| Same JavaScript, estimated gzip | 258,225 bytes | 256,848 bytes |

These include Next/React runtime chunks and initial app scripts, exclude CSS and deferred role chunks, and use local gzip estimates rather than CDN transfer measurements. The initial JavaScript reduction is small; the interaction improvements come mainly from preserving state, warming likely requests, keeping cached results visible, and avoiding data-dependent dialog opening. Driver/operator implementations are separate asynchronous chunks.

Latest local Chrome desktop navigation samples: 16.4–43.7ms, median 22.65ms. Sign-in dialog feedback: 50.0ms. Measurements run against the local development server and check visible feedback on animation frames. They are not production INP results or physical inexpensive-phone measurements. Fresh data and authoritative mutations still depend on network/server latency; no baseline interaction timings were recorded.

## Preview artifacts

- [Desktop booking](web-booking-desktop.png)
- [Mobile booking](web-booking-mobile.png)
- [Operator desktop](web-operator-desktop.png)

