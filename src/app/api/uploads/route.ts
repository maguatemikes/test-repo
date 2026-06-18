import { NextResponse } from "next/server";

/**
 * Image upload proxy → crm-api.
 *   POST   /api/uploads        (multipart, field "file")  → { url: cdn.netx.cc/... }
 *   DELETE /api/uploads?id={id}                            → cleanup
 * Forwards the session cookie so crm-api can authorise. The raw multipart body
 * is streamed through untouched so the boundary stays intact.
 */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!API_BASE) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  const contentType = req.headers.get("content-type") || "";
  const body = await req.arrayBuffer();
  const res = await fetch(`${API_BASE}/uploads`, {
    method: "POST",
    headers: { ...(contentType ? { "content-type": contentType } : {}), ...(cookie ? { cookie } : {}) },
    body,
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  return NextResponse.json(data ?? { ok: res.ok }, { status: res.status });
}

export async function DELETE(req: Request) {
  if (!API_BASE) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const cookie = req.headers.get("cookie") || "";
  const res = await fetch(`${API_BASE}/uploads/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: cookie ? { cookie } : {},
  });
  return NextResponse.json({ ok: res.ok }, { status: res.status });
}
