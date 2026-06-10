import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { callNetx, fail, relaySessionCookie } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

const CHALLENGE_COOKIE = "crm_2fa_challenge";

/**
 * POST /api/auth/2fa/verify
 * Completes a login that requires 2FA. The `challengeToken` was issued by the
 * login step and stored in a first-party httpOnly cookie; we read it here and
 * send `{ challengeToken, code }` to the backend. On success the backend issues
 * the real session, which we relay (and we clear the challenge cookie).
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

  const challengeToken = (await cookies()).get(CHALLENGE_COOKIE)?.value;
  if (!challengeToken) {
    return fail(
      "expired",
      "Your verification session expired. Please sign in again.",
      401,
    );
  }

  const call = await callNetx("/auth/2fa/verify", {
    challengeToken,
    code,
    recoveryCode,
  });
  if (!call.ok) return call.response;

  const { upstream } = call;
  if (upstream.ok) {
    const res = NextResponse.json({ ok: true });
    relaySessionCookie(upstream, res);
    res.cookies.set(CHALLENGE_COOKIE, "", { path: "/", maxAge: 0 }); // clear
    return res;
  }
  return fail("invalid", "That code is incorrect. Please try again.", 401);
}
