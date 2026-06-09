"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { AuthLayout, AuthError } from "@/components/pages-components/AuthLayout";

export function TwoFactorChallengeView() {
  const router = useRouter();
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (submitting) return;
    setError(null);

    const payload = useRecovery
      ? { recoveryCode: recovery.trim() }
      : { code };

    if (!useRecovery && code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    if (useRecovery && recovery.trim().length < 6) {
      setError("Enter one of your recovery codes.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;
      if (res.ok && data?.ok) {
        // Acceptance: correct code proceeds to the dashboard.
        router.push("/");
        router.refresh();
        return;
      }
      setError(data?.error ?? "That code is incorrect. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Two-step verification"
      subtitle={
        useRecovery
          ? "Enter one of your recovery codes."
          : "Enter the 6-digit code from your authenticator app."
      }
      footer={
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={submit} className="space-y-4">
        {useRecovery ? (
          <div className="space-y-2">
            <Label htmlFor="recovery">Recovery code</Label>
            <Input
              id="recovery"
              autoComplete="one-time-code"
              placeholder="xxxx-xxxx"
              value={recovery}
              disabled={submitting}
              onChange={(e) => setRecovery(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              disabled={submitting}
              onComplete={() => submit()}
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" />
              Verifying…
            </>
          ) : (
            "Verify"
          )}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setUseRecovery((v) => !v);
          setError(null);
        }}
        className="mt-4 w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {useRecovery ? "Use authenticator app instead" : "Use a recovery code"}
      </button>
    </AuthLayout>
  );
}
