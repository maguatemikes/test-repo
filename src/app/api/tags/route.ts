import { NextResponse } from "next/server";

/** Proxy → crm-api /api/tags. GET = list all org tags, POST = create. */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!API_BASE) return NextResponse.json({ ok: false, tags: [] }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  const res = await fetch(`${API_BASE}/tags`, { headers: cookie ? { cookie } : {}, cache: "no-store" });
  if (!res.ok) return NextResponse.json({ ok: false, tags: [] }, { status: res.status });
  return NextResponse.json({ ok: true, tags: await res.json() });
}

export async function POST(req: Request) {
  if (!API_BASE) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ ok: false, error: "A tag name is required" }, { status: 400 });
  const res = await fetch(`${API_BASE}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ name, color: body.color || "#2563EB" }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: res.status }); }
  return NextResponse.json({ ok: true, tag: await res.json() });
}
