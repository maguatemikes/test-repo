import { NextResponse } from "next/server";
import { callNetx, fail, relaySessionCookie } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/verify
 * Completes a login that requires 2FA. Accepts either a TOTP `code` or a
 * one-time `recoveryCode`; on success the backend upgrades the pending login
 * to a full session, which we relay.
 */
export async function POST(req: Request) {
  let code: string | undefined;
  let recoveryCode: string | undefined;
  try {
    const body = (await req.json()) as { code?: unknown; recoveryCode?: unknown };
    code = typeof body.code === "string" ? body.code : undefined;
    recoveryCode =
      typeof body.recoveryCode === "string" ? body.recoveryCode : undefined;
  } catch {
    return fail("server", "Malformed request.", 400);
  }

  if (!code && !recoveryCode)
    return fail("invalid", "Enter your verification code.", 400);

  const call = await callNetx("/auth/2fa/verify", {
    code,
    recoveryCode,
    // Forward the pending-2FA cookie the login step set.
    cookie: req.headers.get("cookie") ?? undefined,
  });
  if (!call.ok) return call.response;

  const { upstream } = call;
  if (upstream.ok) {
    return relaySessionCookie(upstream, NextResponse.json({ ok: true }));
  }
  return fail("invalid", "That code is incorrect. Please try again.", 401);
}
