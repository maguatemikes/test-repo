import { NextResponse } from "next/server";
import { callNetx, relaySessionCookie } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 * Invalidates the session on the backend and relays the cookie-clearing header.
 * Always reports success — the UI redirects to /login regardless, so a flaky
 * backend never traps the user in an authenticated-looking state.
 */
export async function POST() {
  const call = await callNetx("/auth/logout", {});
  if (call.ok) {
    return relaySessionCookie(call.upstream, NextResponse.json({ ok: true }));
  }
  return NextResponse.json({ ok: true });
}
