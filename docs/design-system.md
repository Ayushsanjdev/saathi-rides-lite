# Mobile-first design system

## Visual direction

Saathi uses a restrained transit identity: white and soft gray surfaces, charcoal text and blue actions, compact controls and aligned ride rows. The route itself, departure time, seat availability and fare are the primary information. There is no marketing landing page between a passenger and booking.

| Token | Value | Purpose |
|---|---|---|
| Ink | #20242C | Headings and primary text |
| Blue | #2563EB | Main actions, focus and active navigation |
| Soft gray | #FAFBFC | Page surface and route field grouping |
| Secondary | #F0F3F7 | Selected controls and active navigation |
| Card | #FFFFFF | Forms, trips and dialogs |
| Muted text | #606B7A | Supporting information |
| Border | #DCE1E8 | Grouping and control boundaries |

Tokens live in `apps/web/app/globals.css`. Tailwind's inline theme maps these variables into utility names used by shadcn. Reusable controls come from generated shadcn source, backed by Radix accessibility behaviour. The generated utilities import was corrected to the actual project alias.

## Layout

At small widths, a single content column and fixed bottom navigation expose booking, rides, help and account. At 640px, suitable lists and forms become two columns. At 1024px, a 184px sidebar and full-width booking workspace replace bottom navigation. Ride rows align time and seats, journey and driver, and fare/action in three columns. At 1280px, the search form becomes one compact horizontal toolbar. Brief service guidance appears below results; the illustration panel is removed.

The mobile header exposes identity/sign-in and the language toggle. Dialogs have bounded viewport height and scroll when necessary. Inputs use 16px text to avoid mobile zoom behaviour. Main actions have at least 44px targets; the passenger stepper uses compact controls within a larger grouped target area.

Typography uses a system sans-serif stack to avoid downloading font files. Main headings are 24px on phones, increasing to 28px on desktop. Hindi headings use looser line height and natural letter spacing. Regular text is 14px; labels and supporting metadata are 12–13px. Inputs retain 16px text on mobile. Corners use 6px for controls, 8px for content groups and 12px for dialogs. A shared statistics strip replaces separate rounded statistic cards. Decorative shadows are removed from content.

## Semantic states

Green: accepted, confirmed or completed. Amber: pending/unassigned. Blue: in progress. Red: cancellations/declines. Every status includes a text label; colour is not the only information channel. Icons also have labels when they trigger actions.

Use skeletons only for uncached sections while loading. Matching cached results remain visible during refresh and refresh errors expose retry. Empty states explain the next useful action. A different search never borrows the previous route’s results. A pending booking is never displayed as confirmed. Mutation failures stay near the form as well as appearing in a toast.

## Interaction rules

- Display server fares; compute the preview only from the selected departure's fare.
- Confirmation dialogs precede bookings and cancellation/lifecycle decisions.
- Disable actions while requests are pending; the shared mutation hook synchronously suppresses repeated clicks before React renders the disabled state.
- Keep request keys stable across retries and regenerate only for a newly chosen booking.
- Cash collection means a driver recorded cash; it is not bank settlement.
- No-show marking requires a second confirmation action and does not create a fine.
- Focus is visible. Radix dialogs trap focus; controlled dialogs explicitly return focus to their opener or the main content if the opener disappeared. Reduced motion disables transitions and animations.

## Language

English and Hindi strings live in `apps/web/lib/i18n.tsx`. Landmark names may be stored in local scripts. User-entered names, vehicle numbers and identifiers remain unchanged. Backend validation/error messages are currently English; translating domain error codes is a documented next localisation step rather than claiming complete bilingual error coverage.

## Navigation and loading

Role workspaces stay mounted while Help is shown, retaining drafts and history tabs. Navigation remembers each screen’s scroll position. Account changes reset private drafts and remove the previous account’s query cache; a guest’s chosen ride survives passenger sign-in.

Reference queries have five-minute freshness. Screens and intent prefetching share query factories, live data keeps existing freshness/polling, and hidden workspaces do not poll. Driver and operator code load only for their authenticated roles. Session resolution renders a stable shell while reference requests run in parallel.

See [web-redesign.md](web-redesign.md) for verification measurements and limitations.

## Demo access

A persistent demo account button is available on every screen, including signed-in sessions. Demo credentials appear above the sign-in form and remain visible during registration. Local environments that explicitly seed demo accounts publish their configured demo password without requiring a second display flag. Normal production environments keep demo credentials disabled; hosted demos retain their isolated demo database.
