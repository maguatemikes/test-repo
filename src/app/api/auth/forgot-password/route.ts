import { NextResponse } from "next/server";
import { callNetx, fail } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password
 * Triggers a password-reset email. To prevent account enumeration we always
 * report success to the client unless the service itself is unreachable.
 */
export async function POST(req: Request) {
  let email = "";
  try {
    const body = (await req.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return fail("server", "Malformed request.", 400);
  }

  const call = await callNetx("/auth/forgot", { email });
  if (!call.ok) return call.response;

  // Normalize any upstream 4xx (e.g. unknown email) to a neutral success.
  if (call.upstream.status >= 500) {
    return fail("server", "Something went wrong. Please try again.", 502);
  }
  return NextResponse.json({ ok: true });
}
