import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Redirect, router } from "expo-router";
import { useIsFocused } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localDate } from "@saathi/core";
import type {
  BookingDTO,
  DepartureDTO,
  RouteDTO,
  StopDTO,
} from "@saathi/contracts";
import { api } from "./api";
import { useSession, useOnline, useLanguage } from "./providers";
import { bookingIntents } from "./booking-storage";
import type { BookingIntent } from "./booking-intent";
import { BookingReview } from "./booking-review";
import { Picker } from "./picker";
import { Page, Card, Copy, Button, Field, ErrorMessage, Fare, RouteInfo, QueryState, useUI } from "./ui";
export function BookScreen() {
  const { colors, styles, scheme } = useUI();
  const { user, controller } = useSession();
  const online = useOnline();
  const { t } = useLanguage();
  const focused = useIsFocused();
  const qc = useQueryClient();
  const [storageAttempt, setStorageAttempt] = useState(0);
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState(localDate());
  const [showDate, setShowDate] = useState(false);
  const [seats, setSeats] = useState(1);
  const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState<DepartureDTO | null>(null);
  const [pending, setPending] = useState<BookingIntent | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    setReady(false);
    setPending(null);
    setSelected(null);
    setPhone(user?.phone ?? "");
    setError(null);
    if (!user) {
      setReady(true);
      return;
    }
    bookingIntents
      .read(user.id)
      .then((value) => {
        if (active) {
          setPending(value);
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, [user?.id, storageAttempt]);
  const stops = useQuery({
    queryKey: ["stops"],
    queryFn: () => api<{ stops: StopDTO[] }>("/stops"),
  });
  const routes = useQuery({
    queryKey: ["routes"],
    queryFn: () => api<{ routes: RouteDTO[] }>("/routes"),
  });
  const from = pickup || routes.data?.routes[0]?.fromStopId || "";
  const matching =
    routes.data?.routes.filter((r) => r.fromStopId === from) ?? [];
  const to = matching.some((r) => r.toStopId === destination)
    ? destination
    : (matching[0]?.toStopId ?? "");
  const departures = useQuery({
    queryKey: ["departures", from, to, travelDate],
    queryFn: () =>
      api<{ departures: DepartureDTO[] }>(
        `/departures?${new URLSearchParams({ from, to, date: travelDate })}`,
      ),
    enabled: !!from && !!to,
    refetchInterval: focused ? 30000 : false,
  });
  const draft =
    pending ??
    (selected
      ? {
          departure: selected,
          body: {
            departureId: selected.id,
            seats,
            contactPhone: phone,
            idempotencyKey: "unsubmitted-review",
          },
        }
      : null);
  async function submit() {
    if (!user || !draft || !ready) throw new Error("Sign in to continue.");
    const owner = user.id;
    const intent =
      pending ??
      (await bookingIntents.create(
        owner,
        draft.departure,
        draft.body.seats,
        draft.body.contactPhone,
      ));
    setPending(intent);
    const result = await api<{ booking: BookingDTO }>("/bookings", {
      method: "POST",
      body: intent.body,
    });
    await bookingIntents.clear(owner);
    if (controller.snapshot().user?.id !== owner) return;
    setPending(null);
    setSelected(null);
    qc.invalidateQueries({ queryKey: ["departures"] });
    qc.invalidateQueries({ queryKey: ["bookings", owner] });
    router.push({
      pathname: "/booking/[id]",
      params: { id: result.booking.id },
    });
  }
  if (user?.role === "driver") return <Redirect href="/(tabs)/trips" />;
  return (
    <Page
      title="Where are you headed?"
      subtitle="Shared rides. Familiar routes. Fair fares."
    >
      <ErrorMessage error={error} />
      {error && !ready && (
        <Button title="Retry" onPress={() => setStorageAttempt((n) => n + 1)} />
      )}
      {pending && (
        <Copy>Booking is not confirmed until the service responds.</Copy>
      )}
      {draft ? (
        <BookingReview
          intent={draft}
          online={online}
          canDiscard={!pending}
          submit={submit}
          onDiscard={async () => {
            if (user) await bookingIntents.clear(user.id);
            setPending(null);
            setSelected(null);
          }}
        />
      ) : (
        <>
          <Card>
            <QueryState
              pending={routes.isPending || stops.isPending}
              error={routes.error ?? stops.error}
              retry={() => {
                void routes.refetch();
                void stops.refetch();
              }}
            />
            <Picker
              label="Pickup point"
              value={from}
              options={(stops.data?.stops ?? [])
                .filter((s) =>
                  routes.data?.routes.some((r) => r.fromStopId === s.id),
                )
                .map((s) => ({ id: s.id, label: s.name }))}
              onChange={(value) => {
                setPickup(value);
                setDestination("");
              }}
            />
            <Picker
              label="Destination"
              value={to}
              options={(stops.data?.stops ?? [])
                .filter((s) => matching.some((r) => r.toStopId === s.id))
                .map((s) => ({ id: s.id, label: s.name }))}
              onChange={setDestination}
            />
            <Copy>Departure date</Copy>
            <Button
              secondary
              title={travelDate}
              onPress={() => setShowDate(!showDate)}
            />
            {showDate && (
              <DateTimePicker
                themeVariant={scheme}
                value={new Date(`${travelDate}T12:00:00`)}
                mode="date"
                minimumDate={new Date(`${localDate()}T00:00:00`)}
                onChange={(event, value) => {
                  if (Platform.OS === "android") setShowDate(false);
                  if (event.type !== "dismissed" && value)
                    setTravelDate(
                      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`,
                    );
                }}
              />
            )}
            <Copy>Passengers</Copy>
            <View style={styles.row}>
              <Button
                secondary
                title="−"
                label="Remove passenger"
                disabled={seats <= 1}
                onPress={() => setSeats(seats - 1)}
              />
              <Copy>{String(seats)}</Copy>
              <Button
                secondary
                title="+"
                label="Add passenger"
                disabled={seats >= 4}
                onPress={() => setSeats(seats + 1)}
              />
            </View>
            {user && (
              <Field
                label="Mobile number"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
              />
            )}
          </Card>
          <QueryState
            pending={departures.isPending && !!from && !!to}
            error={departures.error}
            empty={!departures.isPending && !departures.data?.departures.length}
            retry={() => void departures.refetch()}
          />
          {departures.data?.departures.map((d) => (
            <Card key={d.id}>
              <RouteInfo departure={d} />
              <View style={styles.row}>
                <Fare paise={d.farePaise * seats} />
                <Copy>{`${d.availableSeats} ${t(d.availableSeats === 1 ? "seat left" : "seats left")}`}</Copy>
              </View>
              <Copy muted>Pay the driver in cash</Copy>
              <Button
                title={user ? "Review booking" : "Sign in to book"}
                disabled={
                  !online ||
                  !ready ||
                  d.availableSeats < seats ||
                  (!!user && !/^[6-9]\d{9}$/.test(phone))
                }
                onPress={() => (user ? setSelected(d) : router.push("/auth"))}
              />
            </Card>
          ))}
          <Card>
            <Copy>Meet at the pickup point</Copy>
            <Copy muted>Arrive five minutes before departure.</Copy>
            <Copy muted>Seat availability may change before confirmation.</Copy>
          </Card>
        </>
      )}
    </Page>
  );
}
