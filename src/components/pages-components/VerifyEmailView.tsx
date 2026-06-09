"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AuthLayout,
  AuthError,
  AuthNotice,
} from "@/components/pages-components/AuthLayout";

const RESEND_COOLDOWN_SECONDS = 30;

export function VerifyEmailView({ email }: { email?: string }) {
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const id = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(id);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function resend() {
    if (sending || cooldown > 0) return;
    setError(null);
    setSent(false);
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;
      if (res.ok && data?.ok) {
        setSent(true);
        startCooldown();
      } else if (res.status === 429) {
        setError("Please wait a moment before requesting another email.");
        startCooldown();
      } else {
        setError(data?.error ?? "Could not resend the email. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthLayout
      title="Check your inbox"
      subtitle={
        email
          ? undefined
          : "We've sent you a link to verify your email address."
      }
      footer={
        <>
          Wrong address?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Change email
          </Link>
        </>
      }
    >
      <div className="mb-4 flex flex-col items-center text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
          <MailCheck className="size-6 text-muted-foreground" />
        </span>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to{" "}
          {email ? (
            <span className="font-medium text-foreground">{email}</span>
          ) : (
            "your email address"
          )}
          . Click it to activate your account.
        </p>
      </div>

      {sent && <AuthNotice tone="success">A new verification email is on its way.</AuthNotice>}
      {error && <AuthError>{error}</AuthError>}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={sending || cooldown > 0}
        onClick={resend}
      >
        {sending ? (
          <>
            <Loader2 className="animate-spin" />
            Sending…
          </>
        ) : cooldown > 0 ? (
          `Resend in ${cooldown}s`
        ) : (
          "Resend verification email"
        )}
      </Button>
    </AuthLayout>
  );
}
