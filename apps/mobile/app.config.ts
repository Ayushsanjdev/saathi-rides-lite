import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "Saathi Rides",
  slug: "saathi-rides",
  version: "1.0.0",
  scheme: "saathi",
  platforms: ["android", "ios"],
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  ios: { bundleIdentifier: "com.saathirides.mobile", supportsTablet: true },
  android: {
    package: "com.saathirides.mobile",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#163b53",
    },
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-status-bar",
    "@react-native-community/datetimepicker",
    ["expo-build-properties", { ios: { enableSceneSupport: true } }],
    [
      "expo-splash-screen",
      {
        image: "./assets/splash.png",
        imageWidth: 160,
        backgroundColor: "#f5f8fa",
      },
    ],
  ],
  extra: {
    ...(process.env.EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
      : {}),
  },
};
export default config;
