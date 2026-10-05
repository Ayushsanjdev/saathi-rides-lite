# Mobile-first design system

## Visual direction

Saathi resembles a clear local timetable: quiet surfaces, direct controls, route markers and readable tickets. The route itself, departure time, seat availability and fare are the primary information. There is no marketing landing page between a passenger and booking.

| Token | Value | Purpose |
|---|---|---|
| Ink | #163b53 | Headings, logo and search action |
| Green | #176b50 | Booking actions, confirmed states and focus |
| Background | #f5f8fa | Cool page surface |
| Card | #ffffff | Forms, trips and dialogs |
| Muted text | #5f7281 | Supporting information |
| Border | #dce5eb | Grouping and form boundaries |

Tokens live in `apps/web/app/globals.css`. Tailwind's inline theme maps these variables into utility names used by shadcn. Reusable controls come from generated shadcn source, backed by Radix accessibility behaviour. The generated utilities import was corrected to the actual project alias.

## Layout

At small widths, a single content column and fixed bottom navigation expose booking, rides, help and account. At 640px, suitable lists and forms can become two columns. At 1024px, navigation becomes a sidebar and passenger booking receives a compact supporting-information column.

The mobile header exposes identity/sign-in and the language toggle. Dialogs have bounded viewport height and scroll when necessary. Inputs use 16px text to avoid mobile zoom behaviour. Main actions have at least 44px targets; the passenger stepper uses compact controls within a larger grouped target area.

Typography uses a system sans-serif stack to avoid downloading font files. Main headings are 30px on phones, increasing to 38px on desktop. Regular text is 16px; labels are generally 14px and supporting metadata 12–13px.

## Semantic states

Green: accepted, confirmed or completed. Amber: pending/unassigned. Blue: in progress. Red: cancellations/declines. Every status includes a text label; colour is not the only information channel. Icons also have labels when they trigger actions.

Use skeletons only while loading. Empty states explain the next useful action. Network errors expose retry. A pending booking is never displayed as confirmed. Mutation failures stay near the form as well as appearing in a toast.

## Interaction rules

- Display server fares; compute the preview only from the selected departure's fare.
- Confirmation dialogs precede bookings and cancellation/lifecycle decisions.
- Disable duplicate clicks while requests are pending.
- Keep request keys stable across retries and regenerate only for a newly chosen booking.
- Cash collection means a driver recorded cash; it is not bank settlement.
- No-show marking requires a second confirmation action and does not create a fine.
- Focus is visible, Radix dialogs trap focus and restore it on close, and reduced motion is respected.

## Language

English and Hindi strings live in `apps/web/lib/i18n.tsx`. Landmark names may be stored in local scripts. User-entered names, vehicle numbers and identifiers remain unchanged. Backend validation/error messages are currently English; translating domain error codes is a documented next localisation step rather than claiming complete bilingual error coverage.
