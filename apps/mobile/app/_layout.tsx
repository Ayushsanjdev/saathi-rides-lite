import React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SessionGate } from "../src/session-gate";
import { Providers, useSession } from "../src/providers";
import { colors } from "../src/ui";
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Providers>
        <Navigation />
      </Providers>
    </SafeAreaProvider>
  );
}
function Navigation() {
  const { loading } = useSession();
  return (
    <SessionGate loading={loading}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth"
          options={{ title: "Saathi", presentation: "modal" }}
        />
        <Stack.Screen name="booking/[id]" options={{ title: "Saathi" }} />
        <Stack.Screen name="manifest/[id]" options={{ title: "Saathi" }} />
      </Stack>
    </SessionGate>
  );
}
