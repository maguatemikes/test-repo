import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 *
 * Thin proxy in front of the NetX .NET auth service. The frontend never talks
 * to the .NET API directly; this route forwards credentials, normalizes the
 * response into the app's `{ ok, code?, error? }` shape, and relays the session
 * cookie the backend issues.
 *
 * Error `code`s consumed by LoginView:
 *   invalid_credentials | unverified | locked | rate_limited | server
 */

const API_BASE = process.env.NETX_API_BASE_URL;

interface LoginBody {
  email?: unknown;
  password?: unknown;
  rememberMe?: unknown;
}

function bad(code: string, error: string, status: number) {
  return NextResponse.json({ ok: false, code, error }, { status });
}

export async function POST(req: Request) {
  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return bad("server", "Malformed request.", 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return bad("invalid_credentials", "Email and password are required.", 400);
  }

  if (!API_BASE) {
    // Backend not configured yet — surface a clear, non-leaky error.
    return bad(
      "server",
      "Authentication service is not configured.",
      503,
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      // Internal service-to-service call; do not follow redirects silently.
      redirect: "manual",
    });
  } catch {
    return bad("server", "Could not reach the authentication service.", 502);
  }

  if (upstream.ok) {
    // Two success shapes:
    //   no 2FA → { userId, orgId, role, emailVerified } and a session cookie
    //   2FA    → { twoFactorRequired: true, challengeToken } and NO cookie
    const data = (await upstream.json().catch(() => null)) as
      | { twoFactorRequired?: boolean; challengeToken?: string }
      | null;

    if (data?.twoFactorRequired && data.challengeToken) {
      // Stash the challengeToken in a short-lived, first-party, httpOnly cookie
      // so /api/auth/2fa/verify can finish login without exposing it to JS.
      const res = NextResponse.json({ ok: true, twoFactor: true });
      res.cookies.set("crm_2fa_challenge", data.challengeToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });
      return res;
    }

    // Normal success — relay the session cookie the backend set.
    const res = NextResponse.json({ ok: true, twoFactor: false });
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) res.headers.set("set-cookie", setCookie);
    return res;
  }

  // Map upstream failure to a user-facing code/message.
  const detail = (await upstream
    .json()
    .catch(() => null)) as { reason?: string; message?: string } | null;
  const reason = detail?.reason?.toLowerCase() ?? "";

  switch (upstream.status) {
    case 401:
      return bad(
        "invalid_credentials",
        "Incorrect email or password.",
        401,
      );
    case 403:
      if (reason.includes("unverified") || reason.includes("verify")) {
        return bad(
          "unverified",
          "Please verify your email before signing in.",
          403,
        );
      }
      if (reason.includes("lock")) {
        return bad(
          "locked",
          "Your account is locked. Contact an administrator.",
          403,
        );
      }
      return bad("invalid_credentials", "Incorrect email or password.", 403);
    case 423:
      return bad(
        "locked",
        "Your account is locked. Contact an administrator.",
        423,
      );
    case 429:
      return bad(
        "rate_limited",
        "Too many attempts. Please wait and try again.",
        429,
      );
    default:
      return bad("server", "Something went wrong. Please try again.", 502);
  }
}
