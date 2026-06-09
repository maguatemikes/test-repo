import { NextResponse } from "next/server";
import { callNetx, fail } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/enable
 * Confirms the TOTP code, enables 2FA on the account (persisted to crm_users),
 * and returns one-time recovery codes to display.
 */
export async function POST(req: Request) {
  let code = "";
  try {
    const body = (await req.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    return fail("server", "Malformed request.", 400);
  }

  if (!/^\d{6}$/.test(code))
    return fail("invalid", "Enter the 6-digit code from your app.", 400);

  const call = await callNetx("/auth/2fa/enable", { code });
  if (!call.ok) return call.response;

  const { upstream } = call;
  if (upstream.ok) {
    const data = (await upstream.json().catch(() => null)) as
      | { recoveryCodes?: string[] }
      | null;
    return NextResponse.json({ ok: true, recoveryCodes: data?.recoveryCodes ?? [] });
  }
  if (upstream.status === 400 || upstream.status === 422)
    return fail("invalid", "That code didn't match. Try again.", 400);
  return fail("server", "Could not enable two-factor.", 502);
}
