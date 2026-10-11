import React, { useState } from "react";
import { View } from "react-native";
import type { DepartureDTO } from "@saathi/contracts";
import { Button, Copy, ErrorMessage, useUI } from "./ui";
import { useLanguage } from "./language";
export type TripAction = "accept" | "decline" | "start" | "complete";
const labels: Record<TripAction, string> = {
  accept: "Accept trip",
  decline: "Decline trip",
  start: "Start trip",
  complete: "Complete trip",
};
export function TripActions({
  trip,
  online,
  run,
}: {
  trip: DepartureDTO;
  online: boolean;
  run: (action: TripAction) => Promise<void>;
}) {
  const { colors, styles } = useUI();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<TripAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const actions: TripAction[] =
    trip.status === "scheduled"
      ? trip.assignment === "pending"
        ? ["accept", "decline"]
        : trip.assignment === "accepted"
          ? ["start"]
          : []
      : trip.status === "in-progress"
        ? ["complete"]
        : [];
  async function confirm() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await run(selected);
      setSelected(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e
          : new Error("The action could not be completed."),
      );
    } finally {
      setBusy(false);
    }
  }
  const early = new Date(trip.departureAt).getTime() - Date.now() > 15 * 60000;
  return (
    <View style={styles.stack}>
      {actions.map((action) => (
        <Button
          key={action}
          title={labels[action]}
          secondary={action === "decline"}
          disabled={!online || busy || (action === "start" && early)}
          onPress={() => {
            setSelected(action);
            setError(null);
          }}
        />
      ))}
      {actions.includes("start") && early && (
        <Copy muted>Trips can start 15 minutes before departure.</Copy>
      )}
      {selected && (
        <View style={[styles.stack, styles.line]}>
          <Copy>{labels[selected]}</Copy>
          <Copy muted>This action cannot be undone.</Copy>
          <ErrorMessage error={error} />
          <Button
            title={labels[selected]}
            label={`Confirm ${t(labels[selected])}`}
            disabled={!online}
            busy={busy}
            onPress={() => void confirm()}
          />
          <Button
            secondary
            title="Cancel"
            disabled={busy}
            onPress={() => setSelected(null)}
          />
        </View>
      )}
    </View>
  );
}
