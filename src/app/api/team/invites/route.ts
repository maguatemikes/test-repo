import { NextResponse } from "next/server";

/**
 * Proxy for sending team invites → crm-api `POST /api/invites`.
 * Self-contained (does not touch the auth proxy). Forwards the caller's
 * session cookie so crm-api can authorize (admin-only).
 */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!API_BASE) {
    return NextResponse.json(
      { ok: false, error: "Team service is not configured (set NETX_API_BASE_URL)." },
      { status: 503 },
    );
  }

  let body: { email?: string; role?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 }); }

  const email = (body.email || "").trim().toLowerCase();
  const role = (body.role || "").trim();
  if (!email || !email.includes("@")) return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  if (!role) return NextResponse.json({ ok: false, error: "A role is required." }, { status: 400 });

  try {
    const cookie = req.headers.get("cookie");
    const upstream = await fetch(`${API_BASE}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ email, role }),
      redirect: "manual",
    });
    const data = await upstream.json().catch(() => ({} as Record<string, unknown>));
    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, error: (data.message as string) || (data.error as string) || "Invite failed.", code: data.code },
        { status: upstream.status },
      );
    }
    return NextResponse.json({ ok: true, inviteId: (data as { inviteId?: number }).inviteId });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach the team service." }, { status: 502 });
  }
}
