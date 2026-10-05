# Village and semi-urban feasibility

## Why scheduled shared rides

The product hypothesis is that a small local operator can fill seats on repeat landmark-to-landmark routes with less uncertainty for drivers and passengers. This must be tested locally. National connectivity statistics do not establish demand in a particular village. TRAI publishes separate rural and urban subscription indicators; subscriptions are not the same as unique people, smartphones or dependable connectivity. See the [TRAI performance report collection](https://www.trai.gov.in/release-publication/reports/performance-indicators-reports).

Scheduled trips reduce matching complexity, map dependence and continuous GPS battery use. Named landmarks are easier to explain than exact coordinates in an area with unclear addresses. Fixed published fares make the review screen understandable. Direct cash removes a payment-provider requirement for the demonstration, but creates reconciliation and theft risks.

## Advantages, flaws and response

| Issue | Advantage of this design | Remaining flaw / field response |
|---|---|---|
| Inexpensive phones | System fonts, no map SDK, restrained screens and polling | React still has JavaScript startup cost; measure on real Android hardware |
| Mobile signal | Bounded requests, visible pending/errors, idempotent booking retries | Booking needs a server connection; offline bookings are not confirmed |
| Low digital literacy | Large controls, Hindi labels, landmarks | Email/password remains a portfolio compromise; phone login and assisted booking are needed for a pilot |
| Sparse demand | Shared seats and scheduled routes | Empty trips lose money; test one corridor at market/commute times |
| Driver trust | Verified eligibility managed by operator, driver accepts assignments | Software does not verify licences or inspect vehicles |
| Passenger no shows | Driver can record no show without debt or penalty | Empty reserved seats cost drivers; agree a fair local cancellation policy |
| Delays and battery/vehicle failure | Operator can cancel and reassign before cutoff | No live ETA or automatic incident response; staff must contact affected people |
| Cash | Familiar and no gateway dependency | Recorded collection is driver testimony, not bank settlement; reconcile daily |
| Privacy | Role restrictions and private manifests | Phone numbers are sensitive; retention, account recovery and operator access policy need field validation |
| Cost | One API and database rather than microservices | Hosting, backups, support, SMS, verification and driver operations still cost money |

Google's [JavaScript startup guidance](https://web.dev/articles/optimizing-content-efficiency-javascript-startup-optimization) explains why JavaScript processing matters on slower devices. Its [performance budget guidance](https://web.dev/articles/performance-budgets-101) supports measuring a budget rather than assuming a minimal-looking UI is fast. Suggested pilot goals, not measured achievements here: keep route-specific transferred JavaScript under 200KB compressed where feasible; target p75 LCP under 2.5s and INP under 200ms; verify on actual entry-level hardware and constrained mobile data. Next.js and shadcn make a useful learning stack but do not inherently guarantee these goals.

## Pilot and unit economics

Start with interviews: 10–15 drivers, passengers who use the corridor regularly, women who travel alone, older residents and one local organiser. Count actual departures, waiting times, fares and seat occupancy for a week. Run a staffed trial on one or two routes before expanding.

Driver trip margin = occupied seats × fare − energy − maintenance allocation − driver's time − operator fee. Operator margin = fee revenue − hosting/SMS − staff/support − verification − incident handling. Use measured local inputs; the app's ₹20–₹30 demo fares are fictional examples, not an economic recommendation. Large booking counts alone do not prove a viable service.

Measure repeat use, successful pickup rate, median waiting time, occupancy, driver net earnings and support incidents. Decide pilot thresholds with drivers before launch. Add assisted bookings through an authorised operator workflow when research shows shared-phone or phone-free passengers need it; that workflow is not implemented in this version.

## Other useful app hypotheses

| Idea | Potential benefit | Hardest issue |
|---|---|---|
| Local clinic queue and appointment reminders | Less repeated travel and waiting | Staff participation and reliable schedule updates |
| Farm equipment booking | Share costly tools and plan availability | Damage, deposits, handover and ownership disputes |
| Water delivery/repair request tracker | Track a recurring essential service | Someone must perform the service and keep status accurate |
| Local repair-worker directory | Find a trusted electrician or mechanic | Verification, availability and dispute resolution |
| Market-day delivery pooling | Combine trips for groceries and goods | Missing goods, spoilage and cash accountability |

These are hypotheses, not established market findings. A queue or equipment scheduler may need less operational coordination than transport, but still needs a local organisation that owns the process. The implemented app provides reusable learning about authentication, scheduling, capacity, transactions and operations for several of these products.
