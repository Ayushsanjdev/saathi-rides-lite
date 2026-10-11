import { it, expect } from "vitest";
import { createTransport, ApiError } from "../src/transport";
it("sends bearer credentials and exposes domain errors without mutation retries", async () => {
  let count = 0;
  const api = createTransport({
    baseUrl: "https://saathi.test/api",
    headers: async () => ({ Authorization: "Bearer native" }),
    fetch: async (url, init) => {
      count++;
      expect(String(url)).toBe("https://saathi.test/api/bookings");
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Bearer native",
      );
      return new Response(
        JSON.stringify({
          error: { code: "CONFLICT", message: "No seats left" },
        }),
        { status: 409 },
      );
    },
  });
  await expect(
    api("/bookings", { method: "POST", body: { seats: 1 } }),
  ).rejects.toMatchObject({
    status: 409,
    code: "CONFLICT",
    message: "No seats left",
  });
  expect(count).toBe(1);
});
it("turns connection failures into recoverable API errors", async () => {
  const api = createTransport({
    baseUrl: "/api",
    fetch: async () => {
      throw new Error("disconnected");
    },
  });
  await expect(api("/routes")).rejects.toBeInstanceOf(ApiError);
  await expect(api("/routes")).rejects.toMatchObject({ status: 0 });
});
