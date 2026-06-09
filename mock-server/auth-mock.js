/**
 * Local mock of the NetX .NET auth service — for frontend testing only.
 *
 * Zero dependencies (Node built-ins). Run:
 *     node mock-server/auth-mock.js
 * Then point the app at it in .env.local:
 *     NETX_API_BASE_URL=http://localhost:4000
 * and restart `pnpm dev`.
 *
 * It implements every /auth/* endpoint the app's /api/auth/* proxy routes call,
 * with deterministic test data so you can exercise success AND error paths.
 *
 * ── Test accounts (password for all: "password123") ──────────────────────────
 *   user@test.com         → normal login, lands on dashboard
 *   2fa@test.com          → login then 2FA challenge (code 123456)
 *   unverified@test.com   → 403, "verify your email" path
 *   locked@test.com       → 403, "account locked" path
 *   (any other email / wrong password → 401 invalid credentials)
 *
 * ── Magic tokens (use in the URL) ────────────────────────────────────────────
 *   /verify/ok            → verifies + logs in     | /verify/expired → expired
 *   /reset/ok             → resets + logs in        | /reset/expired  → expired
 *   /invite/new           → new-user invite form    | /invite/existing → existing user
 *   /invite/expired       → expired invite
 *
 * ── 2FA codes ────────────────────────────────────────────────────────────────
 *   TOTP code: 123456     | recovery code: AAAA-BBBB
 *
 * ── Signup / account edge cases ──────────────────────────────────────────────
 *   email containing "taken" → 409 email exists | slug "taken" → 409 slug taken
 *
 * ── Change password ──────────────────────────────────────────────────────────
 *   current password must be "password123", else 401
 */

const http = require("http");

const PORT = process.env.MOCK_PORT || 4000;
const SESSION_COOKIE = "crm_session=mock-session-token; Path=/; HttpOnly; SameSite=Lax";
const PENDING_COOKIE = "crm_2fa_pending=pending-token; Path=/; HttpOnly; SameSite=Lax";
const CLEAR_COOKIE = "crm_session=; Path=/; Max-Age=0";

const SECRET = "JBSWY3DPEHPK3PXP";
const RECOVERY_CODES = [
  "A1B2-C3D4", "E5F6-G7H8", "J9K0-L1M2", "N3P4-Q5R6",
  "S7T8-U9V0", "W1X2-Y3Z4", "5A6B-7C8D", "9E0F-1G2H",
];

