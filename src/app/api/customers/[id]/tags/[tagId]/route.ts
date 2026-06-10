import { NextResponse } from "next/server";

/** Proxy → crm-api DELETE /api/customers/{id}/tags/{tagId} (detach a tag). */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; tagId: string }> }) {
  const { id, tagId } = await params;
  if (!API_BASE) return NextResponse.json({ ok: false }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  const res = await fetch(`${API_BASE}/customers/${encodeURIComponent(id)}/tags/${encodeURIComponent(tagId)}`, {
    method: "DELETE",
    headers: cookie ? { cookie } : {},
  });
  if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status });
  return NextResponse.json({ ok: true });
}
