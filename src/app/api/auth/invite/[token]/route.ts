import { NextResponse } from "next/server";
import { callNetx, fail, relaySessionCookie } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NETX_API_BASE_URL;

/**
 * GET /api/auth/invite/[token]
 * Fetches invite metadata (org name, role, whether the invitee already has an
 * account) so the accept screen can render the right form.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!API_BASE)
    return fail("server", "Authentication service is not configured.", 503);

  let upstream: Response;
  try {
    upstream = await fetch(
      `${API_BASE}/invites/accept/${encodeURIComponent(token)}`,
      { redirect: "manual" },
    );
  } catch {
    return fail("server", "Could not reach the authentication service.", 502);
  }

  if (upstream.ok) {
    const invite = await upstream.json().catch(() => null);
    return NextResponse.json({ ok: true, invite });
  }
  if (upstream.status === 410)
    return fail("expired", "This invitation has expired.", 410);
  return fail("invalid", "This invitation is invalid or has already been used.", 400);
}

/**
 * POST /api/auth/invite/[token]
 * Accepts the invitation. The backend creates/links the user, adds the
 * org-membership row, and issues a session we relay (auto sign-in).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let name: string | undefined;
  let password = "";
  try {
    const body = (await req.json()) as { name?: unknown; password?: unknown };
    name = typeof body.name === "string" ? body.name.trim() : undefined;
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return fail("server", "Malformed request.", 400);
  }

  if (password.length < 8)
    return fail("invalid", "Password must be at least 8 characters.", 400);

  const call = await callNetx(
    `/invites/accept/${encodeURIComponent(token)}`,
    { name, password },
  );
  if (!call.ok) return call.response;

  const { upstream } = call;
  if (upstream.ok) {
    return relaySessionCookie(upstream, NextResponse.json({ ok: true }));
  }
  if (upstream.status === 401)
    return fail("invalid_credentials", "Incorrect password.", 401);
  if (upstream.status === 410)
    return fail("expired", "This invitation has expired.", 410);
  return fail("invalid", "Could not accept the invitation.", 400);
}
