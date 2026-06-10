"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Copy, Download, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { AuthError, AuthNotice } from "@/components/pages-components/AuthLayout";

type Stage = "intro" | "scan" | "done";

interface SetupData {
  qrDataUrl?: string;
  secret?: string;
}

export function TwoFactorSetupView() {
  const [stage, setStage] = useState<Stage>("intro");
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ack, setAck] = useState(false);
  const router = useRouter();

  async function beginSetup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/setup");
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; setup?: SetupData; error?: string }
        | null;
      if (res.ok && data?.ok && data.setup) {
        setSetup(data.setup);
        setStage("scan");
      } else {
        setError(data?.error ?? "Could not start two-factor setup.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndEnable() {
    if (loading) return;
    setError(null);
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; recoveryCodes?: string[]; error?: string }
        | null;
      if (res.ok && data?.ok) {
        setRecoveryCodes(data.recoveryCodes ?? []);
        setStage("done");
      } else {
        setError(data?.error ?? "That code didn't match. Try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyCodes() {
    navigator.clipboard?.writeText(recoveryCodes.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadCodes() {
    const blob = new Blob([recoveryCodes.join("\n") + "\n"], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crm-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    setAck(true); // downloading counts as acknowledging
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Two-factor authentication
        </h1>
        <p className="text-sm text-muted-foreground">
          Require a one-time code from an authenticator app when you sign in.
        </p>
      </div>

      {error && <AuthError>{error}</AuthError>}

      {stage === "intro" && (
        <section className="rounded-lg border bg-card p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-muted-foreground" />
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">
                Protect your account
              </h2>
              <p className="text-sm text-muted-foreground">
                You&apos;ll need an authenticator app such as Google Authenticator,
                1Password, or Authy.
              </p>
            </div>
          </div>
          <Button className="mt-4" onClick={beginSetup} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Preparing…
              </>
            ) : (
              "Enable two-factor"
            )}
          </Button>
        </section>
      )}

      {stage === "scan" && setup && (
        <section className="space-y-5 rounded-lg border bg-card p-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              1. Scan this QR code
            </h2>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {setup.qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={setup.qrDataUrl}
                  alt="Two-factor QR code"
                  className="size-40 rounded-md border bg-white p-2"
                />
              ) : (
                <div className="flex size-40 items-center justify-center rounded-md border text-xs text-muted-foreground">
                  QR unavailable
                </div>
              )}
              {setup.secret && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Or enter this key manually:</p>
                  <code className="mt-1 block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
                    {setup.secret}
                  </code>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              2. Enter the 6-digit code
            </h2>
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button onClick={verifyAndEnable} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify & enable"
            )}
          </Button>
        </section>
      )}

      {stage === "done" && (
        <section className="space-y-4 rounded-lg border bg-card p-6">
          <AuthNotice tone="success">
            Two-factor authentication is now enabled.
          </AuthNotice>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recovery codes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save these somewhere safe. Each code can be used once if you lose
              access to your authenticator. They won&apos;t be shown again.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3 font-mono text-sm">
            {recoveryCodes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyCodes}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCodes}>
              <Download className="size-4" />
              Download
            </Button>
          </div>

          <label className="flex items-start gap-2 text-sm text-foreground">
            <Checkbox
              checked={ack}
              onCheckedChange={(v) => setAck(v === true)}
              className="mt-0.5"
            />
            I have saved my recovery codes somewhere safe.
          </label>

          <Button disabled={!ack} onClick={() => router.push("/settings/account")}>
            Finish
          </Button>
        </section>
      )}
    </div>
  );
}
