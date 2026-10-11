export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export type RequestOptions = { method?: string; body?: unknown };
export function createTransport(config: {
  baseUrl: string;
  headers?: (method: string) => Promise<Record<string, string>>;
  fetch?: typeof fetch;
  credentials?: RequestCredentials;
  onResponse?: (path: string, json: any) => void;
  onError?: (error: ApiError) => void;
}) {
  return async function api<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const method = options.method ?? "GET";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const headers = (await config.headers?.(method)) ?? {};
      const response = await (config.fetch ?? fetch)(
        `${config.baseUrl.replace(/\/$/, "")}${path}`,
        {
          method,
          credentials: config.credentials ?? "omit",
          cache: "no-store",
          headers: {
            ...headers,
            ...(options.body !== undefined
              ? { "Content-Type": "application/json" }
              : {}),
          },
          body:
            options.body !== undefined
              ? JSON.stringify(options.body)
              : undefined,
          signal: controller.signal,
        },
      );
      const json = await response
        .json()
        .catch(() => ({
          error: { message: "The service is unavailable. Try again." },
        }));
      if (!response.ok)
        throw new ApiError(
          json.error?.message ?? "The request could not be completed.",
          response.status,
          json.error?.code,
        );
      config.onResponse?.(path, json);
      return json as T;
    } catch (error) {
      const failure =
        error instanceof ApiError
          ? error
          : new ApiError(
              "Connection interrupted. Check your network and try again.",
              0,
            );
      config.onError?.(failure);
      throw failure;
    } finally {
      clearTimeout(timer);
    }
  };
}
