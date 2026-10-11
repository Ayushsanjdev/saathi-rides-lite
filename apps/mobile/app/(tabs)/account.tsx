import React, { useState } from "react";
import { router } from "expo-router";
import { useSession, useLanguage, useOnline } from "../../src/providers";
import { Page, Card, Copy, Button, ErrorMessage } from "../../src/ui";
export default function Account() {
  const { user, error, controller } = useSession();
  const online = useOnline();
  const { language, setLanguage } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Error | null>(null);
  async function logout() {
    setBusy(true);
    try {
      await controller.logout();
      router.replace("/(tabs)");
    } catch (e) {
      setFailure(e instanceof Error ? e : new Error("Sign out failed. Retry."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="Your account">
      {user ? (
        <Card>
          <Copy>{user.name}</Copy>
          <Copy>{user.email}</Copy>
          <Copy>{user.role === "driver" ? "Driver" : "Passenger"}</Copy>
          <ErrorMessage error={failure ?? error} />
          <Button
            title="Sign out"
            onPress={() => void logout()}
            busy={busy}
            disabled={!online}
          />
        </Card>
      ) : (
        <Card>
          <Copy>Sign in to book</Copy>
          <Button title="Sign in" onPress={() => router.push("/auth")} />
        </Card>
      )}
      <Card>
        <Button
          secondary
          title={language === "en" ? "हिन्दी" : "English"}
          onPress={() => setLanguage(language === "en" ? "hi" : "en")}
        />
      </Card>
    </Page>
  );
}
