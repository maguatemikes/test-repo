# Auth Flow — Team Testing Guide (#50–#61)

This guide walks you through testing the new authentication flow locally. No real
backend is required — a small **mock auth server** (included in the repo) stands
in for the NetX .NET service so every screen can be exercised end-to-end.

**What's covered:** login, sign-up, email verification, password reset, invite
accept, account/profile settings, 2FA setup + challenge, session re-auth modal,
and logout (GitLab issues #50–#61).

---

## 1. Prerequisites

- **Node 20+** and **pnpm 9+** (`npm install -g pnpm` if you don't have pnpm)
- Access to the `crm-web` repo on `git.netx.cc`

> You do **not** need the MySQL database or the .NET API for this testing — the
> Customer Hub uses mock data and the mock auth server replaces the backend.

---

## 2. Get the code

```bash
git clone https://git.netx.cc/crm/crm-web.git
cd crm-web
git checkout staging          # the auth work lives here
pnpm install
```

If `pnpm install` reports `ERR_PNPM_IGNORED_BUILDS`, run `pnpm approve-builds`
once (select all, confirm), then `pnpm install` again. The allowlist in
`pnpm-workspace.yaml` should handle this automatically on a clean install.

---

## 3. Configure the environment

Create your local env file from the example:

```bash
cp .env.example .env.local
```

Then set this one line in `.env.local` so the app talks to the mock server:

```
NETX_API_BASE_URL=http://localhost:4000
```

Everything else can stay at its placeholder value. (Auth middleware is currently
disabled, so all routes are directly reachable without signing in.)

---

## 4. Run it — two terminals

**Terminal 1 — the mock auth backend:**

```bash
node mock-server/auth-mock.js
```

You should see `Mock auth server listening on http://localhost:4000`. It logs
every request it receives, so keep an eye on it while testing.

**Terminal 2 — the app:**

```bash
pnpm dev
```

Open **http://localhost:3000**.

---

## 5. Test credentials & magic values

All test accounts use the password **`password123`**.

| Account | Behavior |
|---|---|
| `user@test.com` | Normal login → dashboard |
| `2fa@test.com` | Login → 2FA challenge screen |
| `unverified@test.com` | Blocked: "verify your email" |
| `locked@test.com` | Blocked: "account locked" |
| any other email / wrong password | Invalid credentials error |

**Magic tokens** (put them straight in the URL):

| URL | Result |
|---|---|
| `/verify/ok` | Verifies + signs in |
| `/verify/expired` | Expired-link state |
| `/reset/ok` | Resets password + signs in |
| `/reset/expired` | Expired-link state |
| `/invite/new` | New-user invite (name + password form) |
| `/invite/existing` | Existing-user invite (password only) |
| `/invite/expired` | Expired-invite state |

**2FA codes:** TOTP code `123456` · recovery code `AAAA-BBBB`

**Signup edge cases:** use an email containing `taken` to trigger "email already
exists"; use the slug `taken` to trigger "workspace URL taken".

**Change password:** current password must be `password123`.

---

## 6. Test checklist by issue

| # | What to test | Steps |
|---|---|---|
| 50 | Login | `/login` → `user@test.com` / `password123` → lands on dashboard |
| 50 | Login errors | wrong password, `unverified@test.com`, `locked@test.com` |
| 51 | Sign-up | `/signup` → 3 steps (account → org → confirm) → "Create account" → check-inbox screen |
| 52 | Check inbox / resend | on `/verify` → "Resend" → success + 30s cooldown; "Change email" → `/signup` |
| 53 | Verify confirm | `/verify/ok` → verifies + redirects; `/verify/expired` → error + "request new link" |
| 54 | Forgot password | `/forgot-password` → any email → neutral "if that email exists" confirmation |
| 55 | Reset password | `/reset/ok` → strength meter + confirm match → sets password + signs in |
| 56 | Invite accept | `/invite/new` and `/invite/existing` → accept → dashboard; `/invite/expired` → error |
| 57 | Account settings | avatar menu → **Profile** → edit name/email (note re-verification), avatar preview, change password |
| 58 | 2FA setup | `/settings/security` → Enable → QR + secret → code `123456` → recovery codes (copy/download) |
| 59 | 2FA challenge | `/login` → `2fa@test.com` → `/login/2fa` → code `123456` (or recovery `AAAA-BBBB`) → dashboard |
| 60 | Session re-auth | on any app page, browser console: `window.dispatchEvent(new CustomEvent('crm:session-expired'))` → inline re-login modal |
| 61 | Logout | avatar menu → **Sign Out** → confirm dialog → redirects to `/login` |

---

## 7. What's mocked vs. real

- **Mocked:** all `/auth/*` responses, sessions/cookies, verification emails (the
  mock just logs them). This lets the full UI flow be tested without a backend.
- **Not yet real:** the production `/api/auth/*` contract still needs to be
  reconciled with the actual NetX .NET service (paths, payloads, status codes,
  session cookie, 2FA + recovery-code response shapes). Treat backend behavior in
  these tests as illustrative, not final.

---

## 8. Reporting issues

When filing a bug, please include:

- The issue number (#50–#61) and the screen/route
- The test account or magic token used
- What you expected vs. what happened (a screenshot helps)
- Anything logged in **Terminal 1** (the mock server) at that moment

---

## Appendix: using this in Cowork

You can run all of the above inside Cowork as well:

1. Connect/select the `crm-web` folder so Cowork can read and edit it.
2. Ask Cowork to run the setup (`pnpm install`, create `.env.local`) — or follow
   sections 2–4 yourself in a terminal.
3. Start the mock server and dev server (section 4), then work through the
   checklist in section 6.
4. Note: run **all `git` commands in a normal terminal on your machine**, not via
   Cowork — Cowork's sandbox cannot safely write to the `.git` folder on a mounted
   drive.
