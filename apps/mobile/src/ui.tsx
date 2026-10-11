import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { date, time, money } from "@saathi/core";
import type { DepartureDTO } from "@saathi/contracts";
import { useLanguage } from "./language";
export const colors = {
  ink: "#163b53",
  green: "#176b50",
  background: "#f5f8fa",
  card: "#ffffff",
  muted: "#5f7281",
  border: "#dce5eb",
  red: "#b42318",
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 18, paddingBottom: 36 },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.7,
  },
  heading: { fontSize: 20, fontWeight: "700", color: colors.ink },
  text: { fontSize: 16, lineHeight: 24, color: colors.ink },
  muted: { fontSize: 14, lineHeight: 21, color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stack: { gap: 12 },
  line: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 },
  error: { color: colors.red, fontSize: 15, lineHeight: 22 },
  banner: { padding: 14, backgroundColor: "#fff3cd", borderRadius: 10 },
  price: { fontSize: 25, fontWeight: "700", color: colors.green },
  button: {
    minHeight: 48,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: { fontSize: 16, fontWeight: "600", color: colors.card },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.card,
    color: colors.ink,
    fontSize: 16,
  },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#e7f2eb",
  },
  route: {
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    paddingLeft: 13,
    gap: 9,
  },
  brand: {
    fontWeight: "800",
    fontSize: 23,
    letterSpacing: -1,
    color: colors.ink,
  },
  disabled: { opacity: 0.45 },
});
export function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
      >
        <Text accessibilityRole="header" style={styles.title}>
          {t(title)}
        </Text>
        {subtitle && <Text style={styles.muted}>{t(subtitle)}</Text>}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Copy({
  children,
  muted = false,
}: {
  children: string;
  muted?: boolean;
}) {
  const { t } = useLanguage();
  return <Text style={muted ? styles.muted : styles.text}>{t(children)}</Text>;
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function Button({
  title,
  onPress,
  disabled = false,
  busy = false,
  secondary = false,
  label,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  secondary?: boolean;
  label?: string;
}) {
  const { t } = useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? t(title)}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (disabled || busy) && styles.disabled,
        pressed && { opacity: 0.75 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.green : "white"} />
      ) : (
        <Text style={[styles.buttonText, secondary && { color: colors.ink }]}>
          {t(title)}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { t } = useLanguage();
  return (
    <View style={{ gap: 7 }}>
      <Copy>{label}</Copy>
      <TextInput
        {...props}
        accessibilityLabel={t(label)}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
  );
}
export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {error instanceof Error ? error.message : String(error)}
    </Text>
  );
}
export function QueryState({
  pending,
  error,
  empty,
  retry,
  emptyText = "No rides found",
}: {
  pending: boolean;
  error: unknown;
  empty?: boolean;
  retry: () => void;
  emptyText?: string;
}) {
  return pending ? (
    <ActivityIndicator
      color={colors.green}
      accessibilityLabel="Loading rides"
    />
  ) : error ? (
    <Card>
      <ErrorMessage error={error} />
      <Button title="Retry" onPress={retry} />
    </Card>
  ) : empty ? (
    <Card>
      <Copy>{emptyText}</Copy>
    </Card>
  ) : null;
}
export function Status({ value }: { value: string }) {
  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    "in-progress": "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
    confirmed: "Confirmed",
    "passenger-cancelled": "Cancelled",
    "departure-cancelled": "Cancelled",
    "no-show": "No show",
    pending: "Pending",
    accepted: "Accepted",
    declined: "Declined",
    unassigned: "Unassigned",
  };
  const bad = value.includes("cancel") || value === "declined";
  const pending = value === "pending" || value === "unassigned";
  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: bad
            ? "#fde8e7"
            : pending
              ? "#fff3cd"
              : value === "in-progress"
                ? "#e8f1ff"
                : "#e7f2eb",
        },
      ]}
    >
      <Copy>{labels[value] ?? value}</Copy>
    </View>
  );
}
export function RouteInfo({ departure }: { departure: DepartureDTO }) {
  const { t } = useLanguage();
  return (
    <>
      <View style={styles.row}>
        <Text style={styles.heading}>{time(departure.departureAt)}</Text>
        <Status
          value={
            departure.status === "scheduled"
              ? departure.assignment
              : departure.status
          }
        />
      </View>
      <View style={styles.route}>
        <Copy>{departure.pickup}</Copy>
        <Copy>{departure.destination}</Copy>
      </View>
      <Copy muted>{date(departure.departureAt)}</Copy>
    </>
  );
}
export function Fare({ paise }: { paise: number }) {
  return <Text style={styles.price}>{money(paise)}</Text>;
}
export function Phone({
  phone,
  title = "Call driver",
}: {
  phone: string;
  title?: string;
}) {
  const [error, setError] = React.useState<Error | null>(null);
  return (
    <>
      <Button
        secondary
        title={title}
        onPress={() => {
          void Linking.openURL(`tel:${phone}`).catch(() =>
            setError(new Error("Unable to open the phone app.")),
          );
        }}
      />
      <ErrorMessage error={error} />
    </>
  );
}
