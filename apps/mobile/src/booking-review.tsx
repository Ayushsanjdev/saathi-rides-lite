import React, { useState } from "react";
import { View } from "react-native";
import { ApiError } from "@saathi/core";
import type { BookingIntent } from "./booking-intent";
import {
  Button,
  Card,
  Copy,
  ErrorMessage,
  Fare,
  RouteInfo,
  styles,
} from "./ui";
export function BookingReview({
  intent,
  online,
  submit,
  onDiscard,
  canDiscard = false,
}: {
  intent: BookingIntent;
  online: boolean;
  submit: () => Promise<void>;
  canDiscard?: boolean;
  onDiscard?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await submit();
    } catch (e) {
      setError(
        e instanceof Error
          ? e
          : new Error("The booking could not be completed."),
      );
    } finally {
      setBusy(false);
    }
  }
  const rejected =
    error instanceof ApiError && [400, 404, 409].includes(error.status);
  return (
    <Card>
      <Copy>Review booking</Copy>
      <RouteInfo departure={intent.departure} />
      <View style={styles.row}>
        <Copy>Passengers</Copy>
        <Copy>{String(intent.body.seats)}</Copy>
      </View>
      <Copy>{intent.body.contactPhone}</Copy>
      <Fare paise={intent.departure.farePaise * intent.body.seats} />
      <Copy>Pay the driver in cash</Copy>
      <Copy muted>Booking is not confirmed until the service responds.</Copy>
      <ErrorMessage error={error} />
      <Button
        title="Confirm booking"
        disabled={!online}
        busy={busy}
        onPress={() => void confirm()}
      />
      {(rejected || canDiscard) && onDiscard && (
        <Button
          secondary
          title="Choose your ride"
          disabled={busy}
          onPress={() => void onDiscard().catch(setError)}
        />
      )}
    </Card>
  );
}
