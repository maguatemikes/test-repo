"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout, AuthError } from "@/components/pages-components/AuthLayout";

type Step = 1 | 2 | 3;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignupView() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goAccount(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setStep(2);
  }

  function goOrg(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (orgName.trim().length < 2) {
      setError("Organization name is required.");
      return;
    }
    if (!/^[a-z0-9-]{2,}$/.test(orgSlug)) {
      setError("Slug must be lowercase letters, numbers, and hyphens.");
      return;
    }
    setStep(3);
  }

  function onOrgNameChange(value: string) {
    setOrgName(value);
    if (!slugEdited) setOrgSlug(slugify(value));
  }

  async function submitSignup() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          orgName: orgName.trim(),
          orgSlug,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;

      if (res.ok && data?.ok) {
        // Acceptance: redirect to the check-your-inbox screen.
        router.push(`/verify?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      setError(data?.error ?? "Could not create your account. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Step-by-step setup for your team's CRM."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <Stepper step={step} />
      {error && <AuthError>{error}</AuthError>}

      {step === 1 && (
        <form onSubmit={goAccount} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={goOrg} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization name</Label>
            <Input
              id="orgName"
              type="text"
              placeholder="Acme Corp"
              required
              value={orgName}
              onChange={(e) => onOrgNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgSlug">Workspace URL</Label>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">app/</span>
              <Input
                id="orgSlug"
                type="text"
                placeholder="acme-corp"
                required
                value={orgSlug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setOrgSlug(slugify(e.target.value));
                }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" className="flex-1">
              Continue
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <dl className="space-y-3 text-sm">
            <Review label="Email" value={email.trim()} />
            <Review label="Organization" value={orgName.trim()} />
            <Review label="Workspace URL" value={`app/${orgSlug}`} />
            <Review label="Plan" value="Free" />
          </dl>
          <p className="text-xs text-muted-foreground">
            We&apos;ll email a verification link to confirm your address.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={submitting}
              onClick={() => setStep(2)}
            >
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={submitting}
              onClick={submitSignup}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Account", "Organization", "Confirm"];
  return (
    <ol className="mb-6 flex items-center justify-between">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const done = step > n;
        const active = step === n;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={[
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary text-primary"
                    : "border-input text-muted-foreground",
              ].join(" ")}
            >
              {done ? <Check className="size-3.5" /> : n}
            </span>
            <span
              className={[
                "text-xs",
                active ? "text-foreground" : "text-muted-foreground",
              ].join(" ")}
            >
              {label}
            </span>
            {i < labels.length - 1 && (
              <span className="mx-1 h-px flex-1 bg-border" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}
