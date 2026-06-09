"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/pages-components/AuthLayout";

type Status = "verifying" | "success" | "error";

export function VerifyConfirmView({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard React StrictMode double-invoke
    ran.current = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json().catch(() => null)) as
          | { ok: boolean; error?: string }
          | null;

        if (res.ok && data?.ok) {
          setStatus("success");
          // Acceptance: valid token marks user verified and lands on dashboard.
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 1200);
        } else {
          setStatus("error");
          setMessage(data?.error ?? "This verification link is invalid or has expired.");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong while verifying your email.");
      }
    })();
  }, [token, router]);

  return (
    <AuthLayout title="Email verification">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verifying your email…</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="size-10 text-primary" />
            <p className="text-sm text-foreground">
              Your email is verified. Taking you to your dashboard…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="size-10 text-destructive" />
            <p className="text-sm text-foreground">{message}</p>
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href="/verify">Request a new link</Link>
            </Button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
