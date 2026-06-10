import { NextResponse } from "next/server";

/** Proxy → crm-api POST /api/customers/import { csv } → { imported, updated, skipped, errors[] }. */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!API_BASE) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  const body = await req.json().catch(() => ({}));
  if (!body.csv || typeof body.csv !== "string") return NextResponse.json({ ok: false, error: "csv is required" }, { status: 400 });
  const res = await fetch(`${API_BASE}/customers/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ csv: body.csv }),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(res.ok ? { ok: true, ...data } : { ok: false, error: data.message || "Import failed", ...data }, { status: res.status });
}
