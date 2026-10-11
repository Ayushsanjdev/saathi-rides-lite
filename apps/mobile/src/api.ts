import Constants from "expo-constants";
import { createTransport, ApiError } from "@saathi/core";
const configured = process.env.EXPO_PUBLIC_API_URL;
const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "127.0.0.1";
export const baseUrl = configured ?? (__DEV__ ? `http://${host}:3000/api` : "");
let token: string | null = null;
let unauthorized: () => void = () => {};
export const setToken = (value: string | null) => {
  token = value;
};
export const onUnauthorized = (handler: () => void) => {
  unauthorized = handler;
};
export async function api<T>(
  path: string,
  options?: import("@saathi/core").RequestOptions,
): Promise<T> {
  if (!baseUrl || (!__DEV__ && !baseUrl.startsWith("https://")))
    throw new ApiError("Configure an HTTPS service URL for this build.", 0);
  const credential = ["/mobile/auth/login", "/mobile/auth/register"].includes(
    path,
  )
    ? null
    : token;
  const transport = createTransport({
    baseUrl,
    headers: async (): Promise<Record<string, string>> =>
      credential ? { Authorization: `Bearer ${credential}` } : {},
    onError: (error) => {
      if (
        credential &&
        credential === token &&
        (error.status === 401 ||
          (error.status === 403 && error.code === "ACCOUNT_INACTIVE"))
      )
        unauthorized();
    },
  });
  return transport<T>(path, options);
}
