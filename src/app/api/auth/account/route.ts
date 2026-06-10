import { NextResponse } from "next/server";
import { callNetx, fail, readUpstreamReason } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/account  (internal) → PATCH /api/me (backend)
 * Updates the signed-in user's profile. Backend UpdateProfileRequest is
 * { name, email } only — partial update, authenticated via session cookie.
 * (Avatar upload is not supported by the API yet, so it's ignored here.)
 */
export async function POST(req: Request) {
  let name = "";
  let email = "";
  try {
    const body = (await req.json()) as { name?: unknown; email?: unknown };
    name = typeof body.name === "string" ? body.name.trim() : "";
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return fail("server", "Malformed request.", 400);
  }

  if (name.length < 2) return fail("invalid", "Please enter your name.", 400);
  if (!EMAIL_RE.test(email)) return fail("invalid", "Enter a valid email address.", 400);

  const call = await callNetx(
    "/me",
    { name, email },
    { method: "PATCH", cookie: req.headers.get("cookie") },
  );
  if (!call.ok) return call.response;

  const { upstream } = call;
  if (upstream.ok) return NextResponse.json({ ok: true });
  if (upstream.status === 401) return fail("unauthorized", "Please sign in again.", 401);
  if (upstream.status === 409) {
    const reason = await readUpstreamReason(upstream);
    return fail("email_taken", reason || "That email is already in use.", 409);
  }
  return fail("server", "Could not save your profile.", 502);
}
