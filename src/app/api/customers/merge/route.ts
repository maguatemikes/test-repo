import { NextResponse } from "next/server";

/** Proxy → crm-api POST /api/customers/merge { canonicalId, aliasId }. */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!API_BASE) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  const body = await req.json().catch(() => ({}));
  const canonicalId = Number(body.canonicalId);
  const aliasId = Number(body.aliasId);
  if (!canonicalId || !aliasId) return NextResponse.json({ ok: false, error: "canonicalId and aliasId are required" }, { status: 400 });
  if (canonicalId === aliasId) return NextResponse.json({ ok: false, error: "Pick two different customers" }, { status: 400 });

  const res = await fetch(`${API_BASE}/customers/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ canonicalId, aliasId }),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(res.ok ? { ok: true, ...data } : { ok: false, error: data.message || "Merge failed", ...data }, { status: res.status });
}
