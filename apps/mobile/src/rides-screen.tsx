import React, { useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useIsFocused } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { BookingDTO, BookingPageDTO } from "@saathi/contracts";
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
export function RidesScreen() {
  const { user } = useSession();
  const focused = useIsFocused();
  const [history, setHistory] = useState(false);
  const bookings = useInfiniteQuery({
    queryKey: ["bookings", user?.id],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<BookingPageDTO>(`/bookings?page=${pageParam}&limit=30`),
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
    enabled: user?.role === "passenger",
    refetchInterval: focused ? 30000 : false,
  });
  if (!user)
    return (
      <Page title="My rides">
        <Card>
          <Copy>Sign in to book</Copy>
          <Button title="Sign in" onPress={() => router.push("/auth")} />
        </Card>
      </Page>
    );
  if (user.role !== "passenger") return <Redirect href="/(tabs)/trips" />;
  const all = bookings.data?.pages.flatMap((page) => page.bookings) ?? [];
  const visible = all.filter((b) =>
    history ? b.status !== "confirmed" : b.status === "confirmed",
  );
  return (
    <Page title="My rides">
      <Button
        secondary
        title={history ? "Upcoming" : "History"}
        onPress={() => setHistory(!history)}
      />
      <QueryState
        pending={bookings.isPending}
        error={bookings.error}
        empty={!visible.length}
        emptyText={history ? "No history yet" : "No bookings yet"}
        retry={() => void bookings.refetch()}
      />
      {visible.map((b) => (
        <Card key={b.id}>
          <RouteInfo departure={b.departure} />
          <Status value={b.status} />
          <Copy>{b.reference}</Copy>
          <Fare paise={b.totalPaise} />
          <Button
            secondary
            title="Booking details"
            onPress={() =>
              router.push({ pathname: "/booking/[id]", params: { id: b.id } })
            }
          />
        </Card>
      ))}
      {bookings.hasNextPage && (
        <Button
          title="Load more"
          busy={bookings.isFetchingNextPage}
          onPress={() => void bookings.fetchNextPage()}
        />
      )}
    </Page>
  );
}
export function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const online = useOnline();
  const { t } = useLanguage();
  const focused = useIsFocused();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const booking = useQuery({
    queryKey: ["booking", user?.id, id],
    queryFn: () => api<{ booking: BookingDTO }>(`/bookings/${id}`),
    enabled: user?.role === "passenger" && !!id,
    refetchInterval: focused ? 30000 : false,
  });
  const cancel = useMutation({
    mutationFn: () =>
      api<{ booking: BookingDTO }>(`/bookings/${id}/cancel`, {
        method: "POST",
        body: {},
      }),
    onSuccess: (result) => {
      qc.setQueryData(["booking", user?.id, id], result);
      qc.invalidateQueries({ queryKey: ["bookings", user?.id] });
      qc.invalidateQueries({ queryKey: ["departures"] });
      setConfirm(false);
    },
  });
  if (!user) return <Redirect href="/auth" />;
  if (user.role !== "passenger") return <Redirect href="/(tabs)/trips" />;
  const b = booking.data?.booking;
  const cancellable =
    b?.status === "confirmed" &&
    !b.cashCollected &&
    b.departure.status === "scheduled" &&
    Date.parse(b.departure.departureAt) > Date.now();
  return (
    <Page title="Booking details">
      <QueryState
        pending={booking.isPending}
        error={booking.error}
        retry={() => void booking.refetch()}
      />
      {b && (
        <Card>
          <RouteInfo departure={b.departure} />
          <Status value={b.status} />
          <Copy>Booking reference</Copy>
          <Copy>{b.reference}</Copy>
          <Copy>{`${b.seats} ${t(b.seats === 1 ? "Seat" : "Seats")}`}</Copy>
          <Fare paise={b.totalPaise} />
          <Copy>{b.contactPhone}</Copy>
          <Copy>
            {b.cashCollected ? "Collected" : "Pay the driver in cash"}
          </Copy>
          {b.departure.driverName && <Copy>{b.departure.driverName}</Copy>}
          {b.departure.vehicle && <Copy>{b.departure.vehicle}</Copy>}
          {b.departure.driverPhone && <Phone phone={b.departure.driverPhone} />}
          <ErrorMessage error={cancel.error} />
          {cancellable &&
            (confirm ? (
              <>
                <Copy>Cancellation returns your seats to the timetable.</Copy>
                <Button
                  title="Yes, cancel booking"
                  disabled={!online}
                  busy={cancel.isPending}
                  onPress={() => cancel.mutate()}
                />
                <Button
                  secondary
                  title="Keep booking"
                  disabled={cancel.isPending}
                  onPress={() => setConfirm(false)}
                />
              </>
            ) : (
              <Button
                secondary
                title="Cancel booking"
                disabled={!online}
                onPress={() => setConfirm(true)}
              />
            ))}
        </Card>
      )}
    </Page>
  );
}
