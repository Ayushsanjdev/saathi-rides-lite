import React from "react";
import { Tabs } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type ColorValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession, useLanguage, useOnline } from "../../src/providers";
import { colors, styles } from "../../src/ui";
export default function TabLayout() {
  const { user, loading } = useSession();
  const { language, setLanguage, t } = useLanguage();
  const online = useOnline();
  const driver = user?.role === "driver";
  if (loading)
    return (
      <View style={[styles.page, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  const icon =
    (name: React.ComponentProps<typeof Ionicons>["name"]) =>
    ({ color, size }: { color: ColorValue; size: number }) => (
      <Ionicons name={name} color={color} size={size} />
    );
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        key={user?.id ?? "guest"}
        screenOptions={{
          headerTitle: () => <Text style={styles.brand}>saathi</Text>,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                language === "en" ? "Switch to Hindi" : "Switch to English"
              }
              onPress={() => setLanguage(language === "en" ? "hi" : "en")}
              style={{
                minHeight: 44,
                paddingHorizontal: 20,
                justifyContent: "center",
              }}
            >
              <Text style={styles.text}>
                {language === "en" ? "हिन्दी" : "English"}
              </Text>
            </Pressable>
          ),
          tabBarActiveTintColor: colors.green,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { backgroundColor: colors.card },
          tabBarLabelStyle: { fontSize: 12 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("Book a ride"),
            href: driver ? null : undefined,
            tabBarIcon: icon("bus-outline"),
          }}
        />
        <Tabs.Screen
          name="rides"
          options={{
            title: t("My rides"),
            href: driver ? null : undefined,
            tabBarIcon: icon("ticket-outline"),
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: t("Your trips"),
            href: driver ? undefined : null,
            tabBarIcon: icon("list-outline"),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t("History"),
            href: driver ? undefined : null,
            tabBarIcon: icon("time-outline"),
          }}
        />
        <Tabs.Screen
          name="help"
          options={{
            title: t("Help"),
            tabBarIcon: icon("help-circle-outline"),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{ title: t("Account"), tabBarIcon: icon("person-outline") }}
        />
      </Tabs>
      {!online && (
        <View accessibilityRole="alert" style={styles.banner}>
          <Text style={styles.muted}>
            {t("Check your connection and retry.")}{" "}
            {t("Booking is not confirmed until the service responds.")}
          </Text>
        </View>
      )}
    </View>
  );
}
