import React from "react";
import { Redirect, router } from "expo-router";
import { useIsFocused } from "expo-router";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { DeparturePageDTO, DriverOverviewDTO } from "@saathi/contracts";
import { api } from "./api";
import { useSession, useOnline, useLanguage } from "./providers";
import { TripActions } from "./trip-actions";
import { Page, Card, Copy, Button, Fare, RouteInfo, QueryState } from "./ui";
export function TripsScreen({ history }: { history: boolean }) {
  const { user } = useSession();
  const online = useOnline();
  const { t } = useLanguage();
  const focused = useIsFocused();
  const qc = useQueryClient();
  const trips = useInfiniteQuery({
    queryKey: ["driver-trips", user?.id, history],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<DeparturePageDTO>(
        `/driver/trips?history=${history}&page=${pageParam}&limit=30`,
      ),
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
    enabled: user?.role === "driver",
    refetchInterval: focused ? 15000 : false,
  });
  const overview = useQuery({
    queryKey: ["driver", user?.id],
    queryFn: () => api<DriverOverviewDTO>("/driver/overview"),
    enabled: user?.role === "driver",
    refetchInterval: focused ? 15000 : false,
  });
  if (!user) return <Redirect href="/auth" />;
  if (user.role !== "driver") return <Redirect href="/(tabs)" />;
  const list = trips.data?.pages.flatMap((p) => p.departures) ?? [];
  return (
    <Page
      title={history ? "History" : "Your trips"}
      subtitle="Today’s work, in one place."
    >
      <QueryState
        pending={overview.isPending}
        error={overview.error}
        retry={() => void overview.refetch()}
      />
      {overview.data && (
        <Card>
          <Copy>Cash collected</Copy>
          <Fare paise={overview.data.collectedPaise} />
          <Copy>{`${overview.data.completedTrips} ${t("Completed trips")}`}</Copy>
        </Card>
      )}
      <QueryState
        pending={trips.isPending}
        error={trips.error}
        empty={!list.length}
        emptyText={history ? "No history yet" : "No assigned trips"}
        retry={() => void trips.refetch()}
      />
      {list.map((trip) => (
        <Card key={trip.id}>
          <RouteInfo departure={trip} />
          <Copy>{`${trip.bookedSeats} ${t("Seats reserved")}`}</Copy>
          {trip.vehicle && <Copy>{trip.vehicle}</Copy>}
          {trip.assignment !== "declined" && (
            <Button
              secondary
              title="Passenger list"
              onPress={() =>
                router.push({
                  pathname: "/manifest/[id]",
                  params: { id: trip.id },
                })
              }
            />
          )}
          <TripActions
            trip={trip}
            online={online}
            run={async (action) => {
              await api(`/driver/trips/${trip.id}/${action}`, {
                method: "POST",
                body: {},
              });
              await Promise.all([
                qc.invalidateQueries({ queryKey: ["driver-trips", user.id] }),
                qc.invalidateQueries({ queryKey: ["driver", user.id] }),
                qc.invalidateQueries({
                  queryKey: ["manifest", user.id, trip.id],
                }),
              ]);
            }}
          />
        </Card>
      ))}
      {trips.hasNextPage && (
        <Button
          title="Load more"
          busy={trips.isFetchingNextPage}
          onPress={() => void trips.fetchNextPage()}
        />
      )}
    </Page>
  );
}
