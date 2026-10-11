import React from "react";
import { useQuery } from "@tanstack/react-query";
import type { PublicConfigDTO } from "@saathi/contracts";
import { api } from "../../src/api";
import { Page, Card, Copy, Phone, QueryState } from "../../src/ui";
export default function Help() {
  const config = useQuery({
    queryKey: ["config"],
    queryFn: () => api<PublicConfigDTO>("/config"),
  });
  return (
    <Page title="Need a hand?">
      <QueryState
        pending={config.isPending}
        error={config.error}
        retry={() => void config.refetch()}
      />
      <Card>
        <Copy>Booking support</Copy>
        {config.data?.supportPhone ? (
          <>
            <Copy>{config.data.supportPhone}</Copy>
            <Phone title="Booking support" phone={config.data.supportPhone} />
          </>
        ) : (
          <Copy>
            Support number is not configured. Ask your local operator.
          </Copy>
        )}
      </Card>
      <Card>
        <Copy>Cancellation policy</Copy>
        <Copy muted>
          Cancel before the scheduled departure or trip start, whichever comes
          first.
        </Copy>
        <Copy>Cash payment</Copy>
        <Copy muted>Cash is paid directly to the driver.</Copy>
      </Card>
      <Card>
        <Copy>About this service</Copy>
        <Copy muted>Scheduled e-rickshaw rides from local pickup points.</Copy>
        <Copy muted>This service does not provide emergency transport.</Copy>
        {config.data?.demo && <Copy>No actual transport is dispatched.</Copy>}
      </Card>
    </Page>
  );
}
