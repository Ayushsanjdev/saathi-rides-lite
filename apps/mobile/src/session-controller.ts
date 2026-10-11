import type { UserDTO, NativeSessionDTO } from "@saathi/contracts";
import type { RequestOptions } from "@saathi/core";
type Store = {
  get: () => Promise<string | null>;
  set: (value: string) => Promise<void>;
  remove: () => Promise<void>;
};
type State = { user: UserDTO | null; loading: boolean; error: string | null };
export class SessionController {
  private state: State = { user: null, loading: true, error: null };
  private listeners = new Set<() => void>();
  private revision = 0;
  constructor(
    private store: Store,
    private api: <T>(path: string, options?: RequestOptions) => Promise<T>,
    private setToken: (token: string | null) => void,
  ) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(state: Partial<State>) {
    this.state = { ...this.state, ...state };
    this.listeners.forEach((l) => l());
  }
  async invalidate() {
    this.revision++;
    this.setToken(null);
    this.update({ user: null, loading: false, error: null });
    await this.store.remove();
  }
  async restore() {
    const revision = ++this.revision;
    let saved: NativeSessionDTO | undefined;
    try {
      const raw = await this.store.get();
      if (revision !== this.revision) return;
      if (!raw) {
        this.update({ loading: false });
        return;
      }
      saved = JSON.parse(raw);
      if (
        !saved?.token ||
        !saved.user?.id ||
        !["passenger", "driver"].includes(saved.user.role) ||
        !Number.isFinite(Date.parse(saved.expiresAt)) ||
        Date.parse(saved.expiresAt) <= Date.now()
      ) {
        await this.invalidate();
        return;
      }
      this.setToken(saved.token);
      const { user } = await this.api<{ user: UserDTO }>("/me");
      if (revision !== this.revision) return;
      await this.store.set(JSON.stringify({ ...saved, user }));
      this.update({ user, loading: false, error: null });
    } catch (error) {
      if (revision !== this.revision) return;
      const failure = error as { status?: number; message?: string };
      if (failure.status === 0 && saved)
        this.update({
          user: saved.user,
          loading: false,
          error: failure.message ?? "Check your connection and retry.",
        });
      else if (failure.status === 401 || failure.status === 403 || !saved)
        await this.invalidate();
      else
        this.update({
          user: saved.user,
          loading: false,
          error: failure.message ?? "The service is unavailable. Try again.",
        });
    }
  }
  async signIn(path: "/login" | "/register", body: unknown) {
    const revision = ++this.revision;
    const session = await this.api<NativeSessionDTO>(`/mobile/auth${path}`, {
      method: "POST",
      body,
    });
    if (session.user.role === "operator")
      throw new Error("Use the web app for operator administration.");
    if (revision !== this.revision) return;
    await this.store.set(JSON.stringify(session));
    this.setToken(session.token);
    this.update({ user: session.user, loading: false, error: null });
  }
  async logout() {
    try {
      await this.api("/mobile/auth/logout", { method: "POST", body: {} });
    } finally {
      await this.invalidate();
    }
  }
}
