import { createTransport, ApiError } from "@saathi/core";
let csrfToken: string | null = null;
export {
  ApiError,
  money,
  time,
  date,
  localDate,
  localDateTime,
} from "@saathi/core";
export const api = createTransport({
  baseUrl: "/api",
  credentials: "same-origin",
  headers: async (method): Promise<Record<string, string>> => {
    if (method === "GET") return {};
    if (!csrfToken) {
      const response = await fetch("/api/auth/csrf", {
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new ApiError(
          "The service is unavailable. Try again.",
          response.status,
        );
      csrfToken = (await response.json()).csrfToken;
    }
    return { "X-CSRF-Token": csrfToken || "" };
  },
  onResponse: (path, json) => {
    if (json.csrfToken) csrfToken = json.csrfToken;
    if (path === "/auth/logout") csrfToken = null;
  },
  onError: (error) => {
    if (error.code === "CSRF") csrfToken = null;
  },
});
