import { NextResponse } from "next/server";
import { callNetx, fail, relaySessionCookie } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password
 * Sets a new password given a valid reset token. On success the backend issues
 * a session which we relay so the user is logged in automatically.
 */
export async function POST(req: Request) {
  let token = "";
  let password = "";
  try {
    const body = (await req.json()) as { token?: unknown; password?: unknown };
    token = typeof body.token === "string" ? body.token : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return fail("server", "Malformed request.", 400);
  }

  if (!token) return fail("invalid", "Missing reset token.", 400);
  if (password.length < 8)
    return fail("invalid", "Password must be at least 8 characters.", 400);

  // Backend ResetRequest is { token, newPassword }.
  const call = await callNetx("/auth/reset", { token, newPassword: password });
  if (!call.ok) return call.response;

  const { upstream } = call;
  if (upstream.ok) {
    return relaySessionCookie(upstream, NextResponse.json({ ok: true }));
  }
  if (upstream.status === 410)
    return fail("expired", "This reset link has expired.", 410);
  return fail("invalid", "This reset link is invalid or has expired.", 400);
}
