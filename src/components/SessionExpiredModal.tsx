"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthError } from "@/components/pages-components/AuthLayout";
import {
  SESSION_EXPIRED_EVENT,
  installSessionExpiryInterceptor,
  getLastEmail,
} from "@/lib/sessionExpiry";

/**
 * Global modal (#60). Shown when any data request returns 401 — e.g. the user
 * was idle past the session lifetime. Offers inline re-login so they keep their
 * current page state; on success the modal closes without navigating.
 */
export function SessionExpiredModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    installSessionExpiryInterceptor();
    const onExpired = () => {
      setEmail((prev) => prev || getLastEmail());
      setError(null);
      setPassword("");
      setOpen(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;
      if (res.ok && data?.ok) {
        // Dismiss without navigation; refresh data on the current route.
        setOpen(false);
        router.refresh();
        return;
      }
      setError(data?.error ?? "Incorrect email or password.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-foreground">
          Your session expired
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Sign in again to pick up where you left off.
        </p>

        {error && <AuthError>{error}</AuthError>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="se-email">Email</Label>
            <Input
              id="se-email"
              type="email"
              autoComplete="email"
              required
              disabled={submitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="se-password">Password</Label>
            <Input
              id="se-password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              disabled={submitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
