import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { AuthForm } from "../src/auth-form";
import { BookingReview } from "../src/booking-review";
import { TripActions } from "../src/trip-actions";
import type { DepartureDTO } from "@saathi/contracts";
const trip: DepartureDTO = {
  id: "a".repeat(24),
  routeId: "b".repeat(24),
  pickup: "Square",
  destination: "Town",
  farePaise: 2500,
  departureAt: new Date(Date.now() + 600000).toISOString(),
  endAt: new Date(Date.now() + 2400000).toISOString(),
  capacity: 4,
  availableSeats: 4,
  status: "scheduled",
  assignment: "accepted",
  bookedSeats: 0,
};
test("shows invalid login fields and prevents signing in while offline", () => {
  const submit = jest.fn();
  render(<AuthForm online={false} submit={submit} />);
  fireEvent.changeText(screen.getByLabelText("Email"), "rider@saathi.test");
  fireEvent.changeText(screen.getByLabelText("Password"), "Password123!");
  expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  expect(screen.getByText("Check your connection and retry.")).toBeTruthy();
});
test("renders server login errors beside the form", async () => {
  render(
    <AuthForm
      online
      submit={async () => {
        throw new Error("Email or password is incorrect.");
      }}
    />,
  );
  fireEvent.changeText(screen.getByLabelText("Email"), "rider@saathi.test");
  fireEvent.changeText(screen.getByLabelText("Password"), "Password123!");
  fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() =>
    expect(screen.getByText("Email or password is incorrect.")).toBeTruthy(),
  );
});
test("keeps booking unconfirmed when retry fails and disables offline confirmation", async () => {
  const intent = {
    departure: trip,
    body: {
      departureId: trip.id,
      seats: 2,
      contactPhone: "9000000099",
      idempotencyKey: "retry-key",
    },
  };
  const { rerender } = render(
    <BookingReview
      intent={intent}
      online
      submit={async () => {
        throw new Error("No seats left");
      }}
    />,
  );
  fireEvent.press(screen.getByRole("button", { name: "Confirm booking" }));
  await waitFor(() => expect(screen.getByText("No seats left")).toBeTruthy());
  expect(screen.queryByText("Booking confirmed")).toBe(null);
  rerender(
    <BookingReview intent={intent} online={false} submit={async () => {}} />,
  );
  expect(
    screen.getByRole("button", { name: "Confirm booking" }),
  ).toBeDisabled();
});
test("requires confirmation before starting a driver trip and displays server rejection", async () => {
  render(
    <TripActions
      trip={trip}
      online
      run={async () => {
        throw new Error("Another trip is already active.");
      }}
    />,
  );
  fireEvent.press(screen.getByRole("button", { name: "Start trip" }));
  expect(screen.getByText("This action cannot be undone.")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Confirm Start trip" }));
  await waitFor(() =>
    expect(screen.getByText("Another trip is already active.")).toBeTruthy(),
  );
});

test("Hindi controls preserve their meaning when language changes", () => {
  const { LanguageContext } = require("../src/language");
  render(
    <LanguageContext.Provider value={{ language: "hi", setLanguage: () => {} }}>
      <AuthForm online submit={async () => {}} />
    </LanguageContext.Provider>,
  );
  expect(screen.getByRole("button", { name: "लॉग इन" })).toBeTruthy();
  expect(screen.getByLabelText("ईमेल")).toBeTruthy();
});
