import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";
import { BookScreen } from "../src/book-screen";
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useIsFocused: () => true,
  Redirect: () => null,
}));
jest.mock("@react-native-community/datetimepicker", () => () => null);
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));
jest.mock("../src/providers", () => ({
  useSession: () => ({
    user: {
      id: "rider",
      name: "Rider",
      role: "passenger",
      phone: "9000000099",
    },
    controller: { snapshot: () => ({ user: { id: "rider" } }) },
  }),
  useOnline: () => true,
  useLanguage: () => require("../src/language").useLanguage(),
}));
jest.mock("../src/booking-storage", () => ({
  bookingIntents: { read: async () => null },
}));
jest.mock("../src/api", () => ({
  api: async (path: string) =>
    path === "/stops"
      ? {
          stops: [
            { id: "pickup", name: "Square" },
            { id: "destination", name: "Town" },
          ],
        }
      : path === "/routes"
        ? { routes: [{ fromStopId: "pickup", toStopId: "destination" }] }
        : { departures: [] },
}));
let client: QueryClient;
afterEach(() => client?.clear());
test("passenger screen uses native Text containers for every literal string", async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { toJSON, unmount } = render(
    <QueryClientProvider client={client}>
      <BookScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText("No rides found")).toBeTruthy());
  function inspect(node: any) {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(inspect);
      return;
    }
    for (const child of node.children ?? []) {
      if (typeof child === "string")
        expect(["Text", "RCTText", "RCTVirtualText"]).toContain(node.type);
      else inspect(child);
    }
  }
  inspect(toJSON());
  unmount();
  client.clear();
});
