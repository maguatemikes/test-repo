import { NextResponse } from "next/server";
import { fail } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NETX_API_BASE_URL;

/**
 * GET /api/auth/2fa/setup
 * Asks the backend to generate a TOTP secret + provisioning QR for the
 * signed-in user. Does not enable 2FA yet — that happens on /enable.
 */
export async function GET(req: Request) {
  if (!API_BASE)
    return fail("server", "Authentication service is not configured.", 503);

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/auth/2fa/setup`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      redirect: "manual",
    });
  } catch {
    return fail("server", "Could not reach the authentication service.", 502);
  }

  if (upstream.ok) {
    const setup = await upstream.json().catch(() => null);
    return NextResponse.json({ ok: true, setup });
  }
  if (upstream.status === 401)
    return fail("unauthorized", "Please sign in again.", 401);
  return fail("server", "Could not start two-factor setup.", 502);
}
