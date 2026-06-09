import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

/**
 * Shared chrome for the standalone auth pages (login, sign-up, verify, reset).
 * Presentational only — interactive pieces live in the calling client view.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center px-4 py-12"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">{children}</div>
        {footer && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function AuthNotice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success";
}) {
  const Icon = tone === "success" ? CheckCircle2 : Info;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="space-y-1">{children}</div>
    </div>
  );
}
