"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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
  const u = (root.user ?? root) as Record<string, unknown>;

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
    role: (u.role as string) ?? (u.roleName as string) ?? undefined,
    avatarUrl: (u.avatarUrl as string) ?? (u.avatar as string) ?? undefined,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <SessionContext.Provider value={{ user, loading, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}
