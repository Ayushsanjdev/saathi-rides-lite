import React from "react";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
jest.mock("../src/api", () => ({
  api: jest.fn(),
  setToken: jest.fn(),
  onUnauthorized: jest.fn(),
}));
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: (listener: (value: unknown) => void) => {
      listener({ isConnected: true, isInternetReachable: true });
      return () => {};
    },
  },
}));
import { Providers, useLanguage } from "../src/providers";
import { Button } from "../src/ui";
function LanguageProbe() {
  const { t, setLanguage } = useLanguage();
  return (
    <>
      <Text>{t("My rides")}</Text>
      <Button title="हिन्दी" onPress={() => setLanguage("hi")} />
    </>
  );
}
test("restores Hindi after the app is remounted", async () => {
  await AsyncStorage.clear();
  const first = render(
    <Providers>
      <LanguageProbe />
    </Providers>,
  );
  fireEvent.press(screen.getByRole("button", { name: "हिन्दी" }));
  await waitFor(() => expect(screen.getByText("मेरी सवारियाँ")).toBeTruthy());
  await waitFor(async () =>
    expect(await AsyncStorage.getItem("saathi-language")).toBe("hi"),
  );
  first.unmount();
  render(
    <Providers>
      <LanguageProbe />
    </Providers>,
  );
  await waitFor(() => expect(screen.getByText("मेरी सवारियाँ")).toBeTruthy());
});
