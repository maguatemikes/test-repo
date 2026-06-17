import { NextResponse } from "next/server";

/**
 * GET /api/me/org/members
 * Lists the members of the caller's organization by proxying to crm-api
 * `GET /me/org/members`. Forwards the session cookie so crm-api can scope the
 * result to the caller's org and authorize the read.
 *
 * Returns whatever shape crm-api emits (array or { rows: [...] }); the UI
 * normalizes both.
 */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!API_BASE) {
    return NextResponse.json(
      { ok: false, error: "Team service is not configured (set NETX_API_BASE_URL)." },
      { status: 503 },
    );
  }

  try {
    const cookie = req.headers.get("cookie");
    const upstream = await fetch(`${API_BASE}/me/org/members`, {
      headers: { ...(cookie ? { cookie } : {}) },
      redirect: "manual",
    });
    const text = await upstream.text();
    let data: unknown = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }
    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, error: "Could not load organization members." },
        { status: upstream.status },
      );
    }
    return NextResponse.json(data ?? { ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not reach the team service." },
      { status: 502 },
    );
  }
}
