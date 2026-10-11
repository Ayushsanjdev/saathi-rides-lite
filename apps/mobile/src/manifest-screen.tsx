import React, { useState } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useIsFocused } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ManifestDTO } from "@saathi/contracts";
import { api } from "./api";
import { useSession, useOnline, useLanguage } from "./providers";
import {
  Page,
  Card,
  Copy,
  Button,
  ErrorMessage,
  Fare,
  Phone,
  RouteInfo,
  Status,
  QueryState,
} from "./ui";
export function ManifestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const online = useOnline();
  const { t } = useLanguage();
  const focused = useIsFocused();
  const qc = useQueryClient();
  const [choice, setChoice] = useState<{
    id: string;
    action: "collect" | "no-show";
  } | null>(null);
  const manifest = useQuery({
    queryKey: ["manifest", user?.id, id],
    queryFn: () => api<ManifestDTO>(`/driver/trips/${id}/manifest`),
    enabled: user?.role === "driver" && !!id,
    refetchInterval: focused ? 15000 : false,
  });
  const mutate = useMutation({
    mutationFn: (input: NonNullable<typeof choice>) =>
      api(`/driver/bookings/${input.id}/${input.action}`, {
        method: "POST",
        body: {},
      }),
    onSuccess: () => {
      setChoice(null);
      qc.invalidateQueries({ queryKey: ["manifest", user?.id, id] });
      qc.invalidateQueries({ queryKey: ["driver", user?.id] });
      qc.invalidateQueries({ queryKey: ["driver-trips", user?.id] });
    },
  });
  if (!user) return <Redirect href="/auth" />;
  if (user.role !== "driver") return <Redirect href="/(tabs)" />;
  const trip = manifest.data?.departure;
  return (
    <Page title="Passenger list">
      <QueryState
        pending={manifest.isPending}
        error={manifest.error}
        empty={!!manifest.data && !manifest.data.bookings.length}
        emptyText="No passengers booked"
        retry={() => void manifest.refetch()}
      />
      {trip && (
        <Card>
          <RouteInfo departure={trip} />
        </Card>
      )}
      {manifest.data?.bookings.map((b) => (
        <Card key={b.id}>
          <Copy>{b.passengerName}</Copy>
          <Copy>{b.reference}</Copy>
          <Copy>{`${b.seats} ${t("Seats")}`}</Copy>
          <Fare paise={b.totalPaise} />
          <Status value={b.status} />
          <Phone phone={b.contactPhone} title={b.contactPhone} />
          {b.cashCollected ? (
            <Copy>Collected</Copy>
          ) : (
            b.status !== "no-show" && (
              <>
                {(trip?.status === "in-progress" ||
                  trip?.status === "completed") && (
                  <Button
                    secondary
                    title="Record cash"
                    disabled={!online || mutate.isPending}
                    onPress={() => {
                      mutate.reset();
                      setChoice({ id: b.id, action: "collect" });
                    }}
                  />
                )}
                {trip?.status === "in-progress" && (
                  <Button
                    secondary
                    title="Mark no show"
                    disabled={!online || mutate.isPending}
                    onPress={() => {
                      mutate.reset();
                      setChoice({ id: b.id, action: "no-show" });
                    }}
                  />
                )}
                {choice?.id === b.id && (
                  <>
                    <Copy>
                      {choice.action === "collect"
                        ? "Record cash"
                        : "Confirm no show"}
                    </Copy>
                    <ErrorMessage error={mutate.error} />
                    <Button
                      title={
                        choice.action === "collect"
                          ? "Confirm cash collection"
                          : "Confirm no show"
                      }
                      disabled={!online}
                      busy={mutate.isPending}
                      onPress={() => mutate.mutate(choice)}
                    />
                    <Button
                      secondary
                      title="Cancel"
                      disabled={mutate.isPending}
                      onPress={() => setChoice(null)}
                    />
                  </>
                )}
              </>
            )
          )}
        </Card>
      ))}
    </Page>
  );
}
