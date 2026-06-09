import { NextResponse } from "next/server";
import { callNetx, fail } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/resend-verification
 * Asks the NetX auth service to re-send the verification email. Rate limiting
 * is enforced upstream; a 429 is surfaced to the UI as a cooldown.
 */
export async function POST(req: Request) {
  let email = "";
  try {
    const body = (await req.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return fail("server", "Malformed request.", 400);
  }

  const call = await callNetx("/auth/resend-verification", { email });
  if (!call.ok) return call.response;

  const { upstream } = call;
  if (upstream.ok) return NextResponse.json({ ok: true });
  if (upstream.status === 429)
    return fail("rate_limited", "Too many requests. Please wait and try again.", 429);
  return fail("server", "Could not resend the email. Please try again.", 502);
}
