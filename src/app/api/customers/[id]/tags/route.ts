import { NextResponse } from "next/server";

/** Proxy → crm-api /api/customers/{id}/tags. GET = customer's tags, POST = attach { tagId }. */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!API_BASE) return NextResponse.json({ ok: false, tags: [] }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  const res = await fetch(`${API_BASE}/customers/${encodeURIComponent(id)}/tags`, { headers: cookie ? { cookie } : {}, cache: "no-store" });
  if (!res.ok) return NextResponse.json({ ok: false, tags: [] }, { status: res.status });
  return NextResponse.json({ ok: true, tags: await res.json() });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!API_BASE) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  const body = await req.json();
  if (!body.tagId) return NextResponse.json({ ok: false, error: "tagId is required" }, { status: 400 });
  const res = await fetch(`${API_BASE}/customers/${encodeURIComponent(id)}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ tagId: Number(body.tagId) }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: res.status }); }
  return NextResponse.json({ ok: true });
}
