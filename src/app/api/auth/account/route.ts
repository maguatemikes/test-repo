import { NextResponse } from "next/server";
import { callNetx, fail } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/account
 * Updates the signed-in user's profile (name, email, optional avatar). Changing
 * the email triggers re-verification on the backend.
 */
export async function POST(req: Request) {
  let name = "";
  let email = "";
  let avatarDataUrl: string | undefined;
  try {
    const body = (await req.json()) as {
      name?: unknown;
      email?: unknown;
      avatarDataUrl?: unknown;
    };
    name = typeof body.name === "string" ? body.name.trim() : "";
    email = typeof body.email === "string" ? body.email.trim() : "";
    avatarDataUrl =
      typeof body.avatarDataUrl === "string" ? body.avatarDataUrl : undefined;
  } catch {
    return fail("server", "Malformed request.", 400);
  }

  if (name.length < 2) return fail("invalid", "Please enter your name.", 400);
  if (!EMAIL_RE.test(email)) return fail("invalid", "Enter a valid email address.", 400);

  const call = await callNetx("/auth/account", { name, email, avatarDataUrl });
  if (!call.ok) return call.response;

  if (call.upstream.ok) return NextResponse.json({ ok: true });
  if (call.upstream.status === 409)
    return fail("email_taken", "That email is already in use.", 409);
  return fail("server", "Could not save your profile.", 502);
}
