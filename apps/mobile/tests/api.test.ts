jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: "localhost:8081" } },
}));
import { api, setToken, onUnauthorized } from "../src/api";
const response = (status: number, code = "UNAUTHENTICATED") =>
  ({
    ok: status === 200,
    status,
    json: async () =>
      status === 200 ? { ok: true } : { error: { code, message: "Expired" } },
  }) as Response;
afterEach(() => {
  setToken(null);
  onUnauthorized(() => {});
  jest.restoreAllMocks();
});
test("an old account response cannot sign out a newly authenticated account", async () => {
  let complete!: (response: Response) => void;
  const invalidated = jest.fn();
  onUnauthorized(invalidated);
  setToken("account-a");
  jest.spyOn(global, "fetch").mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const request = api("/me").catch((e) => e);
  await Promise.resolve();
  await Promise.resolve();
  setToken("account-b");
  complete(response(401));
  await request;
  expect(invalidated).not.toHaveBeenCalled();
});
test("inactive-account rejection clears credentials but an ordinary forbidden action does not", async () => {
  const invalidated = jest.fn();
  onUnauthorized(invalidated);
  setToken("driver");
  jest
    .spyOn(global, "fetch")
    .mockResolvedValueOnce(response(403, "FORBIDDEN"))
    .mockResolvedValueOnce(response(403, "ACCOUNT_INACTIVE"));
  await api("/bookings").catch(() => {});
  expect(invalidated).not.toHaveBeenCalled();
  await api("/me").catch(() => {});
  expect(invalidated).toHaveBeenCalledTimes(1);
});
