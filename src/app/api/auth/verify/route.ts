import { NextResponse } from "next/server";
import { callNetx, fail, relaySessionCookie } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify
 * Confirms an email-verification token. On success the backend marks the user
 * verified and issues a session, which we relay so the user is auto-logged-in.
 */
export async function POST(req: Request) {
  let token = "";
  try {
    const body = (await req.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token : "";
  } catch {
    return fail("server", "Malformed request.", 400);
  }

  if (!token) return fail("invalid", "Missing verification token.", 400);

  const call = await callNetx("/auth/verify", { token });
  if (!call.ok) return call.response;

  const { upstream } = call;
  if (upstream.ok) {
    return relaySessionCookie(upstream, NextResponse.json({ ok: true }));
  }
  if (upstream.status === 410)
    return fail("expired", "This verification link has expired.", 410);
  return fail("invalid", "This verification link is invalid or has expired.", 400);
}
