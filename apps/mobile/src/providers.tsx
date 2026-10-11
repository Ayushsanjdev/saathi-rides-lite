import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { AppState } from "react-native";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { Language } from "@saathi/core";
import { LanguageContext } from "./language";
export { useLanguage } from "./language";
import { SessionController } from "./session-controller";
import { api, setToken, onUnauthorized } from "./api";
import { ThemeProvider } from "./theme";
const languageKey = "saathi-language";
const NetworkContext = createContext(true);
const SessionContext = createContext<SessionController | null>(null);
export const useOnline = () => useContext(NetworkContext);
export function useSession() {
  const controller = useContext(SessionContext);
  if (!controller) throw new Error("Session provider is missing");
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot);
  return { ...state, controller };
}
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 20000, retry: 1 },
          mutations: { retry: false },
        },
      }),
  );
  const [session] = useState(
    () =>
      new SessionController(
        {
          get: () => SecureStore.getItemAsync("saathi-session"),
          set: (value) =>
            SecureStore.setItemAsync("saathi-session", value, {
              keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            }),
          remove: () => SecureStore.deleteItemAsync("saathi-session"),
        },
        api,
        setToken,
      ),
  );
  const state = useSyncExternalStore(session.subscribe, session.snapshot);
  const [language, changeLanguage] = useState<Language>("en");
  const [online, setOnline] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem(languageKey)
      .then((value) => {
        if (value === "hi") changeLanguage("hi");
      })
      .catch(() => {});
  }, []);
  const setLanguage = (value: Language) => {
    changeLanguage(value);
    void AsyncStorage.setItem(languageKey, value).catch(() => {});
  };
  useEffect(() => {
    onUnauthorized(() => {
      void session.invalidate().catch(() => {});
    });
    void session.restore();
    return () => onUnauthorized(() => {});
  }, [session]);
  useEffect(() => {
    queryClient.clear();
  }, [queryClient, state.user?.id]);
  useEffect(() => {
    const appState = AppState.addEventListener("change", (value) => {
      focusManager.setFocused(value === "active");
    });
    focusManager.setFocused(AppState.currentState === "active");
    const unsubscribe = NetInfo.addEventListener((value) => {
      const connected =
        value.isConnected !== false && value.isInternetReachable !== false;
      setOnline(connected);
      onlineManager.setOnline(connected);
    });
    return () => {
      appState.remove();
      unsubscribe();
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={session}>
        <NetworkContext.Provider value={online}>
          <LanguageContext.Provider value={{ language, setLanguage }}>
            <ThemeProvider>{children}</ThemeProvider>
          </LanguageContext.Provider>
        </NetworkContext.Provider>
      </SessionContext.Provider>
    </QueryClientProvider>
  );
}
