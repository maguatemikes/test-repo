import { NextResponse } from "next/server";

/** Proxy → crm-api /api/campaigns (GET list, POST create). */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!API_BASE) return NextResponse.json({ rows: [] });
  const cookie = req.headers.get("cookie") || "";
  const url = new URL(req.url);
  const res = await fetch(`${API_BASE}/campaigns${url.search}`, { headers: cookie ? { cookie } : {}, cache: "no-store" });
  const d = await res.json().catch(() => ({ rows: [] }));
  return NextResponse.json(d, { status: res.status });
}

export async function POST(req: Request) {
  if (!API_BASE) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  const body = await req.text();
  const res = await fetch(`${API_BASE}/campaigns`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body });
  const d = await res.json().catch(() => ({}));
  return NextResponse.json(res.ok ? { ok: true, ...d } : { ok: false, error: (d as { message?: string }).message || "Failed", ...d }, { status: res.status });
}