// A simple placeholder "QR" image (SVG) so the setup screen renders something.
function fakeQrDataUrl() {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">` +
    `<rect width="160" height="160" fill="#fff"/>` +
    `<rect x="8" y="8" width="40" height="40" fill="#111"/>` +
    `<rect x="112" y="8" width="40" height="40" fill="#111"/>` +
    `<rect x="8" y="112" width="40" height="40" fill="#111"/>` +
    `<rect x="64" y="64" width="16" height="16" fill="#111"/>` +
    `<rect x="88" y="88" width="16" height="16" fill="#111"/>` +
    `<rect x="64" y="96" width="12" height="12" fill="#111"/>` +
    `<text x="80" y="155" font-size="8" text-anchor="middle" fill="#999">mock QR</text>` +
    `</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function send(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    ...extraHeaders,
  });
  res.end(JSON.stringify(body ?? {}));
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
  const body = req.method === "POST" ? await readBody(req) : {};
  const log = (msg) => console.log(`  → ${msg}`);
  console.log(`${req.method} ${pathname}`);

  // ---- LOGIN ----
  if (pathname === "/auth/login" && req.method === "POST") {
    const { email = "", password = "" } = body;
    if (password !== "password123") return send(res, 401, { reason: "invalid" });
    if (email === "unverified@test.com") return send(res, 403, { reason: "unverified" });
    if (email === "locked@test.com") return send(res, 403, { reason: "locked" });
    if (email === "2fa@test.com") {
      log("2FA required");
      return send(res, 200, { twoFactorRequired: true }, { "Set-Cookie": PENDING_COOKIE });
    }
    log("login OK");
    return send(res, 200, { twoFactorRequired: false }, { "Set-Cookie": SESSION_COOKIE });
  }

  // ---- SIGNUP ----
  if (pathname === "/auth/signup" && req.method === "POST") {
    const { email = "", orgSlug = "" } = body;
    if (email.includes("taken")) return send(res, 409, { reason: "email exists" });
    if (orgSlug === "taken") return send(res, 409, { reason: "slug taken" });
    log(`created org "${body.orgName}" + sent verification email to ${email}`);
    return send(res, 200, { ok: true });
  }

  // ---- RESEND VERIFICATION ----
  if (pathname === "/auth/resend-verification" && req.method === "POST") {
    log("resent verification email");
    return send(res, 200, { ok: true });
  }

  // ---- VERIFY EMAIL ----
  if (pathname === "/auth/verify" && req.method === "POST") {
    const { token = "" } = body;
    if (token === "expired") return send(res, 410, { reason: "expired" });
    if (token !== "ok") return send(res, 400, { reason: "invalid" });
    log("verified + session issued");
    return send(res, 200, { ok: true }, { "Set-Cookie": SESSION_COOKIE });
  }

  // ---- FORGOT PASSWORD ----
  if (pathname === "/auth/forgot-password" && req.method === "POST") {
    log(`(if it exists) sent reset email to ${body.email}`);
    return send(res, 200, { ok: true });
  }

  // ---- RESET PASSWORD ----
  if (pathname === "/auth/reset-password" && req.method === "POST") {
    const { token = "" } = body;
    if (token === "expired") return send(res, 410, { reason: "expired" });
    if (token !== "ok") return send(res, 400, { reason: "invalid" });
    log("password reset + session issued");
    return send(res, 200, { ok: true }, { "Set-Cookie": SESSION_COOKIE });
  }

  // ---- INVITE: fetch details ----
  if (pathname.startsWith("/auth/invite/") && req.method === "GET") {
    const token = pathname.split("/").pop();
    if (token === "expired") return send(res, 410, { reason: "expired" });
    if (token === "new") {
      return send(res, 200, {
        orgName: "Acme Corp",
        role: "marketing_manager",
        email: "invitee@test.com",
        userExists: false,
      });
    }
    if (token === "existing") {
      return send(res, 200, {
        orgName: "Acme Corp",
        role: "analyst",
        email: "user@test.com",
        userExists: true,
      });
    }
    return send(res, 400, { reason: "invalid" });
  }

  // ---- INVITE: accept ----
  if (pathname === "/auth/accept-invite" && req.method === "POST") {
    const { token = "" } = body;
    if (token === "expired") return send(res, 410, { reason: "expired" });
    log("invite accepted + session issued");
    return send(res, 200, { ok: true }, { "Set-Cookie": SESSION_COOKIE });
  }

  // ---- LOGOUT ----
  if (pathname === "/auth/logout" && req.method === "POST") {
    log("logged out");
    return send(res, 200, { ok: true }, { "Set-Cookie": CLEAR_COOKIE });
  }

  // ---- ACCOUNT (profile update) ----
  if (pathname === "/auth/account" && req.method === "POST") {
    if ((body.email || "").includes("taken")) return send(res, 409, { reason: "email exists" });
    log(`profile updated: ${body.name} / ${body.email}`);
    return send(res, 200, { ok: true });
  }

  // ---- CHANGE PASSWORD ----
  if (pathname === "/auth/change-password" && req.method === "POST") {
    if (body.currentPassword !== "password123") return send(res, 401, { reason: "invalid" });
    log("password changed");
    return send(res, 200, { ok: true });
  }

  // ---- 2FA: setup ----
  if (pathname === "/auth/2fa/setup" && req.method === "GET") {
    return send(res, 200, { qrDataUrl: fakeQrDataUrl(), secret: SECRET });
  }

  // ---- 2FA: enable ----
  if (pathname === "/auth/2fa/enable" && req.method === "POST") {
    if (body.code !== "123456") return send(res, 400, { reason: "bad code" });
    log("2FA enabled");
    return send(res, 200, { recoveryCodes: RECOVERY_CODES });
  }

  // ---- 2FA: verify (during login) ----
  if (pathname === "/auth/2fa/verify" && req.method === "POST") {
    const okCode = body.code === "123456";
    const okRecovery = body.recoveryCode === "AAAA-BBBB";
    if (!okCode && !okRecovery) return send(res, 401, { reason: "invalid" });
    log("2FA verified + session issued");
    return send(res, 200, { ok: true }, { "Set-Cookie": SESSION_COOKIE });
  }

  // ---- health / fallthrough ----
  if (pathname === "/" || pathname === "/health") {
    return send(res, 200, { ok: true, service: "auth-mock" });
  }
  send(res, 404, { reason: "not found", path: pathname });
});

server.listen(PORT, () => {
  console.log(`\n  Mock auth server listening on http://localhost:${PORT}`);
  console.log(`  Set NETX_API_BASE_URL=http://localhost:${PORT} in .env.local\n`);
  console.log(`  Test login: user@test.com / password123`);
  console.log(`  See the header of this file for all test accounts & tokens.\n`);
});
