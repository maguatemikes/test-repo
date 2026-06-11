"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export interface CurrentUser {
  name: string;
  email: string;
  role?: string;
  avatarUrl?: string;
}

interface SessionContextValue {
  user: CurrentUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function useCurrentUser() {
  return useContext(SessionContext);
}

/**
 * Normalizes whatever shape /api/me returns into a CurrentUser. Tolerant of
 * field-name differences (name/displayName, avatar/avatarUrl, role/roleName)
 * since the backend contract isn't finalized.
 */
function normalize(payload: unknown): CurrentUser | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  // /api/me returns { ok, user: { user: {email, displayName}, org, role } } — the
  // user fields are nested one level below role/org. Dig in, but stay tolerant of a
  // flat shape too (wrapper.user ?? wrapper).
  const wrapper = (root.user ?? root) as Record<string, unknown>;
  const u = (wrapper.user ?? wrapper) as Record<string, unknown>;

  const name =
    (u.name as string) ??
    (u.displayName as string) ??
    (u.fullName as string) ??
    "";
  const email = (u.email as string) ?? "";
  if (!name && !email) return null;

  return {
    name: name || email,
    email,
    role: (wrapper.role as string) ?? (u.role as string) ?? (u.roleName as string) ?? undefined,
    avatarUrl: (u.avatarUrl as string) ?? (u.avatar as string) ?? undefined,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json().catch(() => null);
        setUser(normalize(data));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Route guard: once the session check resolves, send anonymous users to
  // /login. Only mounted on dashboard routes (see AppShell standalone check),
  // so it never fires on a public/auth page and cannot loop.
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Don't render protected content once we know there's no session — the
  // effect above is redirecting.
  if (!loading && !user) return null;

  return (
    <SessionContext.Provider value={{ user, loading, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}
