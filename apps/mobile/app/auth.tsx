import React from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { PublicConfigDTO } from "@saathi/contracts";
import { api } from "../src/api";
import { useSession, useOnline } from "../src/providers";
import { AuthForm } from "../src/auth-form";
import { Page, Card, Copy } from "../src/ui";
export default function AuthScreen() {
  const { controller } = useSession();
  const online = useOnline();
  const config = useQuery({
    queryKey: ["config"],
    queryFn: () => api<PublicConfigDTO>("/config"),
  });
  return (
    <Page title="Sign in">
      <AuthForm
        online={online}
        submit={async (path, body) => {
          await controller.signIn(path, body);
          router.replace(
            controller.snapshot().user?.role === "driver"
              ? "/(tabs)/trips"
              : "/(tabs)",
          );
        }}
      />
      {config.data?.demo && (
        <Card>
          <Copy>Demo service</Copy>
          <Copy>Demo accounts use real bookings in a shared test area.</Copy>
          <Copy>passenger@saathi.test</Copy>
          <Copy>driver@saathi.test</Copy>
          <Copy>{config.data.demo.password}</Copy>
        </Card>
      )}
    </Page>
  );
}
