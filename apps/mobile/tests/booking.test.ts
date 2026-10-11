import { BookingIntents } from "../src/booking-intent";
import type { DepartureDTO } from "@saathi/contracts";
const departure: DepartureDTO = {
  id: "a".repeat(24),
  routeId: "b".repeat(24),
  pickup: "Square",
  destination: "Town",
  farePaise: 2500,
  departureAt: "2026-10-10T04:00:00Z",
  endAt: "2026-10-10T04:30:00Z",
  capacity: 4,
  availableSeats: 4,
  status: "scheduled",
  assignment: "accepted",
  bookedSeats: 0,
};
function setup() {
  const values = new Map<string, string>();
  return new BookingIntents(
    {
      getItem: async (k) => values.get(k) ?? null,
      setItem: async (k, v) => {
        values.set(k, v);
      },
      removeItem: async (k) => {
        values.delete(k);
      },
    },
    () => "stable-request-key",
  );
}
test("persists exact payload for retry after restart and scopes it to its passenger", async () => {
  const intents = setup();
  const draft = await intents.create("rider", departure, 2, "9000000099");
  expect((await intents.read("rider"))?.body).toEqual({
    departureId: "a".repeat(24),
    seats: 2,
    contactPhone: "9000000099",
    idempotencyKey: "stable-request-key",
  });
  expect(await intents.read("other")).toBe(null);
  expect((await intents.read("rider"))?.body.idempotencyKey).toBe(
    draft.body.idempotencyKey,
  );
  await intents.clear("rider");
  expect(await intents.read("rider")).toBe(null);
});
test("does not overwrite an unresolved booking with a different choice", async () => {
  const intents = setup();
  await intents.create("rider", departure, 1, "9000000099");
  await expect(
    intents.create("rider", departure, 2, "9000000099"),
  ).rejects.toThrow("Resolve");
  expect((await intents.read("rider"))?.body.seats).toBe(1);
});
