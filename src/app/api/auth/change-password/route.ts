import { NextResponse } from "next/server";
import { callNetx, fail } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/change-password
 * Changes the signed-in user's password. The backend revokes existing sessions,
 * so the UI redirects to /login afterward (forced re-login).
 */
export async function POST(req: Request) {
  let currentPassword = "";
  let newPassword = "";
  try {
    const body = (await req.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  } catch {
    return fail("server", "Malformed request.", 400);
  }

  if (newPassword.length < 8)
    return fail("invalid", "New password must be at least 8 characters.", 400);

  const call = await callNetx(
    "/auth/change-password",
    { currentPassword, newPassword },
    { cookie: req.headers.get("cookie") }, // authenticated endpoint
  );
  if (!call.ok) return call.response;

  if (call.upstream.ok) return NextResponse.json({ ok: true });
  if (call.upstream.status === 401)
    return fail("invalid_credentials", "Your current password is incorrect.", 401);
  return fail("server", "Could not change your password.", 502);
}
