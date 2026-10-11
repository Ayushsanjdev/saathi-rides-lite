# Expo implementation ledger

Approved design: passenger and driver app on Android/iOS, npm workspaces, shared API/contracts, EAS config only.

- Native-auth regression tests: observed failing against missing endpoints.
- Ruling: implement in requested checkout; no worktree or commits requested.
- Ruling: keep production API private and use existing web proxy for native access.
- Completed: native bearer authentication, hashed/revocable sessions, shared transport and translations, passenger booking/history/cancellation, driver assignments/manifests/cash/trip lifecycle, secure session and booking recovery, offline/focus handling, app assets, Expo/EAS configuration and setup documentation.
- Completed: API and mobile regression tests, workspace typechecking, web/API production builds, both native bundle exports, Expo dependency checks and independent code review. Review findings were fixed and covered by regressions.
- Native projects were generated to verify configuration, then removed; Expo config remains the source of truth. Signed binaries, store publication and physical-device QA are outside the completed local validation.
- See [verification evidence and remaining checks](verification.md).
