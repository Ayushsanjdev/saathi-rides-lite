import React from "react";
import { ActivityIndicator, View } from "react-native";
import { colors, styles } from "./ui";
export function SessionGate({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return loading ? (
    <View style={[styles.page, { justifyContent: "center" }]}>
      <ActivityIndicator
        accessibilityLabel="Restoring your account"
        color={colors.green}
      />
    </View>
  ) : (
    <>{children}</>
  );
}
