import { SessionController } from "../src/session-controller";
const rider = {
  id: "rider",
  name: "Rider",
  email: "rider@saathi.test",
  role: "passenger" as const,
};
function setup(saved: string | null = null) {
  let value = saved;
  let credential: string | null = null;
  const store = {
    get: async () => value,
    set: async (v: string) => {
      value = v;
    },
    remove: async () => {
      value = null;
    },
  };
  const api = jest.fn();
  const controller = new SessionController(store, api, (t) => {
    credential = t;
  });
  return { controller, api, read: () => value, credential: () => credential };
}
test("restores persisted credentials and validates the current user", async () => {
  const s = setup(
    JSON.stringify({
      token: "saved-token",
      user: rider,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    }),
  );
  s.api.mockResolvedValue({ user: { ...rider, name: "Updated" } });
  await s.controller.restore();
  expect(s.controller.snapshot().user?.name).toBe("Updated");
  expect(s.credential()).toBe("saved-token");
  expect(s.controller.snapshot().loading).toBe(false);
});
test("clears expired server authentication but preserves identity during a network interruption", async () => {
  const saved = JSON.stringify({
    token: "saved-token",
    user: rider,
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  });
  const offline = setup(saved);
  offline.api.mockRejectedValue({ status: 0, message: "Offline" });
  await offline.controller.restore();
  expect(offline.controller.snapshot().user?.id).toBe("rider");
  const expired = setup(saved);
  expired.api.mockRejectedValue({ status: 401, message: "Expired" });
  await expired.controller.restore();
  expect(expired.controller.snapshot().user).toBe(null);
  expect(expired.read()).toBe(null);
});
test("login survives restart and logout revokes the token and clears the account", async () => {
  const s = setup();
  s.api.mockResolvedValueOnce({
    token: "new-token",
    user: rider,
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  });
  await s.controller.signIn("/login", {
    email: rider.email,
    password: "Password123!",
  });
  expect(s.controller.snapshot().user).toEqual(rider);
  expect(JSON.parse(s.read()!).token).toBe("new-token");
  s.api.mockResolvedValueOnce({ ok: true });
  await s.controller.logout();
  expect(s.controller.snapshot().user).toBe(null);
  expect(s.read()).toBe(null);
});
test("operator credentials are never persisted as a mobile account", async () => {
  const s = setup();
  s.api.mockResolvedValue({
    token: "operator-token",
    user: { ...rider, role: "operator" },
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  });
  await expect(s.controller.signIn("/login", {})).rejects.toThrow("web app");
  expect(s.read()).toBe(null);
});
test("logout clears local identity when the server rejects an inactive account", async () => {
  const s = setup();
  s.api.mockResolvedValueOnce({
    token: "new-token",
    user: rider,
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  });
  await s.controller.signIn("/login", {});
  s.api.mockRejectedValueOnce({ status: 403, message: "Inactive" });
  await expect(s.controller.logout()).rejects.toMatchObject({ status: 403 });
  expect(s.controller.snapshot().user).toBe(null);
  expect(s.read()).toBe(null);
});
