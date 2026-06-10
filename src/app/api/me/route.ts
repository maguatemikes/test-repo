import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NETX_API_BASE_URL;

/**
 * GET /api/me
 * Returns the currently signed-in user by proxying to the NetX `/me` endpoint,
 * forwarding the session cookie. Used by the SessionProvider to hydrate the UI.
 */
export async function GET(req: Request) {
  if (!API_BASE) return NextResponse.json({ ok: false }, { status: 503 });

  try {
    const upstream = await fetch(`${API_BASE}/me`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      redirect: "manual",
    });
    if (!upstream.ok) {
      return NextResponse.json({ ok: false }, { status: upstream.status });
    }
    const user = await upstream.json().catch(() => null);
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
