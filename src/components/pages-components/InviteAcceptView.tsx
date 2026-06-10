"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout, AuthError } from "@/components/pages-components/AuthLayout";

interface Invite {
  orgName: string;
  role: string;
  email?: string;
  isExistingUser?: boolean;
}

function prettyRole(role?: string) {
  if (!role) return "a member";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function InviteAcceptView({ token }: { token: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard StrictMode double-invoke
    ran.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/auth/invite/${encodeURIComponent(token)}`);
        const data = (await res.json().catch(() => null)) as
          | { ok: boolean; invite?: Invite; error?: string }
          | null;
        if (res.ok && data?.ok && data.invite) setInvite(data.invite);
        else setLoadError(data?.error ?? "This invitation is invalid or has expired.");
      } catch {
        setLoadError("Could not load this invitation. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!invite?.isExistingUser && name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (password.length < 8) {
      setError(
        invite?.isExistingUser
          ? "Enter your password to continue."
          : "Password must be at least 8 characters.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/invite/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: invite?.isExistingUser ? undefined : name.trim(),
          password,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;

      if (res.ok && data?.ok) {
        // Acceptance: invitee lands on the dashboard scoped to the inviting org.
        router.push("/");
        router.refresh();
        return;
      }
      setError(data?.error ?? "Could not accept the invitation.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AuthLayout title="Invitation">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your invitation…</p>
        </div>
      </AuthLayout>
    );
  }

  if (loadError || !invite) {
    return (
      <AuthLayout
        title="Invitation"
        footer={
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Go to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <XCircle className="size-10 text-destructive" />
          <p className="text-sm text-foreground">
            {loadError ?? "This invitation is invalid or has expired."}
          </p>
        </div>
      </AuthLayout>
    );
  }

  const existing = invite.isExistingUser;

  return (
    <AuthLayout
      title={`Join ${invite.orgName}`}
      subtitle={`You have been invited as ${prettyRole(invite.role)}.`}
      footer={
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Use a different account
        </Link>
      }
    >
      {error && <AuthError>{error}</AuthError>}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {invite.email && (
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={invite.email} disabled readOnly />
          </div>
        )}

        {!existing && (
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              required
              disabled={submitting}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">
            {existing ? "Password" : "Create a password"}
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete={existing ? "current-password" : "new-password"}
            placeholder={existing ? "Your password" : "At least 8 characters"}
            required
            disabled={submitting}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" />
              Joining…
            </>
          ) : (
            `Join ${invite.orgName}`
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
