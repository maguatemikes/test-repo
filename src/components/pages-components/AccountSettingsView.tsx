"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/SessionProvider";
import Link from "next/link";
import { Loader2, ShieldCheck, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthError, AuthNotice } from "@/components/pages-components/AuthLayout";

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function AccountSettingsView() {
  const router = useRouter();
  const { user, refresh } = useCurrentUser();

  // Profile — seeded from the signed-in user once /api/me resolves.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (user && !seeded) {
      setName(user.name);
      setEmail(user.email);
      setSeeded(true);
    }
  }, [user, seeded]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Password
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  const emailChanged = email.trim() !== (user?.email ?? "");

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setAvatarPreview(url);
      setAvatarData(url);
    };
    reader.readAsDataURL(file);
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (savingProfile) return;
    setProfileErr(null);
    setProfileMsg(null);
    if (name.trim().length < 2) {
      setProfileErr("Please enter your name.");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          avatarDataUrl: avatarData ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;
      if (res.ok && data?.ok) {
        setProfileMsg(
          emailChanged
            ? "Saved. Check your new email for a verification link."
            : "Your profile has been updated.",
        );
        // Acceptance: name update reflects in the topbar (re-fetch /api/me).
        await refresh();
      } else {
        setProfileErr(data?.error ?? "Could not save your profile.");
      }
    } catch {
      setProfileErr("Something went wrong. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (savingPw) return;
    setPwErr(null);
    if (next.length < 8) {
      setPwErr("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setPwErr("New passwords do not match.");
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;
      if (res.ok && data?.ok) {
        setPwDone(true);
        // Acceptance: password change forces re-login.
        setTimeout(() => router.push("/login"), 1500);
      } else if (res.status === 401) {
        setPwErr("Your current password is incorrect.");
      } else {
        setPwErr(data?.error ?? "Could not change your password.");
      }
    } catch {
      setPwErr("Something went wrong. Please try again.");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Account settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal information and password.
        </p>
      </div>

      {/* Profile */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Profile</h2>
        {profileMsg && <AuthNotice tone="success">{profileMsg}</AuthNotice>}
        {profileErr && <AuthError>{profileErr}</AuthError>}

        <form onSubmit={saveProfile} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="" className="size-full object-cover" />
              ) : (
                initialsOf(name || "?")
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickAvatar}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4" />
                Change photo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={savingProfile}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={savingProfile}
            />
            {emailChanged && (
              <p className="text-xs text-muted-foreground">
                Changing your email requires re-verification of the new address.
              </p>
            )}
          </div>

          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </form>
      </section>

      {/* Two-factor link */}
      <section className="flex items-center justify-between rounded-lg border bg-card p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Two-factor authentication
            </h2>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/security">Manage</Link>
        </Button>
      </section>

      {/* Change password */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Change password</h2>
        {pwDone ? (
          <AuthNotice tone="success">
            Password changed. Redirecting you to sign in again…
          </AuthNotice>
        ) : (
          <>
            {pwErr && <AuthError>{pwErr}</AuthError>}
            <form onSubmit={changePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Current password</Label>
                <Input
                  id="current"
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  disabled={savingPw}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next">New password</Label>
                <Input
                  id="next"
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  disabled={savingPw}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={savingPw}
                  required
                />
              </div>
              <Button type="submit" disabled={savingPw}>
                {savingPw ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
