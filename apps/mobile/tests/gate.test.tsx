import React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { SessionGate } from "../src/session-gate";
test("does not mount a detail route until session restoration has finished", () => {
  const { rerender } = render(
    <SessionGate loading>
      <Text>Booking details</Text>
    </SessionGate>,
  );
  expect(screen.queryByText("Booking details")).toBe(null);
  expect(screen.getByLabelText("Restoring your account")).toBeTruthy();
  rerender(
    <SessionGate loading={false}>
      <Text>Booking details</Text>
    </SessionGate>,
  );
  expect(screen.getByText("Booking details")).toBeTruthy();
});
