"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, MailWarning, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Error categories the login form renders distinctly. These mirror the `code`
 * field returned by POST /api/auth/login (see src/app/api/auth/login/route.ts).
 */
type LoginErrorCode =
  | "invalid_credentials"
  | "unverified"
  | "locked"
  | "rate_limited"
  | "server";

interface LoginError {
  code: LoginErrorCode;
  message: string;
}

const FALLBACK_ERROR: LoginError = {
  code: "server",
  message: "Something went wrong. Please try again.",
};

export function LoginView() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; code?: LoginErrorCode; error?: string }
        | null;

      if (res.ok && data?.ok) {
        // Acceptance: existing user lands on the dashboard (index route).
        router.push("/");
        router.refresh();
        return;
      }

      const code = (data?.code ?? "server") as LoginErrorCode;
      setError({ code, message: data?.error ?? FALLBACK_ERROR.message });
    } catch {
      setError(FALLBACK_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  const invalid = error?.code === "invalid_credentials";

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center px-4 py-12"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back to the CRM.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {error && <ErrorBanner error={error} />}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                disabled={submitting}
                aria-invalid={invalid || undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  tabIndex={submitting ? -1 : 0}
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                disabled={submitting}
                aria-invalid={invalid || undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                disabled={submitting}
                onCheckedChange={(v) => setRememberMe(v === true)}
              />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                Remember me on this device
              </Label>
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
    </div>
  );
}

function ErrorBanner({ error }: { error: LoginError }) {
  const Icon =
    error.code === "unverified"
      ? MailWarning
      : error.code === "locked"
        ? Lock
        : AlertCircle;

  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        <p>{error.message}</p>
        {error.code === "unverified" && (
          <Link
            href="/verify"
            className="font-medium underline underline-offset-4"
          >
            Resend verification email
          </Link>
        )}
      </div>
    </div>
  );
}
